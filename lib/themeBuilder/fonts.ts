import fs from "fs";
import path from "path";
import { HttpError } from "@/lib/routeError";
import {
  googleFontFamilyName,
  googleFontIds,
  googleFontSlug,
  type BuilderSpec,
} from "@/lib/themeBuilder/spec";

export const FONTS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "fonts");
export const FONTS_URL_PREFIX = "/uploads/fonts/";

const CATALOG_URL = "https://fonts.google.com/metadata/fonts";
const CSS_URL = "https://fonts.googleapis.com/css2";
const GSTATIC_HOST = "fonts.gstatic.com";
const CATALOG_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 600 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
// Google menyajikan woff2 hanya kepada peramben modern; tanpa User-Agent ini jawabannya TTF.
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class FontError extends HttpError {
  constructor(message: string) {
    super(422, message);
  }
}

export interface GoogleFontEntry {
  family: string;
  category: string;
  /** Bobot tegak yang tersedia, mis. [400, 700]. */
  weights: number[];
  /** Subset huruf yang diterbitkan Google, mis. "latin". */
  subsets: string[];
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let catalogCache: { at: number; list: GoogleFontEntry[] } | null = null;

async function timedFetch(fetchImpl: FetchLike, url: string, headers?: Record<string, string>): Promise<Response> {
  try {
    return await fetchImpl(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (error) {
    throw new FontError(`Google Fonts tidak dapat dihubungi dari server (${error instanceof Error ? error.message : "gagal"}).`);
  }
}

export function parseCatalog(raw: string): GoogleFontEntry[] {
  const start = raw.indexOf("{");
  if (start < 0) throw new FontError("Katalog Google Fonts tidak terbaca.");
  const json = JSON.parse(raw.slice(start)) as { familyMetadataList?: Array<Record<string, any>> };
  if (!Array.isArray(json.familyMetadataList)) throw new FontError("Katalog Google Fonts tidak terbaca.");
  return json.familyMetadataList
    .filter((f) => typeof f.family === "string" && /^[A-Za-z0-9][A-Za-z0-9 ]{0,38}[A-Za-z0-9]$/.test(f.family))
    .map((f) => ({
      family: f.family as string,
      category: typeof f.category === "string" ? f.category : "",
      weights: Object.keys(f.fonts ?? {})
        .filter((k) => /^\d{3}$/.test(k))
        .map(Number)
        .sort((a, b) => a - b),
      subsets: Array.isArray(f.subsets) ? f.subsets.filter((s: unknown) => typeof s === "string") : [],
    }));
}

export async function loadCatalog(fetchImpl: FetchLike = fetch): Promise<GoogleFontEntry[]> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.list;
  const res = await timedFetch(fetchImpl, CATALOG_URL);
  if (!res.ok) throw new FontError(`Katalog Google Fonts menjawab ${res.status}.`);
  const list = parseCatalog(await res.text());
  catalogCache = { at: Date.now(), list };
  return list;
}

export function searchCatalog(list: GoogleFontEntry[], query: string, category: string, limit = 40): GoogleFontEntry[] {
  const q = query.trim().toLowerCase();
  return list
    .filter((f) => f.subsets.includes("latin"))
    .filter((f) => !category || f.category === category)
    .filter((f) => !q || f.family.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = q && a.family.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = q && b.family.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.family.localeCompare(b.family);
    })
    .slice(0, limit);
}

/** Bobot 400 dan 700 bila ada; keluarga dengan satu bobot saja memakai bobot itu. */
export function pickWeights(available: number[]): number[] {
  if (!available.length) return [];
  const regular = available.includes(400) ? 400 : available[0];
  const bold = available.includes(700) ? 700 : [...available].reverse().find((w) => w > regular && w <= 800);
  return bold ? [regular, bold] : [regular];
}

export function googleCssUrl(family: string, weights: number[]): string {
  const name = encodeURIComponent(family).replace(/%20/g, "+");
  const axis = weights.length === 1 && weights[0] === 400 ? "" : `:wght@${weights.join(";")}`;
  return `${CSS_URL}?family=${name}${axis}&display=swap`;
}

interface FontFaceBlock {
  subset: string;
  body: string;
  url: string;
}

function parseFontFaces(css: string): FontFaceBlock[] {
  const blocks: FontFaceBlock[] = [];
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  for (const match of css.matchAll(re)) {
    const url = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)\s*format\(\s*['"]woff2['"]\s*\)/.exec(match[2])?.[1];
    if (url) blocks.push({ subset: match[1], body: match[2], url });
  }
  return blocks;
}

/** Hanya subset latin yang disimpan; sumber diganti ke berkas lokal bernama <slug>/<n>.woff2. */
export function rewriteLatinFaces(css: string, slug: string): { css: string; sources: Array<{ file: string; url: string }> } {
  const latin = parseFontFaces(css).filter((b) => b.subset === "latin");
  if (!latin.length) throw new FontError("Font ini tidak memiliki subset huruf latin.");
  const sources: Array<{ file: string; url: string }> = [];
  const fileOf = new Map<string, string>();
  const faces = latin.map((block) => {
    let host = "";
    try {
      host = new URL(block.url).hostname;
    } catch {
      throw new FontError("Alamat berkas font tidak valid.");
    }
    if (host !== GSTATIC_HOST) throw new FontError("Berkas font berasal dari domain yang tidak diizinkan.");
    let file = fileOf.get(block.url);
    if (!file) {
      file = `${fileOf.size + 1}.woff2`;
      fileOf.set(block.url, file);
      sources.push({ file, url: block.url });
    }
    const body = block.body.replace(/src:\s*url\([^)]*\)\s*format\([^)]*\);?/, `src: url(${FONTS_URL_PREFIX}${slug}/${file}) format('woff2');`);
    return `@font-face {${body}}`;
  });
  return { css: `${faces.join("\n")}\n`, sources };
}

