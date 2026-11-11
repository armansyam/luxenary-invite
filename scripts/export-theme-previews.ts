/**
 * Membuat thumbnail "Bawaan tema" untuk Studio dari master berilustrasi (data-lux-desktop-cover="full"): master asli
 * dirender dengan data demo lalu tiap slot dipotret dengan teks disembunyikan, sehingga klien melihat ilustrasi yang akan
 * tampil bila slot itu tidak diisi. Hasil: public/assets/theme-previews/<id>/<slot>.webp (dibaca lib/themeArtPreview.ts).
 *
 *   npx tsx scripts/export-theme-previews.ts            # semua master berilustrasi
 *   npx tsx scripts/export-theme-previews.ts pena sorak # master tertentu
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { listMasters, startChrome, startRenderServer, sleep } from "./masterHarness";
import { artPreviewFile, type ArtPreviewSlot } from "../lib/themeArtPreview";

const OUT_ROOT = path.join(process.cwd(), "public/assets/theme-previews");
const MAX_WIDTH = 720;
const FREEZE = "*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1!important;transform:none!important}";

interface Shot { slot: ArtPreviewSlot; width: number; height: number; css: string; target: string | null }

// target null = seluruh layar; selain itu potongan seluas elemen tersebut.
const SHOTS: Shot[] = [
  { slot: "LANDING_COVER", width: 375, height: 740, css: ".cover-inner{visibility:hidden!important}", target: null },
  { slot: "LANDING_COVER_DESKTOP", width: 1440, height: 900, css: ".cover-inner{visibility:hidden!important}", target: null },
  { slot: "HOME_PHOTO", width: 375, height: 740, css: "#coverScreen{display:none!important}#home>:not(svg),#home .scroll-cue{visibility:hidden!important}", target: "#home" },
  { slot: "DESKTOP_SIDEBAR", width: 1440, height: 900, css: "#coverScreen{display:none!important}.left-hero-content{visibility:hidden!important}", target: ".left-hero" },
  { slot: "CLOSING_COVER", width: 375, height: 740, css: "#coverScreen{display:none!important}.closing-content,.bottom-dock{visibility:hidden!important}", target: "footer" },
];

(async () => {
  const wanted = process.argv.slice(2);
  const masters = listMasters().filter((m) => {
    if (wanted.length && !wanted.includes(m.id)) return false;
    return /data-lux-desktop-cover="full"/.test(fs.readFileSync(path.join(process.cwd(), m.rel), "utf8"));
  });
  const missing = wanted.filter((id) => !masters.some((m) => m.id === id));
  if (missing.length) throw new Error(`Bukan master berilustrasi atau tidak ditemukan: ${missing.join(", ")}`);

  const server = await startRenderServer();
  const { cdp, close } = await startChrome();
  let written = 0;
  try {
    for (const m of masters) {
      const url = await server.render(m, fs.readFileSync(path.join(process.cwd(), m.rel), "utf8"), "preview");
      const dir = path.join(OUT_ROOT, m.id);
      fs.mkdirSync(dir, { recursive: true });
      for (const shot of SHOTS) {
        await cdp.send("Emulation.setDeviceMetricsOverride", { width: shot.width, height: shot.height, deviceScaleFactor: 1, mobile: shot.width < 900 });
        await cdp.goto(url, 1200);
        await cdp.eval(`(() => { const st = document.createElement("style"); st.textContent = ${JSON.stringify(FREEZE + shot.css)}; document.head.appendChild(st); document.body.classList.remove("is-locked"); document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-visible")); return true; })()`);
        await sleep(300);
        let clip: { x: number; y: number; width: number; height: number } | undefined;
        if (shot.target) {
          const rect = await cdp.eval<{ x: number; y: number; width: number; height: number } | null>(
            `(() => { const el = document.querySelector(${JSON.stringify(shot.target)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: Math.min(r.height, ${shot.height}) }; })()`,
          );
          if (!rect || rect.width < 10 || rect.height < 10) throw new Error(`${m.id}: elemen ${shot.target} untuk ${shot.slot} tidak tampil`);
          clip = rect;
        }
        const png = Buffer.from(
          (await cdp.send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : {}) })).data,
          "base64",
        );
        const out = path.join(dir, artPreviewFile(shot.slot));
        await sharp(png).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
        written++;
      }
      console.log(`${m.id}: ${SHOTS.length} pratinjau`);
    }
  } finally {
    await close();
    await server.close();
  }
  console.log(`Selesai: ${written} gambar di ${path.relative(process.cwd(), OUT_ROOT)}/`);
})().catch((e) => { console.error(e); process.exit(1); });
