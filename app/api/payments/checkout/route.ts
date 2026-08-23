import { PaymentGateway } from "@/lib/payments";
import { MidtransGateway } from "@/lib/midtrans";
import { IPaymuGateway } from "@/lib/ipaymu";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { orderId, gateway } = await req.json();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Auto-detect host from request headers (works seamlessly in localhost, Vercel, and custom domains)
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const appUrl = `${proto}://${host}`;

  let gw: PaymentGateway;
  if (gateway === "midtrans") gw = new MidtransGateway();
  else if (gateway === "ipaymu") gw = new IPaymuGateway();
  else return NextResponse.json({ error: "Unsupported gateway" }, { status: 400 });

  const { checkoutUrl } = await gw.init(orderId, Number(order.amount), appUrl);
  return NextResponse.json({ checkoutUrl });
}
