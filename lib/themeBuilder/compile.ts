import fs from "fs";
import path from "path";
import { animationPlan, designCss } from "@/lib/themeBuilder/designCss";
import {
  BUILDER_TEXTS,
  FRAMED_PHOTOS,
  freeSectionLabelKeys,
  freeCardLabelKeys,
  freeExtraLabelKeys,
  type CountdownPlacement,
  type FreeSectionPhoto,
  type FreeSection,
  type NestableGuest,
  type NestingHost,
  PHOTO_FILTER_CSS,
  RADIUS_OPTIONS,
  blockStyle,
  builderFamilyOf,
  type BuilderFamily,
  familyOrderableSections,
  fontFamily,
  frameCss,
  googleFontCssUrl,
  googleFontIds,
  isDefaultSectionOrder,
  loopCss,
  ornamentStyle,
  type BlockProps,
  type BuilderBlockId,
  type BuilderEventType,
  type BuilderOrnament,
  type BuilderSpec,
  type BuilderTexts,
  type BuilderVariants,
  type OrderableSection,
  type OrnamentMediaSlot,
  type OrnamentTextToken,
} from "@/lib/themeBuilder/spec";

const BLUEPRINT_FILES: Record<BuilderFamily, string> = {
  wedding: path.join("themes", "_blueprints", "wedding", "starter-blueprint.html"),
  single: path.join("themes", "_blueprints", "single-name", "starter-blueprint-single.html"),
};

/** Token jadwal acara di blueprint: kartu sesi pernikahan vs kartu sesi buatan mesin untuk satu nama. */
const EVENTS_TOKEN: Record<BuilderFamily, string> = {
  wedding: "{{eventDataHtml}}",
  single: "{{eventSectionHtml}}",
};

export function readBuilderBlueprint(eventType: BuilderEventType): string {
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), BLUEPRINT_FILES[builderFamilyOf(eventType)]), "utf-8");
}

