/**
 * Spesifikasi Theme Builder: pilihan admin (palet, huruf, varian seksi, ornamen, animasi) yang dikompilasi menjadi
 * master tema di atas blueprint resmi. Modul ini tanpa akses disk sehingga dipakai bersama oleh UI builder (validasi
 * dan pratinjau posisi ornamen) dan server (kompilasi, audit).
 */

export const BUILDER_SPEC_VERSION = 1;

export type BuilderEventType = "WEDDING";
export const BUILDER_EVENT_TYPES: BuilderEventType[] = ["WEDDING"];

export type CanvasMode = "light" | "dark";
export type RadiusStyle = "sharp" | "soft" | "round";
export type AnimationPreset = "none" | "fade" | "rise" | "zoom" | "slide" | "blur";
export type OrnamentLayer = "back" | "front";
export type OrnamentAnchor = "top" | "bottom";

export const ORNAMENT_SECTIONS = ["cover", "sidebar", "opening", "couple", "countdown", "events", "story", "rsvp", "closing"] as const;
export type OrnamentSection = (typeof ORNAMENT_SECTIONS)[number];

export const SECTION_LABELS: Record<OrnamentSection, string> = {
  cover: "Sampul",
  sidebar: "Panel kiri desktop",
  opening: "Pembuka",
  couple: "Mempelai",
  countdown: "Hitung mundur",
  events: "Acara",
  story: "Kisah",
  rsvp: "RSVP & ucapan",
  closing: "Penutup",
};

export interface BuilderPalette {
  primary: string;
  secondary: string;
  accent: string;
  bgLight: string;
  bgDark: string;
  /** Teks di atas latar terang. */
  textDark: string;
  /** Teks di atas latar gelap dan foto. */
  textLight: string;
  /** Teks di atas tombol warna primary. */
  onPrimary: string;
}

export interface BuilderFonts {
  heading: string;
  body: string;
  script: string;
}

export interface BuilderVariants {
  cover: string;
  opening: string;
  couple: string;
  countdown: string;
  closing: string;
  headings: string;
  sidebar: string;
}

export interface BuilderOrnament {
  id: string;
  section: OrnamentSection;
  src: string;
  /** Titik tengah ornamen, persen dari lebar seksi. */
  x: number;
  /** Titik tengah ornamen, persen dari tinggi seksi diukur dari `anchor`. */
  y: number;
  anchor: OrnamentAnchor;
  /** Lebar ornamen, persen dari lebar seksi; ikut membesar dan mengecil bersama layar. */
  width: number;
  rotate: number;
  opacity: number;
  flipX: boolean;
  layer: OrnamentLayer;
}

/** Slot yang boleh punya gambar bawaan dari builder; latar (GLOBAL_FIXED_BG) diturunkan dari `texture`. */
export const BUILDER_DEFAULT_SLOTS = [
  { slot: "LANDING_COVER", label: "Cover pembuka" },
  { slot: "DESKTOP_SIDEBAR", label: "Hero kiri desktop" },
  { slot: "CLOSING_COVER", label: "Penutup" },
] as const;
export type BuilderDefaultSlot = (typeof BUILDER_DEFAULT_SLOTS)[number]["slot"];
export type BuilderDefaultMedia = Partial<Record<BuilderDefaultSlot, string>>;

/**
 * Blok konten yang dapat dipilih dan diatur di builder. Posisi bukan koordinat absolut: geser memakai persen ukuran
 * elemen itu sendiri (CSS `translate`), sehingga blok tetap mengalir bersama isi klien dan mengikuti lebar kolom
 * 320-460 px. Penanda `data-lux-block` ada di blueprint pernikahan.
 */
export const BUILDER_BLOCKS = [
  { id: "cover-names", label: "Nama di cover", section: "cover" },
  { id: "opening-photo", label: "Foto pembuka", section: "opening" },
  { id: "opening-names", label: "Nama di pembuka", section: "opening" },
  { id: "couple-photo-1", label: "Foto mempelai pertama", section: "couple" },
  { id: "couple-photo-2", label: "Foto mempelai kedua", section: "couple" },
  { id: "countdown", label: "Hitung mundur", section: "countdown" },
  { id: "closing-content", label: "Isi penutup", section: "closing" },
] as const;
export type BuilderBlockId = (typeof BUILDER_BLOCKS)[number]["id"];

