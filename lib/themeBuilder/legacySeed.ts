import { TEXTURE_OPTIONS, defaultBuilderSpec, type BuilderPalette, type BuilderSpec } from "@/lib/themeBuilder/spec";

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
  return {
    spec: { ...base, canvasMode, palette, texture },
    found,
    missing: allKeys.filter((k) => !found.includes(k)),
    textureFound: texture !== "",
    hexOutsideRoot: (outsideRoot.match(/#[0-9a-fA-F]{6}\b/g) ?? []).length,
  };
}
