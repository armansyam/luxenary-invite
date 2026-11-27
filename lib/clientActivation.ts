import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateAccountPassword } from "@/lib/emailOtp";

export const CLIENT_ACTIVATION_TTL_HOURS = 48;
export const CLIENT_ACTIVATION_TTL_MS = CLIENT_ACTIVATION_TTL_HOURS * 60 * 60 * 1000;
export const MIN_PAYABLE_AMOUNT_IDR = 1000;
export const PARTNER_WHOLESALE_INVOICE_PREFIX = "INV-WO-";

/** Menentukan apakah sebuah nomor invoice diterbitkan lewat jalur grosir B2B Portal Mitra. */
export function isPartnerWholesaleInvoice(invoiceNumber: string | null | undefined): boolean {
  return Boolean(invoiceNumber && invoiceNumber.startsWith(PARTNER_WHOLESALE_INVOICE_PREFIX));
}

function getActivationSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET tidak dikonfigurasi; token aktivasi klien tidak dapat ditandatangani.");
  }
  return secret;
}

export function generateActivationToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashActivationToken(rawToken: string): string {
  const clean = String(rawToken || "").trim();
  return crypto
    .createHmac("sha256", getActivationSecret())
    .update(`client-activation:${clean}`)
    .digest("hex");
}

