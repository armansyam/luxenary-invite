import { VALID_MEDIA_SLOTS, type MediaSlotKey } from "@/lib/mediaSlots";
import { isThemeOwnedPath, safeMediaUrl } from "@/lib/safeUrl";

/**
 * Slot media klien yang dipakai sebuah tema (19 Nov 2026). Tema mendeklarasikan slot yang fotonya benar-benar tampil;
 * Studio hanya menampilkan slot itu dan engine membuang media dari slot lain saat render (baris di database tetap,
 * sehingga foto kembali tampil bila klien kembali ke tema yang memakainya). Galeri tidak ikut dideklarasikan: galeri
 * diatur tombol seksi, bukan tema. Null berarti tema belum mendeklarasikan slotnya dan semua slot berlaku seperti dulu.
 */
export const DECLARABLE_MEDIA_SLOTS = VALID_MEDIA_SLOTS.filter((s): s is Exclude<MediaSlotKey, "GALLERY"> => s !== "GALLERY");
export type DeclarableMediaSlot = (typeof DECLARABLE_MEDIA_SLOTS)[number];

export interface MediaSlotDeclaration {
  /** Tempat foto slot ini tampil, untuk keterangan "Dipakai di" di Studio. */
  places: string[];
  /**
   * Thumbnail gambar tema yang tampil selama klien belum mengunggah, disiapkan admin di builder atau Editor Master.
   * Hanya untuk Studio; tidak pernah disuntikkan ke render (penanda foto klien seperti hasCustomHomePhoto tetap jujur).
   */
  preview?: string;
}
export type ThemeMediaSlots = Partial<Record<DeclarableMediaSlot, MediaSlotDeclaration>>;

export const MAX_SLOT_PLACES = 6;
export const MAX_SLOT_PLACE_LENGTH = 40;

const isDeclarable = (slot: string): slot is DeclarableMediaSlot => (DECLARABLE_MEDIA_SLOTS as readonly string[]).includes(slot);

function readPlaces(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is string => typeof p === "string").map((p) => p.trim()).filter(Boolean).slice(0, MAX_SLOT_PLACES).map((p) => p.slice(0, MAX_SLOT_PLACE_LENGTH));
}

function readPreview(raw: unknown): string {
  const url = safeMediaUrl(raw);
  return url && isThemeOwnedPath(url) ? url : "";
}

/** Pembacaan longgar dari kolom JSON: bukan objek = null (belum dideklarasikan); entri tidak sah dibuang. */
export function parseThemeMediaSlots(raw: unknown): ThemeMediaSlots | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: ThemeMediaSlots = {};
  for (const [slot, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isDeclarable(slot) || !value || typeof value !== "object" || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const preview = readPreview(entry.preview);
    out[slot] = { places: readPlaces(entry.places), ...(preview ? { preview } : {}) };
  }
  return out;
}

/** Validasi ketat untuk masukan admin; null mengembalikan tema ke "belum dideklarasikan". */
export function validateThemeMediaSlots(input: unknown): { ok: true; value: ThemeMediaSlots | null } | { ok: false; error: string } {
  if (input === null || input === undefined) return { ok: true, value: null };
  if (typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "mediaSlots harus berupa objek slot." };
  const out: ThemeMediaSlots = {};
  for (const [slot, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isDeclarable(slot)) return { ok: false, error: `Slot ${slot} tidak bisa dideklarasikan (hanya ${DECLARABLE_MEDIA_SLOTS.join(", ")}).` };
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: `Deklarasi slot ${slot} harus berupa objek.` };
    const entry = value as Record<string, unknown>;
    if (entry.places !== undefined && !Array.isArray(entry.places)) return { ok: false, error: `places slot ${slot} harus berupa daftar teks.` };
    const places = Array.isArray(entry.places) ? entry.places : [];
    if (places.length > MAX_SLOT_PLACES) return { ok: false, error: `Slot ${slot} paling banyak ${MAX_SLOT_PLACES} tempat.` };
    if (places.some((p) => typeof p !== "string" || !p.trim() || p.trim().length > MAX_SLOT_PLACE_LENGTH)) {
      return { ok: false, error: `Nama tempat slot ${slot} wajib diisi dan paling panjang ${MAX_SLOT_PLACE_LENGTH} karakter.` };
    }
    let preview = "";
    if (entry.preview !== undefined && entry.preview !== "" && entry.preview !== null) {
      preview = readPreview(entry.preview);
      if (!preview) return { ok: false, error: `Thumbnail slot ${slot} harus berupa path aset tema lokal.` };
    }
    out[slot] = { places: places.map((p: string) => p.trim()), ...(preview ? { preview } : {}) };
  }
  return { ok: true, value: out };
}

/** Slot dipakai tema bila tema belum mendeklarasikan slotnya (null), slot tidak bisa dideklarasikan, atau dideklarasikan. */
export function isSlotUsed(slots: ThemeMediaSlots | null, slot: string): boolean {
  return !slots || !isDeclarable(slot) || Boolean(slots[slot]);
}

/** Media render tanpa slot yang tidak dideklarasikan tema; galeri dan tema tanpa deklarasi (null) tidak disaring. */
export function filterDeclaredMedia<T extends { mediaSlot: unknown }>(media: T[], slots: ThemeMediaSlots | null): T[] {
  if (!slots) return media;
  return media.filter((m) => isSlotUsed(slots, String(m.mediaSlot)));
}
