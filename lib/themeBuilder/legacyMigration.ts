import { legacyDefaultMedia, seedSpecFromMaster, type LegacySeed } from "@/lib/themeBuilder/legacySeed";
import { parseBuilderSpec, type BuilderSpec } from "@/lib/themeBuilder/spec";

export type LegacyDraft = { ok: true; spec: BuilderSpec; seed: LegacySeed } | { ok: false; errors: string[] };

/**
 * Spesifikasi draf builder dari master tulisan tangan dan media bawaan tema lama: titik awal yang sama dengan "Mulai
 * dari tema lama" (palet, huruf, tekstur) ditambah media bawaan yang sah untuk slot builder. Dipakai skrip migrasi massal
 * dan diuji lewat rute builder yang sebenarnya.
 */
export function legacyDraftSpec(masterHtml: string, legacyMedia: unknown): LegacyDraft {
  const seed = seedSpecFromMaster(masterHtml);
  const parsed = parseBuilderSpec({ ...seed.spec, defaultMedia: legacyDefaultMedia(legacyMedia) });
  return parsed.ok ? { ok: true, spec: parsed.spec, seed } : { ok: false, errors: parsed.errors };
}
