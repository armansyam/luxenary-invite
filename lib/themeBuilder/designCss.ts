/**
 * CSS desain builder yang hanya bergantung pada spesifikasi (tanpa blueprint dan tanpa akses disk), sehingga dipakai
 * bersama oleh `compileBuilderMaster` (master tersimpan) dan pratinjau builder (diterapkan langsung ke iframe tanpa
 * menunggu render ulang server).
 */
import {
  ANIMATION_SPEEDS,
  DEFAULT_SECTION_IMAGE_OPACITY,
  EXTRA_ANIMATION_PRESETS,
  SECTION_BG_TOKENS,
  type AnimationPreset,
  type BuilderSpec,
  type CardShadow,
  type OrderableSection,
  type SectionGradient,
  type SectionStyle,
  type SurfaceStyle,
} from "@/lib/themeBuilder/spec";

/** Penutup hanya diberi latar saat klien tidak memasang foto penutup; foto penutup punya scrim sendiri. */
const SECTION_SELECTOR: Record<OrderableSection, string> = {
  opening: '[data-lux-section="opening"]',
  couple: '[data-lux-section="couple"]',
  countdown: '[data-lux-section="countdown"]',
  events: '[data-lux-section="events"]',
  story: '[data-lux-section="story"]',
  gallery: '[data-lux-section="gallery"]',
  rsvp: '[data-lux-section="rsvp"]',
  closing: '[data-lux-section="closing"].no-closing-photo',
};

function gradientLayer(color: string, gradient: SectionGradient): string {
  switch (gradient) {
    case "fade-down": return `linear-gradient(180deg, ${color} 0%, transparent 100%)`;
    case "fade-up": return `linear-gradient(0deg, ${color} 0%, transparent 100%)`;
    case "radial": return `radial-gradient(ellipse at 50% 35%, ${color} 0%, color-mix(in srgb, ${color} 35%, transparent) 55%, transparent 100%)`;
    case "diagonal": return `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 55%, var(--accent)) 100%)`;
    default: return `linear-gradient(${color}, ${color})`;
  }
}

/**
 * Latar dan nada teks satu seksi. Nada mendefinisikan ulang variabel teks di dalam seksi (bukan warna per elemen) agar
 * judul, teks kecil, kartu, dan tombol di seksi itu ikut berganti. `!important` mengalahkan `style="background:
 * transparent"` yang tertulis langsung di seksi pembuka blueprint.
 */
export function sectionStyleCss(selector: string, s: SectionStyle): string {
  const color = SECTION_BG_TOKENS.find((t) => t.id === s.bg)?.css ?? "";
  const rules: string[] = [];
  if (s.image) {
    const veil = `color-mix(in srgb, ${color || "var(--bg-canvas)"} ${100 - (s.imageOpacity ?? DEFAULT_SECTION_IMAGE_OPACITY)}%, transparent)`;
    rules.push(`background: ${gradientLayer(veil, s.gradient)}, url('${s.image}') center / cover no-repeat !important;`);
  } else if (color) {
    rules.push(`background: ${gradientLayer(color, s.gradient)} !important;`);
  }
  // Nada teks dipilih agar terbaca di latar seksi ini, jadi warna tambahan global (eyebrow/judul/garis) ikut nada di dalamnya.
  if (s.tone !== "auto") rules.push("--lux-eyebrow: var(--primary); --lux-heading: var(--text-main); --lux-line: var(--primary);");
  if (s.tone === "light") {
    // Aksen dicampur teks terang: aksen murni sering terlalu dekat dengan latar warna utama/kedua sehingga teks kecil hilang.
    rules.push("--text-main: var(--on-dark); --text-muted: color-mix(in srgb, var(--on-dark) 74%, transparent); --primary: color-mix(in srgb, var(--accent) 55%, var(--on-dark)); --on-primary: var(--bg-dark); --card-bg: color-mix(in srgb, var(--bg-dark) 72%, var(--on-dark)); color: var(--text-main);");
  } else if (s.tone === "dark") {
    rules.push("--text-main: var(--on-light); --text-muted: color-mix(in srgb, var(--on-light) 70%, transparent); --primary: var(--lux-base-primary); --card-bg: color-mix(in srgb, var(--bg-light) 78%, var(--on-dark)); color: var(--text-main);");
  }
  return rules.length ? `${selector} { ${rules.join(" ")} }` : "";
}

function extraPaletteCss(spec: BuilderSpec): string {
  const extra = spec.paletteExtra ?? {};
  return [
    extra.eyebrow ? ".sec-eyebrow { color: var(--lux-eyebrow); }" : "",
    extra.heading ? ".sec-main-title { color: var(--lux-heading); }" : "",
    extra.line ? ".sec-divider { background: var(--lux-line); }" : "",
  ].filter(Boolean).join("\n    ");
}

