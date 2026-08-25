import { PaymentGateway } from "@/lib/payments";
import { MidtransGateway } from "@/lib/midtrans";
import { IPaymuGateway } from "@/lib/ipaymu";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * FIX #1: Tambahkan autentikasi — hanya session klien yang memiliki order tersebut
 * yang dapat men-trigger gateway payment.
 * FIX #4: Set paymentMethod = "GATEWAY" pada order saat QRIS di-trigger.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const sessionUserId = (session.user as any).id;
    const sessionEmail = session.user.email;
    const isAdmin =
      (session.user as any).role === "SUPER_ADMIN" ||
      (session.user as any).role === "ADMIN" ||
      (session.user as any).isAdmin === true;

    const { orderId, gateway } = await req.json();
    if (!orderId || !gateway) {
      return NextResponse.json({ error: "orderId dan gateway wajib diisi" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Pastikan order milik user yang sedang login atau admin
    const isOwner =
      order.userId === sessionUserId ||
      (sessionEmail && order.user?.email?.toLowerCase() === sessionEmail.toLowerCase());

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Akses ditolak. Bukan order Anda." }, { status: 403 });
    }

    // Order harus dalam status PENDING untuk diproses
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: `Order tidak bisa diproses, status saat ini: ${order.status}` }, { status: 400 });
    }

    // Auto-detect host from request headers
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = `${proto}://${host}`;

    let gw: PaymentGateway;
    if (gateway === "midtrans") gw = new MidtransGateway();
    else if (gateway === "ipaymu") gw = new IPaymuGateway();
    else return NextResponse.json({ error: "Gateway tidak didukung" }, { status: 400 });

    const { checkoutUrl } = await gw.init(orderId, Number(order.amount), appUrl);

    // FIX #4: Tandai paymentMethod = GATEWAY segera setelah redirect berhasil
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: "GATEWAY" },
    });

    return NextResponse.json({ checkoutUrl });
  } catch (error: any) {
    console.error("[Payments Checkout Error]", error);
    return NextResponse.json({ error: error.message || "Gagal memulai pembayaran" }, { status: 500 });
  }
}
