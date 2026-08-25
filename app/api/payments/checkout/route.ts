import { getActiveGateway, getActiveGatewayId, getGatewayById } from "@/lib/gatewayRegistry";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout
 * Trigger pembayaran QRIS/Gateway untuk order PENDING.
 *
 * Gateway dipilih secara dinamis dari AdminSetting (active_payment_gateway).
 * Klien dapat override gateway via param `gateway` jika diizinkan.
 *
 * Auth: hanya pemilik order atau admin yang bisa trigger.
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

    const { orderId, gateway: requestedGateway } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
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

    if (order.status !== "PENDING") {
      return NextResponse.json({
        error: `Order tidak bisa diproses, status saat ini: ${order.status}`,
      }, { status: 400 });
    }

    // Auto-detect appUrl dari request headers
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = `${proto}://${host}`;

    // Gunakan gateway yang diminta klien, atau fallback ke gateway aktif dari AdminSetting
    const gw = requestedGateway
      ? await getGatewayById(requestedGateway)
      : await getActiveGateway();

    const activeGatewayId = requestedGateway || (await getActiveGatewayId());

    // Hitung total nominal akhir (termasuk biaya admin jika dibebankan ke pembeli)
    let finalAmount = Number(order.amount);
    try {
      const feePayerSetting = await prisma.adminSetting.findUnique({ where: { key: "payment_fee_payer" } });
      if (feePayerSetting?.value === "BUYER") {
        // Biaya QRIS 0.7% ditambahkan ke total transaksi klien
        const adminFee = Math.ceil(finalAmount * 0.007);
        finalAmount += adminFee;
      }
    } catch {}

    const { checkoutUrl } = await gw.init(orderId, finalAmount, appUrl);

    // Catat gateway yang digunakan di order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: "GATEWAY",
        paymentGatewayRef: activeGatewayId,
      },
    });

    return NextResponse.json({ checkoutUrl, gateway: activeGatewayId });
  } catch (error: any) {
    console.error("[Payments Checkout Error]", error);
    return NextResponse.json({ error: error.message || "Gagal memulai pembayaran" }, { status: 500 });
  }
}
