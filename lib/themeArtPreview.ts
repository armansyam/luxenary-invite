import fs from "fs";
import path from "path";

/**
 * Gambar pratinjau ilustrasi bawaan master berilustrasi (sampul, panel kiri desktop, beranda, penutup) untuk thumbnail
 * "Bawaan tema" di Studio. Hanya untuk tampilan: master menggambar ilustrasinya sendiri saat slot kosong, jadi gambar ini
 * tidak pernah disuntikkan sebagai media undangan (beda dengan Theme.defaultMedia). Dibuat oleh
 * scripts/export-theme-previews.ts ke public/assets/theme-previews/<id>/<slot>.webp.
 */
export const ART_PREVIEW_SLOTS = ["LANDING_COVER", "LANDING_COVER_DESKTOP", "HOME_PHOTO", "DESKTOP_SIDEBAR", "CLOSING_COVER"] as const;
export type ArtPreviewSlot = (typeof ART_PREVIEW_SLOTS)[number];

export const artPreviewFile = (slot: ArtPreviewSlot) => `${slot.toLowerCase()}.webp`;

export function themeArtPreviews(themeId: string | null | undefined): Partial<Record<ArtPreviewSlot, string>> {
  const id = String(themeId || "").toLowerCase();
  if (!/^[a-z0-9-]+$/.test(id)) return {};
  const dir = path.join(process.cwd(), "public", "assets", "theme-previews", id);
  const out: Partial<Record<ArtPreviewSlot, string>> = {};
  for (const slot of ART_PREVIEW_SLOTS) {
    const file = artPreviewFile(slot);
    if (fs.existsSync(path.join(dir, file))) out[slot] = `/assets/theme-previews/${id}/${file}`;
  }
  return out;
}
