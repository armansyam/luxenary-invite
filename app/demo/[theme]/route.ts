import { NextResponse } from "next/server";
import { serveStaticDemo } from "@/lib/demoPublisher";
import { isSafePathSegment } from "@/lib/fsSafe";
import { logger } from "@/lib/logger";
import { requireAnyAdmin } from "@/lib/adminAuth";

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

  let isAdminDraftPreview = false;
  let isDraftReviewItem = false;

  // 1. Verify theme exists and is active in database (Admin logged-in session may preview inactive/draft themes)
  try {
    const { prisma } = await import("@/lib/prisma");
    const themeRecord = await prisma.theme.findUnique({
      where: { id: cleanTheme },
      select: { isActive: true, series: true },
    });

    if (!themeRecord) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (!themeRecord.isActive) {
      const adminGuard = await requireAnyAdmin();
      if (!adminGuard.ok) {
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
      isAdminDraftPreview = true;
      isDraftReviewItem = themeRecord.series === "DRAFT_REVIEW";
    }
  } catch (dbErr) {
    // Galat pemeriksaan status dicatat; serveStaticDemo membaca versi demo dari DB dan menolak dengan 500 bila DB tidak terjangkau.
    logger.warn("DemoTheme", "Status tema tidak dapat diperiksa", { themeId: cleanTheme, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
  }

  try {
    let html = await serveStaticDemo(cleanTheme);
    if (isAdminDraftPreview) {
      const label = isDraftReviewItem
        ? "DRAFT THEMES (Belum Rilis — Hanya Admin)"
        : "TEMA NONAKTIF (Preview Khusus Admin)";
      const bannerHtml = `<div id="luxvite-admin-draft-banner" style="position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(15,23,42,0.92);color:#fef08a;border:1px solid rgba(250,204,21,0.55);border-radius:999px;padding:7px 14px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 8px 28px rgba(0,0,0,0.35);backdrop-filter:blur(8px);max-width:94vw;"><span>🕵️ ${label}</span><a href="/admin?tab=themes" style="background:#facc15;color:#0f172a;padding:3px 10px;border-radius:999px;text-decoration:none;font-size:11px;font-weight:800;white-space:nowrap;">Kelola di Admin →</a><button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:#cbd5e1;cursor:pointer;font-size:13px;padding:0 2px;">✕</button></div>`;
      if (html.includes("</body>")) {
        html = html.replace("</body>", `${bannerHtml}</body>`);
      } else {
        html += bannerHtml;
      }
    }
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
