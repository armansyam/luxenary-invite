/**
 * Bagian murni Varian Tema (tanpa database), dipakai bersama oleh server (render, rute admin) dan editor varian di
 * peramban (pratinjau warna langsung). Resolusi varian dari DB ada di lib/themeVariants.ts.
 */
import { FONT_OPTIONS, customCssError, googleFontCssUrl, googleFontFamilyName, isGoogleFontId } from "@/lib/themeBuilder/spec";

export interface MasterOverrides {
  /** Nama variabel warna master → #rrggbb. */
  colors: Record<string, string>;
  /** Nama variabel huruf master → id font katalog lokal atau "g:<Nama Google Font>". */
  fonts: Record<string, string>;
  /** Gambar bawaan master (`/assets/...`) → gambar unggahan admin (`/uploads/theme-assets/<hash>.webp`). */
  images?: Record<string, string>;
  /** id `<section>` master yang disembunyikan beserta tautan navigasinya. */
  hiddenSections?: string[];
  /** CSS tambahan, aturan yang sama dengan CSS kustom Theme Builder (`customCssError`). */
  css?: string;
  /**
   * Tata letak elemen master tanpa blueprint (Mode Master): alamat CSS elemen (lihat `ELEMENT_SELECTOR_RE`) → posisi
   * per tampilan. `mobile` < 900px, `desktop` ≥ 900px; untuk elemen di dalam `#coverScreen`, `desktop` berlaku saat
   * sampul desktop layar penuh dan `desktopSplit` saat split (ditentukan mesin, lihat `elementEditsCss`).
   */
  elements?: Record<string, ElementEdits>;
  /** "full": sampul desktop layar penuh selama klien belum mengunggah foto sampul (penanda data-lux-desktop-cover). */
  coverDesktop?: "full";
}

export interface ElementEdit {
  /** Geser dalam persen ukuran elemen itu sendiri. */
  x: number;
  y: number;
  scale: number;
  rotate: number;
  hidden?: boolean;
}
export type ElementView = "mobile" | "desktop" | "desktopSplit";
export type ElementEdits = Partial<Record<ElementView, ElementEdit>>;

/**
 * Alamat elemen yang dibuat Editor Master: segmen `#id` atau `tag.kelas:nth-of-type(n)` yang dihubungkan " > ". Pola
 * ketat ini mencegah isi selain selektor masuk ke CSS halaman tamu.
 */
