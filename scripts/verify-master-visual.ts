/**
 * Pembanding tampilan master tulisan tangan: merender dua versi master dengan data demo yang sama, membukanya di Chrome
 * headless (skrip halaman dimatikan, animasi dan transisi dibekukan), lalu membandingkan nilai CSS terhitung setiap
 * elemen beserta ::before/::after pada lebar 375 dan 1440 px. Dipakai untuk membuktikan perubahan CSS master yang
 * seharusnya tidak mengubah tampilan (tokenisasi warna, perapian CSS) memang tidak mengubah tampilan.
 *
 * Mode:
 *   --ref=<git-ref>     (bawaan HEAD) versi "sebelum" diambil dari git, versi "sesudah" dari working tree; tanpa --theme
 *                       yang dibandingkan hanya master yang berubah terhadap ref itu.
 *   --transform=tokenize versi "sesudah" = hasil tokenizeMaster atas berkas saat ini.
 *   --theme=a,b         batasi ke id master tertentu.  --widths=375,1440  lebar yang diuji.  --show=5  jumlah selisih yang dicetak.
 *
 * Setiap putaran menyertakan kontrol negatif: satu salinan master diberi perubahan warna kecil dan harus terdeteksi;
 * bila tidak, skrip gagal karena pembanding tidak peka.
 *
 * Contoh: DATABASE_URL=postgresql://postgres@localhost:5432/luxenary_test npx tsx scripts/verify-master-visual.ts --theme=valente
 */
import "dotenv/config";
import { execFileSync } from "child_process";
import fs from "fs";
import { tokenizeMaster } from "../lib/themeTokenize";
import { prisma } from "../lib/prisma";
import { FREEZE, arg, listMasters, requireTestDatabase, startChrome, startRenderServer } from "./masterHarness";

const PROPS = [
  "color", "background-color", "background-image", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "outline-color", "box-shadow", "text-shadow", "fill", "stroke", "filter", "opacity", "font-family", "font-size", "font-weight",
  "font-style", "letter-spacing", "line-height", "text-transform", "display", "padding", "margin", "border-radius", "content",
];

const COLLECT = `(() => {
  const props = ${JSON.stringify(PROPS)};
  const out = [];
  document.querySelectorAll("body, body *").forEach((el, i) => {
    for (const pseudo of [null, "::before", "::after"]) {
      const cs = getComputedStyle(el, pseudo);
      if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
      out.push([i + ":" + el.tagName + (pseudo || ""), props.map((p) => cs.getPropertyValue(p))]);
    }
  });
  // Deklarasi @font-face yang tidak sah (mis. var() di deskriptor font-family) tidak terdaftar sama sekali; nama huruf
  // terhitung tetap sama sehingga hanya daftar ini yang menangkapnya.
  out.push(["@font-face", [[...new Set([...document.fonts].map((f) => f.family))].sort().join(", ")]]);
  return out;
})()`;

/**
 * `color(srgb …)` dan `rgb()` diseragamkan, warna dengan alfa 0 dianggap transparan apa pun kanalnya; selisih angka
 * sampai 1.5 (pembulatan kanal warna) dianggap sama.
 */
function normalize(value: string): string {
  return value
    .replace(/color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+))?\)/g, (_, r, g, b, a) => `rgba(${+r * 255}, ${+g * 255}, ${+b * 255}, ${a ?? 1})`)
    .replace(/rgb\(([^)]+)\)/g, "rgba($1, 1)")
    .replace(/rgba\([^,]+,[^,]+,[^,]+,\s*0\)/g, "rgba(0, 0, 0, 0)");
}

function sameValue(a: string, b: string): boolean {
  if (a === b) return true;
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return true;
  const NUM = /-?\d*\.?\d+(e-?\d+)?/g;
  const skeleton = (s: string) => s.replace(NUM, "#");
  if (skeleton(na) !== skeleton(nb)) return false;
  const xa = na.match(NUM) ?? [], xb = nb.match(NUM) ?? [];
  return xa.every((x, i) => Math.abs(parseFloat(x) - parseFloat(xb[i])) <= 1.5);
}

