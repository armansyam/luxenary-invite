import fs from "fs";
import path from "path";
import {
  RADIUS_OPTIONS,
  blockStyle,
  fontFamily,
  ornamentStyle,
  type BlockProps,
  type BuilderBlockId,
  type BuilderEventType,
  type BuilderOrnament,
  type BuilderSpec,
  type BuilderVariants,
} from "@/lib/themeBuilder/spec";

const BLUEPRINT_FILES: Record<BuilderEventType, string> = {
  WEDDING: path.join("themes", "_blueprints", "wedding", "starter-blueprint.html"),
};

export function readBuilderBlueprint(eventType: BuilderEventType): string {
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), BLUEPRINT_FILES[eventType]), "utf-8");
}

function rootBlock(spec: BuilderSpec): string {
  const p = spec.palette;
  const dark = spec.canvasMode === "dark";
  const [sm, md, lg] = (RADIUS_OPTIONS.find((r) => r.id === spec.radius) ?? RADIUS_OPTIONS[1]).values;
  const texture = spec.texture ? `url('${spec.texture}')` : "none";
  return `:root {
      --primary: ${p.primary};
      --secondary: ${p.secondary};
      --accent: ${p.accent};
      --bg-light: ${p.bgLight};
      --bg-dark: ${p.bgDark};
      --text-main: ${dark ? p.textLight : p.textDark};
      --text-muted: color-mix(in srgb, var(--text-main) 68%, transparent);
      --on-dark: ${p.textLight};
      --on-primary: ${p.onPrimary};
      --success: ${dark ? "#68d391" : "#2f855a"};
      --danger: ${dark ? "#fc8181" : "#c53030"};
      --bg-canvas: var(${dark ? "--bg-dark" : "--bg-light"});
      --card-bg: color-mix(in srgb, var(--bg-canvas) ${dark ? 86 : 78}%, var(--on-dark));
      --overlay: var(--bg-dark);
      --shadow-color: color-mix(in srgb, var(--bg-dark) ${dark ? 40 : 16}%, transparent);
      --canvas-texture: ${texture};
      --font-heading: ${fontFamily(spec.fonts.heading)};
      --font-body: ${fontFamily(spec.fonts.body)};
      --font-script: ${fontFamily(spec.fonts.script)};
      --radius-sm: ${sm}px;
      --radius-md: ${md}px;
      --radius-lg: ${lg}px;
      --radius-full: 9999px;
      --shadow-subtle: 0 4px 20px var(--shadow-color);
      --shadow-elevated: 0 12px 36px color-mix(in srgb, var(--bg-dark) ${dark ? 50 : 24}%, transparent);
    }`;
}

