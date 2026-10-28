import { FONT_OPTIONS, TEXTURE_OPTIONS, defaultBuilderSpec, isAllowedBackdropSrc, type BuilderDefaultMedia, type BuilderFonts, type BuilderPalette, type BuilderSpec } from "@/lib/themeBuilder/spec";

/**
 * Keluarga huruf yang dikenali dari `font-family` master lama dan perannya. Keluarga di luar daftar ini (mis. huruf
 * lokal "Yaqoote Script" atau "Lontara") tidak ada di Google Fonts sehingga tidak dibawa. Yang bukan bawaan builder
 * dipasang sebagai huruf Google dan diunduh server saat rancangan disimpan.
 */
const LEGACY_FONT_ROLES: Record<string, keyof BuilderFonts> = {
  "Great Vibes": "script", "Pinyon Script": "script", "Parisienne": "script", "Alex Brush": "script", "Italianno": "script",
  "Plus Jakarta Sans": "body", "Jost": "body", "Syne": "body", "Outfit": "body",
  "Cinzel": "heading", "Cinzel Decorative": "heading", "Cormorant Garamond": "heading", "Cormorant": "heading", "Cormorant Infant": "heading",
  "Playfair Display": "heading", "DM Serif Display": "heading", "Lora": "heading", "Italiana": "heading", "Bellefair": "heading",
  "Newsreader": "heading", "Bodoni Moda": "heading", "Vidaloka": "heading",
};

const fontIdOf = (family: string) => FONT_OPTIONS.find((f) => f.label === family)?.id ?? `g:${family}`;

/** Huruf tiap peran dari keluarga yang paling sering dipakai di master lama; peran tanpa keluarga dikenali memakai bawaan. */
export function legacyFonts(html: string): Partial<BuilderFonts> {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
    const first = m[1].split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    if (first in LEGACY_FONT_ROLES) counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  const fonts: Partial<BuilderFonts> = {};
  for (const [family] of [...counts].sort((a, b) => b[1] - a[1])) {
    const role = LEGACY_FONT_ROLES[family];
    if (!fonts[role]) fonts[role] = fontIdOf(family);
  }
  return fonts;
}

/** Media bawaan tema lama yang masih sah untuk slot builder (pustaka latar atau unggahan); sisanya dibuang. */
export function legacyDefaultMedia(raw: unknown): BuilderDefaultMedia {
  if (!raw || typeof raw !== "object") return {};
  const media: BuilderDefaultMedia = {};
  for (const slot of ["LANDING_COVER", "DESKTOP_SIDEBAR", "CLOSING_COVER"] as const) {
    const value = (raw as Record<string, unknown>)[slot];
    if (typeof value === "string" && isAllowedBackdropSrc(value) && value !== "") media[slot] = value;
  }
  return media;
}

/**
 * Titik awal builder dari master tulisan tangan. Builder tidak dapat mengedit master lama langsung: master itu tidak
 * memiliki penanda seksi/blok dan sebagian besar warnanya tertulis mati di luar :root. Jembatan ini hanya membaca
 * palet (`:root`) dan latar bawaan master lama untuk mengisi rancangan baru berbasis blueprint; master lama tidak
 * disentuh, dan tata letaknya mengikuti blueprint.
 */
export interface LegacySeed {
  spec: BuilderSpec;
  /** Kunci palet builder yang berhasil diambil dari :root master. */
  found: Array<keyof BuilderPalette>;
  missing: Array<keyof BuilderPalette>;
  textureFound: boolean;
  /** Peran huruf yang berhasil dibaca dari master lama. */
  fontsFound: Array<keyof BuilderFonts>;
  /** Jumlah warna hex tertulis mati di luar :root; tidak ikut terbawa ke rancangan baru. */
  hexOutsideRoot: number;
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(value: string | undefined): string | null {
  const v = value?.trim() ?? "";
  if (!HEX.test(v)) return null;
  const lower = v.toLowerCase();
  return lower.length === 4 ? `#${[...lower.slice(1)].map((c) => c + c).join("")}` : lower;
}

function rootVars(html: string): Map<string, string> {
  const root = html.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  return new Map([...root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => [m[1], m[2].trim()] as const));
}

export function seedSpecFromMaster(html: string): LegacySeed {
  const vars = rootVars(html);
  const pick = (...names: string[]) => names.map((n) => normalizeHex(vars.get(n))).find((v): v is string => v !== null) ?? null;

  const hasLight = pick("--bg-light") !== null;
  const hasDark = pick("--bg-dark") !== null;
  const bodyBg = html.match(/\bbody\s*\{[^}]*?background(?:-color)?\s*:\s*var\((--[a-z-]+)/i)?.[1];
  const canvasMode: BuilderSpec["canvasMode"] = bodyBg === "--bg-dark" || (hasDark && !hasLight) ? "dark" : "light";

  const base = defaultBuilderSpec();
  const text = pick("--text-main", "--text-dark");
  const found: Array<keyof BuilderPalette> = [];
  const palette: BuilderPalette = { ...base.palette };
  const assign = (key: keyof BuilderPalette, value: string | null) => {
    if (value) {
      palette[key] = value;
      found.push(key);
    }
  };
  assign("primary", pick("--primary"));
  assign("secondary", pick("--secondary"));
  assign("accent", pick("--accent"));
  assign("bgLight", pick("--bg-light"));
  assign("bgDark", pick("--bg-dark"));
  assign("onPrimary", pick("--on-primary"));
  assign("textLight", canvasMode === "dark" ? text ?? pick("--on-dark") : pick("--on-dark"));
  assign("textDark", canvasMode === "dark" ? null : text);

  let texture = "";
  for (const block of html.matchAll(/\.fixed-bg-layer\s*\{([^}]*)\}/g)) {
    const url = block[1].match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/)?.[1];
    if (url && TEXTURE_OPTIONS.some((t) => t.id === url)) {
      texture = url;
      break;
    }
  }

  const outsideRoot = html.replace(/:root\s*\{[^}]*\}/g, "").replace(/&#x?[0-9a-f]+;/gi, "");
  const allKeys = Object.keys(palette) as Array<keyof BuilderPalette>;
  const legacy = legacyFonts(html);
  return {
    spec: { ...base, canvasMode, palette, texture, fonts: { ...base.fonts, ...legacy } },
    found,
    missing: allKeys.filter((k) => !found.includes(k)),
    textureFound: texture !== "",
    fontsFound: Object.keys(legacy) as Array<keyof BuilderFonts>,
    hexOutsideRoot: (outsideRoot.match(/#[0-9a-fA-F]{6}\b/g) ?? []).length,
  };
}
