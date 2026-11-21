import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { resolveThemeEntry } from "@/lib/renderTemplate";
import { masterPathOf } from "@/lib/themePaths";
import { storedOverrides } from "@/lib/masterEdits";
import { syncSharedFiles } from "@/lib/sharedFiles";

/**
 * Gambar bawaan master untuk thumbnail "Bawaan tema" di Studio klien dan Studio Demo admin, agar terlihat gambar apa
 * yang tampil sebelum slot diisi. Hanya untuk tampilan: master menggambar sendiri isinya saat slot kosong, jadi gambar
 * ini tidak pernah disuntikkan sebagai media undangan (beda dengan Theme.defaultMedia). Tiga sumber:
 * - pratinjau ilustrasi master berilustrasi, dibuat scripts/export-theme-previews.ts ke public/assets/theme-previews/<id>/;
 * - latar global yang ditulis di CSS master (`.fixed-bg-layer { ... url('/assets/...') }`), tampil selama klien tidak
 *   mengunggah Latar Belakang Global;
 * - gambar sampul yang ditulis di CSS master (`.cover-screen { ... url('/assets/...') }`), tampil selama Sampul HP kosong.
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

/**
 * Gambar sampul bawaan di aturan `.cover-screen` (tampil selama Sampul HP kosong). Isi aturan boleh memuat placeholder
 * `{{landingCoverUrl}}`, jadi kurung kurawal ganda tidak dianggap penutup aturan.
 */
export function masterBuiltinCover(html: string): string | null {
  for (const m of html.matchAll(/\.cover-screen\s*\{((?:[^{}]|\{\{[^{}]*\}\})*)\}/g)) {
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
      const html = fs.readFileSync(file, "utf8");
      const bg = masterBuiltinBackground(html);
      if (bg) out.GLOBAL_FIXED_BG = bg;
      const cover = out.LANDING_COVER ? null : masterBuiltinCover(html);
      if (cover) out.LANDING_COVER = cover;
    }
  }
  return out;
}

/**
 * Gambar bawaan untuk tema yang dipakai undangan atau demo, termasuk gambar yang diganti lewat Editor Master
 * (`masterOverrides.images`), supaya thumbnail sama dengan yang tampil di undangan.
 */
export async function loadThemeArtPreview(themeId: string | null | undefined): Promise<Partial<Record<BuiltinMediaSlot, string>>> {
  const id = String(themeId || "").toLowerCase();
  if (!THEME_ID_RE.test(id)) return {};
  await syncSharedFiles();
  const row = await prisma.theme.findUnique({ where: { id }, select: { masterOverrides: true } });
  const images = storedOverrides(row?.masterOverrides)?.images ?? {};
  const previews = themeArtPreviews(id);
  if (previews.GLOBAL_FIXED_BG && images[previews.GLOBAL_FIXED_BG]) previews.GLOBAL_FIXED_BG = images[previews.GLOBAL_FIXED_BG];
  if (previews.LANDING_COVER && images[previews.LANDING_COVER]) previews.LANDING_COVER = images[previews.LANDING_COVER];
  return previews;
}
