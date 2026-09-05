import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PLAN_HIERARCHY: Record<string, number> = {
  TRADITIONAL: 1,
  MODERN: 2,
  PREMIUM: 3,
};

/**
 * POST /api/payments/upgrade
 * Membuat order upgrade tier baru dengan nominal = selisih harga.
 * Harga basis diambil dari AdminSetting (price_traditional, price_modern, price_premium).
 *
 * Body: { invitationId: string, targetPlan: "MODERN" | "PREMIUM" }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { invitationId, targetPlan, includeCustomDomain, requestedDomain } = await req.json();

    if (!invitationId || !targetPlan) {
      return NextResponse.json({ error: "invitationId dan targetPlan wajib diisi." }, { status: 400 });
    }

    const targetPlanUpper = String(targetPlan).toUpperCase();
    if (!["MODERN", "PREMIUM"].includes(targetPlanUpper)) {
      return NextResponse.json({ error: "targetPlan hanya boleh MODERN atau PREMIUM." }, { status: 400 });
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

    const currentPlan = currentOrder.planType.toUpperCase();

    // 2. Validasi arah upgrade (hanya boleh naik)
    if ((PLAN_HIERARCHY[targetPlanUpper] ?? 0) <= (PLAN_HIERARCHY[currentPlan] ?? 0)) {
      return NextResponse.json({
        error: `Tidak bisa upgrade ke ${targetPlanUpper}. Paket Anda saat ini sudah ${currentPlan} atau lebih tinggi.`,
      }, { status: 400 });
    }

    // 3. Ambil harga paket dari AdminSetting (dinamis, bisa berubah-ubah)
    const priceKeys = ["price_traditional", "price_modern", "price_premium"];
    const settings = await prisma.adminSetting.findMany({
      where: { key: { in: priceKeys } },
      select: { key: true, value: true },
    });

    const priceMap: Record<string, number> = {};
    for (const s of settings) {
      const plan = s.key.replace("price_", "").toUpperCase();
      priceMap[plan] = Number(s.value) || 0;
    }

    const priceFrom = priceMap[currentPlan] ?? 0;
    const priceTo = priceMap[targetPlanUpper] ?? 0;

    if (priceTo <= priceFrom) {
      return NextResponse.json({
        error: "Harga paket tujuan tidak valid. Pastikan harga paket sudah dikonfigurasi di admin.",
      }, { status: 400 });
    }

    let upgradeAmount = priceTo - priceFrom;
    let cleanDomain: string | null = null;

    // Tambahan Add-on Custom Domain opsional jika memilih tier PREMIUM
    if (includeCustomDomain && targetPlanUpper === "PREMIUM") {
      const enabledSetting = await prisma.adminSetting.findUnique({
        where: { key: "addon_custom_domain_enabled" },
      });
      const isCustomDomainEnabled = enabledSetting ? enabledSetting.value !== "false" : true;

      if (isCustomDomainEnabled) {
        const priceSetting = await prisma.adminSetting.findUnique({
          where: { key: "addon_custom_domain_price" },
        });
        const domainPrice = Number(priceSetting?.value) || 150000;
        upgradeAmount += domainPrice;

        if (requestedDomain && typeof requestedDomain === "string") {
          const sanitized = requestedDomain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/\s/g, "").trim();
          if (sanitized.includes(".")) {
            cleanDomain = sanitized;
          }
        }
      }
    }

    // 4. Cek tidak ada upgrade order yang masih PENDING untuk invitation ini
    const pendingUpgrade = await prisma.order.findFirst({
      where: {
        userId,
        orderType: "UPGRADE",
        linkedOrderId: currentOrder.id,
        status: "PENDING",
      },
    });

    if (pendingUpgrade) {
      return NextResponse.json({
        error: "Anda sudah memiliki permintaan upgrade yang sedang menunggu pembayaran.",
        pendingOrderId: pendingUpgrade.id,
      }, { status: 400 });
    }

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
        paymentMethod: "GATEWAY",
        requestedDomain: cleanDomain || undefined,
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
      message: `Upgrade dari ${currentPlan} ke ${targetPlanUpper}${cleanDomain ? ` + Custom Domain (${cleanDomain})` : ""}. Nominal: Rp ${upgradeAmount.toLocaleString("id-ID")}`,
    });

  } catch (error: any) {
    console.error("[Upgrade Order Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal membuat order upgrade." : (error.message || "Gagal membuat order upgrade.") }, { status: 500 });
  }
}
