/**
 * Suntingan Editor Master (Mode Master): baris master tulisan tangan mandiri yang menyimpan override variabel `:root`,
 * pengganti gambar, seksi tersembunyi, tata letak elemen, ornamen, seksi bebas, dan CSS tambahan di `Theme.masterOverrides`.
 * Setiap tema berdiri sendiri (tanpa hubungan induk/varian); berkas master asli di disk tidak ditimpa.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { applyMasterOverridesTo, type MasterOverrides } from "@/lib/masterOverrideCss";

export { masterColorGroups, masterTokens, parseMasterOverrides, type MasterOverrides } from "@/lib/masterOverrideCss";

/** Override yang dirusak di DB tidak ditulis ke CSS halaman tamu, tetapi dicatat. */
export function applyMasterOverrides(masterHtml: string, overrides: MasterOverrides, styleId = "lux-master-edits"): string {
  return applyMasterOverridesTo(masterHtml, overrides, (name) => logger.warn("MasterEdits", "Override tidak sah dilewati", { name: name.slice(0, 60) }), styleId);
}

/** Bentuk override dari kolom JSON DB; kolom yang bukan bentuknya diabaikan (nilai divalidasi lagi saat diterapkan). */
export function storedOverrides(raw: unknown): MasterOverrides | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<MasterOverrides>;
  return {
    colors: { ...(r.colors ?? {}) },
    fonts: { ...(r.fonts ?? {}) },
    ...(r.images && typeof r.images === "object" ? { images: { ...r.images } } : {}),
    ...(Array.isArray(r.hiddenSections) ? { hiddenSections: r.hiddenSections.filter((s): s is string => typeof s === "string") } : {}),
    ...(typeof r.css === "string" && r.css.trim() ? { css: r.css } : {}),
    ...(r.elements && typeof r.elements === "object" && !Array.isArray(r.elements) ? { elements: { ...r.elements } } : {}),
    ...(r.coverDesktop === "full" ? { coverDesktop: "full" as const } : {}),
    ...(Array.isArray(r.ornaments) ? { ornaments: r.ornaments } : {}),
    ...(Array.isArray(r.freeSections) ? { freeSections: r.freeSections } : {}),
    ...(r.sectionBackgrounds && typeof r.sectionBackgrounds === "object" && !Array.isArray(r.sectionBackgrounds) ? { sectionBackgrounds: { ...r.sectionBackgrounds } } : {}),
    ...(Array.isArray(r.sectionOrder) ? { sectionOrder: r.sectionOrder.filter((s): s is string => typeof s === "string") } : {}),
  };
}

const EDITS_TTL_MS = 30_000;
const editsCache = new Map<string, { at: number; value: MasterOverrides | null }>();

export function clearMasterEditsCache(themeId?: string): void {
  if (themeId) editsCache.delete(themeId);
  else editsCache.clear();
}

/** Suntingan Editor Master pada tema tulisan tangan mandiri, atau null jika belum disunting / tema builder. */
export async function resolveMasterEdits(themeId: string | null | undefined): Promise<MasterOverrides | null> {
  if (!themeId || !/^[a-z0-9_-]{1,80}$/i.test(themeId)) return null;
  const cached = editsCache.get(themeId);
  if (cached && Date.now() - cached.at < EDITS_TTL_MS) return cached.value;
  const row = await prisma.theme.findUnique({ where: { id: themeId }, select: { masterOverrides: true, builderSpec: true } });
  const value = row && row.builderSpec === null ? storedOverrides(row.masterOverrides) : null;
  editsCache.set(themeId, { at: Date.now(), value });
  return value;
}
