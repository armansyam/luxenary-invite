import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";
import { hasPlanCapability } from "@/lib/settings";
import { getLatestEventDate } from "@/lib/domainUtils";
import { normalizePlanType } from "@/lib/planUtils";

export const dynamic = "force-dynamic";

const PLAN_HIERARCHY: Record<string, number> = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
};

const PLAN_NAMES: Record<string, string> = {
  TIER_1: "Serenade",
  TIER_2: "Symphony",
  TIER_3: "Eternity",
};

interface BundleItem {
  type: "UPGRADE" | "GALLERY_EXTENSION" | "MEMORIES_TOPUP";
  label: string;
  price: number;
  domain?: string;
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
    const currentPlan = normalizePlanType(currentOrder?.planType);

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
      "price_tier1",
      "price_tier2",
      "price_tier3",
      "name_tier1",
      "name_tier2",
      "name_tier3",
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
      TIER_1: Number(settingsMap["price_tier1"]) || 99000,
      TIER_2: Number(settingsMap["price_tier2"]) || 150000,
      TIER_3: Number(settingsMap["price_tier3"]) || 200000,
    };

    const planNames: Record<string, string> = {
      TIER_1: settingsMap["name_tier1"] || PLAN_NAMES.TIER_1,
      TIER_2: settingsMap["name_tier2"] || PLAN_NAMES.TIER_2,
      TIER_3: settingsMap["name_tier3"] || PLAN_NAMES.TIER_3,
    };

    const monthlyExtPrice = Number(settingsMap["gallery_extension_price_per_month"]) || 50000;
    const topupPricePerBatch = Number(settingsMap["addon_memories_topup_price"]) || 35000;
    const topupPhotosPerBatch = Number(settingsMap["addon_memories_topup_photos"]) || 100;
    const isTopupEnabled = settingsMap["addon_memories_topup_enabled"] !== "false";

    const items: BundleItem[] = [];

    // 4. Kalkulasi Item 1: Upgrade Paket (jika diminta)
    let effectiveTargetPlan: string | null = null;
    if (targetPlan) {
      const canonicalTarget = normalizePlanType(String(targetPlan));
      if (!["TIER_2", "TIER_3"].includes(canonicalTarget)) {
        return NextResponse.json({ error: "Paket tujuan upgrade tidak valid." }, { status: 400 });
      }

      if ((PLAN_HIERARCHY[canonicalTarget] ?? 0) <= (PLAN_HIERARCHY[currentPlan] ?? 0)) {
        return NextResponse.json({
          error: `Tidak bisa upgrade ke ${planNames[canonicalTarget] || canonicalTarget}. Paket Anda saat ini sudah setara atau lebih tinggi.`,
        }, { status: 400 });
      }

      const priceFrom = priceMap[currentPlan] ?? 0;
      const priceTo = priceMap[canonicalTarget] ?? 0;
      const diffPrice = Math.max(0, priceTo - priceFrom);

      effectiveTargetPlan = canonicalTarget;
      items.push({
        type: "UPGRADE",
        label: `Upgrade ke Paket ${planNames[canonicalTarget]}`,
        price: diffPrice,
        fromPlan: currentPlan,
        targetPlan: canonicalTarget,
      });
    }

    // 5. Kalkulasi Item 2: Perpanjangan Masa Aktif Galeri (maksimal 1x 30 hari di H-7)
    const extMonths = Number(extensionMonths);
    if (!isNaN(extMonths) && extMonths > 0) {
      if (!isAdmin) {
        let curFs: any = {};
        try {
          curFs = typeof invitation.featureSettings === "object"
            ? (invitation.featureSettings || {})
            : JSON.parse((invitation.featureSettings as string) || "{}");
        } catch {}

        const extraGalleryDays = Number(curFs.extraGalleryDays) || 0;
        if (extraGalleryDays >= 30) {
          return NextResponse.json({
            error: "Batas maksimal perpanjangan masa aktif (+30 hari) telah tercapai untuk undangan ini.",
          }, { status: 400 });
        }

        if (extMonths > 1) {
          return NextResponse.json({
            error: "Perpanjangan hanya dapat dilakukan maksimal 1 kali (+30 hari).",
          }, { status: 400 });
        }

        // Cek apakah masih > 7 hari
        const cleanupSetting = settings.find(s => s.key === "retention_cleanup_days");
        const retentionDays = Number(cleanupSetting?.value) || 30;
        const latestEventDate = getLatestEventDate(invitation.eventData);
        const effectiveExpiry = invitation.galleryExpiresAt
          ? new Date(invitation.galleryExpiresAt)
          : latestEventDate
          ? new Date(latestEventDate.getTime() + retentionDays * 24 * 60 * 60 * 1000)
          : null;

        if (effectiveExpiry) {
          const daysRemaining = Math.ceil((effectiveExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysRemaining > 7) {
            return NextResponse.json({
              error: `Perpanjangan hanya dapat dilakukan pada H-7 sebelum masa aktif berakhir (sisa ${daysRemaining} hari).`,
            }, { status: 400 });
          }
        }
      }

      const days = 30;
      const extPrice = monthlyExtPrice;

      items.push({
        type: "GALLERY_EXTENSION",
        label: `Perpanjangan Masa Aktif Undangan & Galeri (+30 Hari)`,
        price: extPrice,
        months: 1,
        days: 30,
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

    // Tentukan orderType utama (harus cocok dengan enum OrderType: NEW, UPGRADE, GALLERY_EXTENSION, MEMORIES_TOPUP)
    const primaryOrderType = effectiveTargetPlan
      ? "UPGRADE"
      : items.some((i) => i.type === "GALLERY_EXTENSION")
      ? "GALLERY_EXTENSION"
      : "MEMORIES_TOPUP";

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
