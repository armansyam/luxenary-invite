import { paymentEmitter } from "@/lib/paymentEvents";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, status: true, planType: true, rejectReason: true },
  });

  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  const isAdmin =
    (session.user as any)?.role === "SUPER_ADMIN" ||
    (session.user as any)?.role === "ADMIN" ||
    (session.user as any)?.role === "FINANCE" ||
    (session.user as any)?.role === "SUPPORT";
  // Saat Admin sedang dalam sesi remote (isRemote=true), identitasnya sudah di-override ke CLIENT
  // Gunakan originalRole untuk deteksi isAdmin yang sesungguhnya
  const isRealAdmin = isAdmin && !(session.user as any)?.isRemote;
  const isOwner = order.userId === (session.user as any)?.id;

  if (!isRealAdmin && !isOwner) {
    return new Response("Forbidden", { status: 403 });
  }

  // Jika sudah PAID/EXPIRED/FAILED (REJECTED) sebelum SSE terbuka, kirim langsung dan tutup koneksi
  if (order.status === "PAID" || order.status === "EXPIRED" || order.status === "FAILED") {
    const payload: Record<string, any> = { status: order.status, planType: order.planType };
    if (order.status === "FAILED" && (order as any).rejectReason) {
      payload.rejectReason = (order as any).rejectReason;
      payload.status = "REJECTED"; // Normalisasi nama status ke REJECTED agar klien konsisten
    }
    const body = `retry: 0\ndata: ${JSON.stringify(payload)}\n\n`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Buka SSE stream — tunggu event dari webhook iPaymu
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Heartbeat setiap 25 detik agar koneksi tidak di-drop oleh proxy/load balancer
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25000);

      const onPaymentUpdate = (data: { status: string; planType: string }) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          clearInterval(heartbeat);
          controller.close();
        } catch {
          clearInterval(heartbeat);
        }
      };

      paymentEmitter.once(orderId, onPaymentUpdate);

      // Bersihkan saat klien disconnect (tutup tab/browser)
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        paymentEmitter.off(orderId, onPaymentUpdate);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Matikan buffering nginx agar push langsung
    },
  });
}
