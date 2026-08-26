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
  if (fs.existsSync(staticFilePath)) {
    const staticHtml = fs.readFileSync(staticFilePath, "utf-8");
    return new NextResponse(staticHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  }

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

    compileAndSaveStaticDemo(cleanTheme, customDemoData);

    if (fs.existsSync(staticFilePath)) {
      const compiledHtml = fs.readFileSync(staticFilePath, "utf-8");
      return new NextResponse(compiledHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }
  } catch (err) {
    console.error("[StaticDemoServeError]:", err);
  }

  // 3. Ultimate Fallback to kalandra static demo
  const fallbackPath = path.join(process.cwd(), "public", "demo", "kalandra", "index.html");
  if (fs.existsSync(fallbackPath)) {
    const fallbackHtml = fs.readFileSync(fallbackPath, "utf-8");
    return new NextResponse(fallbackHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  return new NextResponse("Theme not found", { status: 404 });
}
