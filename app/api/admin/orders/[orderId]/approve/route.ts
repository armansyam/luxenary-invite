import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { paymentEmitter } from "@/lib/paymentEvents";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { settleOrderAsPaid } from "@/lib/paymentSettlement";
import { adminActorId } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";

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
    const { hasAdminPermission } = await import("@/lib/adminPermissions");
    if (!session?.user || !hasAdminPermission(session.user, "orders")) {
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

    // Transisi PENDING -> PAID + konsumsi PromoHold + komisi mitra dalam satu transaksi
    const settled = await settleOrderAsPaid(orderId);
    if (!settled) {
      return NextResponse.json({
        error: "Order sudah diproses oleh proses lain. Muat ulang daftar order.",
      }, { status: 409 });
    }

    // Order sudah lunas dan tidak dapat dibatalkan; catatan audit dan webhook ditulis atomik, dan kegagalannya
    // dicatat sebagai galat (pelunasan manual tanpa jejak harus terlihat), tetapi tidak membatalkan pelunasan.
    const actorId = adminActorId(session);
    try {
      await prisma.$transaction([
        prisma.adminAuditLog.create({
          data: {
            adminId: actorId,
            action: "APPROVE_MANUAL_ORDER",
            details: `Menyetujui transaksi manual order ${order.invoiceNumber || orderId} sebesar Rp ${Number(order.amount).toLocaleString("id-ID")}`,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          },
        }),
        prisma.webhookLog.create({
          data: {
            source: "admin",
            event: "MANUAL_ORDER_APPROVE",
            payload: {
              orderId,
              approvedBy: actorId,
              approvedAt: new Date().toISOString(),
              paymentMethod: order.paymentMethod,
            },
            status: "processed",
            processedAt: new Date(),
          },
        }),
      ]);
    } catch (logErr) {
      logger.error("AdminApproveOrder", "Order dilunasi tetapi catatan audit gagal ditulis", logErr, { orderId, actorId });
    }

    // If this is an UPGRADE order, update planType on the linked original order
    await applyUpgradePlan(orderId);

    // Push notifikasi real-time ke browser klien via SSE
    try {
      paymentEmitter.emit(orderId, { status: "PAID", planType: order.planType });
    } catch (emitErr) {
      logger.warn("AdminApproveOrder", "Notifikasi SSE pelunasan gagal dikirim; klien akan melihatnya saat memuat ulang", { orderId, error: emitErr instanceof Error ? emitErr.message : String(emitErr) });
    }

    return NextResponse.json({ success: true, message: "Order berhasil dikonfirmasi lunas" });
  } catch (error: any) {
    logger.error("AdminApproveOrder", "Konfirmasi order gagal", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}
