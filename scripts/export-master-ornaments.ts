/**
 * Mengekspor ilustrasi SVG inline master tulisan tangan menjadi ornamen WebP transparan untuk pustaka Theme Builder.
 * Builder hanya membaca berkas gambar di public/assets/ornaments/<grup>/ (lihat builtinOrnamentGroups), sedangkan
 * ilustrasi master ditulis sebagai <svg> yang warnanya diambil dari kelas bertoken palet. Skrip ini menyalin setiap <svg>
 * yang memakai kelas pewarna (aturan fill/stroke) atau <use> ke <defs> master, mengganti kelas itu dengan warna tetap
 * dari `:root` master (var() dan color-mix() dihitung), lalu merender WebP. Warna hasilnya tetap: tidak ikut palet tema
 * builder (keputusan pemilik, 11 Nov 2026).
 *
 *   npx tsx scripts/export-master-ornaments.ts balonku mungil   # tulis public/assets/ornaments/<id>/<kelas-svg>.webp
 *   npx tsx scripts/export-master-ornaments.ts --check balonku  # hanya laporan, tanpa menulis
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { resolveThemeEntry } from "../lib/renderTemplate";
import { masterPathOf } from "../lib/themePaths";

type Rgba = [number, number, number, number];

const OUT_ROOT = path.join(process.cwd(), "public/assets/ornaments");
const MAX_EDGE = 1200;

function parseColor(raw: string): Rgba | null {
  const v = raw.trim().toLowerCase();
  if (v === "transparent") return [0, 0, 0, 0];
  if (v === "none") return null;
  const hex = v.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const rgb = v.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const p = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  if (v === "white") return [255, 255, 255, 1];
  if (v === "black") return [0, 0, 0, 1];
  return null;
}

/** var() rekursif dan color-mix(in srgb, A p%, B) menjadi warna tetap; null bila tidak terhitung. */
function resolveColor(value: string, vars: Map<string, string>, depth = 0): Rgba | null {
  if (depth > 12) return null;
  const v = value.trim();
  const ref = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (ref) {
    const next = vars.get(ref[1]) ?? ref[2];
    return next ? resolveColor(next, vars, depth + 1) : null;
  }
  const mix = v.match(/^color-mix\(\s*in\s+srgb\s*,\s*(.+)\)$/i);
  if (mix) {
    const parts = splitTopLevel(mix[1]);
    if (parts.length !== 2) return null;
    const read = (part: string) => {
      const m = part.trim().match(/^(.*?)(?:\s+(\d+(?:\.\d+)?)%)?$/)!;
      return { color: resolveColor(m[1], vars, depth + 1), pct: m[2] !== undefined ? Number(m[2]) / 100 : undefined };
    };
    const a = read(parts[0]);
    const b = read(parts[1]);
    if (!a.color || !b.color) return null;
    const pa = a.pct ?? (b.pct !== undefined ? 1 - b.pct : 0.5);
    const pb = 1 - pa;
    // Pencampuran CSS memakai alfa terpremultiplikasi, jadi `transparent` hanya menurunkan alfa warna lain.
    const alpha = a.color[3] * pa + b.color[3] * pb;
    if (alpha === 0) return [0, 0, 0, 0];
    const ch = (i: number) => Math.round((a.color![i] * a.color![3] * pa + b.color![i] * b.color![3] * pb) / alpha);
    return [ch(0), ch(1), ch(2), Math.round(alpha * 1000) / 1000];
  }
  return parseColor(v);
}

function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of input) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

const css = (c: Rgba) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;