function compare(before: Array<[string, string[]]>, after: Array<[string, string[]]>): string[] {
  const diffs: string[] = [];
  if (before.length !== after.length) diffs.push(`jumlah elemen berbeda: ${before.length} vs ${after.length}`);
  const afterMap = new Map(after);
  for (const [key, values] of before) {
    const other = afterMap.get(key);
    if (!other) { diffs.push(`${key} hilang`); continue; }
    values.forEach((v, i) => { if (!sameValue(v, other[i])) diffs.push(`${key} ${key === "@font-face" ? "keluarga terdaftar" : PROPS[i]}: ${v} -> ${other[i]}`); });
  }
  return diffs;
}

async function main() {
  requireTestDatabase();
  const ref = arg("ref") ?? "HEAD";
  const transform = arg("transform");
  const widths = (arg("widths") ?? "375,1440").split(",").map(Number);
  const only = arg("theme")?.split(",");
  let masters = listMasters();
  if (only) masters = masters.filter((m) => only.includes(m.id));
  else if (transform !== "tokenize") {
    const changed = new Set(execFileSync("git", ["diff", "--name-only", ref, "--", "themes"], { encoding: "utf8" }).split("\n").filter(Boolean));
    masters = masters.filter((m) => changed.has(m.rel));
  }
  if (!masters.length) { console.log("Tidak ada master untuk dibandingkan."); return; }

  const server = await startRenderServer();
  const render = (m: (typeof masters)[number], source: string, tag: string) => server.render(m, source, tag, FREEZE);
  const show = Number(arg("show") ?? 5);

  const { cdp, close } = await startChrome();
  let failed = 0;
  try {
    await cdp.send("Emulation.setScriptExecutionDisabled", { value: true });

    const styles = async (url: string, width: number) => {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      await cdp.goto(url);
      await cdp.send("Emulation.setScriptExecutionDisabled", { value: false });
      // Tinggi teks (dan margin auto di sekitarnya) baru final setelah huruf web selesai dimuat.
      await cdp.eval("document.fonts.ready.then(() => true)");
      const result = await cdp.eval<Array<[string, string[]]>>(COLLECT);
      await cdp.send("Emulation.setScriptExecutionDisabled", { value: true });
      return result;
    };

    // Kontrol negatif: perubahan satu warna teks harus tertangkap.
    const probe = masters[0];
    const probeSource = fs.readFileSync(probe.rel, "utf8");
    const controlA = await render(probe, probeSource, "control-a");
    const controlB = await render(probe, probeSource.replace(/<\/head>/i, "<style>body{color:#123456!important}</style></head>"), "control-b");
    const controlDiffs = compare(await styles(controlA, widths[0]), await styles(controlB, widths[0]));
    if (!controlDiffs.length) throw new Error("Kontrol negatif tidak terdeteksi: pembanding tidak peka.");
    console.log(`kontrol negatif terdeteksi (${controlDiffs.length} selisih)`);

    for (const m of masters) {
      const current = fs.readFileSync(m.rel, "utf8");
      const beforeSource = transform === "tokenize" ? current : execFileSync("git", ["show", `${ref}:${m.rel}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      const afterSource = transform === "tokenize" ? tokenizeMaster(current).html : current;
      const [a, b] = [await render(m, beforeSource, "before"), await render(m, afterSource, "after")];
      for (const width of widths) {
        const diffs = compare(await styles(a, width), await styles(b, width));
        if (diffs.length) failed++;
        console.log(`${diffs.length ? "BEDA " : "SAMA "} ${m.id} @${width}px${diffs.length ? `  ${diffs.length} selisih` : ""}`);
        diffs.slice(0, show).forEach((d) => console.log(`        ${d}`));
      }
    }
  } finally {
    await close();
    await server.close();
    await prisma.$disconnect();
  }
  console.log(failed ? `${failed} perbandingan berbeda.` : "Semua perbandingan sama.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