export function isGoogleFontInstalled(family: string, dir = FONTS_DIR): boolean {
  return fs.existsSync(path.join(dir, googleFontSlug(family), "font.css"));
}

const inflight = new Map<string, Promise<void>>();

async function downloadFont(entry: GoogleFontEntry, dir: string, fetchImpl: FetchLike): Promise<void> {
  const slug = googleFontSlug(entry.family);
  const weights = pickWeights(entry.weights);
  if (!weights.length) throw new FontError(`${entry.family} tidak memiliki bobot tegak yang bisa dipakai.`);

  const cssRes = await timedFetch(fetchImpl, googleCssUrl(entry.family, weights), { "User-Agent": BROWSER_UA });
  if (!cssRes.ok) throw new FontError(`Google Fonts menolak ${entry.family} (${cssRes.status}).`);
  const { css, sources } = rewriteLatinFaces(await cssRes.text(), slug);

  const tmp = path.join(dir, `.tmp-${slug}-${process.pid}-${Date.now()}`);
  const finalDir = path.join(dir, slug);
  fs.mkdirSync(tmp, { recursive: true });
  try {
    for (const { file, url } of sources) {
      const res = await timedFetch(fetchImpl, url);
      if (!res.ok) throw new FontError(`Berkas font ${entry.family} gagal diunduh (${res.status}).`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_FILE_BYTES) throw new FontError(`Berkas font ${entry.family} terlalu besar (${Math.round(buf.length / 1024)} KB).`);
      if (buf.subarray(0, 4).toString("latin1") !== "wOF2") throw new FontError(`Berkas font ${entry.family} bukan woff2.`);
      fs.writeFileSync(path.join(tmp, file), buf);
    }
    fs.writeFileSync(path.join(tmp, "font.css"), css);
    if (fs.existsSync(finalDir)) fs.rmSync(finalDir, { recursive: true, force: true });
    fs.renameSync(tmp, finalDir);
  } catch (error) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Pastikan keluarga font tersimpan di server. Nama dicocokkan ke katalog Google lebih dulu, sehingga URL yang diminta
 * hanya dibentuk dari nama katalog yang sah, bukan dari masukan admin mentah.
 */
export async function ensureGoogleFont(
  family: string,
  options: { dir?: string; fetchImpl?: FetchLike; catalog?: GoogleFontEntry[] } = {},
): Promise<GoogleFontEntry> {
  const { dir = FONTS_DIR, fetchImpl = fetch } = options;
  const catalog = options.catalog ?? (await loadCatalog(fetchImpl));
  const entry = catalog.find((f) => f.family.toLowerCase() === family.trim().toLowerCase());
  if (!entry) throw new FontError(`"${family}" tidak ada di katalog Google Fonts.`);
  if (isGoogleFontInstalled(entry.family, dir)) return entry;

  const key = path.join(dir, googleFontSlug(entry.family));
  let pending = inflight.get(key);
  if (!pending) {
    fs.mkdirSync(dir, { recursive: true });
    pending = downloadFont(entry, dir, fetchImpl).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  await pending;
  return entry;
}

/** Semua font Google di spesifikasi wajib ada di server sebelum master dikompilasi. */
export async function ensureSpecFonts(spec: BuilderSpec, options: Parameters<typeof ensureGoogleFont>[1] = {}): Promise<void> {
  for (const id of googleFontIds(spec.fonts)) await ensureGoogleFont(googleFontFamilyName(id), options);
}
