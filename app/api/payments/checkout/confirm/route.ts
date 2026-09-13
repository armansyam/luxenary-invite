import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

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

    const isAdmin =
      (session.user as any)?.role === "ADMIN" ||
      (session.user as any)?.role === "SUPER_ADMIN";

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

    // 2. Ambil harga dasar paket resmi dari AdminSetting
    const priceKey = `price_${order.planType.toLowerCase()}`;
    const priceSetting = await prisma.adminSetting.findUnique({ where: { key: priceKey } });
    const basePrice = priceSetting && !isNaN(Number(priceSetting.value))
      ? Number(priceSetting.value)
      : Number(order.amount);

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

        if (coupon && coupon.isActive && (!coupon.validUntil || coupon.validUntil > now)) {
          // Kunci diskon dari discountAmount yang tersimpan di hold (Celah 2: tidak recalculate)
          appliedDiscount = Number(order.promoHold.discountAmount);
          appliedPromoCode = coupon.code;
          promoCouponId = coupon.id;
        } else {
          // Kupon sudah dinonaktifkan admin di antara waktu apply dan konfirmasi
          await prisma.promoHold.update({
            where: { id: order.promoHold.id },
            data: { status: "RELEASED" },
          });

          return NextResponse.json({
            error: "Kode promo yang digunakan telah dinonaktifkan. Rincian harga telah dikembalikan normal.",
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

    // 4. Update Order: finalisasi amount, set checkoutConfirmedAt
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        amount: finalBaseAmount,
        discountAmount: appliedDiscount > 0 ? appliedDiscount : null,
        promoCodeApplied: appliedPromoCode,
        promoCouponId: promoCouponId,
        checkoutConfirmedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: updatedOrder.id,
      amount: finalBaseAmount,
      discountAmount: appliedDiscount,
      promoCode: appliedPromoCode,
      redirectUrl: `/payment?order=${updatedOrder.id}`,
    });
  } catch (error: any) {
    console.error("[Checkout Confirm Error]", error);
    return NextResponse.json({ error: error.message || "Gagal mengonfirmasi pesanan" }, { status: 500 });
  }
}
