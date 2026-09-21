import http from "http";
import fs from "fs";
import path from "path";
import { COLOR_PALETTES } from "../lib/colorPalettes";

interface ThemeConfig {
  id: string;
  name: string;
  category: "traditional" | "modern" | "premium";
  series: string;
  description: string;
  defaultPalette?: string;
  sortOrder?: number;
}

function resolveWorkspacePath(targetName?: string): { dir: string; name: string } {
  const root = path.join(process.cwd(), "theme-builder");
  if (!targetName || targetName === "starter") {
    return { dir: path.join(root, "starter"), name: "starter" };
  }

  const workspaceDir = path.join(root, "workspaces", targetName);
  if (fs.existsSync(workspaceDir)) {
    return { dir: workspaceDir, name: targetName };
  }

  const directDir = path.join(root, targetName);
  if (fs.existsSync(directDir)) {
    return { dir: directDir, name: targetName };
  }

  // Fallback to starter
  return { dir: path.join(root, "starter"), name: "starter" };
}

function renderMockSections(mock: any, palette: any) {
  // 1. Events HTML
  const eventsHtml = `
    <div class="events-unified-container">
      <div class="events-sessions-stack">
        ${(mock.events || [])
          .map(
            (ev: any) => `
          <div class="event-block-item unified-session">
            <span class="ev-cat">${ev.badge || "ACARA"}</span>
            <h3 class="ev-name serif">${(ev.title || "").toUpperCase()}</h3>
            <p class="ev-time">${ev.time || ""}</p>
          </div>`
          )
          .join("")}
      </div>
      <div class="event-unified-venue-card">
        <span class="venue-card-lbl">LOKASI ACARA</span>
        <h4 class="ev-venue-unified serif">${mock.events?.[0]?.location || "Grand Ballroom"}</h4>
        <p class="ev-address-unified">${mock.events?.[0]?.address || ""}</p>
        <a href="${mock.events?.[0]?.mapsUrl || "https://maps.google.com"}" target="_blank" class="btn-map-outline">
          BUKA GOOGLE MAPS
        </a>
      </div>
    </div>
  `;

  // 2. Stories Items HTML & Section HTML
  const storyItemsHtml = (mock.stories || [])
    .map(
      (s: any) => `
    <div class="story-chapter-block">
      <span class="sc-label">${(s.chapter || "BAB").toUpperCase()}</span>
      <h3 class="sc-title serif">${s.title || ""}</h3>
      <p class="sc-desc">${s.content || ""}</p>
    </div>`
    )
    .join("");

  const storySectionHtml = `
    <section class="sec-flow sec-journey" id="story">
      <span class="sec-eyebrow reveal" data-lux-field="customLabels.storyEyebrow">${mock.storySectionEyebrow || "OUR JOURNEY"}</span>
      <h2 class="sec-main-title journey-title serif reveal delay-1" data-lux-field="customLabels.storyTitle">${mock.storySectionTitle || "Love Story"}</h2>
      <div class="journey-timeline journey-chapters reveal-up delay-2">
        ${storyItemsHtml}
      </div>
      <div class="journey-footer reveal-fade delay-3">
        <div class="jf-line"></div>
        <span class="jf-signature serif">${mock.firstName} <em>&amp;</em> ${mock.secondName}</span>
      </div>
    </section>
  `;

  // 3. Gallery HTML
  const galleryPhotos = mock.galleryPhotos || [];
  const galleryPhotosHtml = galleryPhotos
    .map(
      (imgUrl: string, i: number) => `
    <div class="moment-photo-item" data-idx="${i}" onclick="luxOpenZoom(${i})">
      <img src="${imgUrl}" alt="Moment ${i + 1}" loading="lazy" />
    </div>`
    )
    .join("");

  const gallerySectionHtml = `
    <section class="sec-flow" id="gallery">
      <span class="sec-eyebrow">OUR MOMENTS</span>
      <h2 class="sec-main-title serif">Potret Bahagia</h2>
      <p class="sec-sub">Setiap detik yang terabadikan adalah saksi perjalanan kasih kami.</p>
      <div class="gallery-grid-clean">
        ${galleryPhotosHtml}
      </div>
    </section>
  `;

  // 4. Gift Cards HTML
  const giftCardsHtml = (mock.banks || [])
    .map(
      (b: any) => `
    <div class="gift-bank-card">
      <span class="gb-bank-name serif">${b.bank}</span>
      <span class="gb-account-num font-mono">${b.number}</span>
      <span class="gb-account-owner">a.n. ${b.name}</span>
      <button class="btn-copy-gift" onclick="luxCopy('${b.number}', this)">Salin Nomor Rekening</button>
    </div>`
    )
    .join("");

  const giftSectionHtml = `
    <section class="sec-flow" id="gift" style="background:#fdfbf7;">
      <span class="sec-eyebrow">WEDDING GIFT</span>
      <h2 class="sec-main-title serif">Tanda Kasih</h2>
      <p class="sec-sub">Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Dan jika memberi adalah ungkapan tanda kasih, Anda dapat mengirimkannya melalui:</p>
      <div class="gift-cards-stack">
        ${giftCardsHtml}
      </div>
    </section>
  `;

  // 5. Dress Code HTML
  const dressCodeColors = (mock.dressCode?.colors || ["#d8cebe", "#c47a53", "#2b2725"])
    .map(
      (c: string) => `
    <div class="dress-color-pill" style="background: ${c};" title="${c}"></div>`
    )
    .join("");

  const dressCodeHtml = `
    <section class="sec-flow" id="dresscode">
      <span class="sec-eyebrow">PANDUAN BUSANA</span>
      <h2 class="sec-main-title serif">${mock.dressCode?.title || "Dress Code"}</h2>
      <p class="sec-sub">${mock.dressCode?.note || "Kami mengundang tamu undangan untuk mengenakan busana dengan palet berikut:"}</p>
      <div class="dresscode-palette-row" style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
        ${dressCodeColors}
      </div>
    </section>
  `;

  // 6. Turut Mengundang HTML
  const turutMengundangList = (mock.turutMengundang || [])
    .map((fam: string) => `<li style="margin-bottom:6px; font-size:13px; color:var(--text-main);">${fam}</li>`)
    .join("");

  const turutMengundangHtml = `
    <section class="sec-flow" id="turutmengundang" style="background:rgba(0,0,0,0.02);">
      <span class="sec-eyebrow">KELUARGA BESAR</span>
      <h2 class="sec-main-title serif">Turut Mengundang</h2>
      <ul style="list-style:none; padding:0; margin-top:16px; text-align:center;">
        ${turutMengundangList}
      </ul>
    </section>
  `;

  // 7. Wishes HTML
  const wishesHtml = (mock.wishes || [])
    .map(
      (w: any) => `
    <div class="wish-item-card" style="background: rgba(0, 0, 0, 0.03); border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 0.75rem; text-align: left;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.35rem;">
        <strong style="color: var(--primary, #b5833c); font-size: 0.92rem;">${w.name}</strong>
        <span style="font-size: 0.72rem; color: var(--text-muted, #736b63);">${w.time}</span>
      </div>
      <p style="margin: 0; font-size: 0.85rem; line-height: 1.5; color: var(--text-main, #2b2725);">${w.message}</p>
    </div>`
    )
    .join("");

  return {
    eventDataHtml: eventsHtml,
    storyItemsHtml,
    storySectionHtml,
    gallerySectionHtml,
    giftSectionHtml,
    dressCodeHtml,
    turutMengundangHtml,
    wishesHtml,
  };
}