/** Warna tambahan disimpan sebagai variabel di :root (satu-satunya tempat hex yang lolos audit), lalu dipakai oleh `extraPaletteCss`. */
function extraPaletteVars(spec: BuilderSpec): string {
  const extra = spec.paletteExtra ?? {};
  const vars: Array<[string, string | undefined]> = [["--lux-eyebrow", extra.eyebrow], ["--lux-heading", extra.heading], ["--lux-line", extra.line]];
  return vars.filter(([, v]) => v).map(([name, v]) => `\n      ${name}: ${v};`).join("");
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
      --on-light: ${p.textDark};
      --bg-canvas: var(${dark ? "--bg-dark" : "--bg-light"});
      --card-bg: ${spec.paletteExtra?.card ?? `color-mix(in srgb, var(--bg-canvas) ${dark ? 86 : 78}%, var(--on-dark))`};
      --lux-base-primary: var(--primary);
      --lux-base-card: var(--card-bg);${extraPaletteVars(spec)}
      --overlay: var(--bg-dark);
      --shadow-color: color-mix(in srgb, var(--bg-dark) ${dark ? 40 : 16}%, transparent);
      --canvas-texture: ${texture};
      --font-heading: ${fontFamily(spec.fonts.heading, "heading")};
      --font-body: ${fontFamily(spec.fonts.body, "body")};
      --font-script: ${fontFamily(spec.fonts.script, "script")};
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
    .cover-monogram { margin-left: 0; }
    .cover-names { font-size: 44px; line-height: 1.05; }
    .cover-subtitle { margin-left: 0; }`,
    fullscreen: `
    @media (min-width: 900px) {
      .cover-overlay { width: 100% !important; left: 0 !important; right: 0 !important; }
      .cover-top { max-width: 1100px; }
      .cover-center { max-width: 850px; }
      .cover-bottom { max-width: 520px; }
      .cover-names { font-size: clamp(2.8rem, 4.5vw, 4.8rem); }
    }`,
  },
  opening: {
    card: `
    .opening-center { width: 100%; max-width: 380px; padding: 28px 22px; background: color-mix(in srgb, var(--card-bg) 92%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent); border-radius: var(--radius-lg); box-shadow: var(--shadow-elevated); }`,
    arch: `
    .opening-photo { aspect-ratio: 3 / 4.2; border-radius: 999px 999px var(--radius-md) var(--radius-md); }`,
    circle: `
    .opening-photo { width: min(58%, 220px); aspect-ratio: 1; border-radius: 50%; }`,
    backdrop: `
    .slide-opening { overflow: hidden; }
    .slide-opening > .opening-center { position: static; transform: none !important; filter: none !important; }
    .slide-opening > .opening-center > :not(.opening-photo) { position: relative; z-index: 2; }
    .opening-photo { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; aspect-ratio: auto !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; z-index: 0 !important; pointer-events: none; }
    .opening-photo::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, color-mix(in srgb, var(--overlay) 55%, transparent) 0%, color-mix(in srgb, var(--overlay) 35%, transparent) 45%, color-mix(in srgb, var(--overlay) 80%, transparent) 100%); }
    .slide-opening:has(.opening-photo) .opening-bismillah, .slide-opening:has(.opening-photo) .sec-eyebrow, .slide-opening:has(.opening-photo) .opening-sub-title, .slide-opening:has(.opening-photo) .opening-names, .slide-opening:has(.opening-photo) .opening-names em, .slide-opening:has(.opening-photo) .opening-info, .slide-opening:has(.opening-photo) .scroll-indicator { color: var(--on-dark); text-shadow: 0 2px 12px color-mix(in srgb, var(--overlay) 45%, transparent); }
    .slide-opening:has(.opening-photo) .sec-divider { background: var(--accent); }`,
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
    portrait: `
    .couple-photo-wrap { width: 168px; height: auto; aspect-ratio: 3 / 4; border-radius: var(--radius-md); }
    .couple-photo-wrap img { border-radius: calc(var(--radius-md) - 4px); }`,
    polaroid: `
    .couple-photo-wrap { width: 160px; height: 196px; padding: 8px 8px 30px; border: none; border-radius: var(--radius-sm); background: var(--card-bg); box-shadow: 10px 10px 0 color-mix(in srgb, var(--accent) 45%, transparent), var(--shadow-elevated); }
    .couple-photo-wrap img { border-radius: 2px; }
    .couple-card:first-child .couple-photo-wrap { transform: rotate(-3deg); }
    .couple-card:last-child .couple-photo-wrap { transform: rotate(3deg); }`,
    editorial: `
    .couple-grid { gap: 28px; width: 100%; max-width: 380px; }
    .couple-card { display: grid; grid-template-columns: minmax(96px, 38%) minmax(0, 1fr); column-gap: 16px; row-gap: 4px; align-items: start; text-align: left; width: 100%; padding: 14px; background: color-mix(in srgb, var(--card-bg) 72%, transparent); border-left: 2px solid var(--accent); border-radius: 0 var(--radius-md) var(--radius-md) 0; box-shadow: var(--shadow-subtle); }
    .couple-card ~ .couple-card { grid-template-columns: minmax(0, 1fr) minmax(96px, 38%); text-align: right; border-left: none; border-right: 2px solid var(--accent); border-radius: var(--radius-md) 0 0 var(--radius-md); }
    .couple-photo-wrap { grid-column: 1; grid-row: 1 / span 5; width: 100%; height: auto; aspect-ratio: 3 / 4; margin: 0; padding: 0; border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); border-radius: var(--radius-sm); }
    .couple-card ~ .couple-card .couple-photo-wrap { grid-column: 2; }
    .couple-photo-wrap img { border-radius: calc(var(--radius-sm) - 1px); }
    .couple-card > :not(.couple-photo-wrap) { grid-column: 2; justify-self: start; min-width: 0; }
    .couple-card ~ .couple-card > :not(.couple-photo-wrap) { grid-column: 1; justify-self: end; min-width: 0; }
    .couple-name { font-size: 20px; line-height: 1.15; margin-bottom: 4px; overflow-wrap: anywhere; }
    .couple-parents { font-size: 12px; max-width: none; }`,
    backdrop: `
    #couple { padding-left: 0; padding-right: 0; padding-bottom: 0; }
    #couple > .sec-eyebrow, #couple > .sec-main-title, #couple > .sec-sub { padding-left: 24px; padding-right: 24px; }
    .couple-grid { gap: 0; width: 100%; }
    .couple-amp { display: none; }
    .couple-card { position: relative; overflow: hidden; width: 100%; min-height: 100dvh; padding: 48px 28px 64px; justify-content: flex-end; border-radius: 0; box-shadow: none; background: var(--bg-dark); color: var(--on-dark); }
    .couple-photo-wrap { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; aspect-ratio: auto !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; z-index: 0 !important; pointer-events: none; }
    .couple-photo-wrap img { border-radius: 0 !important; }
    .couple-photo-wrap::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, color-mix(in srgb, var(--overlay) 12%, transparent) 0%, color-mix(in srgb, var(--overlay) 35%, transparent) 48%, color-mix(in srgb, var(--overlay) 86%, transparent) 100%); }
    .couple-card > :not(.couple-photo-wrap) { position: relative; z-index: 2; }
    .couple-role { color: var(--accent); }
    .couple-name, .couple-ig { color: var(--on-dark); text-shadow: 0 2px 10px color-mix(in srgb, var(--overlay) 45%, transparent); }
    .couple-parents, .couple-detail { color: color-mix(in srgb, var(--on-dark) 88%, transparent); }`,
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
  gallery: {
    masonry: `
    #moments .moments-grid-10, #gallery .moments-grid-10 { display: block !important; column-count: 2 !important; column-gap: 8px !important; }
    @media (min-width: 600px) { #moments .moments-grid-10, #gallery .moments-grid-10 { column-count: 3 !important; } }
    #moments .moment-photo-item, #gallery .moment-photo-item { display: inline-block !important; width: 100% !important; margin-bottom: 8px !important; break-inside: avoid !important; aspect-ratio: auto !important; }
    #moments .moment-photo-item img, #gallery .moment-photo-item img { height: auto !important; display: block !important; }
    #moments .moment-photo-item.is-landscape, #gallery .moment-photo-item.is-landscape { grid-column: auto !important; aspect-ratio: auto !important; }`,
    carousel: `
    .moments-carousel-wrap { position: relative !important; width: 100% !important; }
    #moments .moments-grid-10, #gallery .moments-grid-10 { display: flex !important; overflow-x: auto !important; scroll-snap-type: x mandatory !important; -webkit-overflow-scrolling: touch !important; gap: 12px !important; padding: 10px 4px 18px !important; scrollbar-width: thin !important; }
    #moments .moment-photo-item, #gallery .moment-photo-item { flex: 0 0 72% !important; max-width: 320px !important; aspect-ratio: 3 / 4 !important; scroll-snap-align: center !important; border-radius: var(--radius-lg) !important; box-shadow: var(--shadow-elevated) !important; }
    @media (min-width: 600px) { #moments .moment-photo-item, #gallery .moment-photo-item { flex: 0 0 44% !important; } }
    .carousel-nav-btn {
      position: absolute !important; top: 50% !important; transform: translateY(-50%) !important; z-index: 6 !important;
      width: 38px !important; height: 38px !important; border-radius: 50% !important;
      background: color-mix(in srgb, var(--card-bg) 88%, transparent) !important;
      border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent) !important;
      color: var(--primary) !important; display: flex !important; align-items: center !important; justify-content: center !important;
      cursor: pointer !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important;
      box-shadow: var(--shadow-elevated) !important; transition: all 0.2s ease !important;
    }
    .carousel-nav-btn:hover { background: var(--primary) !important; color: var(--on-primary) !important; transform: translateY(-50%) scale(1.08) !important; }
    .carousel-nav-btn svg { width: 18px !important; height: 18px !important; display: block !important; }
    .carousel-nav-prev { left: 4px !important; }
    .carousel-nav-next { right: 4px !important; }
    @media (max-width: 480px) { .carousel-nav-btn { display: none !important; } }`,
    polaroid: `
    #moments .moments-grid-10, #gallery .moments-grid-10 { display: flex !important; flex-wrap: wrap !important; justify-content: center !important; gap: 16px 12px !important; padding: 12px 0 !important; }
    #moments .moment-photo-item, #gallery .moment-photo-item { width: min(160px, 46%) !important; aspect-ratio: 1 / 1.25 !important; padding: 8px 8px 28px !important; background: var(--card-bg) !important; border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent) !important; border-radius: var(--radius-sm) !important; box-shadow: var(--shadow-elevated) !important; transition: transform 0.3s ease !important; }
    #moments .moment-photo-item:nth-child(odd), #gallery .moment-photo-item:nth-child(odd) { transform: rotate(-2.5deg) !important; }
    #moments .moment-photo-item:nth-child(even), #gallery .moment-photo-item:nth-child(even) { transform: rotate(2deg) !important; }
    #moments .moment-photo-item:hover, #gallery .moment-photo-item:hover { transform: scale(1.05) rotate(0deg) !important; z-index: 4 !important; }
    #moments .moment-photo-item img, #gallery .moment-photo-item img { border-radius: 2px !important; height: 100% !important; }`,
  },
  events: {
    timeline: `
    .events-sessions-stack, #events .events-unified-container { position: relative !important; padding-left: 22px !important; border-left: 2px dashed color-mix(in srgb, var(--primary) 40%, transparent) !important; margin-left: 14px !important; }
    .event-block-item, .unified-session { position: relative !important; background: transparent !important; border: none !important; box-shadow: none !important; padding: 14px 0 18px 12px !important; text-align: left !important; }
    .event-block-item::before, .unified-session::before { content: '' !important; position: absolute !important; left: -29px !important; top: 18px !important; width: 12px !important; height: 12px !important; border-radius: 50% !important; background: var(--primary) !important; border: 2px solid var(--bg-light) !important; box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 40%, transparent) !important; }`,
    minimal: `
    .event-block-item, .unified-session, .event-unified-venue-card { background: transparent !important; border: none !important; border-bottom: 1px solid color-mix(in srgb, var(--primary) 25%, transparent) !important; border-radius: 0 !important; box-shadow: none !important; padding: 18px 0 !important; }
    .btn-map-outline { border-radius: var(--radius-sm) !important; }`,
  },
  story: {
    cards: `
    .journey-timeline, #story .journey-timeline { border-left: none !important; padding-left: 0 !important; }
    .story-chapter-block, .journey-chapter-item {
      background: color-mix(in srgb, var(--card-bg) 95%, transparent) !important;
      border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent) !important;
      border-radius: var(--radius-md) !important;
      padding: 22px 18px !important;
      margin-bottom: 16px !important;
      box-shadow: var(--shadow-subtle) !important;
      text-align: left !important;
    }
    .story-chapter-block::before, .journey-chapter-item::before { display: none !important; }`,
    minimal: `
    .journey-timeline, #story .journey-timeline { border-left: none !important; padding-left: 0 !important; }
    .story-chapter-block, .journey-chapter-item {
      background: transparent !important;
      border: none !important;
      border-bottom: 1px solid color-mix(in srgb, var(--primary) 25%, transparent) !important;
      border-radius: 0 !important;
      padding: 18px 0 !important;
      margin-bottom: 10px !important;
      box-shadow: none !important;
    }
    .story-chapter-block::before, .journey-chapter-item::before { display: none !important; }`,
  },
  gift: {
    tabs: `
    .bank-cards-list, .gift-cards-stack { display: flex !important; flex-direction: column !important; gap: 12px !important; }
    .bank-card {
      border-radius: var(--radius-lg) !important;
      box-shadow: var(--shadow-elevated) !important;
      border-color: color-mix(in srgb, var(--primary) 35%, transparent) !important;
    }`,
    minimal: `
    .bank-card {
      background: transparent !important;
      border: none !important;
      border-bottom: 1px solid color-mix(in srgb, var(--primary) 25%, transparent) !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 16px 0 !important;
    }`,
  },
  nav: {
    drawer: `
    body nav.bottom-dock, body nav.bottom-dock.lux-dock-compact { top: 18px !important; bottom: auto !important; right: 16px !important; left: auto !important; transform: none !important; width: auto !important; max-width: calc(100vw - 32px) !important; flex-direction: column !important; align-items: flex-end !important; gap: 4px !important; padding: 0 !important; background: transparent !important; border: none !important; box-shadow: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; counter-reset: lux-nav; }
    body nav.bottom-dock.dock-hidden:not(.drawer-open) { transform: translateY(-16px) !important; opacity: 0 !important; pointer-events: none !important; }
    body #coverScreen.opened ~ nav.bottom-dock, body .cover-overlay.opened ~ nav.bottom-dock, body nav.bottom-dock.drawer-open { opacity: 1 !important; pointer-events: auto !important; transform: none !important; }
    body nav.bottom-dock.drawer-open { align-items: stretch !important; min-width: 196px !important; padding: 10px !important; border-radius: var(--radius-md) !important; background: color-mix(in srgb, var(--card-bg) 95%, transparent) !important; border: 1px solid color-mix(in srgb, var(--primary) 24%, transparent) !important; box-shadow: var(--shadow-elevated) !important; backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important; }
    @media (min-width: 900px) { body nav.bottom-dock { right: 20px !important; left: auto !important; width: auto !important; } }
    .lux-drawer-toggle { display: inline-flex; align-items: center; justify-content: center; gap: 8px; align-self: flex-end; height: 40px; padding: 0 14px; border-radius: var(--radius-full); background: color-mix(in srgb, var(--card-bg) 92%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent); color: var(--text-main); font-family: var(--font-heading); font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; box-shadow: var(--shadow-subtle); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
    .bottom-dock.drawer-open .lux-drawer-toggle { margin-bottom: 4px; background: color-mix(in srgb, var(--primary) 12%, transparent); border-color: color-mix(in srgb, var(--primary) 35%, transparent); color: var(--primary); }
    .bottom-dock:not(.drawer-open) > :not(.lux-drawer-toggle) { display: none !important; }
    body nav.bottom-dock .dock-btn, body nav.bottom-dock .dock-a { display: flex !important; align-items: center !important; flex: 0 0 auto !important; flex-direction: row !important; justify-content: flex-start !important; gap: 8px !important; padding: 6px 10px !important; border-radius: var(--radius-sm) !important; color: var(--text-muted) !important; font-family: var(--font-body) !important; font-size: 9px !important; letter-spacing: 1.6px !important; text-transform: uppercase !important; text-decoration: none !important; counter-increment: lux-nav; }
    body nav.bottom-dock .dock-btn svg, body nav.bottom-dock .dock-a svg { display: none !important; }
    body nav.bottom-dock .dock-btn::before, body nav.bottom-dock .dock-a::before { content: "0" counter(lux-nav); font-family: var(--font-heading); font-size: 9px; font-weight: 600; color: var(--accent); opacity: 0.85; }
    body nav.bottom-dock .dock-btn.active::after, body nav.bottom-dock .dock-a.active::after { display: none !important; }`,
    none: `
    .bottom-dock { display: none !important; }`,
  },
  guestCard: {
    pill: `
    .cover-guest-card { border-radius: var(--radius-full); padding: 10px 28px; background: color-mix(in srgb, var(--on-dark) 16%, transparent); border: 1px solid color-mix(in srgb, var(--on-dark) 42%, transparent); box-shadow: 0 8px 24px color-mix(in srgb, var(--overlay) 28%, transparent); }
    .cover-guest-label { font-size: 9px; letter-spacing: 2px; margin-bottom: 2px; }
    .cover-guest-name { font-size: 16px; }`,
    underline: `
    .cover-guest-card { background: transparent; border: none; border-bottom: 1px solid color-mix(in srgb, var(--accent) 80%, transparent); border-radius: 0; backdrop-filter: none; -webkit-backdrop-filter: none; padding: 6px 12px 10px; box-shadow: none; }
    .cover-guest-label { color: color-mix(in srgb, var(--on-dark) 75%, transparent); }`,
    hidden: `
    .cover-guest-card { display: none !important; }`,
  },
  coverDate: {
    split: `
    .cover-date { display: inline-flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 18px; border-top: 1px solid color-mix(in srgb, var(--accent) 65%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--accent) 65%, transparent); font-family: var(--font-heading); font-size: 12px; letter-spacing: 4px; color: var(--on-dark); }
    .cover-date::before, .cover-date::after { content: '✦'; font-size: 8px; color: var(--accent); opacity: 0.85; }
    .cover-date-split { display: inline-flex; align-items: baseline; gap: 8px; }
    .cover-date-split:empty { display: none; }
    .cover-date-split:not(:empty) + .cover-date-full { display: none; }
    .cover-date-dd, .cover-date-mm { font-size: 18px; font-weight: 600; letter-spacing: 2px; color: var(--on-dark); }
    .cover-date-yy { font-size: 12px; letter-spacing: 3px; opacity: 0.9; }
    .cover-date-sep { color: var(--accent); font-size: 11px; letter-spacing: 0; opacity: 0.85; }`,
  },
  dividers: {
    none: `
    .sec-divider, .sec-main-title::after { display: none !important; }`,
    ornate: `
    .sec-divider { width: 88px; height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); position: relative; overflow: visible; }
    .sec-divider::after { content: '❖'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--accent); font-size: 10px; line-height: 1; padding: 0 6px; background: var(--bg-canvas); }`,
    gradient: `
    .sec-divider { width: 96px; height: 2px; border-radius: var(--radius-full); background: linear-gradient(90deg, transparent, var(--primary), var(--accent), transparent); opacity: 0.9; }`,
  },
  buttons: {
    outline: `
    .cover-btn-open { background: transparent !important; color: var(--on-dark) !important; border: 1.5px solid color-mix(in srgb, var(--on-dark) 80%, transparent) !important; box-shadow: none !important; }
    .cover-btn-open:hover { background: var(--on-dark) !important; color: var(--bg-dark) !important; }
    .btn-cal, .btn-submit-rsvp, .btn-map-outline, .btn-outline-box, .btn-copy { background: transparent !important; color: var(--primary) !important; border: 1.5px solid var(--primary) !important; box-shadow: none !important; }
    .btn-cal:hover, .btn-submit-rsvp:hover, .btn-map-outline:hover, .btn-outline-box:hover, .btn-copy:hover { background: var(--primary) !important; color: var(--on-primary) !important; }`,
    glass: `
    .cover-btn-open { background: color-mix(in srgb, var(--on-dark) 18%, transparent) !important; color: var(--on-dark) !important; border: 1px solid color-mix(in srgb, var(--on-dark) 45%, transparent) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; box-shadow: 0 8px 24px color-mix(in srgb, var(--overlay) 28%, transparent) !important; }
    .btn-cal, .btn-submit-rsvp, .btn-map-outline, .btn-outline-box, .btn-copy { background: color-mix(in srgb, var(--primary) 16%, transparent) !important; color: var(--primary) !important; border: 1px solid color-mix(in srgb, var(--primary) 38%, transparent) !important; backdrop-filter: blur(10px) !important; -webkit-backdrop-filter: blur(10px) !important; box-shadow: var(--shadow-subtle) !important; }
    .btn-cal:hover, .btn-submit-rsvp:hover, .btn-map-outline:hover, .btn-outline-box:hover, .btn-copy:hover { background: var(--primary) !important; color: var(--on-primary) !important; }`,
    minimal: `
    .cover-btn-open { background: transparent !important; color: var(--on-dark) !important; border: none !important; border-bottom: 1.5px solid var(--accent) !important; border-radius: 0 !important; padding: 10px 6px !important; box-shadow: none !important; letter-spacing: 0.2em !important; }
    .btn-cal, .btn-submit-rsvp, .btn-map-outline, .btn-outline-box, .btn-copy { background: transparent !important; color: var(--primary) !important; border: none !important; border-bottom: 1.5px solid var(--primary) !important; border-radius: 0 !important; padding-left: 4px !important; padding-right: 4px !important; box-shadow: none !important; letter-spacing: 0.16em !important; }
    .btn-submit-rsvp { width: auto !important; display: inline-flex !important; margin: 8px auto 0 !important; padding: 10px 18px !important; }`,
  },
  cards: {
    glass: `
    .opening-quote-card, .rsvp-form-box, .wish-item, .event-block-item, .event-unified-venue-card, .bank-card, .story-chapter-block { background: color-mix(in srgb, var(--card-bg) 55%, transparent) !important; border: 1px solid color-mix(in srgb, var(--primary) 26%, transparent) !important; backdrop-filter: blur(14px) !important; -webkit-backdrop-filter: blur(14px) !important; box-shadow: var(--shadow-subtle) !important; }`,
    outlined: `
    .opening-quote-card, .rsvp-form-box, .wish-item, .event-block-item, .event-unified-venue-card, .bank-card, .story-chapter-block { background: transparent !important; border: 1.5px solid color-mix(in srgb, var(--primary) 42%, transparent) !important; box-shadow: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }`,
    flat: `
    .opening-quote-card, .rsvp-form-box, .wish-item, .event-block-item, .event-unified-venue-card, .bank-card, .story-chapter-block { background: transparent !important; border: none !important; border-bottom: 1px solid color-mix(in srgb, var(--primary) 22%, transparent) !important; border-radius: 0 !important; box-shadow: none !important; padding-left: 0 !important; padding-right: 0 !important; }`,
  },
  spacing: {
    compact: `
    .sec-flow { padding-top: 36px !important; padding-bottom: 36px !important; }
    @media (min-width: 900px) { .sec-flow { padding-top: 2.75rem !important; padding-bottom: 2.75rem !important; } }
    .sec-sub { margin-bottom: 16px !important; }
    .sec-divider { margin: 12px auto !important; }`,
    airy: `
    .sec-flow { padding-top: 84px !important; padding-bottom: 84px !important; }
    @media (min-width: 900px) { .sec-flow { padding-top: 6rem !important; padding-bottom: 6rem !important; } }
    .sec-sub { margin-bottom: 34px !important; }
    .sec-divider { margin: 28px auto !important; }`,
  },
};

