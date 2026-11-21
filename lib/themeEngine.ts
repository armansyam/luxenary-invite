import { prisma } from "@/lib/prisma";
import { getGoogleDriveFolderPhotos } from "@/lib/driveHelper";
import { escapeHtml } from "@/lib/escapeHtml";
import { jsonForInlineScript } from "@/lib/safeJson";
import { safeHref, safeExternalUrl } from "@/lib/safeUrl";
import { safeCssColor } from "@/lib/safeCss";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { getAdminSetting, hasPlanCapability } from "@/lib/settings";
import { safeParseParticipants, type WeddingParticipants, type WeddingPerson } from "@/lib/participantUtils";
import { parseFeatureSettings } from "@/lib/featureSettings";
import { buildCalendarTitle, buildGoogleCalendarUrl, DEFAULT_THEME_BY_EVENT, resolveSubEventMeta, sanitizeSubEvent } from "@/lib/invitationUtils";
import { buildCheckinQrBaseUrl, buildCheckinQrUrl, qrInitials } from "@/lib/checkinQr";
import { getEventTimezoneOffset, getPrimaryEvent, resolveEventTimezone } from "@/lib/lifecycleDates";
import { logger } from "@/lib/logger";
import { applyThemeDefaultMedia, parseThemeDefaultMedia } from "@/lib/themeDefaultMedia";
import { filterDeclaredMedia, parseThemeMediaSlots } from "@/lib/themeMediaSlots";
import { applyBuilderTexts, builderTextLabels, builderTextsOf } from "@/lib/themeBuilder/texts";
import { storedVariant } from "@/lib/themeBuilder/spec";
import { buildCalendarButtonsHtml } from "@/lib/calendarLinks";
import { renderWeddingWishCardsHtml, buildUniversalWishesSectionHtml } from "@/lib/themeEngine/wishes";
import { getLocaleDict, normalizeInvitationLocale } from "@/lib/themeEngine/locale";
import { buildGiftRegistryHtml } from "@/lib/themeEngine/giftRegistry";
import { parseGiftRegistryFromSettings } from "@/lib/giftRegistry";
import { buildWeddingEventsHtml } from "@/lib/themeEngine/events";

export { buildWeddingEventsHtml } from "@/lib/themeEngine/events";

/** Sesi jadwal terima tamu (patokan yang sama dengan masa aktif), atau objek kosong bila belum bertanggal. */
function primaryEventOf(events: unknown): any {
  return getPrimaryEvent(events) ?? {};
}

/** Tanggal jadwal terima tamu untuk tampilan; draf tanpa tanggal tidak diberi tanggal contoh. */
function primaryEventDateLabel(events: unknown, locale: "id" | "en" = "id"): string {
  const date = primaryEventOf(events).date;
  return date ? formatDateId(date, locale) : getLocaleDict(locale).dateNotSet;
}

function nl2br(str: string): string {
  if (!str) return "";
  return escapeHtml(str).replace(/\r\n|\r|\n/g, "<br />");
}

function formatDateId(dateStr: string | Date, locale: "id" | "en" = "id"): string {
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return String(dateStr);
  }
}

/**
 * Foto galeri klien dari folder Google Drive, daftar URL, lalu slot media GALLERY. Sengaja tanpa cadangan foto demo
 * tema: undangan klien tidak boleh menampilkan foto model orang lain, dan galeri tanpa foto tidak dirender.
 */
// Hasil per objek undangan: composer dan galeri mini seksi bebas memakai daftar yang sama tanpa membaca folder Drive dua kali.
const galleryPhotoCache = new WeakMap<object, Promise<string[]>>();

function collectGalleryPhotos(inv: any, featureSettings: Record<string, any>): Promise<string[]> {
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

const NUMBER_WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

function parseVideoEmbed(url: string): string | null {
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
function generateInitialAvatarSvg(nameOrInitial: string, roleName: string): string {
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
 * `includeRsvps: false` dan `includeGift: false` dipakai salinan portofolio: nama dan ucapan tamu asli, nomor rekening,
 * QRIS, dan alamat kirim kado klien tidak ikut terbit di halaman publik lain. Data amplop dikosongkan di sumbernya
 * (bukan hanya `showGift`) karena beberapa master memakai `{{giftAddress}}` langsung.
 */
export async function composeTemplateData(
  invitationId: string,
  { includeRsvps = true, includeGift = true }: { includeRsvps?: boolean; includeGift?: boolean } = {},
) {
  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      media: true,
      rsvps: {
        where: { isHidden: false },
        orderBy: { respondedAt: "desc" },
        take: includeRsvps ? 30 : 0,
      },
      ...(includeGift ? { giftClaims: true } : {}),
      order: { select: { planType: true } },
    },
  });

  if (!inv) return null;
  if (!includeGift) {
    const featureSettings = { ...parseFeatureSettings(inv.featureSettings), showGift: false, qrisImageUrl: null, giftRegistry: [] };
    return composeInvitationData({ ...inv, bankAccounts: [], shippingAddress: null, giftClaims: [], featureSettings });
  }
  return composeInvitationData(inv);
}

/**
 * Data template dari objek undangan berbentuk hasil query di atas (media, rsvps, order). Demo tema memakai fungsi ini
 * dengan undangan virtual (`lib/demoInvitation.ts`), sehingga demo dirender oleh engine yang sama dengan undangan klien.
 */
