import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { normalizeOtpEmail, validateAccountPassword, verifyAndConsumeOtp } from "@/lib/emailOtp";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!(await rateLimitDb(`client_reset_ip:${ip}`, 15, 15 * 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan reset kata sandi. Tunggu beberapa menit." },
        { status: 429 },
      );
    }

    const body = await readJsonBody<{ email?: string; code?: string; newPassword?: string }>(req);
    const cleanEmail = normalizeOtpEmail(body?.email || "");
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!cleanEmail || cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Alamat email tidak valid." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Kode OTP 6 digit wajib diisi." }, { status: 400 });
    }
    const passwordErr = validateAccountPassword(newPassword);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }

    const verify = await verifyAndConsumeOtp(cleanEmail, "CLIENT_RESET_PASSWORD", code);
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

    const user = await prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("ClientResetPassword", error, "Gagal mengatur ulang kata sandi.");
  }
}
