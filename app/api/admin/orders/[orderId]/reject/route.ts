import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentEmitter } from "@/lib/paymentEvents";
import { logger } from "@/lib/logger";
import { deleteFile } from "@/lib/storage";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const guard = await requireAdminModule("orders");
    if (!guard.ok) return guard.response;
    const { session } = guard;

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID diperlukan" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    let reason = "Bukti transfer tidak valid atau dana belum masuk.";
    try {
      const body = await req.json();
      if (body.reason && body.reason.trim()) {
        reason = body.reason.trim();
      }
    } catch {
      // Body opsional: tanpa body JSON, alasan memakai nilai bawaan di atas.
    }

    // Hapus file bukti transfer fisik lama yang ditolak (deleteFile mencatat galatnya sendiri dan tidak melempar).
    if (order.proofImageUrl) {
      await deleteFile(order.proofImageUrl);
    }

    // Update order: status tetap PENDING agar order tidak mati, hapus proof agar user bisa upload ulang.
    // Perubahan dan catatan auditnya satu transaksi, atas nama admin yang bertindak (bukan email session, yang
    // milik klien saat sesi remote).
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PENDING",
          proofImageUrl: null,
          proofUploadedAt: null,
          rejectReason: reason,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: adminActorId(session),
          action: "REJECT_MANUAL_ORDER",
          details: `Menolak transaksi order ${order.invoiceNumber || orderId}. Alasan: ${reason}`,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        },
      }),
    ]);

    // Push notifikasi real-time ke browser klien via SSE
    // Klien menerima event REJECTED secara instan — tidak perlu polling
    try {
      paymentEmitter.emit(orderId, { status: "REJECTED", rejectReason: reason, planType: order.planType });
    } catch (emitErr) {
      logger.warn("AdminRejectOrder", "Notifikasi SSE penolakan gagal dikirim; klien akan melihatnya saat memuat ulang", { orderId, error: emitErr instanceof Error ? emitErr.message : String(emitErr) });
    }

    return NextResponse.json({
      success: true,
      message: "Order berhasil ditolak.",
      orderId,
      rejectReason: reason,
    });
  } catch (error) {
    return routeError("AdminRejectOrder", error, "Penolakan order gagal");
  }
}