export async function composeInvitationData(inv: any): Promise<Record<string, any>> {
  // Foto di slot yang tidak dipakai tema (sisa tema sebelumnya) dibuang dulu agar tidak menutup gambar tema atau
  // membatalkan cover bawaan; barisnya di database tetap. Lalu media bawaan tema mengisi slot yang belum diisi klien.
  const declaredMedia = filterDeclaredMedia<{ mediaSlot: string; localPath?: string | null }>(inv.media || [], parseThemeMediaSlots(inv.themeMediaSlots));
  inv = { ...inv, media: applyThemeDefaultMedia(declaredMedia, parseThemeDefaultMedia(inv.themeDefaultMedia)) };
  let data: Record<string, any>;
  switch (inv.eventType || "WEDDING") {
    case "PERSONAL":
      data = await finalizePersonalData(await composePersonalData(inv), inv);
      break;
    case "EVENT":
      data = await finalizeEventData(await composeEventData(inv), inv);
      break;
    default:
      data = await composeWeddingData(inv);
  }
  return {
    ...data,
    ...clientPhotoFlags(data, inv.media, {
      eventType: inv.eventType || "WEDDING",
      displayOrder: (parseFeatureSettings(inv.featureSettings) as Record<string, any>)?.displayOrder,
    }),
    ...(await builderFreeSectionTokens(inv)),
  };
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
async function builderFreeSectionTokens(inv: any): Promise<Record<string, string>> {
  const featureSettings = parseFeatureSettings(inv.featureSettings) as Record<string, any>;
  const photos = featureSettings.showGallery === false ? [] : await collectGalleryPhotos(inv, featureSettings);
  const tokens: Record<string, string> = {};
  for (let i = 0; i < 6; i++) tokens[`luxGalleryPhoto${i + 1}`] = photos[i] || "";
  const events = Array.isArray(inv.eventData) ? inv.eventData : [];
  // Tanpa escape di sini: renderTemplate meng-escape semua nilai token, sama seperti token mapsUrl.
  tokens.luxPrimaryMapUrl = safeExternalUrl(events.find((ev: any) => safeExternalUrl(ev?.mapsUrl))?.mapsUrl) || "";
  return tokens;
}

export async function composeWeddingData(inv: any) {
  const invitationId = inv.id;
  const mediaMap = new Map<string, string>();
  for (const m of inv.media) {
    if (m.localPath) mediaMap.set(String(m.mediaSlot), m.localPath);
  }

  const events: any[] = Array.isArray(inv.eventData) ? inv.eventData : [];
  const loveStories: any[] = Array.isArray(inv.loveStory) ? inv.loveStory : [];
  const bankAccounts: any[] = Array.isArray(inv.bankAccounts) ? inv.bankAccounts : [];
  const featureSettings: any = parseFeatureSettings(inv.featureSettings);
  const locale = normalizeInvitationLocale(featureSettings.language);
  const dict = getLocaleDict(locale);
  const realSlug = inv.invitationSlug && !String(inv.id || "").startsWith("demo") ? String(inv.invitationSlug) : undefined;

  // Theme Blueprint Defaults Resolution
  let customDemoData: any = null;
  try {
    const customSetting = await prisma.adminSetting.findUnique({
      where: { key: `theme_demo_${(inv.themeId || "kalandra").toLowerCase()}` },
      select: { value: true },
    });
    if (customSetting?.value) {
      customDemoData = JSON.parse(customSetting.value);
    }
  } catch (err) {
    logger.warn("ThemeEngine", "Data Studio Demo tema tidak terbaca; teks bawaan blueprint dipakai", { themeId: inv.themeId, error: err instanceof Error ? err.message : String(err) });
  }

  // Baca defaultMusicUrl dan teks bawaan builder dari DB Theme record (musik: prioritas tertinggi setelah client upload)
  let dbThemeDefaultMusic = "";
  let dbTheme: { defaultMusicUrl: string | null; builderSpec: unknown } | null = null;
  try {
    dbTheme = await prisma.theme.findUnique({
      where: { id: (inv.themeId || "kalandra").toLowerCase() },
      select: { defaultMusicUrl: true, builderSpec: true },
    });
  } catch (err) {
    logger.warn("ThemeEngine", "Data tema tidak terbaca; musik dan teks bawaan builder tidak dipakai", { themeId: inv.themeId, error: err instanceof Error ? err.message : String(err) });
  }
  if (dbTheme?.defaultMusicUrl) dbThemeDefaultMusic = dbTheme.defaultMusicUrl;

  // Teks bawaan tema builder (inv.builderTexts dipakai pratinjau builder untuk rancangan yang belum tersimpan).
  const builderApplied = applyBuilderTexts(
    getThemeBlueprint(inv.themeId || "kalandra", customDemoData || undefined),
    inv.builderTexts ?? builderTextsOf(dbTheme?.builderSpec),
  );
  const blueprint = builderApplied.blueprint;

  const rawThemeSpec = (inv.builderSpec ?? dbTheme?.builderSpec) as any;
  const builderSectionLayouts = rawThemeSpec && typeof rawThemeSpec === "object" && rawThemeSpec.variants ? rawThemeSpec.variants : {};
  const galleryVariant = String(builderSectionLayouts.gallery || "grid");
  const eventsVariant = String(builderSectionLayouts.events || "cards");
  const storyVariant = String(builderSectionLayouts.story || "timeline");
  const giftVariant = String(builderSectionLayouts.gift || "cards");


  const showStory = featureSettings.showStory !== undefined ? Boolean(featureSettings.showStory) : true;
  const showGallery = featureSettings.showGallery !== undefined ? Boolean(featureSettings.showGallery) : true;
  const showGift = featureSettings.showGift !== undefined ? Boolean(featureSettings.showGift) : true;
  const showDresscode = featureSettings.showDresscode !== undefined ? Boolean(featureSettings.showDresscode) : true;
  // Fitur berbayar mengikuti paket order: flag kosong tidak boleh membuka kartu QR untuk paket tanpa qr_checkin.
  const showQrCheckin = featureSettings.showQrCheckin !== false && await hasPlanCapability(inv.order?.planType, "qr_checkin");
  const showLiveStream = featureSettings.showLiveStream !== undefined ? Boolean(featureSettings.showLiveStream) : true;
  const showTurutMengundang = featureSettings.showTurutMengundang !== undefined ? Boolean(featureSettings.showTurutMengundang) : true;
  const showFilter = featureSettings.showFilter !== undefined ? Boolean(featureSettings.showFilter) : false;
  const showVendors = featureSettings.showVendors !== undefined ? Boolean(featureSettings.showVendors) : true;

  // Dynamic Couple Display Order Resolution
  const isGroomFirst = featureSettings.displayOrder !== "BRIDE_FIRST";

  const participants = safeParseParticipants(inv.participantsJson) as WeddingParticipants;
  const personField = (role: "groom" | "bride", key: keyof WeddingPerson) => String(participants[role]?.[key] ?? "").trim();

  const groomName = personField("groom", "name") || personField("groom", "nickname") || "Mempelai Pria";
  const brideName = personField("bride", "name") || personField("bride", "nickname") || "Mempelai Wanita";
  const groomNickname = personField("groom", "nickname") || personField("groom", "name") || "Pria";
  const brideNickname = personField("bride", "nickname") || personField("bride", "name") || "Wanita";
  const groomDisplayName = groomName;
  const brideDisplayName = brideName;
  const groomFather = personField("groom", "father");
  const groomMother = personField("groom", "mother");
  const brideFather = personField("bride", "father");
  const brideMother = personField("bride", "mother");

  const groomParents = (groomFather || groomMother)
    ? `Putra dari ${groomFather}${groomFather && groomMother ? " & " : ""}${groomMother}`
    : "";
  const brideParents = (brideFather || brideMother)
    ? `Putri dari ${brideFather}${brideFather && brideMother ? " & " : ""}${brideMother}`
    : "";
  const groomInstagram = personField("groom", "instagram").replace(/^@+/, "");
  const brideInstagram = personField("bride", "instagram").replace(/^@+/, "");

  // Resolve Photos (Theme-Aware Fallbacks without Stranger Model Fallbacks on Personal Slots)
  const themeFolder = inv.themeId || "kalandra";
  const customCover = mediaMap.get("LANDING_COVER");
  const customSidebar = mediaMap.get("DESKTOP_SIDEBAR");
  const customGroom = mediaMap.get("GROOM_PHOTO");
  const customBride = mediaMap.get("BRIDE_PHOTO");
  const customHomePhoto = mediaMap.get("HOME_PHOTO") || null;
  const customFixedBg = mediaMap.get("GLOBAL_FIXED_BG");
  const closingPhotoUrl = mediaMap.get("CLOSING_COVER") || null;

  // Background Canvas: Zero-Fake Fallback (Tanpa Memaksa Foto Demo / Foto Model Asing)
  // GLOBAL_FIXED_BG adalah slot media mandiri untuk background canvas
  const fixedBgUrl = customFixedBg || "";
  const coverUrl = customCover || fixedBgUrl || "";
  const coverDesktopUrl = mediaMap.get("LANDING_COVER_DESKTOP") || coverUrl;
  const sidebarUrl = customSidebar || coverUrl;
  const homePhotoUrl = customHomePhoto || "";

  // Foto Personal Mempelai: Jika tidak diunggah, gunakan Monogram Inisial Artistik (Anti-Foto Model Orang Asing)
  const groomPhoto = customGroom || generateInitialAvatarSvg(groomNickname || groomName, "The Groom");
  const bridePhoto = customBride || generateInitialAvatarSvg(brideNickname || brideName, "The Bride");

  // 1st Host vs 2nd Host
  const firstNickname = isGroomFirst ? groomNickname : brideNickname;
  const secondNickname = isGroomFirst ? brideNickname : groomNickname;
  const firstName = firstNickname;
  const secondName = secondNickname;
  const firstInitial = (firstName || firstNickname || (isGroomFirst ? "G" : "B")).trim().charAt(0).toUpperCase();
  const secondInitial = (secondName || secondNickname || (isGroomFirst ? "B" : "G")).trim().charAt(0).toUpperCase();
  const coupleMonogram = `${firstInitial} & ${secondInitial}`;
  const firstFullName = isGroomFirst ? groomName : brideName;
  const secondFullName = isGroomFirst ? brideName : groomName;
  const firstDisplayName = isGroomFirst ? groomDisplayName : brideDisplayName;
  const secondDisplayName = isGroomFirst ? brideDisplayName : groomDisplayName;
  const firstRole = isGroomFirst ? "The Groom" : "The Bride";
  const secondRole = isGroomFirst ? "The Bride" : "The Groom";
  const firstFather = isGroomFirst ? groomFather : brideFather;
  const firstMother = isGroomFirst ? groomMother : brideMother;
  const secondFather = isGroomFirst ? brideFather : groomFather;
  const secondMother = isGroomFirst ? brideMother : groomMother;
  // Nama orang tua boleh kosong (hanya jenis acara yang wajib di wizard): label "Putra Dari" tanpa nama tidak ditampilkan.
  const firstHasParents = Boolean(firstFather || firstMother);
  const secondHasParents = Boolean(secondFather || secondMother);
  const firstParentPrefix = firstHasParents ? (isGroomFirst ? dict.sonOf : dict.daughterOf) : "";
  const secondParentPrefix = secondHasParents ? (isGroomFirst ? dict.daughterOf : dict.sonOf) : "";
  const firstParentLabel = firstParentPrefix;
  const secondParentLabel = secondParentPrefix;
  // Pengganti "&amp;" literal di master antara {{xFather}} dan {{xMother}} (lihat renderTemplateFile).
  const firstParentsJoinHtml = firstFather && firstMother ? " &amp; " : "";
  const secondParentsJoinHtml = secondFather && secondMother ? " &amp; " : "";
  const firstParents = isGroomFirst ? groomParents : brideParents;
  const secondParents = isGroomFirst ? brideParents : groomParents;
  const firstInstagram = isGroomFirst ? groomInstagram : brideInstagram;
  const secondInstagram = isGroomFirst ? brideInstagram : groomInstagram;
  const firstPhotoUrl = isGroomFirst ? groomPhoto : bridePhoto;
  const secondPhotoUrl = isGroomFirst ? bridePhoto : groomPhoto;
  const firstGender = isGroomFirst ? "groom" : "bride";
  const secondGender = isGroomFirst ? "bride" : "groom";
  const firstGenderLabel = isGroomFirst ? "Mempelai Pria" : "Mempelai Wanita";
  const secondGenderLabel = isGroomFirst ? "Mempelai Wanita" : "Mempelai Pria";

  // Date Resolution: Prioritaskan Sesi Acara Utama (isPrimary: true) sebagai patokan tunggal
  const rawEventsList = Array.isArray(events) ? events : [];
  const primaryEvent = primaryEventOf(rawEventsList);
  // Draf tanpa tanggal tidak diberi tanggal contoh: angka sampul kosong dan hitung mundur tidak berjalan.
  const primaryEventDate = primaryEvent?.date || "";
  const primaryStartTime = primaryEvent?.startTime || (primaryEvent?.time ? primaryEvent.time.split(/[-–]/)[0].trim() : "08:00");
  const formattedTime = primaryStartTime.length === 5 ? `${primaryStartTime}:00` : "08:00:00";

  const targetDate = primaryEventDate ? `${primaryEventDate}T${formattedTime}` : "";
  let weddingDateDay = "";
  let weddingDateMonth = "";
  let weddingDateYear = "";
  let weddingDate = dict.dateNotSet;

  try {
    const d = new Date(primaryEventDate);
    if (!isNaN(d.getTime())) {
      weddingDateDay = String(d.getDate()).padStart(2, "0");
      weddingDateMonth = String(d.getMonth() + 1).padStart(2, "0");
      weddingDateYear = String(d.getFullYear());
      weddingDate = d.toLocaleDateString(dict.intlLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
  } catch {}

  // 1. Dynamic Events HTML with Smart Location & Maps Deduplication
  const eventsHtml = buildWeddingEventsHtml({
    rawEventsList,
    firstName,
    secondName,
    weddingDate,
    realSlug,
    eventsVariant,
    locale,
  });



  // Custom Labels & Section Titles Override (with Theme Blueprint & Locale Fallbacks)
  const isEn = locale === "en";
  const customLabels = {
    openBtn: isEn ? dict.openInvitation : blueprint.openBtn,
    coverSubtitle: blueprint.coverSubtitle,
    coverGuestLabel: dict.coverGuestLabel,
    rsvpTitle: isEn ? dict.rsvpTitleDefault : blueprint.rsvpTitle,
    quoteTitle: blueprint.quoteSectionTitle,
    quoteEyebrow: blueprint.quoteSectionEyebrow,
    openingGreeting: blueprint.openingGreeting || "",
    coverBadge: blueprint.coverBadge || featureSettings.weddingTagline || "THE WEDDING OF",
    coupleTitle: isEn ? "The Couple" : blueprint.coupleSectionTitle,
    coupleEyebrow: blueprint.coupleSectionEyebrow || "THE COUPLE",
    coupleSub: blueprint.coupleSectionSub,
    eventsTitle: isEn ? "Event Details" : blueprint.eventsSectionTitle,
    eventsEyebrow: dict.eventsEyebrow,
    eventsSub: blueprint.eventsSectionSub,
    storyTitle: isEn ? "Our Story" : blueprint.storySectionTitle,
    galleryTitle: isEn ? "Gallery" : blueprint.gallerySectionTitle,
    galleryEyebrow: blueprint.gallerySectionEyebrow,
    galleryQuote: blueprint.galleryQuote,
    giftTitle: isEn ? dict.giftTitle : blueprint.giftSectionTitle,
    giftEyebrow: isEn ? dict.giftEyebrow : blueprint.giftSectionEyebrow,
    giftDesc: blueprint.giftSectionDesc,
    wishesTitle: isEn ? dict.wishesTitle : blueprint.wishesSectionTitle,
    wishesEyebrow: dict.wishesEyebrow,
    wishesSub: blueprint.wishesSectionSub,
    storyEyebrow: blueprint.storySectionEyebrow || "OUR JOURNEY",
    dressCodeTitle: isEn ? dict.dressCodeTitle : (blueprint.dressCodeTitle || "Dress Code"),
    dressCodeEyebrow: blueprint.dressCodeEyebrow || "A Guide To",
    dressCodeSubtitle: isEn ? dict.dressCodeSubtitleDefault : (blueprint.dressCodeSubtitle || "Kami mengundang tamu undangan untuk mengenakan palet warna berikut:"),
    streamingTitle: isEn ? dict.liveStreamTitle : (blueprint.streamingTitle || "Live Streaming"),
    streamingEyebrow: isEn ? dict.liveStreamEyebrow : (blueprint.streamingEyebrow || "Virtual Ceremony"),
    streamingSubtitle: isEn
      ? "For family & friends joining from afar, please watch our ceremony live:"
      : (blueprint.streamingSubtitle || "Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:"),
    turutMengundangTitle: isEn ? "With Blessings From" : (blueprint.turutMengundangTitle || "Turut Mengundang"),
    turutMengundangEyebrow: isEn ? "Extended Family" : (blueprint.turutMengundangEyebrow || "Keluarga Besar"),
    turutMengundangSubtitle: isEn
      ? "Extended family & loved ones sharing in our joy:"
      : (blueprint.turutMengundangSubtitle || "Keluarga Besar & Kerabat yang turut berbahagia:"),
    rsvpBtnText: isEn ? dict.rsvpBtnDefault : (blueprint.rsvpBtnText || "Kirim Konfirmasi & Doa"),
    vendorTitle: blueprint.vendorTitle || "Vendor",
    vendorEyebrow: blueprint.vendorEyebrow || "SPECIAL THANKS",
    vendorSubtitle: blueprint.vendorSubtitle || "",
    groomRole: isEn ? "The Groom" : "Mempelai Pria",
    brideRole: isEn ? "The Bride" : "Mempelai Wanita",
    ...builderApplied.labels,
    ...(featureSettings.customLabels || {}),
  };
  const groomRoleLabel = customLabels.groomRole || (isEn ? "The Groom" : "Mempelai Pria");
  const brideRoleLabel = customLabels.brideRole || (isEn ? "The Bride" : "Mempelai Wanita");
  const firstRoleLabel = isGroomFirst ? groomRoleLabel : brideRoleLabel;
  const secondRoleLabel = isGroomFirst ? brideRoleLabel : groomRoleLabel;
  const quoteSectionTitle = customLabels.quoteTitle || featureSettings.quoteTitle || blueprint.quoteSectionTitle;
  const quoteSectionEyebrow = customLabels.quoteEyebrow || blueprint.quoteSectionEyebrow;
  const openingGreeting = customLabels.openingGreeting !== undefined ? customLabels.openingGreeting : (blueprint.openingGreeting || "");
  const coverBadge = customLabels.coverBadge !== undefined ? customLabels.coverBadge : (blueprint.coverBadge || featureSettings.weddingTagline || "THE WEDDING OF");
  const coupleSectionEyebrow = customLabels.coupleEyebrow || blueprint.coupleSectionEyebrow || "THE COUPLE";
  const coupleSectionTitle = customLabels.coupleTitle || blueprint.coupleSectionTitle;
  const coupleSectionSub = customLabels.coupleSub || blueprint.coupleSectionSub;
  const eventsSectionTitle = customLabels.eventsTitle || blueprint.eventsSectionTitle;
  const eventsSectionSub = customLabels.eventsSub || blueprint.eventsSectionSub;
  const storySectionTitle = customLabels.storyTitle || blueprint.storySectionTitle;
  const storySectionEyebrow = customLabels.storyEyebrow || blueprint.storySectionEyebrow || "OUR JOURNEY";
  const gallerySectionTitle = customLabels.galleryTitle || blueprint.gallerySectionTitle;
  const gallerySectionEyebrow = customLabels.galleryEyebrow || blueprint.gallerySectionEyebrow;
  const galleryQuote = customLabels.galleryQuote || blueprint.galleryQuote;
  const dressCodeTitle = customLabels.dressCodeTitle || blueprint.dressCodeTitle || "Dress Code";
  const dressCodeEyebrow = customLabels.dressCodeEyebrow || blueprint.dressCodeEyebrow || "A Guide To";
  const dressCodeSubtitle = customLabels.dressCodeSubtitle || blueprint.dressCodeSubtitle || "Kami mengundang tamu undangan untuk mengenakan palet warna berikut:";
  const streamingTitle = customLabels.streamingTitle || blueprint.streamingTitle || "Live Streaming";
  const streamingEyebrow = customLabels.streamingEyebrow || blueprint.streamingEyebrow || "Virtual Ceremony";
  const streamingSubtitle = customLabels.streamingSubtitle || blueprint.streamingSubtitle || "Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:";
  const turutMengundangTitle = customLabels.turutMengundangTitle || blueprint.turutMengundangTitle || "Turut Mengundang";
  const turutMengundangEyebrow = customLabels.turutMengundangEyebrow || blueprint.turutMengundangEyebrow || "Keluarga Besar";
  const turutMengundangSubtitle = customLabels.turutMengundangSubtitle || blueprint.turutMengundangSubtitle || "Keluarga Besar & Kerabat yang turut berbahagia:";
  const giftSectionTitle = customLabels.giftTitle || blueprint.giftSectionTitle;
  const giftSectionEyebrow = customLabels.giftEyebrow || blueprint.giftSectionEyebrow;
  const giftSectionDesc = customLabels.giftDesc || blueprint.giftSectionDesc;
  const wishesSectionTitle = customLabels.wishesTitle || blueprint.wishesSectionTitle;
  const wishesSectionSub = customLabels.wishesSub || blueprint.wishesSectionSub;
  const vendorTitle = customLabels.vendorTitle || blueprint.vendorTitle || "Vendor";
  const vendorEyebrow = customLabels.vendorEyebrow || blueprint.vendorEyebrow || "SPECIAL THANKS";
  const vendorSubtitle = customLabels.vendorSubtitle || blueprint.vendorSubtitle || "";

  // 2. Dynamic Journey of Love / Story Module
  let storySectionHtml = "";
  let storyItemsHtml = "";
  // Tanpa kisah dari klien seksi tidak dirender: kisah contoh akan tercetak sebagai fakta di undangan nyata.
  const rawStories = Array.isArray(loveStories) ? loveStories : [];
  if (showStory && rawStories.length > 0) {

    storyItemsHtml = rawStories.map((st: any, idx: number) => {
      const numWord = NUMBER_WORDS[idx] || String(idx + 1);
      let heading = st.title || "";
      if (!heading.toLowerCase().startsWith("chapter")) {
        heading = `Chapter ${numWord}: ${heading}`;
      }
      return `
        <div class="story-chapter-block journey-chapter-item">
          <span class="sc-label chapter-eyebrow">CHAPTER ${numWord}</span>
          <h4 class="sc-title chapter-heading serif" data-lux-field="stories.${idx}.title">${escapeHtml(st.title || heading)}</h4>
          <p class="sc-desc chapter-desc" data-lux-field="stories.${idx}.content">${nl2br(st.content || st.description || "")}</p>
        </div>
      `;
    }).join("");

    storySectionHtml = `
      <section class="sec-flow sec-journey story-variant-${storyVariant}" id="story" data-story-variant="${storyVariant}">
        <span class="sec-eyebrow reveal" data-lux-field="customLabels.storyEyebrow" style="text-align:center;">${escapeHtml(storySectionEyebrow)}</span>
        <h2 class="sec-main-title journey-title serif reveal delay-1" data-lux-field="customLabels.storyTitle">${escapeHtml(storySectionTitle)}</h2>
        <div class="journey-timeline journey-chapters reveal-up delay-2">
          ${storyItemsHtml}
        </div>
        <div class="journey-footer reveal-fade delay-3">
          <div class="jf-line"></div>
          <span class="jf-signature serif">${escapeHtml(firstName)} <em>&amp;</em> ${escapeHtml(secondName)}</span>
        </div>
      </section>
    `;
  }

  // 3. Gathering All Available Photos for OUR MOMENTS Gallery
  const allPhotos = await collectGalleryPhotos(inv, featureSettings);

  // 4. Video Player HTML
  const videoGalleryRawUrl = safeExternalUrl(featureSettings.videoGalleryUrl);
  const embedVideoUrl = parseVideoEmbed(videoGalleryRawUrl);
  let videoPlayerHtml = "";
  if (embedVideoUrl) {
    if (embedVideoUrl.includes("youtube.com/embed") || embedVideoUrl.includes("player.vimeo.com")) {
      videoPlayerHtml = `
        <div class="video-teaser-box" style="margin: 1.5rem auto 2rem; max-width: 480px; width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15);">
          <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
            <iframe 
              src="${escapeHtml(embedVideoUrl)}"
              title="Pre-Wedding Teaser"
              style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
        </div>
      `;
    } else {
      videoPlayerHtml = `
        <div class="video-teaser-box" style="margin: 1.5rem auto 2rem; max-width: 480px; width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15);">
          <video controls playsinline style="width:100%; display:block;">
            <source src="${escapeHtml(videoGalleryRawUrl)}" type="video/mp4">
          </video>
        </div>
      `;
    }
  }

  // 5. OUR MOMENT Section (Max 10 photos on page + button to open full lightbox)
  let gallerySectionHtml = "";
  if (showGallery && (allPhotos.length > 0 || videoPlayerHtml)) {
    const photosFeedHtml = allPhotos.map((imgUrl, i) => `
      <div class="moment-photo-item" data-idx="${i}" onclick="luxOpenZoom(${i})">
        <img src="${escapeHtml(imgUrl)}" alt="Our Moment ${i + 1}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
      </div>
    `).join("");

    const allPhotosGridHtml = allPhotos.map((imgUrl, i) => `
      <div class="full-gallery-item" onclick="luxOpenZoom(${i})">
        <img src="${escapeHtml(imgUrl)}" alt="Photo ${i + 1}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
      </div>
    `).join("");

    gallerySectionHtml = `
      <section class="sec-flow gallery-variant-${galleryVariant}" id="moments" data-lux-section="gallery" data-gallery-variant="${galleryVariant}">
        <!-- lux-ornaments:gallery -->
        <span class="sec-eyebrow" data-lux-field="customLabels.galleryEyebrow" data-lux-block="gallery-eyebrow">${escapeHtml(gallerySectionEyebrow)}</span>
        <h2 class="sec-main-title serif" data-lux-field="customLabels.galleryTitle" data-lux-block="gallery-title">${escapeHtml(gallerySectionTitle)}</h2>
        <p class="moment-quote serif" data-lux-field="customLabels.galleryQuote" data-lux-block="gallery-quote">
          “${escapeHtml(galleryQuote)}”
        </p>

        ${videoPlayerHtml}

        ${allPhotos.length > 0 ? `
        <div class="moments-grid-wrap moments-carousel-wrap">
          <div class="moments-grid-10 is-${galleryVariant}" data-lux-block="gallery-grid" id="momentsGridContainer">
            ${photosFeedHtml}
          </div>
          ${galleryVariant === "carousel" ? `
          <button type="button" class="carousel-nav-btn carousel-nav-prev" onclick="luxScrollCarousel(-1)" aria-label="Foto sebelumnya">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button type="button" class="carousel-nav-btn carousel-nav-next" onclick="luxScrollCarousel(1)" aria-label="Foto selanjutnya">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
          ` : ""}
        </div>

        <button type="button" class="btn-outline-box btn-show-gallery" onclick="luxOpenFullGallery()">
          LIHAT SEMUA FOTO (${allPhotos.length} FOTO)
        </button>
        ` : ""}

        <style>
          /* OUR MOMENT UNIVERSAL 4-COLUMN SMART PUZZLE GRID */
          .moments-grid-10 {
            display: grid !important; grid-template-columns: repeat(4, 1fr) !important; grid-auto-flow: dense !important;
            gap: 5px !important; margin-bottom: 2.2rem !important; width: 100% !important;
          }
          .moment-photo-item {
            position: relative !important; overflow: hidden !important; border-radius: 6px !important; cursor: pointer !important;
            border: 1px solid rgba(255,255,255,0.12) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important;
            transition: border-color 0.25s ease, filter 0.25s ease !important; aspect-ratio: 3/4 !important;
          }
          .moment-photo-item.is-landscape { grid-column: span 2 !important; aspect-ratio: 3/2 !important; }
          .moment-photo-item:hover { border-color: rgba(255,255,255,0.35) !important; filter: brightness(1.08) !important; }
          .moment-photo-item:hover img { transform: none !important; }
          .moment-photo-item img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
          .btn-show-gallery { display: inline-block !important; margin-bottom: 0 !important; }

          /* LIGHTBOX MODALS UNIVERSAL */
          .gallery-modal-backdrop {
            position: fixed !important; inset: 0 !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
            width: 100vw !important; max-width: 100vw !important; height: 100vh !important; min-height: 100% !important; margin: 0 !important;
            border: none !important; border-radius: 0 !important; box-shadow: none !important; z-index: 99990 !important;
            background: rgba(7,7,9,0.96) !important; backdrop-filter: blur(20px) !important;
            display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: flex-start !important;
            opacity: 0 !important; visibility: hidden !important; transition: all 0.3s ease !important;
            overflow-y: auto !important; padding: calc(1.5rem + env(safe-area-inset-top, 0px)) 1rem calc(2rem + env(safe-area-inset-bottom, 0px)) !important; box-sizing: border-box !important;
          }
          .gallery-modal-backdrop.open { opacity: 1 !important; visibility: visible !important; }
          .gallery-modal-container { max-width: 600px !important; width: 100% !important; margin: 0 auto !important; }
          .gallery-modal-header { display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 1.5rem !important; padding-bottom: 0.8rem !important; border-bottom: 1px solid rgba(255,255,255,0.15) !important; }
          .modal-gallery-title { font-size: 1.6rem !important; color: #fff !important; letter-spacing: 0.1em !important; margin: 0 !important; }
          .gallery-modal-close {
            background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #ffffff !important;
            width: 38px !important; height: 38px !important; border-radius: 50% !important; font-size: 1.1rem !important; cursor: pointer !important;
            display: flex !important; align-items: center !important; justify-content: center !important;
          }
          .gallery-modal-grid { columns: 4 !important; column-gap: 5px !important; }
          @media (max-width: 480px) { .gallery-modal-grid { columns: 3 !important; } }
          .full-gallery-item {
            break-inside: avoid !important; margin-bottom: 8px !important; overflow: hidden !important; border-radius: 6px !important; cursor: pointer !important;
            border: 1px solid rgba(255,255,255,0.12) !important; transition: border-color 0.25s ease, filter 0.25s ease !important;
          }
          .full-gallery-item img { width: 100% !important; height: auto !important; display: block !important; }
          .full-gallery-item:hover { border-color: rgba(255,255,255,0.35) !important; filter: brightness(1.08) !important; }

          /* ZOOM LIGHTBOX UNIVERSAL */
          .lux-zoom-backdrop {
            position: fixed !important; inset: 0 !important; z-index: 99999 !important; background: rgba(0,0,0,0.96) !important; backdrop-filter: blur(16px) !important;
            display: flex !important; align-items: center !important; justify-content: center !important; opacity: 0 !important; visibility: hidden !important; transition: all 0.3s ease !important;
            padding: calc(1.5rem + env(safe-area-inset-top, 0px)) 1rem calc(1.5rem + env(safe-area-inset-bottom, 0px)) !important; touch-action: none !important; overscroll-behavior: contain !important;
          }
          .lux-zoom-backdrop.open { opacity: 1 !important; visibility: visible !important; }
          .lux-zoom-close {
            position: fixed !important; top: calc(18px + env(safe-area-inset-top, 0px)) !important; right: calc(18px + env(safe-area-inset-right, 0px)) !important; background: rgba(35,35,38,0.85) !important; backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(255,255,255,0.1) !important; color: #fff !important; width: 44px !important; height: 44px !important; border-radius: 50% !important;
            font-size: 1.2rem !important; cursor: pointer !important; z-index: 100000 !important; display: flex !important; align-items: center !important; justify-content: center !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important; transition: transform 0.2s !important;
            touch-action: manipulation !important;
          }
          .lux-zoom-close:hover { transform: scale(1.08) !important; background: #ffffff !important; color: #070709 !important; }
          .lux-zoom-nav {
            position: fixed !important; top: 50% !important; transform: translateY(-50%) !important; background: rgba(35,35,38,0.85) !important; backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(255,255,255,0.1) !important; color: #fff !important; width: 44px !important; height: 44px !important; border-radius: 50% !important;
            font-size: 1.8rem !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; z-index: 100000 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important;
          }
          .lux-zoom-nav.prev { left: 14px !important; }
          .lux-zoom-nav.next { right: 14px !important; }
          .lux-zoom-img-box {
            max-width: 90vw !important; max-height: 80vh !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important;
            position: relative !important; z-index: 99999 !important;
          }
          .lux-zoom-img-box img { max-width: 100% !important; max-height: 75vh !important; object-fit: contain !important; border-radius: 8px !important; box-shadow: 0 15px 50px rgba(0,0,0,0.9) !important; }
          .lux-zoom-counter {
            font-size: 0.75rem !important; letter-spacing: 0.2em !important; color: #fff !important;
            margin-top: 0.8rem !important; font-weight: 600 !important; text-transform: uppercase !important; background: rgba(0,0,0,0.6) !important; padding: 4px 12px !important; border-radius: 20px !important; border: 1px solid rgba(255,255,255,0.1) !important;
          }
        </style>
      </section>

      <!-- FULL GALLERY LIGHTBOX MODAL -->
      <div class="gallery-modal-backdrop" id="luxFullGalleryModal" onclick="luxCloseFullGallery(event)">
        <div class="gallery-modal-container" onclick="event.stopPropagation()">
          <div class="gallery-modal-header">
            <h3 class="serif modal-gallery-title">OUR MOMENTS</h3>
            <button class="gallery-modal-close" onclick="luxCloseFullGallery()">✕</button>
          </div>
          <div class="gallery-modal-grid">
            ${allPhotosGridHtml}
          </div>
        </div>
      </div>

      <!-- IMAGE ZOOM LIGHTBOX -->
      <div class="lux-zoom-backdrop" id="luxZoomModal" onclick="luxCloseZoom(event)">
        <button class="lux-zoom-close" onclick="luxCloseZoom()">✕</button>
        <button class="lux-zoom-nav prev" onclick="luxPrevZoom(event)">‹</button>
        <div class="lux-zoom-img-box" onclick="event.stopPropagation()">
          <img id="luxZoomActiveImg" src="${escapeHtml(allPhotos[0] || '')}" alt="Zoom View" referrerpolicy="no-referrer">
          <div class="lux-zoom-counter" id="luxZoomCounter">1 / ${allPhotos.length}</div>
        </div>
        <button class="lux-zoom-nav next" onclick="luxNextZoom(event)">›</button>
      </div>

      <script>
        window.LUX_ALL_PHOTOS = ${jsonForInlineScript(allPhotos)};
        window.luxActivePhotoIdx = 0;

        window.luxScrollCarousel = function(dir) {
          var el = document.getElementById("momentsGridContainer") || document.querySelector(".moments-grid-10.is-carousel");
          if (!el) return;
          var step = Math.min(el.clientWidth * 0.75, 300);
          el.scrollBy({ left: dir * step, behavior: "smooth" });
        };

        function ensureModalsOnBody() {
          const m1 = document.getElementById('luxFullGalleryModal');
          if (m1 && m1.parentNode !== document.body) document.body.appendChild(m1);
          const m2 = document.getElementById('luxZoomModal');
          if (m2 && m2.parentNode !== document.body) document.body.appendChild(m2);
        }
        document.addEventListener('DOMContentLoaded', ensureModalsOnBody);

        window.luxOpenFullGallery = function() {
          ensureModalsOnBody();
          const m = document.getElementById('luxFullGalleryModal');
          if (m) {
            m.classList.add('open');
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
          }
        };

        window.luxCloseFullGallery = function(e) {
          if (!e || e.target === document.getElementById('luxFullGalleryModal') || e.target.classList.contains('gallery-modal-close')) {
            const m = document.getElementById('luxFullGalleryModal');
            if (m) {
              m.classList.remove('open');
              document.body.style.overflow = '';
              document.documentElement.style.overflow = '';
            }
          }
        };

        window.luxOpenZoom = function(idx) {
          ensureModalsOnBody();
          window.luxActivePhotoIdx = idx >= 0 && idx < window.LUX_ALL_PHOTOS.length ? idx : 0;
          const zoom = document.getElementById('luxZoomModal');
          const img = document.getElementById('luxZoomActiveImg');
          const counter = document.getElementById('luxZoomCounter');
          if (img && window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx]) {
            img.src = window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx];
          }
          if (counter) {
            counter.textContent = (window.luxActivePhotoIdx + 1) + " / " + window.LUX_ALL_PHOTOS.length;
          }
          if (zoom) {
            zoom.classList.add('open');
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
          }
        };

        window.luxCloseZoom = function(e) {
          if (!e || e.target === document.getElementById('luxZoomModal') || e.target.classList.contains('lux-zoom-close')) {
            const zoom = document.getElementById('luxZoomModal');
            if (zoom) {
              zoom.classList.remove('open');
              const fg = document.getElementById('luxFullGalleryModal');
              if (!fg || !fg.classList.contains('open')) {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
              }
            }
          }
        };

        window.luxNextZoom = function(e) {
          if (e) e.stopPropagation();
          window.luxActivePhotoIdx = (window.luxActivePhotoIdx + 1) % window.LUX_ALL_PHOTOS.length;
          const img = document.getElementById('luxZoomActiveImg');
          const counter = document.getElementById('luxZoomCounter');
          if (img) img.src = window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx];
          if (counter) counter.textContent = (window.luxActivePhotoIdx + 1) + " / " + window.LUX_ALL_PHOTOS.length;
        };

        window.luxPrevZoom = function(e) {
          if (e) e.stopPropagation();
          window.luxActivePhotoIdx = (window.luxActivePhotoIdx - 1 + window.LUX_ALL_PHOTOS.length) % window.LUX_ALL_PHOTOS.length;
          const img = document.getElementById('luxZoomActiveImg');
          const counter = document.getElementById('luxZoomCounter');
          if (img) img.src = window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx];
          if (counter) counter.textContent = (window.luxActivePhotoIdx + 1) + " / " + window.LUX_ALL_PHOTOS.length;
        };

        // Smart Puzzle Grid Auto-Packing (100% flush rectangular frame, no holes)
        function initSmartPuzzleGallery() {
          const grid = document.querySelector('.moments-grid-10');
          if (!grid) return;
          const items = Array.from(grid.querySelectorAll('.moment-photo-item'));
          if (!items.length) return;

          let loadedCount = 0;
          items.forEach((item) => {
            const img = item.querySelector('img');
            if (!img) return;

            function applyOrientation(w, h) {
              if (w && h) {
                if (w > h * 1.12) {
                  item.classList.add('is-landscape');
                } else {
                  item.classList.remove('is-landscape');
                }
              }
              loadedCount++;
              if (loadedCount >= items.length) {
                packPuzzleSlots(items);
              }
            }

            if (img.complete && img.naturalWidth > 0) {
              applyOrientation(img.naturalWidth, img.naturalHeight);
            } else {
              const probe = new Image();
              probe.referrerPolicy = 'no-referrer';
              probe.onload = function() {
                applyOrientation(probe.naturalWidth, probe.naturalHeight);
              };
              probe.onerror = function() {
                loadedCount++;
              };
              probe.src = img.src;
            }
          });

          setTimeout(() => { packPuzzleSlots(items); }, 500);
        }

        function packPuzzleSlots(items) {
          let totalSlots = 0;
          const targetMaxPhotos = 12;
          const targetMaxSlots = 12;
          let bestCutoff = Math.min(items.length, 8);

          for (let i = 0; i < items.length; i++) {
            if (i >= targetMaxPhotos) break;
            const slotCost = items[i].classList.contains('is-landscape') ? 2 : 1;
            if (totalSlots + slotCost > targetMaxSlots) break;
            totalSlots += slotCost;
            if (totalSlots % 4 === 0) {
              bestCutoff = i + 1;
            }
          }

          items.forEach((item, idx) => {
            item.style.display = idx < bestCutoff ? 'block' : 'none';
          });
        }
        document.addEventListener('DOMContentLoaded', initSmartPuzzleGallery);

        // Touch swipe support for mobile lightbox
        (function() {
          let touchStartX = 0;
          let touchStartY = 0;
          document.addEventListener('touchstart', function(e) {
            const zoom = document.getElementById('luxZoomModal');
            if (zoom && zoom.classList.contains('open')) {
              touchStartX = e.changedTouches[0].screenX;
              touchStartY = e.changedTouches[0].screenY;
            }
          }, { passive: true });

          document.addEventListener('touchend', function(e) {
            const zoom = document.getElementById('luxZoomModal');
            if (zoom && zoom.classList.contains('open')) {
              const diffX = e.changedTouches[0].screenX - touchStartX;
              const diffY = e.changedTouches[0].screenY - touchStartY;
              if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) window.luxNextZoom();
                else window.luxPrevZoom();
              } else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
                window.luxCloseZoom();
              }
            }
          }, { passive: true });
        })();
      </script>
    `;
  }

  // 6. Section: QR Check-In / Kartu Akses Masuk
  // Isi QR: LUX|<id undangan>|<nama tamu>. Tanpa ?to= (tautan umum) namanya "Tamu Undangan"; skrip runtime menggantinya.
  const qrMark = qrInitials(inv);
  const qrDefaultSrc = escapeHtml(buildCheckinQrUrl(inv.id, "Tamu Undangan", qrMark));
  const qrAccessSectionHtml = showQrCheckin ? `
    <section class="sec-flow" id="checkin">
      <span class="sec-eyebrow">QR CODE CHECK-IN</span>
      <h2 class="sec-main-title serif">KARTU AKSES MASUK</h2>
      <p class="sec-sub">Silakan tunjukkan QR Code ini kepada penerima tamu undangan di lokasi acara.</p>
      
      <div class="access-pass-card">
        <span class="pass-tagline">${escapeHtml(featureSettings.weddingTagline || "THE WEDDING OF")}</span>
        <h3 class="pass-names serif">${escapeHtml(firstName)} <em>&amp;</em> ${escapeHtml(secondName)}</h3>
        <p class="pass-date">${weddingDate}</p>
        
        <div class="pass-qr-wrapper">
          <img class="pass-qr-img" id="passQrImg" src="${qrDefaultSrc}" alt="QR Check-In" style="width:160px; height:160px; display:block; margin:0 auto;">
        </div>

        <div class="pass-guest-box">
          <span class="pass-guest-lbl">KEPADA YTH.</span>
          <h4 class="pass-guest-name serif" id="passGuestName">Tamu Undangan</h4>
        </div>


        <div class="pass-souvenir-bar">
          <span class="souvenir-lbl">VOUCHER SOUVENIR:</span>
          <span class="souvenir-code">SOUVENIR-${inv.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>
    </section>
  ` : "";

  // 6.5. Section: Universal Audio Player
  let fallbackMusicUrl = "";
  if (!inv.musicUrl && !featureSettings.musicUrl && featureSettings.showMusic !== false) {
    // Prioritas: DB theme.defaultMusicUrl → blueprint.defaultMusicUrl → musicPreset aktif
    if (dbThemeDefaultMusic) {
      fallbackMusicUrl = dbThemeDefaultMusic;
    } else if (blueprint.defaultMusicUrl) {
      fallbackMusicUrl = blueprint.defaultMusicUrl;
    } else {
      try {
        const activePreset = await prisma.musicPreset.findFirst({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        });
        if (activePreset?.url) fallbackMusicUrl = activePreset.url;
      } catch (e) {
        console.warn("[themeEngine] Gagal memuat fallback musik preset dari database:", e);
      }
    }
  }

  const finalAudioUrl = featureSettings.showMusic !== false
    ? (safeExternalUrl(inv.musicUrl || featureSettings.musicUrl) || fallbackMusicUrl)
    : "";
  const isOgg = finalAudioUrl.toLowerCase().endsWith(".ogg");
  const musicPlayerHtml = `
    ${finalAudioUrl ? `
    <!-- UNIVERSAL MUSIC PLAYER INJECTED BY THEME ENGINE -->
    <audio id="luxAudioPlayer" loop preload="none">
      <source src="${escapeHtml(finalAudioUrl)}" type="${isOgg ? "audio/ogg" : "audio/mpeg"}" />
    </audio>
    ` : ""}
    <script>
      // 1. Universal Audio Player & Backward-Compatible Aliases
      (function() {
        var a = document.getElementById('luxAudioPlayer');
        if (a) {
          window.bgAudio = a;
          window.weddingAudio = a;
        }
      })();

      function luxToggleAudio() {
        if (typeof window.luxToggleAudio === 'function' && window.luxToggleAudio !== luxToggleAudio) {
          return window.luxToggleAudio();
        }
        const audio = document.getElementById('luxAudioPlayer') || document.getElementById('bgAudio') || document.getElementById('weddingAudio') || document.querySelector('audio');
        if (!audio) return;
        const fab = document.getElementById('musicFab') || document.getElementById('musicToggle') || document.querySelector('.audio-fab, .music-fab, .btn-music, .btn-audio-fab, #music-control');
        if (audio.paused) {
          audio.play().then(() => {
            if (fab) fab.classList.add('playing');
          }).catch(e => console.log('Audio play failed:', e));
        } else {
          audio.pause();
          if (fab) fab.classList.remove('playing');
        }
      }

      // 2. Universal Countdown Timer
      (function luxInitCountdown() {
        const targetStr = ${jsonForInlineScript(targetDate)};
        if (!targetStr) return;
        const target = new Date(targetStr).getTime();
        if (isNaN(target)) return;
        
        function updateCd() {
          const now = new Date().getTime();
          const diff = target - now;
          if (diff <= 0) return;
          
          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          
          const cdD = document.getElementById('cdDays');
          const cdH = document.getElementById('cdHours');
          const cdM = document.getElementById('cdMins');
          const cdS = document.getElementById('cdSecs');
          if (cdD) cdD.textContent = d < 10 ? '0' + d : d.toString();
          if (cdH) cdH.textContent = h < 10 ? '0' + h : h.toString();
          if (cdM) cdM.textContent = m < 10 ? '0' + m : m.toString();
          if (cdS) cdS.textContent = s < 10 ? '0' + s : s.toString();
        }
        updateCd();
        setInterval(updateCd, 1000);
      })();

      // 3. Universal RSVP Handler
      function luxSubmitRsvp(e) {
        e.preventDefault();
        var btn = document.getElementById('btnSubmit') || e.target.querySelector('button[type="submit"]');
        var nameInput = document.getElementById('rsvpName');
        var statusSelect = document.getElementById('rsvpStatus');
        var countInput = document.getElementById('rsvpCount');
        var messageInput = document.getElementById('rsvpMessage');
        var statusBox = document.getElementById('luxRsvpStatusBox');
        var wishesList = document.getElementById('wishesList') || document.getElementById('wishesFeed');

        var name = nameInput ? nameInput.value.trim() : '';
        var status = statusSelect ? statusSelect.value : 'hadir';
        var count = countInput ? (parseInt(countInput.value, 10) || 1) : 1;
        var message = messageInput ? messageInput.value.trim() : '';

        if (!name) return;

        if (btn) {
          btn.disabled = true;
          btn.textContent = ${jsonForInlineScript(dict.rsvpBtnSending)};
        }

        var invId = window.__LUX_INVITATION_ID__ || '${invitationId}';

        fetch('/api/public/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invitationId: invId,
            guestName: name,
            status: status,
            guestCount: count,
            message: message
          })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (statusBox) {
            statusBox.style.cssText = 'display:block; margin-top:1rem; padding:0.8rem 1rem; border-radius:8px; font-size:0.82rem; text-align:center; background:rgba(74,222,128,0.15); border:1px solid rgba(74,222,128,0.3); color:#4ade80; font-weight:600;';
            statusBox.textContent = ${jsonForInlineScript(dict.rsvpSentSuccess)};
          }

          if (wishesList) {
            var emptyPlaceholder = wishesList.querySelector('p');
            if (emptyPlaceholder && (emptyPlaceholder.textContent.includes('Jadilah yang pertama') || emptyPlaceholder.textContent.includes('first to send'))) {
              emptyPlaceholder.remove();
            }

            var newCard = document.createElement('div');
            newCard.className = 'wish-item';
            var isHadir = status === 'hadir';
            var badgeText = isHadir ? (${jsonForInlineScript(dict.attending)} + ' (' + count + ' ' + ${jsonForInlineScript(dict.paxUnit)} + ')') : ${jsonForInlineScript(dict.declined)};
            var badgeBg = isHadir ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)';
            var badgeColor = isHadir ? '#4ade80' : '#f87171';

            var safeName = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            var safeMsg = message ? message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

            newCard.innerHTML = 
              '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">' +
                '<span class="wish-name">' + safeName + '</span>' +
                '<span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:' + badgeBg + '; color:' + badgeColor + '; font-weight:600;">' + badgeText + '</span>' +
              '</div>' +
              (safeMsg ? '<p class="wish-msg">“' + safeMsg + '”</p>' : '');

            wishesList.insertBefore(newCard, wishesList.firstChild);
            wishesList.scrollTo({ top: 0, behavior: 'smooth' });
          }

          e.target.reset();
        })
        .catch(function(err) {
          if (statusBox) {
            statusBox.style.cssText = 'display:block; margin-top:1rem; padding:0.8rem 1rem; border-radius:8px; font-size:0.82rem; text-align:center; background:rgba(248,113,113,0.15); border:1px solid rgba(248,113,113,0.3); color:#f87171;';
            statusBox.textContent = ${jsonForInlineScript(dict.rsvpSendError)};
          }
        })
        .finally(function() {
          if (btn) {
            btn.disabled = false;
            btn.textContent = ${jsonForInlineScript(dict.rsvpWeddingBtn)};
          }
        });
      }

      // 4. Auto-Fetch Real-Time Dynamic Wishes Feed (Decoupled Edge Cache)
      (function() {
        var invId = window.__LUX_INVITATION_ID__ || '${invitationId}';
        if (!invId || invId.startsWith('{{')) return;
        fetch('/api/public/rsvp?invitationId=' + encodeURIComponent(invId))
          .then(function(res) { return res.json(); })
          .then(function(data) {
            if (data && data.success && Array.isArray(data.rsvps) && data.rsvps.length > 0) {
              var wishesList = document.getElementById('wishesList') || document.getElementById('wishesFeed');
              if (!wishesList) return;
              wishesList.innerHTML = data.rsvps.map(function(r) {
                var isHadir = String(r.status).toLowerCase() === 'hadir';
                var badgeText = isHadir ? (${jsonForInlineScript(dict.attending)} + ' (' + (r.guestCount || 1) + ' ' + ${jsonForInlineScript(dict.paxUnit)} + ')') : ${jsonForInlineScript(dict.declined)};
                var badgeBg = isHadir ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)';
                var badgeColor = isHadir ? '#4ade80' : '#f87171';
                var safeName = String(r.guestName || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                var safeMsg = r.message ? String(r.message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
                var safeReply = r.replyMessage ? String(r.replyMessage).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
                var replyHtml = safeReply
                  ? '<div class="wish-reply" style="margin-top:0.5rem; padding:0.45rem 0.7rem; border-left:2px solid var(--primary); background:color-mix(in srgb, var(--primary) 10%, transparent); border-radius:0 8px 8px 0;"><span style="display:block; font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--primary); margin-bottom:2px;">' + ${jsonForInlineScript(dict.replyBadge)} + '</span><p style="margin:0; font-size:0.78rem; color:var(--card-text, var(--text-main)); line-height:1.45;">' + safeReply + '</p></div>'
                  : '';
                return '<div class="wish-item" style="margin-bottom: 0.75rem;">' +
                  '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">' +
                    '<span class="wish-name">' + safeName + '</span>' +
                    '<span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:' + badgeBg + '; color:' + badgeColor + '; font-weight:600;">' + badgeText + '</span>' +
                  '</div>' +
                  (safeMsg ? '<p class="wish-msg">“' + safeMsg + '”</p>' : '') +
                  replyHtml +
                '</div>';
              }).join('');
            }
          })
          .catch(function() {});
      })();
    </script>
  `;

  // 7. Section: Dress Code
  const dressCodeColors = featureSettings.dressCodeColors || "";
  const dressCodeNote = featureSettings.dressCodeNote || "";
  let dressCodeHtml = "";
  if (showDresscode && (dressCodeColors || dressCodeNote)) {
    const colorBadges = dressCodeColors
      ? String(dressCodeColors).split(",").map((c: string) => `<span style="width:28px; height:28px; border-radius:50%; background:${escapeHtml(safeCssColor(c))}; display:inline-block; border:2px solid rgba(255,255,255,0.7); box-shadow:0 4px 10px rgba(0,0,0,0.35);"></span>`).join("")
      : "";

    dressCodeHtml = `
      <section class="sec-flow" id="dresscode">
        <span class="sec-eyebrow" data-lux-field="customLabels.dressCodeEyebrow">${escapeHtml(dressCodeEyebrow)}</span>
        <h2 class="sec-main-title serif" data-lux-field="customLabels.dressCodeTitle">${escapeHtml(dressCodeTitle)}</h2>
        <p class="sec-sub" data-lux-field="customLabels.dressCodeSubtitle">${escapeHtml(dressCodeSubtitle)}</p>
        ${colorBadges ? `<div style="display:flex; justify-content:center; gap:12px; margin: 1.5rem 0;">${colorBadges}</div>` : ""}
        ${dressCodeNote ? `<p style="margin:0; font-size:0.8rem; color:var(--dresscode-note, rgba(255,255,255,0.75)); line-height:1.5;">${escapeHtml(dressCodeNote)}</p>` : ""}
      </section>
    `;
  }

  // 8. Section: Live Streaming (Live Wedding)
  const liveStreamYoutubeUrl = safeHref(featureSettings.liveStreamYoutubeUrl || inv.liveStreamUrl);
  const liveStreamInstagramUrl = safeHref(featureSettings.liveStreamInstagramUrl);
  const liveStreamZoomUrl = safeHref(featureSettings.liveStreamZoomUrl);
  let liveStreamingHtml = "";
  if (showLiveStream && (liveStreamYoutubeUrl || liveStreamInstagramUrl || liveStreamZoomUrl)) {
    const liveTimeStr = rawEventsList[0]?.time ? ` • ${escapeHtml(rawEventsList[0].time)}` : "";
    liveStreamingHtml = `
      <section class="sec-flow" id="live">
        <span class="sec-eyebrow" data-lux-field="customLabels.streamingEyebrow">${escapeHtml(streamingEyebrow)}</span>
        <h2 class="sec-main-title serif" data-lux-field="customLabels.streamingTitle">${escapeHtml(streamingTitle)}</h2>
        <p class="sec-sub">${weddingDate}${liveTimeStr}</p>
        <p class="sec-sub" style="margin-top:0.4rem;" data-lux-field="customLabels.streamingSubtitle">${escapeHtml(streamingSubtitle)}</p>
        <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:0.8rem; margin-top:1.5rem;">
          ${liveStreamYoutubeUrl ? `<a href="${liveStreamYoutubeUrl}" target="_blank" rel="noopener noreferrer" class="btn-map-outline">YOUTUBE LIVE</a>` : ""}
          ${liveStreamInstagramUrl ? `<a href="${liveStreamInstagramUrl}" target="_blank" rel="noopener noreferrer" class="btn-map-outline">INSTAGRAM LIVE</a>` : ""}
          ${liveStreamZoomUrl ? `<a href="${liveStreamZoomUrl}" target="_blank" rel="noopener noreferrer" class="btn-map-outline">ZOOM MEETING</a>` : ""}
        </div>
      </section>
    `;
  }

  // 9. Section: Wedding Frame / Instagram Filter
  const instagramFilterUrl = safeHref(featureSettings.instagramFilterUrl);
  let weddingFilterHtml = "";
  if (showFilter && instagramFilterUrl) {
    weddingFilterHtml = `
      <section class="sec-flow" id="frame">
        <span class="sec-eyebrow">CAPTURE YOUR MOMENT</span>
        <h2 class="sec-main-title serif">WEDDING FRAME</h2>
        <p class="sec-sub">Unggah dan abadikan momen Anda saat menghadiri pernikahan kami menggunakan Wedding Frame resmi kami di Instagram.</p>
        <a href="${instagramFilterUrl}" target="_blank" rel="noopener noreferrer" class="btn-outline-box" style="margin-top:1.8rem;">BUKA FILTER INSTAGRAM</a>
      </section>
    `;
  }

  // 10. Section: Turut Mengundang
  const turutMengundangList = featureSettings.turutMengundang || "";
  let turutMengundangHtml = "";
  if (showTurutMengundang && turutMengundangList && turutMengundangList.trim() !== "") {
    const lines = turutMengundangList.split("\n").filter((l: string) => l.trim() !== "");
    turutMengundangHtml = `
      <section class="sec-flow" id="turut-mengundang">
        <span class="sec-eyebrow" data-lux-field="customLabels.turutMengundangEyebrow">${escapeHtml(turutMengundangEyebrow)}</span>
        <h2 class="sec-main-title serif" data-lux-field="customLabels.turutMengundangTitle">${escapeHtml(turutMengundangTitle)}</h2>
        <p class="sec-sub" data-lux-field="customLabels.turutMengundangSubtitle">${escapeHtml(turutMengundangSubtitle)}</p>
        <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:1.5rem; font-size:0.88rem; color:rgba(255,255,255,0.85);">
          ${lines.map((line: string) => `<p style="margin:0; padding:0.4rem 0; border-bottom:1px dashed rgba(255,255,255,0.12);">${escapeHtml(line.trim())}</p>`).join("")}
        </div>
      </section>
    `;
  }

  // 11. Section: Bank Accounts & Gift Section
  let giftSectionHtml = "";
  let giftCardsHtml = "";
  const giftRegistryItems = parseGiftRegistryFromSettings(featureSettings);
  const giftRegistryHtml = showGift
    ? buildGiftRegistryHtml({
        items: giftRegistryItems,
        claims: Array.isArray(inv.giftClaims) ? inv.giftClaims : [],
        invitationId,
        locale,
      })
    : "";
  const qrisImageUrl = safeHref(featureSettings.qrisImageUrl);
  if (showGift) {
    const hasExplicitBanks = Array.isArray(bankAccounts) && bankAccounts.length > 0;
    const hasQris = Boolean(qrisImageUrl);
    const hasAddress = Boolean(inv.shippingAddress && String(inv.shippingAddress).trim() !== "");

    // Tidak ada rekening cadangan: undangan asli tidak boleh menampilkan nomor rekening yang bukan milik mempelai.
    const rawBanks = hasExplicitBanks ? bankAccounts : [];

    const bankCardsHtml = rawBanks.map((b: any, idx: number) => `
      <div class="bank-card">
        <span class="bank-label" data-lux-field="bankAccounts.${idx}.bank">${escapeHtml(b.bank || "Rekening Bank")}</span>
        <span class="bank-owner" data-lux-field="bankAccounts.${idx}.name">a.n ${escapeHtml(b.name || (isGroomFirst ? groomName : brideName))}</span>
        <div class="bank-row">
          <span class="bank-number" data-lux-field="bankAccounts.${idx}.number">${escapeHtml(b.number)}</span>
          <button class="btn-copy" data-copy="${escapeHtml(b.number)}" onclick="copyText(this.dataset.copy)">${escapeHtml(locale === "en" ? "Copy" : "Salin")}</button>
        </div>
      </div>
    `).join("");

    const hasDigitalGift = rawBanks.length > 0 || hasQris;
    const hasPhysicalSection = hasAddress || Boolean(giftRegistryHtml);
    const showBothTabs = hasDigitalGift && hasPhysicalSection;

    // Tabs hanya ditampilkan jika kedua metode (digital & kado fisik/wishlist) sama-sama tersedia
    const tabsHtml = showBothTabs ? `
      <div class="gift-tabs">
        <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">${escapeHtml(locale === "en" ? "Bank / QRIS Transfer" : "Transfer Bank / QRIS")}</button>
        <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">${escapeHtml(locale === "en" ? "Send Gift / Wishlist" : "Kirim Kado")}</button>
      </div>
    ` : "";

    const amplopHtml = hasDigitalGift ? `
      <div id="giftTabAmplop">
        ${bankCardsHtml}
        ${hasQris ? `
          <div class="bank-card" style="text-align:center;">
            <span class="bank-label" style="margin-bottom:0.6rem;">Scan QRIS</span>
            <img src="${qrisImageUrl}" alt="QRIS" style="width:160px; height:160px; object-fit:contain; margin:0 auto; background:#fff; padding:6px; border-radius:8px;">
          </div>
        ` : ""}
      </div>
    ` : "";

    const kadoHtml = hasPhysicalSection ? `
      <div id="giftTabKado" style="${showBothTabs ? 'display:none;' : 'display:block;'}">
        ${hasAddress ? `
        <div class="bank-card">
          <span class="bank-label">${escapeHtml(locale === "en" ? "Gift Shipping Address" : "Alamat Pengiriman Kado")}</span>
          <p style="font-size:0.8rem; color:rgba(255,255,255,0.7); line-height:1.5; margin:0.4rem 0 0.8rem;">
            ${nl2br(String(inv.shippingAddress).trim())}
          </p>
          <button class="btn-copy" data-copy="${escapeHtml(String(inv.shippingAddress).trim())}" onclick="copyText(this.dataset.copy)">${escapeHtml(locale === "en" ? "Copy Address" : "Salin Alamat")}</button>
        </div>` : ""}
        ${giftRegistryHtml}
      </div>
    ` : "";

    giftCardsHtml = `
      ${tabsHtml}
      ${amplopHtml}
      ${kadoHtml}
    `;

    // Tanpa rekening, QRIS, alamat, maupun daftar kado, seksi hadiah tidak dirender (bukan judul tanpa isi).
    giftSectionHtml = !hasDigitalGift && !hasPhysicalSection ? "" : `
      <section class="sec-flow gift-variant-${giftVariant}" id="gift" data-gift-variant="${giftVariant}">
        <span class="sec-eyebrow" data-lux-field="customLabels.giftEyebrow">${escapeHtml(giftSectionEyebrow)}</span>
        <h2 class="sec-main-title serif" data-lux-field="customLabels.giftTitle">${escapeHtml(giftSectionTitle)}</h2>
        <p class="sec-sub" data-lux-field="customLabels.giftDesc">
          ${escapeHtml(giftSectionDesc)}
        </p>

        ${tabsHtml}
        ${amplopHtml}
        ${kadoHtml}
      </section>
    `;
  }

  // 12. Section: RSVP & Wishes Feed
  const wishesHtml = renderWeddingWishCardsHtml(inv.rsvps || [], locale);


  // 13. QR Access Card HTML for Modal
  const qrAccessCardHtml = `
    <div style="text-align:center; padding:1rem 0;">
      <span style="font-size:0.65rem; letter-spacing:0.3em; text-transform:uppercase; color:rgba(255,255,255,0.6); display:block; margin-bottom:0.4rem; font-weight:600;">Check-In Ticket</span>
      <h3 style="font-size:1.4rem; color:#fff; font-family:'Cormorant Garamond',serif; margin-bottom:0.2rem;" id="modalGuestName">Tamu Undangan</h3>
      <p style="font-size:0.75rem; color:rgba(255,255,255,0.65); margin-bottom:1.2rem;">Tunjukkan kode QR ini kepada penerima tamu di lokasi acara.</p>
      <div style="background:#ffffff; padding:14px; display:inline-block; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <img class="pass-qr-img" id="modalQrImg" src="${qrDefaultSrc}" alt="QR Check-In" style="width:160px; height:160px; display:block; margin:0 auto;">
      </div>
    </div>
  `;

  // Google Calendar URL (Prioritaskan lokasi dari Acara Utama)
  const calendarLocation = primaryEvent?.location || primaryEvent?.address || events[0]?.location || events[0]?.address || "";
  const calTitle = buildCalendarTitle("WEDDING", { groomName: firstName, brideName: secondName });
  const googleCalendarUrl = buildGoogleCalendarUrl(primaryEvent ?? {}, calTitle, calendarLocation);

  // ─── Guest Memories (After-Event Moments Drop & Stream) ───
  const showGuestMemories = featureSettings.showGuestMemories !== false && await hasPlanCapability(inv.order?.planType, "guest_memories");
  const memoriesSectionEyebrow = customLabels.memoriesEyebrow || "AFTER-EVENT MEMORIES";
  const memoriesSectionTitle = customLabels.memoriesTitle || "Abadikan Momen Indah";
  const memoriesSectionSubtitle = customLabels.memoriesSubtitle || "Buka kamera dan jepret momen candid seru Anda selama menghadiri pernikahan kami langsung ke album kenangan bersama:";

  // Undangan virtual demo membawa momen contoh sendiri; undangan nyata membacanya dari DB.
  const guestMemories = Array.isArray(inv.guestMemories)
    ? inv.guestMemories
    : await prisma.guestMemory.findMany({ where: { invitationId }, orderBy: { createdAt: "desc" }, take: 40 });

  let memoriesSectionHtml = "";
  if (showGuestMemories) {
    // 10 Random samples from full memory pool
    const shuffledMemories = [...guestMemories].sort(() => 0.5 - Math.random()).slice(0, 10);
    const totalMemCount = shuffledMemories.length;
    const isMarquee = totalMemCount > 5;

    const storyAvatarsHtml = shuffledMemories.map((sm: any) => `
      <div class="lux-story-circle-item" style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; width: 68px; cursor: pointer;" data-url="${safeHref(sm.mediaUrl)}" data-name="${escapeHtml(sm.senderName)}" data-msg="${escapeHtml(sm.message || "")}" onclick="luxOpenMemoryPreview(this.dataset.url, this.dataset.name, this.dataset.msg, this.dataset.type)">
        <div style="width: 58px; height: 58px; border-radius: 9999px; padding: 2px; background: linear-gradient(135deg, #d4af37, #f59e0b, #eab308); box-shadow: 0 0 10px rgba(212,175,55,0.35);">
          <div style="width: 100%; height: 100%; border-radius: 9999px; overflow: hidden; background: #1c1917; border: 2px solid #0c0a09; display: flex; align-items: center; justify-content: center;">
            <img src="${safeHref(sm.thumbnailUrl || sm.mediaUrl)}" alt="${escapeHtml(sm.senderName)}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        </div>
        <span style="font-size: 11px; max-width: 65px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; opacity: 0.85; color: inherit; text-align: center;">
          ${escapeHtml((sm.senderName || "Tamu").split(" ")[0])}
        </span>
      </div>
    `).join("");

    let shareMomentUrl = "/sharemoment";
    if (inv.subdomain && inv.subdomain !== "demo") {
      shareMomentUrl = `/s/${inv.subdomain}/sharemoment`;
    } else if (inv.invitationSlug) {
      shareMomentUrl = `/${inv.invitationSlug}/sharemoment`;
    } else {
      shareMomentUrl = `/demo/sharemoment?theme=${themeFolder}`;
    }

    const fullGalleryUrl = inv.subdomain && inv.subdomain !== "demo"
      ? `/s/${inv.subdomain}/memories`
      : (inv.invitationSlug ? `/${inv.invitationSlug}/memories` : `/demo/memories?theme=${themeFolder}`);

    memoriesSectionHtml = `
      <section class="sec-flow slide-section" id="section-memories" data-section-alias="guest-memories" style="position: relative; padding: 3rem 1rem;">
        <a id="guest-memories" style="display:none;"></a>
        <div class="sec-content-box reveal-on-scroll" style="max-width: 580px; margin: 0 auto; text-align: center;">
          <span class="sec-eyebrow" data-lux-field="customLabels.memoriesEyebrow">${escapeHtml(memoriesSectionEyebrow)}</span>
          <h2 class="sec-main-title serif" data-lux-field="customLabels.memoriesTitle">${escapeHtml(memoriesSectionTitle)}</h2>
          <p class="moment-quote serif" data-lux-field="customLabels.memoriesSubtitle" style="max-width: 480px; margin: 0 auto 1.5rem auto; font-size: 0.82rem; line-height: 1.6; opacity: 0.8;">
            ${escapeHtml(memoriesSectionSubtitle)}
          </p>

          <!-- 1. TOMBOL BUKA KAMERA KENANGAN -->
          <a href="${shareMomentUrl}" style="display: block; width: 100%; max-width: 360px; margin: 0 auto 1.8rem auto; padding: 14px 20px; border-radius: 50px; background: #ffffff; color: #000000; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.05em; text-align: center; text-decoration: none; box-shadow: 0 4px 15px rgba(255,255,255,0.18); transition: transform 0.15s ease;">
            BUKA KAMERA KENANGAN
          </a>

          <!-- 2. HIGHLIGHT LINGKARAN (5 LINGKARAN DI LAYAR, LOOPING MARQUEE JIKA > 5) -->
          ${shuffledMemories.length > 0 ? `
            <div class="memories-highlights-wrapper" style="width: 100%; max-width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 14px 10px; margin-bottom: 1.5rem; overflow: hidden;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 10px; font-weight: 700; opacity: 0.85; padding: 0 6px;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 7px; height: 7px; border-radius: 99px; background: #10b981; display: inline-block;"></span>
                  FOTO DARI PARA TAMU
                </span>
                <span style="font-size: 9px; opacity: 0.5; font-family: monospace;">Acak (${totalMemCount} Foto)</span>
              </div>

              <!-- Story Circles Track -->
              <div class="story-circles-track-wrapper" style="overflow: hidden; width: 100%; position: relative; mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);">
                <div class="story-circles-track" style="display: flex; gap: 14px; width: max-content; margin: 0 auto; ${isMarquee ? 'animation: luxStoryLoop 24s linear infinite;' : 'justify-content: center;'}">
                  ${storyAvatarsHtml}
                  ${isMarquee ? storyAvatarsHtml : ''}
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 3. TOMBOL DIRECT KE HALAMAN GALERI WEB -->
          <div style="text-align: center;">
            <a href="${fullGalleryUrl}" class="btn-outline-box btn-memories-gallery" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 28px; font-size: 12px; font-weight: 700; border-radius: 50px; text-decoration: none; border: 1px solid currentColor; letter-spacing: 0.08em; transition: all 0.25s ease;">
              <span>BUKA GALERI MOMEN LENGKAP</span>
              <span style="font-size: 14px; margin-top: -2px;">&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      <style>
        @keyframes luxStoryLoop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .story-circles-track:hover {
          animation-play-state: paused !important;
        }
        .btn-memories-gallery {
          color: inherit;
        }
        .btn-memories-gallery:hover {
          background: #ffffff !important;
          color: #070709 !important;
          border-color: #ffffff !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.25);
        }
      </style>



      <!-- LIGHTBOX PREVIEW POP-UP FOR MEMORIES -->
      <div id="luxMemoryPreviewModal" onclick="luxCloseMemoryPreview(event)" style="display: none; position: fixed; inset: 0; z-index: 999999; background: rgba(0,0,0,0.92); backdrop-filter: blur(10px); align-items: center; justify-content: center; flex-direction: column; padding: 16px;">
        <button type="button" onclick="luxCloseMemoryPreview()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #fff; font-size: 28px; font-weight: bold; cursor: pointer; padding: 6px;">✕</button>
        <div id="luxMemoryPreviewContent" onclick="event.stopPropagation()" style="max-width: 90vw; max-height: 75vh; display: flex; align-items: center; justify-content: center;"></div>
        <div id="luxMemoryPreviewCaption" style="margin-top: 14px; text-align: center; color: #fff; max-width: 480px;"></div>
      </div>

      <!-- LUXURY MEMORY UPLOAD MODAL (BOTTOM-SHEET DRAWER) -->
      <div class="gallery-modal-backdrop" id="luxMemoryModal" onclick="luxCloseMemoryModal(event)" style="display: none; position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); align-items: flex-end; justify-content: center; opacity: 0; transition: opacity 0.25s ease;">
        <div class="gallery-modal-container" onclick="event.stopPropagation()" style="background: #1c1917; color: #fff; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; border-radius: 24px 24px 0 0; padding: 24px; box-shadow: 0 -10px 40px rgba(0,0,0,0.5); transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px;">
            <h3 class="serif" style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.05em; color: #f5f5f4;">BAGIKAN MOMEN ANDA</h3>
            <button type="button" onclick="luxCloseMemoryModal()" style="background: none; border: none; color: #a8a29e; font-size: 20px; cursor: pointer; padding: 4px;">✕</button>
          </div>

          <form id="luxMemoryForm" onsubmit="luxSubmitMemory(event)" style="display: flex; flex-direction: column; gap: 14px;">
            <input type="hidden" name="invitationId" value="${invitationId}">

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #d6d3d1;">Nama Anda *</label>
              <input type="text" id="luxMemSenderName" name="senderName" required placeholder="Contoh: Budi Santoso & Istri" style="width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #fff; font-size: 16px; box-sizing: border-box; outline: none;">
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #d6d3d1;">Email Anda * <span style="font-weight: 400; opacity: 0.7; font-size: 11px;">(Untuk verifikasi pengirim)</span></label>
              <input type="email" id="luxMemSenderEmail" name="senderEmail" required placeholder="contoh: budi@gmail.com" style="width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #fff; font-size: 16px; box-sizing: border-box; outline: none;">
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #d6d3d1;">Pilih Foto Kenangan *</label>
              <input type="file" id="luxMemFileInput" accept="image/*" required onchange="luxHandleFileSelect(event)" style="display: none;">
              
              <div onclick="document.getElementById('luxMemFileInput').click()" style="border: 2px dashed rgba(255,255,255,0.25); border-radius: 14px; padding: 20px 14px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.03); transition: all 0.2s;">
                <div style="display:flex; justify-content:center; margin-bottom: 6px;">
                  <svg style="width:28px; height:28px; color:#d4a373;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #f5f5f4;">Klik untuk Memilih Foto Kenangan</div>
                <div style="font-size: 11px; opacity: 0.6; margin-top: 2px;">Format JPG/PNG/WebP • Maksimal 15 MB</div>
              </div>

              <!-- Preview Box -->
              <div id="luxMemPreviewBox" style="display: none; margin-top: 10px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.08); align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                  <img id="luxMemPreviewImg" src="" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; display: none;">
                  <span id="luxMemFileName" style="font-size: 12px; font-weight: 600; color: #e7e5e4; word-break: break-all;"></span>
                </div>
                <button type="button" onclick="luxClearFileSelect()" style="background: none; border: none; color: #f87171; font-size: 12px; font-weight: bold; cursor: pointer;">Hapus</button>
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #d6d3d1;">Pesan / Catatan Singkat <span style="font-weight: 400; opacity: 0.7; font-size: 11px;">(Opsional)</span></label>
              <textarea id="luxMemMessage" name="message" rows="2" placeholder="Ceritakan momen seru ini..." style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #fff; font-size: 16px; box-sizing: border-box; resize: none; outline: none;"></textarea>
            </div>

            <!-- Feedback & Progress -->
            <div id="luxMemProgressBox" style="display: none; margin-top: 6px;">
              <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #d4a373;" id="luxMemProgressText">Mengoptimasi & Mengunggah...</div>
              <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.15); border-radius: 999px; overflow: hidden;">
                <div id="luxMemProgressBar" style="width: 30%; height: 100%; background: #d4a373; transition: width 0.3s ease;"></div>
              </div>
            </div>

            <div id="luxMemErrorBox" style="display: none; padding: 12px 14px; border-radius: 12px; background: rgba(244,63,94,0.15); border: 1px solid rgba(244,63,94,0.35); color: #fecdd3; font-size: 13px; font-weight: 500; text-align: left; line-height: 1.4;"></div>

            <div id="luxMemSuccessBox" style="display: none; padding: 14px; border-radius: 12px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; font-size: 13px; font-weight: 600; text-align: center;">
              ✓ Foto kenangan Anda berhasil disimpan ke album pengantin!
            </div>

            <button type="submit" id="luxMemSubmitBtn" style="margin-top: 10px; width: 100%; padding: 14px; border-radius: 14px; border: none; background: #d4a373; color: #1c1917; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s;">
              KIRIM KE ALBUM PENGANTIN
            </button>
          </form>
        </div>
      </div>

      <script>
        window.luxSelectedMemoryFile = null;

        function ensureMemoryModalOnBody() {
          const m = document.getElementById('luxMemoryModal');
          if (m && m.parentNode !== document.body) document.body.appendChild(m);
        }
        document.addEventListener('DOMContentLoaded', ensureMemoryModalOnBody);

        window.luxOpenMemoryModal = function() {
          ensureMemoryModalOnBody();
          const modal = document.getElementById('luxMemoryModal');
          if (!modal) return;
          modal.style.display = 'flex';
          setTimeout(() => {
            modal.style.opacity = '1';
            const box = modal.querySelector('.gallery-modal-container');
            if (box) box.style.transform = 'translateY(0)';
          }, 10);

          const urlParams = new URLSearchParams(window.location.search);
          const toName = urlParams.get('to');
          const nameInput = document.getElementById('luxMemSenderName');
          if (toName && nameInput && !nameInput.value) {
            nameInput.value = decodeURIComponent(toName);
          }
        };

        window.luxCloseMemoryModal = function(e) {
          const modal = document.getElementById('luxMemoryModal');
          if (!modal) return;
          const errorBox = document.getElementById('luxMemErrorBox');
          if (errorBox) {
            errorBox.textContent = '';
            errorBox.style.display = 'none';
          }
          const box = modal.querySelector('.gallery-modal-container');
          if (box) box.style.transform = 'translateY(100%)';
          modal.style.opacity = '0';
          setTimeout(() => {
            modal.style.display = 'none';
          }, 300);
        };

        async function compressImageInBrowser(file) {
          return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
              resolve(file);
              return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 1920;
                if (width > maxDim || height > maxDim) {
                  if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                  } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                  if (blob && blob.size < file.size) {
                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: "image/webp" }));
                  } else {
                    resolve(file);
                  }
                }, 'image/webp', 0.85);
              };
              img.src = e.target.result;
            };
            reader.readAsDataURL(file);
          });
        }

        window.luxHandleFileSelect = async function(e) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          const errorBox = document.getElementById('luxMemErrorBox');
          if (file.size > 15 * 1024 * 1024) {
            if (errorBox) {
              errorBox.textContent = 'Ukuran foto (' + (file.size / (1024 * 1024)).toFixed(1) + ' MB) melebihi batas maksimal 15 MB. Silakan pilih foto dengan resolusi lebih ringkas.';
              errorBox.style.display = 'block';
            }
            e.target.value = '';
            return;
          }
          if (errorBox) errorBox.style.display = 'none';

          window.luxSelectedMemoryFile = file;
          const previewBox = document.getElementById('luxMemPreviewBox');
          const previewImg = document.getElementById('luxMemPreviewImg');
          const fileName = document.getElementById('luxMemFileName');

          if (previewBox && fileName) {
            fileName.textContent = file.name + " (" + (file.size / (1024 * 1024)).toFixed(1) + " MB)";
            previewBox.style.display = 'flex';
            if (previewImg) {
              previewImg.src = URL.createObjectURL(file);
              previewImg.style.display = 'block';
            }
          }
        };

        window.luxClearFileSelect = function() {
          window.luxSelectedMemoryFile = null;
          const input = document.getElementById('luxMemFileInput');
          if (input) input.value = '';
          const previewBox = document.getElementById('luxMemPreviewBox');
          if (previewBox) previewBox.style.display = 'none';
          const errorBox = document.getElementById('luxMemErrorBox');
          if (errorBox) errorBox.style.display = 'none';
        };

        window.luxSubmitMemory = async function(e) {
          e.preventDefault();
          const errorBox = document.getElementById('luxMemErrorBox');
          if (errorBox) errorBox.style.display = 'none';

          if (!window.luxSelectedMemoryFile) {
            if (errorBox) {
              errorBox.textContent = 'Silakan pilih foto kenangan terlebih dahulu sebelum mengirim.';
              errorBox.style.display = 'block';
            }
            return;
          }

          const submitBtn = document.getElementById('luxMemSubmitBtn');
          const progressBox = document.getElementById('luxMemProgressBox');
          const progressBar = document.getElementById('luxMemProgressBar');
          const progressText = document.getElementById('luxMemProgressText');
          const successBox = document.getElementById('luxMemSuccessBox');

          if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.5'; }
          if (progressBox) progressBox.style.display = 'block';
          if (progressBar) progressBar.style.width = '20%';

          try {
            if (progressText) progressText.textContent = "Mengoptimasi kualitas foto...";
            const optimizedFile = await compressImageInBrowser(window.luxSelectedMemoryFile);
            if (progressBar) progressBar.style.width = '60%';

            const form = document.getElementById('luxMemoryForm');
            const fd = new FormData(form);
            fd.set('file', optimizedFile);

            if (progressText) progressText.textContent = "Mengunggah ke album pengantin...";
            if (progressBar) progressBar.style.width = '85%';

            const res = await fetch('/api/public/memories/upload', {
              method: 'POST',
              body: fd,
            });
            const data = await res.json();

            if (data.success) {
              if (progressBar) progressBar.style.width = '100%';
              if (progressBox) progressBox.style.display = 'none';
              if (successBox) {
                successBox.style.display = 'block';
                successBox.textContent = "✓ " + data.message;
              }

              // Smooth Auto-Close in 1.5 seconds!
              setTimeout(() => {
                luxCloseMemoryModal();
                setTimeout(() => { window.location.reload(); }, 300);
              }, 1500);
            } else {
              throw new Error(data.error || 'Gagal mengunggah foto.');
            }
          } catch (err) {
            if (errorBox) {
              errorBox.textContent = err.message || 'Terjadi kesalahan saat mengunggah foto ke server.';
              errorBox.style.display = 'block';
            }
            if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
            if (progressBox) progressBox.style.display = 'none';
          }
        };

        window.luxOpenMemoryPreview = function(url, name, msg, type) {
          const modal = document.getElementById('luxMemoryPreviewModal');
          const content = document.getElementById('luxMemoryPreviewContent');
          const caption = document.getElementById('luxMemoryPreviewCaption');
          if (!modal || !content) return;

          content.textContent = '';
          const previewImg = document.createElement('img');
          previewImg.src = url;
          previewImg.style.cssText = 'max-height: 75vh; max-width: 100%; border-radius: 16px; object-fit: contain; box-shadow: 0 20px 50px rgba(0,0,0,0.8);';
          content.appendChild(previewImg);

          if (caption) {
            caption.textContent = '';
            const nameEl = document.createElement('div');
            nameEl.style.cssText = 'font-weight: 700; font-size: 14px; color: #fff;';
            nameEl.textContent = name || '';
            caption.appendChild(nameEl);
            if (msg) {
              const msgEl = document.createElement('div');
              msgEl.style.cssText = 'font-size: 12px; opacity: 0.8; margin-top: 4px; font-style: italic;';
              msgEl.textContent = '“' + msg + '”';
              caption.appendChild(msgEl);
            }
          }

          modal.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        };

        window.luxCloseMemoryPreview = function(e) {
          if (!e || e.target === document.getElementById('luxMemoryPreviewModal') || e.target.tagName === 'BUTTON') {
            const modal = document.getElementById('luxMemoryPreviewModal');
            if (modal) {
              const video = modal.querySelector('video');
              if (video) { try { video.pause(); } catch(e){} }
              modal.style.display = 'none';
              document.body.style.overflow = '';
            }
          }
        };
      </script>
    `;
  }

  // 12. Section: Wedding Vendors (Clean, Borderless, No-Card-Wrap Minimalist Logo Grid)
  let vendorsSectionHtml = "";
  let rawVendors: any[] = [];
  if (Array.isArray(featureSettings.vendors)) {
    rawVendors = featureSettings.vendors;
  } else if (typeof featureSettings.vendors === "string") {
    try {
      rawVendors = JSON.parse(featureSettings.vendors);
    } catch {}
  }

  const validVendors = rawVendors.filter((v) => v && (v.name?.trim() || v.logoUrl?.trim()));

  if (showVendors && validVendors.length > 0) {
    const vendorItemsHtml = validVendors.map((v: any) => {
      const name = (v.name || "").trim();
      const logo = safeExternalUrl(v.logoUrl);
      const rawUrl = String(v.url || "").trim();
      let finalUrl = "";
      if (rawUrl) {
        finalUrl = rawUrl.startsWith("@")
          ? safeHref(`https://instagram.com/${encodeURIComponent(rawUrl.slice(1).trim())}`)
          : safeHref(rawUrl);
      }

      // Clean borderless floating presentation directly on canvas background (NO CARD WRAP)
      const logoHtml = logo
        ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name || "Vendor")}" class="lux-vendor-logo-img" loading="lazy" style="max-height: 48px; max-width: 140px; width: auto; height: auto; object-fit: contain; opacity: 0.95; transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.06)';" onmouseout="this.style.opacity='0.95'; this.style.transform='scale(1)';" />`
        : "";

      const nameHtml = name
        ? `<span class="lux-vendor-text-name ${logo ? "" : "serif"}" style="${logo ? "font-size: 0.82rem; font-weight: 500; letter-spacing: 0.03em;" : "font-size: 1.05rem; font-weight: 600; letter-spacing: 0.04em;"} color: var(--text-main, #ffffff) !important; opacity: 0.92; text-align: center; line-height: 1.35; background: transparent !important; border: none !important; text-decoration: none !important;">${escapeHtml(name)}</span>`
        : "";

      const itemContent = `
        <div class="lux-vendor-item" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; background: transparent !important; border: none !important; box-shadow: none !important;">
          ${logoHtml}
          ${nameHtml}
        </div>
      `.trim();

      if (finalUrl) {
        return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(name || "Kunjungi Profil Vendor")}" class="lux-vendor-link" style="display: flex; align-items: center; justify-content: center; text-decoration: none !important; color: var(--accent) !important; padding: 0.5rem; background: transparent !important; border: none !important; box-shadow: none !important; transition: transform 0.2s ease;">${itemContent}</a>`;
      }
      return `<div class="lux-vendor-link" style="display: flex; align-items: center; justify-content: center; text-decoration: none !important; color: var(--accent) !important; padding: 0.5rem; background: transparent !important; border: none !important; box-shadow: none !important;">${itemContent}</div>`;
    }).join("");

    vendorsSectionHtml = `
      <section class="sec-flow slide-section" id="section-vendors" data-section-alias="vendors" style="position: relative; padding: 4.5rem 1.5rem; text-align: center;">
        <style>
          .lux-vendors-grid a.lux-vendor-link, .lux-vendors-grid a.lux-vendor-link:visited, .lux-vendors-grid a.lux-vendor-link:hover, .lux-vendors-grid a.lux-vendor-link:active { color: var(--accent) !important; text-decoration: none !important; }
          .lux-vendors-grid a.lux-vendor-link:hover .lux-vendor-text-name { opacity: 1 !important; text-decoration: underline !important; }
        </style>
        <a id="vendors" style="display:none;"></a>
        <div class="sec-content-box reveal-on-scroll" style="max-width: 580px; margin: 0 auto; text-align: center;">
          ${vendorEyebrow ? `<span class="sec-eyebrow" data-lux-field="customLabels.vendorEyebrow" style="display: block; font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); opacity: 0.85; margin-bottom: 0.5rem;">${escapeHtml(vendorEyebrow)}</span>` : ""}
          <h2 class="sec-main-title serif" data-lux-field="customLabels.vendorTitle" style="font-size: 2.3rem; margin-bottom: ${vendorSubtitle ? '0.6rem' : '2.8rem'}; color: var(--accent); letter-spacing: 0.02em;">${escapeHtml(vendorTitle)}</h2>
          ${vendorSubtitle ? `<p class="sec-sub" data-lux-field="customLabels.vendorSubtitle" style="max-width: 480px; margin: 0 auto 2.5rem auto; font-size: 0.84rem; line-height: 1.6; opacity: 0.8;">${escapeHtml(vendorSubtitle)}</p>` : ""}

          <div class="lux-vendors-grid" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2.2rem 2.8rem; max-width: 540px; margin: 0 auto;">
            ${vendorItemsHtml}
          </div>
        </div>
      </section>
    `;
  }

  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : "http://localhost:3000")).replace(/\/$/, "");
  const fallbackOgImage = "/assets/brand/og-banner.jpg";
  const resolvedCover = coverUrl || fallbackOgImage;
  const absoluteCover = resolvedCover.startsWith("http") ? resolvedCover : `${appOrigin}${resolvedCover.startsWith("/") ? "" : "/"}${resolvedCover}`;
  const platformName = await getAdminSetting("platform_name", "Platform Undangan");

  return {
    invitationId: inv.id,
    qrCheckinBaseUrl: buildCheckinQrBaseUrl(inv.id, qrMark),
    themeId: inv.themeId || "kalandra",
    weddingTagline: featureSettings.weddingTagline || "THE WEDDING OF",
    
    // Dynamic Host Ordering
    firstInitial,
    secondInitial,
    coupleMonogram,
    monogramInitial: coupleMonogram,
    firstNickname,
    secondNickname,
    firstName,
    secondName,
    firstFullName,
    secondFullName,
    firstDisplayName,
    secondDisplayName,
    firstRole,
    secondRole,
    firstRoleLabel,
    secondRoleLabel,
    firstParentLabel,
    secondParentLabel,
    firstParentPrefix,
    secondParentPrefix,
    firstFather,
    firstMother,
    secondFather,
    secondMother,
    firstParentsJoinHtml,
    secondParentsJoinHtml,
    firstParents,
    secondParents,
    firstInstagram,
    secondInstagram,
    firstPhotoUrl,
    secondPhotoUrl,
    firstGender,
    secondGender,
    firstGenderLabel,
    secondGenderLabel,
    isGroomFirst: Boolean(isGroomFirst),
    isBrideFirst: !isGroomFirst,

    // Specific Groom & Bride
    groomName,
    brideName,
    groomNickname,
    brideNickname,
    groomDisplayName,
    brideDisplayName,
    groomFullName: groomDisplayName,
    brideFullName: brideDisplayName,
    groomParents,
    brideParents,
    groomFather,
    groomMother,
    brideFather,
    brideMother,
    groomInstagram,
    brideInstagram,
    // Label per mempelai (tidak ikut displayOrder), dipakai kartu tema yang selalu memuat pria lalu wanita.
    groomRole: groomRoleLabel,
    brideRole: brideRoleLabel,
    // Teks sampul saat tautan dibuka tanpa ?to=; skrip runtime menggantinya dengan nama tamu.
    guestName: "Tamu Undangan",
    groomPhotoUrl: groomPhoto,
    bridePhotoUrl: bridePhoto,
    hasCustomGroomPhoto: Boolean(customGroom),
    hasCustomBridePhoto: Boolean(customBride),
    hasCustomCover: Boolean(customCover),

    // Media
    landingCoverUrl: coverUrl,
    landingCoverDesktopUrl: coverDesktopUrl,
    hasCustomCoverDesktop: Boolean(mediaMap.get("LANDING_COVER_DESKTOP")),
    homePhotoUrl: homePhotoUrl,
    homePhotoCssUrl: customHomePhoto || "",
    hasCustomHomePhoto: Boolean(customHomePhoto),
    customHomePhoto: customHomePhoto,
    closingPhotoUrl: closingPhotoUrl,
    hasClosingPhoto: Boolean(closingPhotoUrl),
    closingPhotoClass: closingPhotoUrl ? "has-closing-photo" : "no-closing-photo",
    // Kunci berakhiran "Style" disisipkan mentah oleh renderTemplate ke atribut style="...", jadi URL di-escape di sini.
    closingBgStyle: closingPhotoUrl ? `background-image: url('${escapeHtml(closingPhotoUrl)}');` : "",
    sidebarPhotoUrl: sidebarUrl,
    globalBgUrl: fixedBgUrl,
    audioUrl: finalAudioUrl,

    // Quotes & Dates
    // Teks polos; renderTemplate meng-escape dan mengubah baris baru menjadi <br />.
    openingQuote: inv.openingQuote || blueprint.openingQuote,
    openingQuoteRef: inv.openingQuoteRef || blueprint.openingQuoteRef,
    closingQuote: (inv as any).closingQuote || blueprint.closingQuote,
    closingSub: (inv as any).closingSub || blueprint.closingSub,
    targetDate,
    weddingDate,
    primaryEventDate: weddingDate,
    weddingDateDay,
    weddingDateMonth,
    weddingDateYear,
    googleCalendarUrl,
    calendarIcsUrl: realSlug ? `/api/public/invitations/${encodeURIComponent(realSlug)}/calendar.ics` : "",
    invitationLocale: locale,
    giftRegistryHtml,

    // Dynamic Section Blocks (Chronological Sequence)
    eventDataHtml: eventsHtml,
    storySectionHtml,
    storyItemsHtml,
    qrAccessSectionHtml,
    dressCodeHtml,
    liveStreamingHtml,
    weddingFilterHtml,
    turutMengundangHtml,
    gallerySectionHtml,
    giftSectionHtml,
    giftCardsHtml,
    giftAddress: inv.shippingAddress ? String(inv.shippingAddress).trim() : "",
    wishesHtml,
    memoriesSectionHtml,
    vendorsSectionHtml,
    musicPlayerHtml,
    qrAccessCardHtml: showQrCheckin ? qrAccessCardHtml : "",
    qrButtonDisplay: showQrCheckin ? "" : "display:none;",
    qrCoverButtonHtml: showQrCheckin ? `<button class="btn-qr-ghost" onclick="openModal()">QR Check-In →</button>` : "",
    qrDockButtonHtml: showQrCheckin ? `<button onclick="openModal()" class="dock-a" style="background:none;border:none;cursor:pointer;"><svg class="dock-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg><span>Ticket</span></button>` : "",
    qrSideNavButtonHtml: showQrCheckin ? `<a href="javascript:void(0)" class="side-nav-link" onclick="openModal(); toggleSideNav();">Souvenir Card</a>` : "",
    showQrCheckin,

    // Dynamic Section Flags (Theme Freedom & Conditional Blocks)
    showStory,
    showGallery,
    showGift,
    showDressCode: showDresscode,
    showDresscode,
    showStreaming: showLiveStream,
    showLiveStream,
    showWeddingFilter: showFilter,
    showFilter,
    showTurutMengundang,
    showVendors,

    // Custom Section Titles & Labels
    openBtn: customLabels.openBtn || dict.openInvitation,
    // 12 master tradisional memakai token ini di dalam tombol buka.
    openBtnText: customLabels.openBtn || dict.openInvitation,
    dressCodeTitle,
    dressCodeEyebrow,
    coverSubtitle: customLabels.coverSubtitle || blueprint.coverSubtitle || "",
    coverGuestLabel: (customLabels as any).coverGuestLabel || dict.coverGuestLabel,
    openingGreeting,
    coverBadge,
    quoteSectionTitle,
    quoteSectionEyebrow,
    coupleSectionEyebrow,
    coupleSectionTitle,
    coupleSectionSub,
    eventsSectionTitle,
    eventsSectionSub,
    eventsSectionEyebrow: (customLabels as any).eventsEyebrow || dict.eventsEyebrow,
    eventsEyebrow: (customLabels as any).eventsEyebrow || dict.eventsEyebrow,
    storySectionTitle,
    storySectionEyebrow: customLabels.storyEyebrow || blueprint.storySectionEyebrow || "OUR JOURNEY",
    storyEyebrow: customLabels.storyEyebrow || blueprint.storySectionEyebrow || "OUR JOURNEY",
    gallerySectionTitle,
    gallerySectionEyebrow,
    galleryQuote,
    giftSectionTitle,
    giftSectionEyebrow,
    giftSectionDesc,
    wishesSectionTitle,
    wishesSectionSub,
    wishesSectionEyebrow: (customLabels as any).wishesEyebrow || dict.wishesEyebrow,
    wishesEyebrow: (customLabels as any).wishesEyebrow || dict.wishesEyebrow,
    rsvpTitle: customLabels.rsvpTitle || dict.rsvpTitleDefault,
    rsvpBtnText: customLabels.rsvpBtnText || dict.rsvpBtnDefault,
    vendorTitle,
    vendorEyebrow,
    vendorSubtitle,
    quoteTitle: quoteSectionTitle,
    quoteEyebrow: quoteSectionEyebrow,
    coupleEyebrow: coupleSectionEyebrow,
    coupleTitle: coupleSectionTitle,
    eventsTitle: eventsSectionTitle,
    storyTitle: storySectionTitle,
    galleryTitle: gallerySectionTitle,
    giftTitle: giftSectionTitle,
    wishesTitle: wishesSectionTitle,

    // Dynamic OpenGraph & Meta Tags Default
    metaTagsHtml: `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>${escapeHtml(firstNickname)} &amp; ${escapeHtml(secondNickname)} — ${escapeHtml(dict.metaWeddingSuffix)}</title>
    <meta name="description" content="${escapeHtml(dict.metaWeddingDescPrefix)} ${escapeHtml(firstFullName)} &amp; ${escapeHtml(secondFullName)}. ${escapeHtml(dict.metaWeddingDescSuffix)}">
    <meta property="og:site_name" content="${escapeHtml(platformName)}">
    <meta property="og:title" content="${escapeHtml(firstNickname)} &amp; ${escapeHtml(secondNickname)} — ${escapeHtml(dict.metaWeddingSuffix)}">
    <meta property="og:description" content="${escapeHtml(dict.metaWeddingDescPrefix)} ${escapeHtml(firstFullName)} &amp; ${escapeHtml(secondFullName)}. ${escapeHtml(dict.metaWeddingDescSuffix)}">
    <meta property="og:image" content="${escapeHtml(absoluteCover)}">
    <meta property="og:image:secure_url" content="${escapeHtml(absoluteCover)}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(firstNickname)} &amp; ${escapeHtml(secondNickname)} — ${escapeHtml(dict.metaWeddingSuffix)}">
    <meta name="twitter:description" content="${escapeHtml(dict.metaWeddingDescPrefix)} ${escapeHtml(firstFullName)} &amp; ${escapeHtml(secondFullName)}.">
    <meta name="twitter:image" content="${escapeHtml(absoluteCover)}">
    `,
    
    featureSettings,
    customLabels,
  };
}

