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

  const staticFilePath = path.join(process.cwd(), "public", "demo", cleanTheme, "index.html");

  // 1. If static compiled demo exists, serve it directly (Instant < 2ms response)
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

  // 2. Fallback: Check if theme exists in DB before compiling on the fly
  try {
    const { prisma } = await import("@/lib/prisma");
    const themeRecord = await prisma.theme.findUnique({
      where: { id: cleanTheme },
      select: { isActive: true },
    });

    if (!themeRecord || !themeRecord.isActive) {
      return new NextResponse("Tema tidak ditemukan", { status: 404 });
    }

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
    return new NextResponse("Tema tidak ditemukan", { status: 404 });
  }
}
