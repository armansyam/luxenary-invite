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
    if (m.driveViewUrl) mediaMap.set(String(m.mediaSlot), m.driveViewUrl);
    else if (m.localPath) mediaMap.set(String(m.mediaSlot), m.localPath);
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

  // Resolve Photos
  const coverUrl = mediaMap.get("LANDING_COVER") || "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85";
  const sidebarUrl = mediaMap.get("DESKTOP_SIDEBAR") || coverUrl;
  const fixedBgUrl = mediaMap.get("GLOBAL_FIXED_BG") || sidebarUrl || "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80";
  const groomPhoto = mediaMap.get("GROOM_PHOTO") || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80";
  const bridePhoto = mediaMap.get("BRIDE_PHOTO") || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80";

  // Dynamic Couple Display Order Resolution
  const isGroomFirst = featureSettings.displayOrder === "GROOM_FIRST" || (!featureSettings.displayOrder && Boolean(inv.groomName));

  const groomName = inv.groomName || inv.groomNickname || "Didan Faadhilah";
  const brideName = inv.brideName || inv.brideNickname || "Nasha Selsabilla";
  const groomNickname = inv.groomNickname || inv.groomName || "Didan";
  const brideNickname = inv.brideNickname || inv.brideName || "Nasha";
  const groomDisplayName = inv.groomName || inv.groomNickname || "Didan Faadhilah, S.T.";
  const brideDisplayName = inv.brideName || inv.brideNickname || "Nasha Selsabilla, S.Ds.";
  const groomParents = inv.groomParents || "Putra dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti";
  const brideParents = inv.brideParents || "Putri dari Bapak Tomm Posma & Ibu Endang Noffiyanti";
  const groomInstagram = (inv.groomInstagram || "didanfaadhilah").replace(/^@+/, "");
  const brideInstagram = (inv.brideInstagram || "nashasl").replace(/^@+/, "");

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

  // 1. Dynamic Events HTML (Benchmark Minimalist Stack)
  const eventsHtml = Array.isArray(events) && events.length > 0
    ? events.map((ev: any, idx: number) => `
      <div class="event-block-item">
        <span class="ev-cat">${(ev.badge || (idx === 0 ? "SAKRAMEN / AKAD" : "RESEPSI")).toUpperCase()}</span>
        <h3 class="ev-name serif">${(ev.title || (idx === 0 ? "Akad Nikah" : "Resepsi Pernikahan")).toUpperCase()}</h3>
        <p class="ev-time">${ev.time || "08.00 – 10.00 WITA"}</p>
        <h4 class="ev-venue">${ev.location || "Grand Ballroom"}</h4>
        ${ev.address ? `<p class="ev-addr">${ev.address}</p>` : ""}
        ${ev.notes ? `<p class="ev-notes" style="font-size:0.75rem; font-style:italic; margin-top:0.4rem; color:rgba(255,255,255,0.7);">${ev.notes}</p>` : ""}
        ${ev.mapsUrl ? `
          <a href="${ev.mapsUrl}" target="_blank" rel="noreferrer" class="btn-map-outline">
            BUKA MAPS
          </a>
        ` : ""}
      </div>
    `).join("")
    : `
      <div class="event-block-item">
        <span class="ev-cat">SAKRAMEN / AKAD</span>
        <h3 class="ev-name serif">AKAD NIKAH</h3>
        <p class="ev-time">08.00 – 10.00 WITA</p>
        <h4 class="ev-venue">Masjid Raya Makassar</h4>
        <p class="ev-addr">Jl. Masjid Raya, Makassar</p>
        <a href="https://maps.google.com" target="_blank" class="btn-map-outline">BUKA MAPS</a>
      </div>
      <div class="event-block-item">
        <span class="ev-cat">RESEPSI</span>
        <h3 class="ev-name serif">RESEPSI PERNIKAHAN</h3>
        <p class="ev-time">11.00 – 14.00 WITA</p>
        <h4 class="ev-venue">Grand Ballroom Phinisi Hotel Clarion</h4>
        <p class="ev-addr">Jl. A.P. Pettarani, Makassar</p>
        <a href="https://maps.google.com" target="_blank" class="btn-map-outline">BUKA MAPS</a>
      </div>
    `;

  // 2. Dynamic Love Story HTML (Benchmark Kila "JOURNEY OF LOVE" with Dual Previews & Signature)
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
          <p class="chapter-desc">${st.content || st.description || ""}</p>
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
          <h2 class="journey-title serif">JOURNEY OF LOVE</h2>
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
    const u = gm.driveViewUrl || gm.localPath;
    if (u && !allPhotos.includes(u)) allPhotos.push(u);
  });

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
    const display10 = allPhotos.slice(0, 10);
    const photos10Html = display10.map((imgUrl, i) => `
      <div class="moment-photo-item ${i % 3 === 0 ? 'wide' : ''}" onclick="luxOpenZoom(${i})">
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
        <span class="sec-eyebrow">GALLERY</span>
        <h2 class="sec-main-title serif">OUR MOMENT</h2>
        <p class="moment-quote serif">
          “And I’d choose you; in a hundred lifetimes, in a hundred worlds, in any version of reality, I’d find you and I’d choose you.”
        </p>

        ${videoPlayerHtml}

        <div class="moments-grid-10">
          ${photos10Html}
        </div>

        <button type="button" class="btn-outline-box btn-show-gallery" onclick="luxOpenFullGallery()">
          LIHAT SEMUA FOTO (${allPhotos.length} FOTO)
        </button>
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
          <img id="luxZoomActiveImg" src="${display10[0]}" alt="Zoom View">
        </div>
        <button class="lux-zoom-nav next" onclick="luxNextZoom(event)">›</button>
      </div>

      <script>
        window.LUX_ALL_PHOTOS = ${JSON.stringify(allPhotos)};
        window.luxActivePhotoIdx = 0;

        window.luxOpenFullGallery = function() {
          const m = document.getElementById('luxFullGalleryModal');
          if (m) {
            m.classList.add('open');
            document.body.style.overflow = 'hidden';
          }
        };

        window.luxCloseFullGallery = function(e) {
          if (!e || e.target === document.getElementById('luxFullGalleryModal')) {
            const m = document.getElementById('luxFullGalleryModal');
            if (m) {
              m.classList.remove('open');
              document.body.style.overflow = '';
            }
          }
        };

        window.luxOpenZoom = function(idx) {
          window.luxActivePhotoIdx = idx >= 0 && idx < window.LUX_ALL_PHOTOS.length ? idx : 0;
          const zoom = document.getElementById('luxZoomModal');
          const img = document.getElementById('luxZoomActiveImg');
          if (img && window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx]) {
            img.src = window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx];
          }
          if (zoom) {
            zoom.classList.add('open');
            document.body.style.overflow = 'hidden';
          }
        };

        window.luxCloseZoom = function(e) {
          if (!e || e.target === document.getElementById('luxZoomModal')) {
            const zoom = document.getElementById('luxZoomModal');
            if (zoom) {
              zoom.classList.remove('open');
              const fg = document.getElementById('luxFullGalleryModal');
              if (!fg || !fg.classList.contains('open')) {
                document.body.style.overflow = '';
              }
            }
          }
        };

        window.luxNextZoom = function(e) {
          if (e) e.stopPropagation();
          window.luxActivePhotoIdx = (window.luxActivePhotoIdx + 1) % window.LUX_ALL_PHOTOS.length;
          const img = document.getElementById('luxZoomActiveImg');
          if (img) img.src = window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx];
        };

        window.luxPrevZoom = function(e) {
          if (e) e.stopPropagation();
          window.luxActivePhotoIdx = (window.luxActivePhotoIdx - 1 + window.LUX_ALL_PHOTOS.length) % window.LUX_ALL_PHOTOS.length;
          const img = document.getElementById('luxZoomActiveImg');
          if (img) img.src = window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx];
        };
      </script>
    `;
  }

  // 6. Section: QR Check-In / Kartu Akses Masuk
  const qrAccessSectionHtml = `
    <section class="sec-flow" id="checkin">
      <span class="sec-eyebrow">QR CODE CHECK-IN</span>
      <h2 class="sec-main-title serif">KARTU AKSES MASUK</h2>
      <p class="sec-sub">Silakan tunjukkan QR Code ini kepada penerima tamu undangan di lokasi acara.</p>
      
      <div class="access-pass-card">
        <span class="pass-tagline">${featureSettings.weddingTagline || "THE WEDDING OF"}</span>
        <h3 class="pass-names serif">${firstName} <em>&amp;</em> ${secondName}</h3>
        <p class="pass-date">${weddingDate}</p>
        
        <div class="pass-qr-wrapper">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=LUX-${inv.id}" alt="QR Check-In" class="pass-qr-img">
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
  `;

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
        ${dressCodeNote ? `<p style="margin:0; font-size:0.8rem; color:rgba(255,255,255,0.75); line-height:1.5;">${dressCodeNote}</p>` : ""}
      </section>
    `;
  }

  // 8. Section: Live Streaming (Live Wedding)
  const liveStreamYoutubeUrl = featureSettings.liveStreamYoutubeUrl || inv.liveStreamUrl || "";
  const liveStreamInstagramUrl = featureSettings.liveStreamInstagramUrl || "";
  const liveStreamZoomUrl = featureSettings.liveStreamZoomUrl || "";
  let liveStreamingHtml = "";
  if (liveStreamYoutubeUrl || liveStreamInstagramUrl || liveStreamZoomUrl) {
    liveStreamingHtml = `
      <section class="sec-flow" id="live">
        <span class="sec-eyebrow">VIRTUAL CEREMONY</span>
        <h2 class="sec-main-title serif">LIVE WEDDING</h2>
        <p class="sec-sub">${weddingDate} • 08.00 – Selesai WITA</p>
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
  if (instagramFilterUrl) {
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
  if (turutMengundangList && turutMengundangList.trim() !== "") {
    const lines = turutMengundangList.split("\n").filter((l: string) => l.trim() !== "");
    turutMengundangHtml = `
      <section class="sec-flow" id="turut-mengundang">
        <span class="sec-eyebrow">KELUARGA BESAR</span>
        <h2 class="sec-main-title serif">TURUT MENGUNDANG</h2>
        <p class="sec-sub">Keluarga Besar &amp; Kerabat yang turut berbahagia:</p>
        <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:1.5rem; font-size:0.88rem; color:rgba(255,255,255,0.85);">
          ${lines.map((line: string) => `<p style="margin:0; padding:0.4rem 0; border-bottom:1px dashed rgba(255,255,255,0.12);">${line.trim()}</p>`).join("")}
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
            ${inv.shippingAddress || "Jl. Pengantin No. 12, Makassar"}
          </p>
          <button class="btn-copy" onclick="copyText('${inv.shippingAddress || "Jl. Pengantin No. 12, Makassar"}')">Salin Alamat</button>
        </div>
      </section>
    `;
  }

  // 12. Section: RSVP & Wishes Feed
  const wishesHtml = inv.rsvps.length > 0
    ? inv.rsvps.map((r: any) => `
      <div class="wish-item">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
          <span class="wish-name">${r.guestName}</span>
          <span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:${r.status === 'hadir' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}; color:${r.status === 'hadir' ? '#4ade80' : '#f87171'}; font-weight:600;">${r.status === 'hadir' ? 'Hadir' : 'Berhalangan'}</span>
        </div>
        ${r.message ? `<p class="wish-msg">“${r.message}”</p>` : ""}
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
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=LUX-${inv.id}" alt="QR Check-In" style="width:160px; height:160px; display:block;">
      </div>
    </div>
  `;

  // Google Calendar URL
  const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`The Wedding of ${firstName} & ${secondName}`)}&dates=${weddingDateYear}${weddingDateMonth}${weddingDateDay}T010000Z/${weddingDateYear}${weddingDateMonth}${weddingDateDay}T140000Z&location=${encodeURIComponent(events[0]?.location || "Makassar")}`;

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
    sidebarPhotoUrl: sidebarUrl,
    globalBgUrl: fixedBgUrl,
    audioUrl: featureSettings.showMusic !== false ? (inv.musicUrl || featureSettings.musicUrl || "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3") : "",

    // Quotes & Dates
    openingQuote: inv.openingQuote || "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan diantaramu rasa kasih dan sayang.",
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
    qrAccessCardHtml,

    // Palette Tokens
    colorPrimary: palette.primary,
    colorSecondary: palette.secondary,
    colorAccent: palette.accent,
    colorBgLight: palette.bgLight,
    colorBgDark: palette.bgDark,
    colorTextDark: palette.textDark,
  };
}
