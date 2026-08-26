import { NextRequest, NextResponse } from "next/server";
import { sseEmitter } from "@/lib/sseEmitter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invitationId, command, value } = body;

    if (!invitationId || !command) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Emit event ke semua client yang listen SSE
    sseEmitter.emit("remote_command", {
      type: "COMMAND",
      invitationId,
      command,
      value
    });

    return NextResponse.json({ success: true, message: "Command sent successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send command" }, { status: 500 });
  }
}
