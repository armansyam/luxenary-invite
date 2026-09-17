import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { normalizePlanType } from "@/lib/planUtils";

export const dynamic = "force-dynamic";

const PLAN_HIERARCHY: Record<string, number> = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
};

/**
 * POST /api/payments/upgrade
 * Membuat order upgrade tier baru dengan nominal = selisih harga.
 * Harga basis diambil dari AdminSetting (price_tier1, price_tier2, price_tier3).
 *
 * Body: { invitationId: string, targetPlan: "TIER_2" | "TIER_3" }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { invitationId, targetPlan, requestedDomain } = await req.json();

    if (!invitationId || !targetPlan) {
      return NextResponse.json({ error: "invitationId dan targetPlan wajib diisi." }, { status: 400 });
    }

    const targetPlanUpper = normalizePlanType(String(targetPlan));
    if (!["TIER_2", "TIER_3"].includes(targetPlanUpper)) {
      return NextResponse.json({ error: "targetPlan hanya boleh TIER_2 atau TIER_3." }, { status: 400 });
    }

    // 1. Ambil invitation beserta order aktifnya
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

    if (invitation.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. Bukan undangan Anda." }, { status: 403 });
    }

    const currentOrder = invitation.order;
    if (!currentOrder || currentOrder.status !== "PAID") {
      return NextResponse.json({ error: "Undangan ini belum memiliki paket aktif yang lunas." }, { status: 400 });
    }

    const currentPlan = normalizePlanType(currentOrder.planType);

    // 2. Validasi arah upgrade (hanya boleh naik)
    if ((PLAN_HIERARCHY[targetPlanUpper] ?? 0) <= (PLAN_HIERARCHY[currentPlan] ?? 0)) {
      return NextResponse.json({
        error: `Tidak bisa upgrade ke ${targetPlanUpper}. Paket Anda saat ini sudah setara atau lebih tinggi.`,
      }, { status: 400 });
    }

    // 3. Ambil harga paket dan payment_mode dari AdminSetting sekaligus (1 roundtrip)
    const priceKeys = ["price_tier1", "price_tier2", "price_tier3", "payment_mode"];
    const settings = await prisma.adminSetting.findMany({
      where: { key: { in: priceKeys } },
      select: { key: true, value: true },
    });

    const priceMap: Record<string, number> = {
      TIER_1: Number(settings.find(s => s.key === "price_tier1")?.value) || 99000,
      TIER_2: Number(settings.find(s => s.key === "price_tier2")?.value) || 150000,
      TIER_3: Number(settings.find(s => s.key === "price_tier3")?.value) || 200000,
    };
    const activePaymentMode = settings.find(s => s.key === "payment_mode")?.value || "GATEWAY";
    const resolvedPaymentMethod = activePaymentMode === "MANUAL" ? "MANUAL_TRANSFER" : "GATEWAY";

    const priceFrom = priceMap[currentPlan] ?? 0;
    const priceTo = priceMap[targetPlanUpper] ?? 0;

    if (priceTo <= priceFrom) {
      return NextResponse.json({
        error: "Harga paket tujuan tidak valid. Pastikan harga paket sudah dikonfigurasi di admin.",
      }, { status: 400 });
    }

    const upgradeAmount = priceTo - priceFrom;
    let cleanDomain: string | null = null;

    if (requestedDomain && typeof requestedDomain === "string") {
      const sanitized = requestedDomain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/\s/g, "").trim();
      if (sanitized.includes(".")) {
        cleanDomain = sanitized;
      }
    }

    // 4. Cegah spam / duplikasi jika ada permintaan upgrade yang sedang menunggu verifikasi admin
    const pendingWithProof = await prisma.order.findFirst({
      where: {
        userId,
        orderType: "UPGRADE",
        linkedOrderId: currentOrder.id,
        status: "PENDING",
        proofImageUrl: { not: null },
      },
    });

    if (pendingWithProof) {
      return NextResponse.json({
        error: "Anda memiliki tagihan upgrade yang sedang menunggu verifikasi admin.",
        pendingOrderId: pendingWithProof.id,
        paymentUrl: `/payment?order=${pendingWithProof.id}`,
      }, { status: 409 });
    }

    // Tandai expired pesanan upgrade PENDING lama yang belum dibayar dan tanpa bukti transfer
    await prisma.order.updateMany({
      where: {
        userId,
        orderType: "UPGRADE",
        linkedOrderId: currentOrder.id,
        status: "PENDING",
        proofImageUrl: null,
      },
      data: {
        status: "EXPIRED",
        rejectReason: "Digantikan oleh pesanan upgrade baru",
      },
    });

    // 5. Buat order UPGRADE baru
    const invoiceNumber = `UPG-${Date.now().toString(36).toUpperCase()}-${userId.slice(0, 6).toUpperCase()}`;

    const upgradeOrder = await prisma.order.create({
      data: {
        userId,
        invoiceNumber,
        planType: targetPlanUpper as any,  // tier tujuan (untuk referensi)
        orderType: "UPGRADE",
        upgradedFromPlan: currentPlan as any,
        targetPlanType: targetPlanUpper as any,
        linkedOrderId: currentOrder.id,
        amount: upgradeAmount,
        status: "PENDING",
        paymentMethod: resolvedPaymentMethod, // Dinamis dari AdminSetting payment_mode
        requestedDomain: cleanDomain || undefined,
        checkoutConfirmedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      orderId: upgradeOrder.id,
      invoiceNumber: upgradeOrder.invoiceNumber,
      fromPlan: currentPlan,
      targetPlan: targetPlanUpper,
      amount: upgradeAmount,
      requestedDomain: cleanDomain,
      paymentUrl: `/payment?order=${upgradeOrder.id}`,
      message: `Upgrade dari ${currentPlan} ke ${targetPlanUpper}${cleanDomain ? ` + Custom Domain (${cleanDomain})` : ""}. Nominal: Rp ${upgradeAmount.toLocaleString("id-ID")}`,
    });

  } catch (error: any) {
    console.error("[Upgrade Order Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal membuat order upgrade." : (error.message || "Gagal membuat order upgrade.") }, { status: 500 });
  }
}