export function maskEmailAddress(email: string): string {
  const clean = String(email || "").trim().toLowerCase();
  const atIndex = clean.indexOf("@");
  if (atIndex <= 0) return "***";
  const local = clean.slice(0, atIndex);
  const domain = clean.slice(atIndex + 1);
  if (local.length <= 2) {
    return `${local.charAt(0)}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export interface PartnerDiscountConfig {
  name?: string | null;
  commissionType: string;
  commissionValue: number | string | { toNumber?: () => number };
  isActive?: boolean;
}

/**
 * Menghitung potongan harga grosir langsung untuk akun klien yang didaftarkan oleh Mitra WO aktif.
 * Zero-debt model: potongan diberikan langsung di checkout (tanpa utang komisi/payout belakangan).
 * Menjamin nominal tagihan akhir tidak pernah turun di bawah Rp 1.000 agar tetap valid di payment gateway.
 */
export function calculatePartnerWholesaleDiscount(
  basePrice: number,
  partner: PartnerDiscountConfig | null | undefined,
): number {
  if (!partner || partner.isActive === false) return 0;
  const price = Number(basePrice);
  if (!Number.isFinite(price) || price <= MIN_PAYABLE_AMOUNT_IDR) return 0;

  const rawValue =
    typeof partner.commissionValue === "object" && partner.commissionValue !== null && typeof partner.commissionValue.toNumber === "function"
      ? partner.commissionValue.toNumber()
      : Number(partner.commissionValue);

  if (!Number.isFinite(rawValue) || rawValue <= 0) return 0;

  let discount = 0;
  if (partner.commissionType === "PERCENT") {
    const clampedPct = Math.min(Math.max(rawValue, 0), 95);
    discount = Math.round(price * (clampedPct / 100));
  } else {
    discount = Math.round(rawValue);
  }

  const maxAllowedDiscount = Math.max(0, price - MIN_PAYABLE_AMOUNT_IDR);
  return Math.max(0, Math.min(discount, maxAllowedDiscount));
}

export function formatPartnerPromoLabel(partnerName: string): string {
  const clean = String(partnerName || "Mitra").trim().slice(0, 60);
  return `MITRA: ${clean}`;
}

export function formatPartnerDiscountRate(commissionType: string, commissionValue: number): string {
  if (commissionType === "PERCENT") {
    return `${commissionValue}%`;
  }
  return `Rp ${Math.round(commissionValue || 0).toLocaleString("id-ID")}`;
}

export function normalizeIndonesianWhatsApp(phoneNumber: string | null | undefined): string {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function buildPartnerWhatsAppInviteText(input: {
  clientName: string;
  partnerName: string;
  activationUrl: string;
  platformName?: string;
}): string {
  const brand = (input.platformName || "Luxvite").trim();
  const client = input.clientName.trim() || "Kak";
  const partner = input.partnerName.trim() || "Mitra Resmi";

  return [
    `Halo ${client},`,
    ``,
    `Kabar baik! Paket undangan digital Anda di *${brand}* sudah disiapkan dan diaktifkan melalui *${partner}*.`,
    ``,
    `Silakan klik tautan di bawah ini untuk membuat kata sandi dan langsung mulai memilih tema serta melengkapi undangan Anda:`,
    input.activationUrl,
    ``,
    `Catatan: Tautan aktivasi ini bersifat pribadi, hanya dapat digunakan 1 kali, dan berlaku selama ${CLIENT_ACTIVATION_TTL_HOURS} jam.`,
    ``,
    `Terima kasih,`,
    `${partner} × ${brand}`,
  ].join("\n");
}

export function buildPartnerWhatsAppDeepLink(
  phoneNumber: string | null | undefined,
  message: string,
): string {
  const normalized = normalizeIndonesianWhatsApp(phoneNumber);
  const encoded = encodeURIComponent(message);
  return normalized
    ? `https://wa.me/${normalized}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export async function issueClientActivationToken(input: {
  userId: string;
  partnerId?: string | null;
}): Promise<{ tokenId: string; rawToken: string; expiresAt: Date }> {
  const rawToken = generateActivationToken();
  const tokenHash = hashActivationToken(rawToken);
  const expiresAt = new Date(Date.now() + CLIENT_ACTIVATION_TTL_MS);

  const created = await prisma.$transaction(async (tx) => {
    await tx.clientActivationToken.deleteMany({
      where: {
        userId: input.userId,
        consumedAt: null,
      },
    });

    return tx.clientActivationToken.create({
      data: {
        userId: input.userId,
        partnerId: input.partnerId ?? null,
        tokenHash,
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });
  });

  return {
    tokenId: created.id,
    rawToken,
    expiresAt: created.expiresAt,
  };
}

export async function markActivationTokenEmailSent(tokenId: string): Promise<void> {
  await prisma.clientActivationToken.update({
    where: { id: tokenId },
    data: { emailSentAt: new Date() },
  });
}

export type InspectActivationTokenResult =
  | {
      status: "VALID";
      tokenId: string;
      userId: string;
      clientName: string;
      emailMasked: string;
      partnerName: string | null;
      expiresAt: string;
    }
  | {
      status: "USED" | "EXPIRED";
      clientName: string;
      partnerName: string | null;
    }
  | {
      status: "INVALID";
    };

export async function inspectClientActivationToken(
  rawToken: string,
): Promise<InspectActivationTokenResult> {
  const clean = String(rawToken || "").trim();
  if (!clean || clean.length < 20 || clean.length > 200) {
    return { status: "INVALID" };
  }

  const tokenHash = hashActivationToken(clean);
  const record = await prisma.clientActivationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, name: true, email: true, passwordHash: true },
      },
      partner: {
        select: { name: true },
      },
    },
  });

  if (!record || !record.user) {
    return { status: "INVALID" };
  }

  if (record.consumedAt) {
    return {
      status: "USED",
      clientName: record.user.name,
      partnerName: record.partner?.name || null,
    };
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return {
      status: "EXPIRED",
      clientName: record.user.name,
      partnerName: record.partner?.name || null,
    };
  }

  return {
    status: "VALID",
    tokenId: record.id,
    userId: record.user.id,
    clientName: record.user.name,
    emailMasked: maskEmailAddress(record.user.email),
    partnerName: record.partner?.name || null,
    expiresAt: record.expiresAt.toISOString(),
  };
}

export type ConsumeActivationResult =
  | {
      ok: true;
      userId: string;
      email: string;
      name: string;
    }
  | {
      ok: false;
      reason: "INVALID_PASSWORD" | "INVALID_TOKEN" | "USED" | "EXPIRED";
      error: string;
    };

