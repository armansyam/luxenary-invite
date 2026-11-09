/**
 * Template awal Theme Builder: rancangan lengkap sekali klik agar admin tidak mulai dari kanvas kosong. Template hanya
 * berisi spesifikasi builder biasa (lolos `parseBuilderSpec`), jadi tidak ada logika render baru. Teks, media bawaan,
 * dan jenis acara rancangan yang sedang dibuka dipertahankan saat template dipasang.
 */
import { builderFamilyOf, defaultBuilderSpec, PALETTE_PRESETS, peerBlocksForRole, type BuilderEventType, type BuilderSpec } from "@/lib/themeBuilder/spec";

export interface BuilderTemplate {
  id: string;
  label: string;
  hint: string;
  build: (eventType: BuilderEventType) => BuilderSpec;
}

const palette = (id: string) => ({ ...(PALETTE_PRESETS.find((p) => p.id === id) ?? PALETTE_PRESETS[0]).palette });

/** Judul seksi kapital seperti tema majalah; hanya blok judul yang ada di keluarga acara itu. */
function uppercaseTitles(eventType: BuilderEventType): BuilderSpec["blocks"] {
  const blocks: BuilderSpec["blocks"] = {};
  for (const id of peerBlocksForRole("couple-title", eventType)?.peers ?? []) blocks[id] = { x: 0, y: 0, scale: 1, rotate: 0, hidden: false, transform: "uppercase" };
  return blocks;
}

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
  {
    id: "majalah-gelap",
    label: "Majalah Gelap",
    hint: "Kanvas hitam emas, judul kapital, hitung mundur di dalam Acara, mempelai editorial, menu laci.",
    build: (eventType) => {
      const base = defaultBuilderSpec(eventType);
      return {
        ...base,
        canvasMode: "dark",
        palette: palette("hitam-emas"),
        fonts: { heading: "cormorant", body: "lora", script: "great-vibes" },
        texture: "/assets/ornaments/background/background-monocrhome.webp",
        textureOpacity: 40,
        radius: "sharp",
        countdownPlacement: "events",
        blocks: { ...uppercaseTitles(eventType), "countdown-eyebrow": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true }, "countdown-title": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true }, "countdown-sub": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true } },
        variants: { ...base.variants, cover: "editorial", couple: "editorial", countdown: "minimal", nav: "drawer", buttons: "outline", cards: "outlined", dividers: "line", spacing: "airy" },
        surface: { cardBorder: 1, cardShadow: "none" },
        animation: "fade",
        animationSpeed: "slow",
      };
    },
  },
  {
    id: "klasik-krem",
    label: "Klasik Krem",
    hint: "Krem gading, Cinzel, sampul berbingkai, mempelai lengkung, pemisah berhias.",
    build: (eventType) => {
      const base = defaultBuilderSpec(eventType);
      return {
        ...base,
        palette: palette("gading"),
        fonts: { heading: "cinzel", body: "jakarta", script: "great-vibes" },
        texture: "/assets/ornaments/background/background-cream1.webp",
        variants: { ...base.variants, cover: "framed", couple: "arch", opening: "card", headings: "ornate", dividers: "ornate", cards: "solid", closing: "framed" },
        sectionStyles: { countdown: { bg: "card", gradient: "fade-down", tone: "auto" } },
        animation: "rise",
      };
    },
  },
  {
    id: "adat-emas",
    label: "Adat Emas",
    hint: "Marun kerajaan, sutra Makassar, seksi Mempelai berlatar gelap, tombol kapsul.",
    build: (eventType) => {
      const base = defaultBuilderSpec(eventType);
      return {
        ...base,
        palette: palette("marun"),
        fonts: { heading: "cinzel-decorative", body: "lora", script: "great-vibes" },
        texture: "/assets/ornaments/background/bg-makassar.webp",
        textureOpacity: 60,
        variants: { ...base.variants, couple: "portrait", headings: "ornate", dividers: "ornate", buttons: "solid", gift: "tabs" },
        sectionStyles: {
          couple: { bg: "dark", gradient: "radial", tone: "light", image: "/assets/ornaments/background/bg-maroon.webp", imageOpacity: 30 },
          rsvp: { bg: "primary", gradient: "diagonal", tone: "light" },
        },
        surface: { cardBorder: 1, buttonPill: true },
        animation: "zoom",
      };
    },
  },
  {
    id: "botani-sage",
    label: "Botani Sage",
    hint: "Hijau sage, bunga samar, foto polaroid, galeri polaroid, seksi bebas kutipan.",
    build: (eventType) => {
      const base = defaultBuilderSpec(eventType);
      return {
        ...base,
        palette: palette("sage"),
        fonts: { heading: "playfair", body: "jost", script: "great-vibes" },
        texture: "/assets/ornaments/background/background-flower.webp",
        textureOpacity: 70,
        radius: "round",
        variants: { ...base.variants, couple: "polaroid", gallery: "polaroid", countdown: "circles", headings: "script", buttons: "glass", cards: "glass" },
        sectionStyles: { events: { bg: "light", gradient: "fade-up", tone: "auto" } },
        freeSections: [{ id: "free1", after: "couple", eyebrow: "Doa Kami", title: "", body: "", align: "center", quote: { text: "Semoga Allah menghimpun yang terserak dari keduanya, memberkahi mereka berdua, dan kiranya Allah meningkatkan kualitas keturunan mereka.", source: "Doa untuk pengantin" } }],
        animation: "grow",
      };
    },
  },
  {
    id: "minimal-modern",
    label: "Minimal Modern",
    hint: "Zaitun tenang, huruf sans, sampul editorial, kartu datar, kolom desktop lebar.",
    build: (eventType) => {
      const base = defaultBuilderSpec(eventType);
      // "Berdampingan" tidak ada untuk satu nama (hanya satu kartu profil), jadi diganti potret.
      const couple = builderFamilyOf(eventType) === "wedding" ? "side" : "portrait";
      return {
        ...base,
        palette: palette("zaitun"),
        fonts: { heading: "jost", body: "jakarta", script: "great-vibes" },
        texture: "",
        radius: "sharp",
        variants: { ...base.variants, cover: "editorial", couple, countdown: "minimal", headings: "lined", dividers: "none", buttons: "minimal", cards: "flat", spacing: "compact", events: "minimal", story: "minimal", gift: "minimal" },
        desktopLayout: "wide",
        animation: "slide-right",
        animationSpeed: "fast",
      };
    },
  },
];

/** Rancangan baru dari template, mempertahankan jenis acara, teks bawaan, dan media bawaan rancangan yang sedang dibuka. */
export function applyBuilderTemplate(template: BuilderTemplate, current: BuilderSpec): BuilderSpec {
  const next = template.build(current.eventType);
  return { ...next, texts: current.texts, defaultMedia: current.defaultMedia };
}
