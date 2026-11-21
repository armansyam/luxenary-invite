import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isSafePathSegment } from "@/lib/fsSafe";
import { logger } from "@/lib/logger";
import { ensureSharedFile } from "@/lib/sharedFiles";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; file: string }> },
) {
  try {
    const { slug, file } = await params;
    const cleanSlug = slug.trim();
    const cleanFile = path.basename(file);
    if (!isSafePathSegment(cleanSlug)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const ext = path.extname(cleanFile).toLowerCase();
    const contentType = MIME_TYPES[ext];
    if (!contentType) {
      return new NextResponse("Unsupported Media Type", { status: 415 });
    }

    const baseDir = path.join(process.cwd(), "public", "portfolio", "assets", cleanSlug);
    const filePath = path.join(baseDir, cleanFile);
    if (!filePath.startsWith(`${baseDir}${path.sep}`)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    await ensureSharedFile(filePath);
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const lastModified = stat.mtime.toUTCString();
    const ifNoneMatch = req.headers.get("if-none-match");
    const ifModifiedSince = req.headers.get("if-modified-since");

    if (ifNoneMatch === etag || ifModifiedSince === lastModified) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    const buffer = await fs.promises.readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        ETag: etag,
        "Last-Modified": lastModified,
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    logger.error("PortfolioAssetRoute", "Gagal menyajikan aset portofolio lokal", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
