import { prisma } from "@/lib/prisma";
import { getGoogleDriveFolderPhotos } from "@/lib/driveHelper";

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

/**
 * Helper to parse YouTube or Vimeo video URL into embed URL
 */
function parseVideoEmbed(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // YouTube matchers
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?enablejsapi=1&rel=0`;
  }

  // Vimeo matchers
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmed;
}

/**
 * Compose rich template data from the database record,
 * matching authentic benchmarks with full dynamic support.
 */
export async function composeTemplateData(invitationId: string) {
  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      media: true,
      rsvps: {
        orderBy: { respondedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!inv) return null;

  const mediaMap = new Map<string, string>();
  for (const m of inv.media) {
    if (m.driveViewUrl) mediaMap.set(String(m.mediaSlot), m.driveViewUrl);
    else if (m.localPath) mediaMap.set(String(m.mediaSlot), m.localPath);
  }

  // Parse dynamic JSON fields
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

  // Resolve active color palette
  const activePaletteId = featureSettings.colorPalette || "champagne";
  const palette = COLOR_PALETTES[activePaletteId] || COLOR_PALETTES.champagne;

  // Feature Switches
  const isNoPhoto = Boolean(featureSettings.isNoPhoto);
  const showStory = featureSettings.showStory !== undefined ? Boolean(featureSettings.showStory) : true;
  const showGallery = featureSettings.showGallery !== undefined ? Boolean(featureSettings.showGallery) : true;
  const showGift = featureSettings.showGift !== undefined ? Boolean(featureSettings.showGift) : true;
  const showDresscode = featureSettings.showDresscode !== undefined ? Boolean(featureSettings.showDresscode) : true;

  // Generate dynamic HTML snippets

  // 1. Dynamic Events HTML
  const eventsHtml = Array.isArray(events) && events.length > 0
    ? events.map((ev: any, idx: number) => `
      <div class="event-card ${idx % 2 === 1 ? 'event-alt' : ''}">
        <div class="event-header">
          <span class="event-badge">${ev.badge || "Sesi " + (idx + 1)}</span>
          <h3 class="event-title">${ev.title || "Rangkaian Acara"}</h3>
        </div>
        <div class="event-datetime">
          <div class="event-date">
            <span class="date-icon">📅</span>
            <span>${ev.date || "Sabtu, 05 Oktober 2026"}</span>
          </div>
          <div class="event-time">
            <span class="time-icon">⏰</span>
            <span>${ev.time || "10:00 - 13:00 WITA"}</span>
          </div>
        </div>
        <div class="event-venue">
          <h4 class="venue-name">${ev.location || "Grand Ballroom"}</h4>
          <p class="venue-address">${ev.address || ""}</p>
        </div>
        ${ev.notes ? `<p class="event-notes" style="font-size:0.75rem; font-style:italic; margin-top:0.4rem; color:var(--text-muted);">${ev.notes}</p>` : ""}
        ${ev.mapsUrl ? `
          <a href="${ev.mapsUrl}" target="_blank" rel="noreferrer" class="btn-maps">
            <svg class="map-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>Petunjuk Lokasi (Google Maps)</span>
          </a>
        ` : ""}
      </div>
    `).join("")
    : `
      <div class="event-card">
        <div class="event-header"><span class="event-badge">Sakral</span><h3 class="event-title">Akad Nikah</h3></div>
        <div class="event-datetime"><div class="event-date"><span>Senin, 05 Oktober 2026</span></div><div class="event-time"><span>08:00 - 10:00 WITA</span></div></div>
        <div class="event-venue"><h4 class="venue-name">Masjid Raya Makassar</h4><p class="venue-address">Jl. Masjid Raya, Makassar</p></div>
        <a href="https://maps.google.com" target="_blank" class="btn-maps">Petunjuk Lokasi (Google Maps)</a>
      </div>
    `;

  // 2. Dynamic Love Story HTML with Visibility Toggle
  let storyHtml = "";
  if (showStory) {
    storyHtml = Array.isArray(loveStories) && loveStories.length > 0
      ? loveStories.map((st: any, idx: number) => `
        <div class="story-item ${idx % 2 === 1 ? 'story-right' : 'story-left'}">
          <div class="story-dot"></div>
          <div class="story-card">
            <span class="story-year">${st.date || st.year || "2026"}</span>
            <h4 class="story-heading">${st.title || "Chapter " + (idx + 1)}</h4>
            <p class="story-desc">${st.content || st.description || ""}</p>
          </div>
        </div>
      `).join("")
      : `
        <div class="story-item story-left">
          <div class="story-dot"></div>
          <div class="story-card">
            <span class="story-year">2020</span>
            <h4 class="story-heading">Pertemuan Pertama</h4>
            <p class="story-desc">Dipertemukan dalam sebuah kegiatan akademis di kampus.</p>
          </div>
        </div>
      `;
  }

  // 3. YouTube Video Player Embed Generator
  const videoGalleryRawUrl = featureSettings.videoGalleryUrl || "";
  const embedVideoUrl = parseVideoEmbed(videoGalleryRawUrl);
  let videoPlayerHtml = "";
  if (embedVideoUrl) {
    if (embedVideoUrl.includes("youtube.com/embed") || embedVideoUrl.includes("player.vimeo.com")) {
      videoPlayerHtml = `
        <div class="video-teaser-box" style="margin-bottom:1.5rem; width:100%; border-radius:14px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.15); border:1px solid rgba(166,124,82,0.3);">
          <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden;">
            <iframe 
              src="${embedVideoUrl}" 
              title="Video Teaser Pre-Wedding"
              style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
          <div style="padding:0.6rem; background:rgba(0,0,0,0.04); text-align:center;">
            <span style="font-size:0.75rem; font-weight:700; letter-spacing:0.05em; color:var(--primary-gold); text-transform:uppercase;">Teaser Sinematik Pre-Wedding</span>
          </div>
        </div>
      `;
    } else {
      videoPlayerHtml = `
        <div class="video-teaser-box" style="margin-bottom:1.5rem; width:100%; border-radius:14px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.15); border:1px solid rgba(166,124,82,0.3);">
          <video controls playsinline style="width:100%; display:block;">
            <source src="${videoGalleryRawUrl}" type="video/mp4">
          </video>
          <div style="padding:0.6rem; background:rgba(0,0,0,0.04); text-align:center;">
            <span style="font-size:0.75rem; font-weight:700; letter-spacing:0.05em; color:var(--primary-gold); text-transform:uppercase;">Teaser Sinematik Pre-Wedding</span>
          </div>
        </div>
      `;
    }
  }

  // 4. 6-Grid Dynamic Gallery with Random Shuffle on Refresh + Full Gallery Modal
  let galleryHtml = "";
  if (showGallery) {
    if (isNoPhoto) {
      galleryHtml = `
        <div class="no-photo-quote-box" style="grid-column: 1 / -1; padding: 2rem; background: rgba(255,255,255,0.06); border: 1px dashed var(--primary-gold); border-radius: 12px; text-align: center;">
          <span style="font-size: 2rem; color: var(--primary-gold);">❦</span>
          <p style="font-style: italic; font-size: 0.9rem; margin-top: 0.5rem; line-height: 1.6; color: inherit;">
            “Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan diantaramu rasa kasih dan sayang.”
          </p>
          <span style="display:block; margin-top: 0.6rem; font-size: 0.75rem; font-weight: 700; color: var(--primary-gold);">QS. AR-RUM : 21</span>
        </div>
      `;
    } else {
      // Gather all available gallery photos
      const galleryDriveFolderUrl = featureSettings.galleryDriveFolderUrl || "";
      const customPhotosList = featureSettings.galleryPhotosList || "";
      
      let allPhotos: string[] = [];

      // 1. Fetch from Google Drive Public Folder CDN
      if (galleryDriveFolderUrl && galleryDriveFolderUrl.trim() !== "") {
        try {
          const drivePhotos = await getGoogleDriveFolderPhotos(galleryDriveFolderUrl);
          if (drivePhotos && drivePhotos.length > 0) {
            allPhotos.push(...drivePhotos);
          }
        } catch (err) {
          console.error("Error loading drive folder photos:", err);
        }
      }

      // 2. Fetch from custom photo URL list if provided
      if (customPhotosList && customPhotosList.trim() !== "") {
        const manualUrls = customPhotosList.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 5);
        manualUrls.forEach((u: string) => {
          if (!allPhotos.includes(u)) allPhotos.push(u);
        });
      }

      // 3. Also gather from media table if any
      const galleryMedia = inv.media.filter((m) => String(m.mediaSlot).startsWith("GALLERY"));
      galleryMedia.forEach((gm) => {
        const u = gm.driveViewUrl || gm.localPath;
        if (u && !allPhotos.includes(u)) allPhotos.push(u);
      });

      // Default high-quality preset gallery if empty
      if (allPhotos.length === 0) {
        allPhotos = [
          "https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=85",
          "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&q=85",
          "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1000&q=85",
          "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1000&q=85",
          "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1000&q=85",
          "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1000&q=85",
          "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1000&q=85",
          "https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=1000&q=85",
        ];
      }

      // Cap stream to maximum 50 photos for optimal performance & CDN caching
      const max50Photos = allPhotos.slice(0, 50);

      // Randomly shuffle array on each page load for fresh stream experience
      const shuffled = [...max50Photos].sort(() => 0.5 - Math.random());
      const displayGrid6 = shuffled.slice(0, 6);

      const gridHtml = displayGrid6.map((imgUrl) => `
        <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer; background:#f0ede6; position:relative; box-shadow:0 2px 8px rgba(0,0,0,0.08);" onclick="luxOpenZoom('${imgUrl}')">
          <img src="${imgUrl}" alt="Foto Galeri Pre-Wedding" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.4s ease;" class="gallery-img" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
        </div>
      `).join("");

      const allPhotosJson = JSON.stringify(allPhotos);
      const gridPhotosJson = JSON.stringify(displayGrid6);

      const allPhotosGridHtml = allPhotos.map((imgUrl, i) => `
        <div class="lux-full-item" style="border-radius:10px; overflow:hidden; aspect-ratio:1/1; cursor:pointer; background:#1a1715; box-shadow:0 4px 15px rgba(0,0,0,0.3);" onclick="luxOpenZoom(${i}, 'all')">
          <img src="${imgUrl}" alt="Foto Galeri" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        </div>
      `).join("");

      const albumButtonHtml = `
        <div style="text-align:center; margin-top:1.2rem;">
          <button type="button" onclick="luxOpenFullGallery()" class="btn-full-gallery" style="display:inline-flex; align-items:center; justify-content:center; padding:0.6rem 1.8rem; background:transparent; color:var(--primary-gold, #c99a57); border:1.2px solid var(--primary-gold, #c99a57); border-radius:50px; font-size:0.75rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; transition:all 0.3s ease; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
            Buka Galeri
          </button>
        </div>
      `;

      galleryHtml = `
        ${videoPlayerHtml}
        <div class="lux-front-gallery-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.45rem; margin-top:0.6rem; width:100%;">
          ${gridHtml}
        </div>
        ${albumButtonHtml}

        <!-- In-App Full Gallery Grid Modal -->
        <div id="lux-full-gallery-modal" class="lux-full-gallery-overlay" onclick="if(event.target===this) luxCloseFullGallery()">
          <div class="lux-full-gallery-container">
            <div class="lux-full-gallery-header">
              <h3 class="serif-title" style="margin:0; font-size:1.3rem; color:#fff; font-weight:400; letter-spacing:0.04em;">Galeri Foto</h3>
              <button type="button" onclick="luxCloseFullGallery()" class="lux-gallery-close-btn">&times;</button>
            </div>
            <div class="lux-full-gallery-body">
              <div class="lux-full-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:0.6rem; width:100%;">
                ${allPhotosGridHtml}
              </div>
            </div>
          </div>
        </div>

        <!-- Pure Minimalist Photo Lightbox (Photo + Prev/Next + Mobile Swipe) -->
        <div id="lux-zoom-modal" class="lux-lightbox-overlay" onclick="if(event.target===this) luxCloseZoom()">
          <button type="button" onclick="luxCloseZoom()" class="lux-lightbox-close-btn">&times;</button>
          
          <div class="lux-lightbox-body" id="lux-zoom-touch-area" onclick="if(event.target===this) luxCloseZoom()">
            <button type="button" onclick="event.stopPropagation(); luxPrevZoom();" class="lux-lightbox-nav-btn lux-nav-prev">&#10094;</button>
            <div class="lux-lightbox-img-wrapper" onclick="event.stopPropagation()">
              <img id="lux-zoom-img" src="${displayGrid6[0]}" alt="Foto Galeri">
            </div>
            <button type="button" onclick="event.stopPropagation(); luxNextZoom();" class="lux-lightbox-nav-btn lux-nav-next">&#10095;</button>
          </div>
        </div>

        <style>
          /* Full Gallery Overlay */
          .lux-full-gallery-overlay {
            display: none;
            position: fixed;
            inset: 0;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 99998;
            background: rgba(10, 8, 7, 0.95);
            backdrop-filter: blur(14px);
            align-items: center;
            justify-content: center;
            padding: 1rem;
            box-sizing: border-box;
          }
          .lux-full-gallery-container {
            width: 100%;
            max-width: 680px;
            max-height: 90vh;
            background: rgba(22, 18, 16, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 25px 60px rgba(0,0,0,0.7);
          }
          .lux-full-gallery-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.1rem 1.4rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .lux-gallery-close-btn {
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            font-size: 1.3rem;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .lux-gallery-close-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: scale(1.08);
          }
          .lux-full-gallery-body {
            flex: 1;
            overflow-y: auto;
            padding: 1.2rem;
            box-sizing: border-box;
          }

          /* Photo Lightbox Overlay */
          .lux-lightbox-overlay {
            display: none;
            position: fixed;
            inset: 0;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 999999;
            background: rgba(0, 0, 0, 0.92);
            backdrop-filter: blur(10px);
            align-items: center;
            justify-content: center;
            padding: 1rem;
            box-sizing: border-box;
          }
          .lux-lightbox-close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #fff;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-size: 1.6rem;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 30;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            transition: all 0.2s ease;
          }
          .lux-lightbox-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.08);
          }
          .lux-lightbox-body {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-sizing: border-box;
          }
          .lux-lightbox-img-wrapper {
            max-width: 90vw;
            max-height: 85vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .lux-lightbox-img-wrapper img {
            max-width: 90vw;
            max-height: 85vh;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 12px;
            box-shadow: 0 25px 70px rgba(0,0,0,0.85);
            user-select: none;
            transition: opacity 0.18s ease;
          }
          .lux-lightbox-nav-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.55);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(255, 255, 255, 0.25);
            color: #fff;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            font-size: 1.3rem;
            cursor: pointer;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .lux-lightbox-nav-btn:hover {
            background: rgba(0, 0, 0, 0.85);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-50%) scale(1.08);
          }
          .lux-nav-prev { left: 16px; }
          .lux-nav-next { right: 16px; }
        </style>

        <script>
          (function() {
            var highlightPhotos = ${gridPhotosJson};
            var allGalleryPhotos = ${allPhotosJson};
            var activePhotos = highlightPhotos;
            var curIdx = 0;
            var isAttached = false;

            function ensureBodyAttachment() {
              if (isAttached) return;
              var zoom = document.getElementById('lux-zoom-modal');
              var fullModal = document.getElementById('lux-full-gallery-modal');
              if (zoom && zoom.parentElement !== document.body) {
                document.body.appendChild(zoom);
              }
              if (fullModal && fullModal.parentElement !== document.body) {
                document.body.appendChild(fullModal);
              }
              isAttached = true;
            }

            window.luxOpenFullGallery = function() {
              ensureBodyAttachment();
              var fullModal = document.getElementById('lux-full-gallery-modal');
              if (fullModal) {
                fullModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
              }
            };

            window.luxCloseFullGallery = function() {
              var fullModal = document.getElementById('lux-full-gallery-modal');
              if (fullModal) {
                fullModal.style.display = 'none';
                document.body.style.overflow = '';
              }
            };

            window.luxOpenZoom = function(target, mode) {
              ensureBodyAttachment();
              activePhotos = (mode === 'all') ? allGalleryPhotos : highlightPhotos;
              if (typeof target === 'string') {
                var found = activePhotos.indexOf(target);
                curIdx = found !== -1 ? found : 0;
              } else if (typeof target === 'number') {
                curIdx = target >= 0 && target < activePhotos.length ? target : 0;
              } else {
                curIdx = 0;
              }
              updateZoomView();
              var zoom = document.getElementById('lux-zoom-modal');
              if (zoom) {
                zoom.style.display = 'flex';
                document.body.style.overflow = 'hidden';
              }
            };

            window.luxCloseZoom = function() {
              var zoom = document.getElementById('lux-zoom-modal');
              if (zoom) {
                zoom.style.display = 'none';
                var fullModal = document.getElementById('lux-full-gallery-modal');
                if (!fullModal || fullModal.style.display !== 'flex') {
                  document.body.style.overflow = '';
                }
              }
            };

            window.luxNextZoom = function() {
              curIdx = (curIdx + 1) % activePhotos.length;
              updateZoomView();
            };

            window.luxPrevZoom = function() {
              curIdx = (curIdx - 1 + activePhotos.length) % activePhotos.length;
              updateZoomView();
            };

            function updateZoomView() {
              var img = document.getElementById('lux-zoom-img');
              if (img && activePhotos[curIdx]) {
                img.style.opacity = '0.35';
                img.src = activePhotos[curIdx];
                img.onload = function() { img.style.opacity = '1'; };
              }
            }

            // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
            document.addEventListener('keydown', function(e) {
              var zoom = document.getElementById('lux-zoom-modal');
              if (zoom && zoom.style.display === 'flex') {
                if (e.key === 'ArrowRight') window.luxNextZoom();
                if (e.key === 'ArrowLeft') window.luxPrevZoom();
                if (e.key === 'Escape') window.luxCloseZoom();
              } else {
                var fullModal = document.getElementById('lux-full-gallery-modal');
                if (fullModal && fullModal.style.display === 'flex' && e.key === 'Escape') {
                  window.luxCloseFullGallery();
                }
              }
            });

            // Touch swipe gesture navigation on mobile
            var touchStartX = 0;
            var touchEndX = 0;
            var touchArea = document.getElementById('lux-zoom-touch-area');
            if (touchArea) {
              touchArea.addEventListener('touchstart', function(e) {
                touchStartX = e.changedTouches[0].screenX;
              }, { passive: true });

              touchArea.addEventListener('touchend', function(e) {
                touchEndX = e.changedTouches[0].screenX;
                if (touchEndX < touchStartX - 35) window.luxNextZoom();
                if (touchEndX > touchStartX + 35) window.luxPrevZoom();
              }, { passive: true });
            }
          })();
        </script>
      `;
    }
  }

  // 5. Bank Accounts & QRIS Angpao with Visibility Toggle
  let bankCardsHtml = "";
  const qrisImageUrl = featureSettings.qrisImageUrl || "";
  if (showGift) {
    bankCardsHtml = Array.isArray(bankAccounts) && bankAccounts.length > 0
      ? bankAccounts.map((b: any) => `
        <div class="bank-card">
          <div class="bank-header">
            <span class="bank-name">${b.bank || "BCA"}</span>
            <span class="bank-owner">a.n ${b.name || inv.groomName}</span>
          </div>
          <div class="bank-number-box">
            <span class="bank-number" id="acc-${b.number}">${b.number}</span>
            <button class="btn-copy" onclick="copyText('${b.number}', this)">Salin Nomor</button>
          </div>
        </div>
      `).join("")
      : `
        <div class="bank-card">
          <div class="bank-header">
            <span class="bank-name">BCA Digital</span>
            <span class="bank-owner">a.n ${inv.groomName || "Adi Santoso"}</span>
          </div>
          <div class="bank-number-box">
            <span class="bank-number">7330497518</span>
            <button class="btn-copy" onclick="copyText('7330497518', this)">Salin Nomor</button>
          </div>
        </div>
      `;

    if (qrisImageUrl) {
      bankCardsHtml += `
        <div class="bank-card qris-box" style="text-align:center; padding: 1.2rem;">
          <span class="bank-name" style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:700;">Scan QRIS Tanda Kasih</span>
          <img src="${qrisImageUrl}" alt="QRIS Pembayaran" style="width:160px; height:160px; object-fit:contain; margin:0 auto; border-radius:8px; background:#fff; padding:6px; border:1px solid #ddd;">
          <p style="font-size:0.7rem; color:var(--text-muted); margin-top:0.4rem;">Dapat di-scan melalui semua e-wallet & Mobile Banking</p>
        </div>
      `;
    }
  }

  // 1.5. Dress Code Component
  const dressCodeColors = featureSettings.dressCodeColors || "";
  const dressCodeNote = featureSettings.dressCodeNote || "";
  let dressCodeHtml = "";
  if (showDresscode && (dressCodeColors || dressCodeNote)) {
    const colorBadges = dressCodeColors
      ? dressCodeColors.split(",").map((c: string) => `<span style="width:22px; height:22px; border-radius:50%; background:${c.trim()}; display:inline-block; border:1.5px solid rgba(255,255,255,0.7); box-shadow:0 2px 6px rgba(0,0,0,0.15);"></span>`).join("")
      : "";
    dressCodeHtml = `
      <div class="dresscode-box" style="margin-top:1.2rem; padding:1rem 1.2rem; background:rgba(0,0,0,0.03); border-radius:12px; border:1px solid rgba(166,124,82,0.25); text-align:center;">
        <h4 style="margin:0 0 0.3rem 0; font-size:0.8rem; font-weight:700; color:var(--primary-gold); text-transform:uppercase; letter-spacing:0.05em;">Dress Code</h4>
        ${colorBadges ? `<div style="display:flex; justify-content:center; gap:8px; margin:0.5rem 0;">${colorBadges}</div>` : ""}
        ${dressCodeNote ? `<p style="margin:0; font-size:0.75rem; color:var(--text-muted); line-height:1.4;">${dressCodeNote}</p>` : ""}
      </div>
    `;
  }

  // Build Theme-Specific Dynamic Section HTML (Completely auto-collapsing to 0px if disabled)
  const currentThemeId = inv.themeId || "kila";

  // Dynamic Love Story Section
  let storySectionHtml = "";
  if (showStory && storyHtml) {
    if (currentThemeId === "aruna") {
      storySectionHtml = `
        <section class="heritage-section" id="story">
          <div class="heritage-card">
            <div class="arch-ornament-header"></div>
            <h2 class="serif-body" style="color:var(--heritage-gold-dark); font-size:1.6rem; margin-bottom:1rem; font-weight:600;">Untaian Kasih</h2>
            ${storyHtml}
          </div>
        </section>
      `;
    } else if (currentThemeId === "danila") {
      storySectionHtml = `
        <section class="danila-section" id="story">
          <div class="frosted-pill-card">
            <h2 class="serif-title" style="color:var(--danila-rose); font-size:1.8rem; margin-bottom:1rem; font-weight:400;">Our Journey</h2>
            ${storyHtml}
          </div>
        </section>
      `;
    } else if (currentThemeId === "ivanna") {
      storySectionHtml = `
        <section class="snap-slide" id="story">
          <div class="editorial-card">
            <span class="slide-monogram-tag serif-title">A PEAK OF LOVE</span>
            <h2 class="serif-title" style="font-size:1.8rem; color:#fff; margin-bottom:0.8rem; font-weight:400;">Our Journey</h2>
            ${storyHtml}
          </div>
        </section>
      `;
    } else if (currentThemeId === "papercut") {
      storySectionHtml = `
        <section class="paper-section" id="story">
          <div class="scrapbook-card">
            <div class="washi-tape"></div>
            <h2 class="serif-title" style="color:var(--paper-accent); font-size:1.8rem; margin-bottom:1rem;">Cerita Kita</h2>
            ${storyHtml}
          </div>
        </section>
      `;
    } else {
      storySectionHtml = `
        <section class="section-card" id="story">
          <div class="card">
            <h2 class="subtitle-section serif-font">Our Love Journey</h2>
            ${storyHtml}
          </div>
        </section>
      `;
    }
  }

  // Dynamic Gallery Section
  let gallerySectionHtml = "";
  if (showGallery && galleryHtml) {
    if (currentThemeId === "aruna") {
      gallerySectionHtml = `
        <section class="heritage-section" id="gallery">
          <div class="heritage-card" style="text-align:center;">
            <div class="arch-ornament-header"></div>
            <h2 class="serif-body" style="color:var(--heritage-gold-dark); font-size:1.6rem; margin-bottom:1rem; font-weight:600;">Galeri Kasih</h2>
            ${galleryHtml}
          </div>
        </section>
      `;
    } else if (currentThemeId === "danila") {
      gallerySectionHtml = `
        <section class="danila-section" id="gallery">
          <div class="frosted-pill-card" style="text-align:center;">
            <h2 class="serif-title" style="color:var(--danila-rose); font-size:1.8rem; margin-bottom:1rem; font-weight:400;">Our Memories</h2>
            ${galleryHtml}
          </div>
        </section>
      `;
    } else if (currentThemeId === "ivanna") {
      gallerySectionHtml = `
        <section class="snap-slide" id="gallery">
          <div class="editorial-card" style="text-align:center;">
            <span class="slide-monogram-tag serif-title">MEMORIES</span>
            <h2 class="serif-title" style="font-size:1.8rem; color:#fff; margin-bottom:0.8rem; font-weight:400;">Pre-Wedding Gallery</h2>
            ${galleryHtml}
          </div>
        </section>
      `;
    } else if (currentThemeId === "papercut") {
      gallerySectionHtml = `
        <section class="paper-section" id="gallery">
          <div class="scrapbook-card" style="text-align:center;">
            <div class="washi-tape"></div>
            <h2 class="serif-title" style="color:var(--paper-accent); font-size:1.8rem; margin-bottom:1rem;">Galeri Foto</h2>
            ${galleryHtml}
          </div>
        </section>
      `;
    } else {
      gallerySectionHtml = `
        <section class="section-card" id="gallery">
          <div class="card" style="text-align:center;">
            <h2 class="subtitle-section serif-font">Galeri Bahagia</h2>
            ${galleryHtml}
          </div>
        </section>
      `;
    }
  }

  // Dynamic Gift Section
  let giftSectionHtml = "";
  if (showGift && bankCardsHtml) {
    if (currentThemeId === "aruna") {
      giftSectionHtml = `
        <section class="heritage-section" id="gift">
          <div class="heritage-card">
            <div class="arch-ornament-header"></div>
            <h2 class="serif-body" style="color:var(--heritage-gold-dark); font-size:1.6rem; margin-bottom:1rem; font-weight:600;">Tanda Kasih</h2>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.8rem;">Doa restu Anda adalah karunia terindah bagi kami:</p>
            <div class="gift-tabs">
              <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">Transfer E-Amplop / QRIS</button>
              <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">Kirim Kado</button>
            </div>
            <div id="giftTabAmplop">
              ${bankCardsHtml}
            </div>
            <div id="giftTabKado" style="display:none; text-align:left;" class="bank-card">
              <p style="font-size:0.8rem; font-weight:700; color:var(--text-dark); margin-bottom:0.4rem;">Alamat Pengiriman Kado:</p>
              <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; margin-bottom:0.8rem;">${inv.shippingAddress || ""}</p>
              <button class="btn-copy" onclick="copyText('${inv.shippingAddress || ""}')">Salin Alamat</button>
            </div>
          </div>
        </section>
      `;
    } else if (currentThemeId === "danila") {
      giftSectionHtml = `
        <section class="danila-section" id="gift">
          <div class="frosted-pill-card">
            <h2 class="serif-title" style="color:var(--danila-rose); font-size:1.8rem; margin-bottom:1rem; font-weight:400;">Wedding Gift</h2>
            <div class="gift-tabs">
              <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">Transfer Bank / QRIS</button>
              <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">Kirim Kado</button>
            </div>
            <div id="giftTabAmplop">
              ${bankCardsHtml}
            </div>
            <div id="giftTabKado" style="display:none; text-align:left;" class="bank-card">
              <p style="font-size:0.8rem; font-weight:700; color:#1e1c1a; margin-bottom:0.4rem;">Alamat Pengiriman Kado:</p>
              <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; margin-bottom:0.8rem;">${inv.shippingAddress || ""}</p>
              <button class="btn-copy" onclick="copyText('${inv.shippingAddress || ""}')">Salin Alamat</button>
            </div>
          </div>
        </section>
      `;
    } else if (currentThemeId === "ivanna") {
      giftSectionHtml = `
        <section class="snap-slide" id="gift">
          <div class="editorial-card">
            <span class="slide-monogram-tag serif-title">WEDDING GIFT</span>
            <h2 class="serif-title" style="font-size:1.8rem; color:#fff; margin-bottom:0.8rem; font-weight:400;">Tanda Kasih</h2>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.8rem;">Doa restu Anda merupakan karunia terindah bagi kami:</p>
            <div class="gift-tabs">
              <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">Transfer E-Amplop / QRIS</button>
              <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">Kirim Kado</button>
            </div>
            <div id="giftTabAmplop">
              ${bankCardsHtml}
            </div>
            <div id="giftTabKado" style="display:none; text-align:left;" class="bank-card">
              <p style="font-size:0.8rem; font-weight:700; color:#fff; margin-bottom:0.4rem;">Alamat Pengiriman Kado:</p>
              <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; margin-bottom:0.8rem;">${inv.shippingAddress || ""}</p>
              <button class="btn-copy" onclick="copyText('${inv.shippingAddress || ""}')">Salin Alamat</button>
            </div>
          </div>
        </section>
      `;
    } else if (currentThemeId === "papercut") {
      giftSectionHtml = `
        <section class="paper-section" id="gift">
          <div class="scrapbook-card">
            <div class="washi-tape"></div>
            <h2 class="serif-title" style="color:var(--paper-accent); font-size:1.8rem; margin-bottom:1rem;">Tanda Kasih</h2>
            <p style="font-size:0.8rem; color:var(--paper-muted); margin-bottom:1rem;">Doa restu Anda adalah karunia terindah bagi kami:</p>
            <div class="gift-tabs">
              <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">Transfer E-Amplop / QRIS</button>
              <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">Kirim Kado</button>
            </div>
            <div id="giftTabAmplop">
              ${bankCardsHtml}
            </div>
            <div id="giftTabKado" style="display:none; text-align:left;" class="bank-card">
              <p style="font-size:0.8rem; font-weight:700; color:var(--paper-dark); margin-bottom:0.4rem;">Alamat Pengiriman Kado:</p>
              <p style="font-size:0.85rem; color:var(--paper-muted); line-height:1.5; margin-bottom:0.8rem;">${inv.shippingAddress || ""}</p>
              <button class="btn-copy" onclick="copyText('${inv.shippingAddress || ""}')">Salin Alamat</button>
            </div>
          </div>
        </section>
      `;
    } else {
      giftSectionHtml = `
        <section class="section-card" id="gift">
          <div class="card">
            <h2 class="subtitle-section serif-font">Tanda Kasih</h2>
            <p class="quote-text" style="font-size:0.8rem; margin-bottom:1rem;">
              Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Bagi Anda yang ingin memberikan tanda kasih:
            </p>
            <div class="gift-tabs">
              <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">Transfer Bank / QRIS</button>
              <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">Kirim Kado</button>
            </div>
            <div id="giftTabAmplop">
              ${bankCardsHtml}
            </div>
            <div id="giftTabKado" style="display:none; text-align:left;" class="bank-card">
              <p style="font-size:0.8rem; font-weight:700; color:#1e1c1a; margin-bottom:0.3rem;">Alamat Pengiriman Kado:</p>
              <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin-bottom:0.6rem;">${inv.shippingAddress || ""}</p>
              <button class="btn-copy" onclick="copyText('${inv.shippingAddress || ""}')">Salin Alamat</button>
            </div>
          </div>
        </section>
      `;
    }
  }

  // 6. Turut Mengundang (Family & VIP Names List)
  const turutMengundangList = featureSettings.turutMengundang || "";
  let turutMengundangHtml = "";
  if (turutMengundangList && turutMengundangList.trim() !== "") {
    const lines = turutMengundangList.split("\n").filter((l: string) => l.trim() !== "");
    turutMengundangHtml = `
      <section class="section-card" id="turut-mengundang" style="margin-top:0.5rem;">
        <div class="card" style="text-align:center;">
          <h2 class="subtitle-section serif-font" style="font-size:1.5rem; margin-bottom:0.8rem;">Turut Mengundang</h2>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem;">Keluarga Besar &amp; Kerabat yang turut berbahagia:</p>
          <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; font-weight:600; color:inherit;">
            ${lines.map((line: string) => `<p style="margin:0; padding:0.25rem 0; border-bottom:1px dashed rgba(166,124,82,0.2);">${line.trim()}</p>`).join("")}
          </div>
        </div>
      </section>
    `;
  }

  // 7. Himbauan & Kenyamanan Acara (Guest Guidance)
  const guestGuidance = featureSettings.guestGuidance || "";
  let guestNotesHtml = "";
  if (guestGuidance && guestGuidance.trim() !== "") {
    guestNotesHtml = `
      <div class="guest-guidance-box" style="margin-top:1.2rem; padding:1.2rem; background:rgba(0,0,0,0.03); border-radius:12px; border-left:3px solid var(--primary-gold); text-align:left;">
        <h4 style="margin:0 0 0.4rem 0; font-size:0.85rem; font-weight:700; color:var(--primary-gold);">Himbauan &amp; Kenyamanan Acara</h4>
        <p style="margin:0; font-size:0.75rem; line-height:1.5; color:var(--text-muted);">${guestGuidance}</p>
      </div>
    `;
  }

  // 8. Pesan Spesial / Puisi Kustom
  const customMessageTitle = featureSettings.customMessageTitle || "";
  const customMessageBody = featureSettings.customMessageBody || "";
  let customMessageHtml = "";
  if (customMessageTitle || customMessageBody) {
    customMessageHtml = `
      <section class="section-card" id="special-message" style="margin-top:1.5rem;">
        <div class="card" style="text-align:center;">
          ${customMessageTitle ? `<h3 class="serif-font" style="font-size:1.3rem; margin-bottom:0.6rem; color:var(--primary-gold);">${customMessageTitle}</h3>` : ""}
          ${customMessageBody ? `<p style="font-size:0.85rem; font-style:italic; line-height:1.7; color:inherit; white-space:pre-line;">“${customMessageBody}”</p>` : ""}
        </div>
      </section>
    `;
  }

  // 9. Wedding Filter Instagram
  const instagramFilterUrl = featureSettings.instagramFilterUrl || "";
  let weddingFilterHtml = "";
  if (instagramFilterUrl) {
    weddingFilterHtml = `
      <div class="wedding-filter-box" style="margin-top:1.2rem; text-align:center; padding:1.2rem; background:rgba(255,255,255,0.05); border-radius:12px; border:1px solid rgba(166,124,82,0.2);">
        <span style="display:block; font-size:0.8rem; font-weight:700; margin-bottom:0.4rem;">Wedding Filter Instagram</span>
        <p style="font-size:0.7rem; color:var(--text-muted); margin-bottom:0.8rem;">Abadikan momen bahagia Anda menggunakan filter Instagram resmi kami</p>
        <a href="${instagramFilterUrl}" target="_blank" rel="noreferrer" class="btn-filter" style="display:inline-flex; align-items:center; gap:0.4rem; padding:0.5rem 1.2rem; background:var(--primary-gold); color:#fff; border-radius:50px; font-size:0.75rem; font-weight:700; text-decoration:none;">
          Buka Filter Instagram ↗
        </a>
      </div>
    `;
  }

  // 10. Live Streaming URLs
  const liveStreamYoutubeUrl = featureSettings.liveStreamYoutubeUrl || inv.liveStreamUrl || "";
  const liveStreamInstagramUrl = featureSettings.liveStreamInstagramUrl || "";
  const liveStreamZoomUrl = featureSettings.liveStreamZoomUrl || "";
  let liveStreamingHtml = "";
  if (liveStreamYoutubeUrl || liveStreamInstagramUrl || liveStreamZoomUrl) {
    liveStreamingHtml = `
      <div class="live-stream-section" style="margin-top:1.5rem; text-align:center; padding:1.4rem; background:rgba(0,0,0,0.03); border-radius:14px; border:1px solid rgba(166,124,82,0.25);">
        <h3 class="serif-font" style="font-size:1.2rem; margin-bottom:0.4rem; color:var(--primary-gold);">Siaran Langsung Pernikahan</h3>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem;">Bagi keluarga &amp; sahabat yang berhalangan hadir langsung:</p>
        <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:0.6rem;">
          ${liveStreamYoutubeUrl ? `<a href="${liveStreamYoutubeUrl}" target="_blank" class="btn-stream" style="padding:0.5rem 1rem; background:#cc181e; color:#fff; border-radius:8px; font-size:0.75rem; font-weight:700; text-decoration:none;">YouTube Live ↗</a>` : ""}
          ${liveStreamInstagramUrl ? `<a href="${liveStreamInstagramUrl}" target="_blank" class="btn-stream" style="padding:0.5rem 1rem; background:#bc2a8d; color:#fff; border-radius:8px; font-size:0.75rem; font-weight:700; text-decoration:none;">Instagram Live ↗</a>` : ""}
          ${liveStreamZoomUrl ? `<a href="${liveStreamZoomUrl}" target="_blank" class="btn-stream" style="padding:0.5rem 1rem; background:#2d8cff; color:#fff; border-radius:8px; font-size:0.75rem; font-weight:700; text-decoration:none;">Zoom Meeting ↗</a>` : ""}
        </div>
      </div>
    `;
  }

  // 11. Guest Wishes & Live RSVP Feed
  const rsvpFeedHtml = inv.rsvps.length > 0
    ? inv.rsvps.map((r: any) => `
      <div class="wish-item">
        <div class="wish-header">
          <span class="wish-sender">${r.guestName}</span>
          <span class="wish-badge ${r.status === 'hadir' ? 'badge-hadir' : 'badge-absen'}">${r.status === 'hadir' ? 'Hadir' : 'Berhalangan'}</span>
        </div>
        ${r.message ? `<p class="wish-message">“${r.message}”</p>` : ""}
        <span class="wish-time">${new Date(r.respondedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</span>
      </div>
    `).join("")
    : `<p class="no-wishes" style="font-size:0.8rem; font-style:italic; color:var(--text-muted); text-align:center;">Jadilah yang pertama mengirimkan doa restu untuk kedua mempelai.</p>`;

  // Resolve media with rich placeholders
  const coverUrl = mediaMap.get("LANDING_COVER") || "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85";
  const sidebarUrl = mediaMap.get("DESKTOP_SIDEBAR") || coverUrl;
  const fixedBgUrl = mediaMap.get("GLOBAL_FIXED_BG") || sidebarUrl || "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80";
  const groomPhoto = mediaMap.get("GROOM_PHOTO") || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80";
  const bridePhoto = mediaMap.get("BRIDE_PHOTO") || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80";

  return {
    invitationId: inv.id,
    themeId: inv.themeId || "kila",
    groomName: inv.groomName || "Didan Faadhilah, S.T.",
    brideName: inv.brideName || "Nasha Selsabilla, S.Ds.",
    groomNickname: inv.groomNickname || "Didan",
    brideNickname: inv.brideNickname || "Nasha",
    groomParents: inv.groomParents || "Putra dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti",
    brideParents: inv.brideParents || "Putri dari Bapak Tomm Posma & Ibu Endang Noffiyanti",
    groomInstagram: inv.groomInstagram || "didanfaadhilah",
    brideInstagram: inv.brideInstagram || "nashasl",
    openingQuote: inv.openingQuote || "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan diantaramu rasa kasih dan sayang.",
    openingQuoteRef: inv.openingQuoteRef || "QS. AR-RUM : 21",
    eventData: inv.eventData,
    eventsHtml,
    eventDataHtml: eventsHtml,
    loveStory: inv.loveStory,
    storyHtml,
    loveStoryHtml: storyHtml,
    storySectionHtml,
    galleryHtml,
    gallerySectionHtml,
    bankAccounts: inv.bankAccounts,
    bankCardsHtml,
    bankAccountsHtml: bankCardsHtml,
    giftSectionHtml,
    dressCodeHtml,
    turutMengundangHtml,
    guestNotesHtml,
    customMessageHtml,
    weddingFilterHtml,
    liveStreamingHtml,
    rsvpFeedHtml,
    wishesHtml: rsvpFeedHtml,
    shippingAddress: inv.shippingAddress || "",
    liveStreamUrl: inv.liveStreamUrl || "",
    coverUrl,
    landingCoverUrl: coverUrl,
    sidebarUrl,
    sidebarPhotoUrl: sidebarUrl,
    fixedBgUrl,
    globalBgUrl: fixedBgUrl,
    groomPhoto,
    groomPhotoUrl: groomPhoto,
    bridePhoto,
    bridePhotoUrl: bridePhoto,
    musicUrl: featureSettings.showMusic !== false ? (inv.musicUrl || featureSettings.musicUrl || "") : "",
    // Wedding Tagline / Headline Label (Default "THE WEDDING OF" or customized by user)
    weddingTagline: featureSettings.weddingTagline || "THE WEDDING OF",
    monogramInitial: (featureSettings.displayOrder || "BRIDE_FIRST") === "BRIDE_FIRST"
      ? `${(inv.brideNickname || "Nasha")[0]} & ${(inv.groomNickname || "Didan")[0]}`
      : `${(inv.groomNickname || "Didan")[0]} & ${(inv.brideNickname || "Nasha")[0]}`,
    // Resolve couple display order (Bride First vs Groom First)
    displayOrder: featureSettings.displayOrder || "BRIDE_FIRST",
    primaryCoupleNames: (featureSettings.displayOrder || "BRIDE_FIRST") === "BRIDE_FIRST"
      ? `${inv.brideNickname || "Nasha"} & ${inv.groomNickname || "Didan"}`
      : `${inv.groomNickname || "Didan"} & ${inv.brideNickname || "Nasha"}`,
    fullCoupleNames: (featureSettings.displayOrder || "BRIDE_FIRST") === "BRIDE_FIRST"
      ? `${inv.brideName || "Nasha Selsabilla"} & ${inv.groomName || "Didan Faadhilah"}`
      : `${inv.groomName || "Didan Faadhilah"} & ${inv.brideName || "Nasha Selsabilla"}`,
    coupleMonogram: (featureSettings.displayOrder || "BRIDE_FIRST") === "BRIDE_FIRST"
      ? `${(inv.brideNickname || "Nasha")[0]} & ${(inv.groomNickname || "Didan")[0]}`
      : `${(inv.groomNickname || "Didan")[0]} & ${(inv.brideNickname || "Nasha")[0]}`,
    // Flattened Color Palette Tokens
    colorPrimary: palette.primary,
    colorSecondary: palette.secondary,
    colorAccent: palette.accent,
    colorBgLight: palette.bgLight,
    colorBgDark: palette.bgDark,
    colorTextDark: palette.textDark,
    palette,
    isNoPhoto,
    showStory,
    showGallery,
    showGift,
    showDresscode,
  };
}