const ELEMENT_SEGMENT_RE = /^(?:#[A-Za-z][\w-]{0,60}|[a-z][a-z0-9]{0,15}(?:\.[A-Za-z_][\w-]{0,60}){0,6}(?::nth-of-type\(\d{1,3}\))?)$/;
export const ELEMENT_VIEWS: readonly ElementView[] = ["mobile", "desktop", "desktopSplit"];
export const ELEMENT_LIMITS = { x: [-1500, 1500], y: [-1500, 1500], scale: [0.2, 3], rotate: [-180, 180] } as const;
export const MAX_ELEMENT_EDITS = 150;

export function isElementSelector(selector: string): boolean {
  if (selector.length > 400) return false;
  const parts = selector.split(" > ");
  return parts.length > 0 && parts.length <= 14 && parts.every((p) => ELEMENT_SEGMENT_RE.test(p));
}

const isCoverSelector = (selector: string) => selector === "#coverScreen" || selector.startsWith("#coverScreen > ");

/** Elemen di dalam `<svg>` (bukan akar svg-nya): persen translate-nya mengacu ke kanvas SVG kecuali transform-box fill-box. */
const isInsideSvg = (selector: string) => {
  const parts = selector.split(" > ");
  return parts.slice(0, -1).some((p) => /^svg(?:[.:]|$)/.test(p));
};

function elementStyle(e: ElementEdit, insideSvg: boolean): string {
  const parts = [`translate:${e.x}% ${e.y}% !important;rotate:${e.rotate}deg !important;scale:${e.scale} !important;`];
  // Di dalam SVG, fill-box membuat geser persen mengacu ke ukuran potongan itu sendiri (sama dengan elemen HTML), dan
  // poros tengah membuat putar serta perbesar terjadi dari tengahnya, bukan dari sudut kanvas.
  if (insideSvg) parts.push("transform-box:fill-box;");
  if (e.rotate || e.scale !== 1) parts.push(`${insideSvg ? "" : "transform-box:fill-box;"}transform-origin:center;`);
  if (e.hidden) parts.push("display:none !important;");
  return parts.join("");
}

/**
 * CSS tata letak elemen. Elemen sampul di desktop dibedakan oleh `<style id="lux-cover-desktop-split">` yang disisipkan
 * mesin hanya saat sampul jatuh ke split (sama dengan posisi sampul Theme Builder). Nilai divalidasi ulang di sini karena
 * isinya masuk ke CSS halaman tamu; entri tidak sah dilewati dan dilaporkan lewat `onSkip`.
 */
export function elementEditsCss(elements: MasterOverrides["elements"], onSkip?: (name: string) => void): string {
  const mobile: string[] = [];
  const desktop: string[] = [];
  for (const [selector, edits] of Object.entries(elements ?? {})) {
    if (!isElementSelector(selector)) { onSkip?.(selector.slice(0, 60)); continue; }
    const cover = isCoverSelector(selector);
    const inSvg = isInsideSvg(selector);
    const valid = (e: ElementEdit | undefined) => e && [e.x, e.y, e.scale, e.rotate].every((n) => typeof n === "number" && Number.isFinite(n));
    if (valid(edits.mobile)) mobile.push(`${selector}{${elementStyle(edits.mobile!, inSvg)}}`);
    if (valid(edits.desktop)) desktop.push(`${cover ? ":root:not(:has(#lux-cover-desktop-split)) " : ""}${selector}{${elementStyle(edits.desktop!, inSvg)}}`);
    if (cover && valid(edits.desktopSplit)) desktop.push(`:root:has(#lux-cover-desktop-split) ${selector}{${elementStyle(edits.desktopSplit!, inSvg)}}`);
  }
  return [
    mobile.length ? `@media (max-width: 899.98px) {\n${mobile.join("\n")}\n}` : "",
    desktop.length ? `@media (min-width: 900px) {\n${desktop.join("\n")}\n}` : "",
  ].filter(Boolean).join("\n");
}

const clampNum = (v: unknown, [min, max]: readonly [number, number], fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v * 10) / 10)) : fallback;

/** Suntingan elemen dari masukan admin; posisi bawaan (0, 0, skala 1, putar 0, tampil) tidak disimpan. */
export function parseElementEdits(raw: unknown, errors: string[]): Record<string, ElementEdits> {
  const out: Record<string, ElementEdits> = {};
  if (raw === undefined || raw === null) return out;
  if (typeof raw !== "object" || Array.isArray(raw)) { errors.push("Tata letak elemen tidak terbaca."); return out; }
  for (const [selector, edits] of Object.entries(raw as Record<string, unknown>)) {
    if (!isElementSelector(selector)) { errors.push(`Alamat elemen tidak sah: ${selector.slice(0, 60)}`); continue; }
    if (!edits || typeof edits !== "object") continue;
    const value: ElementEdits = {};
    for (const view of ELEMENT_VIEWS) {
      const e = (edits as Record<string, any>)[view];
      if (!e || typeof e !== "object") continue;
      if (view === "desktopSplit" && !isCoverSelector(selector)) continue;
      const edit: ElementEdit = {
        x: clampNum(e.x, ELEMENT_LIMITS.x, 0),
        y: clampNum(e.y, ELEMENT_LIMITS.y, 0),
        scale: clampNum(e.scale, ELEMENT_LIMITS.scale, 1),
        rotate: clampNum(e.rotate, ELEMENT_LIMITS.rotate, 0),
        ...(e.hidden === true ? { hidden: true } : {}),
      };
      if (edit.x || edit.y || edit.scale !== 1 || edit.rotate || edit.hidden) value[view] = edit;
    }
    if (Object.keys(value).length) out[selector] = value;
  }
  if (Object.keys(out).length > MAX_ELEMENT_EDITS) errors.push(`Tata letak elemen paling banyak ${MAX_ELEMENT_EDITS} elemen.`);
  return out;
}

