import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".html": "text/html; charset=utf-8",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ theme: string; file: string }> }
) {
  try {
    const { theme, file } = await params;
    const cleanTheme = theme.toLowerCase().trim();
    const cleanFile = path.basename(file); // Mencegah path traversal

    // Abaikan route subhalaman khusus jika ada
    if (["galery", "sharemoment", "memories"].includes(cleanFile)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const ext = path.extname(cleanFile).toLowerCase();
    const contentType = MIME_TYPES[ext];

    // Hanya layani ekstensi file media yang valid
    if (!contentType) {
      return new NextResponse("Unsupported Media Type", { status: 415 });
    }

    const filePath = path.join(process.cwd(), "public", "demo", cleanTheme, cleanFile);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const stat = await fs.promises.stat(filePath);
    const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const lastModified = stat.mtime.toUTCString();

    // Smart HTTP Cache Validation: 304 Not Modified jika file di harddisk tidak berubah
    const ifNoneMatch = req.headers.get("if-none-match");
    const ifModifiedSince = req.headers.get("if-modified-since");

    if (ifNoneMatch === etag || ifModifiedSince === lastModified) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          "ETag": etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      });
    }

    const buffer = await fs.promises.readFile(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "ETag": etag,
        "Last-Modified": lastModified,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[DemoAssetRoute-Error]:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
