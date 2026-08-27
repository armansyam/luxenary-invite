import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
const archiver = require("archiver");
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

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
      select: { userId: true, groomSlug: true, brideSlug: true }
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    
    // Only allow admin or the owner
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "ADMIN" || (session.user as any).role === "SUPER_ADMIN";
    if (!isAdmin && invitation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: Not your invitation" }, { status: 403 });
    }

    const memoriesDir = path.join(process.cwd(), "public", "uploads", "invitations", invitationId, "memories");
    
    try {
      await fs.promises.access(memoriesDir);
    } catch {
      return NextResponse.json({ error: "Tidak ada foto kenangan yang ditemukan untuk undangan ini." }, { status: 404 });
    }

    const files = await fs.promises.readdir(memoriesDir);
    if (files.length === 0) {
      return NextResponse.json({ error: "Folder memori kosong." }, { status: 404 });
    }

    // Create ZIP Stream
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename="Guest_Memories_${invitation.groomSlug}_${invitation.brideSlug}.zip"`);

    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk: any) => controller.enqueue(chunk));
        archive.on('end', () => controller.close());
        archive.on('error', (err: any) => controller.error(err));

        // Append files from directory
        archive.directory(memoriesDir, false);
        archive.finalize();
      }
    });

    return new NextResponse(stream, { headers });

  } catch (error: any) {
    console.error("[Download Memories ZIP Error]", error);
    return NextResponse.json({ error: "Gagal memproses file ZIP" }, { status: 500 });
  }
}