const ASSET_REF_RE = /\/assets\/[\w./-]+\.(?:webp|png|jpe?g|svg|gif|avif)/gi;
const UPLOADED_ASSET_RE = /^\/uploads\/theme-assets\/[a-f0-9]{24}\.(?:webp|png|jpe?g)$/;
const SECTION_ID_RE = /^[a-z][a-z0-9_-]{0,60}$/i;

/** Gambar bawaan yang dirujuk master (latar, ornamen, bingkai) beserta jumlah rujukannya, terbanyak dulu. */
export function masterImageRefs(html: string): Array<{ path: string; count: number }> {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(ASSET_REF_RE)) counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
  return [...counts].map(([p, count]) => ({ path: p, count })).sort((a, b) => b.count - a.count || a.path.localeCompare(b.path));
}

/** Seksi master yang punya id (bisa disembunyikan), urut sesuai kemunculan. */
export function masterSections(html: string): string[] {
  const ids: string[] = [];
  for (const m of html.matchAll(/<section\b[^>]*\bid="([^"]+)"/gi)) if (SECTION_ID_RE.test(m[1]) && !ids.includes(m[1])) ids.push(m[1]);
  return ids;
}

/** CSS penyembunyi seksi dan CSS tambahan; nilai divalidasi ulang karena isinya masuk ke halaman tamu. */
export function masterExtraCss(overrides: MasterOverrides, onSkip?: (name: string) => void): string {
  const parts: string[] = [];
  for (const id of overrides.hiddenSections ?? []) {
    if (!SECTION_ID_RE.test(id)) { onSkip?.(id); continue; }
    parts.push(`#${id}, a[href="#${id}"] { display: none !important; }`);
  }
  const css = overrides.css?.trim();
  if (css) {
    if (customCssError(css)) onSkip?.("css");
    else parts.push(css);
  }
  const elementsCss = elementEditsCss(overrides.elements, onSkip);
  if (elementsCss) parts.push(elementsCss);
  return parts.join("\n");
}

export interface MasterColorToken {
  name: string;
  value: string;
}

export interface MasterFontToken {
  name: string;
  stack: string;
  /** Keluarga pertama di tumpukan, untuk label UI. */
  family: string;
}

const VAR_NAME_RE = /^--[a-z0-9_-]{1,80}$/i;
const HEX_RE = /^#[0-9a-f]{6}$/;
export const MAX_MASTER_OVERRIDES = 300;
const GENERIC_FAMILIES = ["serif", "sans-serif", "cursive", "monospace", "system-ui", "fantasy"];