export async function composePersonalData(inv: any) {
  const p = safeParseParticipants(inv.participantsJson);
  const src = p.person || {};
  const parents = p.parents || {};
  const invitationId = inv.id;
  const subEvent = sanitizeSubEvent(inv.subEvent);
  const meta = resolveSubEventMeta("PERSONAL", subEvent);

  const mediaMap = new Map<string, string>();
  for (const m of inv.media || []) {
    if (m.localPath) mediaMap.set(String(m.mediaSlot), m.localPath);
  }

  const events: any[] = Array.isArray(inv.eventData) ? inv.eventData : [];
  const bankAccounts: any[] = Array.isArray(inv.bankAccounts) ? inv.bankAccounts : [];
  const featureSettings: any = parseFeatureSettings(inv.featureSettings);
  const customLabels = featureSettings.customLabels || {};

  const themeKey = (inv.themeId || meta.demoFallbackThemeId || "festivo").toLowerCase();
  let customDemoData: any = null;
  try {
    const customSetting = await prisma.adminSetting.findUnique({
      where: { key: `theme_demo_${themeKey}` },
      select: { value: true },
    });
    if (customSetting?.value) customDemoData = JSON.parse(customSetting.value);
  } catch (err) {
    logger.warn("ThemeEngine", "Data Studio Demo tema tidak terbaca; teks bawaan blueprint dipakai", { themeId: inv.themeId, error: err instanceof Error ? err.message : String(err) });
  }

  const blueprint = getThemeBlueprint(themeKey, customDemoData || undefined);

  let dbThemeDefaultMusic = "";
  let dbThemeBuilderSpec: any = null;
  try {
    const dbTheme = await prisma.theme.findUnique({
      where: { id: themeKey },
      select: { defaultMusicUrl: true, builderSpec: true },
    });
    if (dbTheme?.defaultMusicUrl) dbThemeDefaultMusic = dbTheme.defaultMusicUrl;
    if (dbTheme?.builderSpec) dbThemeBuilderSpec = dbTheme.builderSpec;
  } catch (err) {
    logger.warn("ThemeEngine", "Musik bawaan tema tidak terbaca; musik cadangan dipakai", { themeId: inv.themeId, error: err instanceof Error ? err.message : String(err) });
  }

  const showGallery = featureSettings.showGallery !== undefined ? Boolean(featureSettings.showGallery) : true;
  const showGift = featureSettings.showGift !== undefined ? Boolean(featureSettings.showGift) : true;
  const showDresscode = featureSettings.showDresscode !== undefined ? Boolean(featureSettings.showDresscode) : true;
  const showQrCheckin = featureSettings.showQrCheckin !== undefined ? Boolean(featureSettings.showQrCheckin) : true;
  const showLiveStream = featureSettings.showLiveStream !== undefined ? Boolean(featureSettings.showLiveStream) : true;
  const showTurutMengundang = featureSettings.showTurutMengundang !== undefined ? Boolean(featureSettings.showTurutMengundang) : true;

  // Profil tokoh utama mode PERSONAL (`participantsJson.person` + opsional `participantsJson.parents`)
  const personName = String(src.name || "").trim() || "Tuan Rumah";
  const personNickname = String(src.nickname || "").trim() || personName;
  const personAge = String(src.age ?? "").trim();
  const personInstagram = String(src.instagram || "").replace(/^@+/, "").trim();
  const fatherName = String(parents.father || src.fatherName || "").trim();
  const motherName = String(parents.mother || src.motherName || "").trim();
  const parentName = [fatherName, motherName].filter(Boolean).join(" & ");

  // Field keterangan tambahan opsional (usia, anak ke-, data kelahiran, studi/gelar, atau teks bebas)
  const birthOrder = String(src.birthOrder || "").trim();
  const birthDateFormatted = src.birthDate ? formatDateId(src.birthDate) : "";
  const birthMetrics = [src.birthWeight, src.birthLength].filter(Boolean).join(" • ");
  const degree = String(src.degree || "").trim();
  const major = String(src.major || "").trim();
  const faculty = String(src.faculty || "").trim();
  const institution = String(src.institution || "").trim();
  const honors = String(src.honors || "").trim();
  const customDetail = String(src.detail || src.subtitle || "").trim();
  const customSubDetail = String(src.subDetail || "").trim();

  const locale = normalizeInvitationLocale(featureSettings.language);
  const dict = getLocaleDict(locale);

  const academicCoverLine = [degree, institution].filter(Boolean).join(" • ");
  const academicStudyLine = [major, faculty].filter(Boolean).join(" — ");
  const birthOrderInfoLine = [birthOrder, personAge ? (locale === "en" ? `Age ${personAge}` : `Usia ${personAge} Tahun`) : ""].filter(Boolean).join(" • ");
  const birthInfoLine = [birthDateFormatted, birthMetrics].filter(Boolean).join(" • ");
  const ageInfoLine = personAge ? (subEvent?.toLowerCase() === "ulang tahun" ? `Ulang Tahun ke-${personAge}` : `Usia ${personAge} Tahun`) : "";

  const mainInfoLine = customDetail || academicCoverLine || birthInfoLine || birthOrderInfoLine || ageInfoLine || "";
  const mainDetailLine = customSubDetail || academicStudyLine || "";

  const parentNamesEsc = [fatherName, motherName].filter(Boolean).map(escapeHtml).join(" &amp; ");
  const parentIntro = subEvent?.toLowerCase() === "khitanan" ? "Putra tercinta dari:" : "Putra/Putri tercinta dari:";
  const parentsHtml = parentNamesEsc
    ? `<p>${parentIntro}</p><h4 class="serif" style="color: var(--card-text, var(--text-main)); font-size: 16px; margin: 4px 0;">${parentNamesEsc}</h4>`
    : "";
  const honorsBadgeHtml = honors
    ? `<span style="display: inline-block; padding: 4px 12px; border-radius: var(--radius-full, 9999px); background: color-mix(in srgb, var(--accent) 20%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); color: var(--accent); font-size: 11px; font-weight: 700; margin-top: 8px;">Predikat: ${escapeHtml(honors)}</span>`
    : "";

  // Photos: tanpa foto demo tema sebagai cadangan
  const customCover = mediaMap.get("LANDING_COVER");
  const customCoverDesktop = mediaMap.get("LANDING_COVER_DESKTOP");
  const customHome = mediaMap.get("HOME_PHOTO");
  const customFixedBg = mediaMap.get("GLOBAL_FIXED_BG");
  const customPersonPhoto = mediaMap.get("PROFILE_PHOTO");

  const coverHeroUrl = customCover || customFixedBg || "";
  const landingCoverUrl = coverHeroUrl;
  const landingCoverDesktopUrl = customCoverDesktop || coverHeroUrl;
  const clientOwnsCover = (inv.media || []).some((m: any) => !m.isThemeDefault && m.localPath && (m.mediaSlot === "LANDING_COVER" || m.mediaSlot === "GLOBAL_FIXED_BG"));
  const galleryFallbackUrl = clientOwnsCover ? landingCoverUrl : "";
  const homePhotoUrl = customHome || "";
  const personPhotoUrl = customPersonPhoto || generateInitialAvatarSvg(personNickname, meta.profileEyebrow);
  const sidebarPhotoUrl = mediaMap.get("DESKTOP_SIDEBAR") || personPhotoUrl;
  const globalBgUrl = customFixedBg || "";
  const footerPhotoUrl = mediaMap.get("CLOSING_COVER") || "";

  // Date & Countdown
  const primaryEvent = primaryEventOf(events);
  const rawTargetDate = primaryEvent.date || "";
  let targetDate = "";
  if (rawTargetDate) {
    const rawTime = (primaryEvent.startTime || primaryEvent.time || "10:00").replace(".", ":");
    const cleanTime = rawTime.includes(":") ? rawTime.split(/[^0-9:]/)[0] : "10:00";
    const datePart = rawTargetDate.includes("T") ? rawTargetDate.split("T")[0] : rawTargetDate;
    targetDate = `${datePart}T${cleanTime.length === 5 ? cleanTime : "10:00"}:00`;
  }

  const dObj = new Date(targetDate);
  const isValidDate = !isNaN(dObj.getTime());
  const weddingDateDay = isValidDate ? String(dObj.getDate()).padStart(2, "0") : "";
  const weddingDateMonth = isValidDate ? String(dObj.getMonth() + 1).padStart(2, "0") : "";
  const weddingDateYear = isValidDate ? String(dObj.getFullYear()) : "";
  const eventDateFormatted = isValidDate && primaryEvent.date
    ? dObj.toLocaleDateString(dict.intlLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : dict.dateNotSet;
  const eventTime = primaryEvent.time || (primaryEvent.startTime ? `${primaryEvent.startTime} - ${primaryEvent.endTime || (locale === "en" ? "End" : "Selesai")}` : "");
  const venueName = primaryEvent.location || primaryEvent.venueName || "";
  const venueAddress = primaryEvent.address || "";
  const mapsUrl = primaryEvent.mapsUrl || "";

  // Calendar
  const calendarLocation = venueName || venueAddress;
  const calTitle = buildCalendarTitle("PERSONAL", { personName, personAge }, subEvent);
  const googleCalendarUrl = buildGoogleCalendarUrl(primaryEvent, calTitle, calendarLocation);
  const realSlug = inv.invitationSlug && !String(inv.id || "").startsWith("demo") ? String(inv.invitationSlug) : undefined;

  const galleryPhotos = await collectGalleryPhotos(inv, featureSettings);
  const galleryVariant = storedVariant(inv.builderSpec ?? dbThemeBuilderSpec, "gallery");
  const giftRegistryHtml = showGift
    ? buildGiftRegistryHtml({
        items: parseGiftRegistryFromSettings(featureSettings),
        claims: Array.isArray(inv.giftClaims) ? inv.giftClaims : [],
        invitationId,
        locale,
      })
    : "";
  const eventSectionHtml = buildUniversalEventCards(events, meta.eventLabel, { slug: realSlug, titlePrefix: calTitle, locale });
  const gallerySectionHtml = buildUniversalGallerySection(galleryPhotos, customLabels.galleryTitle || (locale === "en" ? "Photo Gallery" : "Dokumentasi Momen"), showGallery, galleryVariant);
  const rsvpSectionHtml = buildUniversalRsvpSection(invitationId, locale);
  const wishesSectionHtml = buildUniversalWishesSection(inv.rsvps || [], invitationId, locale);
  const giftSectionHtml = buildUniversalGiftSection(bankAccounts, customLabels.giftTitle || dict.giftTitle, fatherName || personName, showGift, { giftRegistryHtml, locale });

  const finalAudioUrl = featureSettings.showMusic !== false
    ? (safeExternalUrl(inv.musicUrl || featureSettings.musicUrl) || dbThemeDefaultMusic || blueprint.defaultMusicUrl || "")
    : "";

  const host = (process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : "http://localhost:3000")).replace(/\/$/, "");
  const platformName = await getAdminSetting("platform_name", "Platform Undangan");
  const absoluteCover = !coverHeroUrl || coverHeroUrl.startsWith("http") ? coverHeroUrl : `${host}${coverHeroUrl.startsWith("/") ? "" : "/"}${coverHeroUrl}`;
  const monogram = (personNickname || "P").charAt(0).toUpperCase();

  return {
    invitationId,
    invitationSlug: inv.invitationSlug,
    themeId: inv.themeId || meta.demoFallbackThemeId || "festivo",
    eventType: "PERSONAL",
    subEvent,
    weddingTagline: meta.coverBadge,

    // Token profil terpadu mode PERSONAL
    primaryTitle: personName,
    secondaryTitle: meta.eventLabel,
    personName,
    personNickname,
    personAge,
    personInstagram,
    parentName,
    personPhotoUrl,
    birthDateFormatted,
    birthMetrics,
    honorsBadgeHtml,
    fatherName,
    motherName,
    parentsHtml,
    mainInfoLine,
    mainDetailLine,

    // Token tampilan tunggal (tanpa kebocoran data pernikahan)
    firstNickname: personNickname,
    secondNickname: "",
    firstName: personName,
    secondName: "",
    firstFullName: personName,
    secondFullName: "",
    firstDisplayName: personName,
    secondDisplayName: "",
    firstRole: meta.profileEyebrow,
    secondRole: "",
    guestName: inv.recipientName || "Tamu Undangan",
    firstParents: parentName,
    secondParents: "",
    firstInstagram: personInstagram,
    secondInstagram: "",
    coupleMonogram: monogram,
    monogramInitial: monogram,
    firstInitial: monogram,
    secondInitial: "",

    // Standardized Photo Assets
    landingCoverUrl,
    landingCoverDesktopUrl,
    coverHeroUrl,
    homePhotoUrl,
    sidebarPhotoUrl,
    globalBgUrl,
    footerPhotoUrl,
    firstPhotoUrl: personPhotoUrl,
    secondPhotoUrl: "",
    galleryPhoto1: galleryPhotos[0] || galleryFallbackUrl,
    galleryPhoto2: galleryPhotos[1] || galleryFallbackUrl,
    galleryPhoto3: galleryPhotos[2] || galleryFallbackUrl,
    galleryPhoto4: galleryPhotos[3] || galleryFallbackUrl,
    galleryPhoto5: galleryPhotos[4] || galleryFallbackUrl,
    galleryPhoto6: galleryPhotos[5] || galleryFallbackUrl,

    // Event Details
    targetDate,
    weddingDate: eventDateFormatted,
    weddingDateDay,
    weddingDateMonth,
    weddingDateYear,
    eventDateFormatted,
    eventTime,
    venueName,
    venueAddress,
    mapsUrl,
    googleCalendarUrl,

    // Composed HTML Blocks
    eventSectionHtml,
    gallerySectionHtml,
    wishesSectionHtml,
    rsvpSectionHtml,
    giftSectionHtml,
    brandWatermarkHtml: `<span style="font-size: 10px; color: var(--canvas-accent, var(--primary));">Powered by ${escapeHtml(platformName)}</span>`,
    weddingFilterHtml: "",
    dressCodeHtml: "",
    liveStreamingHtml: "",
    turutMengundangHtml: "",
    vendorsSectionHtml: "",
    qrAccessSectionHtml: "",
    qrAccessCardHtml: "",
    qrCoverButtonHtml: "",
    qrDockButtonHtml: "",
    qrSideNavButtonHtml: "",

    // Flags
    showWeddingFilter: false,
    showGallery,
    showGift,
    showDressCode: showDresscode,
    showStreaming: showLiveStream,
    showTurutMengundang,
    showVendors: false,
    showQrCheckin,

    // Labels
    openBtn: customLabels.openBtn || dict.openInvitation,
    coverSubtitle: customLabels.coverSubtitle || mainInfoLine || meta.eventLabel,
    coverBadge: customLabels.coverBadge || meta.coverBadge,
    coupleSectionTitle: locale === "en" ? "Profile" : meta.profileTitle,
    coupleSectionEyebrow: meta.profileEyebrow.toUpperCase(),
    coupleTitle: locale === "en" ? "Profile" : meta.profileTitle,
    coupleEyebrow: meta.profileEyebrow.toUpperCase(),
    coupleSectionSub: meta.profileSub,
    eventsSectionTitle: customLabels.eventsTitle || meta.agendaTitle,
    eventsSectionEyebrow: "EVENT DETAILS",
    eventsTitle: customLabels.eventsTitle || meta.agendaTitle,
    eventsEyebrow: "EVENT DETAILS",
    gallerySectionTitle: customLabels.galleryTitle || (locale === "en" ? "Photo Gallery" : "Dokumentasi Momen"),
    gallerySectionEyebrow: "GALLERY",
    galleryTitle: customLabels.galleryTitle || (locale === "en" ? "Photo Gallery" : "Dokumentasi Momen"),
    galleryEyebrow: "GALLERY",
    wishesSectionTitle: customLabels.wishesTitle || dict.wishesTitle,
    wishesSectionEyebrow: "WISHES & RSVP",
    wishesTitle: customLabels.wishesTitle || dict.wishesTitle,
    wishesEyebrow: "WISHES & RSVP",
    rsvpTitle: customLabels.rsvpTitle || dict.rsvpTitleDefault,
    rsvpBtnText: customLabels.rsvpBtnText || dict.rsvpBtnDefault,
    closingQuote: inv.closingQuote || meta.closingText,
    closingSub: inv.closingSub || (locale === "en" ? "Thank you for your warm blessings." : "Hormat kami yang berbahagia."),
    audioUrl: finalAudioUrl,

    // Meta Tags
    metaTagsHtml: `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>${escapeHtml(meta.eventLabel)} ${escapeHtml(personNickname)} — ${escapeHtml(dict.metaDigitalSuffix)}</title>
    <meta name="description" content="${escapeHtml(meta.eventLabel)} ${escapeHtml(personName.replace(/\.+$/, ""))}.">
    <meta property="og:site_name" content="${escapeHtml(platformName)}">
    <meta property="og:title" content="${escapeHtml(meta.eventLabel)} ${escapeHtml(personNickname)} — ${escapeHtml(dict.metaDigitalSuffix)}">
    <meta property="og:description" content="${escapeHtml(meta.eventLabel)} ${escapeHtml(personName.replace(/\.+$/, ""))}.">
    <meta property="og:image" content="${escapeHtml(absoluteCover)}">
    <meta property="og:image:secure_url" content="${escapeHtml(absoluteCover)}">
    <meta property="og:type" content="website">
    `,

    featureSettings,
    customLabels,
  };
}