export async function consumeClientActivationTokenAndSetPassword(
  rawToken: string,
  newPassword: string,
): Promise<ConsumeActivationResult> {
  const passwordErr = validateAccountPassword(newPassword);
  if (passwordErr) {
    return { ok: false, reason: "INVALID_PASSWORD", error: passwordErr };
  }

  const clean = String(rawToken || "").trim();
  if (!clean || clean.length < 20 || clean.length > 200) {
    return {
      ok: false,
      reason: "INVALID_TOKEN",
      error: "Tautan aktivasi tidak valid atau rusak.",
    };
  }

  const tokenHash = hashActivationToken(clean);
  const passwordHash = await bcrypt.hash(newPassword, 12);

  return prisma.$transaction(async (tx) => {
    const lockKey = `client_activation:${tokenHash}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const record = await tx.clientActivationToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!record || !record.user) {
      return {
        ok: false as const,
        reason: "INVALID_TOKEN" as const,
        error: "Tautan aktivasi tidak ditemukan atau sudah diganti dengan tautan terbaru.",
      };
    }

    if (record.consumedAt) {
      return {
        ok: false as const,
        reason: "USED" as const,
        error: "Tautan aktivasi ini sudah pernah digunakan. Silakan masuk melalui halaman Login.",
      };
    }

    const now = new Date();
    if (record.expiresAt.getTime() <= now.getTime()) {
      return {
        ok: false as const,
        reason: "EXPIRED" as const,
        error: "Tautan aktivasi sudah kedaluwarsa (melebihi 48 jam). Hubungi Mitra Anda untuk mengirim ulang tautan baru.",
      };
    }

    const consumed = await tx.clientActivationToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: now },
    });

    if (consumed.count === 0) {
      return {
        ok: false as const,
        reason: "USED" as const,
        error: "Tautan aktivasi ini sudah digunakan.",
      };
    }

    await tx.user.update({
      where: { id: record.user.id },
      data: { passwordHash },
    });

    // Bersihkan token lain yang belum terpakai untuk user yang sama
    await tx.clientActivationToken.deleteMany({
      where: {
        userId: record.user.id,
        id: { not: record.id },
        consumedAt: null,
      },
    });

    return {
      ok: true as const,
      userId: record.user.id,
      email: record.user.email,
      name: record.user.name,
    };
  });
}

/**
 * Dipanggil otomatis (non-blocking, pasca-commit transaksi) saat order milik klien Mitra WO menjadi PAID
 * (baik melalui Webhook Midtrans, rekonsiliasi status, maupun persetujuan transfer manual oleh Admin).
 * Idempoten: hanya mengirim email Magic Link 48 jam jika akun klien belum aktif & belum punya token terkirim yang masih berlaku.
 */
export async function triggerPartnerClientActivationOnPaid(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      orderType: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          provisionedByPartner: {
            select: { id: true, name: true, isActive: true },
          },
        },
      },
    },
  });

  if (!order || order.status !== "PAID" || order.orderType !== "NEW" || !isPartnerWholesaleInvoice(order.invoiceNumber)) return;
  const user = order.user;
  const partner = user?.provisionedByPartner;
  if (!user || !partner || !partner.isActive) return;
  if (user.passwordHash) return;

  // Idempotensi: jika sudah ada token aktif yang emailnya sudah terkirim, jangan kirim dobel
  const existingActiveToken = await prisma.clientActivationToken.findFirst({
    where: {
      userId: user.id,
      consumedAt: null,
      emailSentAt: { not: null },
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (existingActiveToken) return;

  const { tokenId, rawToken } = await issueClientActivationToken({
    userId: user.id,
    partnerId: partner.id,
  });

  const { getTrustedAppUrl } = await import("@/lib/serverDomainUtils");
  const { sendClientActivationEmail } = await import("@/lib/mailer");
  const appUrl = (await getTrustedAppUrl()).replace(/\/+$/, "");
  const activationUrl = `${appUrl}/auth/set-password?token=${encodeURIComponent(rawToken)}`;

  const mailRes = await sendClientActivationEmail({
    recipientEmail: user.email,
    clientName: user.name,
    partnerName: partner.name,
    activationUrl,
    expiresHours: CLIENT_ACTIVATION_TTL_HOURS,
    appUrl,
  });

  if (mailRes.success) {
    await markActivationTokenEmailSent(tokenId);
  }
}