function normalizeHex(value: string): string | null {
  const v = value.trim().toLowerCase();
  const short = v.match(/^#([0-9a-f]{3})$/);
  if (short) return `#${short[1].split("").map((c) => c + c).join("")}`;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  const rgb = v.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, "0")).join("")}`;
  return null;
}

/** Variabel warna dan huruf di blok `:root` master (satu-satunya blok :root master tulisan tangan). */
export function masterTokens(html: string): { colors: MasterColorToken[]; fonts: MasterFontToken[] } {
  const body = html.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const colors: MasterColorToken[] = [];
  const fonts: MasterFontToken[] = [];
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
    const name = m[1];
    const raw = m[2].trim();
    const hex = normalizeHex(raw);
    if (hex) colors.push({ name, value: hex });
    else if ((name.startsWith("--lux-font-") || name.startsWith("--font-")) && !raw.startsWith("var(")) {
      fonts.push({ name, stack: raw, family: raw.split(",")[0].replace(/['"]/g, "").trim() });
    }
  }
  return { colors, fonts };
}

/**
 * Variabel warna dikelompokkan per nilai aslinya. Tokenisasi sengaja membuat `--lux-c-<hex>` terpisah dari `--primary`
 * walau nilainya sama; UI mengubah satu kelompok sekaligus agar semua yang tadinya berwarna sama ikut berganti.
 */
export function masterColorGroups(html: string): Array<{ value: string; names: string[] }> {
  const groups = new Map<string, string[]>();
  for (const t of masterTokens(html).colors) groups.set(t.value, [...(groups.get(t.value) ?? []), t.name]);
  return [...groups].map(([value, names]) => ({ value, names }));
}

export type ColorUsageKind = "bg" | "text" | "line" | "shadow" | "icon";
export type ColorUsage = Record<ColorUsageKind, number>;

const USAGE_OF_PROPERTY = (prop: string): ColorUsageKind | null => {
  if (prop.startsWith("background")) return "bg";
  if (prop === "color" || prop === "caret-color" || prop === "text-decoration-color" || prop === "-webkit-text-fill-color") return "text";
  if (prop.startsWith("border") || prop.startsWith("outline") || prop === "column-rule-color") return "line";
  if (prop === "box-shadow" || prop === "text-shadow" || prop === "filter") return "shadow";
  if (prop === "fill" || prop === "stroke" || prop === "stop-color") return "icon";
  return null;
};

/**
 * Berapa kali tiap variabel warna dipakai per jenis properti di CSS master (isi `<style>` dan atribut `style`, di luar
 * :root). Editor varian memakainya untuk memberi label "Latar", "Teks", dan seterusnya, mengurutkan, dan menyembunyikan
 * warna yang tidak dipakai.
 */
export function masterColorUsage(html: string): Record<string, ColorUsage> {
  const usage: Record<string, ColorUsage> = {};
  const css = [
    ...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]),
    ...[...html.matchAll(/\sstyle="([^"]*)"/gi)].map((m) => m[1]),
  ].join("\n").replace(/:root\s*\{[^}]*\}/g, "");
  // Variabel lokal di selektor (`.kartu { --isi: var(--bg-card) }`) meneruskan pemakaiannya ke variabel sumber.
  const aliases = new Map<string, Set<string>>();
  const direct: Array<[ColorUsageKind, string]> = [];
  for (const m of css.matchAll(/(--[\w-]+|[a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    const refs = [...m[2].matchAll(/var\(\s*(--[\w-]+)/g)].map((v) => v[1]);
    if (m[1].startsWith("--")) {
      const set = aliases.get(m[1]) ?? new Set<string>();
      refs.forEach((r) => set.add(r));
      aliases.set(m[1], set);
      continue;
    }
    const kind = USAGE_OF_PROPERTY(m[1].toLowerCase());
    if (kind) refs.forEach((r) => direct.push([kind, r]));
  }
  const credit = (name: string, kind: ColorUsageKind, depth: number) => {
    const u = (usage[name] ??= { bg: 0, text: 0, line: 0, shadow: 0, icon: 0 });
    u[kind]++;
    if (depth < 4) aliases.get(name)?.forEach((src) => src !== name && credit(src, kind, depth + 1));
  };
  for (const [kind, name] of direct) credit(name, kind, 0);
  return usage;
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Pewarnaan ulang master dengan palet: terang-gelap (lightness) tiap warna asli dipertahankan sehingga hubungan kontras
 * teks dan latar master tetap, sedangkan rona dan kepekatan diambil dari palet. Warna netral (abu, hampir tanpa rona)
 * hanya diberi sedikit rona latar palet agar tidak berubah menjadi warna mencolok; warna berona mengikuti warna utama
 * (gelap) atau aksen (terang).
 */
export function recolorWithPalette(groups: Array<{ value: string; names: string[] }>, palette: { primary: string; accent: string; bgDark: string; bgLight: string }): Record<string, string> {
  const [bgH, bgS] = hexToHsl(palette.bgDark);
  const [pH, pS] = hexToHsl(palette.primary);
  const [aH, aS] = hexToHsl(palette.accent);
  const colors: Record<string, string> = {};
  for (const g of groups) {
    const [, s, l] = hexToHsl(g.value);
    const next = s < 0.12 ? hslToHex(bgH, Math.min(bgS, 0.18) * (1 - Math.abs(l - 0.5)), l) : l < 0.5 ? hslToHex(pH, Math.max(pS, s * 0.8), l) : hslToHex(aH, Math.max(aS, s * 0.8), l);
    if (next !== g.value) for (const n of g.names) colors[n] = next;
  }
  return colors;
}

/** Masukan admin dicocokkan dengan variabel yang benar-benar ada di master induk; nilai yang sama dengan aslinya dibuang. */
export function parseMasterOverrides(raw: unknown, parentHtml: string): { ok: true; value: MasterOverrides } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const tokens = masterTokens(parentHtml);
  const colorValues = new Map(tokens.colors.map((t) => [t.name, t.value]));
  const fontNames = new Set(tokens.fonts.map((t) => t.name));
  const fontIds = FONT_OPTIONS.map((f) => f.id) as readonly string[];
  const value: MasterOverrides = { colors: {}, fonts: {} };

  const colors = input.colors && typeof input.colors === "object" ? (input.colors as Record<string, unknown>) : {};
  for (const [name, v] of Object.entries(colors)) {
    const original = colorValues.get(name);
    if (!original) { errors.push(`Variabel warna ${name.slice(0, 60)} tidak ada di master induk.`); continue; }
    const hex = typeof v === "string" ? v.trim().toLowerCase() : "";
    if (!HEX_RE.test(hex)) { errors.push(`Warna ${name} harus berformat #rrggbb.`); continue; }
    if (hex !== original) value.colors[name] = hex;
  }
  const fonts = input.fonts && typeof input.fonts === "object" ? (input.fonts as Record<string, unknown>) : {};
  for (const [name, v] of Object.entries(fonts)) {
    if (!fontNames.has(name)) { errors.push(`Variabel huruf ${name.slice(0, 60)} tidak ada di master induk.`); continue; }
    if (typeof v !== "string" || !(fontIds.includes(v) || isGoogleFontId(v))) { errors.push(`Huruf untuk ${name} tidak dikenali.`); continue; }
    value.fonts[name] = v;
  }
  const images = input.images && typeof input.images === "object" ? (input.images as Record<string, unknown>) : {};
  const refs = new Set(masterImageRefs(parentHtml).map((r) => r.path));
  for (const [original, v] of Object.entries(images)) {
    if (!refs.has(original)) { errors.push(`Gambar ${original.slice(0, 80)} tidak dipakai master.`); continue; }
    if (typeof v !== "string" || !UPLOADED_ASSET_RE.test(v)) { errors.push(`Pengganti ${original.split("/").pop()} harus gambar unggahan builder.`); continue; }
    (value.images ??= {})[original] = v;
  }
  const sections = new Set(masterSections(parentHtml));
  const hidden = Array.isArray(input.hiddenSections) ? input.hiddenSections : [];
  for (const id of hidden) {
    if (typeof id !== "string" || !sections.has(id)) { errors.push(`Seksi ${String(id).slice(0, 60)} tidak ada di master.`); continue; }
    if (!(value.hiddenSections ??= []).includes(id)) value.hiddenSections.push(id);
  }
  if (typeof input.css === "string" && input.css.trim()) {
    const cssError = customCssError(input.css.trim());
    if (cssError) errors.push(cssError);
    else value.css = input.css.trim();
  }
  const elements = parseElementEdits(input.elements, errors);
  if (Object.keys(elements).length) value.elements = elements;
  if (input.coverDesktop === "full") value.coverDesktop = "full";
  else if (input.coverDesktop !== undefined && input.coverDesktop !== null) errors.push("Mode sampul desktop tidak dikenali.");
  const total = Object.keys(value.colors).length + Object.keys(value.fonts).length + Object.keys(value.images ?? {}).length + (value.hiddenSections?.length ?? 0);
  if (total > MAX_MASTER_OVERRIDES) errors.push(`Override paling banyak ${MAX_MASTER_OVERRIDES}.`);
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Jumlah perubahan dalam override (untuk tampilan "N perubahan" dan cek kosong). */
export function overrideCount(o: MasterOverrides): number {
  return Object.keys(o.colors ?? {}).length + Object.keys(o.fonts ?? {}).length + Object.keys(o.images ?? {}).length + (o.hiddenSections?.length ?? 0) + (o.css?.trim() ? 1 : 0) + Object.keys(o.elements ?? {}).length + (o.coverDesktop ? 1 : 0);
}