export interface BlockProps {
  /** Geser mendatar dan tegak, dalam persen lebar dan tinggi elemen itu sendiri. */
  x: number;
  y: number;
  scale: number;
  /** Derajat. */
  rotate: number;
}
export type BuilderBlocks = Partial<Record<BuilderBlockId, BlockProps>>;

export const DEFAULT_BLOCK_PROPS: BlockProps = { x: 0, y: 0, scale: 1, rotate: 0 };
export const BLOCK_LIMITS = { x: [-60, 60], y: [-60, 60], scale: [0.5, 2], rotate: [-180, 180] } as const;

export const isDefaultBlock = (p: BlockProps) => p.x === 0 && p.y === 0 && p.scale === 1 && p.rotate === 0;

/**
 * Deklarasi CSS satu blok. Memakai properti transform individual (translate, rotate, scale) agar tidak menimpa
 * `transform` milik varian (mis. polaroid) maupun animasi masuk.
 */
export function blockStyle(p: BlockProps): string {
  return `translate:${p.x}% ${p.y}%;rotate:${p.rotate}deg;scale:${p.scale};`;
}

export interface BuilderSpec {
  version: number;
  eventType: BuilderEventType;
  canvasMode: CanvasMode;
  palette: BuilderPalette;
  fonts: BuilderFonts;
  /** URL tekstur latar kanvas, atau "" tanpa tekstur. */
  texture: string;
  /** Gambar bawaan per slot (dari pustaka latar); dipakai sampai klien mengunggah foto sendiri. */
  defaultMedia: BuilderDefaultMedia;
  /** Properti relatif blok konten; hanya blok yang diubah dari bawaan yang tersimpan. */
  blocks: BuilderBlocks;
  radius: RadiusStyle;
  variants: BuilderVariants;
  animation: AnimationPreset;
  ornaments: BuilderOrnament[];
}

// Font yang tersedia lokal di public/fonts/fonts.css; font lain tidak dimuat oleh undangan.
export const FONT_OPTIONS = [
  { id: "cinzel", label: "Cinzel", family: "'Cinzel', Georgia, serif", kind: "Serif klasik" },
  { id: "cinzel-decorative", label: "Cinzel Decorative", family: "'Cinzel Decorative', Georgia, serif", kind: "Serif hias" },
  { id: "cormorant", label: "Cormorant Garamond", family: "'Cormorant Garamond', Georgia, serif", kind: "Serif anggun" },
  { id: "playfair", label: "Playfair Display", family: "'Playfair Display', Georgia, serif", kind: "Serif kontras" },
  { id: "dm-serif", label: "DM Serif Display", family: "'DM Serif Display', Georgia, serif", kind: "Serif tebal" },
  { id: "lora", label: "Lora", family: "'Lora', Georgia, serif", kind: "Serif bacaan" },
  { id: "jakarta", label: "Plus Jakarta Sans", family: "'Plus Jakarta Sans', system-ui, sans-serif", kind: "Sans modern" },
  { id: "jost", label: "Jost", family: "'Jost', system-ui, sans-serif", kind: "Sans geometris" },
  { id: "great-vibes", label: "Great Vibes", family: "'Great Vibes', cursive", kind: "Tulisan tangan" },
] as const;

export const TEXTURE_OPTIONS = [
  { id: "", label: "Polos" },
  { id: "/assets/ornaments/background/background-cream.webp", label: "Krem halus" },
  { id: "/assets/ornaments/background/background-cream1.webp", label: "Krem bertekstur" },
  { id: "/assets/ornaments/background/background-flower.webp", label: "Bunga samar" },
  { id: "/assets/ornaments/background/background-monocrhome.webp", label: "Monokrom" },
  { id: "/assets/ornaments/background/background-monocrhome1.webp", label: "Monokrom cahaya" },
  { id: "/assets/ornaments/background/background-red.webp", label: "Merah tua" },
] as const;

export interface VariantOption {
  id: string;
  label: string;
  hint: string;
}

