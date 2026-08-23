import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { userId, planType, buyerName, buyerEmail, buyerPhone } = await req.json();

    if (!userId || !planType) {
      return NextResponse.json({ error: "Missing userId atau planType" }, { status: 400 });
    }

    if (!["TRADITIONAL", "MODERN"].includes(planType)) {
      return NextResponse.json({ error: "PlanType tidak valid. Gunakan TRADITIONAL atau MODERN." }, { status: 400 });
    }

    // Baca harga dari AdminSetting database
    const priceKey = planType === "MODERN" ? "price_modern" : "price_traditional";
    const priceSetting = await prisma.adminSetting.findUnique({ where: { key: priceKey } });
    const amount = priceSetting ? Number(priceSetting.value) : (planType === "MODERN" ? 499000 : 299000);

    const invoiceNumber = `INV-LUX-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    // Cek apakah user punya order PENDING yang belum dibayar — cegah duplikasi
    const existingPending = await prisma.order.findFirst({
      where: { userId, status: "PENDING", planType: planType as "TRADITIONAL" | "MODERN" },
    });

    if (existingPending) {
      // Return existing order agar client bisa lanjut ke pembayaran
      return NextResponse.json({
        orderId: existingPending.id,
        invoiceNumber: existingPending.invoiceNumber,
        amount: Number(existingPending.amount),
        planType,
        existing: true,
      });
    }

    const order = await prisma.order.create({
      data: {
        userId,
        invoiceNumber,
        planType: planType as "TRADITIONAL" | "MODERN",
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