/** Tumpukan huruf pengganti: keluarga baru dengan cadangan generik dari tumpukan aslinya (serif tetap serif). */
function fontStack(fontId: string, originalStack: string): string {
  const generic = originalStack.split(",").map((s) => s.trim().replace(/['"]/g, "")).reverse().find((s) => GENERIC_FAMILIES.includes(s)) ?? "serif";
  if (isGoogleFontId(fontId)) return `'${googleFontFamilyName(fontId)}', ${generic}`;
  const local = FONT_OPTIONS.find((f) => f.id === fontId);
  return local ? `${local.family.split(",")[0].trim()}, ${generic}` : originalStack;
}

/**
 * Deklarasi `:root` override dan berkas font yang dibutuhkan. Nama variabel dan nilai divalidasi ulang (pola nama, hex,
 * katalog font) karena isinya masuk ke CSS halaman tamu; entri tidak sah dilewati dan dilaporkan lewat `onSkip`.
 */
export function masterOverrideCss(overrides: MasterOverrides, parentHtml: string, onSkip?: (name: string) => void): { css: string; fontLinks: string[] } {
  return overrideCssFromTokens(overrides, masterTokens(parentHtml).fonts, onSkip);
}

/** Sama dengan `masterOverrideCss`, dari daftar token huruf (editor peramban menerima token dari API, bukan HTML master). */
export function overrideCssFromTokens(overrides: MasterOverrides, fontTokens: MasterFontToken[], onSkip?: (name: string) => void): { css: string; fontLinks: string[] } {
  const stacks = new Map(fontTokens.map((t) => [t.name, t.stack]));
  const decls: string[] = [];
  const links = new Set<string>();
  for (const [name, hex] of Object.entries(overrides.colors ?? {})) {
    if (VAR_NAME_RE.test(name) && HEX_RE.test(hex)) decls.push(`${name}: ${hex};`);
    else onSkip?.(name);
  }
  for (const [name, fontId] of Object.entries(overrides.fonts ?? {})) {
    const original = stacks.get(name);
    const known = isGoogleFontId(fontId) || FONT_OPTIONS.some((f) => f.id === fontId);
    if (!VAR_NAME_RE.test(name) || !original || !known) { onSkip?.(name); continue; }
    decls.push(`${name}: ${fontStack(fontId, original)};`);
    links.add(isGoogleFontId(fontId) ? googleFontCssUrl(fontId) : "/fonts/fonts.css");
  }
  return { css: decls.length ? `:root { ${decls.join(" ")} }` : "", fontLinks: [...links] };
}

/**
 * Master ditambah override: gambar bawaan diganti pada setiap rujukannya, lalu `<style>` (variabel `:root`, seksi
 * tersembunyi, CSS tambahan) disisipkan terakhir di `<head>` agar menang atas CSS master. `styleId` membedakan suntingan
 * master sendiri (`lux-master-edits`) dari override varian (`lux-master-overrides`) yang ditumpuk di atasnya.
 */
export function applyMasterOverridesTo(parentHtml: string, overrides: MasterOverrides, onSkip?: (name: string) => void, styleId = "lux-master-overrides"): string {
  let html = parentHtml;
  for (const [original, replacement] of Object.entries(overrides.images ?? {})) {
    if (!/^\/assets\/[\w./-]+$/.test(original) || !UPLOADED_ASSET_RE.test(replacement)) { onSkip?.(original); continue; }
    html = html.split(original).join(replacement);
  }
  // Penanda yang dibaca renderTemplateFile: tanpa foto sampul klien, sampul desktop tidak dijatuhkan ke split.
  if (overrides.coverDesktop === "full" && !/data-lux-desktop-cover=/.test(html)) {
    html = html.replace(/\bid="coverScreen"/, 'id="coverScreen" data-lux-desktop-cover="full"');
  }
  const { css: rootCss, fontLinks } = masterOverrideCss(overrides, parentHtml, onSkip);
  const css = [rootCss, masterExtraCss(overrides, onSkip)].filter(Boolean).join("\n");
  if (!css) return html;
  const head = `${fontLinks.map((href) => `<link rel="stylesheet" href="${href}" />\n`).join("")}<style id="${styleId}">${css}</style>\n`;
  return html.replace(/<\/head>/i, () => `${head}</head>`);
}
