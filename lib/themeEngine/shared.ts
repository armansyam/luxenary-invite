import { getGoogleDriveFolderPhotos } from "@/lib/driveHelper";
import { safeExternalUrl } from "@/lib/safeUrl";
import { parseFeatureSettings } from "@/lib/featureSettings";
import { getPrimaryEvent } from "@/lib/lifecycleDates";
import { logger } from "@/lib/logger";
import { getLocaleDict } from "@/lib/themeEngine/locale";
import { formatDateId } from "@/lib/themeEngine/universalSections";

/** Sesi jadwal terima tamu (patokan yang sama dengan masa aktif), atau objek kosong bila belum bertanggal. */
export function primaryEventOf(events: unknown): any {
  return getPrimaryEvent(events) ?? {};
}

/** Tanggal jadwal terima tamu untuk tampilan; draf tanpa tanggal tidak diberi tanggal contoh. */
export function primaryEventDateLabel(events: unknown, locale: "id" | "en" = "id"): string {
  const date = primaryEventOf(events).date;
  return date ? formatDateId(date, locale) : getLocaleDict(locale).dateNotSet;
}

/**
 * Foto galeri klien dari folder Google Drive, daftar URL, lalu slot media GALLERY. Sengaja tanpa cadangan foto demo
 * tema: undangan klien tidak boleh menampilkan foto model orang lain, dan galeri tanpa foto tidak dirender.
 */
// Hasil per objek undangan: composer dan galeri mini seksi bebas memakai daftar yang sama tanpa membaca folder Drive dua kali.
const galleryPhotoCache = new WeakMap<object, Promise<string[]>>();

export function collectGalleryPhotos(inv: any, featureSettings: Record<string, any>): Promise<string[]> {
  const cached = galleryPhotoCache.get(inv);
  if (cached) return cached;
  const result = readGalleryPhotos(inv, featureSettings);
  galleryPhotoCache.set(inv, result);
  return result;
}

