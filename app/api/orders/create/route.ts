import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { userId, planType, buyerName, buyerEmail, buyerPhone } = await req.json();

    if (!userId || !planType) {
      return NextResponse.json({ error: "Missing userId atau planType" }, { status: 400 });
    }

    if (!["TRADITIONAL", "MODERN", "PREMIUM"].includes(planType)) {
      return NextResponse.json({ error: "PlanType tidak valid. Gunakan TRADITIONAL, MODERN, atau PREMIUM." }, { status: 400 });
    }

    // Resolve / Ensure valid client User in database (handles admin testing or cross-session accounts)
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

    // Baca harga dari AdminSetting database
    const priceKey = planType === "PREMIUM" ? "price_premium" : planType === "MODERN" ? "price_modern" : "price_traditional";
    const defaultAmount = planType === "PREMIUM" ? 699000 : planType === "MODERN" ? 499000 : 299000;
    const priceSetting = await prisma.adminSetting.findUnique({ where: { key: priceKey } });
    const amount = priceSetting ? Number(priceSetting.value) : defaultAmount;

    const invoiceNumber = `INV-LUX-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    // Cek apakah user punya order PENDING yang belum dibayar — cegah duplikasi
    const existingPending = await prisma.order.findFirst({
      where: { userId: validUserId, status: "PENDING", planType: planType as "TRADITIONAL" | "MODERN" | "PREMIUM" },
    });

    if (existingPending) {
      // Update amount jika harga di admin setting berubah
      if (Number(existingPending.amount) !== amount) {
        await prisma.order.update({
          where: { id: existingPending.id },
          data: { amount },
        });
      }

      return NextResponse.json({
        orderId: existingPending.id,
        invoiceNumber: existingPending.invoiceNumber,
        amount,
        planType,
        existing: true,
      });
    }

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