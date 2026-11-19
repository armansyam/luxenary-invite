const META_PIXEL_RE = /^\d{8,20}$/;
const TIKTOK_PIXEL_RE = /^[A-Z0-9]{10,30}$/i;
const GA4_ID_RE = /^G-[A-Z0-9]{6,20}$/i;

export function sanitizeMetaPixelId(raw: unknown): string {
  const clean = typeof raw === "string" ? raw.trim() : "";
  return META_PIXEL_RE.test(clean) ? clean : "";
}

export function sanitizeTikTokPixelId(raw: unknown): string {
  const clean = typeof raw === "string" ? raw.trim() : "";
  return TIKTOK_PIXEL_RE.test(clean) ? clean : "";
}

export function sanitizeGa4MeasurementId(raw: unknown): string {
  const clean = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return GA4_ID_RE.test(clean) ? clean : "";
}