// ==========================================
// UNIVERSAL SECTION BUILDERS (NON-WEDDING)
// ==========================================

/**
 * Kartu sesi tema khitan/aqiqah/wisuda/gathering: tanggal, jam, tempat, dan peta hanya tampil bila diisi klien.
 * Label acara dan tautan peta memakai `--event-accent` bila master menetapkannya (kanvas gelap yang `--primary`-nya
 * tidak terbaca di atas kartu), selain itu `--primary`.
 */
function buildUniversalEventCards(
  events: any[],
  fallbackName: string,
  opts?: { slug?: string; titlePrefix?: string; locale?: "id" | "en" },
): string {
  const locale = opts?.locale || "id";
  const dict = getLocaleDict(locale);
  const titlePrefix = opts?.titlePrefix || fallbackName;
  const cards = events.map((ev: any, idx: number) => {
    const dateLabel = ev.date ? formatDateId(ev.date, locale) : "";
    const mapsHref = safeHref(ev.mapsUrl);
    const calButtons = buildCalendarButtonsHtml({
      event: ev,
      idx,
      slug: opts?.slug,
      sessionQuery: idx,
      titlePrefix,
      locale,
    });
    return `
    <div class="event-block-item" style="background: color-mix(in srgb, var(--card-bg) 60%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); border-radius: var(--radius-md, 14px); padding: 18px; margin-bottom: 12px; text-align: left;">
      <span style="font-size: 11px; font-weight: 700; color: var(--event-accent, var(--primary)); text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(ev.title || "Acara")}</span>
      <h3 class="serif" style="font-size: 18px; color: var(--card-text, var(--text-main)); margin: 6px 0 4px;">${escapeHtml(ev.name || ev.title || fallbackName)}</h3>
      ${dateLabel ? `<p style="font-size: 13px; color: var(--card-text, var(--text-main));">${escapeHtml(dateLabel)}</p>` : ""}
      ${ev.time ? `<p style="font-size: 13px; color: var(--card-muted, var(--text-muted));">${escapeHtml(ev.time)}</p>` : ""}
      ${ev.location ? `<p style="font-size: 13px; color: var(--card-text, var(--text-main)); margin-top: 6px;"><b>${escapeHtml(ev.location)}</b></p>` : ""}
      ${ev.address ? `<p style="font-size: 12px; color: var(--card-muted, var(--text-muted));">${escapeHtml(ev.address)}</p>` : ""}
      ${mapsHref ? `<a href="${mapsHref}" target="_blank" rel="noopener noreferrer" class="btn-map-outline" style="display: inline-block; margin-top: 10px; font-size: 12px; color: var(--event-accent, var(--primary)); text-decoration: underline; font-weight: 600;">${escapeHtml(dict.googleMapsDirections)}</a>` : ""}
      ${calButtons}
    </div>
  `;
  }).join("");
  return `<div class="events-stack events-sessions-stack">${cards}</div>`;
}

