import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
import { normalizeOtpEmail } from "@/lib/emailOtp";
import { rateLimitDb } from "@/lib/rateLimit";
import { normalizePlanType } from "@/lib/planUtils";
import {
  MIN_PAYABLE_AMOUNT_IDR,
  PARTNER_WHOLESALE_INVOICE_PREFIX,
  calculatePartnerWholesaleDiscount,
  formatPartnerPromoLabel,
} from "@/lib/clientActivation";
import { getServiceAvailability } from "@/lib/settings";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
          where: { invoiceNumber: { startsWith: PARTNER_WHOLESALE_INVOICE_PREFIX } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            invoiceNumber: true,
            planType: true,
            orderType: true,
            status: true,
            paymentMethod: true,
            amount: true,
            discountAmount: true,
            proofImageUrl: true,
            rejectReason: true,
            paidAt: true,
            expiredAt: true,
          },
        },
        _count: {
          select: { invitations: true },
        },
      },
    });

    const nowMs = Date.now();
    const clients = users.map((u) => {
      const isActivated = Boolean(u.passwordHash);
      const latestToken = u.activationTokens[0] || null;
      const latestOrder = u.orders[0] || null;
      const hasPaidOrder = u.orders.some((o) => o.status === "PAID");
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
        hasPaidOrder,
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
              orderType: latestOrder.orderType,
              status: latestOrder.status,
              paymentMethod: latestOrder.paymentMethod,
              amount: Number(latestOrder.amount),
              discountAmount: latestOrder.discountAmount ? Number(latestOrder.discountAmount) : 0,
              hasProof: Boolean(latestOrder.proofImageUrl),
              rejectReason: latestOrder.rejectReason,
              paidAt: latestOrder.paidAt,
              expiredAt: latestOrder.expiredAt,
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

/**
 * POST /api/partner/clients
 * Alur B2B Reseller (Opsi A — WO Membayar Paket Pilihan dengan Harga Potongan Mitra):
 * 1. Mitra mendaftarkan data klien + memilih paket (TIER_1 / TIER_2 / TIER_3).
 * 2. Sistem menghitung Harga Resmi - Potongan Mitra (%) dan membuat tagihan Order PENDING siap bayar.
 * 3. Tautan aktivasi 48 jam untuk pengantin baru diterbitkan & dikirim otomatis SETELAH tagihan lunas (PAID),
 *    sehingga pengantin langsung masuk Setup Undangan tanpa melihat harga modal WO.
 */
export async function POST(req: NextRequest) {
  try {
    const authRes = await resolveAuthenticatedPartner(req);
    if ("error" in authRes && authRes.error) return authRes.error;
    const { partner } = authRes;

    const availability = await getServiceAvailability();
    if (!availability.isOpen) {
      return NextResponse.json(
        { error: availability.message || "Pemesanan paket sedang ditutup sementara." },
        { status: 403 },
      );
    }

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
    const rawPlanType = typeof body.planType === "string" ? body.planType.trim() : "";

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

    if (!rawPlanType || !["TIER_1", "TIER_2", "TIER_3"].includes(normalizePlanType(rawPlanType))) {
      return NextResponse.json(
        { error: "Pilih paket undangan yang valid untuk klien." },
        { status: 400 },
      );
    }

    const planType = normalizePlanType(rawPlanType) as "TIER_1" | "TIER_2" | "TIER_3";

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

    // Ambil harga resmi paket secara dinamis dari AdminSetting (Zero Hardcode)
    const tierNum = planType === "TIER_3" ? "3" : planType === "TIER_2" ? "2" : "1";
    const priceSetting = await prisma.adminSetting.findUnique({ where: { key: `price_tier${tierNum}` } });
    if (!priceSetting || !priceSetting.value || isNaN(Number(priceSetting.value)) || Number(priceSetting.value) <= 0) {
      return NextResponse.json(
        { error: `Harga paket ${planType} belum dikonfigurasi di sistem. Hubungi administrator.` },
        { status: 503 },
      );
    }

    const basePrice = Number(priceSetting.value);
    const discountAmount = calculatePartnerWholesaleDiscount(basePrice, partner);
    const finalAmount = Math.max(MIN_PAYABLE_AMOUNT_IDR, basePrice - discountAmount);

    const paymentModeSetting = await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } });
    const resolvedPaymentMethod = paymentModeSetting?.value === "MANUAL" ? "MANUAL_TRANSFER" : "GATEWAY";

    const existingUser = await prisma.user.findUnique({
      where: { email: rawEmail },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        passwordHash: true,
        provisionedByPartnerId: true,
      },
    });

    let targetUser: { id: string; name: string; email: string; phoneNumber: string | null };

    if (existingUser) {
      const alreadyActivated = Boolean(existingUser.passwordHash);
      if (existingUser.provisionedByPartnerId === partner.id && !alreadyActivated) {
        // Klien ini didaftarkan mitra yang sama & belum aktif: perbarui profil jika perlu
        targetUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: rawName,
            ...(rawPhone ? { phoneNumber: rawPhone } : {}),
          },
          select: { id: true, name: true, email: true, phoneNumber: true },
        });
      } else {
        return NextResponse.json(
          {
            error: alreadyActivated
              ? "Email ini sudah terdaftar dan aktif di sistem."
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

    // Pastikan klien belum memiliki order NEW PAID yang belum terpakai
    const existingPaidOrder = await prisma.order.findFirst({
      where: { userId: targetUser.id, status: "PAID", orderType: "NEW", invitation: { is: null } },
      select: { id: true, invoiceNumber: true },
    });
    if (existingPaidOrder) {
      return NextResponse.json(
        {
          error: `Paket untuk klien ini sudah lunas (${existingPaidOrder.invoiceNumber}). Gunakan tombol Kirim Link Aktivasi pada daftar klien.`,
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const order = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`order_create:${targetUser.id}`}))`;

      const existingPending = await tx.order.findFirst({
        where: {
          userId: targetUser.id,
          status: "PENDING",
          orderType: "NEW",
          invoiceNumber: { startsWith: PARTNER_WHOLESALE_INVOICE_PREFIX },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingPending) {
        // Jika sudah ada bukti transfer menunggu verifikasi admin, kembalikan order yang sama
        if (existingPending.proofImageUrl) {
          return existingPending;
        }

        const isExpired = Boolean(existingPending.expiredAt && now.getTime() > existingPending.expiredAt.getTime());
        const isPlanChanged = existingPending.planType !== planType;
        const hadGateway = Boolean(existingPending.gatewayTxId);

        if (isExpired || (isPlanChanged && hadGateway)) {
          await tx.order.updateMany({
            where: { id: existingPending.id, status: "PENDING" },
            data: { status: "EXPIRED", rejectReason: "Digantikan tagihan mitra baru" },
          });
        } else {
          return tx.order.update({
            where: { id: existingPending.id },
            data: {
              planType,
              amount: finalAmount,
              discountAmount: discountAmount > 0 ? discountAmount : null,
              promoCodeApplied: discountAmount > 0 ? formatPartnerPromoLabel(partner.name) : null,
              promoCouponId: null,
              paymentMethod: resolvedPaymentMethod,
              checkoutConfirmedAt: now,
              expiredAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
              ...(isPlanChanged
                ? { chargedAmount: null, gatewayQrString: null, gatewayCheckoutUrl: null, gatewaySessionExpiresAt: null, gatewayTxId: null }
                : {}),
            },
          });
        }
      }

      const invoiceNumber = `INV-WO-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
      return tx.order.create({
        data: {
          userId: targetUser.id,
          invoiceNumber,
          planType,
          orderType: "NEW",
          amount: finalAmount,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          promoCodeApplied: discountAmount > 0 ? formatPartnerPromoLabel(partner.name) : null,
          promoCouponId: null,
          status: "PENDING",
          paymentMethod: resolvedPaymentMethod,
          checkoutConfirmedAt: now,
          expiredAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        client: targetUser,
        order: {
          id: order.id,
          invoiceNumber: order.invoiceNumber,
          planType: order.planType,
          basePrice,
          discountAmount,
          amount: Number(order.amount),
          paymentMethod: order.paymentMethod,
          status: order.status,
          hasProof: Boolean(order.proofImageUrl),
          expiredAt: order.expiredAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return routeError("PartnerClientsPost", error, "Gagal membuat tagihan paket untuk klien.");
  }
}
