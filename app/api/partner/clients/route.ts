import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
import { normalizeOtpEmail } from "@/lib/emailOtp";
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveAppOrigin(req: NextRequest): string {
  const configured = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  return req.nextUrl.origin.replace(/\/+$/, "");
}

async function resolveAuthenticatedPartner(req: NextRequest) {
  const session = await getPartnerSessionFromRequest(req);
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const partner = await prisma.partnerAffiliate.findUnique({
    where: { id: session.partnerId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      sessionVersion: true,
      commissionType: true,
      commissionValue: true,
    },
  });

  if (!partner || !partner.isActive) {
    return {
      error: NextResponse.json(
        { error: "Akun mitra tidak ditemukan atau sudah dinonaktifkan." },
        { status: 403 },
      ),
    };
  }

  if (session.sv !== partner.sessionVersion) {
    const expired = NextResponse.json(
      { error: "Sesi telah berakhir karena perubahan keamanan akun. Silakan masuk kembali." },
      { status: 401 },
    );
    expired.cookies.set(PARTNER_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return { error: expired };
  }

  return { partner };
}

export async function GET(req: NextRequest) {
  try {
    const authRes = await resolveAuthenticatedPartner(req);
    if ("error" in authRes && authRes.error) return authRes.error;
    const { partner } = authRes;

    const users = await prisma.user.findMany({
      where: { provisionedByPartnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        passwordHash: true,
        googleId: true,
        createdAt: true,
        activationTokens: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            expiresAt: true,
            consumedAt: true,
            emailSentAt: true,
            createdAt: true,
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            invoiceNumber: true,
            planType: true,
            status: true,
            amount: true,
            discountAmount: true,
            paidAt: true,
          },
        },
        _count: {
          select: { invitations: true },
        },
      },
    });

    const nowMs = Date.now();
    const clients = users.map((u) => {
      const isActivated = Boolean(u.passwordHash || u.googleId);
      const latestToken = u.activationTokens[0] || null;
      const latestOrder = u.orders[0] || null;
      const tokenExpired =
        !isActivated && latestToken && !latestToken.consumedAt
          ? latestToken.expiresAt.getTime() <= nowMs
          : false;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber,
        createdAt: u.createdAt,
        isActivated,
        invitationCount: u._count.invitations,
        activation: latestToken
          ? {
              expiresAt: latestToken.expiresAt,
              consumedAt: latestToken.consumedAt,
              emailSentAt: latestToken.emailSentAt,
              isExpired: tokenExpired,
            }
          : null,
        latestOrder: latestOrder
          ? {
              id: latestOrder.id,
              invoiceNumber: latestOrder.invoiceNumber,
              planType: latestOrder.planType,
              status: latestOrder.status,
              amount: Number(latestOrder.amount),
              discountAmount: latestOrder.discountAmount ? Number(latestOrder.discountAmount) : 0,
              paidAt: latestOrder.paidAt,
            }
          : null,
      };
    });

    return NextResponse.json(
      { success: true, clients },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return routeError("PartnerClientsGet", error, "Gagal memuat daftar klien mitra.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const authRes = await resolveAuthenticatedPartner(req);
    if ("error" in authRes && authRes.error) return authRes.error;
    const { partner } = authRes;

    if (!(await rateLimitDb(`partner_provision:${partner.id}`, 30, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Terlalu banyak pendaftaran klien dalam 1 jam terakhir. Silakan coba lagi nanti." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawName = typeof body.name === "string" ? body.name.trim() : "";
    const rawEmail = typeof body.email === "string" ? normalizeOtpEmail(body.email) : "";
    const rawPhone = typeof body.phoneNumber === "string" ? body.phoneNumber.replace(/\D/g, "") : "";

    if (rawName.length < 2 || rawName.length > 100) {
      return NextResponse.json(
        { error: "Nama klien / mempelai wajib diisi (2–100 karakter)." },
        { status: 400 },
      );
    }

    if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
      return NextResponse.json(
        { error: "Format alamat email klien tidak valid." },
        { status: 400 },
      );
    }

    if (rawPhone && (rawPhone.length < 9 || rawPhone.length > 15)) {
      return NextResponse.json(
        { error: "Nomor WhatsApp harus berisi 9–15 digit angka (atau kosongkan jika belum ada)." },
        { status: 400 },
      );
    }

    if (partner.email && partner.email.trim().toLowerCase() === rawEmail) {
      return NextResponse.json(
        { error: "Email klien tidak boleh sama dengan email akun mitra Anda sendiri." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: rawEmail },
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

    let targetUser: { id: string; name: string; email: string; phoneNumber: string | null };
    let reissued = false;

    if (existingUser) {
      const alreadyActivated = Boolean(existingUser.passwordHash || existingUser.googleId);
      if (existingUser.provisionedByPartnerId === partner.id && !alreadyActivated) {
        // Klien ini sebelumnya didaftarkan oleh mitra yang sama namun belum aktivasi: perbarui data & terbitkan ulang link baru.
        targetUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: rawName,
            ...(rawPhone ? { phoneNumber: rawPhone } : {}),
          },
          select: { id: true, name: true, email: true, phoneNumber: true },
        });
        reissued = true;
      } else {
        return NextResponse.json(
          {
            error: alreadyActivated
              ? "Email ini sudah terdaftar dan aktif di sistem. Klien dapat langsung masuk melalui halaman Login."
              : "Email ini sudah terdaftar pada akun lain di sistem.",
          },
          { status: 409 },
        );
      }
    } else {
      targetUser = await prisma.user.create({
        data: {
          name: rawName,
          email: rawEmail,
          phoneNumber: rawPhone || null,
          role: "CLIENT",
          passwordHash: null,
          provisionedByPartnerId: partner.id,
        },
        select: { id: true, name: true, email: true, phoneNumber: true },
      });
    }

    const { tokenId, rawToken, expiresAt } = await issueClientActivationToken({
      userId: targetUser.id,
      partnerId: partner.id,
    });

    const appOrigin = resolveAppOrigin(req);
    const activationUrl = `${appOrigin}/auth/set-password?token=${encodeURIComponent(rawToken)}`;

    const settings = await getPublicPlatformSettings();
    const platformName = settings.platformName || "Luxvite";

    const mailRes = await sendClientActivationEmail({
      recipientEmail: targetUser.email,
      clientName: targetUser.name,
      partnerName: partner.name,
      activationUrl,
      expiresHours: CLIENT_ACTIVATION_TTL_HOURS,
      appUrl: appOrigin,
    });

    if (mailRes.success) {
      await markActivationTokenEmailSent(tokenId);
    }

    const whatsappText = buildPartnerWhatsAppInviteText({
      clientName: targetUser.name,
      partnerName: partner.name,
      activationUrl,
      platformName,
    });
    const whatsappUrl = buildPartnerWhatsAppDeepLink(targetUser.phoneNumber, whatsappText);

    return NextResponse.json(
      {
        success: true,
        reissued,
        client: targetUser,
        activationUrl,
        expiresAt: expiresAt.toISOString(),
        emailSent: mailRes.success,
        emailError: mailRes.success ? null : (mailRes.error || "SMTP_UNAVAILABLE"),
        whatsappText,
        whatsappUrl,
      },
      { status: reissued ? 200 : 201 },
    );
  } catch (error) {
    return routeError("PartnerClientsPost", error, "Gagal mendaftarkan akun klien baru.");
  }
}