export const VARIANT_GROUPS: Array<{ key: keyof BuilderVariants; label: string; section: OrnamentSection | null; options: VariantOption[] }> = [
  {
    key: "cover",
    label: "Sampul",
    section: "cover",
    options: [
      { id: "classic", label: "Klasik", hint: "Foto penuh, nama di tengah" },
      { id: "framed", label: "Berbingkai", hint: "Garis bingkai tipis di tepi layar" },
      { id: "arch", label: "Jendela lengkung", hint: "Nama di dalam lengkung kaca buram" },
      { id: "editorial", label: "Editorial", hint: "Rata kiri seperti sampul majalah" },
    ],
  },
  {
    key: "opening",
    label: "Pembuka",
    section: "opening",
    options: [
      { id: "classic", label: "Klasik", hint: "Teks langsung di atas kanvas" },
      { id: "card", label: "Kartu", hint: "Nama di dalam kartu kertas" },
      { id: "arch", label: "Foto lengkung", hint: "Foto pembuka berbentuk lengkung" },
      { id: "circle", label: "Foto bulat", hint: "Foto pembuka berbentuk lingkaran" },
    ],
  },
  {
    key: "couple",
    label: "Mempelai",
    section: "couple",
    options: [
      { id: "stacked", label: "Bertumpuk", hint: "Foto bulat, atas dan bawah" },
      { id: "side", label: "Berdampingan", hint: "Dua kolom kiri dan kanan" },
      { id: "arch", label: "Lengkung", hint: "Foto tinggi berujung lengkung" },
      { id: "polaroid", label: "Polaroid", hint: "Foto persegi dengan bayangan geser" },
    ],
  },
  {
    key: "countdown",
    label: "Hitung mundur",
    section: "countdown",
    options: [
      { id: "boxes", label: "Kotak", hint: "Empat kotak berbingkai" },
      { id: "circles", label: "Lingkaran", hint: "Empat lingkaran" },
      { id: "minimal", label: "Minimal", hint: "Angka besar dengan garis pemisah" },
      { id: "solid", label: "Blok warna", hint: "Kotak berwarna primary" },
    ],
  },
  {
    key: "closing",
    label: "Penutup",
    section: "closing",
    options: [
      { id: "classic", label: "Klasik", hint: "Teks di tengah layar" },
      { id: "card", label: "Kartu", hint: "Salam penutup di dalam kartu" },
      { id: "framed", label: "Berbingkai", hint: "Bingkai garis ganda" },
    ],
  },
  {
    key: "headings",
    label: "Judul seksi",
    section: null,
    options: [
      { id: "classic", label: "Klasik", hint: "Label kecil dan judul serif" },
      { id: "script", label: "Tulisan tangan", hint: "Judul memakai huruf tulisan tangan" },
      { id: "lined", label: "Bergaris", hint: "Label kecil diapit garis" },
      { id: "ornate", label: "Pemisah halus", hint: "Garis berpendar di bawah judul" },
    ],
  },
  {
    key: "sidebar",
    label: "Panel kiri desktop",
    section: "sidebar",
    options: [
      { id: "bottom-left", label: "Kiri bawah", hint: "Nama di pojok kiri bawah" },
      { id: "bottom-center", label: "Tengah bawah", hint: "Nama di tengah bawah" },
      { id: "center", label: "Tengah", hint: "Nama tepat di tengah foto" },
      { id: "top-left", label: "Kiri atas", hint: "Nama di pojok kiri atas" },
    ],
  },
];

export const ANIMATION_OPTIONS: Array<{ id: AnimationPreset; label: string; hint: string }> = [
  { id: "none", label: "Tanpa animasi", hint: "Semua isi langsung tampil" },
  { id: "fade", label: "Memudar", hint: "Muncul perlahan" },
  { id: "rise", label: "Naik", hint: "Muncul sambil naik sedikit" },
  { id: "zoom", label: "Membesar", hint: "Muncul dari sedikit lebih kecil" },
  { id: "slide", label: "Geser", hint: "Muncul dari kiri" },
  { id: "blur", label: "Fokus", hint: "Dari buram menjadi tajam" },
];

