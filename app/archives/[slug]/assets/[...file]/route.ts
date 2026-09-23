import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getNasArchivePath, isNasArchiveEnabled } from "@/lib/nasArchive";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; file: string[] }> | { slug: string; file: string[] } }
) {
  try {
    const isEnabled = await isNasArchiveEnabled();
    if (!isEnabled) {
      return new NextResponse("NAS Archive Disabled", { status: 404 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { slug, file: fileSegments } = resolvedParams;

    if (!slug || !fileSegments || fileSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Sanitize slug and path segments to prevent directory traversal
    const safeSlug = path.basename(slug).replace(/[^a-zA-Z0-9_-]/g, "");
    const safeSegments = fileSegments.map((seg) => seg.replace(/\.\./g, "").replace(/[\/\\]/g, ""));
    const relativeFilePath = path.join(...safeSegments);

    const nasRoot = await getNasArchivePath();
    const assetsBaseDir = path.join(nasRoot, safeSlug, "assets");
    const fullPath = path.join(assetsBaseDir, relativeFilePath);

    // Verify resolved path remains inside the client's assets folder
    if (!fullPath.startsWith(assetsBaseDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
      return new NextResponse("Asset Not Found", { status: 404 });
    }

    const stat = await fs.promises.stat(fullPath);
    if (!stat.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileSize = stat.size;

    // Handle HTTP Range Requests (Essential for background music audio streaming)
    const range = req.headers.get("range");
    if (range && (contentType.startsWith("video/") || contentType.startsWith("audio/"))) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(fullPath, { start, end });

      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
        },
      });
    }

    // Standard Full Response for images / media
    const fileBuffer = await fs.promises.readFile(fullPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileSize.toString(),
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch (error) {
    console.error("[NAS Asset Route Error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