const EAGER_SECTIONS = new Set(["cover", "sidebar", "opening"]);

const ORNAMENT_SLOT_TOKEN: Record<BuilderFamily, Record<OrnamentMediaSlot, { token: string; cond?: string }>> = {
  wedding: {
    HOME_PHOTO: { token: "homePhotoUrl", cond: "hasCustomHomePhoto" },
    GROOM_PHOTO: { token: "firstPhotoUrl" },
    BRIDE_PHOTO: { token: "secondPhotoUrl" },
    LANDING_COVER: { token: "landingCoverUrl" },
    CLOSING_COVER: { token: "closingPhotoUrl", cond: "closingPhotoUrl" },
  },
  single: {
    HOME_PHOTO: { token: "homePhotoUrl", cond: "hasCustomHomePhoto" },
    GROOM_PHOTO: { token: "mainPhotoUrl", cond: "mainPhotoUrl" },
    BRIDE_PHOTO: { token: "mainPhotoUrl", cond: "mainPhotoUrl" },
    LANDING_COVER: { token: "landingCoverUrl" },
    CLOSING_COVER: { token: "closingPhotoUrl", cond: "closingPhotoUrl" },
  },
};

const ORNAMENT_TEXT_TOKEN_MARKUP: Record<BuilderFamily, Record<OrnamentTextToken, string>> = {
  wedding: {
    MONOGRAM_AMP: "{{coupleMonogram}}",
    MONOGRAM_JOINED: "{{firstInitial}}{{secondInitial}}",
    FIRST_INITIAL: "{{firstInitial}}",
    SECOND_INITIAL: "{{secondInitial}}",
    COUPLE_NAMES: "{{firstName}} &amp; {{secondName}}",
    EVENT_DATE: "{{weddingDate}}",
  },
  single: {
    MONOGRAM_AMP: "{{coupleMonogram}}",
    MONOGRAM_JOINED: "{{firstInitial}}",
    FIRST_INITIAL: "{{firstInitial}}",
    SECOND_INITIAL: "{{firstInitial}}",
    COUPLE_NAMES: "{{mainNickname}}",
    EVENT_DATE: "{{eventDateFormatted}}",
  },
};

