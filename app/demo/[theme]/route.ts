import { NextResponse } from "next/server";
import { serveStaticDemo } from "@/lib/demoPublisher";
import { isSafePathSegment } from "@/lib/fsSafe";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ theme: string }> }
) {
  const { theme } = await params;
  const cleanTheme = theme.toLowerCase().trim();
  // ID tema dipakai sebagai nama direktori untuk dibaca dan ditulis (serveStaticDemo).
  if (!isSafePathSegment(cleanTheme)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 1. Verify theme exists and is active in database
  try {
    const { prisma } = await import("@/lib/prisma");
    const themeRecord = await prisma.theme.findUnique({
      where: { id: cleanTheme },
      select: { isActive: true },
    });

    if (!themeRecord || !themeRecord.isActive) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="id">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tema Tidak Tersedia</title></head>
        <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;background:#faf8f5;color:#2d2c2a;text-align:center;padding:20px;">
          <div style="max-width:420px;padding:32px;background:#fff;border-radius:24px;border:1px solid #eadecf;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#1e1c1a;">Tema Tidak Tersedia</h2>
            <p style="font-size:14px;color:#6e685f;line-height:1.6;margin-bottom:20px;">Tema ini sedang dinonaktifkan atau belum tersedia untuk publik.</p>
            <a href="/demo" style="display:inline-block;padding:10px 20px;background:#1e1c1a;color:#fff;font-size:13px;font-weight:600;text-decoration:none;border-radius:999px;">Kembali ke Katalog Tema</a>
          </div>
        </body>
        </html>`,
        {
          status: 404,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, max-age=0, must-revalidate",
          },
        }
      );
    }
  } catch (dbErr) {
    // Galat pemeriksaan status dicatat; serveStaticDemo membaca versi demo dari DB dan menolak dengan 500 bila DB tidak terjangkau.
    logger.warn("DemoTheme", "Status tema tidak dapat diperiksa", { themeId: cleanTheme, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
  }

  try {
    const html = await serveStaticDemo(cleanTheme);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    logger.error("DemoTheme", "Gagal menyajikan demo statis", error, { themeId: cleanTheme });
    return new NextResponse("Gagal memuat demo tema", { status: 500 });
  }
}
