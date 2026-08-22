import { PaymentGateway } from "@/lib/payments";
import { IPaymuGateway } from "@/lib/ipaymu";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json(); // IPaymu webhook payload
  const orderId = body.reference; // assuming reference = orderId
  const gw: PaymentGateway = new IPaymuGateway();
  const { status } = await gw.verify(orderId);
  if (status === "PAID") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } });
    await prisma.invitation.update({
      where: { orderId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }
  return new Response("ok");
}
