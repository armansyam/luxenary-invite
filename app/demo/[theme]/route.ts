import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { compileAndSaveStaticDemo } from "@/lib/demoPublisher";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ theme: string }> }
) {
  const { theme } = await params;
  const cleanTheme = theme.toLowerCase().trim();

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
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tema Tidak Tersedia | Luxenary</title></head>
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
    console.warn(`[Demo ${cleanTheme} DB check warning]:`, dbErr);
  }

  const staticFilePath = path.join(process.cwd(), "public", "demo", cleanTheme, "index.html");

  // 2. If static compiled demo exists, serve it directly (Instant < 2ms response)
  try {
    await fs.promises.access(staticFilePath);
    const staticHtml = await fs.promises.readFile(staticFilePath, "utf-8");
    return new NextResponse(staticHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch {}

  // 3. Fallback: Compile on the fly if active
  try {
    const { prisma } = await import("@/lib/prisma");
    let customDemoData = undefined;
    const setting = await prisma.adminSetting.findUnique({
      where: { key: `theme_demo_${cleanTheme}` },
    });
    if (setting && setting.value) {
      customDemoData = JSON.parse(setting.value);
    }

    await compileAndSaveStaticDemo(cleanTheme, customDemoData);

    // Read the newly compiled file
    const compiledHtml = await fs.promises.readFile(staticFilePath, "utf-8");
    return new NextResponse(compiledHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error(`[Demo] Failed to compile static demo for ${cleanTheme}:`, error);
    return new NextResponse("Gagal memuat demo tema", { status: 500 });
  }
}
