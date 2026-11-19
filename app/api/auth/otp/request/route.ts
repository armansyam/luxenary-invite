import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { getServiceAvailability } from "@/lib/settings";
import { createAndStoreOtp, normalizeOtpEmail } from "@/lib/emailOtp";
import { sendLoginOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req);
    const cleanEmail = normalizeOtpEmail(body?.email);

    if (!cleanEmail || cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Alamat email tidak valid." }, { status: 400 });
    }

    const ip = getClientIp(req);
    if (!(await rateLimitDb(`otp_req:ip:${ip}`, 10, 15 * 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan kode OTP dari perangkat Anda. Coba lagi nanti." },
        { status: 429 },
      );
    }
    if (!(await rateLimitDb(`otp_req:email:${cleanEmail}`, 3, 10 * 60_000))) {
      return NextResponse.json(
        { error: "Kode OTP baru saja dikirim ke email ini. Tunggu beberapa menit sebelum meminta ulang." },
        { status: 429 },
      );
    }

    const availability = await getServiceAvailability();
    if (!availability.isOpen) {
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true },
      });
      if (!existingUser) {
        return NextResponse.json(
          { error: "Pendaftaran akun baru sedang ditutup sementara.", code: "RegistrationClosed" },
          { status: 403 },
        );
      }
    }

    const { id, code } = await createAndStoreOtp(cleanEmail, "CLIENT_LOGIN");
    const mailRes = await sendLoginOtpEmail({
      to: cleanEmail,
      code,
      purpose: "CLIENT_LOGIN",
    });

    if (!mailRes.success) {
      if (id) {
        await prisma.emailOtpToken.deleteMany({ where: { id } }).catch(() => {});
      }
      return NextResponse.json(
        { error: "Layanan pengirim email SMTP belum siap atau gagal mengirim kode verifikasi." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      expiresInSeconds: 600,
    });
  } catch (error) {
    return routeError("AuthOtpRequest", error, "Gagal mengirim kode OTP");
  }
}
