import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { uploadPortfolioFile, listPortfolioSlugs, deletePortfolio } from "@/lib/storage";
import { isSafePathSegment } from "@/lib/fsSafe";
import { requireAdminModule } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";
import { HttpError, routeError } from "@/lib/routeError";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

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
    const guard = await requireAdminModule("portfolio");
    if (!guard.ok) return guard.response;

    const portfolios = await listPortfolioSlugs();
    return NextResponse.json({ portfolios });
  } catch (error) {
    return routeError("AdminPortfolio", error, "Gagal memuat daftar portofolio");
  }
}

// POST: Add invitation to isolated portfolio (full static clone)
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("portfolio");
    if (!guard.ok) return guard.response;

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
    if (!isSafePathSegment(clientName)) {
      throw new HttpError(400, "Slug undangan tidak dapat dipakai sebagai nama portofolio.");
    }

    // 1. Baca HTML Canonical yang sudah di-bake dari folder ids (Single Source of Truth)
    const canonicalHtmlPath = path.join(process.cwd(), "public", "published", "ids", `${invitationId}.html`);
    if (!(await fileExists(canonicalHtmlPath))) {
      throw new HttpError(409, "Undangan belum memiliki HTML terbit. Terbitkan undangan sebelum menyalinnya ke portofolio.");
    }
    let htmlContent = await fs.promises.readFile(canonicalHtmlPath, "utf-8");

    // 2. Helper: download/salin media utama dan upload via Hybrid Storage
    const processMedia = async (url: string | null | undefined): Promise<string | null> => {
      if (!url) return null;
      try {
        const fileName = path.basename(new URL(url, "http://localhost").pathname);
        const relativePath = `assets/${clientName}/${fileName}`;
        let buffer: Buffer | null = null;
        
        let mimeType = "application/octet-stream";
        if (fileName.endsWith(".webp")) mimeType = "image/webp";
        else if (fileName.endsWith(".png")) mimeType = "image/png";
        else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) mimeType = "image/jpeg";
        else if (fileName.endsWith(".mp3")) mimeType = "audio/mpeg";

        if (url.startsWith("http")) {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Gagal fetch: ${url}`);
          buffer = Buffer.from(await res.arrayBuffer());
        } else if (url.startsWith("/uploads/")) {
          const localSrc = path.join(process.cwd(), "public", url);
          if (await fileExists(localSrc)) {
            buffer = await fs.promises.readFile(localSrc);
          }
        }

        if (buffer) {
          const newUrl = await uploadPortfolioFile(buffer, relativePath, mimeType);
          return newUrl; // This will return /portfolio/assets/... or R2 public URL
        }
        return null;
      } catch (err) {
        logger.warn("AdminPortfolio", "Media gagal disalin; URL asli dipertahankan", { url, error: errorMessage(err) });
        return null;
      }
    };

    // 3. Proses InvitationMedia (foto profil, cover, musik, dll)
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

    // 3.5 Generate Portfolio Cover (cover.webp)
    const coverMediaObj = inv.media.find(m => m.mediaSlot === "LANDING_COVER") || inv.media[0];
    const coverUrl = coverMediaObj?.localPath;
    
    if (coverUrl) {
      try {
        const sharp = (await import("sharp")).default;
        const relativePath = `assets/${clientName}/cover.webp`;
        let rawBuffer: Buffer | null = null;
        if (coverUrl.startsWith("http")) {
          const res = await fetch(coverUrl);
          if (res.ok) rawBuffer = Buffer.from(await res.arrayBuffer());
        } else if (coverUrl.startsWith("/uploads/")) {
          const localSrc = path.join(process.cwd(), "public", coverUrl);
          if (await fileExists(localSrc)) rawBuffer = await fs.promises.readFile(localSrc);
        }

        if (rawBuffer) {
          const processedBuffer = await sharp(rawBuffer)
            .resize(800, 1000, { fit: "cover", position: "centre" })
            .webp({ quality: 80 })
            .toBuffer();
          await uploadPortfolioFile(processedBuffer, relativePath, "image/webp");
        }
      } catch (err) {
        logger.warn("AdminPortfolio", "Gagal membuat cover.webp portofolio", { slug: clientName, error: errorMessage(err) });
      }
    }

    // 4. Proses GuestMemory thumbnails — kompres ke 120x120 WebP via sharp
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
        const relativePath = `assets/${clientName}/${localFileName}`;

        try {
          let rawBuffer: Buffer | null = null;
          if (thumbUrl.startsWith("http")) {
            const res = await fetch(thumbUrl);
            if (res.ok) rawBuffer = Buffer.from(await res.arrayBuffer());
          } else if (thumbUrl.startsWith("/uploads/")) {
            const localSrc = path.join(process.cwd(), "public", thumbUrl);
            if (await fileExists(localSrc)) rawBuffer = await fs.promises.readFile(localSrc);
          }

          if (rawBuffer) {
            const processedBuffer = await sharp(rawBuffer)
              .resize(120, 120, { fit: "cover", position: "centre" })
              .webp({ quality: 65 })
              .toBuffer();

            const newUrl = await uploadPortfolioFile(processedBuffer, relativePath, "image/webp");
            htmlContent = htmlContent.split(thumbUrl).join(newUrl);
          }
        } catch (memErr) {
          logger.warn("AdminPortfolio", "Thumbnail kenangan tamu gagal disalin", { url: thumbUrl, error: errorMessage(memErr) });
        }
      }
    } catch (sharpErr) {
      logger.warn("AdminPortfolio", "Pemrosesan kenangan tamu dilewati", { slug: clientName, error: errorMessage(sharpErr) });
    }

    // 5. Proses Google Drive CDN photos
    try {
      const sharp = (await import("sharp")).default;
      const driveUrlRegex = /https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_\-]+=w\d+/g;
      const driveUrls = [...new Set(htmlContent.match(driveUrlRegex) || [])].slice(0, 15);

      for (let i = 0; i < driveUrls.length; i++) {
        const driveUrl = driveUrls[i];
        const localFileName = `gallery_${String(i + 1).padStart(2, "0")}.webp`;
        const relativePath = `assets/${clientName}/${localFileName}`;

        try {
          const res = await fetch(driveUrl);
          if (!res.ok) continue;
          const rawBuffer = Buffer.from(await res.arrayBuffer());

          const processedBuffer = await sharp(rawBuffer)
            .resize(1200, undefined, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 75 })
            .toBuffer();

          const newUrl = await uploadPortfolioFile(processedBuffer, relativePath, "image/webp");
          htmlContent = htmlContent.split(driveUrl).join(newUrl);
        } catch (driveErr) {
          logger.warn("AdminPortfolio", "Foto Google Drive gagal disalin", { url: driveUrl, error: errorMessage(driveErr) });
        }
      }
    } catch (sharpErr) {
      logger.warn("AdminPortfolio", "Pemrosesan foto Google Drive dilewati", { slug: clientName, error: errorMessage(sharpErr) });
    }

    // 6. Simpan HTML yang sudah diisolasi penuh via Hybrid Storage
    const htmlBuffer = Buffer.from(htmlContent, "utf-8");
    await uploadPortfolioFile(htmlBuffer, `${clientName}.html`, "text/html");

    // 7. Simpan Metadata Portofolio (Decoupling dari DB) via Hybrid Storage
    // Rekam identitas murni tanpa fallback string statis atau query eksternal
    const metadata = {
      slug: clientName,
      coupleName: `${inv.groomNickname || inv.groomName} & ${inv.brideNickname || inv.brideName}`,
      themeId: inv.themeId
    };

    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2), "utf-8");
    await uploadPortfolioFile(metadataBuffer, `assets/${clientName}/metadata.json`, "application/json");

    return NextResponse.json({ success: true, clientName });

  } catch (error) {
    return routeError("AdminPortfolio", error, "Gagal menyalin undangan ke portofolio");
  }
}

// DELETE: Remove isolated portfolio
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminModule("portfolio");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const clientName = searchParams.get("clientName");

    if (!clientName) {
      return NextResponse.json({ error: "clientName required" }, { status: 400 });
    }
    // Nilai ini menjadi path yang dihapus rekursif; tanpa validasi, `../..` keluar dari folder portofolio.
    if (!isSafePathSegment(clientName)) {
      return NextResponse.json({ error: "clientName tidak valid" }, { status: 400 });
    }

    await deletePortfolio(clientName);

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("AdminPortfolio", error, "Gagal menghapus portofolio");
  }
}