/**
 * Ornamen yang menempel ke blok berupa `span` (bukan `div`): `<p>` menutup dirinya sendiri begitu bertemu `div`, sedangkan
 * `span` absolut tetap sah di dalam `p`, judul, dan tautan. Teks hias di-escape di sini; `{{ }}` dan kurung sudut sudah
 * ditolak oleh `parseBuilderSpec`, kecuali token dinamis dari daftar `ORNAMENT_TEXT_TOKEN_MARKUP`.
 */
function ornamentHtml(o: BuilderOrnament, family: BuilderFamily = "wedding", blockHidden = false): string {
  const tag = o.attach ? "span" : "div";
  // Ornamen sebaris adalah elemen alur: kelas `lux-orn` (absolut, tembus klik) tidak dipakai, dan gambarnya diberi gaya sendiri.
  // Ia disembunyikan bersama bloknya (`lux-flow-off`), karena berada di luar elemen blok dan tidak ikut `display:none` blok.
  const loopClass = o.loop && o.loop !== "none" ? `lux-loop-${o.loop}` : "";
  const classes = (o.before ? ["lux-flow", blockHidden && "lux-flow-off"] : ["lux-orn", o.layer === "front" && "is-front", o.attach && "is-attached"]).concat(o.text ? ["lux-orn-text"] : []).concat(loopClass ? [loopClass] : []).filter(Boolean).join(" ");
  const beforeAttr = o.before ? ` data-orn-before="${o.before}"` : "";
  const loading = EAGER_SECTIONS.has(o.section) ? "eager" : "lazy";
  const imgStyle = o.before ? ` style="display:block;width:100%;height:auto;"` : "";
  let inner: string;
  if (o.text) {
    inner = o.text.token ? ORNAMENT_TEXT_TOKEN_MARKUP[family][o.text.token] : escapeText(o.text.value);
  } else if (o.slot) {
    const win = o.fit ?? { l: 0.12, t: 0.12, r: 0.88, b: 0.88 };
    const pct = (v: number) => Math.round(v * 1000) / 1000;
    const slotInfo = ORNAMENT_SLOT_TOKEN[family][o.slot];
    const clipStyle = "clip" in win && win.clip ? `clip-path:${win.clip};-webkit-clip-path:${win.clip};` : "";
    const photoStyle = `position:absolute;left:${pct(win.l * 100)}%;top:${pct(win.t * 100)}%;width:${pct((win.r - win.l) * 100)}%;height:${pct((win.b - win.t) * 100)}%;object-fit:cover;z-index:0;${clipStyle}`;
    const photoImg = `<img class="lux-orn-photo" src="{{${slotInfo.token}}}" alt="" loading="${loading}" decoding="async" draggable="false" style="${photoStyle}" />`;
    const wrappedPhoto = slotInfo.cond ? `{{#if ${slotInfo.cond}}}${photoImg}{{/if}}` : photoImg;
    const frameStyle = o.before ? ' style="position:relative;z-index:1;display:block;width:100%;height:auto;"' : imgStyle;
    const frameImg = `<img class="lux-orn-frame" src="${o.src}" alt="" loading="${loading}" decoding="async" draggable="false"${frameStyle} />`;
    inner = `${wrappedPhoto}${frameImg}`;
  } else {
    inner = `<img src="${o.src}" alt="" loading="${loading}" decoding="async" draggable="false"${imgStyle} />`;
  }
  // Teks hias yang boleh diubah klien menjadi label biasa: kunci sudah dibatasi ke EDITABLE_TEXT_KEYS oleh parseBuilderSpec.
  // `aria-hidden` dibuang karena label klien adalah isi undangan yang harus terbaca pembaca layar.
  const editable = o.text?.labelKey ? ` data-lux-field="customLabels.${o.text.labelKey}"` : "";
  return `<${tag} class="${classes}" data-orn-id="${o.id}"${beforeAttr}${editable} style="${ornamentStyle(o)}"${editable ? "" : ' aria-hidden="true"'}>${inner}</${tag}>`;
}

