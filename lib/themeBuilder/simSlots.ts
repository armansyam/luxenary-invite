/**
 * Foto simulasi pratinjau Theme Builder: admin mengunggah foto contoh per slot media klien untuk melihat hasil rancangan
 * dengan foto nyata sebelum terbit. Foto disimpan sementara di public/uploads/builder-sim/ (dihapus cron setelah
 * SIM_MEDIA_MAX_AGE_DAYS) dan tidak pernah masuk ke spesifikasi tema. Modul ini murni, dipakai server dan builder.
 */
import type { BuilderEventType } from "@/lib/themeBuilder/spec";

export const SIM_MEDIA_URL_PREFIX = "/uploads/builder-sim/";
export const SIM_MEDIA_URL_RE = /^\/uploads\/builder-sim\/[a-f0-9]{24}\.webp$/;
export const SIM_MEDIA_MAX_AGE_DAYS = 3;
export const SIM_GALLERY_MAX = 8;

export interface SimSlot {
  slot: "LANDING_COVER" | "LANDING_COVER_DESKTOP" | "HOME_PHOTO" | "DESKTOP_SIDEBAR" | "GLOBAL_FIXED_BG" | "GROOM_PHOTO" | "BRIDE_PHOTO" | "CLOSING_COVER";
  label: string;
  hint: string;
  weddingOnly?: boolean;
}

export const SIM_SLOTS: SimSlot[] = [
  { slot: "LANDING_COVER", label: "Sampul", hint: "Foto sampul di HP (potret)." },
  { slot: "LANDING_COVER_DESKTOP", label: "Sampul desktop", hint: "Foto mendatar: sampul desktop tampil layar penuh." },
  { slot: "HOME_PHOTO", label: "Foto utama", hint: "Foto di seksi pembuka setelah sampul." },
  { slot: "DESKTOP_SIDEBAR", label: "Panel kiri desktop", hint: "Foto panel kiri tampilan desktop terbelah." },
  { slot: "GROOM_PHOTO", label: "Mempelai pria", hint: "Foto di kartu mempelai.", weddingOnly: true },
  { slot: "BRIDE_PHOTO", label: "Mempelai wanita", hint: "Foto di kartu mempelai.", weddingOnly: true },
  { slot: "CLOSING_COVER", label: "Penutup", hint: "Foto latar seksi penutup." },
  { slot: "GLOBAL_FIXED_BG", label: "Latar tetap", hint: "Latar seluruh halaman, menggantikan tekstur tema." },
];

export function simSlotsFor(eventType: BuilderEventType): SimSlot[] {
  return SIM_SLOTS.filter((s) => !s.weddingOnly || eventType === "WEDDING");
}

export interface SimMedia {
  slots: Partial<Record<SimSlot["slot"], string>>;
  gallery: string[];
}

/** Masukan pratinjau dicocokkan dengan slot dan pola URL foto simulasi; entri lain dibuang. */
export function parseSimMedia(raw: unknown): SimMedia {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const slotsIn = input.slots && typeof input.slots === "object" ? (input.slots as Record<string, unknown>) : {};
  const slots: SimMedia["slots"] = {};
  for (const s of SIM_SLOTS) {
    const v = slotsIn[s.slot];
    if (typeof v === "string" && SIM_MEDIA_URL_RE.test(v)) slots[s.slot] = v;
  }
  const gallery = (Array.isArray(input.gallery) ? input.gallery : []).filter((v): v is string => typeof v === "string" && SIM_MEDIA_URL_RE.test(v)).slice(0, SIM_GALLERY_MAX);
  return { slots, gallery };
}
