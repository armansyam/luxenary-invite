import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

// Helper for file existence
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// GET: List all isolated portfolios
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portfolioDir = path.join(process.cwd(), "public", "portfolio");
    if (!(await fileExists(portfolioDir))) {
      return NextResponse.json({ portfolios: [] });
    }

    const files = await fs.promises.readdir(portfolioDir);
    const portfolios = files
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(".html", ""));

    return NextResponse.json({ portfolios });
  } catch (error) {
    console.error("GET /api/admin/portfolio error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Add invitation to isolated portfolio (full static clone)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationId } = await req.json();
    if (!invitationId) {
      return NextResponse.json({ error: "invitationId required" }, { status: 400 });
    }

    const inv = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { media: true },
    });

    if (!inv || !inv.invitationSlug) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const clientName = inv.invitationSlug;

    // 1. Baca HTML Canonical yang sudah di-bake
    const canonicalHtmlPath = path.join(process.cwd(), "public", "published", "slugs", `${clientName}.html`);
    if (!(await fileExists(canonicalHtmlPath))) {
      return NextResponse.json({ error: "HTML Klien belum di-publish (tidak ditemukan)" }, { status: 404 });
    }
    let htmlContent = await fs.promises.readFile(canonicalHtmlPath, "utf-8");

    // 2. Bersihkan & buat direktori aset portfolio
    const assetDir = path.join(process.cwd(), "public", "portfolio", "assets", clientName);
    if (await fileExists(assetDir)) {
      await fs.promises.rm(assetDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(assetDir, { recursive: true });

    // 3. Helper: download/salin media utama (InvitationMedia: R2 atau Lokal)
    //    Nama file stabil sesuai nama asli — tidak menggunakan Date.now()
    const processMedia = async (url: string | null | undefined): Promise<string | null> => {
      if (!url) return null;
      try {
        const fileName = path.basename(new URL(url, "http://localhost").pathname);
        const targetPath = path.join(assetDir, fileName);
        const newUrl = `/portfolio/assets/${clientName}/${fileName}`;

        if (url.startsWith("http")) {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Gagal fetch: ${url}`);
          const buffer = await res.arrayBuffer();
          await fs.promises.writeFile(targetPath, Buffer.from(buffer));
        } else if (url.startsWith("/uploads/")) {
          const localSrc = path.join(process.cwd(), "public", url);
          if (await fileExists(localSrc)) {
            await fs.promises.copyFile(localSrc, targetPath);
          } else {
            return null;
          }
        } else {
          return null;
        }
        return newUrl;
      } catch (err) {
        console.error("[Portfolio] Gagal proses media:", url, err);
        return null;
      }
    };

    // 4. Proses InvitationMedia (foto profil, cover, musik, dll)
    const mediaUrlsToProcess = [
      inv.musicUrl,
      ...inv.media.map((m) => m.localPath),
    ].filter(Boolean) as string[];

    for (const oldUrl of mediaUrlsToProcess) {
      const newUrl = await processMedia(oldUrl);
      if (newUrl) {
        htmlContent = htmlContent.split(oldUrl).join(newUrl);
      }
    }

    // 5. Proses GuestMemory thumbnails — kompres ke 120x120 WebP via sharp
    //    Hanya thumbnailUrl, max 10 (sesuai slice di themeEngine)
    try {
      const sharp = (await import("sharp")).default;
      const guestMemories = await prisma.guestMemory.findMany({
        where: { invitationId },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { mediaUrl: true, thumbnailUrl: true },
      });
      const top10 = guestMemories.slice(0, 10);

      for (let i = 0; i < top10.length; i++) {
        const mem = top10[i];
        const thumbUrl = mem.thumbnailUrl || mem.mediaUrl;
        if (!thumbUrl) continue;

        const localFileName = `memory_${String(i + 1).padStart(2, "0")}.webp`;
        const targetPath = path.join(assetDir, localFileName);
        const newUrl = `/portfolio/assets/${clientName}/${localFileName}`;

        try {
          let rawBuffer: Buffer;
          if (thumbUrl.startsWith("http")) {
            const res = await fetch(thumbUrl);
            if (!res.ok) continue;
            rawBuffer = Buffer.from(await res.arrayBuffer());
          } else if (thumbUrl.startsWith("/uploads/")) {
            const localSrc = path.join(process.cwd(), "public", thumbUrl);
            if (!(await fileExists(localSrc))) continue;
            rawBuffer = await fs.promises.readFile(localSrc);
          } else {
            continue;
          }

          // Resize 120x120, crop center, WebP quality 65 → ~3-6 KB per thumbnail
          await sharp(rawBuffer)
            .resize(120, 120, { fit: "cover", position: "centre" })
            .webp({ quality: 65 })
            .toFile(targetPath);

          htmlContent = htmlContent.split(thumbUrl).join(newUrl);
        } catch (memErr) {
          console.error("[Portfolio] Gagal proses GuestMemory thumbnail:", thumbUrl, memErr);
        }
      }
    } catch (sharpErr) {
      console.error("[Portfolio] Error saat proses GuestMemory:", sharpErr);
    }

    // 6. Proses Google Drive CDN photos (lh3.googleusercontent.com/d/...)
    //    Scan dari HTML baked, ambil MAX 15 foto pertama, kompres, simpan sebagai gallery_01.webp dst
    try {
      const sharp = (await import("sharp")).default;
      const driveUrlRegex = /https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_\-]+=w\d+/g;
      // Batasi 15 foto — cukup untuk grid portofolio + modal galeri, tidak perlu semua 100
      const driveUrls = [...new Set(htmlContent.match(driveUrlRegex) || [])].slice(0, 15);

      for (let i = 0; i < driveUrls.length; i++) {
        const driveUrl = driveUrls[i];
        const localFileName = `gallery_${String(i + 1).padStart(2, "0")}.webp`;
        const targetPath = path.join(assetDir, localFileName);
        const newUrl = `/portfolio/assets/${clientName}/${localFileName}`;

        try {
          const res = await fetch(driveUrl);
          if (!res.ok) continue;
          const rawBuffer = Buffer.from(await res.arrayBuffer());

          // Resize max 1200px, WebP quality 75 — cukup jernih untuk grid portofolio, lebih ringan
          await sharp(rawBuffer)
            .resize(1200, undefined, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(targetPath);

          htmlContent = htmlContent.split(driveUrl).join(newUrl);
        } catch (driveErr) {
          console.error("[Portfolio] Gagal download Drive photo:", driveUrl, driveErr);
        }
      }
    } catch (sharpErr) {
      console.error("[Portfolio] Error saat proses Drive photos:", sharpErr);
    }

    // 7. Simpan HTML yang sudah diisolasi penuh (zero external call)
    const targetHtmlPath = path.join(process.cwd(), "public", "portfolio", `${clientName}.html`);
    await fs.promises.mkdir(path.dirname(targetHtmlPath), { recursive: true });
    await fs.promises.writeFile(targetHtmlPath, htmlContent, "utf-8");

    return NextResponse.json({ success: true, clientName });

  } catch (error) {
    console.error("POST /api/admin/portfolio error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Remove isolated portfolio
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientName = searchParams.get("clientName");

    if (!clientName) {
      return NextResponse.json({ error: "clientName required" }, { status: 400 });
    }

    const htmlPath = path.join(process.cwd(), "public", "portfolio", `${clientName}.html`);
    const assetDir = path.join(process.cwd(), "public", "portfolio", "assets", clientName);

    if (await fileExists(htmlPath)) {
      await fs.promises.unlink(htmlPath);
    }
    if (await fileExists(assetDir)) {
      await fs.promises.rm(assetDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/portfolio error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
