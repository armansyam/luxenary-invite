import { renderTemplateFile } from "@/lib/renderTemplate";
import { composeTemplateData } from "@/lib/themeEngine";
import { composeDemoTemplateData } from "@/lib/demoRegistry";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("id");
  const themeParam = searchParams.get("theme");
  const paletteKey = searchParams.get("palette") || "champagne";

  if (invitationId) {
    try {
      const inv = await prisma.invitation.findUnique({ where: { id: invitationId } });
      if (inv) {
        const data = await composeTemplateData(invitationId);
        if (data) {
          const themeId = themeParam || inv.themeId || "kalandra";
          const html = await renderTemplateFile(themeId, data);
          return new NextResponse(html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store, max-age=0, must-revalidate",
            },
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to render dynamic preview:", err);
      return NextResponse.json({ error: String(err?.message || err), stack: err?.stack }, { status: 500 });
    }
  }

  const selectedTheme = (themeParam || "kalandra").toLowerCase();
  const data = composeDemoTemplateData(selectedTheme, paletteKey);
  const html = await renderTemplateFile(selectedTheme, data);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
