import { prisma } from "@/lib/prisma";
import { getGoogleDriveFolderPhotos } from "@/lib/driveHelper";
import { escapeHtml } from "@/lib/escapeHtml";

function nl2br(str: string): string {
  if (!str) return "";
  return escapeHtml(str).replace(/\r\n|\r|\n/g, "<br />");
}

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bgLight: string;
  bgDark: string;
  textDark: string;
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  champagne: {
    id: "champagne",
    name: "Royal Champagne Gold",
    primary: "#a67c52",
    secondary: "#7a5430",
    accent: "#b38b4d",
    bgLight: "#faf7f2",
    bgDark: "#1a1614",
    textDark: "#2b2725",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Green & Gold",
    primary: "#1b4332",
    secondary: "#2d6a4f",
    accent: "#c9a227",
    bgLight: "#f2f7f4",
    bgDark: "#0b1c14",
    textDark: "#132a20",
  },
  burgundy: {
    id: "burgundy",
    name: "Burgundy & Rose Gold",
    primary: "#54192b",
    secondary: "#7a253f",
    accent: "#d4a373",
    bgLight: "#faf2f4",
    bgDark: "#1c070e",
    textDark: "#2c0e17",
  },
  sage: {
    id: "sage",
    name: "Botanical Sage Green",
    primary: "#4a5d4e",
    secondary: "#627d68",
    accent: "#b89f81",
    bgLight: "#f1f5f2",
    bgDark: "#141c16",
    textDark: "#212d24",
  },
  terracotta: {
    id: "terracotta",
    name: "Warm Terracotta & Sand",
    primary: "#8c583a",
    secondary: "#a86b47",
    accent: "#c99a57",
    bgLight: "#fdf8f4",
    bgDark: "#21150e",
    textDark: "#2c1c13",
  },
  monochrome: {
    id: "monochrome",
    name: "Monochrome Dark & Silver",
    primary: "#262626",
    secondary: "#404040",
    accent: "#c0a062",
    bgLight: "#f5f5f5",
    bgDark: "#0f0f0f",
    textDark: "#171717",
  },
};

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

  return trimmed;
}