function rootVars(html: string): Map<string, string> {
  const vars = new Map<string, string>();
  const root = html.match(/:root\s*{([^}]*)}/);
  for (const m of (root?.[1] ?? "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars.set(m[1], m[2].trim());
  return vars;
}

/**
 * Aturan berselektor kelas tunggal (atau daftar kelas tunggal) yang mengisi fill/stroke → deklarasi dengan warna tetap.
 * Awalan kelas berbeda per master (`art-`, `g-`, `m-`, ...), jadi yang menentukan adalah isi aturannya.
 */
function paintRules(html: string, vars: Map<string, string>): Map<string, string> {
  const rules = new Map<string, string>();
  for (const m of html.matchAll(/(?<=^|[}\s;])((?:\.[\w-]+\s*,\s*)*\.[\w-]+)\s*\{([^}]*)\}/gm)) {
    if (!/(?:^|[;\s])(?:fill|stroke|stop-color)\s*:/.test(m[2])) continue;
    const decls: string[] = [];
    for (const d of m[2].matchAll(/(stop-color|stop-opacity|fill|stroke|stroke-width|opacity|stroke-linecap|stroke-linejoin|fill-opacity|stroke-opacity)\s*:\s*([^;]+);?/g)) {
      const [prop, value] = [d[1], d[2].trim()];
      if (prop === "fill" || prop === "stroke" || prop === "stop-color") {
        if (value === "none") { decls.push(`${prop}:none`); continue; }
        // Rujukan gradien (<linearGradient>/<radialGradient> di <defs> master) dipertahankan; warnanya datang dari stop-color.
        if (/^url\(#[\w-]+\)$/.test(value)) { decls.push(`${prop}:${value}`); continue; }
        const c = resolveColor(value, vars);
        if (c) decls.push(`${prop}:${css(c)}`);
      } else {
        decls.push(`${prop}:${value}`);
      }
    }
    for (const cls of m[1].split(",").map((s) => s.trim().replace(/^\./, "")).filter(Boolean)) {
      rules.set(cls, [rules.get(cls), ...decls].filter(Boolean).join(";"));
    }
  }
  return rules;
}

/** `defs` = isi <defs> master (bagian yang dipakai ulang lewat <use href="#id">), disisipkan agar rujukannya terbaca. */
function standaloneSvg(svg: string, rules: Map<string, string>, defs: string): string {
  const withDefs = defs && /<use\b/.test(svg) ? svg.replace(/^(<svg\b[^>]*>)/, `$1<defs>${defs}</defs>`) : svg;
  // Per tag: gaya dari kelas didahulukan, lalu style bawaan elemen (yang lebih spesifik) menimpanya.
  let out = withDefs.replace(/<[a-zA-Z][^>]*\sclass="[^"]*"[^>]*>/g, (tag) => {
    const classes = tag.match(/\sclass="([^"]*)"/)![1];
    const own = tag.match(/\sstyle="([^"]*)"/)?.[1] ?? "";
    const style = [...classes.split(/\s+/).map((c) => rules.get(c)), own].filter(Boolean).join(";");
    const bare = tag.replace(/\sclass="[^"]*"/, "").replace(/\sstyle="[^"]*"/, "");
    return style ? bare.replace(/^(<[a-zA-Z][\w-]*)/, `$1 style="${style}"`) : bare;
  });
  out = out.replace(/\saria-hidden="true"/, "");
  if (!/xmlns=/.test(out)) out = out.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  return out;
}

async function exportMaster(id: string, check: boolean): Promise<number> {
  const entry = resolveThemeEntry(id);
  if (!entry) throw new Error(`Master "${id}" tidak ditemukan.`);
  const file = masterPathOf(entry.eventType, entry.style, id);
  const html = fs.readFileSync(file, "utf8");
  const vars = rootVars(html);
  const rules = paintRules(html, vars);
  const body = html.slice(html.indexOf("<body"));
  const defs = [...body.matchAll(/<defs>([\s\S]*?)<\/defs>/g)].map((d) => d[1]).join("");
  const used = new Map<string, number>();
  // Salinan yang hanya dibalik lewat CSS (mis. empat sudut) menghasilkan gambar sama; builder sudah punya cermin X/Y.
  const seen = new Set<string>();
  let written = 0;
  for (const m of body.matchAll(/<svg\b[^>]*class="([^"]+)"[^>]*>[\s\S]*?<\/svg>/g)) {
    const svg = m[0];
    const innerClasses = [...svg.slice(svg.indexOf(">")).matchAll(/class="([^"]+)"/g)].flatMap((c) => c[1].split(/\s+/));
    const usesDefs = Boolean(defs) && /<use\b/.test(svg);
    if (!(innerClasses.some((c) => rules.has(c)) || usesDefs) || svg.includes("{{")) continue;
    const viewBox = svg.match(/viewBox="([\d.\s-]+)"/)?.[1].trim().split(/\s+/).map(Number);
    if (!viewBox || viewBox.length !== 4) continue;
    const [, , w, h] = viewBox;
    const scale = MAX_EDGE / Math.max(w, h);
    const width = Math.max(1, Math.round(w * Math.min(scale, 4)));
    const image = await sharp(Buffer.from(standaloneSvg(svg, rules, defs)), { density: 72 * Math.min(scale, 4) }).resize({ width }).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
    const digest = crypto.createHash("sha1").update(image).digest("hex");
    if (seen.has(digest)) continue;
    seen.add(digest);
    const base = m[1].split(/\s+/)[0].replace(/[^A-Za-z0-9_-]/g, "");
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const out = path.join(OUT_ROOT, id, `${base}${n > 1 ? `-${n}` : ""}.webp`);
    console.log(`${check ? "cek " : "tulis"} ${path.relative(process.cwd(), out)}  ${w}x${h} → lebar ${width}px`);
    if (check) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, image);
    written++;
  }
  return written;
}

(async () => {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const ids = args.filter((a) => !a.startsWith("--"));
  if (!ids.length) { console.error("Sebutkan id master."); process.exit(2); }
  let total = 0;
  for (const id of ids) total += await exportMaster(id, check);
  console.log(check ? "Selesai (laporan)." : `Selesai: ${total} ornamen ditulis.`);
})().catch((err) => { console.error(err); process.exit(1); });
