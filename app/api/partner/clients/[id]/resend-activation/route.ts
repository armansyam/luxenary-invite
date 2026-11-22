import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
import { rateLimitDb } from "@/lib/rateLimit";
import {
  CLIENT_ACTIVATION_TTL_HOURS,
  buildPartnerWhatsAppDeepLink,
  buildPartnerWhatsAppInviteText,
  issueClientActivationToken,
  markActivationTokenEmailSent,
} from "@/lib/clientActivation";
import { sendClientActivationEmail } from "@/lib/mailer";
import { getPublicPlatformSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function resolveAppOrigin(req: NextRequest): string {
  const configured = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  return req.nextUrl.origin.replace(/\/+$/, "");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getPartnerSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partner = await prisma.partnerAffiliate.findUnique({
      where: { id: session.partnerId },
      select: {
        id: true,
        name: true,
        isActive: true,
        sessionVersion: true,
      },
    });

    if (!partner || !partner.isActive) {
      return NextResponse.json(
        { error: "Akun mitra tidak ditemukan atau sudah dinonaktifkan." },
        { status: 403 },
      );
    }

    if (session.sv !== partner.sessionVersion) {
      const expired = NextResponse.json(
        { error: "Sesi telah berakhir karena perubahan keamanan akun. Silakan masuk kembali." },
        { status: 401 },
      );
      expired.cookies.set(PARTNER_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
      return expired;
    }

    const { id: clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ error: "ID klien tidak valid." }, { status: 400 });
    }

    if (!(await rateLimitDb(`partner_resend:${partner.id}:${clientId}`, 5, 15 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Terlalu sering mengirim ulang tautan untuk klien ini. Tunggu beberapa menit lalu coba lagi." },
        { status: 429 },
      );
    }

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        passwordHash: true,
        googleId: true,
        provisionedByPartnerId: true,
      },
    });

    if (!client || client.provisionedByPartnerId !== partner.id) {
      return NextResponse.json(
        { error: "Klien tidak ditemukan pada akun mitra Anda." },
        { status: 404 },
      );
    }

    if (client.passwordHash || client.googleId) {
      return NextResponse.json(
        {
          error:
            "Akun klien ini sudah aktif dan telah memiliki kata sandi. Jika lupa sandi, klien dapat menggunakan fitur Lupa Kata Sandi di halaman Login.",
        },
        { status: 400 },
      );
    }

    // Kebijakan Reseller B2B: Link aktivasi pengantin hanya diterbitkan setelah paket dibayar lunas (PAID) oleh Mitra WO
    const paidOrder = await prisma.order.findFirst({
      where: { userId: client.id, status: "PAID" },
      select: { id: true },
    });

    if (!paidOrder) {
      return NextResponse.json(
        {
          error:
            "Selesaikan pembayaran paket untuk klien ini terlebih dahulu. Tautan aktivasi 48 jam otomatis aktif begitu pembayaran berstatus LUNAS (PAID).",
          code: "PAYMENT_REQUIRED",
        },
        { status: 402 },
      );
    }

    const { tokenId, rawToken, expiresAt } = await issueClientActivationToken({
      userId: client.id,
      partnerId: partner.id,
    });

    const appOrigin = resolveAppOrigin(req);
    const activationUrl = `${appOrigin}/auth/set-password?token=${encodeURIComponent(rawToken)}`;
    const settings = await getPublicPlatformSettings();
    const platformName = settings.platformName || "Luxvite";

    const mailRes = await sendClientActivationEmail({
      recipientEmail: client.email,
      clientName: client.name,
      partnerName: partner.name,
      activationUrl,
      expiresHours: CLIENT_ACTIVATION_TTL_HOURS,
      appUrl: appOrigin,
    });

    if (mailRes.success) {
      await markActivationTokenEmailSent(tokenId);
    }

    const whatsappText = buildPartnerWhatsAppInviteText({
      clientName: client.name,
      partnerName: partner.name,
      activationUrl,
      platformName,
    });
    const whatsappUrl = buildPartnerWhatsAppDeepLink(client.phoneNumber, whatsappText);

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phoneNumber: client.phoneNumber,
      },
      activationUrl,
      expiresAt: expiresAt.toISOString(),
      emailSent: mailRes.success,
      emailError: mailRes.success ? null : (mailRes.error || "SMTP_UNAVAILABLE"),
      whatsappText,
      whatsappUrl,
    });
  } catch (error) {
    return routeError("PartnerClientResendActivation", error, "Gagal mengirim ulang tautan aktivasi.");
  }
}