export const RADIUS_OPTIONS: Array<{ id: RadiusStyle; label: string; values: [number, number, number] }> = [
  { id: "sharp", label: "Tegas", values: [2, 4, 6] },
  { id: "soft", label: "Lembut", values: [8, 16, 24] },
  { id: "round", label: "Bulat", values: [14, 24, 36] },
];

export const PALETTE_PRESETS: Array<{ id: string; label: string; mode: CanvasMode; palette: BuilderPalette }> = [
  { id: "gading", label: "Gading Emas", mode: "light", palette: { primary: "#9a7b4f", secondary: "#5e4b33", accent: "#c9a978", bgLight: "#faf6f0", bgDark: "#1f1b16", textDark: "#2b2620", textLight: "#fbf8f3", onPrimary: "#ffffff" } },
  { id: "sage", label: "Sage Garden", mode: "light", palette: { primary: "#5f7352", secondary: "#3f4d36", accent: "#a9b98f", bgLight: "#f4f6ef", bgDark: "#1b2118", textDark: "#232b1e", textLight: "#f3f5ee", onPrimary: "#ffffff" } },
  { id: "terakota", label: "Terakota", mode: "light", palette: { primary: "#a65632", secondary: "#6e3519", accent: "#dda07b", bgLight: "#fbf3ec", bgDark: "#29180f", textDark: "#382217", textLight: "#fff5ee", onPrimary: "#ffffff" } },
  { id: "marun", label: "Marun Kerajaan", mode: "light", palette: { primary: "#8b2636", secondary: "#561622", accent: "#cf9f6b", bgLight: "#fbf4f1", bgDark: "#23080e", textDark: "#2e1418", textLight: "#fbeff0", onPrimary: "#ffffff" } },
  { id: "mawar", label: "Rona Mawar", mode: "light", palette: { primary: "#9e5864", secondary: "#6d3943", accent: "#e1b1b9", bgLight: "#fdf5f5", bgDark: "#291418", textDark: "#382026", textLight: "#fff3f4", onPrimary: "#ffffff" } },
  { id: "zaitun", label: "Zaitun Tenang", mode: "light", palette: { primary: "#6c6a3b", secondary: "#4b4a28", accent: "#c4bd85", bgLight: "#f8f7ef", bgDark: "#1e1d12", textDark: "#2a2919", textLight: "#f7f5e8", onPrimary: "#ffffff" } },
  { id: "malam", label: "Biru Malam", mode: "dark", palette: { primary: "#c9a55c", secondary: "#8c6f35", accent: "#e3cc94", bgLight: "#f3f1ea", bgDark: "#101b2c", textDark: "#1b2433", textLight: "#f3efe4", onPrimary: "#101b2c" } },
  { id: "hitam-emas", label: "Hitam Emas", mode: "dark", palette: { primary: "#d4af6a", secondary: "#a68443", accent: "#f0d9a8", bgLight: "#f4efe6", bgDark: "#121110", textDark: "#1a1917", textLight: "#f4ede0", onPrimary: "#121110" } },
];

export function defaultBuilderSpec(): BuilderSpec {
  return {
    version: BUILDER_SPEC_VERSION,
    eventType: "WEDDING",
    canvasMode: "light",
    palette: { ...PALETTE_PRESETS[0].palette },
    fonts: { heading: "cinzel", body: "jakarta", script: "great-vibes" },
    texture: "/assets/ornaments/background/background-cream.webp",
    defaultMedia: {},
    blocks: {},
    radius: "soft",
    variants: { cover: "classic", opening: "classic", couple: "stacked", countdown: "boxes", closing: "classic", headings: "classic", sidebar: "bottom-left" },
    animation: "rise",
    ornaments: [],
  };
}

export const MAX_ORNAMENTS = 40;
export const MAX_ORNAMENTS_PER_SECTION = 12;

const HEX_RE = /^#[0-9a-f]{6}$/;
const ORNAMENT_ID_RE = /^[a-z0-9]{6,16}$/;
// Ornamen bawaan di public/assets/ornaments/<folder>/ dan unggahan admin di public/uploads/theme-assets/ (nama hash).
const ORNAMENT_SRC_RE = /^\/(?:assets\/ornaments\/(?!background\/)[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+|uploads\/theme-assets\/[a-f0-9]{24}\.(?:webp|png))$/;

export function isAllowedOrnamentSrc(src: unknown): src is string {
  return typeof src === "string" && ORNAMENT_SRC_RE.test(src) && /\.(webp|png)$/i.test(src) && !src.includes("..");
}

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
};

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], field: string, errors: string[]): T | undefined {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  errors.push(`${field} tidak dikenali.`);
  return undefined;
}