// Daftar yang sama dengan varian `cards` dan `buttons`; nilai bebas di sini menimpa varian karena dipasang sesudahnya.
const CARD_SURFACE_SELECTOR = ".opening-quote-card, .rsvp-form-box, .wish-item, .event-block-item, .event-unified-venue-card, .bank-card, .story-chapter-block, .lux-free-card";
const BUTTON_SELECTOR = ".cover-btn-open, .btn-cal, .btn-submit-rsvp, .btn-map-outline, .btn-outline-box, .btn-copy";
const CARD_SHADOW_CSS: Record<CardShadow, string> = { none: "none", soft: "var(--shadow-subtle)", deep: "var(--shadow-elevated)" };

function surfaceCss(surface: SurfaceStyle | undefined): string {
  if (!surface) return "";
  const card: string[] = [];
  if (surface.cardBorder !== undefined) card.push(surface.cardBorder === 0 ? "border: none !important;" : `border: ${surface.cardBorder}px solid color-mix(in srgb, var(--primary) 38%, transparent) !important;`);
  if (surface.cardRadius !== undefined) card.push(`border-radius: ${surface.cardRadius}px !important;`);
  if (surface.cardShadow) card.push(`box-shadow: ${CARD_SHADOW_CSS[surface.cardShadow]} !important;`);
  const button = surface.buttonPill ? "border-radius: var(--radius-full) !important;" : surface.buttonRadius !== undefined ? `border-radius: ${surface.buttonRadius}px !important;` : "";
  return [card.length ? `${CARD_SURFACE_SELECTOR} { ${card.join(" ")} }` : "", button ? `${BUTTON_SELECTOR} { ${button} }` : ""].filter(Boolean).join("\n    ");
}

/**
 * Seksi teks bebas. Elemen kosong disembunyikan untuk tamu tetapi tetap bisa diklik saat disunting di Studio, supaya
 * klien masih bisa mengisi teks kecil atau isi yang dikosongkan admin.
 */
const FREE_SECTION_CSS = `
    .lux-free-sec .lux-free-body { white-space: pre-line; max-width: 520px; margin-left: auto; margin-right: auto; }
    .lux-free-photo { margin: 8px auto 20px; width: 100%; max-width: 340px; overflow: hidden; border-radius: var(--radius-md); box-shadow: var(--shadow-subtle); }
    .lux-free-photo.is-bottom { margin: 20px auto 8px; }
    .lux-free-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .lux-free-photo.is-rect { aspect-ratio: 4 / 5; }
    .lux-free-photo.is-wide { aspect-ratio: 16 / 10; max-width: 100%; }
    .lux-free-photo.is-arch { aspect-ratio: 3 / 4; max-width: 260px; border-radius: 999px 999px var(--radius-md) var(--radius-md); }
    .lux-free-photo.is-circle { aspect-ratio: 1; max-width: 220px; border-radius: 50%; }
    .lux-free-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 18px; text-align: left; }
    .lux-free-card { padding: 16px 14px; background: var(--card-bg); border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent); border-radius: var(--radius-md); box-shadow: var(--shadow-subtle); }
    .lux-free-card-title { font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 6px; }
    .lux-free-card-body { font-size: 12.5px; line-height: 1.6; color: var(--text-muted); white-space: pre-line; }
    .lux-free-quote { margin: 20px auto 4px; max-width: 420px; padding: 18px 20px; border-left: 2px solid var(--accent); background: color-mix(in srgb, var(--card-bg) 70%, transparent); border-radius: 0 var(--radius-md) var(--radius-md) 0; text-align: left; }
    .lux-free-quote-text { font-family: var(--font-heading); font-style: italic; font-size: 16px; line-height: 1.6; color: var(--text-main); white-space: pre-line; }
    .lux-free-quote-source { display: block; margin-top: 8px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--primary); }
    .lux-free-gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 18px auto 0; max-width: 420px; }
    .lux-free-gallery.is-2, .lux-free-gallery.is-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .lux-free-gallery:not(:has(img)) { display: none; }
    .lux-free-gallery img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-sm); }
    .lux-free-map { display: inline-flex; margin-top: 18px; }
    .lux-free-sec :is(.lux-free-card-title, .lux-free-card-body, .lux-free-quote-source):empty:not([contenteditable="true"]) { display: none; }
    .lux-free-sec.lux-free-left .lux-free-photo, .lux-free-sec.lux-free-left .lux-free-quote, .lux-free-sec.lux-free-left .lux-free-gallery { margin-left: 0; }
    .lux-free-sec.lux-free-right .lux-free-photo, .lux-free-sec.lux-free-right .lux-free-quote, .lux-free-sec.lux-free-right .lux-free-gallery { margin-right: 0; }
    .lux-free-sec :is(.sec-eyebrow, .sec-main-title, .lux-free-body):empty:not([contenteditable="true"]) { display: none; }
    .lux-free-sec :is(.sec-eyebrow, .sec-main-title, .lux-free-body)[contenteditable="true"]:empty { min-height: 1.2em; min-width: 6em; }
    .lux-free-sec.lux-free-left { text-align: left; }
    .lux-free-sec.lux-free-left :is(.sec-divider, .lux-free-body) { margin-left: 0; }
    .lux-free-sec.lux-free-right { text-align: right; }
    .lux-free-sec.lux-free-right :is(.sec-divider, .lux-free-body) { margin-right: 0; }`;