const ATTACH_OVERFLOW_BLOCKS: readonly BuilderBlockId[] = ["opening-photo", "couple-photo-1", "couple-photo-2"];

/**
 * Blok yang punya ornamen menempel menjadi acuan posisi (`relative`) dan lapisan sendiri (`isolation`), sehingga ornamen
 * belakang (z-index -1) berada di bawah isi blok tetapi di atas latarnya, dan ornamen depan di atas isi. Foto memotong
 * isinya lewat `overflow:hidden` di pembungkus; ornamen yang keluar dari tepi foto butuh pembungkus terbuka, jadi
 * pemotongan sudut dipindah ke gambar.
 */
function attachCss(ornaments: BuilderOrnament[]): string {
  const blocks = [...new Set(ornaments.flatMap((o) => (o.attach ? [o.attach] : [])))];
  if (!blocks.length) return "";
  const sel = (ids: readonly string[], suffix = "") => ids.map((id) => `[data-lux-block="${id}"]${suffix}`).join(",");
  const photos = blocks.filter((id) => ATTACH_OVERFLOW_BLOCKS.includes(id));
  return [
    ".lux-orn.is-attached{z-index:-1;}",
    ".lux-orn.is-attached.is-front{z-index:3;}",
    `${sel(blocks)}{position:relative;isolation:isolate;}`,
    photos.length ? `${sel(photos)}{overflow:visible;}\n    ${sel(photos, " > img")}{border-radius:inherit;}` : "",
  ].filter(Boolean).join("\n    ");
}

const openingTagOf = (block: string) => new RegExp(`<[a-zA-Z0-9]+\\b[^>]*\\bdata-lux-block="${block}"[^>]*>`);

