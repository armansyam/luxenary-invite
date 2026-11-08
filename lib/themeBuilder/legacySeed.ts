import {
  FONT_OPTIONS,
  MAX_ORNAMENTS,
  MAX_ORNAMENTS_PER_SECTION,
  TEXTURE_OPTIONS,
  builderFamilyOf,
  defaultBuilderSpec,
  familyBlocks,
  familySections,
  isAllowedBackdropSrc,
  isAllowedOrnamentSrc,
  type AttachableBlockId,
  type BuilderBlockId,
  type BuilderDefaultMedia,
  type BuilderEventType,
  type BuilderFonts,
  type BuilderFrames,
  type BuilderOrnament,
  type BuilderPalette,
  type BuilderSpec,
  type BuilderVariants,
  type OrnamentSection,
} from "@/lib/themeBuilder/spec";

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

/** Bingkai foto yang terdeteksi dari tema master lama (ornamen bingkai atau lengkungan arch). */
export function legacyFrames(html: string, eventType: BuilderEventType = "WEDDING"): BuilderFrames {
  if (html.includes('data-orn-id="')) return {};
  const frames: BuilderFrames = {};
  const isWedding = builderFamilyOf(eventType) === "wedding";

  let homeOrnament = "";
  let coupleOrnament = "";
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
    const cls = tag.match(/\bclass=["']([^"']+)["']/i)?.[1] ?? "";
    if (!isAllowedOrnamentSrc(src)) continue;
    if (!homeOrnament && /\b(?:home-frame-overlay|hero-mirror-frame)\b/.test(cls)) homeOrnament = src;
    if (!coupleOrnament && /\bcouple-frame-overlay\b/.test(cls)) coupleOrnament = src;
  }

  if (homeOrnament) {
    frames["opening-photo"] = { shape: "default", ornament: homeOrnament, spread: 14, hideRing: true, fit: null };
  } else if (/\b(?:home-arch-wrap|hero-arch-photo)\b/.test(html)) {
    frames["opening-photo"] = { shape: "arch", ornament: "", spread: 14, hideRing: false, fit: null };
  }

  if (coupleOrnament) {
    frames["couple-photo-1"] = { shape: "default", ornament: coupleOrnament, spread: 14, hideRing: true, fit: null };
    if (isWedding) frames["couple-photo-2"] = { shape: "default", ornament: coupleOrnament, spread: 14, hideRing: true, fit: null };
  } else if (/\bperson-photo-arch\b/.test(html)) {
    frames["couple-photo-1"] = { shape: "arch", ornament: "", spread: 14, hideRing: false, fit: null };
    if (isWedding) frames["couple-photo-2"] = { shape: "arch", ornament: "", spread: 14, hideRing: false, fit: null };
  }

  return frames;
}

type RawLegacySection = OrnamentSection | "quote";