// CSS varian hanya menata ulang markup blueprint yang sudah ada; elemen, token, dan data-lux-field tidak berubah.
const VARIANT_CSS: Record<keyof BuilderVariants, Record<string, string>> = {
  cover: {
    framed: `
    .cover-overlay::before, .cover-overlay::after { content: ''; position: absolute; pointer-events: none; z-index: 1; }
    .cover-overlay::before { inset: 16px; border: 1px solid color-mix(in srgb, var(--on-dark) 45%, transparent); border-radius: var(--radius-lg); }
    .cover-overlay::after { inset: 22px; border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); border-radius: calc(var(--radius-lg) - 4px); }`,
    arch: `
    .cover-center { padding: 56px 26px 36px; max-width: 300px; margin: 0 auto; border: 1px solid color-mix(in srgb, var(--on-dark) 40%, transparent); border-radius: 999px 999px var(--radius-md) var(--radius-md); background: color-mix(in srgb, var(--overlay) 28%, transparent); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }`,
    editorial: `
    .cover-overlay { align-items: flex-start; text-align: left; }
    .cover-top, .cover-center, .cover-bottom { align-self: stretch; }
    .cover-bottom { align-items: flex-start !important; }
    .cover-names { font-size: 44px; line-height: 1.05; }
    .cover-subtitle { margin-left: 0; }`,
  },
  opening: {
    card: `
    .opening-center { width: 100%; max-width: 380px; padding: 28px 22px; background: color-mix(in srgb, var(--card-bg) 92%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent); border-radius: var(--radius-lg); box-shadow: var(--shadow-elevated); }`,
    arch: `
    .opening-photo { aspect-ratio: 3 / 4.2; border-radius: 999px 999px var(--radius-md) var(--radius-md); }`,
    circle: `
    .opening-photo { width: min(58%, 220px); aspect-ratio: 1; border-radius: 50%; }`,
  },
  couple: {
    side: `
    .couple-grid { flex-direction: row; align-items: flex-start; justify-content: center; gap: 10px; }
    .couple-card { flex: 1 1 0; min-width: 0; }
    .couple-photo-wrap { width: min(120px, 100%); height: auto; aspect-ratio: 1; }
    .couple-amp { align-self: center; font-size: 28px; }
    .couple-name { font-size: 18px; overflow-wrap: anywhere; }
    .couple-parents { font-size: 11px; }`,
    arch: `
    .couple-photo-wrap { width: 150px; height: 200px; border-radius: 999px 999px var(--radius-md) var(--radius-md); }
    .couple-photo-wrap img { border-radius: 999px 999px calc(var(--radius-md) - 4px) calc(var(--radius-md) - 4px); }`,
    polaroid: `
    .couple-photo-wrap { width: 160px; height: 196px; padding: 8px 8px 30px; border: none; border-radius: var(--radius-sm); background: var(--card-bg); box-shadow: 10px 10px 0 color-mix(in srgb, var(--accent) 45%, transparent), var(--shadow-elevated); }
    .couple-photo-wrap img { border-radius: 2px; }
    .couple-card:first-child .couple-photo-wrap { transform: rotate(-3deg); }
    .couple-card:last-child .couple-photo-wrap { transform: rotate(3deg); }`,
  },
  countdown: {
    circles: `
    .countdown-box { aspect-ratio: 1; padding: 0; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }`,
    minimal: `
    .countdown-box { background: transparent; border: none; border-radius: 0; }
    .countdown-box + .countdown-box { border-left: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); }
    .countdown-num { font-size: 32px; font-weight: 500; font-family: var(--font-heading); }`,
    solid: `
    .countdown-box { background: var(--primary); border-color: transparent; box-shadow: var(--shadow-subtle); }
    .countdown-num, .countdown-lbl { color: var(--on-primary); }`,
  },
  closing: {
    card: `
    .closing-content { max-width: 380px; padding: 32px 22px; background: color-mix(in srgb, var(--card-bg) 90%, transparent); border-radius: var(--radius-lg); box-shadow: var(--shadow-elevated); }
    .closing-sec.has-closing-photo .closing-content { background: color-mix(in srgb, var(--overlay) 45%, transparent); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }`,
    framed: `
    .closing-content { max-width: 360px; padding: 34px 22px; border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent); outline: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); outline-offset: 6px; border-radius: var(--radius-md); }`,
  },
  headings: {
    script: `
    .sec-main-title { font-family: var(--font-script); font-size: 40px; font-weight: 400; letter-spacing: 0; line-height: 1.1; }`,
    lined: `
    .sec-eyebrow::before, .sec-eyebrow::after { content: ''; display: inline-block; width: 26px; height: 1px; margin: 0 10px; vertical-align: middle; background: currentColor; opacity: 0.6; }`,
    ornate: `
    .sec-main-title { margin-bottom: 20px; }
    .sec-main-title::after { content: ''; display: block; width: 72px; height: 1px; margin: 14px auto 0; background: linear-gradient(90deg, transparent, var(--accent), transparent); }`,
  },
  sidebar: {
    "bottom-center": `
    @media (min-width: 900px) {
      .sidebar-desktop-content { text-align: center; }
      .sidebar-desktop-quote { margin: 0 auto; }
    }`,
    center: `
    @media (min-width: 900px) {
      .sidebar-desktop-content { top: 50%; bottom: auto; transform: translateY(-50%); text-align: center; }
      .sidebar-desktop-quote { margin: 0 auto; }
      .sidebar-desktop::after { background: color-mix(in srgb, var(--overlay) 55%, transparent); }
    }`,
    "top-left": `
    @media (min-width: 900px) {
      .sidebar-desktop-content { top: 4rem; bottom: auto; }
      .sidebar-desktop::after { background: linear-gradient(to bottom, color-mix(in srgb, var(--overlay) 85%, transparent) 0%, color-mix(in srgb, var(--overlay) 30%, transparent) 50%, transparent 100%); }
    }`,
  },
};

const EAGER_SECTIONS = new Set(["cover", "sidebar", "opening"]);

function ornamentHtml(o: BuilderOrnament): string {
  const loading = EAGER_SECTIONS.has(o.section) ? "eager" : "lazy";
  return `<div class="lux-orn${o.layer === "front" ? " is-front" : ""}" data-orn-id="${o.id}" style="${ornamentStyle(o)}" aria-hidden="true"><img src="${o.src}" alt="" loading="${loading}" decoding="async" draggable="false" /></div>`;
}

/**
 * Master tema dari spesifikasi builder. Spesifikasi wajib lolos `parseBuilderSpec` terlebih dahulu: nilai warna, huruf,
 * dan URL ornamen disisipkan tanpa escape karena sudah dibatasi ke hex, katalog, dan pola path yang aman.
 */
export function compileBuilderMaster(spec: BuilderSpec, blueprint = readBuilderBlueprint(spec.eventType)): string {
  if (!/:root\s*\{[^}]*\}/.test(blueprint)) throw new Error("Blueprint tidak memiliki blok :root.");
  let html = blueprint.replace(/:root\s*\{[^}]*\}/, rootBlock(spec));

  html = html.replace(/<html lang="id"[^>]*>/, `<html lang="id" data-lux-anim-preset="${spec.animation}">`);

  const variantCss = (Object.keys(VARIANT_CSS) as Array<keyof BuilderVariants>)
    .map((key) => VARIANT_CSS[key][spec.variants[key]])
    .filter(Boolean)
    .join("\n");
  if (variantCss) {
    html = html.replace("</head>", `  <style id="lux-builder-variants">${variantCss}\n  </style>\n</head>`);
  }

  // Id blok berasal dari daftar tetap dan nilainya angka terjepit, jadi aman disisipkan tanpa escape.
  const blockRules = (Object.entries(spec.blocks) as Array<[BuilderBlockId, BlockProps]>)
    .map(([id, props]) => `[data-lux-block="${id}"]{${blockStyle(props)}}`)
    .join("\n    ");
  if (blockRules) {
    html = html.replace("</head>", `  <style id="lux-builder-blocks">\n    ${blockRules}\n  </style>\n</head>`);
  }

  html = html.replace(/<!-- lux-ornaments:([a-z]+) -->/g, (marker, section: string) => {
    const items = spec.ornaments.filter((o) => o.section === section);
    return items.length ? items.map(ornamentHtml).join("\n    ") : marker;
  });

  return html;
}