async function readGalleryPhotos(inv: any, featureSettings: Record<string, any>): Promise<string[]> {
  const photos: string[] = [];
  const driveFolderUrl = String(featureSettings.galleryDriveFolderUrl || "").trim();
  if (driveFolderUrl) {
    try {
      photos.push(...((await getGoogleDriveFolderPhotos(driveFolderUrl)) || []));
    } catch (err) {
      logger.warn("ThemeEngine", "Folder Google Drive galeri gagal dibaca; galeri hanya memakai daftar URL", {
        invitationId: inv.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  for (const line of String(featureSettings.galleryPhotosList || "").split("\n")) {
    const url = safeExternalUrl(line);
    if (url.length > 5 && !photos.includes(url)) photos.push(url);
  }
  for (const media of inv.media || []) {
    if (String(media.mediaSlot).startsWith("GALLERY") && media.localPath && !photos.includes(media.localPath)) {
      photos.push(media.localPath);
    }
  }
  return photos;
}

export const NUMBER_WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

export function parseVideoEmbed(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?enablejsapi=1&rel=0`;
  }

  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return safeExternalUrl(trimmed) || null;
}

/**
 * Menghasilkan avatar monogram inisial artistik berbasis SVG data-URI.
 * Digunakan sebagai representasi elegan dan mewah jika klien belum/tidak mengunggah foto personal,
 * sehingga TIDAK PERNAH menampilkan foto model demo orang asing di undangan klien nyata.
 */
export function generateInitialAvatarSvg(nameOrInitial: string, roleName: string): string {
  const cleanInit = (nameOrInitial || "?").trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#141416" />
        <stop offset="50%" stop-color="#1f1d1d" />
        <stop offset="100%" stop-color="#0a0a0c" />
      </linearGradient>
      <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(217, 180, 126, 0.28)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0)" />
      </radialGradient>
    </defs>
    <rect width="600" height="600" fill="url(#avatarGrad)" />
    <circle cx="300" cy="300" r="280" fill="url(#goldGlow)" />
    <circle cx="300" cy="300" r="215" fill="none" stroke="rgba(217, 180, 126, 0.4)" stroke-width="2" stroke-dasharray="6,6" />
    <circle cx="300" cy="300" r="195" fill="none" stroke="rgba(217, 180, 126, 0.85)" stroke-width="1.5" />
    <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="160" font-weight="300" fill="#e7c896" letter-spacing="2">${cleanInit}</text>
    <text x="50%" y="78%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="20" font-weight="600" fill="rgba(255,255,255,0.7)" letter-spacing="6">${roleName.toUpperCase()}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Penanda "foto di token ini unggahan klien" untuk gambar tema yang diganti foto klien (Theme Builder `replaceSlot` dan
 * foto bebas `replaceable`). Pencocokan per slot (bukan nilai URL saja) agar fallback lintas slot seperti
 * `GLOBAL_FIXED_BG -> landingCoverUrl` atau `LANDING_COVER -> mainPhotoUrl` (Birthday) tidak menimpa ilustrasi tema.
 */
export function clientPhotoFlags(
  data: Record<string, any>,
  media: Array<{ mediaSlot?: string | null; localPath?: string | null; isThemeDefault?: boolean }>,
  options?: { eventType?: string | null; displayOrder?: string | null },
) {
  const clientBySlot = new Map<string, string>();
  for (const m of media || []) {
    if (m.mediaSlot && m.localPath && !m.isThemeDefault) {
      clientBySlot.set(String(m.mediaSlot), m.localPath);
    }
  }
  const hasSlot = (slot: string, renderedValue: unknown) => {
    const own = clientBySlot.get(slot);
    return Boolean(own && typeof renderedValue === "string" && renderedValue === own);
  };
  const ev = (options?.eventType || "WEDDING").toUpperCase();
  const isSingle = ev !== "WEDDING";
  const isGroomFirst = options?.displayOrder !== "BRIDE_FIRST";
  const singleSlot = ev === "EVENT" ? "EVENT_PHOTO" : "PROFILE_PHOTO";
  const hasSinglePhoto = (renderedValue: unknown) => hasSlot(singleSlot, renderedValue);
  const firstSlot = isGroomFirst ? "GROOM_PHOTO" : "BRIDE_PHOTO";
  const secondSlot = isGroomFirst ? "BRIDE_PHOTO" : "GROOM_PHOTO";
  return {
    clientHomePhoto: hasSlot("HOME_PHOTO", data.homePhotoUrl),
    clientFirstPhoto: isSingle ? hasSinglePhoto(data.firstPhotoUrl) : hasSlot(firstSlot, data.firstPhotoUrl),
    clientSecondPhoto: isSingle ? false : hasSlot(secondSlot, data.secondPhotoUrl),
    clientMainPhoto: isSingle ? hasSinglePhoto(data.mainPhotoUrl) : hasSlot("GROOM_PHOTO", data.mainPhotoUrl),
    clientCoverPhoto: hasSlot("LANDING_COVER", data.landingCoverUrl),
    clientClosingPhoto: hasSlot("CLOSING_COVER", data.closingPhotoUrl),
  };
}

/**
 * Token untuk seksi bebas Theme Builder di semua jenis acara: enam foto galeri pertama (mengikuti saklar galeri klien)
 * dan tautan peta acara pertama yang punya peta. Kosong berarti elemennya tidak dirender (`{{#if}}`).
 */
export async function builderFreeSectionTokens(inv: any): Promise<Record<string, string>> {
  const featureSettings = parseFeatureSettings(inv.featureSettings) as Record<string, any>;
  const photos = featureSettings.showGallery === false ? [] : await collectGalleryPhotos(inv, featureSettings);
  const tokens: Record<string, string> = {};
  for (let i = 0; i < 6; i++) tokens[`luxGalleryPhoto${i + 1}`] = photos[i] || "";
  const events = Array.isArray(inv.eventData) ? inv.eventData : [];
  // Tanpa escape di sini: renderTemplate meng-escape semua nilai token, sama seperti token mapsUrl.
  tokens.luxPrimaryMapUrl = safeExternalUrl(events.find((ev: any) => safeExternalUrl(ev?.mapsUrl))?.mapsUrl) || "";
  return tokens;
}
