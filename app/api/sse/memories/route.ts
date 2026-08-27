import { sseEmitter } from "@/lib/sseEmitter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("invitationId");

  if (!invitationId) {
    return new Response("Missing invitationId", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Keep-alive heartbeat to prevent connection drop
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);

      const listener = (data: any) => {
        if (data.invitationId === invitationId) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }
      };

      sseEmitter.on("new_memory", listener);
      sseEmitter.on("new_guest_checkin", listener); // For receptionists update

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        sseEmitter.off("new_memory", listener);
        sseEmitter.off("new_guest_checkin", listener);
        controller.close();
      });
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
