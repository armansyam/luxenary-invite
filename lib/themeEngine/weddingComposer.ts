import { prisma } from "@/lib/prisma";
import { escapeHtml } from "@/lib/escapeHtml";
import { jsonForInlineScript } from "@/lib/safeJson";
import { safeHref, safeExternalUrl } from "@/lib/safeUrl";
import { safeCssColor } from "@/lib/safeCss";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { getAdminSetting, hasPlanCapability } from "@/lib/settings";
import { safeParseParticipants, type WeddingParticipants, type WeddingPerson } from "@/lib/participantUtils";
import { parseFeatureSettings } from "@/lib/featureSettings";
import { buildCalendarTitle, buildGoogleCalendarUrl } from "@/lib/invitationUtils";
import { buildCheckinQrBaseUrl, buildCheckinQrUrl, qrInitials } from "@/lib/checkinQr";
import { getEventTimezoneOffset, resolveEventTimezone } from "@/lib/lifecycleDates";
import { logger } from "@/lib/logger";
import { applyBuilderTexts, builderTextsOf } from "@/lib/themeBuilder/texts";
import { storedVariant } from "@/lib/themeBuilder/spec";
import { buildCalendarButtonsHtml } from "@/lib/calendarLinks";
import { renderWeddingWishCardsHtml, buildUniversalWishesSectionHtml } from "@/lib/themeEngine/wishes";
import { getLocaleDict, normalizeInvitationLocale } from "@/lib/themeEngine/locale";
import { buildGiftRegistryHtml } from "@/lib/themeEngine/giftRegistry";
import { parseGiftRegistryFromSettings } from "@/lib/giftRegistry";
import { buildWeddingEventsHtml } from "@/lib/themeEngine/events";
import { resolvePublicAppOrigin } from "@/lib/domainUtils";
import { nl2br } from "@/lib/themeEngine/universalSections";
import {
  primaryEventOf,
  collectGalleryPhotos,
  NUMBER_WORDS,
  parseVideoEmbed,
  generateInitialAvatarSvg,
} from "@/lib/themeEngine/shared";

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

  if (primaryEventDate) {
    const d = new Date(primaryEventDate);
    if (!isNaN(d.getTime())) {
      weddingDateDay = String(d.getDate()).padStart(2, "0");
      weddingDateMonth = String(d.getMonth() + 1).padStart(2, "0");
      weddingDateYear = String(d.getFullYear());
      weddingDate = d.toLocaleDateString(dict.intlLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
  }

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
  const liveStreamYoutubeUrl = safeHref(featureSettings.liveStreamYoutubeUrl);
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

  const appOrigin = resolvePublicAppOrigin();
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
