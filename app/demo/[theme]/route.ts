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
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {}

  // 2. Fallback: Compile on the fly, save to disk for future requests, and return
  try {
    let customDemoData = undefined;
    try {
      const { prisma } = await import("@/lib/prisma");
      const setting = await prisma.adminSetting.findUnique({
        where: { key: `theme_demo_${cleanTheme}` },
      });
      if (setting && setting.value) {
        customDemoData = JSON.parse(setting.value);
      }
    } catch {}

    await compileAndSaveStaticDemo(cleanTheme, customDemoData);

    // Read the newly compiled file
    const compiledHtml = await fs.promises.readFile(staticFilePath, "utf-8");
    return new NextResponse(compiledHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error(`[Demo] Failed to compile static demo for ${cleanTheme}:`, error);
  }

  // 3. Ultimate Fallback to kalandra static demo
  const fallbackPath = path.join(process.cwd(), "public", "demo", "kalandra", "index.html");
  try {
    await fs.promises.access(fallbackPath);
    const fallbackHtml = await fs.promises.readFile(fallbackPath, "utf-8");
    return new NextResponse(fallbackHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new NextResponse("Tema tidak ditemukan", { status: 404 });
  }
}
