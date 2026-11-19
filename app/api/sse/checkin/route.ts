import { sseEmitter, startSseBridge, type GuestCheckinEvent } from "@/lib/sseEmitter";
import { isReceptionistAuthorized, readReceptionistToken } from "@/lib/receptionistGuard";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Batas koneksi per undangan pada proses ini — mencegah SSE connection flood
const connectionCounts = new Map<string, number>();
const MAX_SSE_CONNECTIONS_PER_INVITATION = 50;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("invitationId") || "";

  if (!UUID_REGEX.test(invitationId)) {
    return new Response("invitationId tidak valid", { status: 400 });
  }

  const token = (searchParams.get("token") || "").trim() || readReceptionistToken(req.headers);
  const authorized = await isReceptionistAuthorized(invitationId, token);
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const currentCount = connectionCounts.get(invitationId) || 0;
  if (currentCount >= MAX_SSE_CONNECTIONS_PER_INVITATION) {
    return new Response("Terlalu banyak koneksi aktif untuk undangan ini.", { status: 429 });
  }

  startSseBridge();
  connectionCounts.set(invitationId, currentCount + 1);

  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);

      const listener = (data: GuestCheckinEvent) => {
        if (closed || data.invitationId !== invitationId) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      sseEmitter.on("guest_checkin", listener);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        sseEmitter.off("guest_checkin", listener);
        const count = connectionCounts.get(invitationId) || 1;
        if (count <= 1) connectionCounts.delete(invitationId);
        else connectionCounts.set(invitationId, count - 1);
        try {
          controller.close();
        } catch {
          // Stream sudah ditutup oleh klien; tidak ada yang perlu dibersihkan lagi.
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
