import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { getServiceAvailability } from "@/lib/settings";
import { normalizeOtpEmail, validateAccountPassword, verifyAndConsumeOtp } from "@/lib/emailOtp";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!(await rateLimitDb(`client_reg_ip:${ip}`, 15, 15 * 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan pendaftaran. Silakan tunggu beberapa menit." },
        { status: 429 },
      );
    }

    const body = await readJsonBody<{ name?: string; email?: string; password?: string; code?: string }>(req);
    const cleanName = typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
    const cleanEmail = normalizeOtpEmail(body?.email || "");
    const password = typeof body?.password === "string" ? body.password : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (cleanName.length < 2 || cleanName.length > 100) {
      return NextResponse.json({ error: "Nama lengkap wajib diisi (2–100 karakter)." }, { status: 400 });
    }
    if (!cleanEmail || cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Alamat email tidak valid." }, { status: 400 });
    }
    const passwordErr = validateAccountPassword(password);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Kode OTP 6 digit wajib diisi." }, { status: 400 });
    }

    const availability = await getServiceAvailability();
    if (!availability.isOpen) {
      return NextResponse.json(
        { error: "Pendaftaran akun baru sedang ditutup sementara.", code: "RegistrationClosed" },
        { status: 403 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan masuk atau gunakan Lupa kata sandi.", code: "EMAIL_EXISTS" },
        { status: 409 },
      );
    }

    const verify = await verifyAndConsumeOtp(cleanEmail, "CLIENT_REGISTER", code);
    if (!verify.ok) {
      const messages: Record<typeof verify.reason, string> = {
        NOT_FOUND: "Kode OTP belum diminta atau sudah tidak berlaku.",
        EXPIRED: "Kode OTP telah kedaluwarsa. Silakan minta kode baru.",
        TOO_MANY_ATTEMPTS: "Terlalu banyak percobaan salah. Minta kode OTP baru.",
        INVALID_CODE: "Kode OTP tidak sesuai.",
        ALREADY_USED: "Kode OTP sudah pernah digunakan.",
      };
      return NextResponse.json({ error: messages[verify.reason], reason: verify.reason }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    try {
      const user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: cleanName,
          passwordHash,
          role: "CLIENT",
        },
        select: { id: true, name: true, email: true },
      });

      return NextResponse.json({ success: true, user }, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json(
          { error: "Email ini sudah terdaftar. Silakan masuk ke akun Anda.", code: "EMAIL_EXISTS" },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (error) {
    return routeError("ClientRegister", error, "Gagal mendaftarkan akun.");
  }
}
