import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Logo dan favicon unggahan admin disimpan di `public/uploads/brand/` (di luar git); bila belum ada, bawaan git di
// `public/assets/brand/` disajikan. Next hanya menyajikan berkas `public/` yang ada saat build, jadi unggahan baru
// harus lewat rute ini.
const BRAND_FILES: Record<string, string> = {
  "logo.webp": "image/webp",
  "favicon.png": "image/png",
  "favicon-48x48.png": "image/png",
  "favicon-96x96.png": "image/png",
  "favicon-192x192.png": "image/png",
  "favicon-512x512.png": "image/png",
  "apple-touch-icon.png": "image/png",
};

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const contentType = BRAND_FILES[file];
  if (!contentType) return new NextResponse("Not Found", { status: 404 });

  const uploaded = path.join(process.cwd(), "public", "uploads", "brand", file);
  const bundled = path.join(process.cwd(), "public", "assets", "brand", file);
  const filePath = fs.existsSync(uploaded) ? uploaded : bundled;

  try {
    const stat = await fs.promises.stat(filePath);
    const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const headers = { "ETag": etag, "Cache-Control": "public, no-cache" };
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
    const buffer = await fs.promises.readFile(filePath);
    return new NextResponse(buffer, { status: 200, headers: { ...headers, "Content-Type": contentType, "Content-Length": stat.size.toString() } });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return new NextResponse("Not Found", { status: 404 });
    logger.error("BrandAsset", "Gagal menyajikan aset brand", err, { file });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
