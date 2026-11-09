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
 *   --theme=a,b         batasi ke id master tertentu.  --widths=375,1440  lebar yang diuji.
 *
 * Setiap putaran menyertakan kontrol negatif: satu salinan master diberi perubahan warna kecil dan harus terdeteksi;
 * bila tidak, skrip gagal karena pembanding tidak peka.
 *
 * Contoh: DATABASE_URL=postgresql://postgres@localhost:5432/luxenary_test npx tsx scripts/verify-master-visual.ts --theme=valente
 */
import "dotenv/config";
import { execFileSync, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { tokenizeMaster } from "../lib/themeTokenize";
import { composeInvitationData } from "../lib/themeEngine";
import { renderTemplateFile } from "../lib/renderTemplate";
import { buildDemoInvitation } from "../lib/demoInvitation";
import { prisma } from "../lib/prisma";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const EVENT_OF_DIR: Record<string, string> = { wedding: "WEDDING", birthday: "BIRTHDAY", khitan: "KHITAN", aqiqah: "AQIQAH", wisuda: "WISUDA", general: "GATHERING" };
const PROPS = [
  "color", "background-color", "background-image", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "outline-color", "box-shadow", "text-shadow", "fill", "stroke", "filter", "opacity", "font-family", "font-size", "font-weight",
  "font-style", "letter-spacing", "line-height", "text-transform", "display", "padding", "margin", "border-radius", "content",
];
const FREEZE = "<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface MasterFile { id: string; rel: string; eventType: string }

function listMasters(): MasterFile[] {
  const out: MasterFile[] = [];
  for (const [dir, eventType] of Object.entries(EVENT_OF_DIR)) {
    const evDir = path.join("themes", dir);
    if (!fs.existsSync(evDir)) continue;
    for (const style of fs.readdirSync(evDir)) {
      const styleDir = path.join(evDir, style);
      if (!fs.statSync(styleDir).isDirectory()) continue;
      for (const f of fs.readdirSync(styleDir).filter((x) => x.endsWith(".html"))) out.push({ id: f.replace(/\.html$/, ""), rel: path.join(styleDir, f), eventType });
    }
  }
  return out;
}

function chromePath(): string {
  const candidates = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"];
  const found = candidates.find((c): c is string => Boolean(c && fs.existsSync(c)));
  if (!found) throw new Error("Chrome tidak ditemukan; set CHROME_PATH.");
  return found;
}

class Cdp {
  private id = 0;
  private pending = new Map<number, (msg: any) => void>();
  private loadWaiters: Array<() => void> = [];
  sessionId = "";
  constructor(private ws: WebSocket) {
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)!(msg);
        this.pending.delete(msg.id);
      } else if (msg.method === "Page.loadEventFired") this.loadWaiters.splice(0).forEach((w) => w());
    };
  }
  send(method: string, params: Record<string, unknown> = {}, session = true): Promise<any> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(session && this.sessionId ? { sessionId: this.sessionId } : {}) }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
      setTimeout(() => this.pending.has(id) && (this.pending.delete(id), reject(new Error(`${method} melewati batas waktu`))), 30000);
    });
  }
  async goto(url: string) {
    const loaded = new Promise<void>((r) => this.loadWaiters.push(r));
    await this.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(15000)]);
    await sleep(400);
  }
  async eval<T>(expression: string): Promise<T> {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value as T;
  }
}

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
    values.forEach((v, i) => { if (!sameValue(v, other[i])) diffs.push(`${key} ${PROPS[i]}: ${v} -> ${other[i]}`); });
  }
  return diffs;
}

async function main() {
  if (!/\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "")) throw new Error("Jalankan dengan DATABASE_URL ke database luxenary_test.");
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

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "lux-visual-"));
  const render = async (m: MasterFile, source: string, tag: string) => {
    const data = await composeInvitationData(buildDemoInvitation(m.id, undefined, m.eventType));
    const html = (await renderTemplateFile(m.id, data as Record<string, any>, { eventType: m.eventType, templateSource: source })).replace(/<\/head>/i, `${FREEZE}</head>`);
    const file = path.join(work, `${m.id}-${tag}.html`);
    fs.writeFileSync(file, html);
    return `file://${file}`;
  };

  const port = 9800 + Math.floor(Math.random() * 150);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lux-visual-chrome-"));
  const chrome = spawn(chromePath(), ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`]);
  let failed = 0;
  try {
    let version: any = null;
    for (let i = 0; i < 40 && !version; i++) {
      version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => null);
      if (!version) await sleep(250);
    }
    if (!version) throw new Error("Chrome DevTools tidak siap.");
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    const cdp = new Cdp(ws);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" }, false);
    cdp.sessionId = (await cdp.send("Target.attachToTarget", { targetId, flatten: true }, false)).sessionId;
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setScriptExecutionDisabled", { value: true });

    const styles = async (url: string, width: number) => {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      await cdp.goto(url);
      await cdp.send("Emulation.setScriptExecutionDisabled", { value: false });
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
        diffs.slice(0, 5).forEach((d) => console.log(`        ${d}`));
      }
    }
  } finally {
    const exited = new Promise((r) => chrome.once("exit", r));
    chrome.kill();
    await Promise.race([exited, sleep(5000)]);
    fs.rmSync(work, { recursive: true, force: true });
    fs.rmSync(profile, { recursive: true, force: true });
    await prisma.$disconnect();
  }
  console.log(failed ? `${failed} perbandingan berbeda.` : "Semua perbandingan sama.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
