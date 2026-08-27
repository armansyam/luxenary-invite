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
    select: { userId: true, status: true, planType: true },
  });

  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  const isAdmin =
    (session.user as any)?.role === "SUPER_ADMIN" ||
    (session.user as any)?.role === "ADMIN";
  const isOwner = order.userId === (session.user as any)?.id;

  if (!isAdmin && !isOwner) {
    return new Response("Forbidden", { status: 403 });
  }

  // Jika sudah PAID/EXPIRED sebelum SSE terbuka, kirim langsung dan tutup koneksi
  if (order.status === "PAID" || order.status === "EXPIRED") {
    const body = `data: ${JSON.stringify({ status: order.status, planType: order.planType })}\n\n`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
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
