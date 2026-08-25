import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => ({}));
    const { planType, buyerName, buyerEmail } = body;
    let userId = session?.user?.id || body.userId;

    if (!userId && !buyerEmail) {
      return NextResponse.json({ error: "Missing userId atau buyerEmail" }, { status: 400 });
    }

    if (!planType) {
      return NextResponse.json({ error: "Missing planType" }, { status: 400 });
    }

    if (!["TRADITIONAL", "MODERN", "PREMIUM"].includes(planType)) {
      return NextResponse.json({ error: "PlanType tidak valid. Gunakan TRADITIONAL, MODERN, atau PREMIUM." }, { status: 400 });
    }

    // Resolve / Ensure valid client User in database
    let validUserId = userId;
    let targetUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!targetUser) {
      const emailToUse = buyerEmail || "client@luxenary.id";
      targetUser = await prisma.user.findUnique({ where: { email: emailToUse } });

      if (!targetUser) {
        targetUser = await prisma.user.create({
          data: {
            email: emailToUse,
            name: buyerName || emailToUse.split("@")[0] || "Mempelai",
            role: "CLIENT",
          },
        });
      }
      validUserId = targetUser.id;
    }

    // Baca harga paket realtime dari AdminSetting database
    const priceKey = planType === "PREMIUM" ? "price_premium" : planType === "MODERN" ? "price_modern" : "price_traditional";
    const defaultAmount = planType === "PREMIUM" ? 699000 : planType === "MODERN" ? 499000 : 299000;
    const priceSetting = await prisma.adminSetting.findUnique({ where: { key: priceKey } });
    const amount = priceSetting ? Number(priceSetting.value) : defaultAmount;

    // Cek apakah user punya order PENDING yang belum dibayar
    const existingPending = await prisma.order.findFirst({
      where: {
        userId: validUserId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending) {
      // Hapus jika ada duplikat draf order pending lama lainnya untuk user ini
      await prisma.order.deleteMany({
        where: {
          userId: validUserId,
          status: "PENDING",
          id: { not: existingPending.id },
        },
      });

      // Update planType & amount langsung ke order aktif, reset bukti transfer jika paket berubah
      const isPlanChanged = existingPending.planType !== planType;

      const updated = await prisma.order.update({
        where: { id: existingPending.id },
        data: {
          planType: planType as "TRADITIONAL" | "MODERN" | "PREMIUM",
          amount,
          ...(isPlanChanged
            ? {
                proofImageUrl: null,
                proofUploadedAt: null,
                rejectReason: null,
              }
            : {}),
        },
      });

      return NextResponse.json({
        orderId: updated.id,
        invoiceNumber: updated.invoiceNumber,
        amount,
        planType,
        existing: true,
        planChanged: isPlanChanged,
      });
    }

    // Hapus order pending lama sebelum membuat order baru jika ada
    await prisma.order.deleteMany({
      where: {
        userId: validUserId,
        status: "PENDING",
      },
    });

    const invoiceNumber = `INV-LUX-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        userId: validUserId,
        invoiceNumber,
        planType: planType as "TRADITIONAL" | "MODERN" | "PREMIUM",
        amount,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      invoiceNumber: order.invoiceNumber,
      amount,
      planType,
      existing: false,
    });
  } catch (error: any) {
    console.error("[Orders Create Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}