export function compileTheme(workspaceDir: string): { html: string; warnings: string[] } {
  const masterPath = path.join(workspaceDir, "master.html");
  if (!fs.existsSync(masterPath)) {
    throw new Error(`File master.html tidak ditemukan di ${workspaceDir}`);
  }

  let html = fs.readFileSync(masterPath, "utf-8");

  // Load config & mock-data
  const configPath = path.join(workspaceDir, "config.json");
  const config: ThemeConfig = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
    : { id: "starter", name: "Starter", category: "traditional", series: "Traditional", defaultPalette: "champagne" };

  const mockPath = path.join(workspaceDir, "mock-data.json");
  const mock = fs.existsSync(mockPath)
    ? JSON.parse(fs.readFileSync(mockPath, "utf-8"))
    : {};

  // Resolve palette
  const paletteKey = config.defaultPalette || mock.defaultPalette || "champagne";
  const palette = (COLOR_PALETTES as any)[paletteKey] || COLOR_PALETTES.champagne;

  const sections = renderMockSections(mock, palette);

  const context: Record<string, any> = {
    ...mock,
    ...sections,
    themeId: config.id,
    themeName: config.name,
    category: config.category,
    series: config.series,
    colorPrimary: palette.primary,
    colorSecondary: palette.secondary,
    colorAccent: palette.accent,
    colorBgLight: palette.bgLight,
    colorBgDark: palette.bgDark,
    colorTextDark: palette.textDark || "#2b2725",
    closingPhotoClass: mock.closingPhotoUrl ? "has-closing-photo" : "no-closing-photo",
    closingBgStyle: mock.closingPhotoUrl ? `background-image: url('${mock.closingPhotoUrl}');` : "",
    qrDockButtonHtml: `<button onclick="openModal()" class="dock-btn qr-btn" aria-label="Tiket Tamu"><svg viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg><span>Tiket</span></button>`,
    qrCoverButtonHtml: `<button class="btn-qr-ghost" onclick="openModal()">QR Check-In →</button>`,
    qrAccessCardHtml: `
      <div class="qr-ticket-card" style="text-align:center; padding:1.2rem; background:#fff; border-radius:12px;">
        <span style="font-size:0.75rem; letter-spacing:0.15em; color:var(--primary); font-weight:700;">DIGITAL PASS &amp; QR CHECK-IN</span>
        <h3 class="serif" style="margin:8px 0 12px; font-size:1.2rem;">${mock.firstDisplayName} &amp; ${mock.secondDisplayName}</h3>
        <div style="background:#f8f9fa; padding:12px; border-radius:8px; display:inline-block; margin:8px auto;">
          <svg width="150" height="150" viewBox="0 0 100 100" fill="none" stroke="#2b2725" stroke-width="3">
            <rect x="10" y="10" width="80" height="80" stroke-width="4" />
            <rect x="25" y="25" width="20" height="20" fill="#2b2725" />
            <rect x="55" y="25" width="20" height="20" fill="#2b2725" />
            <rect x="25" y="55" width="20" height="20" fill="#2b2725" />
            <circle cx="65" cy="65" r="8" fill="#a67c52" />
          </svg>
        </div>
        <p style="font-size:11px; color:#736b63; margin-top:8px;">Tunjukkan kode QR ini kepada resepsionis saat tiba di lokasi acara.</p>
      </div>`,
    showStory: true,
    showGallery: true,
    showGift: true,
    showDressCode: true,
    showQrCheckin: true,
    invitationId: "DEMO-PREVIEW",
  };

  // 1. Handle conditional blocks: {{#if key}} ... {{/if}}
  html = html.replace(
    /\{\{\s*#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/gi,
    (_, key: string, inner: string) => {
      const val = context[key];
      return Boolean(val) ? inner : "";
    }
  );

  // 2. Replace all simple tokens: {{key}}
  html = html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    if (context[key] !== undefined) {
      return String(context[key]);
    }
    return match;
  });

  // 3. Blueprint Health & Compliance Audit
  const warnings: string[] = [];
  const requiredTokens = [
    "firstName",
    "secondName",
    "weddingDate",
    "openBtn",
    "openingGreeting",
    "openingQuote",
    "firstDisplayName",
    "secondDisplayName",
    "eventDataHtml",
    "wishesSectionTitle",
  ];

  for (const token of requiredTokens) {
    if (!html.includes(context[token] || "") && !mock[token]) {
      warnings.push(`Peringatan: Token {{${token}}} tidak terdeteksi dalam master.html`);
    }
  }

  if (!html.includes("luxSubmitRsvp")) {
    warnings.push("Kritikal: Fungsi 'luxSubmitRsvp' tidak ditemukan. Form RSVP tidak akan berfungsi.");
  }
  if (!html.includes("luxToggleAudio")) {
    warnings.push("Kritikal: Fungsi 'luxToggleAudio' tidak ditemukan. Tombol pemutar musik tidak akan berfungsi.");
  }
  if (!html.includes("openModal")) {
    warnings.push("Kritikal: Fungsi 'openModal' tidak ditemukan. Tombol QR tiket tidak akan merespons.");
  }

  // Inject Live-Reload Script for dev preview server
  const liveReloadScript = `
    <!-- THEME BUILDER LIVE-RELOAD -->
    <script>
      (function() {
        let lastTimestamp = 0;
        setInterval(async () => {
          try {
            const res = await fetch('/__live_ping?t=' + Date.now());
            const data = await res.json();
            if (lastTimestamp === 0) {
              lastTimestamp = data.timestamp;
            } else if (data.timestamp > lastTimestamp) {
              console.log('[Theme Builder] File berubah, memuat ulang...');
              window.location.reload();
            }
          } catch(e) {}
        }, 800);
      })();
    </script>
  `;

  if (html.includes("</body>")) {
    html = html.replace("</body>", `${liveReloadScript}\n</body>`);
  } else {
    html += liveReloadScript;
  }

  return { html, warnings };
}

