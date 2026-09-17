import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { PlanType } from "@prisma/client";
import { normalizePlanType } from "@/lib/planUtils";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/promo/validate
 * Titik 1: Validasi kode promo/referral dan reservasi kuota via PromoHold (Atomic with DB Lock)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Silakan login terlebih dahulu untuk menggunakan kode promo." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const { code: rawCode, orderId } = body;

    if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
      return NextResponse.json({ error: "Kode promo tidak boleh kosong." }, { status: 400 });
    }

    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib disertakan." }, { status: 400 });
    }

    const cleanCode = rawCode.trim().toUpperCase();

    // 1. Cek Master Switch Promo di AdminSetting
    const promoSetting = await prisma.adminSetting.findUnique({
      where: { key: "promo_enabled" },
    });
    if (promoSetting?.value !== "true") {
      return NextResponse.json(
        { error: "Fitur kode promo sedang tidak diaktifkan." },
        { status: 400 }
      );
    }

    // 2. Cek Order milik user ini dan berstatus PENDING
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
    }

    if (order.userId !== userId && (session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Akses ditolak. Bukan order Anda." }, { status: 403 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: `Order tidak dapat diproses (Status: ${order.status}).` },
        { status: 400 }
      );
    }

    const now = new Date();

    // 3. Eksekusi Validasi & Locking Kuota via DB Transaction (Atomic)
    const result = await prisma.$transaction(async (tx) => {
      // 3.1 Lock baris kupon via SELECT ... FOR UPDATE untuk cegah race condition
      const coupons = await tx.$queryRaw<any[]>`
        SELECT * FROM promo_coupons WHERE UPPER(code) = ${cleanCode} LIMIT 1 FOR UPDATE
      `;

      if (!coupons || coupons.length === 0) {
        throw new Error("Kode promo tidak ditemukan.");
      }

      const coupon = coupons[0];

      // 3.2 Cek status aktif
      if (!coupon.isActive) {
        throw new Error("Kode promo sudah tidak aktif.");
      }

      // 3.3 Cek periode berlaku
      if (coupon.validFrom && new Date(coupon.validFrom) > now) {
        throw new Error("Kode promo belum mulai berlaku.");
      }
      if (coupon.validUntil && new Date(coupon.validUntil) < now) {
        throw new Error("Masa berlaku kode promo telah berakhir.");
      }

      // 3.4 Cek paket yang berlaku (applicablePlans)
      if (coupon.applicablePlans && coupon.applicablePlans.length > 0) {
        if (!coupon.applicablePlans.includes(order.planType as PlanType)) {
          throw new Error(`Kode promo ini hanya berlaku untuk paket: ${coupon.applicablePlans.join(", ")}.`);
        }
      }

      // 3.5 Cek Anti Self-Referral jika ini kode mitra
      if (coupon.partnerId) {
        const partner = await tx.partnerAffiliate.findUnique({
          where: { id: coupon.partnerId },
        });

        if (partner) {
          const userEmail = order.user?.email?.toLowerCase();
          const userPhone = order.user?.phoneNumber?.replace(/\D/g, "");
          const partnerEmail = partner.email?.toLowerCase();
          const partnerPhone = partner.phoneNumber?.replace(/\D/g, "");

          if (
            (partnerEmail && userEmail && partnerEmail === userEmail) ||
            (partnerPhone && userPhone && partnerPhone === userPhone)
          ) {
            throw new Error("Anda tidak dapat menggunakan kode referral milik sendiri.");
          }
        }
      }

      // 3.6 Cek per-user limit
      if (coupon.perUserLimit && coupon.perUserLimit > 0) {
        const userUsageCount = await tx.order.count({
          where: {
            userId,
            promoCouponId: coupon.id,
            status: "PAID",
          },
        });

        if (userUsageCount >= coupon.perUserLimit) {
          throw new Error(`Anda telah mencapai batas maksimal pemakaian (${coupon.perUserLimit}x) untuk kode ini.`);
        }
      }

      // 3.7 Cek kuota efektif (Celah 4: perhitungkan hold aktif yang belum kedaluwarsa)
      if (coupon.quotaLimit !== null && coupon.quotaLimit !== undefined) {
        const activeHolds = await tx.promoHold.count({
          where: {
            promoCode: coupon.code,
            status: "HELD",
            expiresAt: { gt: now },
            orderId: { not: order.id }, // Jangan hitung order sendiri
          },
        });

        const effectiveUsed = coupon.usageCount + activeHolds;
        if (effectiveUsed >= coupon.quotaLimit) {
          throw new Error("Kuota pemakaian kode promo ini sudah habis.");
        }
      }

      // 3.8 Hitung nominal diskon berdasarkan base package price
      // Ambil harga dasar paket dari setting atau order amount
      const canonical = normalizePlanType(order.planType);
      const priceKeyMap: Record<string, string> = {
        TIER_1: "price_tier1",
        TIER_2: "price_tier2",
        TIER_3: "price_tier3",
      };
      const priceSettingKey = priceKeyMap[canonical];
      const basePriceSetting = await tx.adminSetting.findUnique({ where: { key: priceSettingKey } });
      const basePackagePrice = basePriceSetting && !isNaN(Number(basePriceSetting.value))
        ? Number(basePriceSetting.value)
        : Number(order.amount);

      // Cek minimum belanja (minOrderAmount)
      if (coupon.minOrderAmount && basePackagePrice < Number(coupon.minOrderAmount)) {
        throw new Error(`Minimal pembelian untuk menggunakan kode ini adalah Rp ${Number(coupon.minOrderAmount).toLocaleString("id-ID")}.`);
      }

      let calculatedDiscount = 0;
      if (coupon.discountType === "NOMINAL") {
        calculatedDiscount = Number(coupon.discountValue);
      } else if (coupon.discountType === "PERCENT") {
        calculatedDiscount = Math.round(basePackagePrice * (Number(coupon.discountValue) / 100));
        if (coupon.maxDiscountAmount && Number(coupon.maxDiscountAmount) > 0) {
          calculatedDiscount = Math.min(calculatedDiscount, Number(coupon.maxDiscountAmount));
        }
      }

      // Pastikan diskon tidak melebihi harga layanan
      calculatedDiscount = Math.max(0, Math.min(calculatedDiscount, basePackagePrice));

      // 3.9 Bersihkan PromoHold lama pada order ini jika ada
      await tx.promoHold.deleteMany({
        where: { orderId: order.id },
      });

      // 3.10 Buat PromoHold baru (Kunci diskon & kuota)
      // expiresAt mengikuti batas waktu Order (order.expiredAt atau now + 24 jam)
      const holdExpiresAt = order.expiredAt || new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const hold = await tx.promoHold.create({
        data: {
          promoCode: coupon.code,
          orderId: order.id,
          userId,
          status: "HELD",
          discountAmount: calculatedDiscount,
          expiresAt: holdExpiresAt,
        },
      });

      return {
        valid: true,
        holdId: hold.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountAmount: calculatedDiscount,
        basePrice: basePackagePrice,
        validUntil: coupon.validUntil ? new Date(coupon.validUntil).getTime() : null,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.warn("[Promo Validate] Warning:", err.message);
    return NextResponse.json({ error: err.message || "Gagal memvalidasi kode promo" }, { status: 400 });
  }
}

/**
 * DELETE /api/public/promo/validate?orderId=xxx
 * Melepaskan PromoHold aktif jika pengguna membatalkan/menghapus promo sebelum konfirmasi.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
    }

    const { releaseOrderPromoHold } = await import("@/lib/marketing");
    await releaseOrderPromoHold(orderId);

    return NextResponse.json({ success: true, message: "Promo hold berhasil dilepaskan" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal melepaskan promo" }, { status: 500 });
  }
}