function buildUniversalGallerySection(
  galleryPhotos: string[],
  galleryTitle: string = "Dokumentasi Momen",
  showGallery: boolean = true,
  galleryVariant: string = "grid"
): string {
  if (!showGallery || galleryPhotos.length === 0) return "";

  const galleryItemsHtml = galleryPhotos.map((src, idx) => `
    <div class="moment-photo-item" data-idx="${idx}" onclick="luxOpenZoom(${idx})" style="aspect-ratio: 1/1; border-radius: var(--radius-md, 14px); overflow: hidden; border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); background: var(--card-bg);">
      <img src="${escapeHtml(src)}" alt="Momen ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover; display: block;" loading="lazy" referrerpolicy="no-referrer" />
    </div>
  `).join("");

  return `
    <section class="sec-block gallery-variant-${galleryVariant}" id="gallery" data-lux-section="gallery" data-gallery-variant="${galleryVariant}">
      <!-- lux-ornaments:gallery -->
      <span class="sec-lbl" data-lux-field="customLabels.galleryEyebrow" data-lux-block="gallery-eyebrow">Galeri</span>
      <h2 class="sec-h2 serif" data-lux-field="customLabels.galleryTitle" data-lux-block="gallery-title">${escapeHtml(galleryTitle)}</h2>
      <div class="moments-grid-wrap moments-carousel-wrap" style="margin-top: 16px;">
        <div class="moments-grid-10 is-${galleryVariant}" data-lux-block="gallery-grid" id="momentsGridContainer" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          ${galleryItemsHtml}
        </div>
        ${galleryVariant === "carousel" ? `
        <button type="button" class="carousel-nav-btn carousel-nav-prev" onclick="luxScrollCarousel(-1)" aria-label="Foto sebelumnya">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button type="button" class="carousel-nav-btn carousel-nav-next" onclick="luxScrollCarousel(1)" aria-label="Foto selanjutnya">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
        <script>
          window.luxScrollCarousel = window.luxScrollCarousel || function(dir) {
            var el = document.getElementById("momentsGridContainer") || document.querySelector(".moments-grid-10.is-carousel");
            if (!el) return;
            var step = Math.min(el.clientWidth * 0.75, 300);
            el.scrollBy({ left: dir * step, behavior: "smooth" });
          };
        </script>
        ` : ""}
      </div>
    </section>
  `;
}

