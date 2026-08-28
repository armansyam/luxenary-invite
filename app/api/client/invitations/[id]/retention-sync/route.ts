import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getGoogleDriveFolderPhotos } from "@/lib/driveHelper";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ error: "Missing invitation ID" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const newDriveUrl = body.newDriveUrl;

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: { guestMemories: true }
    });

    if (!invitation || (invitation.userId !== session.user.id && (session.user as any).role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Get Client Folder URL and Scrape files
    let feat: any = {};
    try {
      feat = typeof invitation.featureSettings === "string"
        ? JSON.parse(invitation.featureSettings)
        : (invitation.featureSettings || {});
    } catch {}

    if (newDriveUrl) {
      feat.guestMemoriesDriveFolderUrl = newDriveUrl;
    }

    const clientDriveFolderUrl = feat.guestMemoriesDriveFolderUrl || feat.driveFolderUrl || feat.googleDriveUrl || "";
    if (!clientDriveFolderUrl) {
      return NextResponse.json({ error: "Client Drive Folder URL is missing. Cannot verify." }, { status: 400 });
    }

    const scrapedFiles = await getGoogleDriveFolderPhotos(clientDriveFolderUrl);
    const dbCount = invitation.guestMemories.length;
    
    // Asumsikan Klien telah menduplikasi (Make a Copy) jika jumlah file di folder sama atau lebih besar dari Database
    if (scrapedFiles.length < dbCount) {
      return NextResponse.json({ 
        error: `Verifikasi Gagal: Jumlah salinan di folder Drive Anda (${scrapedFiles.length}) lebih sedikit dari file di server (${dbCount}). Mohon selesaikan proses "Make a Copy" terlebih dahulu agar memori Anda tidak hilang.` 
      }, { status: 400 });
    }

    // 2. Tidak lagi menembak webhook (file ditangani auto-delete oleh R2 Object Lifecycle)
    let deletedCount = invitation.guestMemories.length;

    // 3. Hapus isi DB dan ubah Mode menjadi ARCHIVE
    await prisma.guestMemory.deleteMany({
      where: { invitationId: id }
    });

    await prisma.invitation.update({
      where: { id },
      data: { 
        
        featureSettings: JSON.stringify(feat)
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil! ${deletedCount} file lama dihapus dari Server Admin. Galeri Anda kini hidup abadi dari Drive Anda sendiri.`,
      deletedCount
    });

  } catch (err: any) {
    console.error("Retention Sync Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
