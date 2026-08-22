import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const { userId, planType } = await req.json();
  if (!userId || !planType) {
    return NextResponse.json({ error: "Missing userId or planType" }, { status: 400 });
  }

  const amount = planType === "PREMIUM" ? 199000 : 99000; // IDR example
  const invoiceNumber = `INV-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const order = await prisma.order.create({
    data: {
      userId,
      invoiceNumber,
      planType: planType as "BASIC" | "PREMIUM",
      amount,
      status: "PENDING",
    },
  });

  return NextResponse.json({ orderId: order.id, amount });
}