import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ZipArchive } = require("archiver");
import { streamMemoriesToZip } from "@/lib/storage";
import { buildZipFileName } from "@/lib/invitationUtils";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";

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
      select: { userId: true, invitationSlug: true }
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    
    // Only allow admin or the owner
    const isAdmin = hasAdminPermission(session.user, "invitations");
    if (!isAdmin && invitation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: Not your invitation" }, { status: 403 });
    }

    // level: 1 — foto WebP/JPEG sudah terkompresi, level tinggi hanya buang CPU
    // tanpa mengecilkan file secara signifikan
    const archive = new ZipArchive({
      zlib: { level: 1 }
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename="${buildZipFileName(invitation)}"`);

    archive.on("end", async () => {
      // Kunci upload momen setelah ZIP selesai dihasilkan
      // Ini memastikan tidak ada file baru masuk setelah client download
      try {
        await prisma.invitation.update({
          where: { id: invitationId },
          data: { memoriesUploadLocked: true },
        });
      } catch (lockErr) {
        // Log saja, jangan gagalkan response (ZIP sudah terkirim)
        logger.error("MemoriesDownload", "ZIP terkirim tetapi upload momen gagal dikunci", lockErr);
      }
    });

    // Readable.toWeb meneruskan backpressure: archiver berhenti membaca berkas selama klien belum menarik data,
    // sehingga ZIP besar tidak menumpuk di memori proses.
    streamMemoriesToZip(archive, invitationId)
      .then(() => archive.finalize())
      .catch((error: Error) => {
        archive.destroy(
          error.message === "EMPTY" ? new Error("Tidak ada foto kenangan yang ditemukan untuk undangan ini.") : error
        );
      });

    return new NextResponse(Readable.toWeb(archive) as ReadableStream, { headers });

  } catch (error) {
    return routeError("MemoriesDownload", error, "Gagal memproses file ZIP");
  }
}
