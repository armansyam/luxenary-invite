import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { NextRequest, NextResponse } from "next/server";
import { normalizePlanType } from "@/lib/planUtils";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout/confirm
 * Titik 2: Konfirmasi pesanan sebelum masuk ke halaman /payment.
 * Memvalidasi PromoHold, mengunci diskon & final amount, serta menandai checkoutConfirmedAt.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const { orderId, buyerName, buyerPhone } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        promoHold: true,
        user: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    const isAdmin = hasAdminPermission(session.user, "orders");

    if (order.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: "Akses ditolak. Bukan pesanan Anda." }, { status: 403 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({
        error: `Pesanan tidak dapat dikonfirmasi (Status: ${order.status}).`,
      }, { status: 400 });
    }

    // 1. Simpan update profil nama & telepon jika ada
    if (buyerName || buyerPhone) {
      const userUpdates: { name?: string; phoneNumber?: string } = {};
      if (typeof buyerName === "string" && buyerName.trim()) {
        userUpdates.name = buyerName.trim();
      }
      if (typeof buyerPhone === "string" && buyerPhone.trim()) {
        const cleanPhone = buyerPhone.replace(/\D/g, "");
        if (cleanPhone.length >= 9 && cleanPhone.length <= 15) {
          userUpdates.phoneNumber = cleanPhone;
        }
      }
      if (Object.keys(userUpdates).length > 0) {
        await prisma.user.update({
          where: { id: order.userId },
          data: userUpdates,
        });
      }
    }

    // 2. Ambil harga dasar resmi dari AdminSetting secara dinamis sesuai jenis order (Zero Hardcode)
    let basePrice = Number(order.amount);

    if (order.itemsJson) {
      // Untuk pesanan terpadu (bundle add-on / upgrade), gunakan nominal order.amount yang telah dihitung server
      basePrice = Number(order.amount);
    } else if (order.orderType === "NEW") {
      const canonical = normalizePlanType(order.planType);
      const priceKeyMap: Record<string, string> = {
        TIER_1: "price_tier1",
        TIER_2: "price_tier2",
        TIER_3: "price_tier3",
      };
      const priceKey = priceKeyMap[canonical];
      const priceSetting = await prisma.adminSetting.findUnique({ where: { key: priceKey } });
      if (priceSetting && !isNaN(Number(priceSetting.value))) {
        basePrice = Number(priceSetting.value);
      }
    } else {
      // Untuk UPGRADE dan GALLERY_EXTENSION, gunakan nominal order.amount
      basePrice = Number(order.amount);
    }

    const now = new Date();
    let appliedDiscount = 0;
    let appliedPromoCode: string | null = null;
    let promoCouponId: string | null = null;

    // 3. Verifikasi PromoHold jika ada
    if (order.promoHold && order.promoHold.status === "HELD") {
      if (order.promoHold.expiresAt > now) {
        // Cek apakah kupon masih aktif (lazy check)
        const coupon = await prisma.promoCoupon.findUnique({
          where: { code: order.promoHold.promoCode },
        });

        const planAllowed = !coupon || coupon.applicablePlans.length === 0 || coupon.applicablePlans.includes(order.planType);
        if (coupon && coupon.isActive && planAllowed && (!coupon.validUntil || coupon.validUntil > now)) {
          // Kunci diskon dari discountAmount yang tersimpan di hold (Celah 2: tidak recalculate), tidak melebihi harga paket
          appliedDiscount = Math.min(Number(order.promoHold.discountAmount), basePrice);
          appliedPromoCode = coupon.code;
          promoCouponId = coupon.id;
        } else {
          // Kupon sudah dinonaktifkan admin di antara waktu apply dan konfirmasi
          await prisma.promoHold.update({
            where: { id: order.promoHold.id },
            data: { status: "RELEASED" },
          });

          return NextResponse.json({
            error: "Kode promo tidak lagi berlaku untuk pesanan ini (dinonaktifkan atau tidak sesuai paket). Rincian harga telah dikembalikan normal.",
            promoRevoked: true,
          }, { status: 400 });
        }
      } else {
        // Hold sudah expired
        await prisma.promoHold.update({
          where: { id: order.promoHold.id },
          data: { status: "RELEASED" },
        });
      }
    }

    const finalBaseAmount = Math.max(0, basePrice - appliedDiscount);

    // Re-resolusi paymentMethod dari platform AdminSetting — sinkronisasi saat konfirmasi
    // Platform setting selalu menang atas order-level default untuk memastikan konsistensi
    const paymentModeSettingConfirm = await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } });
    const resolvedMethodOnConfirm = paymentModeSettingConfirm?.value === "MANUAL" ? "MANUAL_TRANSFER" : "GATEWAY";

    // 4. Update Order: finalisasi amount, paymentMethod, set checkoutConfirmedAt
    // Sesi gateway yang sudah terbit dengan nominal atau metode lama harus dibatalkan: QR lama tidak boleh tetap bisa
    // dibayar, dan /payment akan menerbitkan sesi baru dengan nominal yang benar.
    const hasGatewaySession = Boolean(order.snapToken || order.gatewayTxId);
    const sessionOutdated = hasGatewaySession && (finalBaseAmount !== Number(order.amount) || resolvedMethodOnConfirm !== "GATEWAY");
    if (sessionOutdated) {
      try {
        const { getGatewayById, getActiveGateway } = await import("@/lib/gatewayRegistry");
        const gateway = order.gatewayId ? await getGatewayById(order.gatewayId) : await getActiveGateway();
        const cancelRes = await gateway.cancel(order.gatewayTxId || order.id);
        if (!cancelRes.success && cancelRes.error?.includes("terbayar")) {
          return NextResponse.json({
            error: "Pesanan ini sudah terbayar di payment gateway dan rinciannya tidak dapat diubah.",
            isPaid: true,
          }, { status: 409 });
        }
      } catch (err) {
        logger.error("CheckoutConfirm", "Gagal membatalkan sesi gateway lama", err, { orderId: order.id });
      }
    }

    const confirmed = await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: {
        ...(sessionOutdated ? { snapToken: null, gatewayTxId: null, chargedAmount: null } : {}),
        amount: finalBaseAmount,
        discountAmount: appliedDiscount > 0 ? appliedDiscount : null,
        promoCodeApplied: appliedPromoCode,
        promoCouponId: promoCouponId,
        paymentMethod: resolvedMethodOnConfirm,
        checkoutConfirmedAt: now,
      },
    });
    if (confirmed.count === 0) {
      return NextResponse.json({ error: "Pesanan sudah diproses oleh proses lain. Muat ulang halaman." }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: finalBaseAmount,
      discountAmount: appliedDiscount,
      promoCode: appliedPromoCode,
      redirectUrl: `/payment?order=${order.id}`,
    });
  } catch (error) {
    return routeError("CheckoutConfirm", error, "Gagal mengonfirmasi pesanan");
  }
}
