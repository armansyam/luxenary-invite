import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require("archiver");
import { streamMemoriesToZip } from "@/lib/storage";

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

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename="Guest_Memories_${invitation.groomSlug}_${invitation.brideSlug}.zip"`);

    const stream = new ReadableStream({
      async start(controller) {
        archive.on('data', (chunk: any) => controller.enqueue(chunk));
        archive.on('end', () => controller.close());
        archive.on('error', (err: any) => controller.error(err));

        try {
          await streamMemoriesToZip(archive, invitationId);
          archive.finalize();
        } catch (error: any) {
          if (error.message === "EMPTY") {
            controller.error(new Error("Tidak ada foto kenangan yang ditemukan untuk undangan ini."));
          } else {
            controller.error(error);
          }
        }
      }
    });

    return new NextResponse(stream, { headers });

  } catch (error: any) {
    console.error("[Download Memories ZIP Error]", error);
    return NextResponse.json({ error: "Gagal memproses file ZIP" }, { status: 500 });
  }
}