const NESTED_COUNTDOWN_CSS = `
    .lux-nested-countdown { padding: 4px 0 28px !important; min-height: 0 !important; background: none; }
    .slide-opening .lux-nested-countdown { width: 100%; max-width: 380px; margin: 12px auto 0; }`;

/** Seksi tumpangan menjadi bagian isi tuannya: tanpa jarak seksi penuh dan tanpa tinggi layar penuh. */
const NESTED_SECTION_CSS = `
    .lux-nested-sec, [data-lux-section]:not([data-lux-section="gallery"]) [data-lux-section="gallery"] { padding: 28px 0 0 !important; min-height: 0 !important; width: 100%; }
    .slide-opening .lux-nested-sec, .closing-sec .lux-nested-sec { max-width: 420px; margin: 0 auto; position: relative; z-index: 2; }`;

/**
 * Kolom undangan desktop. Angka lebar dan posisi kolom disalin ke semua elemen yang di blueprint memakai 460px (kolom,
 * latar, sampul, dock, modal, toast), karena elemen fixed itu tidak mewarisi lebar kolom.
 */
function desktopLayoutCss(spec: BuilderSpec): string {
  const layout = spec.desktopLayout ?? "split";
  if (layout === "split") return "";
  const w = layout === "wide" ? 600 : layout === "centered" ? 520 : 460;
  const col = layout === "split-left" ? "0px" : layout === "centered" ? `calc(50% - ${w / 2}px)` : `calc(100% - ${w}px)`;
  const mid = `calc(${col} + ${w / 2}px)`;
  const rules = [
    `.app-container, .main-scroll-panel { width: ${w}px !important; max-width: ${w}px !important; margin-left: ${col} !important; }`,
    layout === "centered"
      ? ".sidebar-desktop { display: none !important; }\n      .fixed-bg-layer, .scrim-canvas { width: 100% !important; left: 0 !important; right: 0 !important; }\n      .app-container, .main-scroll-panel { border-right: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); }"
      : `.sidebar-desktop { left: ${layout === "split-left" ? `${w}px` : "0"} !important; width: calc(100% - ${w}px) !important; }\n      .fixed-bg-layer, .scrim-canvas { width: ${w}px !important; left: ${col} !important; right: auto !important; }`,
    layout === "split-left" ? ".app-container, .main-scroll-panel { border-left: none !important; border-right: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); box-shadow: 15px 0 45px color-mix(in srgb, var(--overlay) 50%, transparent) !important; }" : "",
    // Sampul "Desktop penuh" sengaja selebar layar; kolomnya tidak dipaksa ke lebar undangan.
    spec.variants.cover === "fullscreen" ? "" : `.cover-overlay { width: ${w}px !important; left: ${col} !important; right: auto !important; }`,
    // Laci navigasi menempel ke tepi kanan kolom undangan, bukan tepi kanan layar (yang bisa berupa panel foto).
    spec.variants.nav === "drawer"
      ? `body nav.bottom-dock, body nav.bottom-dock.lux-dock-compact { right: calc(100% - ${col} - ${w}px + 20px) !important; }`
      : `.bottom-dock { left: ${mid} !important; width: calc(${w}px - 28px) !important; max-width: calc(${w}px - 28px) !important; }`,
    `.modal-bg { left: ${col} !important; right: auto !important; width: ${w}px !important; }`,
    `#luxCopyToast { left: ${mid} !important; }`,
  ].filter(Boolean);
  return `@media (min-width: 900px) {\n      ${rules.join("\n      ")}\n    }`;
}

