import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { resolveThemeEntry } from "@/lib/renderTemplate";
import { masterPathOf } from "@/lib/themePaths";
import { storedOverrides } from "@/lib/themeVariants";

/**
 * Gambar bawaan master untuk thumbnail "Bawaan tema" di Studio klien dan Studio Demo admin, agar terlihat gambar apa
 * yang tampil sebelum slot diisi. Hanya untuk tampilan: master menggambar sendiri isinya saat slot kosong, jadi gambar
 * ini tidak pernah disuntikkan sebagai media undangan (beda dengan Theme.defaultMedia). Dua sumber:
 * - pratinjau ilustrasi master berilustrasi, dibuat scripts/export-theme-previews.ts ke public/assets/theme-previews/<id>/;
 * - latar global yang ditulis di CSS master (`.fixed-bg-layer { ... url('/assets/...') }`), tampil selama klien tidak
 *   mengunggah Latar Belakang Global.
 */
export const ART_PREVIEW_SLOTS = ["LANDING_COVER", "LANDING_COVER_DESKTOP", "HOME_PHOTO", "DESKTOP_SIDEBAR", "CLOSING_COVER"] as const;
export type ArtPreviewSlot = (typeof ART_PREVIEW_SLOTS)[number];
export type BuiltinMediaSlot = ArtPreviewSlot | "GLOBAL_FIXED_BG";

export const artPreviewFile = (slot: ArtPreviewSlot) => `${slot.toLowerCase()}.webp`;

const THEME_ID_RE = /^[a-z0-9-]+$/;

/** Gambar latar global bawaan di aturan `.fixed-bg-layer` (bukan varian seperti `.fixed-bg-layer.has-custom-bg`). */
export function masterBuiltinBackground(html: string): string | null {
  for (const m of html.matchAll(/\.fixed-bg-layer\s*\{([^}]*)\}/g)) {
    const url = m[1].match(/url\(\s*['"]?(\/assets\/[\w./-]+\.(?:webp|png|jpe?g|avif))['"]?\s*\)/i);
    if (url) return url[1];
  }
  return null;
}

export function themeArtPreviews(themeId: string | null | undefined): Partial<Record<BuiltinMediaSlot, string>> {
  const id = String(themeId || "").toLowerCase();
  if (!THEME_ID_RE.test(id)) return {};
  const dir = path.join(process.cwd(), "public", "assets", "theme-previews", id);
  const out: Partial<Record<BuiltinMediaSlot, string>> = {};
  for (const slot of ART_PREVIEW_SLOTS) {
    const file = artPreviewFile(slot);
    if (fs.existsSync(path.join(dir, file))) out[slot] = `/assets/theme-previews/${id}/${file}`;
  }
  const entry = resolveThemeEntry(id);
  if (entry) {
    const file = masterPathOf(entry.eventType, entry.style, id);
    if (fs.existsSync(file)) {
      const bg = masterBuiltinBackground(fs.readFileSync(file, "utf8"));
      if (bg) out.GLOBAL_FIXED_BG = bg;
    }
  }
  return out;
}

/**
 * Gambar bawaan untuk tema yang dipakai undangan atau demo, termasuk varian (master induknya) dan gambar yang diganti
 * lewat Editor Master atau varian (`masterOverrides.images`), supaya thumbnail sama dengan yang tampil di undangan.
 */
export async function loadThemeArtPreview(themeId: string | null | undefined): Promise<Partial<Record<BuiltinMediaSlot, string>>> {
  const id = String(themeId || "").toLowerCase();
  if (!THEME_ID_RE.test(id)) return {};
  const row = await prisma.theme.findUnique({ where: { id }, select: { parentTheme: true, masterOverrides: true } });
  const masterId = row?.parentTheme || id;
  const masterRow = row?.parentTheme ? await prisma.theme.findUnique({ where: { id: masterId }, select: { masterOverrides: true } }) : row;
  const images = {
    ...(storedOverrides(masterRow?.masterOverrides)?.images ?? {}),
    ...(row?.parentTheme ? storedOverrides(row.masterOverrides)?.images ?? {} : {}),
  };
  const previews = themeArtPreviews(masterId);
  if (previews.GLOBAL_FIXED_BG && images[previews.GLOBAL_FIXED_BG]) previews.GLOBAL_FIXED_BG = images[previews.GLOBAL_FIXED_BG];
  return previews;
}
