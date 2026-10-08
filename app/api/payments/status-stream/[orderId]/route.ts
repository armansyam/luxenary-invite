import { paymentEmitter } from "@/lib/paymentEvents";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
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
    select: {
      userId: true,
      status: true,
      planType: true,
      rejectReason: true,
      user: { select: { email: true } },
    },
  });

  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  // Saat Admin sedang dalam sesi remote (isRemote=true), identitasnya sudah di-override ke CLIENT
  // sehingga hanya sesi admin asli yang dianggap admin di sini.
  const isRealAdmin = hasAdminPermission(session.user, "orders") && !session.user.isRemote;
  const isOwner =
    order.userId === session.user.id ||
    (!!session?.user?.email && !!order.user?.email && order.user.email.toLowerCase() === session.user.email.toLowerCase());

  if (!isRealAdmin && !isOwner) {
    return new Response("Forbidden", { status: 403 });
  }

  // Jika sudah PAID/EXPIRED sebelum SSE terbuka, kirim langsung dan tutup koneksi
  if (order.status === "PAID" || order.status === "EXPIRED") {
    const payload = { status: order.status, planType: order.planType };
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

  // Buka SSE stream — tunggu event dari webhook pembayaran (Midtrans/Xendit/Transfer)
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Heartbeat setiap 15 detik agar koneksi tidak di-drop oleh Caddy/Nginx proxy
      // Sekaligus pasif safety-net jika ada race condition atau event terlewat
      let isChecking = false;
      const heartbeat = setInterval(async () => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
          if (!isChecking) {
            isChecking = true;
            const latest = await prisma.order.findUnique({
              where: { id: orderId },
              select: { status: true, planType: true, rejectReason: true },
            });
            if (latest && (latest.status === "PAID" || latest.status === "EXPIRED")) {
              onPaymentUpdate({
                status: latest.status,
                planType: latest.planType,
                ...(latest.rejectReason ? { rejectReason: latest.rejectReason } : {}),
              });
            }
            isChecking = false;
          }
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      const onPaymentUpdate = (data: { status: string; planType?: string; rejectReason?: string }) => {
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
        try {
          controller.close();
        } catch {
          // Stream sudah tertutup oleh klien; tidak ada yang perlu dibersihkan lagi.
        }
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
