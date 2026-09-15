import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";
import { hasPlanCapability } from "@/lib/settings";

export const dynamic = "force-dynamic";

const PLAN_HIERARCHY: Record<string, number> = {
  TRADITIONAL: 1,
  MODERN: 2,
  PREMIUM: 3,
};

const PLAN_NAMES: Record<string, string> = {
  TRADITIONAL: "Serenade",
  MODERN: "Symphony",
  PREMIUM: "Eternity",
};

interface BundleItem {
  type: "UPGRADE" | "GALLERY_EXTENSION" | "MEMORIES_TOPUP";
  label: string;
  price: number;
  targetPlan?: string;
  fromPlan?: string;
  months?: number;
  days?: number;
  batches?: number;
  photos?: number;
}

/**
 * POST /api/client/orders/checkout-bundle
 * Endpoint terpadu untuk menerbitkan 1 Invoice multi-layanan (Upgrade + Add-On)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const {
      invitationId,
      targetPlan,
      extensionMonths = 0,
      topupBatches = 0,
      customDomain = null,
    } = body;

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId wajib disertakan." }, { status: 400 });
    }

    // 1. Verifikasi kepemilikan undangan dan order aktif
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        order: {
          select: { id: true, planType: true, status: true, amount: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    const isOwner = invitation.userId === userId;
    const isAdmin = (session.user as any)?.isAdmin === true || (session.user as any)?.role === "SUPER_ADMIN" || (session.user as any)?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    const currentOrder = invitation.order;
    const currentPlan = (currentOrder?.planType || "TRADITIONAL").toUpperCase();

    // 2. Cegah spam / duplikasi jika ada pesanan pending yang sudah memiliki bukti transfer
    const existingPendingWithProof = await prisma.order.findFirst({
      where: {
        userId,
        linkedOrderId: invitation.id,
        status: "PENDING",
        proofImageUrl: { not: null },
      },
    });

    if (existingPendingWithProof) {
      return NextResponse.json({
        error: "Anda memiliki tagihan yang sedang menunggu verifikasi admin.",
        orderId: existingPendingWithProof.id,
        invoiceNumber: existingPendingWithProof.invoiceNumber,
        paymentUrl: `/payment?order=${existingPendingWithProof.id}`,
        isPendingVerification: true,
      }, { status: 409 });
    }

    // 3. Ambil konfigurasi harga dinamis dari admin_settings
    const settingKeys = [
      "price_traditional",
      "price_modern",
      "price_premium",
      "name_traditional",
      "name_modern",
      "name_premium",
      "gallery_extension_price_per_month",
      "addon_memories_topup_price",
      "addon_memories_topup_photos",
      "addon_memories_topup_enabled",
      "payment_mode",
      "payment_expiry_minutes",
    ];

    const settings = await prisma.adminSetting.findMany({
      where: { key: { in: settingKeys } },
      select: { key: true, value: true },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const priceMap: Record<string, number> = {
      TRADITIONAL: Number(settingsMap["price_traditional"]) || 50000,
      MODERN: Number(settingsMap["price_modern"]) || 150000,
      PREMIUM: Number(settingsMap["price_premium"]) || 250000,
    };

    const planNames: Record<string, string> = {
      TRADITIONAL: settingsMap["name_traditional"] || PLAN_NAMES.TRADITIONAL,
      MODERN: settingsMap["name_modern"] || PLAN_NAMES.MODERN,
      PREMIUM: settingsMap["name_premium"] || PLAN_NAMES.PREMIUM,
    };

    const monthlyExtPrice = Number(settingsMap["gallery_extension_price_per_month"]) || 50000;
    const topupPricePerBatch = Number(settingsMap["addon_memories_topup_price"]) || 35000;
    const topupPhotosPerBatch = Number(settingsMap["addon_memories_topup_photos"]) || 100;
    const isTopupEnabled = settingsMap["addon_memories_topup_enabled"] !== "false";

    const items: BundleItem[] = [];

    // 4. Kalkulasi Item 1: Upgrade Paket (jika diminta)
    let effectiveTargetPlan: string | null = null;
    if (targetPlan) {
      const targetPlanUpper = String(targetPlan).toUpperCase();
      if (!["MODERN", "PREMIUM"].includes(targetPlanUpper)) {
        return NextResponse.json({ error: "Paket tujuan upgrade tidak valid." }, { status: 400 });
      }

      if ((PLAN_HIERARCHY[targetPlanUpper] ?? 0) <= (PLAN_HIERARCHY[currentPlan] ?? 0)) {
        return NextResponse.json({
          error: `Tidak bisa upgrade ke ${planNames[targetPlanUpper] || targetPlanUpper}. Paket Anda saat ini sudah setara atau lebih tinggi.`,
        }, { status: 400 });
      }

      const priceFrom = priceMap[currentPlan] ?? 0;
      const priceTo = priceMap[targetPlanUpper] ?? 0;
      const diffPrice = Math.max(0, priceTo - priceFrom);

      items.push({
        type: "UPGRADE",
        label: `Upgrade Paket: ${planNames[currentPlan] || currentPlan} ➔ ${planNames[targetPlanUpper] || targetPlanUpper}`,
        price: diffPrice,
        fromPlan: currentPlan,
        targetPlan: targetPlanUpper,
      });

      effectiveTargetPlan = targetPlanUpper;
    }

    // 5. Kalkulasi Item 2: Perpanjangan Masa Aktif Galeri (kelipatan bulan)
    const extMonths = Number(extensionMonths);
    if (!isNaN(extMonths) && extMonths > 0) {
      let extPrice = 0;
      let days = extMonths * 30;

      if (extMonths === 12) {
        extPrice = monthlyExtPrice * 12;
        days = 365;
      } else {
        extPrice = extMonths * monthlyExtPrice;
      }

      items.push({
        type: "GALLERY_EXTENSION",
        label: `Perpanjangan Masa Aktif Galeri (+${extMonths} Bulan / ${days} Hari)`,
        price: extPrice,
        months: extMonths,
        days,
      });
    }

    // 6. Kalkulasi Item 3: Top-Up Kuota Foto Acara
    const topupCount = Number(topupBatches);
    if (!isNaN(topupCount) && topupCount > 0) {
      if (!isTopupEnabled) {
        return NextResponse.json({ error: "Layanan add-on top-up kuota foto sedang dinonaktifkan." }, { status: 400 });
      }

      const totalExtraPhotos = topupCount * topupPhotosPerBatch;
      const totalTopupPrice = topupCount * topupPricePerBatch;

      items.push({
        type: "MEMORIES_TOPUP",
        label: `Top-Up Kuota Foto Acara (+${totalExtraPhotos} Foto)`,
        price: totalTopupPrice,
        batches: topupCount,
        photos: totalExtraPhotos,
      });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Pilih setidaknya satu layanan upgrade atau add-on." }, { status: 400 });
    }

    // 7. Hitung Total Tagihan
    const totalAmount = items.reduce((acc, curr) => acc + curr.price, 0);

    // 8. Tandai expired pesanan PENDING lama yang belum dibayar dan tanpa bukti transfer
    await prisma.order.updateMany({
      where: {
        userId,
        linkedOrderId: invitation.id,
        status: "PENDING",
        proofImageUrl: null,
      },
      data: {
        status: "EXPIRED",
        rejectReason: "Digantikan oleh checkout tagihan terpadu baru",
      },
    });

    // 9. Generate Invoice Number unik
    const prefix = effectiveTargetPlan ? "UPG" : "BDL";
    const invoiceNumber = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Resolusi Payment Method dari AdminSetting
    const activePaymentMode = settingsMap["payment_mode"] || "GATEWAY";
    const resolvedPaymentMethod = activePaymentMode === "MANUAL" ? "MANUAL_TRANSFER" : "GATEWAY";

    // Waktu kadaluarsa order (default 24 jam / 1440 menit)
    const expiryMinutes = Number(settingsMap["payment_expiry_minutes"]) || 1440;
    const expiredAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Tentukan orderType utama (harus cocok dengan enum OrderType: NEW, UPGRADE, GALLERY_EXTENSION)
    const primaryOrderType = effectiveTargetPlan ? "UPGRADE" : "GALLERY_EXTENSION";

    // 11. Buat Order baru dengan itemsJson terstruktur
    const newOrder = await prisma.order.create({
      data: {
        id: randomUUID(),
        userId,
        invoiceNumber,
        planType: (effectiveTargetPlan || currentPlan) as any,
        orderType: primaryOrderType as any,
        upgradedFromPlan: effectiveTargetPlan ? (currentPlan as any) : null,
        targetPlanType: effectiveTargetPlan ? (effectiveTargetPlan as any) : null,
        linkedOrderId: invitation.id,
        amount: totalAmount,
        status: "PENDING",
        paymentMethod: resolvedPaymentMethod,
        expiredAt,
        checkoutConfirmedAt: new Date(),
        itemsJson: JSON.stringify(items),
      },
    });

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      invoiceNumber: newOrder.invoiceNumber,
      amount: totalAmount,
      items,
      paymentUrl: `/payment?order=${newOrder.id}`,
      message: "Tagihan terpadu berhasil dibuat.",
    });
  } catch (error: any) {
    console.error("[POST /api/client/orders/checkout-bundle error]:", error);
    return NextResponse.json({ error: `Terjadi kesalahan saat memproses checkout terpadu: ${error?.message || error}` }, { status: 500 });
  }
}