/** Keadaan awal (belum terlihat) tiap preset; `transform-origin` dan perspektif dipakai preset balik dan ayun. */
const PRESET_HIDDEN: Record<AnimationPreset, string> = {
  none: "opacity: 1; transform: none; filter: none;",
  fade: "opacity: 0; transform: none; filter: none;",
  rise: "opacity: 0; transform: translateY(28px); filter: none;",
  zoom: "opacity: 0; transform: scale(0.94); filter: none;",
  slide: "opacity: 0; transform: translateX(-24px); filter: none;",
  blur: "opacity: 0; transform: none; filter: blur(8px);",
  drop: "opacity: 0; transform: translateY(-28px); filter: none;",
  grow: "opacity: 0; transform: scale(0.78); filter: none;",
  flip: "opacity: 0; transform: perspective(700px) rotateX(70deg); transform-origin: 50% 0; filter: none;",
  swing: "opacity: 0; transform: rotate(-5deg) translateY(14px); transform-origin: 0 100%; filter: none;",
  "slide-right": "opacity: 0; transform: translateX(24px); filter: none;",
};

/**
 * Animasi per seksi, preset tambahan, dan kecepatan. Skrip blueprint hanya menyalakan animasi (`lux-anim-ready`) bila
 * preset di `<html>` bukan "none"; bila global "none" tetapi ada seksi beranimasi, `<html>` diberi preset "fade" dan
 * semua elemen lain dikembalikan tampil lewat aturan dasar "none". Preset tambahan tidak punya aturan di blueprint,
 * jadi aturan globalnya dipasang di sini.
 */
export function animationPlan(spec: BuilderSpec): { htmlPreset: AnimationPreset; css: string } {
  const perSection = Object.entries(spec.sectionAnimations ?? {}) as Array<[OrderableSection, AnimationPreset]>;
  const perFree = (spec.freeSections ?? []).flatMap((f) => (f.animation ? [[f.id, f.animation] as const] : []));
  const anyOverride = perSection.some(([, p]) => p !== "none") || perFree.some(([, p]) => p !== "none");
  const htmlPreset: AnimationPreset = spec.animation === "none" && anyOverride ? "fade" : spec.animation;
  const rules: string[] = [];
  if (EXTRA_ANIMATION_PRESETS.includes(spec.animation)) rules.push(`html.lux-anim-ready[data-lux-anim-preset="${spec.animation}"] [data-lux-anim]:not(.lux-in) { ${PRESET_HIDDEN[spec.animation]} }`);
  if (spec.animation === "none" && anyOverride) rules.push(`html.lux-anim-ready [data-lux-anim]:not(.lux-in) { ${PRESET_HIDDEN.none} }`);
  for (const [sec, preset] of perSection) rules.push(`html.lux-anim-ready [data-lux-section="${sec}"] [data-lux-anim]:not(.lux-in) { ${PRESET_HIDDEN[preset]} }`);
  for (const [id, preset] of perFree) rules.push(`html.lux-anim-ready #${id} [data-lux-anim]:not(.lux-in) { ${PRESET_HIDDEN[preset]} }`);
  const speed = ANIMATION_SPEEDS.find((s) => s.id === (spec.animationSpeed ?? "normal"))?.seconds ?? 0.9;
  if (spec.animationSpeed && spec.animationSpeed !== "normal") rules.push(`html.lux-anim-ready [data-lux-anim] { transition-duration: ${speed}s; }`);
  return { htmlPreset, css: rules.join("\n    ") };
}

/** Seluruh isi `<style id="lux-builder-design">`; kosong bila spesifikasi tidak memakai alat desain. */
export function designCss(spec: BuilderSpec): string {
  const sectionRules = (Object.entries(spec.sectionStyles ?? {}) as Array<[OrderableSection, SectionStyle]>).map(([sec, style]) => sectionStyleCss(SECTION_SELECTOR[sec], style));
  const freeRules = (spec.freeSections ?? []).flatMap((f) => (f.style ? [sectionStyleCss(`#${f.id}`, f.style)] : []));
  return [
    extraPaletteCss(spec),
    surfaceCss(spec.surface),
    spec.countdownPlacement && spec.countdownPlacement !== "section" ? NESTED_COUNTDOWN_CSS : "",
    spec.sectionNesting && Object.keys(spec.sectionNesting).length ? NESTED_SECTION_CSS : "",
    ...sectionRules,
    ...(spec.freeSections?.length ? [FREE_SECTION_CSS, ...freeRules] : []),
    desktopLayoutCss(spec),
    animationPlan(spec).css,
  ].filter(Boolean).join("\n    ");
}