export async function composeTemplateData(invitationId: string) {
  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      media: true,
      rsvps: {
        orderBy: { respondedAt: "desc" },
        take: 30,
      },
    },
  });

  if (!inv) return null;

  const mediaMap = new Map<string, string>();
  for (const m of inv.media) {
    if (m.localPath) mediaMap.set(String(m.mediaSlot), m.localPath);
  }

  let events = [];
  try {
    events = typeof inv.eventData === "string" ? JSON.parse(inv.eventData) : inv.eventData || [];
  } catch (e) {
    events = [];
  }

  let loveStories = [];
  try {
    loveStories = typeof inv.loveStory === "string" ? JSON.parse(inv.loveStory) : inv.loveStory || [];
  } catch (e) {
    loveStories = [];
  }

  let bankAccounts = [];
  try {
    bankAccounts = typeof inv.bankAccounts === "string" ? JSON.parse(inv.bankAccounts) : inv.bankAccounts || [];
  } catch (e) {
    bankAccounts = [];
  }

  let featureSettings: any = {};
  try {
    featureSettings = typeof inv.featureSettings === "string" ? JSON.parse(inv.featureSettings) : inv.featureSettings || {};
  } catch (e) {
    featureSettings = {};
  }

  const activePaletteId = featureSettings.colorPalette || "champagne";
  const palette = COLOR_PALETTES[activePaletteId] || COLOR_PALETTES.champagne;

  const isNoPhoto = Boolean(featureSettings.isNoPhoto);
  const showStory = featureSettings.showStory !== undefined ? Boolean(featureSettings.showStory) : true;
  const showGallery = featureSettings.showGallery !== undefined ? Boolean(featureSettings.showGallery) : true;
  const showGift = featureSettings.showGift !== undefined ? Boolean(featureSettings.showGift) : true;
  const showDresscode = featureSettings.showDresscode !== undefined ? Boolean(featureSettings.showDresscode) : true;
  const showQrCheckin = featureSettings.showQrCheckin !== undefined ? Boolean(featureSettings.showQrCheckin) : true;
  const showLiveStream = featureSettings.showLiveStream !== undefined ? Boolean(featureSettings.showLiveStream) : true;
  const showFilter = featureSettings.showFilter !== undefined ? Boolean(featureSettings.showFilter) : true;
  const showTurutMengundang = featureSettings.showTurutMengundang !== undefined ? Boolean(featureSettings.showTurutMengundang) : true;

  // Resolve Photos (Theme-Aware Fallbacks)
  const themeFolder = inv.themeId || "kalandra";
  const coverUrl = mediaMap.get("LANDING_COVER") || `/demo/${themeFolder}/cover.webp`;
  const homePhotoUrl = mediaMap.get("HOME_PHOTO") || `/demo/${themeFolder}/home.webp`;
  const sidebarUrl = mediaMap.get("DESKTOP_SIDEBAR") || coverUrl;
  const fixedBgUrl = mediaMap.get("GLOBAL_FIXED_BG") || sidebarUrl || `/demo/${themeFolder}/background.webp`;
  const groomPhoto = mediaMap.get("GROOM_PHOTO") || `/demo/${themeFolder}/groom.webp`;
  const bridePhoto = mediaMap.get("BRIDE_PHOTO") || `/demo/${themeFolder}/bride.webp`;
  const closingPhotoUrl = mediaMap.get("CLOSING_COVER") || null;

  // Dynamic Couple Display Order Resolution
  const isGroomFirst = featureSettings.displayOrder === "GROOM_FIRST" || (!featureSettings.displayOrder && Boolean(inv.groomName));

  const groomName = inv.groomName ?? inv.groomNickname ?? "Didan Faadhilah";
  const brideName = inv.brideName ?? inv.brideNickname ?? "Nasha Selsabilla";
  const groomNickname = inv.groomNickname ?? inv.groomName ?? "Didan";
  const brideNickname = inv.brideNickname ?? inv.brideName ?? "Nasha";
  const groomDisplayName = inv.groomName ?? inv.groomNickname ?? "Didan Faadhilah, S.T.";
  const brideDisplayName = inv.brideName ?? inv.brideNickname ?? "Nasha Selsabilla, S.Ds.";
  const groomParents = inv.groomParents ?? "Putra dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti";
  const brideParents = inv.brideParents ?? "Putri dari Bapak Tomm Posma & Ibu Endang Noffiyanti";
  const groomInstagram = (inv.groomInstagram ?? "didanfaadhilah").replace(/^@+/, "");
  const brideInstagram = (inv.brideInstagram ?? "nashasl").replace(/^@+/, "");

  // 1st Host vs 2nd Host
  const firstName = isGroomFirst ? groomNickname : brideNickname;
  const secondName = isGroomFirst ? brideNickname : groomNickname;
  const firstFullName = isGroomFirst ? groomName : brideName;
  const secondFullName = isGroomFirst ? brideName : groomName;
  const firstDisplayName = isGroomFirst ? groomDisplayName : brideDisplayName;
  const secondDisplayName = isGroomFirst ? brideDisplayName : groomDisplayName;
  const firstRole = isGroomFirst ? "The Groom" : "The Bride";
  const secondRole = isGroomFirst ? "The Bride" : "The Groom";
  const firstRoleLabel = isGroomFirst ? "Mempelai Pria" : "Mempelai Wanita";
  const secondRoleLabel = isGroomFirst ? "Mempelai Wanita" : "Mempelai Pria";
  const firstParentLabel = isGroomFirst ? "Putra Dari" : "Putri Dari";
  const secondParentLabel = isGroomFirst ? "Putri Dari" : "Putra Dari";
  const firstParents = isGroomFirst ? groomParents : brideParents;
  const secondParents = isGroomFirst ? brideParents : groomParents;
  const firstInstagram = isGroomFirst ? groomInstagram : brideInstagram;
  const secondInstagram = isGroomFirst ? brideInstagram : groomInstagram;
  const firstPhotoUrl = isGroomFirst ? groomPhoto : bridePhoto;
  const secondPhotoUrl = isGroomFirst ? bridePhoto : groomPhoto;

  // Date Resolution
  const firstEventDate = events && events[0]?.date ? events[0].date : "2026-10-05";
  let targetDate = `${firstEventDate}T08:00:00`;
  let weddingDateDay = "05";
  let weddingDateMonth = "10";
  let weddingDateYear = "2026";
  let weddingDate = "Senin, 05 Oktober 2026";

  try {
    const d = new Date(firstEventDate);
    if (!isNaN(d.getTime())) {
      weddingDateDay = String(d.getDate()).padStart(2, "0");
      weddingDateMonth = String(d.getMonth() + 1).padStart(2, "0");
      weddingDateYear = String(d.getFullYear());
      weddingDate = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
  } catch {}

  // 1. Dynamic Events HTML with Smart Location & Maps Deduplication
  const rawEventsList = Array.isArray(events) ? events : [];

  // Detect whether all events share the exact same location and mapsUrl
  const normalizeLoc = (s: string) => (s || "").trim().toLowerCase();
  const firstDate = (rawEventsList[0]?.date || "").trim();
  const firstLoc = normalizeLoc(rawEventsList[0]?.location);
  const firstAddr = normalizeLoc(rawEventsList[0]?.address);
  const firstMap = (rawEventsList[0]?.mapsUrl || "").trim();

  const isSameLocationForAll = rawEventsList.length > 1 && rawEventsList.every((ev: any) => {
    const d = (ev.date || "").trim();
    const l = normalizeLoc(ev.location);
    const a = normalizeLoc(ev.address);
    const m = (ev.mapsUrl || "").trim();
    const isSameDate = !d || !firstDate || d === firstDate;
    const isSameLocation = (l === firstLoc || (!l && firstLoc)) && (a === firstAddr || (!a && firstAddr));
    const isSameMapsUrl = m === firstMap || (!m && firstMap);
    return isSameDate && isSameLocation && isSameMapsUrl;
  });

  let eventsHtml = "";
  if (rawEventsList.length > 0) {
    if (isSameLocationForAll) {
      // Skenario 1: Lokasi & Maps Sama (Satu Tempat, Beda Jam) -> Tampilkan 1 Blok Maps Bersama di Bawah
      const sessionsListHtml = rawEventsList.map((ev: any, idx: number) => `
        <div class="event-block-item unified-session">
          <span class="ev-cat">${(ev.badge || (idx === 0 ? "SAKRAMEN / AKAD" : "RESEPSI")).toUpperCase()}</span>
          <h3 class="ev-name serif">${(ev.title || (idx === 0 ? "Akad Nikah" : "Resepsi Pernikahan")).toUpperCase()}</h3>
          ${ev.time ? `<p class="ev-time">${ev.time}</p>` : ""}
          ${ev.notes ? `<p class="ev-notes" style="font-size:0.75rem; font-style:italic; margin-top:0.3rem; color:rgba(255,255,255,0.7);">${nl2br(ev.notes)}</p>` : ""}
        </div>
      `).join("");

      const unifiedVenue = rawEventsList[0]?.location || "";
      const unifiedAddress = rawEventsList[0]?.address || "";
      const unifiedMapUrl = rawEventsList[0]?.mapsUrl || "";

      eventsHtml = `
        <div class="events-unified-container">
          <div class="events-sessions-stack">
            ${sessionsListHtml}
          </div>
          ${(unifiedVenue || unifiedAddress || unifiedMapUrl) ? `
          <div class="event-unified-venue-card">
            <span class="venue-card-lbl">LOKASI ACARA</span>
            ${unifiedVenue ? `<h4 class="ev-venue-unified serif">${unifiedVenue}</h4>` : ""}
            ${unifiedAddress ? `<p class="ev-addr-unified">${unifiedAddress}</p>` : ""}
            ${unifiedMapUrl ? `
              <a href="${unifiedMapUrl}" target="_blank" rel="noreferrer" class="btn-map-outline">
                BUKA PETUNJUK ARAH (MAPS)
              </a>
            ` : ""}
          </div>
          ` : ""}
        </div>
      `;
    } else {
      // Skenario 2: Lokasi Berbeda (Misal: Akad di Masjid, Resepsi di Hotel) -> Tampilkan Maps per Acara
      eventsHtml = rawEventsList.map((ev: any, idx: number) => `
        <div class="event-block-item">
          <span class="ev-cat">${(ev.badge || (idx === 0 ? "SAKRAMEN / AKAD" : "RESEPSI")).toUpperCase()}</span>
          <h3 class="ev-name serif">${(ev.title || (idx === 0 ? "Akad Nikah" : "Resepsi Pernikahan")).toUpperCase()}</h3>
          ${ev.time ? `<p class="ev-time">${ev.time}</p>` : ""}
          ${ev.location ? `<h4 class="ev-venue">${ev.location}</h4>` : ""}
          ${ev.address ? `<p class="ev-addr">${ev.address}</p>` : ""}
          ${ev.notes ? `<p class="ev-notes" style="font-size:0.75rem; font-style:italic; margin-top:0.3rem; color:rgba(255,255,255,0.7);">${nl2br(ev.notes)}</p>` : ""}
          ${ev.mapsUrl ? `
            <a href="${ev.mapsUrl}" target="_blank" rel="noreferrer" class="btn-map-outline">
              BUKA MAPS
            </a>
          ` : ""}
        </div>
      `).join("");
    }
  }

  // Custom Labels & Section Titles Override (with Zero-Hardcode Fallbacks)
  const customLabels = {
    openBtn: "Buka Undangan",
    coverSubtitle: "Tanpa mengurangi rasa hormat, kami mengundang Anda untuk menghadiri acara pernikahan kami.",
    rsvpTitle: "Konfirmasi Kehadiran & Doa",
    ...(featureSettings.customLabels || {}),
  };
  const quoteSectionTitle = customLabels.quoteTitle || featureSettings.quoteTitle || "Pappaseng & Doa";
  const quoteSectionEyebrow = customLabels.quoteEyebrow || "WALIMATUL 'URSY";
  const coupleSectionTitle = customLabels.coupleTitle || "Mempelai";
  const coupleSectionSub = customLabels.coupleSub || "Dua Hati Bersatu Dalam Janji Suci";
  const eventsSectionTitle = customLabels.eventsTitle || "Rangkaian Acara";
  const eventsSectionSub = customLabels.eventsSub || "Waktu & Tempat Pelaksanaan";
  const storySectionTitle = customLabels.storyTitle || "Kisah Cinta";
  const gallerySectionTitle = customLabels.galleryTitle || "Galeri Momen";
  const gallerySectionEyebrow = customLabels.galleryEyebrow || "GALLERY";
  const galleryQuote = customLabels.galleryQuote || "And I'd choose you; in a hundred lifetimes, in a hundred worlds, in any version of reality, I'd find you and I'd choose you.";
  const giftSectionTitle = customLabels.giftTitle || "Tanda Kasih";
  const giftSectionEyebrow = customLabels.giftEyebrow || "WEDDING GIFT";
  const giftSectionDesc = customLabels.giftDesc || "Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Dan jika memberi adalah ungkapan tanda kasih Anda, Anda dapat memberi kado secara cashless:";
  const wishesSectionTitle = customLabels.wishesTitle || "Ucapan & Doa Restu";
  const wishesSectionSub = customLabels.wishesSub || "Kirimkan Pesan Manis Untuk Mempelai";

  // 2. Dynamic Journey of Love / Story Module
  let storySectionHtml = "";
  if (showStory) {
    const rawStories = Array.isArray(loveStories) && loveStories.length > 0
      ? loveStories
      : [
        { title: "Awal Bertemu", date: "2020", content: "Pertama kali dipertemukan dalam sebuah kegiatan akademis di kampus." },
        { title: "Lamaran Resmi", date: "2025", content: "Momen sakral saat kedua keluarga besar saling bersilaturahmi dan bersepakat." },
      ];

    const storyItemsHtml = rawStories.map((st: any, idx: number) => {
      const numWord = NUMBER_WORDS[idx] || String(idx + 1);
      let heading = st.title || "";
      if (!heading.toLowerCase().startsWith("chapter")) {
        heading = `Chapter ${numWord}: ${heading}`;
      }
      return `
        <div class="journey-chapter-item">
          <h4 class="chapter-heading">${heading}</h4>
          <p class="chapter-desc">${nl2br(st.content || st.description || "")}</p>
        </div>
      `;
    }).join("");

    storySectionHtml = `
      <section class="sec-journey" id="story">
        <div class="journey-card">
          <div class="journey-previews">
            <div class="jp-item"><img src="${firstPhotoUrl}" alt="Journey Preview 1" loading="lazy"></div>
            <div class="jp-item"><img src="${secondPhotoUrl}" alt="Journey Preview 2" loading="lazy"></div>
          </div>
          <h2 class="journey-title serif" data-lux-field="customLabels.storyTitle">${storySectionTitle}</h2>
          <div class="journey-chapters">
            ${storyItemsHtml}
          </div>
          <div class="journey-footer">
            <div class="jf-line"></div>
            <span class="jf-signature serif">${firstName} &amp; ${secondName}</span>
          </div>
        </div>
      </section>
    `;
  }

  // 3. Gathering All Available Photos for OUR MOMENTS Gallery
  let allPhotos: string[] = [];
  const galleryDriveFolderUrl = featureSettings.galleryDriveFolderUrl || "";
  const customPhotosList = featureSettings.galleryPhotosList || "";

  if (galleryDriveFolderUrl && galleryDriveFolderUrl.trim() !== "") {
    try {
      const drivePhotos = await getGoogleDriveFolderPhotos(galleryDriveFolderUrl);
      if (drivePhotos && drivePhotos.length > 0) allPhotos.push(...drivePhotos);
    } catch (err) {}
  }

  if (customPhotosList && customPhotosList.trim() !== "") {
    const manualUrls = customPhotosList.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 5);
    manualUrls.forEach((u: string) => {
      if (!allPhotos.includes(u)) allPhotos.push(u);
    });
  }

  const galleryMedia = inv.media.filter((m) => String(m.mediaSlot).startsWith("GALLERY"));
  galleryMedia.forEach((gm) => {
    const u = gm.localPath;
    if (u && !allPhotos.includes(u)) allPhotos.push(u);
  });

  if (allPhotos.length === 0) {
    allPhotos = [
      `/demo/${themeFolder}/gallery_01.webp`,
      `/demo/${themeFolder}/gallery_02.webp`,
      `/demo/${themeFolder}/gallery_03.webp`,
      `/demo/${themeFolder}/gallery_04.webp`,
      `/demo/${themeFolder}/gallery_05.webp`,
      `/demo/${themeFolder}/gallery_06.webp`,
      `/demo/${themeFolder}/gallery_07.webp`,
      `/demo/${themeFolder}/gallery_08.webp`,
    ];
  }

  // 4. Video Player HTML
  const videoGalleryRawUrl = featureSettings.videoGalleryUrl || "";
  const embedVideoUrl = parseVideoEmbed(videoGalleryRawUrl);
  let videoPlayerHtml = "";
  if (embedVideoUrl) {
    if (embedVideoUrl.includes("youtube.com/embed") || embedVideoUrl.includes("player.vimeo.com")) {
      videoPlayerHtml = `
        <div class="video-teaser-box" style="margin: 1.5rem auto 2rem; max-width: 480px; width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15);">
          <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
            <iframe 
              src="${embedVideoUrl}" 
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
            <source src="${videoGalleryRawUrl}" type="video/mp4">
          </video>
        </div>
      `;
    }
  }

  // 5. OUR MOMENT Section (Max 10 photos on page + button to open full lightbox)
  let gallerySectionHtml = "";
  if (showGallery) {
    const photosFeedHtml = allPhotos.map((imgUrl, i) => `
      <div class="moment-photo-item" data-idx="${i}" onclick="luxOpenZoom(${i})">
        <img src="${imgUrl}" alt="Our Moment ${i + 1}" loading="lazy" decoding="async">
      </div>
    `).join("");

    const allPhotosGridHtml = allPhotos.map((imgUrl, i) => `
      <div class="full-gallery-item" onclick="luxOpenZoom(${i})">
        <img src="${imgUrl}" alt="Photo ${i + 1}" loading="lazy" decoding="async">
      </div>
    `).join("");

    gallerySectionHtml = `
      <section class="sec-flow" id="moments">
        <span class="sec-eyebrow" data-lux-field="customLabels.galleryEyebrow">${gallerySectionEyebrow}</span>
        <h2 class="sec-main-title serif" data-lux-field="customLabels.galleryTitle">${gallerySectionTitle}</h2>
        <p class="moment-quote serif" data-lux-field="customLabels.galleryQuote">
          “${galleryQuote}”
        </p>

        ${videoPlayerHtml}

        <div class="moments-grid-10">
          ${photosFeedHtml}
        </div>

        <button type="button" class="btn-outline-box btn-show-gallery" onclick="luxOpenFullGallery()">
          LIHAT SEMUA FOTO (${allPhotos.length} FOTO)
        </button>
        
        <style>
          /* OUR MOMENT UNIVERSAL GRID */
          .moments-grid-10 {
            display: grid !important; grid-template-columns: repeat(4, 1fr) !important; grid-auto-flow: dense !important;
            gap: 5px !important; margin-bottom: 2.2rem !important; width: 100% !important;
          }
          .moment-photo-item {
            position: relative !important; overflow: hidden !important; border-radius: 6px !important; cursor: pointer !important;
            border: 1px solid rgba(255,255,255,0.12) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important;
            transition: transform 0.3s ease !important; aspect-ratio: 3/4 !important;
          }
          .moment-photo-item.is-landscape { grid-column: span 2 !important; aspect-ratio: 3/2 !important; }
          .moment-photo-item:hover { transform: scale(1.03) !important; z-index: 2 !important; box-shadow: 0 8px 20px rgba(0,0,0,0.5) !important; }
          .moment-photo-item img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
          .btn-show-gallery { display: inline-block !important; margin-bottom: 0 !important; }
          @media (max-width: 640px) { .moments-grid-10 { grid-template-columns: repeat(3, 1fr) !important; } }

          /* LIGHTBOX MODALS UNIVERSAL */
          .gallery-modal-backdrop {
            position: fixed !important; inset: 0 !important; z-index: 350 !important; background: rgba(7,7,9,0.96) !important; backdrop-filter: blur(20px) !important;
            display: flex !important; flex-direction: column !important; opacity: 0 !important; visibility: hidden !important; transition: all 0.3s ease !important;
            overflow-y: auto !important; padding: 2rem 1.5rem !important;
          }
          .gallery-modal-backdrop.open { opacity: 1 !important; visibility: visible !important; }
          .gallery-modal-container { max-width: 600px !important; width: 100% !important; margin: 0 auto !important; }
          .gallery-modal-header { display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 1.8rem !important; padding-bottom: 1rem !important; border-bottom: 1px solid rgba(255,255,255,0.15) !important; }
          .modal-gallery-title { font-size: 1.8rem !important; color: #fff !important; letter-spacing: 0.1em !important; margin: 0 !important; }
          .gallery-modal-close {
            background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #ffffff !important;
            width: 34px !important; height: 34px !important; border-radius: 50% !important; font-size: 1rem !important; cursor: pointer !important;
            display: flex !important; align-items: center !important; justify-content: center !important;
          }
          .gallery-modal-grid { columns: 4 !important; column-gap: 5px !important; }
          .full-gallery-item {
            break-inside: avoid !important; margin-bottom: 5px !important; overflow: hidden !important; border-radius: 6px !important; cursor: pointer !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
          }
          .full-gallery-item img { width: 100% !important; height: auto !important; display: block !important; transition: transform 0.35s !important; }
          .full-gallery-item:hover img { transform: scale(1.05) !important; }

          /* ZOOM LIGHTBOX UNIVERSAL */
          .lux-zoom-backdrop {
            position: fixed !important; inset: 0 !important; z-index: 99999 !important; background: rgba(0,0,0,0.96) !important; backdrop-filter: blur(16px) !important;
            display: flex !important; align-items: center !important; justify-content: center !important; opacity: 0 !important; visibility: hidden !important; transition: all 0.3s ease !important;
            padding: 1.5rem 1rem !important; touch-action: none !important; overscroll-behavior: contain !important;
          }
          .lux-zoom-backdrop.open { opacity: 1 !important; visibility: visible !important; }
          .lux-zoom-close {
            position: fixed !important; top: 18px !important; right: 18px !important; background: rgba(35,35,38,0.85) !important; backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(255,255,255,0.1) !important; color: #fff !important; width: 42px !important; height: 42px !important; border-radius: 50% !important;
            font-size: 1.2rem !important; cursor: pointer !important; z-index: 100000 !important; display: flex !important; align-items: center !important; justify-content: center !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important; transition: transform 0.2s !important;
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
          <img id="luxZoomActiveImg" src="${allPhotos[0] || ''}" alt="Zoom View">
          <div class="lux-zoom-counter" id="luxZoomCounter">1 / ${allPhotos.length}</div>
        </div>
        <button class="lux-zoom-nav next" onclick="luxNextZoom(event)">›</button>
      </div>

      <script>
        window.LUX_ALL_PHOTOS = ${JSON.stringify(allPhotos)};
        window.luxActivePhotoIdx = 0;

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

        // Smart Puzzle Grid Auto-Packing (100% flush rectangular frame, no holes, randomized shuffle)
        function initSmartPuzzleGallery() {
          const grid = document.querySelector('.moments-grid-10');
          if (!grid) return;
          const items = Array.from(grid.querySelectorAll('.moment-photo-item'));
          if (!items.length) return;

          // Shuffle items randomly on each page refresh
          for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            grid.appendChild(items[j]);
            const temp = items[i];
            items[i] = items[j];
            items[j] = temp;
          }

          let loadedCount = 0;
          items.forEach((item) => {
            const img = item.querySelector('img');
            if (!img) return;

            function processImage() {
              if (img.naturalWidth && img.naturalHeight) {
                if (img.naturalWidth > img.naturalHeight * 1.12) {
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
              processImage();
            } else {
              img.addEventListener('load', processImage);
              img.addEventListener('error', () => { loadedCount++; });
            }
          });

          setTimeout(() => { packPuzzleSlots(items); }, 600);
        }

        function packPuzzleSlots(items) {
          let totalSlots = 0;
          const targetMaxSlots = 12;
          let bestCutoff = items.length;

          for (let i = 0; i < items.length; i++) {
            const slotCost = items[i].classList.contains('is-landscape') ? 2 : 1;
            if (totalSlots + slotCost > targetMaxSlots) break;
            totalSlots += slotCost;
            if (totalSlots % 4 === 0) {
              bestCutoff = i + 1;
            }
          }

          items.forEach((item, idx) => {
            if (idx < bestCutoff) {
              item.style.display = 'block';
            } else {
              item.style.display = 'none';
            }
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
  const qrAccessSectionHtml = showQrCheckin ? `
    <section class="sec-flow" id="checkin">
      <span class="sec-eyebrow">QR CODE CHECK-IN</span>
      <h2 class="sec-main-title serif">KARTU AKSES MASUK</h2>
      <p class="sec-sub">Silakan tunjukkan QR Code ini kepada penerima tamu undangan di lokasi acara.</p>
      
      <div class="access-pass-card">
        <span class="pass-tagline">${featureSettings.weddingTagline || "THE WEDDING OF"}</span>
        <h3 class="pass-names serif">${firstName} <em>&amp;</em> ${secondName}</h3>
        <p class="pass-date">${weddingDate}</p>
        
        <div class="pass-qr-wrapper">
          <img class="pass-qr-img" id="passQrImg" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=Tamu%20Undangan" alt="QR Check-In" style="width:160px; height:160px; display:block; margin:0 auto;">
        </div>

        <div class="pass-guest-box">
          <span class="pass-guest-lbl">KEPADA YTH.</span>
          <h4 class="pass-guest-name serif" id="passGuestName">Tamu Undangan</h4>
        </div>

        <div class="pass-meta-grid">
          <div class="pass-meta-item">
            <span class="pass-meta-lbl">SESI</span>
            <span class="pass-meta-val">Sesi 1 (Akad &amp; Resepsi)</span>
          </div>
          <div class="pass-meta-item">
            <span class="pass-meta-lbl">LIMIT</span>
            <span class="pass-meta-val">1 - 2 Orang</span>
          </div>
        </div>

        <div class="pass-souvenir-bar">
          <span class="souvenir-lbl">VOUCHER SOUVENIR:</span>
          <span class="souvenir-code">SOUVENIR-${inv.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>
    </section>
  ` : "";

  // 6.5. Section: Universal Audio Player
  const finalAudioUrl = featureSettings.showMusic !== false ? (inv.musicUrl || featureSettings.musicUrl || "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3") : "";
  const musicPlayerHtml = finalAudioUrl ? `
    <!-- UNIVERSAL MUSIC PLAYER INJECTED BY THEME ENGINE -->
    <audio id="luxAudioPlayer" loop preload="auto">
      <source src="${finalAudioUrl}" type="audio/mpeg" />
    </audio>
    <script>
      // 1. Universal Audio Player
      function luxToggleAudio() {
        const audio = document.getElementById('luxAudioPlayer');
        if (!audio) return;
        const fab = document.getElementById('musicFab') || document.getElementById('musicToggle') || document.querySelector('.audio-fab, .music-fab, .btn-music');
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
        const targetStr = "${targetDate}";
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
        const btn = e.target.querySelector('button[type="submit"]');
        if(btn) {
          btn.disabled = true;
          btn.innerHTML = 'Memproses...';
        }
        
        // Mock processing for now. Will connect to API.
        setTimeout(() => {
          const nameInput = document.getElementById('rsvpName');
          const name = nameInput ? nameInput.value : "Tamu";
          alert('Terima kasih, konfirmasi dan doa restu atas nama ' + name + ' telah terkirim!');
          e.target.reset();
          if(btn) {
            btn.disabled = false;
            btn.innerHTML = 'Kirim Konfirmasi';
          }
        }, 800);
      }
    </script>
  ` : "";

  // 7. Section: Dress Code
  const dressCodeColors = featureSettings.dressCodeColors || "";
  const dressCodeNote = featureSettings.dressCodeNote || "";
  let dressCodeHtml = "";
  if (showDresscode && (dressCodeColors || dressCodeNote)) {
    const colorBadges = dressCodeColors
      ? dressCodeColors.split(",").map((c: string) => `<span style="width:28px; height:28px; border-radius:50%; background:${c.trim()}; display:inline-block; border:2px solid rgba(255,255,255,0.7); box-shadow:0 4px 10px rgba(0,0,0,0.35);"></span>`).join("")
      : `<span style="width:28px; height:28px; border-radius:50%; background:#a67c52; display:inline-block; border:2px solid rgba(255,255,255,0.7);"></span><span style="width:28px; height:28px; border-radius:50%; background:#2b2725; display:inline-block; border:2px solid rgba(255,255,255,0.7);"></span><span style="width:28px; height:28px; border-radius:50%; background:#faf7f2; display:inline-block; border:2px solid rgba(255,255,255,0.7);"></span>`;

    dressCodeHtml = `
      <section class="sec-flow" id="dresscode">
        <span class="sec-eyebrow">A GUIDE TO</span>
        <h2 class="sec-main-title serif">DRESS CODES</h2>
        <p class="sec-sub">Kami mengundang tamu undangan untuk mengenakan palet warna berikut untuk keseragaman foto:</p>
        <div style="display:flex; justify-content:center; gap:12px; margin: 1.5rem 0;">${colorBadges}</div>
        ${dressCodeNote ? `<p style="margin:0; font-size:0.8rem; color:rgba(255,255,255,0.75); line-height:1.5;">${escapeHtml(dressCodeNote)}</p>` : ""}
      </section>
    `;
  }

  // 8. Section: Live Streaming (Live Wedding)
  const liveStreamYoutubeUrl = featureSettings.liveStreamYoutubeUrl || inv.liveStreamUrl || "";
  const liveStreamInstagramUrl = featureSettings.liveStreamInstagramUrl || "";
  const liveStreamZoomUrl = featureSettings.liveStreamZoomUrl || "";
  let liveStreamingHtml = "";
  if (showLiveStream && (liveStreamYoutubeUrl || liveStreamInstagramUrl || liveStreamZoomUrl)) {
    const liveTimeStr = rawEventsList[0]?.time ? ` • ${rawEventsList[0].time}` : "";
    liveStreamingHtml = `
      <section class="sec-flow" id="live">
        <span class="sec-eyebrow">VIRTUAL CEREMONY</span>
        <h2 class="sec-main-title serif">LIVE WEDDING</h2>
        <p class="sec-sub">${weddingDate}${liveTimeStr}</p>
        <p class="sec-sub" style="margin-top:0.4rem;">Bagi keluarga &amp; sahabat yang berhalangan hadir langsung, prosesi pernikahan dapat disaksikan melalui siaran virtual:</p>
        <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:0.8rem; margin-top:1.5rem;">
          ${liveStreamYoutubeUrl ? `<a href="${liveStreamYoutubeUrl}" target="_blank" class="btn-map-outline">YOUTUBE LIVE ↗</a>` : ""}
          ${liveStreamInstagramUrl ? `<a href="${liveStreamInstagramUrl}" target="_blank" class="btn-map-outline">INSTAGRAM LIVE ↗</a>` : ""}
          ${liveStreamZoomUrl ? `<a href="${liveStreamZoomUrl}" target="_blank" class="btn-map-outline">ZOOM MEETING ↗</a>` : ""}
        </div>
      </section>
    `;
  }

  // 9. Section: Wedding Frame / Instagram Filter
  const instagramFilterUrl = featureSettings.instagramFilterUrl || "";
  let weddingFilterHtml = "";
  if (showFilter && instagramFilterUrl) {
    weddingFilterHtml = `
      <section class="sec-flow" id="frame">
        <span class="sec-eyebrow">CAPTURE YOUR MOMENT</span>
        <h2 class="sec-main-title serif">WEDDING FRAME</h2>
        <p class="sec-sub">Unggah dan abadikan momen Anda saat menghadiri pernikahan kami menggunakan Wedding Frame resmi kami di Instagram.</p>
        <a href="${instagramFilterUrl}" target="_blank" class="btn-outline-box" style="margin-top:1.8rem;">BUKA FILTER INSTAGRAM ↗</a>
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
        <span class="sec-eyebrow">KELUARGA BESAR</span>
        <h2 class="sec-main-title serif">TURUT MENGUNDANG</h2>
        <p class="sec-sub">Keluarga Besar &amp; Kerabat yang turut berbahagia:</p>
        <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:1.5rem; font-size:0.88rem; color:rgba(255,255,255,0.85);">
          ${lines.map((line: string) => `<p style="margin:0; padding:0.4rem 0; border-bottom:1px dashed rgba(255,255,255,0.12);">${escapeHtml(line.trim())}</p>`).join("")}
        </div>
      </section>
    `;
  }

  // 11. Section: Bank Accounts & Gift Section
  let giftSectionHtml = "";
  const qrisImageUrl = featureSettings.qrisImageUrl || "";
  if (showGift) {
    const rawBanks = Array.isArray(bankAccounts) && bankAccounts.length > 0
      ? bankAccounts
      : [{ bank: "BCA", number: "7330497518", name: isGroomFirst ? groomName : brideName }];

    const bankCardsHtml = rawBanks.map((b: any) => `
      <div class="bank-card">
        <span class="bank-label">${b.bank || "BCA"}</span>
        <span class="bank-owner">a.n ${b.name || (isGroomFirst ? groomName : brideName)}</span>
        <div class="bank-row">
          <span class="bank-number">${b.number}</span>
          <button class="btn-copy" onclick="copyText('${b.number}')">Salin</button>
        </div>
      </div>
    `).join("");

    giftSectionHtml = `
      <section class="sec-flow" id="gift">
        <span class="sec-eyebrow">WEDDING GIFT</span>
        <h2 class="sec-main-title serif">TANDA KASIH</h2>
        <p class="sec-sub">
          Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Bagi Anda yang ingin memberikan tanda kasih:
        </p>

        <div class="gift-tabs">
          <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">Transfer Bank / QRIS</button>
          <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">Kirim Kado</button>
        </div>

        <div id="giftTabAmplop">
          ${bankCardsHtml}
          ${qrisImageUrl ? `
            <div class="bank-card" style="text-align:center;">
              <span class="bank-label" style="margin-bottom:0.6rem;">Scan QRIS Tanda Kasih</span>
              <img src="${qrisImageUrl}" alt="QRIS" style="width:160px; height:160px; object-fit:contain; margin:0 auto; background:#fff; padding:6px; border-radius:8px;">
            </div>
          ` : ""}
        </div>

        <div id="giftTabKado" style="display:none;" class="bank-card">
          <span class="bank-label">Alamat Pengiriman Kado</span>
          <p style="font-size:0.8rem; color:rgba(255,255,255,0.7); line-height:1.5; margin:0.4rem 0 0.8rem;">
            ${nl2br(inv.shippingAddress || "Jl. Pengantin No. 12, Makassar")}
          </p>
          <button class="btn-copy" onclick="copyText('${escapeHtml(inv.shippingAddress || "Jl. Pengantin No. 12, Makassar")}')">Salin Alamat</button>
        </div>
      </section>
    `;
  }

  // 12. Section: RSVP & Wishes Feed
  const wishesHtml = inv.rsvps.length > 0
    ? inv.rsvps.map((r: any) => `
      <div class="wish-item">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
          <span class="wish-name">${escapeHtml(r.guestName)}</span>
          <span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:${r.status === 'hadir' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}; color:${r.status === 'hadir' ? '#4ade80' : '#f87171'}; font-weight:600;">${r.status === 'hadir' ? 'Hadir' : 'Berhalangan'}</span>
        </div>
        ${r.message ? `<p class="wish-msg">“${escapeHtml(r.message)}”</p>` : ""}
      </div>
    `).join("")
    : `<p style="font-size:0.8rem; font-style:italic; color:rgba(255,255,255,0.5); text-align:center;">Jadilah yang pertama mengirimkan ucapan &amp; doa restu.</p>`;


  // 13. QR Access Card HTML for Modal
  const qrAccessCardHtml = `
    <div style="text-align:center; padding:1rem 0;">
      <span style="font-size:0.65rem; letter-spacing:0.3em; text-transform:uppercase; color:rgba(255,255,255,0.6); display:block; margin-bottom:0.4rem; font-weight:600;">Check-In Ticket</span>
      <h3 style="font-size:1.4rem; color:#fff; font-family:'Cormorant Garamond',serif; margin-bottom:0.2rem;" id="modalGuestName">Tamu Undangan</h3>
      <p style="font-size:0.75rem; color:rgba(255,255,255,0.65); margin-bottom:1.2rem;">Tunjukkan kode QR ini kepada penerima tamu di lokasi acara.</p>
      <div style="background:#ffffff; padding:14px; display:inline-block; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <img class="pass-qr-img" id="modalQrImg" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=Tamu%20Undangan" alt="QR Check-In" style="width:160px; height:160px; display:block; margin:0 auto;">
      </div>
    </div>
  `;

  // Google Calendar URL
  const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`The Wedding of ${firstName} & ${secondName}`)}&dates=${weddingDateYear}${weddingDateMonth}${weddingDateDay}T010000Z/${weddingDateYear}${weddingDateMonth}${weddingDateDay}T140000Z&location=${encodeURIComponent(events[0]?.location || "Makassar")}`;

  // ─── Guest Memories (After-Event Moments Drop & Stream) ───
  const showGuestMemories = featureSettings.showGuestMemories !== false;
  const memoriesSectionEyebrow = customLabels.memoriesEyebrow || "AFTER-EVENT MEMORIES";
  const memoriesSectionTitle = customLabels.memoriesTitle || "Abadikan Momen Indah";
  const memoriesSectionSubtitle = customLabels.memoriesSubtitle || "Punya foto candid seru selama menghadiri pernikahan kami? Bagikan momen spesial Anda langsung ke album pribadi kami.";

  const guestMemories = await prisma.guestMemory.findMany({
    where: { invitationId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  let memoriesSectionHtml = "";
  if (showGuestMemories) {
    // 10 Random samples from full memory pool
    const shuffledMemories = [...guestMemories].sort(() => 0.5 - Math.random()).slice(0, 10);
    const totalMemCount = shuffledMemories.length;
    const isMarquee = totalMemCount > 5;

    const storyAvatarsHtml = shuffledMemories.map((sm: any) => `
      <div class="lux-story-circle-item" style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; width: 68px; cursor: pointer;" onclick="luxOpenMemoryPreview('${sm.mediaUrl}', '${sm.senderName}', '${(sm.message || "").replace(/'/g, "\\'")}', '${sm.mediaType}')">
        <div style="width: 58px; height: 58px; border-radius: 9999px; padding: 2px; background: linear-gradient(135deg, #d4af37, #f59e0b, #eab308); box-shadow: 0 0 10px rgba(212,175,55,0.35);">
          <div style="width: 100%; height: 100%; border-radius: 9999px; overflow: hidden; background: #1c1917; border: 2px solid #0c0a09; display: flex; align-items: center; justify-content: center;">
            <img src="${sm.thumbnailUrl || sm.mediaUrl}" alt="${sm.senderName}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        </div>
        <span style="font-size: 11px; max-width: 65px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; opacity: 0.85; color: inherit; text-align: center;">
          ${(sm.senderName || "Tamu").split(" ")[0]}
        </span>
      </div>
    `).join("");

    let shareMomentUrl = "/sharemoment";
    if (inv.subdomain && inv.subdomain !== "demo") {
      shareMomentUrl = `/s/${inv.subdomain}/sharemoment`;
    } else if (inv.invitationSlug) {
      shareMomentUrl = `/${inv.invitationSlug}/sharemoment`;
    } else {
      shareMomentUrl = `/demo/${themeFolder}/sharemoment`;
    }

    const fullGalleryUrl = inv.subdomain && inv.subdomain !== "demo"
      ? `/s/${inv.subdomain}/memories`
      : `/${inv.invitationSlug}/memories`;

    memoriesSectionHtml = `
      <section class="sec-flow slide-section" id="guest-memories" style="position: relative; padding: 3rem 1rem;">
        <div class="sec-content-box reveal-on-scroll" style="max-width: 580px; margin: 0 auto; text-align: center;">
          <span class="sec-eyebrow" data-lux-field="customLabels.memoriesEyebrow">${memoriesSectionEyebrow}</span>
          <h2 class="sec-main-title serif" data-lux-field="customLabels.memoriesTitle">${memoriesSectionTitle}</h2>
          <p class="moment-quote serif" data-lux-field="customLabels.memoriesSubtitle" style="max-width: 480px; margin: 0 auto 1.5rem auto; font-size: 0.82rem; line-height: 1.6; opacity: 0.8;">
            ${memoriesSectionSubtitle}
          </p>

          <!-- 1. TOMBOL UPLOAD MOMEN (DIRECT LINK) -->
          <a href="${shareMomentUrl}" style="display: block; width: 100%; max-width: 360px; margin: 0 auto 1.8rem auto; padding: 14px 20px; border-radius: 50px; background: #ffffff; color: #000000; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.05em; text-align: center; text-decoration: none; box-shadow: 0 4px 15px rgba(255,255,255,0.18); transition: transform 0.15s ease;">
            BAGIKAN FOTO MOMEN ANDA
          </a>

          <!-- 2. HIGHLIGHT LINGKARAN (5 LINGKARAN DI LAYAR, LOOPING MARQUEE JIKA > 5) -->
          ${shuffledMemories.length > 0 ? `
            <div class="memories-highlights-wrapper" style="width: 100%; max-width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 14px 10px; margin-bottom: 1.5rem; overflow: hidden;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 10px; font-weight: 700; opacity: 0.85; padding: 0 6px;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 7px; height: 7px; border-radius: 99px; background: #10b981; display: inline-block;"></span>
                  KAMI SUDAH MEMBAGIKAN MOMEN
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
            <a href="${fullGalleryUrl}" class="btn-outline-box" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px; font-size: 12px; font-weight: 700; border-radius: 50px; text-decoration: none; border: 1px solid currentColor; color: inherit; transition: all 0.2s ease;">
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
              <input type="text" id="luxMemSenderName" name="senderName" required placeholder="Contoh: Budi Santoso & Istri" style="width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #fff; font-size: 14px; box-sizing: border-box; outline: none;">
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #d6d3d1;">Email Anda * <span style="font-weight: 400; opacity: 0.7; font-size: 11px;">(Untuk verifikasi pengirim)</span></label>
              <input type="email" id="luxMemSenderEmail" name="senderEmail" required placeholder="contoh: budi@gmail.com" style="width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #fff; font-size: 14px; box-sizing: border-box; outline: none;">
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #d6d3d1;">Pilih Foto atau Video *</label>
              <input type="file" id="luxMemFileInput" accept="image/*,video/mp4,video/quicktime" required onchange="luxHandleFileSelect(event)" style="display: none;">
              
              <div onclick="document.getElementById('luxMemFileInput').click()" style="border: 2px dashed rgba(255,255,255,0.25); border-radius: 14px; padding: 20px 14px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.03); transition: all 0.2s;">
                <div style="font-size: 28px; margin-bottom: 4px;">📷 / 🎥</div>
                <div style="font-size: 13px; font-weight: 600; color: #f5f5f4;">Klik untuk Memilih Foto atau Video</div>
                <div style="font-size: 11px; opacity: 0.6; margin-top: 2px;">Foto otomatis di-optimasi • Video maks. 25 MB (±30 dtk)</div>
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
              <textarea id="luxMemMessage" name="message" rows="2" placeholder="Ceritakan momen seru ini..." style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #fff; font-size: 13px; box-sizing: border-box; resize: none; outline: none;"></textarea>
            </div>

            <!-- Feedback & Progress -->
            <div id="luxMemProgressBox" style="display: none; margin-top: 6px;">
              <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #d4a373;" id="luxMemProgressText">Mengoptimasi & Mengunggah...</div>
              <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.15); border-radius: 999px; overflow: hidden;">
                <div id="luxMemProgressBar" style="width: 30%; height: 100%; background: #d4a373; transition: width 0.3s ease;"></div>
              </div>
            </div>

            <div id="luxMemSuccessBox" style="display: none; padding: 14px; border-radius: 12px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; font-size: 13px; font-weight: 600; text-align: center;">
              ✓ Foto kenangan Anda berhasil disimpan ke album pengantin!
            </div>

            <button type="submit" id="luxMemSubmitBtn" style="margin-top: 10px; width: 100%; padding: 14px; border-radius: 14px; border: none; background: #d4a373; color: #1c1917; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s;">
              🚀 KIRIM KE ALBUM PENGANTIN
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
                    resolve(new File([blob], file.name.replace(/\\.[^/.]+$/, "") + ".webp", { type: "image/webp" }));
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

          if (file.size > 25 * 1024 * 1024) {
            alert('Ukuran file maksimal adalah 25 MB.');
            e.target.value = '';
            return;
          }

          window.luxSelectedMemoryFile = file;
          const previewBox = document.getElementById('luxMemPreviewBox');
          const previewImg = document.getElementById('luxMemPreviewImg');
          const fileName = document.getElementById('luxMemFileName');

          if (previewBox && fileName) {
            fileName.textContent = file.name + " (" + (file.size / (1024 * 1024)).toFixed(1) + " MB)";
            previewBox.style.display = 'flex';
            if (file.type.startsWith('image/') && previewImg) {
              previewImg.src = URL.createObjectURL(file);
              previewImg.style.display = 'block';
            } else if (previewImg) {
              previewImg.style.display = 'none';
            }
          }
        };

        window.luxClearFileSelect = function() {
          window.luxSelectedMemoryFile = null;
          const input = document.getElementById('luxMemFileInput');
          if (input) input.value = '';
          const previewBox = document.getElementById('luxMemPreviewBox');
          if (previewBox) previewBox.style.display = 'none';
        };

        window.luxSubmitMemory = async function(e) {
          e.preventDefault();
          if (!window.luxSelectedMemoryFile) {
            alert('Silakan pilih foto atau video terlebih dahulu.');
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
            if (progressText) progressText.textContent = "Mengoptimasi kualitas media...";
            const optimizedFile = await compressImageInBrowser(window.luxSelectedMemoryFile);
            if (progressBar) progressBar.style.width = '60%';

            const form = document.getElementById('luxMemoryForm');
            const fd = new FormData(form);
            fd.set('file', optimizedFile);
            fd.set('mediaType', optimizedFile.type.startsWith('video/') ? 'VIDEO' : 'PHOTO');

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
            alert(err.message || 'Terjadi kesalahan saat mengunggah.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
            if (progressBox) progressBox.style.display = 'none';
          }
        };

        window.luxOpenMemoryPreview = function(url, name, msg, type) {
          const modal = document.getElementById('luxMemoryPreviewModal');
          const content = document.getElementById('luxMemoryPreviewContent');
          const caption = document.getElementById('luxMemoryPreviewCaption');
          if (!modal || !content) return;

          const safeUrl = url.replace(/"/g, '&quot;');
          if (type === 'VIDEO') {
            content.innerHTML = '<video src="' + safeUrl + '" controls autoplay playsinline style="max-height: 75vh; max-width: 100%; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); background: #000;"></video>';
          } else {
            content.innerHTML = '<img src="' + safeUrl + '" style="max-height: 75vh; max-width: 100%; border-radius: 16px; object-fit: contain; box-shadow: 0 20px 50px rgba(0,0,0,0.8);" />';
          }

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

  return {
    invitationId: inv.id,
    themeId: inv.themeId || "kalandra",
    weddingTagline: featureSettings.weddingTagline || "THE WEDDING OF",
    
    // Dynamic Host Ordering
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
    firstParents,
    secondParents,
    firstInstagram,
    secondInstagram,
    firstPhotoUrl,
    secondPhotoUrl,

    // Specific Groom & Bride
    groomName,
    brideName,
    groomNickname,
    brideNickname,
    groomDisplayName,
    brideDisplayName,
    groomParents,
    brideParents,
    groomInstagram,
    brideInstagram,
    groomPhotoUrl: groomPhoto,
    bridePhotoUrl: bridePhoto,

    // Media
    landingCoverUrl: coverUrl,
    homePhotoUrl: homePhotoUrl,
    closingPhotoUrl: closingPhotoUrl,
    hasClosingPhoto: Boolean(closingPhotoUrl),
    closingPhotoClass: closingPhotoUrl ? "has-closing-photo" : "no-closing-photo",
    closingBgStyle: closingPhotoUrl ? `background-image: url('${closingPhotoUrl}');` : "",
    sidebarPhotoUrl: sidebarUrl,
    globalBgUrl: fixedBgUrl,
    audioUrl: featureSettings.showMusic !== false ? (inv.musicUrl || featureSettings.musicUrl || "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3") : "",

    // Quotes & Dates
    openingQuote: inv.openingQuote ? nl2br(inv.openingQuote) : "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan diantaramu rasa kasih dan sayang.",
    openingQuoteRef: inv.openingQuoteRef || "QS. AR-RUM : 21",
    targetDate,
    weddingDate,
    weddingDateDay,
    weddingDateMonth,
    weddingDateYear,
    googleCalendarUrl,

    // Dynamic Section Blocks (Chronological Sequence)
    eventDataHtml: eventsHtml,
    storySectionHtml,
    qrAccessSectionHtml,
    dressCodeHtml,
    liveStreamingHtml,
    weddingFilterHtml,
    turutMengundangHtml,
    gallerySectionHtml,
    giftSectionHtml,
    wishesHtml,
    memoriesSectionHtml,
    musicPlayerHtml,
    qrAccessCardHtml: showQrCheckin ? qrAccessCardHtml : "",
    qrButtonDisplay: showQrCheckin ? "" : "display:none;",
    qrCoverButtonHtml: showQrCheckin ? `<button class="btn-qr-ghost" onclick="openModal()">QR Check-In →</button>` : "",
    qrDockButtonHtml: showQrCheckin ? `<button onclick="openModal()" class="dock-a" style="background:none;border:none;cursor:pointer;"><svg class="dock-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg><span>Ticket</span></button>` : "",
    qrSideNavButtonHtml: showQrCheckin ? `<a href="javascript:void(0)" class="side-nav-link" onclick="openModal(); toggleSideNav();">Souvenir Card</a>` : "",
    showQrCheckin,

    // Custom Section Titles & Labels
    quoteSectionTitle,
    quoteSectionEyebrow,
    coupleSectionTitle,
    coupleSectionSub,
    eventsSectionTitle,
    eventsSectionSub,
    storySectionTitle,
    gallerySectionTitle,
    gallerySectionEyebrow,
    galleryQuote,
    giftSectionTitle,
    giftSectionEyebrow,
    giftSectionDesc,
    wishesSectionTitle,
    wishesSectionSub,
    quoteTitle: quoteSectionTitle,
    coupleTitle: coupleSectionTitle,
    eventsTitle: eventsSectionTitle,
    storyTitle: storySectionTitle,
    galleryTitle: gallerySectionTitle,
    giftTitle: giftSectionTitle,
    wishesTitle: wishesSectionTitle,

    // Palette Tokens
    colorPrimary: palette.primary,
    colorSecondary: palette.secondary,
    colorAccent: palette.accent,
    colorBgLight: palette.bgLight,
    colorBgDark: palette.bgDark,
    colorTextDark: palette.textDark,
    
    // Feature Settings & Custom Labels for Rendering Engine
    featureSettings,
    customLabels,
  };
}
