import { PaymentGateway } from "@/lib/payments";
import { MidtransGateway } from "@/lib/midtrans";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json(); // Midtrans webhook payload
  const orderId = body.order_id;
  const gw: PaymentGateway = new MidtransGateway();
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
