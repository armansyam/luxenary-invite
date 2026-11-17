/**
 * Kecerahan foto latar halaman (slot GLOBAL_FIXED_BG) yang diatur klien di Studio, disimpan sebagai
 * `featureSettings.bgPhotoTone`: negatif menggelapkan, positif menerangkan, batas ±80. Foto latar klien bisa sangat terang
 * atau sangat gelap, sedangkan warna teks tema tetap; yang disesuaikan adalah foto, bukan teks, dan tanpa nilai warna.
 *
 * Selektor mencakup ke-121 master (`.fixed-bg-layer.has-custom-bg`) dan video latar yang disisipkan mesin.
 */
export const BG_PHOTO_TONE_LIMIT = 80;
export const BG_PHOTO_TONE_SELECTOR = ".fixed-bg-layer.has-custom-bg, video.lux-fixed-bg-video";
export const BG_PHOTO_TONE_STYLE_ID = "luxBgPhotoTone";

export function parseBgPhotoTone(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(-BG_PHOTO_TONE_LIMIT, Math.min(BG_PHOTO_TONE_LIMIT, Math.round(n)));
}

// Mandiri (tanpa rujukan ke luar fungsi): sumbernya disisipkan ke skrip pratinjau Studio lewat `toString()`, sehingga
// pratinjau dan HTML terbit memakai rumus yang sama.
export function bgPhotoToneFilter(tone: unknown): string {
  const n = Math.max(-80, Math.min(80, Math.round(Number(tone) || 0)));
  if (n === 0) return "";
  if (n < 0) return "brightness(" + (1 + n / 100).toFixed(2) + ")";
  return "brightness(" + (1 + n * 0.009).toFixed(2) + ") contrast(" + (1 - n * 0.0045).toFixed(2) + ")";
}

export function bgPhotoToneCss(tone: unknown): string {
  const filter = bgPhotoToneFilter(tone);
  return filter ? `${BG_PHOTO_TONE_SELECTOR} { filter: ${filter} !important; }` : "";
}