function buildUniversalGiftSection(
  bankAccounts: any[],
  giftTitle: string = "Kado Digital",
  fallbackOwnerName: string = "",
  showGift: boolean = true,
  opts?: { giftRegistryHtml?: string; locale?: "id" | "en" },
): string {
  const locale = opts?.locale || "id";
  const dict = getLocaleDict(locale);
  const giftRegistryHtml = opts?.giftRegistryHtml || "";
  const hasBanks = Array.isArray(bankAccounts) && bankAccounts.length > 0;
  if (!showGift || (!hasBanks && !giftRegistryHtml)) return "";
  const bankCardsHtml = (bankAccounts || []).map((b: any) => `
    <div class="bank-card" style="background: var(--card-bg); border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: var(--radius-md, 14px); padding: 18px; text-align: center;">
      <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: color-mix(in srgb, var(--card-accent, var(--primary)) 30%, var(--card-text, var(--text-main))); letter-spacing: 1px;">${escapeHtml(b.bank || "Bank")}</span>
      <div style="font-family: monospace; font-size: 18px; font-weight: 700; color: var(--card-text, var(--text-main)); margin: 8px 0; letter-spacing: 1px;">${escapeHtml(b.number || b.accountNumber || "")}</div>
      <p style="font-size: 12px; color: var(--card-muted, var(--text-muted)); margin-bottom: 12px;">a.n ${escapeHtml(b.name || b.accountName || fallbackOwnerName)}</p>
      <button type="button" data-copy="${escapeHtml(b.number || b.accountNumber || "")}" onclick="navigator.clipboard.writeText(this.dataset.copy).then(function(){alert(${jsonForInlineScript(dict.giftCopiedAlert)});})" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 20px; border-radius: var(--radius-full, 9999px); background: color-mix(in srgb, var(--primary) 15%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent); color: color-mix(in srgb, var(--card-accent, var(--primary)) 30%, var(--card-text, var(--text-main))); font-size: 12px; font-weight: 700; cursor: pointer;">${escapeHtml(dict.giftCopyBtn)}</button>
    </div>
  `).join("");

  return `
    <section class="sec-block" id="gift">
      <span class="sec-lbl" data-lux-field="customLabels.giftEyebrow">${escapeHtml(dict.giftEyebrow)}</span>
      <h2 class="sec-h2 serif" data-lux-field="customLabels.giftTitle">${escapeHtml(giftTitle)}</h2>
      ${hasBanks ? `<div class="bank-cards-list gift-cards-stack" style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">${bankCardsHtml}</div>` : ""}
      ${giftRegistryHtml}
    </section>
  `;
}

// HTML terbit dibangun sekali untuk semua tamu; nama tamu diisi di perangkat dari ?to= oleh skrip runtime (renderTemplate).
function buildUniversalRsvpSection(invitationId: string, locale: "id" | "en" = "id"): string {
  const dict = getLocaleDict(locale);
  return `
    <div class="rsvp-card-box" style="text-align: left; margin-bottom: 24px;">
      <span class="sec-lbl" style="display: block; text-align: center; margin-bottom: 4px;">${escapeHtml(dict.rsvpEyebrow)}</span>
      <h2 class="sec-h2 serif" style="text-align: center; font-size: 22px; margin-bottom: 16px;" data-lux-field="customLabels.rsvpTitle">${escapeHtml(dict.rsvpHeading)}</h2>
      <form onsubmit="handleUniversalRsvpSubmit(event, '${escapeHtml(invitationId || "")}')" style="display: flex; flex-direction: column; gap: 12px; background: var(--card-bg); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); padding: 20px; border-radius: var(--radius-md, 14px);">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--card-muted, var(--text-muted)); margin-bottom: 4px;" data-lux-field="customLabels.rsvpNameLabel">${escapeHtml(dict.rsvpNameLabel)}</label>
          <input type="text" id="universalRsvpName" required placeholder="${escapeHtml(dict.rsvpNamePlaceholder)}" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-sm, 8px); background: color-mix(in srgb, var(--bg-canvas, var(--card-bg)) 80%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); color: var(--text-main); font-size: 13px;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--card-muted, var(--text-muted)); margin-bottom: 4px;" data-lux-field="customLabels.rsvpStatusLabel">${escapeHtml(dict.rsvpStatusLabel)}</label>
          <select id="universalRsvpStatus" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-sm, 8px); background: color-mix(in srgb, var(--bg-canvas, var(--card-bg)) 80%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); color: var(--text-main); font-size: 13px;">
            <option value="hadir">${escapeHtml(dict.attending)}</option>
            <option value="tidak_hadir">${escapeHtml(dict.declinedFull)}</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--card-muted, var(--text-muted)); margin-bottom: 4px;" data-lux-field="customLabels.rsvpCountLabel">${escapeHtml(dict.rsvpCountLabel)}</label>
          <input type="number" id="universalRsvpCount" min="1" max="10" value="1" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-sm, 8px); background: color-mix(in srgb, var(--bg-canvas, var(--card-bg)) 80%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); color: var(--text-main); font-size: 13px;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--card-muted, var(--text-muted)); margin-bottom: 4px;" data-lux-field="customLabels.rsvpMessageLabel">${escapeHtml(dict.rsvpMessageLabel)}</label>
          <textarea id="universalRsvpMessage" rows="3" placeholder="${escapeHtml(dict.rsvpMessagePlaceholder)}" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-sm, 8px); background: color-mix(in srgb, var(--bg-canvas, var(--card-bg)) 80%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); color: var(--text-main); font-size: 13px; resize: vertical;"></textarea>
        </div>
        <button type="submit" id="universalRsvpBtn" style="padding: 12px; border-radius: var(--radius-full, 9999px); background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #ffffff; font-size: 13px; font-weight: 700; border: none; cursor: pointer; margin-top: 4px;" data-lux-field="customLabels.rsvpBtnText">${escapeHtml(dict.rsvpBtn)}</button>
        <div id="universalRsvpAlert" style="display: none; text-align: center; font-size: 12px; font-weight: 600; color: var(--card-accent, var(--primary)); margin-top: 6px;"></div>
      </form>
    </div>
    <script>
      async function handleUniversalRsvpSubmit(e, invId) {
        e.preventDefault();
        var btn = document.getElementById("universalRsvpBtn");
        var alertBox = document.getElementById("universalRsvpAlert");
        var name = (document.getElementById("universalRsvpName") || {}).value || "";
        var status = (document.getElementById("universalRsvpStatus") || {}).value || "hadir";
        var count = (document.getElementById("universalRsvpCount") || {}).value || "1";
        var msg = (document.getElementById("universalRsvpMessage") || {}).value || "";
        if (!name.trim()) return;
        var btnLabel = btn ? btn.textContent : "";
        if (btn) { btn.disabled = true; btn.textContent = ${jsonForInlineScript(dict.rsvpBtnSending)}; }
        try {
          var res = await fetch("/api/public/rsvp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitationId: invId, guestName: name, status: status, guestCount: count, message: msg })
          });
          var data = await res.json();
          if (data && data.success) {
            if (alertBox) { alertBox.style.display = "block"; alertBox.textContent = ${jsonForInlineScript(dict.rsvpSentSuccess)}; }
            var list = document.getElementById("universalWishesList");
            if (list && msg) {
              var esc = function(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
              var item = document.createElement("div");
              item.style = "background: color-mix(in srgb, var(--card-bg) 70%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); border-radius: var(--radius-md, 14px); padding: 14px; margin-bottom: 10px;";
              item.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;"><strong style="font-size: 13px; color: var(--card-text, var(--text-main));">' + esc(name) + '</strong><span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full, 9999px); background: color-mix(in srgb, var(--primary) 25%, transparent); color: var(--card-accent, var(--primary));">' + (status === "hadir" ? ${jsonForInlineScript(dict.attending)} + " (" + esc(count) + ")" : ${jsonForInlineScript(dict.declined)}) + '</span></div><p style="font-size: 12px; color: var(--card-muted, var(--text-muted)); line-height: 1.5; margin: 0;">“' + esc(msg) + '”</p>';
              list.insertBefore(item, list.firstChild);
            }
            var msgBox = document.getElementById("universalRsvpMessage");
            if (msgBox) msgBox.value = "";
          } else {
            if (alertBox) { alertBox.style.display = "block"; alertBox.textContent = (data && data.error) || ${jsonForInlineScript(dict.rsvpSendError)}; }
          }
        } catch(err) {
          if (alertBox) { alertBox.style.display = "block"; alertBox.textContent = ${jsonForInlineScript(dict.rsvpNetworkError)}; }
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        }
      }
    </script>
  `;
}

function buildUniversalWishesSection(rsvps: any[] = [], invitationId = "", locale: "id" | "en" = "id"): string {
  return buildUniversalWishesSectionHtml(rsvps, invitationId, locale);
}

// ==========================================
// KONTRAK TEMA SATU PROFIL (PERSONAL & EVENT)
// ==========================================

/** Hitung mundur ke jadwal terima tamu menurut zona waktu acara; tidak dirender bila tanggal belum diisi. */
/** Waktu mulai acara utama berzona waktu (ISO 8601) untuk hitung mundur; kosong bila tanggalnya belum diisi. */
function countdownTargetOf(primary: any): string {
  const day = typeof primary?.date === "string" ? primary.date.split("T")[0] : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  const rawTime = String(primary.startTime || primary.time || "").match(/\d{1,2}[:.]\d{2}/)?.[0]?.replace(".", ":") || "00:00";
  const time = rawTime.length === 4 ? `0${rawTime}` : rawTime;
  return `${day}T${time}:00${getEventTimezoneOffset(resolveEventTimezone(primary))}`;
}

function buildUniversalCountdown(primary: any, locale: "id" | "en" = "id"): string {
  const target = countdownTargetOf(primary);
  if (!target) return "";
  const dict = getLocaleDict(locale);
  const cell = (id: string, label: string) => `
      <div style="min-width: 64px; padding: 12px 8px; border-radius: var(--radius-md, 14px); background: color-mix(in srgb, var(--card-bg) 70%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);">
        <span id="${id}" style="display: block; font-size: 22px; font-weight: 800; color: var(--card-text, var(--text-main));">00</span>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--card-muted, var(--text-muted));">${label}</span>
      </div>`;
  return `
    <div class="countdown-timer" data-target="${escapeHtml(target)}" style="display: flex; justify-content: center; gap: 8px; margin: 16px 0;">
      ${cell("cdDays", dict.days)}${cell("cdHours", dict.hours)}${cell("cdMinutes", dict.minutes)}${cell("cdSeconds", dict.seconds)}
    </div>
    <script>
      (function () {
        var box = document.querySelector('.countdown-timer[data-target]');
        if (!box || box.__luxCountdown) return;
        box.__luxCountdown = true;
        var target = new Date(box.getAttribute('data-target')).getTime();
        if (isNaN(target)) return;
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = pad(v); };
        var tick = function () {
          var diff = Math.max(0, target - Date.now());
          set('cdDays', Math.floor(diff / 86400000));
          set('cdHours', Math.floor(diff / 3600000) % 24);
          set('cdMinutes', Math.floor(diff / 60000) % 60);
          set('cdSeconds', Math.floor(diff / 1000) % 60);
        };
        tick();
        setInterval(tick, 1000);
      })();
    </script>
  `;
}

/** Audio + tombol putar; pemutaran, autoplay setelah sampul dibuka, dan status tombol ditangani skrip runtime. */
function buildUniversalMusicPlayer(audioUrl: string): string {
  if (!audioUrl) return "";
  return `
    <audio id="luxAudioPlayer" loop preload="none"><source src="${escapeHtml(audioUrl)}" /></audio>
    <button type="button" id="musicFab" aria-label="Putar atau jeda musik" onclick="window.luxToggleAudio && window.luxToggleAudio()" style="position: fixed; right: 16px; bottom: 88px; z-index: 900; width: 44px; height: 44px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--primary) 50%, transparent); background: color-mix(in srgb, var(--card-bg) 85%, transparent); color: var(--card-accent, var(--primary)); display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(6px);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    </button>
    <style>#musicFab.playing svg { animation: luxMusicSpin 4s linear infinite; } @keyframes luxMusicSpin { to { transform: rotate(360deg); } }</style>
  `;
}

/** Kartu QR check-in tamu; nama tamu dan isi QR diisi skrip runtime dari ?to= (#passGuestName, #passQrImg). */
function buildUniversalQrPass(inv: any, eventLabel: string, mainName: string, dateLabel: string, locale: "id" | "en" = "id"): string {
  const dict = getLocaleDict(locale);
  const qrSrc = escapeHtml(buildCheckinQrUrl(inv.id, dict.honorableGuest, qrInitials(inv)));
  return `
    <section class="sec-block" id="checkin">
      <span class="sec-lbl">${escapeHtml(dict.qrEyebrow)}</span>
      <h2 class="sec-h2 serif">${escapeHtml(dict.qrTitle)}</h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${escapeHtml(dict.qrDesc)}</p>
      <div style="background: var(--card-bg); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); border-radius: var(--radius-lg, 20px); padding: 20px; text-align: center;">
        <span style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--card-accent, var(--primary));">${escapeHtml(eventLabel)}</span>
        <h3 class="serif" style="font-size: 20px; color: var(--card-text, var(--text-main)); margin: 6px 0 2px;">${escapeHtml(mainName)}</h3>
        ${dateLabel ? `<p style="font-size: 12px; color: var(--card-muted, var(--text-muted)); margin-bottom: 14px;">${escapeHtml(dateLabel)}</p>` : ""}
        <!-- Latar putih wajib: pemindai QR membutuhkan kontras gelap di atas terang, apa pun palet temanya. -->
        <div style="display: inline-block; padding: 12px; border-radius: var(--radius-md, 14px); background: #ffffff;">
          <img class="pass-qr-img" id="passQrImg" src="${qrSrc}" alt="QR Check-In" style="width: 160px; height: 160px; display: block;" />
        </div>
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--card-muted, var(--text-muted)); margin-top: 14px;">${escapeHtml(dict.qrToLabel)}</p>
        <h4 class="serif" id="passGuestName" style="font-size: 17px; color: var(--card-text, var(--text-main));">${escapeHtml(dict.honorableGuest)}</h4>
      </div>
    </section>
  `;
}

/** Ajakan kamera tamu dan tautan galeri; alamat mengikuti subdomain atau slug undangan. */
function buildUniversalMemoriesCta(inv: any, customLabels: Record<string, string>, locale: "id" | "en" = "id"): string {
  const dict = getLocaleDict(locale);
  const base = inv.subdomain ? `/s/${encodeURIComponent(inv.subdomain)}` : `/${encodeURIComponent(inv.invitationSlug)}`;
  return `
    <section class="sec-block" id="memories">
      <span class="sec-lbl">${escapeHtml(customLabels.memoriesEyebrow || dict.memoriesEyebrow)}</span>
      <h2 class="sec-h2 serif">${escapeHtml(customLabels.memoriesTitle || dict.memoriesTitle)}</h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">${escapeHtml(customLabels.memoriesSubtitle || dict.memoriesSubtitle)}</p>
      <a href="${base}/sharemoment" style="display: inline-block; padding: 12px 28px; border-radius: var(--radius-full, 9999px); background: linear-gradient(135deg, var(--primary), var(--secondary, var(--primary))); color: var(--on-primary, var(--text-main)); font-size: 13px; font-weight: 700; text-decoration: none;">${escapeHtml(dict.memoriesOpenCam)}</a>
      <div style="margin-top: 12px;"><a href="${base}/memories" style="font-size: 12px; color: var(--canvas-accent, var(--primary)); text-decoration: underline;">${escapeHtml(dict.memoriesViewGallery)}</a></div>
    </section>
  `;
}

/** Seksi opsional dari studio: dress code, siaran langsung, filter Instagram, turut mengundang, vendor. */
function buildUniversalExtraSections(inv: any, featureSettings: Record<string, any>): string {
  const dict = getLocaleDict(normalizeInvitationLocale(featureSettings.language));
  const sections: string[] = [];
  const block = (id: string, label: string, title: string, body: string) => `
    <section class="sec-block" id="${id}">
      <span class="sec-lbl">${label}</span>
      <h2 class="sec-h2 serif">${title}</h2>
      ${body}
    </section>`;

  const rawStories = Array.isArray(inv.loveStory) ? inv.loveStory : [];
  const validStories = rawStories.filter(
    (s: any) => s && (String(s.title || "").trim() || String(s.content || s.description || "").trim()),
  );
  if (featureSettings.showStory !== false && validStories.length > 0) {
    const customLabels = (featureSettings.customLabels || {}) as Record<string, string>;
    const isEventMode = (inv.eventType || "").toUpperCase() === "EVENT";
    const defaultEyebrow = isEventMode
      ? (dict.intlLocale.startsWith("en") ? "Milestones" : "Tonggak Perjalanan")
      : (dict.intlLocale.startsWith("en") ? "Life Journey" : "Kisah & Perjalanan");
    const defaultTitle = isEventMode
      ? (dict.intlLocale.startsWith("en") ? "Our Journey & Milestones" : "Riwayat & Perjalanan")
      : (dict.intlLocale.startsWith("en") ? "Life Story" : "Perjalanan Hidup");
    const eyebrow = escapeHtml(customLabels.storyEyebrow || defaultEyebrow);
    const title = escapeHtml(customLabels.storyTitle || defaultTitle);
    const itemsHtml = validStories
      .map((st: any, idx: number) => {
        const chapterDate = String(st.date || "").trim();
        const chapterTitle = String(st.title || `Babak ${idx + 1}`).trim();
        const chapterBody = String(st.content || st.description || "").trim();
        return `
        <div class="story-chapter-block" style="background: color-mix(in srgb, var(--card-bg) 70%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent); border-radius: var(--radius-md, 14px); padding: 16px 18px; text-align: left;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: var(--card-accent, var(--primary));">${escapeHtml(chapterDate || `BABAK ${idx + 1}`)}</span>
          </div>
          <h3 class="serif" style="font-size: 17px; color: var(--card-text, var(--text-main)); margin: 2px 0 6px;" data-lux-field="stories.${idx}.title">${escapeHtml(chapterTitle)}</h3>
          ${chapterBody ? `<p style="font-size: 13px; color: var(--card-muted, var(--text-muted)); line-height: 1.65; margin: 0;" data-lux-field="stories.${idx}.content">${nl2br(chapterBody)}</p>` : ""}
        </div>`;
      })
      .join("");
    sections.push(
      block(
        "story",
        eyebrow,
        title,
        `<div class="journey-timeline" style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">${itemsHtml}</div>`,
      ),
    );
  }

  const colors = String(featureSettings.dressCodeColors || "").split(",").map((c) => safeCssColor(c.trim())).filter(Boolean);
  const dressNote = String(featureSettings.dressCodeNote || inv.dresscode || "").trim();
  if (featureSettings.showDresscode !== false && (colors.length > 0 || dressNote)) {
    const swatches = colors.map((c) => `<span style="width: 28px; height: 28px; border-radius: 50%; display: inline-block; background: ${escapeHtml(c)}; border: 2px solid color-mix(in srgb, var(--text-main) 60%, transparent);"></span>`).join("");
    sections.push(block("dresscode", "Dress Code", escapeHtml(dict.dressCodeTitle), `${swatches ? `<div style="display: flex; justify-content: center; gap: 10px; margin: 12px 0;">${swatches}</div>` : ""}${dressNote ? `<p style="font-size: 13px; color: var(--text-muted);">${escapeHtml(dressNote)}</p>` : ""}`));
  }

  const liveLinks = [
    ["YouTube", safeHref(featureSettings.liveStreamYoutubeUrl || inv.liveStreamUrl)],
    ["Instagram", safeHref(featureSettings.liveStreamInstagramUrl)],
    ["Zoom", safeHref(featureSettings.liveStreamZoomUrl)],
  ].filter(([, href]) => href);
  if (featureSettings.showLiveStream !== false && liveLinks.length > 0) {
    const buttons = liveLinks.map(([name, href]) => `<a href="${href}" target="_blank" rel="noopener noreferrer" style="padding: 10px 18px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--primary) 50%, transparent); color: var(--canvas-accent, var(--primary)); font-size: 12px; font-weight: 700; text-decoration: none;">${name} Live</a>`).join("");
    sections.push(block("live", escapeHtml(dict.liveStreamEyebrow), escapeHtml(dict.liveStreamTitle), `<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 12px;">${buttons}</div>`));
  }

  const filterUrl = safeHref(featureSettings.instagramFilterUrl);
  if (featureSettings.showFilter && filterUrl) {
    sections.push(block("frame", "Filter Instagram", "Abadikan dengan Bingkai Resmi", `<a href="${filterUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 12px; padding: 10px 22px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--primary) 50%, transparent); color: var(--canvas-accent, var(--primary)); font-size: 12px; font-weight: 700; text-decoration: none;">Buka Filter Instagram</a>`));
  }

  const invitedBy = String(featureSettings.turutMengundang || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (featureSettings.showTurutMengundang !== false && invitedBy.length > 0) {
    sections.push(block("turut-mengundang", "Turut Mengundang", "Keluarga &amp; Kerabat", invitedBy.map((l) => `<p style="font-size: 13px; color: var(--text-main); padding: 6px 0; border-bottom: 1px dashed color-mix(in srgb, var(--primary) 20%, transparent);">${escapeHtml(l)}</p>`).join("")));
  }

  let vendors: any[] = [];
  if (Array.isArray(featureSettings.vendors)) vendors = featureSettings.vendors;
  else if (typeof featureSettings.vendors === "string") {
    try { vendors = JSON.parse(featureSettings.vendors); } catch { vendors = []; }
  }
  const validVendors = vendors.filter((v) => v && (String(v.name || "").trim() || String(v.logoUrl || "").trim()));
  if (featureSettings.showVendors !== false && validVendors.length > 0) {
    const items = validVendors.map((v) => {
      const logo = safeExternalUrl(v.logoUrl);
      return `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(v.name || "Vendor")}" style="max-height: 44px; max-width: 120px; object-fit: contain;" loading="lazy" />` : ""}${v.name ? `<span style="font-size: 12px; color: var(--text-main);">${escapeHtml(v.name)}</span>` : ""}${v.category ? `<span style="font-size: 10px; color: var(--text-muted);">${escapeHtml(v.category)}</span>` : ""}</div>`;
    }).join("");
    sections.push(block("vendors", "Vendor", "Didukung Oleh", `<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-top: 12px;">${items}</div>`));
  }

  return sections.join("");
}

interface PrimaryModeIdentity {
  name: string;
  nickname: string;
  photo: string;
  info: string;
  detail: string;
}

interface ModeStoryDefaults {
  eyebrowId: string;
  eyebrowEn: string;
  titleId: string;
  titleEn: string;
}

/**
 * Pipeline bersama untuk menyempurnakan token non-pernikahan (label demo/builder, kutipan, media,
 * seksi kisah/riwayat, hitung mundur, musik, QR, guest memories, dan seksi tambahan).
 * Dipanggil secara terpisah oleh `finalizePersonalData` dan `finalizeEventData`.
 */
async function buildModeOutputPayload(
  eventType: "PERSONAL" | "EVENT",
  data: Record<string, any>,
  inv: any,
  identity: PrimaryModeIdentity,
  parentsHtml: string,
  storyDefaults: ModeStoryDefaults,
): Promise<Record<string, any>> {
  const featureSettings: Record<string, any> = data.featureSettings || {};
  const customLabels: Record<string, string> = data.customLabels || {};
  const events: any[] = Array.isArray(inv.eventData) ? inv.eventData : [];
  const primary = primaryEventOf(events);
  const subEvent = sanitizeSubEvent(inv.subEvent);
  const meta = resolveSubEventMeta(eventType, subEvent);

  const defaultThemeId = meta.demoFallbackThemeId || DEFAULT_THEME_BY_EVENT[eventType] || "kalandra";
  const chosenThemeId = String(inv.themeId || defaultThemeId).toLowerCase();
  let themeId = defaultThemeId;
  let themeDemo: Record<string, any> | undefined;
  let chosenBuilderSpec: unknown = null;
  let themeSubEventMatches = false;
  try {
    const themeRow = await prisma.theme.findUnique({ where: { id: chosenThemeId }, select: { eventType: true, subEvent: true, builderSpec: true } });
    if (themeRow?.eventType === eventType) {
      themeId = chosenThemeId;
      chosenBuilderSpec = themeRow.builderSpec;
      const rowSub = sanitizeSubEvent(themeRow.subEvent)?.toLowerCase() || "";
      const invSub = subEvent?.toLowerCase() || "";
      themeSubEventMatches = !invSub || !rowSub || invSub === rowSub;
    }
    const setting = await prisma.adminSetting.findUnique({ where: { key: `theme_demo_${themeId}` }, select: { value: true } });
    themeDemo = setting?.value ? JSON.parse(setting.value) : undefined;
  } catch (err) {
    logger.warn("ThemeEngine", "Data Studio Demo tema tidak terbaca; teks bawaan blueprint dipakai", { themeId, error: err instanceof Error ? err.message : String(err) });
  }
  const themeBlueprint = getThemeBlueprint(themeId, themeDemo);
  const defaultQuote = themeSubEventMatches ? (themeBlueprint.openingQuote || meta.defaultQuote) : meta.defaultQuote;
  const defaultQuoteRef = themeSubEventMatches ? (themeBlueprint.openingQuoteRef || meta.defaultQuoteRef) : meta.defaultQuoteRef;
  const quote = inv.openingQuote || defaultQuote || "";
  const quoteRef = inv.openingQuote ? (inv.openingQuoteRef || "") : (defaultQuoteRef || "");

  const builderLabels = builderTextLabels(inv.builderTexts ?? builderTextsOf(chosenBuilderSpec));
  const mergedLabels = {
    ...(themeId === chosenThemeId && themeSubEventMatches ? themeDemo?.customLabels || {} : {}),
    ...builderLabels,
    ...customLabels,
  };

  const planType = inv.order?.planType;
  const showQr = featureSettings.showQrCheckin !== false && await hasPlanCapability(planType, "qr_checkin");
  const showMemories = featureSettings.showGuestMemories !== false && await hasPlanCapability(planType, "guest_memories");
  const locale = normalizeInvitationLocale(featureSettings.language);
  const realSlug = inv.invitationSlug && !String(inv.id || "").startsWith("demo") ? String(inv.invitationSlug) : undefined;
  const dateLabel = primary.date ? formatDateId(primary.date, locale) : "";
  const platformName = await getAdminSetting("platform_name", "Platform Undangan");

  const mediaMap = new Map<string, string>();
  for (const item of inv.media || []) {
    if (item.localPath) mediaMap.set(String(item.mediaSlot), item.localPath);
  }
  const customHomePhoto = mediaMap.get("HOME_PHOTO") || "";
  const closingPhotoUrl = mediaMap.get("CLOSING_COVER") || "";
  const sidebarPhotoUrl = mediaMap.get("DESKTOP_SIDEBAR") || data.sidebarPhotoUrl || data.landingCoverUrl || identity.photo || "";
  const isRealPhoto = (url: unknown) => typeof url === "string" && url !== "" && !url.startsWith("data:");

  const rawStories = Array.isArray(inv.loveStory) ? inv.loveStory : [];
  const validStories = rawStories.filter(
    (s: any) => s && (String(s.title || "").trim() || String(s.content || s.description || "").trim()),
  );
  const showModeStory = featureSettings.showStory !== false && validStories.length > 0;
  const defaultStoryEyebrow = locale === "en" ? storyDefaults.eyebrowEn : storyDefaults.eyebrowId;
  const defaultStoryTitle = locale === "en" ? storyDefaults.titleEn : storyDefaults.titleId;
  const storyEyebrow = mergedLabels.storyEyebrow || defaultStoryEyebrow;
  const storyTitle = mergedLabels.storyTitle || defaultStoryTitle;
  const storyItemsHtml = showModeStory
    ? validStories
        .map((st: any, idx: number) => {
          const chapterDate = String(st.date || "").trim();
          const chapterTitle = String(st.title || `Babak ${idx + 1}`).trim();
          const chapterBody = String(st.content || st.description || "").trim();
          return `
        <div class="story-chapter-block journey-chapter-item">
          <span class="sc-label chapter-eyebrow">${escapeHtml(chapterDate || `BABAK ${idx + 1}`)}</span>
          <h4 class="sc-title chapter-heading serif" data-lux-field="stories.${idx}.title">${escapeHtml(chapterTitle)}</h4>
          ${chapterBody ? `<p class="sc-desc chapter-desc" data-lux-field="stories.${idx}.content">${nl2br(chapterBody)}</p>` : ""}
        </div>`;
        })
        .join("")
    : "";
  const storySectionHtml = showModeStory
    ? `
      <section class="sec-flow sec-journey" id="story">
        <span class="sec-eyebrow reveal" data-lux-field="customLabels.storyEyebrow" style="text-align:center;">${escapeHtml(storyEyebrow)}</span>
        <h2 class="sec-main-title journey-title serif reveal delay-1" data-lux-field="customLabels.storyTitle">${escapeHtml(storyTitle)}</h2>
        <div class="journey-timeline journey-chapters reveal-up delay-2">
          ${storyItemsHtml}
        </div>
      </section>`
    : "";

  return {
    ...data,
    subEvent,
    showStory: showModeStory,
    storyEyebrow,
    storyTitle,
    storySectionEyebrow: storyEyebrow,
    storySectionTitle: storyTitle,
    storyItemsHtml,
    storySectionHtml,
    sidebarPhotoUrl,
    hasCustomSidebarPhoto: isRealPhoto(sidebarPhotoUrl),
    hasCustomMainPhoto: isRealPhoto(identity.photo),
    landingCoverDesktopUrl: mediaMap.get("LANDING_COVER_DESKTOP") || data.landingCoverDesktopUrl || data.landingCoverUrl || "",
    hasCustomCoverDesktop: Boolean(mediaMap.get("LANDING_COVER_DESKTOP")),
    homePhotoUrl: customHomePhoto,
    hasCustomHomePhoto: Boolean(customHomePhoto),
    closingPhotoUrl,
    hasClosingPhoto: Boolean(closingPhotoUrl),
    closingPhotoClass: closingPhotoUrl ? "has-closing-photo" : "no-closing-photo",
    closingBgStyle: closingPhotoUrl ? `background-image: url('${escapeHtml(closingPhotoUrl)}');` : "",
    mainName: identity.name || "",
    mainNickname: identity.nickname || identity.name || "",
    mainPhotoUrl: identity.photo || "",
    mainInfoLine: identity.info || "",
    mainDetailLine: identity.detail || "",
    eventLabel: meta.eventLabel,
    eventIntro: meta.eventIntro,
    profileEyebrow: meta.profileEyebrow,
    profileTitle: meta.profileTitle,
    profileSub: meta.profileSub,
    agendaTitle: meta.agendaTitle,
    closingText: meta.closingText,
    openingQuote: quote,
    openingQuoteRef: quoteRef,
    parentsHtml,
    eventDateFormatted: primaryEventDateLabel(events, locale),
    eventTime: primary.time || "",
    venueName: primary.location || "",
    venueAddress: primary.address || "",
    mapsUrl: safeHref(primary.mapsUrl),
    eventSectionHtml: data.eventSectionHtml || buildUniversalEventCards(events, meta.eventLabel, { slug: realSlug, titlePrefix: `${meta.eventLabel} ${identity.name || ""}`.trim(), locale }),
    brandWatermarkHtml: data.brandWatermarkHtml || `<span style="font-size: 10px; color: var(--canvas-accent, var(--primary));">Powered by ${escapeHtml(platformName)}</span>`,
    countdownHtml: buildUniversalCountdown(primary, locale),
    countdownTarget: countdownTargetOf(primary),
    musicPlayerHtml: buildUniversalMusicPlayer(data.audioUrl || ""),
    qrPassHtml: showQr ? buildUniversalQrPass(inv, meta.eventLabel, identity.name || "", dateLabel, locale) : "",
    memoriesSectionHtml: showMemories ? buildUniversalMemoriesCta(inv, customLabels, locale) : "",
    extraSectionsHtml: buildUniversalExtraSections(inv, featureSettings),
    invitationLocale: locale,
    featureSettings: { ...featureSettings, customLabels: mergedLabels },
  };
}

/**
 * Finalisasi data render khusus mode `PERSONAL` (Personal & Keluarga: 1 tokoh utama + orang tua opsional + kisah hidup).
 */
async function finalizePersonalData(data: Record<string, any>, inv: any): Promise<Record<string, any>> {
  const p = safeParseParticipants(inv.participantsJson);
  const fatherName = String(p.parents?.father || p.person?.fatherName || "").trim();
  const motherName = String(p.parents?.mother || p.person?.motherName || "").trim();
  const parentNames = [fatherName, motherName].filter(Boolean).map(escapeHtml).join(" &amp; ");
  const parentsHtml =
    data.parentsHtml !== undefined
      ? data.parentsHtml
      : parentNames
        ? `<p>Putra/Putri tercinta dari:</p><h4 class="serif" style="color: var(--card-text, var(--text-main)); font-size: 16px; margin: 4px 0;">${parentNames}</h4>`
        : "";

  return buildModeOutputPayload(
    "PERSONAL",
    data,
    inv,
    {
      name: data.personName || "",
      nickname: data.personNickname || data.personName || "",
      photo: data.personPhotoUrl || "",
      info: data.mainInfoLine || "",
      detail: data.mainDetailLine || "",
    },
    parentsHtml,
    {
      eyebrowId: "Kisah & Perjalanan",
      eyebrowEn: "Life Journey",
      titleId: "Perjalanan Hidup",
      titleEn: "Life Story",
    },
  );
}

/**
 * Finalisasi data render khusus mode `EVENT` (Acara & Event Umum: non-personal, selalu tanpa blok orang tua).
 */
async function finalizeEventData(data: Record<string, any>, inv: any): Promise<Record<string, any>> {
  return buildModeOutputPayload(
    "EVENT",
    data,
    inv,
    {
      name: data.eventTitle || "",
      nickname: data.eventTitle || "",
      photo: data.eventPhotoUrl || "",
      info: data.eventSubtitle || "",
      detail: data.organizerName ? `Diselenggarakan oleh ${data.organizerName}` : "",
    },
    "",
    {
      eyebrowId: "Tonggak Perjalanan",
      eyebrowEn: "Milestones",
      titleId: "Riwayat & Perjalanan",
      titleEn: "Our Journey & Milestones",
    },
  );
}

export async function composeEventData(inv: any) {
  const p = safeParseParticipants(inv.participantsJson);
  const evInfo = p.event || {};
  const invitationId = inv.id;
  const subEvent = sanitizeSubEvent(inv.subEvent);
  const meta = resolveSubEventMeta("EVENT", subEvent);

  const mediaMap = new Map<string, string>();
  for (const m of inv.media || []) {
    if (m.localPath) mediaMap.set(String(m.mediaSlot), m.localPath);
  }

  const events: any[] = Array.isArray(inv.eventData) ? inv.eventData : [];
  const bankAccounts: any[] = Array.isArray(inv.bankAccounts) ? inv.bankAccounts : [];
  const featureSettings: any = parseFeatureSettings(inv.featureSettings);

  const customLabels = featureSettings.customLabels || {};

  let dbThemeDefaultMusic = "";
  let dbThemeBuilderSpec: any = null;
  try {
    const dbTheme = await prisma.theme.findUnique({
      where: { id: (inv.themeId || "sinergi").toLowerCase() },
      select: { defaultMusicUrl: true, builderSpec: true },
    });
    if (dbTheme?.defaultMusicUrl) dbThemeDefaultMusic = dbTheme.defaultMusicUrl;
    if (dbTheme?.builderSpec) dbThemeBuilderSpec = dbTheme.builderSpec;
  } catch (err) {
    logger.warn("ThemeEngine", "Musik bawaan tema tidak terbaca; musik cadangan dipakai", { themeId: inv.themeId, error: err instanceof Error ? err.message : String(err) });
  }

  const eventTitle = evInfo.title || meta.eventLabel || "Peresmian & Syukuran";
  const eventSubtitle = evInfo.subtitle || "";
  const organizerName = evInfo.organizer || "";
  const hostName = evInfo.hostName || "";
  const dresscode = evInfo.dresscode || "";

  const host = (process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : "http://localhost:3000")).replace(/\/$/, "");
  const landingCoverUrl = mediaMap.get("LANDING_COVER") || mediaMap.get("GLOBAL_FIXED_BG") || "";
  const eventPhotoUrl = mediaMap.get("EVENT_PHOTO") || generateInitialAvatarSvg(eventTitle, "Acara");
  const absoluteCover = !landingCoverUrl || landingCoverUrl.startsWith("http") ? landingCoverUrl : `${host}${landingCoverUrl.startsWith("/") ? "" : "/"}${landingCoverUrl}`;
  const finalAudioUrl = featureSettings.showMusic !== false ? (safeExternalUrl(inv.musicUrl || featureSettings.musicUrl) || dbThemeDefaultMusic || "") : "";
  const platformName = await getAdminSetting("platform_name", "Platform Undangan");

  const eventDateFormatted = primaryEventDateLabel(events);
  const guestName = inv.recipientName || "Rekan / Tamu Undangan";
  const dresscodeHtml = dresscode ? `<p style="font-size: 12px; color: var(--primary); margin-top: 6px;">Dress Code: <b>${escapeHtml(dresscode)}</b></p>` : "";

  const locale = normalizeInvitationLocale(featureSettings.language);
  const realSlug = inv.invitationSlug && !String(inv.id || "").startsWith("demo") ? String(inv.invitationSlug) : undefined;
  const showGift = featureSettings.showGift !== false;
  const giftRegistryHtml = showGift
    ? buildGiftRegistryHtml({
        items: parseGiftRegistryFromSettings(featureSettings),
        claims: Array.isArray(inv.giftClaims) ? inv.giftClaims : [],
        invitationId,
        locale,
      })
    : "";
  const eventSectionHtml = buildUniversalEventCards(events, eventTitle, { slug: realSlug, titlePrefix: buildCalendarTitle("EVENT", { eventTitle }, subEvent), locale });
  const galleryVariant = storedVariant(inv.builderSpec ?? dbThemeBuilderSpec, "gallery");
  const gallerySectionHtml = buildUniversalGallerySection(await collectGalleryPhotos(inv, featureSettings), customLabels.galleryTitle || (locale === "en" ? "Photo Gallery" : "Dokumentasi Momen"), featureSettings.showGallery !== false, galleryVariant);
  const giftSectionHtml = buildUniversalGiftSection(bankAccounts, customLabels.giftTitle || (locale === "en" ? "Digital Gift / Contribution" : "Kado Digital / Donasi"), organizerName || eventTitle, showGift, { giftRegistryHtml, locale });
  const rsvpSectionHtml = buildUniversalRsvpSection(invitationId, locale);
  const wishesSectionHtml = buildUniversalWishesSection(inv.rsvps || [], inv.id, locale);

  return {
    ...inv,
    eventType: "EVENT",
    subEvent,
    invitationLocale: locale,
    primaryTitle: eventTitle,
    secondaryTitle: eventSubtitle || meta.eventLabel,
    eventTitle,
    eventSubtitle,
    organizerName,
    hostName,
    parentsHtml: "",
    dresscodeHtml,
    eventPhotoUrl,
    landingCoverUrl,
    eventDateFormatted,
    guestName,
    audioUrl: finalAudioUrl,
    globalBgUrl: mediaMap.get("GLOBAL_FIXED_BG") || "",
    eventSectionHtml,
    gallerySectionHtml,
    giftSectionHtml,
    rsvpSectionHtml,
    wishesSectionHtml,
    brandWatermarkHtml: `<span style="font-size: 10px; color: var(--canvas-accent, var(--primary));">Powered by ${escapeHtml(platformName)}</span>`,
    metaTagsHtml: `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>${escapeHtml(eventTitle)} — ${escapeHtml(subEvent || (locale === "en" ? "Official Invitation" : "Undangan Resmi"))}</title>
    <meta name="description" content="${escapeHtml(eventSubtitle || meta.profileSub)}">
    <meta property="og:title" content="${escapeHtml(eventTitle)} — ${escapeHtml(subEvent || (locale === "en" ? "Official Invitation" : "Undangan Resmi"))}">
    <meta property="og:image" content="${escapeHtml(absoluteCover)}">
    `,
    featureSettings,
    customLabels,
  };
}