const LEGACY_SECTION_STARTS: Array<{ section: RawLegacySection; re: RegExp }> = [
  { section: "cover", re: /<div\b[^>]*\b(?:id=["']coverScreen["']|class=["'][^"']*\bcover-screen\b)/i },
  { section: "sidebar", re: /<aside\b[^>]*\bclass=["'][^"']*\bsidebar-desktop\b/i },
  { section: "opening", re: /<section\b[^>]*\b(?:id=["']home["']|class=["'][^"']*\b(?:sec-home|sec-flow-hero)\b)/i },
  { section: "quote", re: /<section\b[^>]*\b(?:id=["']quote["']|class=["'][^"']*\bsec-quote\b)/i },
  { section: "couple", re: /<section\b[^>]*\b(?:id=["']couple["']|class=["'][^"']*\bsec-couple\b)/i },
  { section: "countdown", re: /<section\b[^>]*\bid=["']countdown["']/i },
  { section: "events", re: /<section\b[^>]*\b(?:id=["']events["']|class=["'][^"']*\bsec-events\b)/i },
  { section: "rsvp", re: /<section\b[^>]*\b(?:id=["']rsvp["']|class=["'][^"']*\bsec-rsvp\b)/i },
  { section: "closing", re: /<(?:footer\b[^>]*\bclass=["'][^"']*\bsite-footer\b|section\b[^>]*\b(?:id=["']closing["']|class=["'][^"']*\bsec-closing\b))/i },
];

/** Ornamen gambar yang terdeteksi per seksi dari tema master tulisan tangan. */
export function legacyOrnaments(html: string, eventType: BuilderEventType = "WEDDING"): BuilderOrnament[] {
  if (html.includes('data-orn-id="')) return [];
  const isSingle = builderFamilyOf(eventType) === "single";
  const allowedSections = new Set(familySections(eventType));
  const allowedBlocks = new Set(familyBlocks(eventType).map((b) => b.id));

  const cssBorders = new Map<string, string>();
  for (const m of html.matchAll(/\.([a-z0-9_-]+)\s*\{([^}]*)\}/gi)) {
    const cls = m[1];
    const url = m[2].match(/url\(\s*['"]?(\/assets\/ornaments\/(?!background\/)[^'")]+)['"]?\s*\)/i)?.[1];
    if (url && isAllowedOrnamentSrc(url)) cssBorders.set(cls, url);
  }

  const slices = LEGACY_SECTION_STARTS
    .map(({ section, re }) => {
      const m = re.exec(html);
      return m ? { section, start: m.index } : null;
    })
    .filter((s): s is { section: RawLegacySection; start: number } => s !== null)
    .sort((a, b) => a.start - b.start);

  const candidates: Array<Omit<BuilderOrnament, "id">> = [];
  const push = (item: Omit<BuilderOrnament, "id">) => {
    if (!allowedSections.has(item.section)) return;
    if (item.attach && !allowedBlocks.has(item.attach)) return;
    if (item.before && !allowedBlocks.has(item.before)) return;
    candidates.push(item);
  };

  const defaultBefore: Record<RawLegacySection, { before: BuilderBlockId; width: number; gap: number }> = {
    cover: { before: "cover-badge", width: 28, gap: 12 },
    sidebar: { before: "sidebar-tagline", width: 20, gap: 12 },
    opening: { before: isSingle ? "opening-greeting" : "opening-top", width: 26, gap: 12 },
    quote: { before: "opening-quote", width: 22, gap: 12 },
    couple: { before: "couple-eyebrow", width: 18, gap: 10 },
    countdown: { before: "countdown-eyebrow", width: 18, gap: 10 },
    events: { before: "events-eyebrow", width: 18, gap: 10 },
    story: { before: "story-eyebrow", width: 18, gap: 10 },
    gallery: { before: "rsvp-eyebrow", width: 18, gap: 10 },
    rsvp: { before: "rsvp-eyebrow", width: 18, gap: 10 },
    closing: { before: "closing-quote", width: 32, gap: 14 },
  };

  for (let i = 0; i < slices.length; i++) {
    const { section: rawSection, start } = slices[i];
    const nextStart = slices[i + 1]?.start ?? html.length;
    const chunk = html.slice(start, nextStart);
    const section: OrnamentSection = rawSection === "quote" ? "opening" : rawSection;

    for (const [cls, src] of cssBorders) {
      if (!new RegExp(`<div\\b[^>]*\\bclass=["'][^"']*\\b${cls}\\b`, "i").test(chunk)) continue;
      if (cls.endsWith("-top")) {
        push({ section, src, x: 50, y: 2, anchor: "top", width: 100, rotate: 0, opacity: 0.95, flipX: false, layer: "front" });
      } else if (cls.endsWith("-bottom")) {
        push({ section, src, x: 50, y: 2, anchor: "bottom", width: 100, rotate: 0, opacity: 0.95, flipX: false, layer: "front" });
      }
    }

    let mahkotaCount = 0;
    for (const m of chunk.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
      const cls = tag.match(/\bclass=["']([^"']+)["']/i)?.[1] ?? "";
      if (!isAllowedOrnamentSrc(src)) continue;
      if (/\b(?:couple-frame-overlay|home-frame-overlay|hero-mirror-frame)\b/.test(cls)) continue;

      if (/\b(?:corner-tl|cover-botanical-top-left)\b/.test(cls)) {
        push({ section, src, x: 14, y: 8, anchor: "top", width: 32, rotate: 0, opacity: 1, flipX: false, layer: "front" });
      } else if (/\b(?:corner-tr|cover-botanical-top-right|ob-top-right)\b/.test(cls)) {
        push({ section, src, x: 86, y: 8, anchor: "top", width: 32, rotate: 0, opacity: 1, flipX: src.includes("bunga-botani2"), layer: "front" });
      } else if (/\bcorner-bl\b/.test(cls)) {
        push({ section, src, x: 14, y: 8, anchor: "bottom", width: 32, rotate: 0, opacity: 1, flipX: false, layer: "front" });
      } else if (/\bcorner-br\b/.test(cls)) {
        push({ section, src, x: 86, y: 8, anchor: "bottom", width: 32, rotate: 0, opacity: 1, flipX: false, layer: "front" });
      } else if (/\bmakassar-frame-top\b/.test(cls)) {
        push({ section, src, x: 50, y: 2, anchor: "top", width: 100, rotate: 0, opacity: 0.95, flipX: false, layer: "front" });
      } else if (/\bmakassar-frame-bottom\b/.test(cls)) {
        push({ section, src, x: 50, y: 2, anchor: "bottom", width: 100, rotate: 0, opacity: 0.95, flipX: false, layer: "front" });
      } else if (/\b(?:cover|home)-watermark-left\b/.test(cls)) {
        push({ section, src, x: 18, y: 12, anchor: "bottom", width: 42, rotate: 0, opacity: 0.22, flipX: false, layer: "back" });
      } else if (/\b(?:cover|home)-watermark-center\b/.test(cls)) {
        push({ section, src, x: 50, y: 14, anchor: "bottom", width: 48, rotate: 0, opacity: 0.2, flipX: false, layer: "back" });
      } else if (/\b(?:cover|home)-watermark-right\b/.test(cls)) {
        push({ section, src, x: 82, y: 12, anchor: "bottom", width: 42, rotate: 0, opacity: 0.22, flipX: true, layer: "back" });
      } else if (/\bcard-floral-left\b/.test(cls)) {
        push({ section: "cover", src, x: 18, y: 16, anchor: "top", width: 38, rotate: 0, opacity: 1, flipX: false, layer: "front" });
      } else if (/\bcard-floral-right\b/.test(cls)) {
        push({ section: "cover", src, x: 82, y: 16, anchor: "bottom", width: 38, rotate: 0, opacity: 1, flipX: false, layer: "front" });
      } else if (/\bwalasuji-sabbe-drape\b/.test(cls)) {
        push({ section: "cover", src, x: 50, y: 24, anchor: "top", width: 64, rotate: 0, opacity: 0.9, flipX: false, layer: "back" });
      } else if (/\bwalasuji-arch-img\b/.test(cls)) {
        push({ section: "cover", src, x: 50, y: 50, anchor: "top", width: 56, rotate: 0, opacity: 1, flipX: false, layer: "back", before: "cover-badge", gap: 14, slot: "HOME_PHOTO" });
      } else if (/\bhome-arch-bottom-ornament\b/.test(cls)) {
        push({ section: "opening", src, x: 50, y: 100, anchor: "top", width: 65, rotate: 0, opacity: 1, flipX: false, layer: "front", attach: "opening-photo" });
      } else if (/\bcouple-amp-divider\b/.test(cls)) {
        push({ section: "couple", src, x: src.includes("kiri") ? -70 : 170, y: 50, anchor: "top", width: 90, rotate: 0, opacity: 1, flipX: false, layer: "front", attach: "couple-amp" });
      } else if (/\bcouple-atap-mahkota\b/.test(cls)) {
        const target: AttachableBlockId = mahkotaCount === 0 ? "couple-photo-1" : "couple-photo-2";
        mahkotaCount++;
        push({ section: "couple", src, x: 50, y: -12, anchor: "top", width: 115, rotate: 0, opacity: 1, flipX: false, layer: "front", attach: target });
      } else {
        const flow = defaultBefore[rawSection];
        push({ section, src, x: 50, y: 50, anchor: "top", width: flow.width, rotate: 0, opacity: 1, flipX: false, layer: "back", before: flow.before, gap: flow.gap });
      }
    }

    for (const wm of chunk.matchAll(/<div\b[^>]*\bclass=["']([^"']*\b(?:couple-watermark-initial|cover-watermark|couple-watermark)\b[^"']*)["'][^>]*>([\s\S]*?)<\/div>/gi)) {
      const cls = wm[1];
      const inner = wm[2];
      const hasFirst = inner.includes("{{firstInitial}}");
      const hasSecond = inner.includes("{{secondInitial}}");
      if (!hasFirst && !hasSecond) continue;
      if (hasFirst && hasSecond) {
        push({
          section, src: "", x: 50, y: 50, anchor: "top", width: 85, rotate: 0, opacity: 0.14, flipX: false, layer: "back",
          text: { token: "MONOGRAM_JOINED", value: "RA", font: "heading", size: 110, color: "primary", spacing: 0.08 },
        });
      } else if (hasFirst) {
        push({
          section, src: "", x: /\binitial-right\b/.test(cls) ? 78 : 22, y: 28, anchor: "top", width: 55, rotate: 0, opacity: 0.14, flipX: false, layer: "back",
          text: { token: "FIRST_INITIAL", value: "R", font: "heading", size: 120, color: "primary", spacing: 0 },
        });
      } else if (hasSecond && !isSingle) {
        push({
          section, src: "", x: /\binitial-left\b/.test(cls) ? 22 : 78, y: 72, anchor: "top", width: 55, rotate: 0, opacity: 0.14, flipX: false, layer: "back",
          text: { token: "SECOND_INITIAL", value: "A", font: "heading", size: 120, color: "primary", spacing: 0 },
        });
      }
    }
  }

  const ornaments: BuilderOrnament[] = [];
  const seen = new Set<string>();
  const perSection: Record<string, number> = {};
  for (const c of candidates) {
    if (ornaments.length >= MAX_ORNAMENTS) break;
    const key = `${c.section}|${c.src}|${c.x}|${c.y}|${c.anchor}|${c.flipX}|${c.attach ?? ""}|${c.before ?? ""}|${c.slot ?? ""}|${c.text?.token ?? c.text?.value ?? ""}`;
    if (seen.has(key)) continue;
    if ((perSection[c.section] ?? 0) >= MAX_ORNAMENTS_PER_SECTION) continue;
    seen.add(key);
    perSection[c.section] = (perSection[c.section] ?? 0) + 1;
    ornaments.push({ id: `legorn${String(ornaments.length + 1).padStart(4, "0")}`, ...c });
  }
  return ornaments;
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

function hexLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rootVars(html: string): Map<string, string> {
  const root = html.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  return new Map([...root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => [m[1], m[2].trim()] as const));
}

/** Varian tata letak seksi yang terdeteksi dari kelas CSS tema master lama agar bentuk foto tidak berubah otomatis. */
export function legacyVariants(html: string, base: BuilderVariants): BuilderVariants {
  if (html.includes('id="lux-builder-variants"')) return base;
  const variants: BuilderVariants = { ...base };
  if (/@media\s*\(\s*min-width\s*:\s*900px\s*\)\s*\{[\s\S]*?\.(?:cover-screen|cover-overlay)\s*\{[^}]*width\s*:\s*100%/i.test(html)) {
    variants.cover = "fullscreen";
  }
  if (/\b(?:couple-hero-slide|couple-editorial-card|person-full-bg)\b/.test(html)) {
    variants.couple = "backdrop";
  } else if (/\b(?:person-photo-arch|couple-arch)\b/.test(html)) {
    variants.couple = "arch";
  } else if (
    /\bcouple-frame-overlay\b/.test(html) ||
    (/\b(?:couple-photo|person-photo)\b/.test(html) && !/\.(?:couple-photo|person-photo)[^{]*\{[^}]*border-radius\s*:\s*(?:50%|999px|var\(--radius-full\))/i.test(html))
  ) {
    variants.couple = "portrait";
  }
  if (/\b(?:home-arch-wrap|hero-arch-photo)\b/.test(html)) {
    variants.opening = "arch";
  }
  return variants;
}

export function seedSpecFromMaster(html: string, eventType: BuilderEventType = "WEDDING"): LegacySeed {
  const vars = rootVars(html);
  const pick = (...names: string[]) => names.map((n) => normalizeHex(vars.get(n))).find((v): v is string => v !== null) ?? null;

  const hasLight = pick("--bg-light") !== null;
  const hasDark = pick("--bg-dark") !== null;
  const bodyBg = html.match(/\bbody\s*\{[^}]*?background(?:-color)?\s*:\s*var\((--[a-z-]+)/i)?.[1];
  const textMain = pick("--text-main");
  const scrimTransparent = /\.scrim-canvas\s*\{[^}]*background\s*:\s*transparent/i.test(html);
  const isLightScrimWithDarkText = scrimTransparent && textMain !== null && hexLuminance(textMain) < 0.35;
  const canvasMode: BuilderSpec["canvasMode"] =
    !isLightScrimWithDarkText && (bodyBg === "--bg-dark" || (hasDark && !hasLight)) ? "dark" : "light";

  const base = defaultBuilderSpec(eventType);
  const explicitLight = pick("--text-light", "--on-dark");
  const explicitDark = pick("--text-dark");
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
  const resolvedLight =
    (explicitLight && hexLuminance(explicitLight) >= 0.5 ? explicitLight : null) ??
    (textMain && hexLuminance(textMain) >= 0.5 ? textMain : null);
  const resolvedDark =
    (explicitDark && hexLuminance(explicitDark) < 0.5 ? explicitDark : null) ??
    (textMain && hexLuminance(textMain) < 0.5 ? textMain : null);
  assign("textLight", resolvedLight);
  assign("textDark", resolvedDark);

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
  const frames = legacyFrames(html, eventType);
  const ornaments = legacyOrnaments(html, eventType);
  const variants = legacyVariants(html, base.variants);
  const blocks: BuilderSpec["blocks"] = { ...base.blocks };
  if (!html.includes('data-lux-block="opening-photo"') && !html.includes("{{homePhotoUrl}}")) {
    blocks["opening-photo"] = { x: 0, y: 0, scale: 1, rotate: 0, hidden: true };
  }
  return {
    spec: { ...base, canvasMode, palette, texture, fonts: { ...base.fonts, ...legacy }, variants, blocks, frames, ornaments },
    found,
    missing: allKeys.filter((k) => !found.includes(k)),
    textureFound: texture !== "",
    fontsFound: Object.keys(legacy) as Array<keyof BuilderFonts>,
    hexOutsideRoot: (outsideRoot.match(/#[0-9a-fA-F]{6}\b/g) ?? []).length,
  };
}