export type ParseResult = { ok: true; spec: BuilderSpec } | { ok: false; errors: string[] };

/**
 * Validasi ketat masukan dari klien. Nilai yang lolos aman disisipkan ke CSS dan HTML master tanpa escape tambahan:
 * warna hanya hex 6 digit, pilihan hanya dari katalog, angka dibatasi, dan sumber ornamen hanya dari dua folder aset.
 */
export function parseBuilderSpec(raw: unknown): ParseResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["Spesifikasi tema tidak terbaca."] };
  const input = raw as Record<string, any>;
  const base = defaultBuilderSpec();

  const eventType = pickEnum(input.eventType, BUILDER_EVENT_TYPES, "Jenis acara", errors);
  const canvasMode = pickEnum<CanvasMode>(input.canvasMode, ["light", "dark"], "Mode kanvas", errors);
  const radius = pickEnum<RadiusStyle>(input.radius, ["sharp", "soft", "round"], "Sudut", errors);
  const animation = pickEnum<AnimationPreset>(input.animation, ANIMATION_OPTIONS.map((a) => a.id), "Animasi", errors);

  const palette = {} as BuilderPalette;
  for (const key of Object.keys(base.palette) as Array<keyof BuilderPalette>) {
    const value = typeof input.palette?.[key] === "string" ? input.palette[key].trim().toLowerCase() : "";
    if (!HEX_RE.test(value)) errors.push(`Warna ${key} harus berformat #rrggbb.`);
    palette[key] = value;
  }

  const fontIds = FONT_OPTIONS.map((f) => f.id) as readonly string[];
  const fonts = {} as BuilderFonts;
  for (const key of ["heading", "body", "script"] as const) {
    fonts[key] = pickEnum(input.fonts?.[key], fontIds, `Huruf ${key}`, errors) ?? base.fonts[key];
  }

  const texture = typeof input.texture === "string" ? input.texture : "";
  if (!TEXTURE_OPTIONS.some((t) => t.id === texture)) errors.push("Tekstur latar tidak dikenali.");

  // Spesifikasi lama tanpa defaultMedia tetap sah; gambar bawaan hanya dari pustaka latar.
  const defaultMedia: BuilderDefaultMedia = {};
  for (const { slot, label } of BUILDER_DEFAULT_SLOTS) {
    const value = input.defaultMedia?.[slot];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string" || !TEXTURE_OPTIONS.some((t) => t.id === value)) errors.push(`Media bawaan ${label} tidak dikenali.`);
    else defaultMedia[slot] = value;
  }

  // Spesifikasi lama tanpa blocks tetap sah; blok yang tidak dikenal diabaikan, nilai di luar batas dijepit.
  const blocks: BuilderBlocks = {};
  for (const { id, label } of BUILDER_BLOCKS) {
    const raw = input.blocks?.[id];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== "object") {
      errors.push(`Blok ${label} tidak terbaca.`);
      continue;
    }
    const props: BlockProps = {
      x: clamp(raw.x, BLOCK_LIMITS.x[0], BLOCK_LIMITS.x[1], 0),
      y: clamp(raw.y, BLOCK_LIMITS.y[0], BLOCK_LIMITS.y[1], 0),
      scale: clamp(raw.scale, BLOCK_LIMITS.scale[0], BLOCK_LIMITS.scale[1], 1),
      rotate: clamp(raw.rotate, BLOCK_LIMITS.rotate[0], BLOCK_LIMITS.rotate[1], 0),
    };
    if (!isDefaultBlock(props)) blocks[id] = props;
  }

  const variants = {} as BuilderVariants;
  for (const group of VARIANT_GROUPS) {
    variants[group.key] = pickEnum(input.variants?.[group.key], group.options.map((o) => o.id), `Varian ${group.label}`, errors) ?? base.variants[group.key];
  }

  const ornaments: BuilderOrnament[] = [];
  const rawOrnaments = Array.isArray(input.ornaments) ? input.ornaments : [];
  if (rawOrnaments.length > MAX_ORNAMENTS) errors.push(`Ornamen paling banyak ${MAX_ORNAMENTS} buah.`);
  const seen = new Set<string>();
  const perSection: Record<string, number> = {};
  for (const [i, o] of rawOrnaments.slice(0, MAX_ORNAMENTS).entries()) {
    const label = `Ornamen #${i + 1}`;
    if (!o || typeof o !== "object") { errors.push(`${label} tidak terbaca.`); continue; }
    const id = typeof o.id === "string" && ORNAMENT_ID_RE.test(o.id) && !seen.has(o.id) ? o.id : null;
    if (!id) { errors.push(`${label}: ID tidak valid atau ganda.`); continue; }
    seen.add(id);
    const section = pickEnum(o.section, ORNAMENT_SECTIONS, `${label}: seksi`, errors);
    if (!isAllowedOrnamentSrc(o.src)) { errors.push(`${label}: gambar harus dari pustaka ornamen.`); continue; }
    if (!section) continue;
    perSection[section] = (perSection[section] ?? 0) + 1;
    if (perSection[section] > MAX_ORNAMENTS_PER_SECTION) { errors.push(`Seksi ${SECTION_LABELS[section]} paling banyak ${MAX_ORNAMENTS_PER_SECTION} ornamen.`); continue; }
    ornaments.push({
      id,
      section,
      src: o.src,
      x: clamp(o.x, -20, 120, 50),
      y: clamp(o.y, -20, 120, 50),
      anchor: o.anchor === "bottom" ? "bottom" : "top",
      width: clamp(o.width, 3, 140, 30),
      rotate: clamp(o.rotate, -180, 180, 0),
      opacity: clamp(o.opacity, 0.05, 1, 1),
      flipX: o.flipX === true,
      layer: o.layer === "front" ? "front" : "back",
    });
  }

  if (errors.length || !eventType || !canvasMode || !radius || !animation) return { ok: false, errors };
  return {
    ok: true,
    spec: { version: BUILDER_SPEC_VERSION, eventType, canvasMode, palette, fonts, texture, defaultMedia, blocks, radius, variants, animation, ornaments },
  };
}

