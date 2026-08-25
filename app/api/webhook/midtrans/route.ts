import { PaymentGateway } from "@/lib/payments";
import { MidtransGateway } from "@/lib/midtrans";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // Midtrans webhook payload
    const orderId = body.order_id;
    const trxStatus = body.transaction_status;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const gw: PaymentGateway = new MidtransGateway();
    const { status } = await gw.verify(orderId);

    if (status === "PAID") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID", paidAt: new Date() },
      });
      try {
        await prisma.invitation.update({
          where: { orderId },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
      } catch {}
    } else if (trxStatus === "expire" || trxStatus === "cancel" || trxStatus === "deny") {
      await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
    }

    return new Response("ok");
  } catch (error: any) {
    console.error("[Midtrans Webhook Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
