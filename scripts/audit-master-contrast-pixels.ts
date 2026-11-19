/**
 * Audit keterbacaan master berbasis piksel. `audit-master-contrast.ts` membaca latar dari CSS dan tidak menilai teks di
 * atas foto atau tekstur; skrip ini mengukur latar yang benar-benar tampil: setiap layar difoto dengan semua teks dibuat
 * transparan, lalu warna setiap teks dibandingkan dengan rata-rata piksel di belakangnya (WCAG: 4,5; 3 untuk teks besar).
 *
 * Master dirender dengan data demo (foto demo dari public/demo bila ada; tanpa foto, latar bawaan tema yang dinilai),
 * dibuka di 390x844, sampul dibuka, elemen reveal dipaksa tampil, lalu halaman digulir layar demi layar.
 * Teks hiasan (watermark, ghost, >= 60px) dicatat terpisah karena memang dibuat pudar.
 *
 *   --theme=a,b   batasi ke id master tertentu.   --out=<berkas.json>   simpan laporan lengkap.
 *   --strict      exit 1 bila ada teks bukan hiasan dengan rasio di bawah 2 (praktis tidak terbaca).
 *   --global-bg=<url>  isi slot Latar Belakang Global seperti unggahan klien (mis. /uploads/dummy/AMS06328.webp).
 */
import "dotenv/config";
import fs from "fs";
import sharp from "sharp";
import { prisma } from "../lib/prisma";
import { FREEZE, arg, listMasters, requireTestDatabase, sleep, startChrome, startRenderServer } from "./masterHarness";
import { buildDemoInvitation } from "../lib/demoInvitation";

const VW = 390;
const VH = 844;
const SEVERE = 2;

interface TextBox { text: string; sel: string; rect: [number, number, number, number]; fg: [number, number, number, number]; size: number; weight: number }
interface Finding { sel: string; text: string; ratio: number; min: number; size: number; fg: number[]; bg: number[]; y: number; decorative: boolean }

const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const luminance = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const PREPARE = `(() => {
  document.querySelector('.btn-buka')?.click();
  document.querySelectorAll("[class*='reveal']").forEach((el) => el.classList.add("active", "visible", "show", "in-view", "revealed"));
  document.documentElement.style.scrollBehavior = 'auto';
  const st = document.createElement('style');
  st.id = 'pxa-hide';
  st.media = 'not all';
  st.textContent = '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}';
  document.head.appendChild(st);
  return document.scrollingElement.scrollHeight;
})()`;

const COLLECT = `(() => {
  const VW = ${VW}, VH = ${VH};
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const els = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent.trim().length > 1 && n.parentElement) els.add(n.parentElement);
  for (const el of els) {
    if (el.closest('script,style,noscript,svg,select,option,textarea,input')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    let op = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    if (op < 0.35) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6 || r.bottom < 0 || r.top > VH || r.right < 0 || r.left > VW) continue;
    const cx = Math.min(VW - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(VH - 1, Math.max(0, r.top + r.height / 2));
    const top = document.elementFromPoint(cx, cy);
    if (top && top !== el && !el.contains(top) && !top.contains(el)) continue;
    const m = cs.color.match(/rgba?\\(([^)]+)\\)/); if (!m) continue;
    const [cr, cg, cb, ca = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const section = el.closest('section[id], footer, nav, [id^="cover"]');
    out.push({ text: el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40),
      sel: (section ? '#' + (section.id || section.tagName.toLowerCase()) + ' ' : '') + el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : ''),
      rect: [Math.max(0, r.left), Math.max(0, r.top), Math.min(VW, r.right), Math.min(VH, r.bottom)], fg: [cr, cg, cb, ca * op],
      size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400 });
  }
  return out;
})()`;

