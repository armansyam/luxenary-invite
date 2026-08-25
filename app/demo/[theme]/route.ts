import { renderTemplateFile } from "@/lib/renderTemplate";
import { composeDemoTemplateData } from "@/lib/demoRegistry";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ theme: string }> }
) {
  const { theme } = await params;
  const { searchParams } = new URL(req.url);
  const paletteKey = searchParams.get("palette") || "champagne";

  const cleanTheme = theme.toLowerCase().trim();

  // Dynamic file discovery across all theme subfolders (premium, traditional, modern, root)
  const premiumPath = path.join(process.cwd(), "themes", "premium", `${cleanTheme}.html`);
  const traditionalPath = path.join(process.cwd(), "themes", "traditional", `${cleanTheme}.html`);
  const modernPath = path.join(process.cwd(), "themes", "modern", `${cleanTheme}.html`);
  const rootPath = path.join(process.cwd(), "themes", `${cleanTheme}.html`);

  const themeExists =
    fs.existsSync(premiumPath) ||
    fs.existsSync(traditionalPath) ||
    fs.existsSync(modernPath) ||
    fs.existsSync(rootPath);

  const selectedTheme = themeExists ? cleanTheme : "kalandra";

  const data = composeDemoTemplateData(selectedTheme, paletteKey);
  const html = renderTemplateFile(selectedTheme, data);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
