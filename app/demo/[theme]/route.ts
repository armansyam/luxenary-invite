import { NextResponse } from "next/server";
import { serveStaticDemo } from "@/lib/demoPublisher";
import { isSafePathSegment } from "@/lib/fsSafe";
import { logger } from "@/lib/logger";
import { requireAnyAdmin } from "@/lib/adminAuth";
import { ADMIN_PREVIEW_PARAM } from "@/lib/csp";

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
      // HTML tema nonaktif hanya disajikan di URL bertanda, yang diberi sandbox CSP oleh proxy (lib/csp.ts withAdminPreviewSandbox).
      // Location relatif: di belakang proxy, origin req.url adalah alamat internal server.
      if (!new URL(req.url).searchParams.has(ADMIN_PREVIEW_PARAM)) {
        return new NextResponse(null, {
          status: 307,
          headers: { Location: `/demo/${cleanTheme}?${ADMIN_PREVIEW_PARAM}=1`, "Cache-Control": "no-store" },
        });
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
      // Banner menimpa tema mana pun, jadi warnanya memakai warna sistem CSS (Canvas/CanvasText), bukan token tema yang berbeda-beda.
      const bannerHtml = `<div id="luxvite-admin-draft-banner" style="position:fixed;top:12px;left:16px;right:16px;margin:0 auto;width:fit-content;z-index:2147483647;background:color-mix(in srgb, CanvasText 90%, transparent);color:Canvas;border-radius:999px;padding:7px 8px 7px 14px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;line-height:1.3;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);box-sizing:border-box;"><span style="width:6px;height:6px;border-radius:50%;background:Canvas;flex:none;"></span><span style="min-width:0;">${label}</span><a href="/admin?tab=themes" style="background:Canvas;color:CanvasText;padding:3px 10px;border-radius:999px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;">Kelola di Admin</a><button type="button" aria-label="Tutup" onclick="this.parentElement.remove()" style="background:transparent;border:none;color:inherit;cursor:pointer;padding:2px;display:flex;flex:none;"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></div>`;
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
