/**
 * Tokenisasi master tema tulisan tangan (lib/themeTokenize.ts): warna dan huruf yang tertulis langsung di CSS diganti
 * variabel `:root`, tanpa mengubah tampilan. Fondasi Varian Tema. Piring undangan klien (data/drafts) tidak disentuh;
 * undangan yang sudah ada tetap memakai salinan bekunya.
 *
 *   npx tsx scripts/tokenize-masters.ts                         # laporan saja (tanpa menulis)
 *   npx tsx scripts/tokenize-masters.ts --themes=valente,bone   # laporan untuk tema tertentu
 *   npx tsx scripts/tokenize-masters.ts --write                 # tulis ulang master
 *   npx tsx scripts/tokenize-masters.ts --report=out.json       # simpan laporan lengkap per master
 *
 * Jalankan verifikasi tampilan (computed style sebelum/sesudah) sebelum --write; menjalankan ulang pada master yang
 * sudah ditokenisasi aman karena warna yang tersisa hanya netral atau di luar CSS.
 */
import fs from "fs";
import path from "path";
import { tokenizeMaster, type TokenizeReport } from "../lib/themeTokenize";

const write = process.argv.includes("--write");
const reportPath = process.argv.find((a) => a.startsWith("--report="))?.slice("--report=".length);
const themesArg = process.argv.find((a) => a.startsWith("--themes="))?.slice("--themes=".length);
const filter = themesArg ? new Set(themesArg.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)) : null;

const THEMES_DIR = path.join(process.cwd(), "themes");

function masterFiles(): string[] {
  const files: string[] = [];
  for (const event of fs.readdirSync(THEMES_DIR)) {
    const eventDir = path.join(THEMES_DIR, event);
    if (event.startsWith("_") || !fs.statSync(eventDir).isDirectory()) continue;
    for (const style of fs.readdirSync(eventDir)) {
      const styleDir = path.join(eventDir, style);
      if (!fs.statSync(styleDir).isDirectory()) continue;
      for (const f of fs.readdirSync(styleDir)) {
        if (!f.endsWith(".html")) continue;
        if (filter && !filter.has(f.replace(/\.html$/, "").toLowerCase())) continue;
        files.push(path.join(styleDir, f));
      }
    }
  }
  return files.sort();
}

const results: Array<{ file: string; report: TokenizeReport; changed: boolean }> = [];
let failed = 0;
for (const file of masterFiles()) {
  const rel = path.relative(process.cwd(), file);
  try {
    const before = fs.readFileSync(file, "utf-8");
    const { html, report } = tokenizeMaster(before);
    const changed = html !== before;
    if (write && changed) fs.writeFileSync(file, html, "utf-8");
    results.push({ file: rel, report, changed });
  } catch (err) {
    failed++;
    console.error(`GAGAL ${rel}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const sum = (key: keyof TokenizeReport) => results.reduce((n, r) => n + (typeof r.report[key] === "number" ? (r.report[key] as number) : 0), 0);
console.log(`${write ? "DITULIS" : "LAPORAN (tanpa menulis)"}: ${results.length} master, ${results.filter((r) => r.changed).length} berubah, ${failed} gagal`);
console.log(`  warna ${sum("colors")}, huruf ${sum("fonts")}`);
console.log(`  netral dilewati ${sum("skippedNeutral")}, warna di luar CSS (skrip/atribut SVG) ${sum("untouchedOutsideCss")}`);
if (reportPath) {
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`  laporan lengkap: ${reportPath}`);
}
if (failed) process.exitCode = 1;
