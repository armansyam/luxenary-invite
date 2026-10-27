import { BUILDER_TEXTS, parseBuilderTexts, type BuilderTextKey, type BuilderTexts } from "@/lib/themeBuilder/spec";
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

/** Teks bawaan dari kolom `Theme.builderSpec`; kosong untuk tema tulisan tangan atau spesifikasi tanpa teks. */
export function builderTextsOf(spec: unknown): BuilderTexts {
  if (!spec || typeof spec !== "object") return {};
  return parseBuilderTexts((spec as { texts?: unknown }).texts);
}
