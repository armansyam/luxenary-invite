import {
  BUILDER_TEXTS,
  EDITABLE_TEXT_KEYS,
  FREE_SECTION_LIMITS,
  freeCardLabelKeys,
  freeExtraLabelKeys,
  freeSectionLabelKeys,
  parseBuilderSpec,
  parseBuilderTexts,
  type BuilderTextKey,
  type BuilderTexts,
  type EditableTextKey,
  type OrnamentSection,
} from "@/lib/themeBuilder/spec";
import type { ThemeBlueprint } from "@/lib/themeDefaults";

/** Label "engine" yang bawaannya hidup di blueprint tema: kunci label Studio -> kolom ThemeBlueprint. */
const BLUEPRINT_FIELD: Partial<Record<BuilderTextKey, keyof ThemeBlueprint>> = {
  coverBadge: "coverBadge",
  coverSubtitle: "coverSubtitle",
  openBtn: "openBtn",
  openingGreeting: "openingGreeting",
  quoteEyebrow: "quoteSectionEyebrow",
  quoteTitle: "quoteSectionTitle",
  coupleEyebrow: "coupleSectionEyebrow",
  coupleTitle: "coupleSectionTitle",
  coupleSub: "coupleSectionSub",
  eventsTitle: "eventsSectionTitle",
  storyEyebrow: "storySectionEyebrow",
  storyTitle: "storySectionTitle",
  wishesTitle: "wishesSectionTitle",
  wishesSub: "wishesSectionSub",
  rsvpTitle: "rsvpTitle",
  rsvpBtnText: "rsvpBtnText",
  closingQuote: "closingQuote",
  closingSub: "closingSub",
};

/**
 * Teks bawaan tema builder menggantikan bawaan blueprint sebelum undangan dirender. Label tanpa kolom blueprint
 * (mis. label kartu tamu) dikembalikan di `labels` untuk digabung di bawah isian klien.
 */
export function applyBuilderTexts(blueprint: ThemeBlueprint, texts: BuilderTexts): { blueprint: ThemeBlueprint; labels: Record<string, string> } {
  const patched: Record<string, unknown> = { ...blueprint };
  const labels: Record<string, string> = {};
  for (const { key, kind } of BUILDER_TEXTS) {
    const value = texts[key];
    if (value === undefined || kind !== "engine") continue;
    const field = BLUEPRINT_FIELD[key];
    if (field) patched[field] = value;
    else labels[key] = value;
  }
  return { blueprint: patched as unknown as ThemeBlueprint, labels };
}

/**
 * Tema satu nama: blueprint satu nama tidak membaca ThemeBlueprint (labelnya dari kontrak applySingleNameContract), jadi
 * teks "engine" builder dipasang sebagai label bawaan. Teks "static" sudah tertulis di master saat kompilasi.
 */
export function builderTextLabels(texts: BuilderTexts): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const { key, kind } of BUILDER_TEXTS) {
    const value = texts[key];
    if (value !== undefined && kind === "engine") labels[key] = value;
  }
  return labels;
}

export interface EditableText {
  key: EditableTextKey;
  /** Teks awal yang tertulis di master sebelum klien mengubahnya. */
  value: string;
  section: OrnamentSection;
}

/**
 * Teks hias yang boleh diubah klien (`customLabels.hias1`-`hias3`) dari kolom `Theme.builderSpec`, urut kunci. Isian Studio
 * butuh daftar ini karena teks hias tidak punya kolom tetap seperti judul seksi; tema tanpa spesifikasi builder kosong.
 */
export function editableTextsOf(spec: unknown): EditableText[] {
  const ornaments = spec && typeof spec === "object" ? (spec as { ornaments?: unknown }).ornaments : undefined;
  if (!Array.isArray(ornaments)) return [];
  const texts: EditableText[] = [];
  for (const o of ornaments) {
    const key = o?.text?.labelKey;
    if (!(EDITABLE_TEXT_KEYS as readonly unknown[]).includes(key) || typeof o.text.value !== "string") continue;
    if (texts.some((t) => t.key === key)) continue;
    texts.push({ key, value: o.text.value, section: o.section });
  }
  return texts.sort((a, b) => a.key.localeCompare(b.key));
}

export interface FreeSectionText {
  key: string;
  label: string;
  /** Teks awal dari rancangan admin. */
  value: string;
  multiline: boolean;
  maxLength: number;
  /** Nama seksi bebas, untuk mengelompokkan isian di Studio. */
  group: string;
}

/**
 * Isian Studio untuk teks seksi bebas Theme Builder (judul, isi, kartu, kutipan, label tombol peta), urut seperti di
 * undangan. Teks ini tidak punya kolom tetap, jadi Studio membacanya dari `Theme.builderSpec`; tanpa spesifikasi kosong.
 */
export function freeSectionTextsOf(spec: unknown): FreeSectionText[] {
  const parsed = spec ? parseBuilderSpec(spec) : null;
  if (!parsed?.ok) return [];
  const texts: FreeSectionText[] = [];
  parsed.spec.freeSections?.forEach((f, idx) => {
    const group = f.title || `Seksi bebas ${idx + 1}`;
    const k = freeSectionLabelKeys(f.id);
    const x = freeExtraLabelKeys(f.id);
    texts.push(
      { key: k.eyebrow, label: "Teks kecil", value: f.eyebrow, multiline: false, maxLength: FREE_SECTION_LIMITS.eyebrow, group },
      { key: k.title, label: "Judul", value: f.title, multiline: false, maxLength: FREE_SECTION_LIMITS.title, group },
      { key: k.body, label: "Isi", value: f.body, multiline: true, maxLength: FREE_SECTION_LIMITS.body, group },
    );
    if (f.quote) {
      texts.push(
        { key: x.quote, label: "Kutipan", value: f.quote.text, multiline: true, maxLength: FREE_SECTION_LIMITS.quote, group },
        { key: x.quoteSource, label: "Sumber kutipan", value: f.quote.source, multiline: false, maxLength: FREE_SECTION_LIMITS.quoteSource, group },
      );
    }
    f.cards?.forEach((c, i) => {
      const ck = freeCardLabelKeys(f.id, i + 1);
      texts.push(
        { key: ck.title, label: `Kartu ${i + 1}: judul`, value: c.title, multiline: false, maxLength: FREE_SECTION_LIMITS.cardTitle, group },
        { key: ck.body, label: `Kartu ${i + 1}: isi`, value: c.body, multiline: true, maxLength: FREE_SECTION_LIMITS.cardBody, group },
      );
    });
    if (f.mapButton) texts.push({ key: x.mapBtn, label: "Label tombol peta", value: f.mapButton.label, multiline: false, maxLength: FREE_SECTION_LIMITS.mapLabel, group });
  });
  return texts;
}

/** Teks bawaan dari kolom `Theme.builderSpec`; kosong untuk tema tulisan tangan atau spesifikasi tanpa teks. */
export function builderTextsOf(spec: unknown): BuilderTexts {
  if (!spec || typeof spec !== "object") return {};
  return parseBuilderTexts((spec as { texts?: unknown }).texts);
}
