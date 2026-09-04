import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    // Must be the owner
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Must be pending
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Hanya pesanan pending yang dapat dibatalkan" }, { status: 400 });
    }

    // 1. Dilarang melakukan Hard Delete!
    // Hard delete akan memutuskan rantai relasi webhook dari Midtrans. Jika webhook masuk setelah di-delete,
    // Midtrans akan menerima error 404/500 dan menganggap integrasi kita rusak (bisa gagal verifikasi production).
    
    // 2. Hubungi Gateway untuk membatalkan tagihan aktif (QRIS/VA) agar tidak bisa dibayar ganda
    if (order.snapToken || order.gatewayTxId) {
      try {
        const { getActiveGateway } = await import("@/lib/gatewayRegistry");
        const gateway = await getActiveGateway();
        if (gateway.cancel) {
          const targetTxId = order.gatewayTxId || orderId; // Midtrans biasanya pakai orderId
          await gateway.cancel(targetTxId);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi cancel dengan Payment Gateway:", err);
        // Tetap lanjut cancel secara lokal walaupun API gateway timeout/gagal
      }
    }

    // 3. Soft Cancel: Ubah status menjadi FAILED dengan alasan historis yang jelas
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "FAILED",
        rejectReason: "Dibatalkan secara mandiri oleh Klien",
      },
    });

    return NextResponse.json({ success: true, message: "Pesanan berhasil dibatalkan." });
  } catch (error: any) {
    console.error("Cancel Order Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat membatalkan pesanan" },
      { status: 500 }
    );
  }
}
