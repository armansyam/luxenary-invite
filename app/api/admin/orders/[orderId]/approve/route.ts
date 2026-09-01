import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { applyUpgradePlan } from "@/lib/upgradeHelper";

export const dynamic = "force-dynamic";

/**
 * FIX #2: Validasi paymentMethod dan proofImageUrl sebelum konfirmasi.
 * FIX #5: Tolak konfirmasi jika status order bukan PENDING.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID diperlukan" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // FIX #5: Blokir jika status bukan PENDING
    if (order.status !== "PENDING") {
      return NextResponse.json({
        error: `Order tidak dapat dikonfirmasi. Status saat ini: ${order.status}. Hanya order PENDING yang dapat dikonfirmasi.`,
      }, { status: 400 });
    }

    // FIX #2: Untuk order Transfer Manual, wajib ada bukti transfer sebelum dikonfirmasi
    if (order.paymentMethod === "MANUAL_TRANSFER" && !order.proofImageUrl) {
      return NextResponse.json({
        error: "Bukti transfer belum diunggah oleh klien. Konfirmasi hanya bisa dilakukan setelah bukti struk diterima.",
      }, { status: 400 });
    }

    // Update order status ke PAID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentGatewayRef: "MANUAL_ADMIN_APPROVAL",
      },
    });

    // Log audit
    try {
      await prisma.webhookLog.create({
        data: {
          source: "admin",
          event: "MANUAL_ORDER_APPROVE",
          payload: {
            orderId,
            approvedBy: (session.user as any).email,
            approvedAt: new Date().toISOString(),
            paymentMethod: order.paymentMethod,
          },
          status: "processed",
          processedAt: new Date(),
        },
      });
    } catch {}

    // If this is an UPGRADE order, update planType on the linked original order
    await applyUpgradePlan(orderId);

    return NextResponse.json({ success: true, message: "Order berhasil dikonfirmasi lunas" });
  } catch (error: any) {
    console.error("[Admin Approve Order Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
