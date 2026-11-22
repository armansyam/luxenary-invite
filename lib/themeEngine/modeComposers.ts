import { prisma } from "@/lib/prisma";
import { escapeHtml } from "@/lib/escapeHtml";
import { safeHref, safeExternalUrl } from "@/lib/safeUrl";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { getAdminSetting, hasPlanCapability } from "@/lib/settings";
import { safeParseParticipants } from "@/lib/participantUtils";
import { parseFeatureSettings } from "@/lib/featureSettings";
import { buildCalendarTitle, buildGoogleCalendarUrl, DEFAULT_THEME_BY_EVENT, resolveSubEventMeta, sanitizeSubEvent } from "@/lib/invitationUtils";
import { logger } from "@/lib/logger";
import { builderTextLabels, builderTextsOf } from "@/lib/themeBuilder/texts";
import { storedVariant } from "@/lib/themeBuilder/spec";
import { getLocaleDict, normalizeInvitationLocale } from "@/lib/themeEngine/locale";
import { buildGiftRegistryHtml } from "@/lib/themeEngine/giftRegistry";
import { parseGiftRegistryFromSettings } from "@/lib/giftRegistry";
import { resolvePublicAppOrigin } from "@/lib/domainUtils";
import {
  nl2br,
  formatDateId,
  countdownTargetOf,
  buildUniversalEventCards,
  buildUniversalGallerySection,
  buildUniversalGiftSection,
  buildUniversalRsvpSection,
  buildUniversalWishesSection,
  buildUniversalCountdown,
  buildUniversalMusicPlayer,
  buildUniversalQrPass,
  buildUniversalMemoriesCta,
  buildUniversalExtraSections,
} from "@/lib/themeEngine/universalSections";
import {
  primaryEventOf,
  primaryEventDateLabel,
  collectGalleryPhotos,
  generateInitialAvatarSvg,
} from "@/lib/themeEngine/shared";

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

  const host = resolvePublicAppOrigin();
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
export async function finalizePersonalData(data: Record<string, any>, inv: any): Promise<Record<string, any>> {
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
export async function finalizeEventData(data: Record<string, any>, inv: any): Promise<Record<string, any>> {
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

  const host = resolvePublicAppOrigin();
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

