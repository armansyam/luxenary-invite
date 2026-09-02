import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/client/memories/download-urls?invitationId=xxx
 *
 * Returns list of public media URLs for client-side JSZip download.
 * No file data passes through VPS — browser fetches directly from storage.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
    }

    // Verify ownership
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { userId: true, groomSlug: true, brideSlug: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const isAdmin =
      (session.user as any).isAdmin === true ||
      (session.user as any).role === "ADMIN" ||
      (session.user as any).role === "SUPER_ADMIN";

    if (!isAdmin && invitation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const memories = await prisma.guestMemory.findMany({
      where: { invitationId },
      orderBy: { createdAt: "asc" },
      select: { id: true, mediaUrl: true, senderName: true },
    });

    if (memories.length === 0) {
      return NextResponse.json({ error: "EMPTY", files: [] }, { status: 404 });
    }

    // Build file list with clean filename per memory
    const files = memories.map((m, i) => {
      const ext = m.mediaUrl.split(".").pop()?.split("?")[0] || "jpg";
      const safeName = m.senderName
        ? m.senderName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)
        : "tamu";
      return {
        url: m.mediaUrl,
        filename: `${String(i + 1).padStart(3, "0")}_${safeName}.${ext}`,
      };
    });

    return NextResponse.json({
      zipName: `Momen_${invitation.groomSlug}_${invitation.brideSlug}.zip`,
      files,
    });
  } catch (error: any) {
    console.error("[Download URLs Error]", error);
    return NextResponse.json({ error: "Gagal mengambil daftar file" }, { status: 500 });
  }
}