// ── CLI RUNNER ──
async function main() {
  const args = process.argv.slice(2);
  const isCompileOnly = args.includes("--compile-only");
  const cleanArgs = args.filter((a) => !a.startsWith("--"));
  const targetTheme = cleanArgs[0] || "starter";

  const { dir: workspaceDir, name: themeName } = resolveWorkspacePath(targetTheme);

  console.log("==============================================================");
  console.log(`🏛️ LUXENARY THEME BUILDER — PREVIEW RUNNER`);
  console.log(`📂 Target Workspace : ${themeName} (${workspaceDir})`);
  console.log("==============================================================");

  if (!fs.existsSync(workspaceDir)) {
    console.error(`[ERROR] Direktori ${workspaceDir} tidak ditemukan!`);
    process.exit(1);
  }

  try {
    const { html, warnings } = compileTheme(workspaceDir);

    if (warnings.length > 0) {
      console.log("\n⚠️ PERINGATAN KEPATUHAN BLUEPRINT:");
      warnings.forEach((w) => console.log(`  • ${w}`));
    } else {
      console.log("✅ KEPATUHAN BLUEPRINT: 100% Lolos Audit Standar Emas!");
    }

    // Tulis file preview statis di dalam workspace demo/index.html
    const demoDir = path.join(workspaceDir, "demo");
    if (!fs.existsSync(demoDir)) {
      fs.mkdirSync(demoDir, { recursive: true });
    }
    const previewOutPath = path.join(demoDir, "index.html");
    fs.writeFileSync(previewOutPath, html, "utf-8");
    console.log(`📄 File demo tersimpan di: ${previewOutPath}`);

    if (isCompileOnly) {
      console.log("\n[SUCCESS] Kompilasi berhasil (--compile-only). Keluar.");
      process.exit(0);
    }

    // Jalankan Live Preview HTTP Server
    const PORT = 3333;
    let fileLastModified = Date.now();

    // Pantau perubahan file di folder workspace
    fs.watch(workspaceDir, { recursive: true }, (event, filename) => {
      if (
        filename &&
        (filename.endsWith(".html") || filename.endsWith(".json") || filename.endsWith(".css")) &&
        !filename.includes("index.html")
      ) {
        fileLastModified = Date.now();
      }
    });

    const mimeTypes: Record<string, string> = {
      ".webp": "image/webp",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".css": "text/css",
      ".js": "application/javascript",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".mp3": "audio/mpeg",
      ".ogg": "audio/ogg",
    };

    const server = http.createServer((req, res) => {
      const url = req.url || "/";

      // Live reload ping endpoint
      if (url.startsWith("/__live_ping")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ timestamp: fileLastModified }));
        return;
      }

      // Prioritas 1: Cek apakah file aset diminta dari folder demo/ lokal workspace
      if (url.startsWith("/demo/")) {
        const cleanPath = url.split("?")[0];
        const filename = path.basename(cleanPath);
        const localDemoFile = path.join(workspaceDir, "demo", filename);
        if (fs.existsSync(localDemoFile) && fs.statSync(localDemoFile).isFile()) {
          const ext = path.extname(localDemoFile).toLowerCase();
          res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
          fs.createReadStream(localDemoFile).pipe(res);
          return;
        }
      }

      // Prioritas 1.5: Fallback ke shared dummy-media bersama (theme-builder/dummy-media/)
      if (url.startsWith("/demo/") || url.startsWith("/dummy-media/")) {
        const cleanPath = url.split("?")[0];
        const filename = path.basename(cleanPath);
        const sharedDummyFile = path.join(process.cwd(), "theme-builder", "dummy-media", filename);
        if (fs.existsSync(sharedDummyFile) && fs.statSync(sharedDummyFile).isFile()) {
          const ext = path.extname(sharedDummyFile).toLowerCase();
          res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
          fs.createReadStream(sharedDummyFile).pipe(res);
          return;
        }
      }

      // Prioritas 2: Cek apakah ornamen diminta dari folder assets/ornaments lokal workspace
      if (url.startsWith("/assets/ornaments/")) {
        const cleanPath = url.split("?")[0];
        const filename = path.basename(cleanPath);
        const localOrnamentFile = path.join(workspaceDir, "assets", "ornaments", filename);
        if (fs.existsSync(localOrnamentFile) && fs.statSync(localOrnamentFile).isFile()) {
          const ext = path.extname(localOrnamentFile).toLowerCase();
          res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
          fs.createReadStream(localOrnamentFile).pipe(res);
          return;
        }
      }

      // Prioritas 3: Fallback ke direktori public/ sistem
      if (
        url.startsWith("/assets/") ||
        url.startsWith("/fonts/") ||
        url.startsWith("/demo/") ||
        url.startsWith("/music/")
      ) {
        const cleanPath = url.split("?")[0];
        const publicFile = path.join(process.cwd(), "public", cleanPath);
        if (fs.existsSync(publicFile) && fs.statSync(publicFile).isFile()) {
          const ext = path.extname(publicFile).toLowerCase();
          res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
          fs.createReadStream(publicFile).pipe(res);
          return;
        }
      }

      // Re-compile HTML dynamically on each request
      try {
        const fresh = compileTheme(workspaceDir);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fresh.html);
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Error kompilasi tema:\n${err.stack || err.message}`);
      }
    });

    server.listen(PORT, () => {
      console.log(`\n🚀 PREVIEW SERVER AKTIF!`);
      console.log(`🌐 Buka di browser: http://localhost:${PORT}`);
      console.log(`💡 Mode: Live Reload Aktif. Setiap Anda menyimpan file master.html, browser akan otomatis memuat ulang.`);
      console.log(`Tekan Ctrl+C untuk menghentikan server.`);
    });
  } catch (error: any) {
    console.error(`\n❌ GAGAL KOMPILASI:`, error.message);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("preview.ts")) {
  main();
}
