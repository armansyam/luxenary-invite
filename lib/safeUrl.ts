import { escapeHtml } from "./escapeHtml";

const CONTROL_CHARS = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`, "g");
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const BARE_DOMAIN = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#:]|$)/i;

/**
 * Menormalkan URL yang diketik pengguna menjadi URL yang aman ditautkan.
 * - Hanya http/https, atau path lokal absolut (`/uploads/...`).
 * - Skema lain (`javascript:`, `data:`, `vbscript:`, ...) dan protocol-relative (`//host`) ditolak.
 * - Domain tanpa skema (`maps.app.goo.gl/abc`) dilengkapi `https://`.
 * Mengembalikan string kosong jika URL tidak aman/tidak valid.
 */
export function safeExternalUrl(input: unknown): string {
  if (typeof input !== "string") return "";
  const value = input.replace(CONTROL_CHARS, "").trim();
  if (!value) return "";

  if (value.startsWith("/")) {
    return value.startsWith("//") || value.startsWith("/\\") ? "" : value;
  }

  const candidate = HAS_SCHEME.test(value) ? value : BARE_DOMAIN.test(value) ? `https://${value}` : "";
  if (!candidate) return "";

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

const FEATURE_URL_KEYS = [
  "liveStreamYoutubeUrl",
  "liveStreamInstagramUrl",
  "liveStreamZoomUrl",
  "instagramFilterUrl",
  "musicUrl",
  "qrisImageUrl",
  "videoGalleryUrl",
  "galleryDriveFolderUrl",
] as const;

/**
 * Menormalkan seluruh field URL pada `featureSettings` sebelum disimpan
 * (URL tidak valid atau berskema berbahaya diganti string kosong; daftar foto dinormalkan per baris).
 */
export function normalizeFeatureUrls<T extends Record<string, any>>(features: T): T {
  const out: Record<string, any> = { ...features };
  for (const key of FEATURE_URL_KEYS) {
    if (typeof out[key] === "string") out[key] = safeExternalUrl(out[key]);
  }
  if (typeof out.galleryPhotosList === "string") {
    out.galleryPhotosList = out.galleryPhotosList
      .split("\n")
      .map((line: string) => safeExternalUrl(line))
      .filter(Boolean)
      .join("\n");
  }
  return out as T;
}

/** URL aman yang sudah di-escape untuk disisipkan ke atribut HTML (`href`, `src`). */
export function safeHref(input: unknown): string {
  return escapeHtml(safeExternalUrl(input));
}