const SECTION_CHUNK_PATTERNS: Record<OrderableSection, RegExp> = {
  opening: /<section\b[^>]*\bdata-lux-section="opening"[^>]*>[\s\S]*?<\/section>/,
  couple: /<section\b[^>]*\bdata-lux-section="couple"[^>]*>[\s\S]*?<\/section>/,
  countdown: /<section\b[^>]*\bdata-lux-section="countdown"[^>]*>[\s\S]*?<\/section>/,
  events: /<section\b[^>]*\bdata-lux-section="events"[^>]*>[\s\S]*?<\/section>/,
  story: /\{\{#if showStory\}\}\s*<section\b[^>]*\bdata-lux-section="story"[^>]*>[\s\S]*?<\/section>\s*\{\{\/if\}\}/,
  gallery: /(?:<section\b[^>]*\bdata-lux-section="gallery"[^>]*>[\s\S]*?<\/section>|\{\{gallerySectionHtml\}\})/,
  rsvp: /<section\b[^>]*\bdata-lux-section="rsvp"[^>]*>[\s\S]*?<\/section>/,
  closing: /<footer\b[^>]*\bdata-lux-section="closing"[^>]*>[\s\S]*?<\/footer>/,
};

const DOCK_HREF_SECTION: Partial<Record<string, OrderableSection>> = {
  "#home": "opening",
  "#couple": "couple",
  "#events": "events",
  "#story": "story",
  "#moments": "gallery",
  "#gallery": "gallery",
  "#rsvp": "rsvp",
};

/** Foto slot klien memakai token engine yang sama dengan ornamen berslot, dibungkus syarat bila slotnya boleh kosong. */
function freePhotoHtml(photo: FreeSectionPhoto, family: BuilderFamily): string {
  const cls = `lux-free-photo is-${photo.shape}${photo.position === "bottom" ? " is-bottom" : ""}`;
  if (photo.source === "asset") return `<figure class="${cls}" data-lux-anim="2"><img src="${photo.src}" alt="" loading="lazy" decoding="async" /></figure>`;
  const info = ORNAMENT_SLOT_TOKEN[family][photo.slot];
  const figure = `<figure class="${cls}" data-lux-anim="2"><img src="{{${info.token}}}" alt="" loading="lazy" decoding="async" /></figure>`;
  return info.cond ? `{{#if ${info.cond}}}${figure}{{/if}}` : figure;
}

function freeSectionHtml(f: FreeSection, family: BuilderFamily): string {
  const keys = freeSectionLabelKeys(f.id);
  const photo = f.photo ? freePhotoHtml(f.photo, family) : "";
  const cards = f.cards?.length
    ? `
        <div class="lux-free-cards" data-lux-anim="3">${f.cards.map((c, i) => {
          const k = freeCardLabelKeys(f.id, i + 1);
          return `
          <div class="lux-free-card"><h3 class="lux-free-card-title serif" data-lux-field="customLabels.${k.title}">${escapeText(c.title)}</h3><p class="lux-free-card-body" data-lux-field="customLabels.${k.body}">${escapeText(c.body)}</p></div>`;
        }).join("")}
        </div>`
    : "";
  const extra = freeExtraLabelKeys(f.id);
  const quote = f.quote
    ? `
        <blockquote class="lux-free-quote" data-lux-anim="2"><p class="lux-free-quote-text" data-lux-field="customLabels.${extra.quote}">${escapeText(f.quote.text)}</p><cite class="lux-free-quote-source" data-lux-field="customLabels.${extra.quoteSource}">${escapeText(f.quote.source)}</cite></blockquote>`
    : "";
  // Tiap foto bersyarat sendiri (engine tidak mendukung {{#if}} bersarang); wadah tanpa foto disembunyikan lewat CSS.
  const gallery = f.gallery
    ? `
        <div class="lux-free-gallery is-${f.gallery.count}" data-lux-anim="3">${Array.from({ length: f.gallery.count }, (_, i) => `{{#if luxGalleryPhoto${i + 1}}}<img src="{{luxGalleryPhoto${i + 1}}}" alt="" loading="lazy" decoding="async" />{{/if}}`).join("")}</div>`
    : "";
  const map = f.mapButton
    ? `
        {{#if luxPrimaryMapUrl}}<a class="btn-map-outline lux-free-map" href="{{luxPrimaryMapUrl}}" target="_blank" rel="noopener noreferrer" data-lux-field="customLabels.${extra.mapBtn}" data-lux-anim="3">${escapeText(f.mapButton.label)}</a>{{/if}}`
    : "";
  return `
      <section class="sec-flow lux-free-sec lux-free-${f.align}" id="${f.id}" data-lux-section="free">
        ${f.photo?.position === "top" ? photo : ""}
        <span class="sec-eyebrow" data-lux-field="customLabels.${keys.eyebrow}" data-lux-anim="1">${escapeText(f.eyebrow)}</span>
        <h2 class="sec-main-title serif" data-lux-field="customLabels.${keys.title}" data-lux-anim="1">${escapeText(f.title)}</h2>
        <div class="sec-divider" data-lux-anim="1"></div>
        <p class="sec-sub lux-free-body" data-lux-field="customLabels.${keys.body}" data-lux-anim="2">${escapeText(f.body)}</p>${quote}${cards}${gallery}${map}
        ${f.photo?.position === "bottom" ? photo : ""}
      </section>`;
}

/**
 * Hitung mundur dipindah (bukan digandakan) ke dalam seksi lain: id dan penanda `countdownTimer` harus tetap tunggal
 * karena skrip hitung mundur mencarinya dengan id. Seksi tetap berupa `<section data-lux-section="countdown">` di dalam
 * seksi tuannya, jadi ornamen, gaya, dan blok hitung mundur tetap berlaku.
 */
function nestCountdown(html: string, placement: CountdownPlacement): string {
  if (placement === "section") return html;
  const match = html.match(SECTION_CHUNK_PATTERNS.countdown);
  if (!match) throw new Error("Seksi hitung mundur tidak ada di blueprint.");
  const chunk = match[0].replace(/^<section class="sec-flow"/, '<section class="sec-flow lux-nested-countdown"');
  const without = html.replace(SECTION_CHUNK_PATTERNS.countdown, "");
  const anchor = placement === "events" ? /<div data-lux-block="events-list"/ : /<div class="home-schedule"/;
  if (!anchor.test(without)) throw new Error(`Tempat hitung mundur (${placement}) tidak ada di blueprint.`);
  return without.replace(anchor, (tag) => `${chunk}\n        ${tag}`);
}

/**
 * Rentang satu seksi alur di HTML dengan pasangan tag yang seimbang. Pola regex `[\s\S]*?</section>` berhenti di
 * `</section>` pertama, jadi salah untuk seksi yang sudah ditumpangi seksi lain (mis. Acara berisi hitung mundur).
 */
function sectionRange(html: string, sec: OrderableSection): { start: number; end: number } | null {
  if (sec === "gallery") {
    const m = html.match(SECTION_CHUNK_PATTERNS.gallery);
    return m && m.index !== undefined ? { start: m.index, end: m.index + m[0].length } : null;
  }
  if (sec === "closing") {
    const start = html.search(/<footer\b[^>]*\bdata-lux-section="closing"/);
    if (start === -1) return null;
    const close = html.indexOf("</footer>", start);
    return close === -1 ? null : { start, end: close + "</footer>".length };
  }
  const open = new RegExp(`<section\\b[^>]*\\bdata-lux-section="${sec}"`).exec(html);
  if (!open) return null;
  const tags = /<section\b|<\/section>/g;
  tags.lastIndex = open.index;
  let depth = 0;
  let end = -1;
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    depth += m[0] === "</section>" ? -1 : 1;
    if (depth === 0) { end = m.index + m[0].length; break; }
  }
  if (end === -1) return null;
  let start = open.index;
  // Kisah dibungkus syarat engine; pembungkusnya ikut dipindah agar {{#if}} dan {{/if}} tetap berpasangan.
  if (sec === "story") {
    const before = html.slice(0, start).match(/\{\{#if showStory\}\}\s*$/);
    const after = html.slice(end).match(/^\s*\{\{\/if\}\}/);
    if (before && after) { start -= before[0].length; end += after[0].length; }
  }
  return { start, end };
}

/**
 * Seksi tamu dipindah ke akhir isi seksi tuannya (sebelum tag penutup tuan), diberi kelas `lux-nested-sec`. Id, penanda
 * seksi, dan tautan navigasinya tetap, jadi menu dock tetap menggulir ke seksi itu di dalam tuannya.
 */
function nestSections(html: string, nesting: NonNullable<BuilderSpec["sectionNesting"]>): string {
  let out = html;
  for (const [guest, host] of Object.entries(nesting) as Array<[NestableGuest, NestingHost]>) {
    const g = sectionRange(out, guest);
    if (!g) throw new Error(`Seksi ${guest} untuk ditumpangkan tidak ada di blueprint.`);
    const chunk = out.slice(g.start, g.end).replace(/<section class="(sec-flow|sec-block)/, '<section class="$1 lux-nested-sec');
    out = out.slice(0, g.start) + out.slice(g.end);
    const h = sectionRange(out, host);
    if (!h) throw new Error(`Seksi ${host} untuk ditumpangi tidak ada di blueprint.`);
    const closeTag = host === "closing" ? "</footer>" : "</section>";
    const insertAt = out.lastIndexOf(closeTag, h.end);
    out = `${out.slice(0, insertAt)}${chunk}\n      ${out.slice(insertAt)}`;
  }
  return out;
}

/** Seksi bebas disisipkan sesudah seksi tuannya (setelah pengurutan ulang); beberapa seksi dengan tuan sama tetap urut. */
function insertFreeSections(html: string, sections: FreeSection[], family: BuilderFamily): string {
  const byHost = new Map<OrderableSection, FreeSection[]>();
  for (const f of sections) byHost.set(f.after, [...(byHost.get(f.after) ?? []), f]);
  let out = html;
  for (const [host, items] of byHost) {
    const range = sectionRange(out, host);
    if (!range) throw new Error(`Seksi ${host} untuk seksi teks bebas tidak ada di blueprint.`);
    out = `${out.slice(0, range.end)}${items.map((f) => freeSectionHtml(f, family)).join("")}${out.slice(range.end)}`;
  }
  return out;
}

/** Mengurutkan ulang seksi utama di `<main>` dan tautan `<nav class="bottom-dock">` sesuai `spec.sectionOrder`. */
function reorderSections(html: string, spec: BuilderSpec): string {
  if (!spec.sectionOrder || isDefaultSectionOrder(spec.sectionOrder, spec.eventType)) return html;
  const defaults = familyOrderableSections(spec.eventType);
  const desired = spec.sectionOrder.filter((id): id is OrderableSection => defaults.includes(id));
  for (const id of defaults) if (!desired.includes(id)) desired.push(id);

  const chunks = new Map<OrderableSection, string>();
  let out = html;
  defaults.forEach((sec, idx) => {
    const match = out.match(SECTION_CHUNK_PATTERNS[sec]);
    if (match) {
      chunks.set(sec, match[0]);
      out = out.replace(SECTION_CHUNK_PATTERNS[sec], `<!-- __LUX_SEC_SLOT_${idx}__ -->`);
    }
  });
  if (chunks.size === defaults.length) {
    desired.forEach((sec, idx) => {
      const chunk = chunks.get(sec);
      if (chunk) out = out.replace(`<!-- __LUX_SEC_SLOT_${idx}__ -->`, () => chunk);
    });
  } else {
    out = html;
  }

  out = out.replace(/<nav class="bottom-dock[^"]*">([\s\S]*?)<\/nav>/, (full, inner: string) => {
    const linkRe = /<a\s+href="(#[a-z]+)"[^>]*>[\s\S]*?<\/a>/g;
    const links: Array<{ sec: OrderableSection; markup: string }> = [];
    let slotIdx = 0;
    const templated = inner.replace(linkRe, (m, href: string) => {
      const sec = DOCK_HREF_SECTION[href];
      if (!sec) return m;
      links.push({ sec, markup: m });
      return `<!-- __LUX_DOCK_${slotIdx++}__ -->`;
    });
    if (links.length < 2) return full;
    const sorted = [...links].sort((a, b) => desired.indexOf(a.sec) - desired.indexOf(b.sec));
    let rebuilt = templated;
    sorted.forEach((item, idx) => {
      rebuilt = rebuilt.replace(`<!-- __LUX_DOCK_${idx}__ -->`, () => item.markup);
    });
    return full.replace(inner, rebuilt);
  });

  return out;
}

/** Memasang ornamen sebaris sebagai saudara tepat sebelum elemen blok, sehingga berlaku juga untuk blok berlabel. */
function insertBeforeBlocks(html: string, ornaments: BuilderOrnament[], blocks: BuilderSpec["blocks"], family: BuilderFamily): string {
  const byBlock = new Map<string, BuilderOrnament[]>();
  for (const o of ornaments) if (o.before) byBlock.set(o.before, [...(byBlock.get(o.before) ?? []), o]);
  let out = html;
  for (const [block, items] of byBlock) {
    const opening = openingTagOf(block);
    if (!opening.test(out)) throw new Error(`Penanda blok ${block} tidak ada di blueprint.`);
    const hidden = Boolean(blocks[block as BuilderBlockId]?.hidden);
    const markup = items.map((o) => ornamentHtml(o, family, hidden)).join("");
    out = out.replace(opening, (tag) => `${markup}${tag}`);
  }
  return out;
}

/** Memasang ornamen sebagai anak pertama elemen blok. Blok yang hilang dari blueprint adalah galat, bukan ornamen yang diam-diam hilang. */
function attachToBlocks(html: string, ornaments: BuilderOrnament[], family: BuilderFamily): string {
  const byBlock = new Map<string, BuilderOrnament[]>();
  for (const o of ornaments) if (o.attach) byBlock.set(o.attach, [...(byBlock.get(o.attach) ?? []), o]);
  let out = html;
  for (const [block, items] of byBlock) {
    const opening = openingTagOf(block);
    if (!opening.test(out)) throw new Error(`Penanda blok ${block} tidak ada di blueprint.`);
    const markup = items.map((o) => ornamentHtml(o, family)).join("");
    out = out.replace(opening, (tag) => `${tag}${markup}`);
  }
  return out;
}

/**
 * Master tema dari spesifikasi builder. Spesifikasi wajib lolos `parseBuilderSpec` terlebih dahulu: nilai warna, huruf,
 * dan URL ornamen disisipkan tanpa escape karena sudah dibatasi ke hex, katalog, dan pola path yang aman.
 */
export function compileBuilderMaster(spec: BuilderSpec, blueprint = readBuilderBlueprint(spec.eventType)): string {
  if (!/:root\s*\{[^}]*\}/.test(blueprint)) throw new Error("Blueprint tidak memiliki blok :root.");
  let html = blueprint.replace(/:root\s*\{[^}]*\}/, rootBlock(spec));

  const animation = animationPlan(spec);
  html = html.replace(/<html lang="id"[^>]*>/, `<html lang="id" data-lux-anim-preset="${animation.htmlPreset}">`);

  // Id font Google sudah dibatasi pola "g:<huruf, angka, spasi>" oleh parseBuilderSpec, jadi URL berkasnya aman disisipkan.
  const googleLinks = googleFontIds(spec.fonts, spec.blocks)
    .map((id) => `  <link rel="stylesheet" href="${googleFontCssUrl(id)}" />`)
    .join("\n");
  if (googleLinks) html = html.replace(/(<link rel="stylesheet" href="\/fonts\/fonts\.css" \/>)/, `$1\n${googleLinks}`);

  const textureOpacityCss =
    spec.textureOpacity !== undefined && spec.textureOpacity < 100
      ? `\n    .fixed-bg-layer:not(.has-custom-bg) { opacity: ${Math.round(spec.textureOpacity) / 100}; }`
      : "";
  const scrimOpacityCss = (() => {
    if (spec.scrimOpacity === undefined || spec.scrimOpacity === 55) return "";
    const s = Math.max(10, Math.min(90, Math.round(spec.scrimOpacity)));
    const topPct = Math.max(5, Math.round(s * 0.6));
    const botPct = Math.min(96, Math.round(s * 1.25));
    const closeTop = Math.max(5, Math.round(s * 0.3));
    const closeBot = Math.min(98, Math.round(s * 1.35));
    return `\n    .cover-overlay { background-image: linear-gradient(180deg, color-mix(in srgb, var(--overlay) ${topPct}%, transparent) 0%, color-mix(in srgb, var(--overlay) ${botPct}%, transparent) 100%), url('{{landingCoverUrl}}') !important; }
    @media (min-width: 900px) { .cover-overlay { background-image: linear-gradient(180deg, color-mix(in srgb, var(--overlay) ${topPct}%, transparent) 0%, color-mix(in srgb, var(--overlay) ${botPct}%, transparent) 100%), url('{{landingCoverDesktopUrl}}') !important; } }
    .sidebar-desktop::after { background: linear-gradient(to top, color-mix(in srgb, var(--overlay) ${botPct}%, transparent) 0%, color-mix(in srgb, var(--overlay) ${topPct}%, transparent) 50%, transparent 100%) !important; }
    .closing-sec.has-closing-photo::before { background: linear-gradient(to bottom, color-mix(in srgb, var(--overlay) ${closeTop}%, transparent) 0%, color-mix(in srgb, var(--overlay) ${s}%, transparent) 45%, color-mix(in srgb, var(--overlay) ${closeBot}%, transparent) 100%) !important; }`;
  })();
  const variantCss = [
    ...(Object.keys(VARIANT_CSS) as Array<keyof BuilderVariants>).map((key) => VARIANT_CSS[key][spec.variants[key]]),
    textureOpacityCss,
    scrimOpacityCss,
  ]
    .filter(Boolean)
    .join("\n");
  if (variantCss) {
    html = html.replace("</head>", `  <style id="lux-builder-variants">${variantCss}\n  </style>\n</head>`);
  }

  const family = builderFamilyOf(spec.eventType);
  // Bila ornamen bingkai di seksi yang sama sudah mengisi slot foto pembuka, sembunyikan kotak foto pembuka bawaan
  // agar foto tidak tampil ganda (kecuali admin sudah mengatur blok opening-photo secara eksplisit).
  const autoHideHomePhoto = spec.ornaments.some((o) => o.section === "opening" && o.slot === "HOME_PHOTO") && !spec.blocks["opening-photo"];
  const blockEntries = Object.entries(spec.blocks) as Array<[BuilderBlockId, BlockProps]>;
  const blockRules = [
    ...blockEntries.map(([id, props]) => {
      const isPhoto = (FRAMED_PHOTOS as readonly string[]).includes(id);
      if (isPhoto && props.filter && props.filter !== "none" && PHOTO_FILTER_CSS[props.filter]) {
        return `[data-lux-block="${id}"]{${blockStyle({ ...props, filter: undefined })}}\n    [data-lux-block="${id}"] img{filter:${PHOTO_FILTER_CSS[props.filter]};}`;
      }
      return `[data-lux-block="${id}"]{${blockStyle(props)}}`;
    }),
    ...(autoHideHomePhoto ? ['[data-lux-block="opening-photo"]{display:none;}'] : []),
  ].join("\n    ");
  if (blockRules) {
    html = html.replace("</head>", `  <style id="lux-builder-blocks">\n    ${blockRules}\n  </style>\n</head>`);
  }

  // Jadwal acara dipindahkan (bukan digandakan) ke Home: token hanya boleh muncul sekali karena HTML-nya membawa
  // target sunting Studio. Seksi Acara tetap ada di DOM (penanda seksi dan ornamennya) tetapi disembunyikan.
  if (spec.eventsPlacement === "home") {
    const eventsToken = EVENTS_TOKEN[family];
    html = html.replace(eventsToken, "").replace("<!-- lux-home-schedule -->", eventsToken);
    html = html.replace("</head>", `  <style id="lux-builder-events">\n    .home-schedule { display: block; }\n    #events { display: none; }\n    a[href="#events"] { display: none !important; }\n  </style>\n</head>`);
  }

  // Mode sunting Studio memberi semua `[data-lux-field]` `position: relative`, yang menimpa `.lux-orn` (absolut) dan
  // menggeser teks hias hanya di Studio. Selektor ini lebih spesifik, dan teks hias hanya menerima klik saat disunting.
  if (spec.ornaments.some((o) => o.text?.labelKey)) {
    html = html.replace("</head>", `  <style id="lux-builder-editable">\n    .lux-orn.lux-orn-text[data-lux-field] { position: absolute; }\n    .lux-orn.lux-orn-text[data-lux-field][contenteditable="true"] { pointer-events: auto; min-height: 1.25em; }\n  </style>\n</head>`);
  }

  const attachRules = attachCss(spec.ornaments);
  if (attachRules) {
    html = html.replace("</head>", `  <style id="lux-builder-attach">\n    ${attachRules}\n  </style>\n</head>`);
  }

  // Bentuk dan nilai bingkai sudah dijepit ke daftar tetap oleh parseBuilderSpec.
  const frameRules = frameCss(spec.frames);
  if (frameRules) {
    html = html.replace("</head>", `  <style id="lux-builder-frames">\n    ${frameRules}\n  </style>\n</head>`);
  }

  const loopRules = loopCss(spec.blocks, spec.ornaments);
  if (loopRules) {
    html = html.replace("</head>", `  <style id="lux-builder-loops">\n    ${loopRules}\n  </style>\n</head>`);
  }

  // Selalu dipasang (boleh kosong): pratinjau builder menulis ulang isinya langsung saat alat desain diubah.
  const designRules = designCss(spec);
  html = html.replace("</head>", () => `  <style id="lux-builder-design">\n    ${designRules}\n  </style>\n</head>`);

  html = reorderSections(html, spec);
  html = nestCountdown(html, spec.countdownPlacement ?? "section");
  if (spec.sectionNesting && Object.keys(spec.sectionNesting).length) html = nestSections(html, spec.sectionNesting);
  if (spec.freeSections?.length) html = insertFreeSections(html, spec.freeSections, family);

  // CSS kustom dipasang paling akhir agar menimpa gaya builder lain; isinya sudah lolos `customCssError` di parseBuilderSpec.
  if (spec.customCss) {
    const css = spec.customCss;
    html = html.replace("</head>", () => `  <style id="lux-builder-custom">\n${css}\n  </style>\n</head>`);
  }

  if (spec.variants.nav === "drawer") {
    html = html.replace(
      /<nav class="bottom-dock([^"]*)">/,
      `<nav class="bottom-dock$1" onclick="if(event.target.closest('a,.dock-btn,.qr-btn'))this.classList.remove('drawer-open')">\n    <button type="button" class="lux-drawer-toggle" onclick="event.stopPropagation();this.parentElement.classList.toggle('drawer-open')" aria-label="Menu Navigasi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg><span>Menu</span></button>`
    );
  }

  if (spec.variants.coverDate === "split" && family === "wedding") {
    html = html.replace(
      /<p class="cover-date" data-lux-block="cover-date">\{\{weddingDate\}\}<\/p>/,
      `<p class="cover-date" data-lux-block="cover-date"><span class="cover-date-split">{{#if weddingDateDay}}<span class="cover-date-part cover-date-dd">{{weddingDateDay}}</span><span class="cover-date-sep">/</span><span class="cover-date-part cover-date-mm">{{weddingDateMonth}}</span><span class="cover-date-sep">•</span><span class="cover-date-part cover-date-yy">{{weddingDateYear}}</span>{{/if}}</span><span class="cover-date-full">{{weddingDate}}</span></p>`
    );
  }

  html = html.replace(/<!-- lux-ornaments:([a-z]+) -->/g, (marker, section: string) => {
    const items = spec.ornaments.filter((o) => o.section === section && !o.attach && !o.before);
    return items.length ? items.map((o) => ornamentHtml(o, family)).join("\n    ") : marker;
  });

  if (spec.ornaments.some((o) => o.before)) {
    html = html.replace("</head>", `  <style id="lux-builder-flow">\n    .lux-flow-off { display: none !important; }\n  </style>\n</head>`);
  }

  return applyStaticTexts(insertBeforeBlocks(attachToBlocks(html, spec.ornaments, family), spec.ornaments, spec.blocks, family), spec.texts);
}

const escapeText = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Mengganti teks label yang tertulis langsung di master (bukan token mesin). Teks yang lebih dulu diawali ikon SVG
 * (tombol dengan ikon) hanya diganti bagian setelah ikonnya. Label bertoken ("engine") tidak disentuh di sini; nilainya
 * dipasang lewat bawaan blueprint saat undangan dirender, sehingga token mesin tetap utuh dan lolos audit.
 */
function applyStaticTexts(html: string, texts: BuilderTexts): string {
  let out = html;
  for (const { key, kind } of BUILDER_TEXTS) {
    const value = texts[key];
    if (value === undefined || kind !== "static") continue;
    const element = new RegExp(`(<([a-zA-Z0-9]+)\\b[^>]*data-lux-field="customLabels\\.${key}"[^>]*>)([\\s\\S]*?)(</\\2>)`);
    out = out.replace(element, (_m, open: string, _tag: string, inner: string, close: string) => {
      const svgEnd = inner.search(/<\/svg>/i);
      const keep = svgEnd === -1 ? "" : `${inner.slice(0, svgEnd + 6)}\n        `;
      return `${open}${keep}${escapeText(value)}${close}`;
    });
  }
  return out;
}
