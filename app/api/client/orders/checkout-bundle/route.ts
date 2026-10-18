import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { HttpError, routeError } from "@/lib/routeError";
import { hasPlanCapability } from "@/lib/settings";
import { expireSupersededOrders } from "@/lib/paymentSession";
import { randomUUID } from "crypto";
import { computeLifecycleDates, getPrimaryEventDate } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { DEFAULT_PLAN_NAMES, normalizePlanType } from "@/lib/planUtils";

export const dynamic = "force-dynamic";

const PLAN_HIERARCHY: Record<string, number> = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
};

const MAX_TOPUP_BATCHES = 20;

type BundleItem = {
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
};

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
    const isAdmin = hasAdminPermission(session.user, "orders");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    const currentOrder = invitation.order;
    if (!currentOrder || currentOrder.status !== "PAID") {
      return NextResponse.json({ error: "Undangan ini belum memiliki paket aktif yang lunas." }, { status: 400 });
    }
    const currentPlan = normalizePlanType(currentOrder.planType);

    // 2. Cegah spam / duplikasi jika ada pesanan pending yang sudah memiliki bukti transfer
    const existingPendingWithProof = await prisma.order.findFirst({
      where: {
        userId,
        linkedInvitationId: invitation.id,
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
    ];

    const settings = await prisma.adminSetting.findMany({
      where: { key: { in: settingKeys } },
      select: { key: true, value: true },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // Harga tidak pernah diisi angka karangan: pengaturan yang hilang atau tidak sah menghentikan tagihan.
    const configuredPrice = (key: string): number => {
      const value = Number(settingsMap[key]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new HttpError(503, `Harga layanan (${key}) belum dikonfigurasi. Hubungi administrator.`);
      }
      return value;
    };

    const planNames: Record<string, string> = {
      TIER_1: settingsMap["name_tier1"] || DEFAULT_PLAN_NAMES.TIER_1,
      TIER_2: settingsMap["name_tier2"] || DEFAULT_PLAN_NAMES.TIER_2,
      TIER_3: settingsMap["name_tier3"] || DEFAULT_PLAN_NAMES.TIER_3,
    };

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

      const priceFrom = configuredPrice(`price_tier${currentPlan.slice(-1)}`);
      const priceTo = configuredPrice(`price_tier${canonicalTarget.slice(-1)}`);
      const diffPrice = priceTo - priceFrom;
      if (diffPrice <= 0) {
        return NextResponse.json({ error: "Harga paket tujuan tidak lebih tinggi dari paket saat ini. Hubungi administrator." }, { status: 400 });
      }

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
      // Tenggat galeri dihitung dari jadwal terima tamu; tanpa tanggal itu perpanjangan tidak punya patokan.
      if (!getPrimaryEventDate(invitation.eventData)) {
        return NextResponse.json({
          error: "Tanggal jadwal terima tamu belum diisi. Perpanjangan masa aktif baru dapat dibeli setelah tanggal acara ditetapkan.",
        }, { status: 400 });
      }
      if (!isAdmin) {
        if (invitation.extraGalleryDays >= 30) {
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
        const effectiveExpiry = computeLifecycleDates(
          { eventData: invitation.eventData, galleryExpiresAt: invitation.galleryExpiresAt },
          await getLifecycleSettings()
        )?.galleryExpiresAt ?? null;

        if (effectiveExpiry) {
          const daysRemaining = Math.ceil((effectiveExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysRemaining > 7) {
            return NextResponse.json({
              error: `Perpanjangan hanya dapat dilakukan pada H-7 sebelum masa aktif berakhir (sisa ${daysRemaining} hari).`,
            }, { status: 400 });
          }
        }
      }

      const extPrice = configuredPrice("gallery_extension_price_per_month");

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
    if (topupCount !== 0 && !Number.isNaN(topupCount)) {
      if (!Number.isInteger(topupCount) || topupCount < 1 || topupCount > MAX_TOPUP_BATCHES) {
        return NextResponse.json({ error: `Jumlah paket top-up harus bilangan bulat 1 sampai ${MAX_TOPUP_BATCHES}.` }, { status: 400 });
      }
      if (!isTopupEnabled) {
        return NextResponse.json({ error: "Layanan add-on top-up kuota foto sedang dinonaktifkan." }, { status: 400 });
      }
      // Kuota tambahan hanya bermakna bila paket (setelah upgrade di tagihan yang sama) memiliki kamera tamu.
      if (!(await hasPlanCapability(effectiveTargetPlan || currentPlan, "guest_memories"))) {
        return NextResponse.json({ error: "Paket Anda belum memiliki fitur kamera tamu. Upgrade paket terlebih dahulu." }, { status: 400 });
      }

      const totalExtraPhotos = topupCount * configuredPrice("addon_memories_topup_photos");
      const totalTopupPrice = topupCount * configuredPrice("addon_memories_topup_price");

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
    await expireSupersededOrders({ userId, linkedInvitationId: invitation.id }, "Digantikan oleh checkout tagihan terpadu baru");

    // 9. Generate Invoice Number unik
    const prefix = effectiveTargetPlan ? "UPG" : "BDL";
    const invoiceNumber = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Resolusi Payment Method dari AdminSetting
    const activePaymentMode = settingsMap["payment_mode"] || "GATEWAY";
    const resolvedPaymentMethod = activePaymentMode === "MANUAL" ? "MANUAL_TRANSFER" : "GATEWAY";

    // Batas hidup order 24 jam seperti order NEW. payment_expiry_minutes adalah umur sesi QRIS/checkout gateway,
    // yang diterbitkan ulang selama order masih hidup.
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
        linkedInvitationId: invitation.id,
        amount: totalAmount,
        status: "PENDING",
        paymentMethod: resolvedPaymentMethod,
        expiredAt,
        checkoutConfirmedAt: new Date(),
        itemsJson: items,
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
  } catch (error) {
    return routeError("CheckoutBundle", error, "Terjadi kesalahan saat memproses checkout terpadu");
  }
}
