/**
 * Audit keterbacaan master tulisan tangan: setiap master dirender dengan data demo, dibuka di Chrome headless pada 375
 * dan 1440 px (skrip halaman berjalan, animasi dibekukan, elemen reveal dipaksa tampil), lalu kontras setiap teks diukur
 * dengan alat ukur yang sama dengan editor Varian Tema (`components/admin/variantReadability.ts`) dalam mode `hitTest`:
 * latar dibaca dari tumpukan elemen di bawah titik teks (termasuk lapisan latar tetap yang bukan leluhur), gradasi
 * dihitung rata-rata, teks di atas foto atau tekstur tanpa gradasi tidak dinilai.
 *
 * Teks dilaporkan bila di bawah WCAG AA (4,5; 3 untuk teks besar). Tingkat "berat" = rasio di bawah 3.
 *   --theme=a,b   batasi ke id master tertentu.   --out=<berkas.json>   simpan laporan lengkap.
 *   --strict      exit 1 bila ada temuan berat (untuk dipakai sebagai gerbang).
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { buildSync } from "esbuild";
import { prisma } from "../lib/prisma";
import { FREEZE, arg, listMasters, requireTestDatabase, startChrome, startRenderServer } from "./masterHarness";

interface Finding { selector: string; text: string; ratio: number; min: number; fg: string; bg: string; widths: number[] }

const MEASURE = buildSync({ entryPoints: [path.join(process.cwd(), "components/admin/variantReadability.ts")], bundle: true, format: "iife", globalName: "LuxRead", write: false, platform: "browser", logLevel: "silent" }).outputFiles[0].text;

const COLLECT = `(() => {
  document.querySelectorAll("[class*='reveal']").forEach((el) => el.classList.add("active", "visible", "show", "in-view", "revealed"));
  const pe = document.createElement("style");
  pe.textContent = "*,*::before,*::after{pointer-events:auto!important}";
  document.head.appendChild(pe);
  const describe = (el) => {
    const section = el.closest("section[id], [id^='cover'], footer, nav");
    const cls = [...el.classList].filter((c) => !/^(active|visible|show|in-view|revealed|reveal.*|del|delay.*)$/.test(c)).slice(0, 2).join(".");
    return (section ? "#" + (section.id || section.tagName.toLowerCase()) + " " : "") + el.tagName.toLowerCase() + (cls ? "." + cls : "");
  };
  return LuxRead.measureText(document, { hitTest: true }).filter((s) => s.ratio < s.min).map((s) => {
    s.el.scrollIntoView({ block: "center", inline: "nearest" });
    const bg = LuxRead.stackBackground(s.el, document);
    const fg = LuxRead.parseCssColor(getComputedStyle(s.el).color);
    return { selector: describe(s.el), text: s.text, ratio: s.ratio, min: s.min, fg: fg && bg ? LuxRead.toHex(LuxRead.blend(fg, bg)) : "", bg: bg ? LuxRead.toHex(bg) : "" };
  });
})()`;

async function main() {
  requireTestDatabase();
  const only = arg("theme")?.split(",");
  const masters = listMasters().filter((m) => !only || only.includes(m.id));
  const server = await startRenderServer();
  const { cdp, close } = await startChrome();
  const report: Record<string, Finding[]> = {};
  try {
    for (const m of masters) {
      const url = await server.render(m, fs.readFileSync(m.rel, "utf8"), "audit", FREEZE);
      const byKey = new Map<string, Finding>();
      for (const width of [375, 1440]) {
        await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
        await cdp.goto(url, 800);
        await cdp.eval("document.fonts.ready.then(() => true)");
        await cdp.eval(MEASURE);
        const found = await cdp.eval<Array<Omit<Finding, "widths">>>(COLLECT);
        for (const f of found) {
          const key = `${f.selector}|${f.fg}|${f.bg}`;
          const prev = byKey.get(key);
          if (prev) { if (!prev.widths.includes(width)) prev.widths.push(width); prev.ratio = Math.min(prev.ratio, f.ratio); }
          else byKey.set(key, { ...f, widths: [width] });
        }
      }
      report[m.id] = [...byKey.values()].sort((a, b) => a.ratio - b.ratio);
      const severe = report[m.id].filter((f) => f.ratio < 3).length;
      console.log(`${report[m.id].length ? (severe ? "BERAT" : "RINGAN") : "BAIK "}  ${m.id}  ${report[m.id].length} teks${severe ? `, ${severe} berat` : ""}`);
      for (const f of report[m.id].filter((x) => x.ratio < 3).slice(0, 6)) console.log(`        ${f.ratio.toFixed(2)}/${f.min}  ${f.fg} di ${f.bg}  ${f.selector}  "${f.text.slice(0, 40)}"`);
    }
  } finally {
    await close();
    await server.close();
    await prisma.$disconnect();
  }
  const out = arg("out");
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
  const severeTotal = Object.values(report).flat().filter((f) => f.ratio < 3).length;
  const total = Object.values(report).flat().length;
  console.log(`${masters.length} master, ${total} teks di bawah AA, ${severeTotal} berat (rasio < 3).`);
  process.exit(process.argv.includes("--strict") && severeTotal ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
