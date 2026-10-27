import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { GOOGLE_FONT_PREFIX } from "@/lib/themeBuilder/spec";
import { ensureGoogleFont, isGoogleFontInstalled, loadCatalog, searchCatalog } from "@/lib/themeBuilder/fonts";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Serif", "Sans Serif", "Display", "Handwriting", "Monospace"];

/** Cari keluarga di katalog Google Fonts; `installed` menandai yang sudah tersimpan di server. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const params = req.nextUrl.searchParams;
    const q = (params.get("q") ?? "").slice(0, 60);
    const category = CATEGORIES.includes(params.get("category") ?? "") ? (params.get("category") as string) : "";
    const found = searchCatalog(await loadCatalog(), q, category);
    return NextResponse.json({
      fonts: found.map((f) => ({ id: `${GOOGLE_FONT_PREFIX}${f.family}`, family: f.family, category: f.category, installed: isGoogleFontInstalled(f.family) })),
    });
  } catch (error) {
    return routeError("ThemeBuilderFonts", error);
  }
}

/** Unduh satu keluarga font ke server (idempoten) agar bisa dipakai di tema. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const body = (await readJsonBody<Record<string, unknown>>(req)) ?? {};
    const family = typeof body.family === "string" ? body.family.slice(0, 60) : "";
    if (!family.trim()) return NextResponse.json({ error: "Nama font wajib diisi." }, { status: 400 });

    const entry = await ensureGoogleFont(family);
    return NextResponse.json({ success: true, font: { id: `${GOOGLE_FONT_PREFIX}${entry.family}`, family: entry.family, category: entry.category, installed: true } });
  } catch (error) {
    return routeError("ThemeBuilderFonts", error);
  }
}
