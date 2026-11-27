import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { getServiceAvailability } from "@/lib/settings";
import { createAndStoreOtp, normalizeOtpEmail } from "@/lib/emailOtp";
import { sendLoginOtpEmail } from "@/lib/mailer";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<{
      email?: string;
      purpose?: string;
      turnstileToken?: string;
      "cf-turnstile-response"?: string;
    }>(req);
    const cleanEmail = normalizeOtpEmail(body?.email || "");
    const rawPurpose = typeof body?.purpose === "string" ? body.purpose.trim().toUpperCase() : "CLIENT_REGISTER";
    const purpose =
      rawPurpose === "CLIENT_RESET_PASSWORD"
        ? ("CLIENT_RESET_PASSWORD" as const)
        : rawPurpose === "CLIENT_REGISTER"
          ? ("CLIENT_REGISTER" as const)
          : null;

    if (!purpose) {
      return NextResponse.json({ error: "Tujuan verifikasi OTP tidak dikenali." }, { status: 400 });
    }

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

    const expectedAction = purpose === "CLIENT_REGISTER" ? "client_register_otp" : "client_reset_otp";
    const turnstile = await verifyTurnstileToken({
      token: body?.turnstileToken ?? body?.["cf-turnstile-response"],
      remoteIp: ip,
      expectedAction,
    });
    if (!turnstile.ok) {
      return NextResponse.json(
        {
          error: "Verifikasi keamanan anti-bot gagal atau kedaluwarsa. Selesaikan verifikasi lalu coba lagi.",
          code: "TURNSTILE_FAILED",
        },
        { status: 403 },
      );
    }

    if (!(await rateLimitDb(`otp_req:email:${purpose}:${cleanEmail}`, 3, 10 * 60_000))) {
      return NextResponse.json(
        { error: "Kode OTP baru saja dikirim ke email ini. Tunggu beberapa menit sebelum meminta ulang." },
        { status: 429 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });

    if (purpose === "CLIENT_REGISTER") {
      const availability = await getServiceAvailability();
      if (!availability.isOpen) {
        return NextResponse.json(
          { error: "Pendaftaran akun baru sedang ditutup sementara.", code: "RegistrationClosed" },
          { status: 403 },
        );
      }
      if (existingUser) {
        return NextResponse.json(
          { error: "Email ini sudah terdaftar. Silakan masuk atau gunakan Lupa kata sandi.", code: "EMAIL_EXISTS" },
          { status: 409 },
        );
      }
    } else if (!existingUser) {
      // Anti-enumeration pada reset kata sandi: jawab netral tanpa mengirim email bila akun tidak ada.
      return NextResponse.json({
        success: true,
        expiresInSeconds: 600,
        message: "Jika email terdaftar, kode verifikasi 6 digit telah dikirim. Periksa kotak masuk (Inbox) atau folder Spam/Junk.",
      });
    }

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
        { error: "Layanan pengirim email SMTP belum siap atau gagal mengirim kode verifikasi." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      expiresInSeconds: 600,
      message:
        purpose === "CLIENT_REGISTER"
          ? "Kode verifikasi 6 digit telah dikirim ke email Anda. Periksa kotak masuk (Inbox) atau folder Spam/Junk."
          : "Jika email terdaftar, kode verifikasi 6 digit telah dikirim. Periksa kotak masuk (Inbox) atau folder Spam/Junk.",
    });
  } catch (error) {
    return routeError("AuthOtpRequest", error, "Gagal mengirim kode OTP");
  }
}