export function fontFamily(id: string): string {
  return (FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0]).family;
}

/** Gaya posisi satu ornamen; dipakai kompilator master dan pratinjau builder saat ornamen digeser. */
export function ornamentStyle(o: Pick<BuilderOrnament, "x" | "y" | "anchor" | "width" | "rotate" | "opacity" | "flipX">): string {
  const vertical = o.anchor === "bottom" ? `bottom:${o.y}%` : `top:${o.y}%`;
  const shiftY = o.anchor === "bottom" ? "50%" : "-50%";
  return `left:${o.x}%;${vertical};width:${o.width}%;opacity:${o.opacity};transform:translate(-50%,${shiftY}) rotate(${o.rotate}deg) scaleX(${o.flipX ? -1 : 1});`;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Rasio kontras WCAG antara dua warna hex. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

export interface PaletteCheck {
  label: string;
  ratio: number;
  min: number;
  ok: boolean;
}

/** Pasangan warna yang harus terbaca; ambang 4.5 untuk teks biasa dan 3 untuk tombol bertulisan tebal. */
export function paletteChecks(spec: Pick<BuilderSpec, "palette" | "canvasMode">): PaletteCheck[] {
  const p = spec.palette;
  const canvas = spec.canvasMode === "dark" ? p.bgDark : p.bgLight;
  const text = spec.canvasMode === "dark" ? p.textLight : p.textDark;
  const pairs: Array<[string, string, string, number]> = [
    ["Teks di atas kanvas", text, canvas, 4.5],
    ["Teks di atas foto dan latar gelap", p.textLight, p.bgDark, 4.5],
    ["Tulisan tombol", p.onPrimary, p.primary, 3],
    ["Judul kecil berwarna primary di kanvas", p.primary, canvas, 3],
  ];
  return pairs.map(([label, a, b, min]) => {
    const ratio = contrastRatio(a, b);
    return { label, ratio, min, ok: ratio >= min };
  });
}