async function main() {
  requireTestDatabase();
  const only = arg("theme")?.split(",");
  const masters = listMasters().filter((m) => !only || only.includes(m.id));
  const server = await startRenderServer();
  const { cdp, close } = await startChrome();
  const report: Record<string, Finding[]> = {};
  try {
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: "Element.prototype.requestFullscreen = function () { return Promise.resolve(); };" });
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: true });
    for (const m of masters) {
      const globalBg = arg("global-bg");
      const inv = globalBg ? { ...buildDemoInvitation(m.id, undefined, m.eventType), media: [{ mediaSlot: "GLOBAL_FIXED_BG", localPath: globalBg }] } : undefined;
      const url = await server.render(m, fs.readFileSync(m.rel, "utf8"), "pixel", FREEZE, inv as never);
      await cdp.goto(url, 800);
      await cdp.eval("document.fonts.ready.then(() => true)");
      const docHeight = await cdp.eval<number>(PREPARE);
      await sleep(1200);
      const findings: Finding[] = [];
      const seen = new Set<string>();
      for (let y = 0; y < docHeight; y += VH - 120) {
        await cdp.eval(`window.scrollTo(0, ${y})`);
        await sleep(350);
        const texts = await cdp.eval<TextBox[]>(COLLECT);
        await cdp.eval("document.getElementById('pxa-hide').media = 'all'");
        await sleep(60);
        const { data: shot } = await cdp.send("Page.captureScreenshot", { format: "png" });
        await cdp.eval("document.getElementById('pxa-hide').media = 'not all'");
        const { data, info } = await sharp(Buffer.from(shot, "base64")).raw().toBuffer({ resolveWithObject: true });
        for (const t of texts) {
          const key = `${t.sel}|${t.text}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const [x0, y0, x1, y1] = t.rect.map(Math.round);
          let rs = 0, gs = 0, bs = 0, n = 0;
          for (let yy = y0; yy < y1; yy += 2) for (let xx = x0; xx < x1; xx += 2) {
            const i = (yy * info.width + xx) * info.channels;
            rs += data[i]; gs += data[i + 1]; bs += data[i + 2]; n++;
          }
          if (!n) continue;
          const bg = [rs / n, gs / n, bs / n];
          const alpha = Math.min(1, t.fg[3]);
          const fg = [0, 1, 2].map((k) => t.fg[k] * alpha + bg[k] * (1 - alpha));
          const ratio = contrast(luminance(fg[0], fg[1], fg[2]), luminance(bg[0], bg[1], bg[2]));
          const min = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700) ? 3 : 4.5;
          if (ratio >= min) continue;
          const decorative = /watermark|ghost|bg-text|bg-name|outline-text|deco/i.test(t.sel) || t.size >= 60;
          findings.push({ sel: t.sel, text: t.text, ratio: +ratio.toFixed(2), min, size: t.size, fg: fg.map(Math.round), bg: bg.map(Math.round), y: y + y0, decorative });
        }
      }
      report[m.id] = findings.sort((a, b) => a.ratio - b.ratio);
      const severe = findings.filter((f) => !f.decorative && f.ratio < SEVERE);
      console.log(`${severe.length ? "BERAT" : "BAIK "}  ${m.id}  ${findings.filter((f) => !f.decorative).length} teks di bawah AA${severe.length ? `, ${severe.length} di bawah ${SEVERE}` : ""}`);
      for (const f of severe.slice(0, 6)) console.log(`        ${f.ratio.toFixed(2)}/${f.min}  rgb(${f.fg}) di rgb(${f.bg})  ${f.sel}  "${f.text}"`);
    }
  } finally {
    await close();
    await server.close();
    await prisma.$disconnect();
  }
  const out = arg("out");
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
  const severeTotal = Object.values(report).flat().filter((f) => !f.decorative && f.ratio < SEVERE).length;
  console.log(`${masters.length} master, ${severeTotal} teks bukan hiasan dengan rasio di bawah ${SEVERE}.`);
  process.exit(process.argv.includes("--strict") && severeTotal ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
