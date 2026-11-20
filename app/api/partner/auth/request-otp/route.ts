import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { createAndStoreOtp, normalizeOtpEmail } from "@/lib/emailOtp";
import { sendLoginOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<{ email?: string; purpose?: string }>(req);
    const cleanEmail = normalizeOtpEmail(body?.email || "");
    const rawPurpose = typeof body?.purpose === "string" ? body.purpose.trim().toUpperCase() : "PARTNER_ACTIVATE";
    const purpose =
      rawPurpose === "PARTNER_RESET_PASSWORD"
        ? ("PARTNER_RESET_PASSWORD" as const)
        : rawPurpose === "PARTNER_ACTIVATE"
          ? ("PARTNER_ACTIVATE" as const)
          : null;

    if (!purpose) {
      return NextResponse.json({ error: "Tujuan verifikasi OTP mitra tidak dikenali." }, { status: 400 });
    }

    if (!cleanEmail || cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Alamat email tidak valid." }, { status: 400 });
    }

    const ip = getClientIp(req);
    if (!(await rateLimitDb(`partner_otp_ip:${ip}`, 10, 15 * 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan kode OTP dari perangkat Anda. Coba lagi nanti." },
        { status: 429 },
      );
    }
    if (!(await rateLimitDb(`partner_otp_email:${purpose}:${cleanEmail}`, 5, 15 * 60_000))) {
      return NextResponse.json(
        { error: "Kode OTP baru saja dikirim ke email ini. Tunggu beberapa menit sebelum meminta ulang." },
        { status: 429 },
      );
    }

    const partner = await prisma.partnerAffiliate.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
        isActive: true,
      },
      select: { id: true, name: true, email: true, passwordHash: true },
    });

    if (purpose === "PARTNER_ACTIVATE" && partner?.passwordHash) {
      return NextResponse.json(
        {
          error: "Akun mitra ini sudah aktif. Silakan masuk dengan kata sandi atau gunakan Lupa kata sandi.",
          code: "ALREADY_ACTIVATED",
        },
        { status: 409 },
      );
    }

    if (partner?.email) {
      const { id, code } = await createAndStoreOtp(cleanEmail, purpose);
      const mailRes = await sendLoginOtpEmail({
        to: cleanEmail,
        code,
        purpose,
      });

      if (!mailRes.success) {
        if (id) {
          await prisma.emailOtpToken.deleteMany({ where: { id } }).catch(() => {});
        }
        return NextResponse.json(
          { error: "Layanan pengirim email SMTP belum siap atau gagal mengirim kode OTP." },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      expiresInSeconds: 600,
      message:
        purpose === "PARTNER_ACTIVATE"
          ? "Jika email terdaftar sebagai mitra aktif, kode aktivasi 6 digit telah dikirim."
          : "Jika email terdaftar sebagai mitra aktif, kode reset kata sandi 6 digit telah dikirim.",
    });
  } catch (error) {
    return routeError("PartnerOtpRequest", error, "Gagal mengirim kode OTP mitra.");
  }
}
