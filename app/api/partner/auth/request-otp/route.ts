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
    const body = await readJsonBody<{ email?: string }>(req);
    const cleanEmail = normalizeOtpEmail(body?.email || "");

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
    if (!(await rateLimitDb(`partner_otp_email:${cleanEmail}`, 5, 15 * 60_000))) {
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
      select: { id: true, name: true, email: true },
    });

    if (partner?.email) {
      const { id, code } = await createAndStoreOtp(cleanEmail, "PARTNER_LOGIN");
      const mailRes = await sendLoginOtpEmail({
        to: cleanEmail,
        code,
        purpose: "PARTNER_LOGIN",
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
      message: "Jika email terdaftar sebagai mitra aktif, kode OTP 6 digit telah dikirim.",
    });
  } catch (error) {
    return routeError("PartnerOtpRequest", error, "Gagal mengirim kode OTP mitra.");
  }
}
