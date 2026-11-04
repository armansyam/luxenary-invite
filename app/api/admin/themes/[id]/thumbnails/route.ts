import { NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { isSafePathSegment } from "@/lib/fsSafe";
import { routeError } from "@/lib/routeError";
import { requestThemeThumbnails, themeThumbnailStatus } from "@/lib/themeThumbnailJob";

export const dynamic = "force-dynamic";

async function resolveThemeId(params: Promise<{ id: string }>) {
  const themeId = (await params).id.toLowerCase().trim();
  return isSafePathSegment(themeId) ? themeId : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    const themeId = await resolveThemeId(params);
    if (!themeId) return NextResponse.json({ error: "ID tema tidak valid" }, { status: 400 });
    return NextResponse.json(themeThumbnailStatus(themeId));
  } catch (error) {
    return routeError("ThemeThumbnail", error, "Status thumbnail gagal dibaca");
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    const themeId = await resolveThemeId(params);
    if (!themeId) return NextResponse.json({ error: "ID tema tidak valid" }, { status: 400 });

    // Thumbnail dipotret dari /demo/<id>, yang hanya tersedia untuk tema aktif.
    const theme = await prisma.theme.findUnique({ where: { id: themeId }, select: { isActive: true } });
    if (!theme) return NextResponse.json({ error: "Tema tidak ditemukan" }, { status: 404 });
    if (!theme.isActive) return NextResponse.json({ error: "Terbitkan tema ke katalog terlebih dahulu; thumbnail dipotret dari halaman demonya." }, { status: 409 });

    requestThemeThumbnails(themeId);
    return NextResponse.json(themeThumbnailStatus(themeId), { status: 202 });
  } catch (error) {
    return routeError("ThemeThumbnail", error, "Permintaan thumbnail gagal");
  }
}
