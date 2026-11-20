import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { normalizeOtpEmail, validateAccountPassword, verifyAndConsumeOtp } from "@/lib/emailOtp";
import {
  PARTNER_COOKIE_NAME,
  PARTNER_SESSION_TTL_SECONDS,
  signPartnerSession,
} from "@/lib/partnerAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!(await rateLimitDb(`partner_setpw_ip:${ip}`, 15, 15 * 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan verifikasi. Tunggu beberapa menit." },
        { status: 429 },
      );
    }

    const body = await readJsonBody<{ email?: string; code?: string; password?: string; purpose?: string }>(req);
    const cleanEmail = normalizeOtpEmail(body?.email || "");
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const rawPurpose = typeof body?.purpose === "string" ? body.purpose.trim().toUpperCase() : "PARTNER_ACTIVATE";
    const purpose =
      rawPurpose === "PARTNER_RESET_PASSWORD"
        ? ("PARTNER_RESET_PASSWORD" as const)
        : rawPurpose === "PARTNER_ACTIVATE"
          ? ("PARTNER_ACTIVATE" as const)
          : null;

    if (!purpose) {
      return NextResponse.json({ error: "Tujuan verifikasi tidak dikenali." }, { status: 400 });
    }
    if (!cleanEmail || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Email dan kode OTP 6 digit wajib diisi." }, { status: 400 });
    }
    const passwordErr = validateAccountPassword(password);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }

    const verify = await verifyAndConsumeOtp(cleanEmail, purpose, code);
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

    const partner = await prisma.partnerAffiliate.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
        isActive: true,
      },
      select: { id: true, name: true, email: true },
    });

    if (!partner) {
      return NextResponse.json(
        { error: "Akun mitra tidak ditemukan atau sudah dinonaktifkan." },
        { status: 403 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updatedPartner = await prisma.partnerAffiliate.update({
      where: { id: partner.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });

    const token = signPartnerSession(partner.id, partner.email || cleanEmail, updatedPartner.sessionVersion);
    const res = NextResponse.json({
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email || cleanEmail,
      },
    });

    res.cookies.set(PARTNER_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: PARTNER_SESSION_TTL_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (error) {
    return routeError("PartnerSetPassword", error, "Gagal menyimpan kata sandi mitra.");
  }
}
