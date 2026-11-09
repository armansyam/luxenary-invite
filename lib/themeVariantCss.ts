/**
 * Bagian murni Varian Tema (tanpa database), dipakai bersama oleh server (render, rute admin) dan editor varian di
 * peramban (pratinjau warna langsung). Resolusi varian dari DB ada di lib/themeVariants.ts.
 */
import { FONT_OPTIONS, googleFontCssUrl, googleFontFamilyName, isGoogleFontId } from "@/lib/themeBuilder/spec";

export interface MasterOverrides {
  /** Nama variabel warna master → #rrggbb. */
  colors: Record<string, string>;
  /** Nama variabel huruf master → id font katalog lokal atau "g:<Nama Google Font>". */
  fonts: Record<string, string>;
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
  if (Object.keys(value.colors).length + Object.keys(value.fonts).length > MAX_MASTER_OVERRIDES) errors.push(`Override paling banyak ${MAX_MASTER_OVERRIDES}.`);
  return errors.length ? { ok: false, errors } : { ok: true, value };
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

/** Master induk ditambah override, disisipkan terakhir di `<head>` agar menang atas `:root` master. */
export function applyMasterOverridesTo(parentHtml: string, overrides: MasterOverrides, onSkip?: (name: string) => void): string {
  const { css, fontLinks } = masterOverrideCss(overrides, parentHtml, onSkip);
  if (!css) return parentHtml;
  const head = `${fontLinks.map((href) => `<link rel="stylesheet" href="${href}" />\n`).join("")}<style id="lux-master-overrides">${css}</style>\n`;
  return parentHtml.replace(/<\/head>/i, () => `${head}</head>`);
}
