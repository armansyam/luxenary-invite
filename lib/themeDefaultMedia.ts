import { prisma } from "@/lib/prisma";
import { safeMediaUrl } from "@/lib/safeUrl";

/**
 * Slot milik tema yang boleh punya media bawaan. Foto personal (HOME_PHOTO, GROOM_PHOTO, BRIDE_PHOTO, GALLERY) tidak
 * pernah punya foto bawaan: foto model orang lain tidak boleh sampai ke undangan klien. Cover desktop jatuh ke cover
 * mobile, jadi tidak punya bawaan sendiri.
 */
export const DEFAULT_MEDIA_SLOTS = ["LANDING_COVER", "DESKTOP_SIDEBAR", "GLOBAL_FIXED_BG", "CLOSING_COVER"] as const;
export type DefaultMediaSlot = (typeof DEFAULT_MEDIA_SLOTS)[number];
export type ThemeDefaultMedia = Partial<Record<DefaultMediaSlot, string>>;

/** Aset milik tema/platform. `/demo/` (foto model etalase) dan unggahan klien sengaja tidak termasuk. */
const ALLOWED_PREFIXES = ["/theme-assets/", "/assets/ornaments/", "/uploads/theme-assets/"] as const;

const isSlot = (value: string): value is DefaultMediaSlot => (DEFAULT_MEDIA_SLOTS as readonly string[]).includes(value);

const isThemeOwnedPath = (url: string) => ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix));

/** Pembacaan longgar dari kolom JSON: entri tidak sah dibuang tanpa melempar. */
export function parseThemeDefaultMedia(raw: unknown): ThemeDefaultMedia {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ThemeDefaultMedia = {};
  for (const [slot, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isSlot(slot)) continue;
    const url = safeMediaUrl(value);
    if (url && isThemeOwnedPath(url)) out[slot] = url;
  }
  return out;
}

/** Validasi ketat untuk masukan admin: slot atau path yang tidak sah ditolak dengan pesan, bukan dibuang diam-diam. */
export function validateThemeDefaultMedia(input: unknown): { ok: true; value: ThemeDefaultMedia } | { ok: false; error: string } {
  if (input === null || input === undefined) return { ok: true, value: {} };
  if (typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "defaultMedia harus berupa objek slot ke path." };
  const out: ThemeDefaultMedia = {};
  for (const [slot, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === "" || value === null || value === undefined) continue;
    if (!isSlot(slot)) return { ok: false, error: `Slot ${slot} tidak boleh punya media bawaan (hanya ${DEFAULT_MEDIA_SLOTS.join(", ")}).` };
    const url = safeMediaUrl(value);
    if (!url || !isThemeOwnedPath(url)) {
      return { ok: false, error: `Media bawaan ${slot} harus berupa path lokal di ${ALLOWED_PREFIXES.join(" atau ")}.` };
    }
    out[slot] = url;
  }
  return { ok: true, value: out };
}

export async function loadThemeDefaultMedia(themeId: string): Promise<ThemeDefaultMedia> {
  const theme = await prisma.theme.findUnique({ where: { id: themeId.toLowerCase() }, select: { defaultMedia: true } });
  return parseThemeDefaultMedia(theme?.defaultMedia);
}

interface MediaRow {
  mediaSlot: string;
  localPath?: string | null;
  isThemeDefault?: boolean;
}

/**
 * Menambahkan media bawaan tema untuk slot yang belum diisi klien. Cover bawaan hanya dipakai bila klien tidak punya
 * cover maupun latar sendiri, supaya foto klien selalu menang atas bawaan tema. GLOBAL_FIXED_BG tidak disuntikkan:
 * latar bawaan sudah dirender oleh CSS master (.fixed-bg-layer / --canvas-texture), jadi nilainya hanya menjadi
 * thumbnail "Bawaan tema" di Studio; menyuntikkannya lagi akan menumpuk dua lapisan latar.
 */
export function applyThemeDefaultMedia<T extends MediaRow>(media: T[], defaults: ThemeDefaultMedia): Array<T | MediaRow> {
  const filled = new Set(media.filter((m) => m.localPath).map((m) => String(m.mediaSlot)));
  const extra: MediaRow[] = [];
  for (const slot of DEFAULT_MEDIA_SLOTS) {
    const url = defaults[slot];
    if (!url || filled.has(slot) || slot === "GLOBAL_FIXED_BG") continue;
    if (slot === "LANDING_COVER" && filled.has("GLOBAL_FIXED_BG")) continue;
    extra.push({ mediaSlot: slot, localPath: url, isThemeDefault: true });
  }
  return extra.length ? [...media, ...extra] : media;
}
