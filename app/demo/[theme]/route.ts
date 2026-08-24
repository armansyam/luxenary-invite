import { renderTemplateFile } from "@/lib/renderTemplate";
import { composeDemoTemplateData } from "@/lib/demoRegistry";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ theme: string }> }
) {
  const { theme } = await params;
  const { searchParams } = new URL(req.url);
  const paletteKey = searchParams.get("palette") || "champagne";

  const validThemes = ["kalandra", "valente", "aurelia", "artisan", "wave", "papercut", "ameera", "prameswari", "dillalucky"];
  const selectedTheme = validThemes.includes(theme.toLowerCase()) ? theme.toLowerCase() : "kalandra";

  const data = composeDemoTemplateData(selectedTheme, paletteKey);
  const html = renderTemplateFile(selectedTheme, data);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
