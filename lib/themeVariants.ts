/**
 * Varian Tema: baris `Theme` baru yang menumpang ke master tulisan tangan (`parentTheme`) dan menimpa variabel `:root`
 * master itu (`masterOverrides`). Berkas master tidak pernah disalin atau ditulis; saat render, master induk dibaca lalu
 * diberi `<style id="lux-master-overrides">`. Master sudah ditokenisasi (lib/themeTokenize.ts), sehingga warna dan huruf
 * yang tadinya tertulis langsung ikut berganti.
 *
 * Path master induk diselesaikan pemanggil (renderTemplate, rute admin) agar modul ini tidak mengimpor renderTemplate.
 * Fungsi murni (token, validasi, CSS) ada di lib/themeVariantCss.ts agar bisa dipakai editor di peramban.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { applyMasterOverridesTo, type MasterOverrides } from "@/lib/themeVariantCss";

export { masterColorGroups, masterTokens, parseMasterOverrides, type MasterOverrides } from "@/lib/themeVariantCss";

/** Override yang dirusak di DB tidak ditulis ke CSS halaman tamu, tetapi dicatat. */
export function applyMasterOverrides(parentHtml: string, overrides: MasterOverrides, styleId?: string): string {
  return applyMasterOverridesTo(parentHtml, overrides, (name) => logger.warn("ThemeVariants", "Override tidak sah dilewati", { name: name.slice(0, 60) }), styleId);
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
  };
}

export interface VariantInfo {
  parentId: string;
  overrides: MasterOverrides;
}

// Varian jarang berubah; cache singkat menghindari kueri DB di setiap render undangan varian. Rute admin
// memanggil clearVariantCache saat varian disimpan (proses lain menyusul setelah TTL).
const VARIANT_TTL_MS = 30_000;
interface ThemeOverrideRow { parentId: string | null; overrides: MasterOverrides | null }
const overrideCache = new Map<string, { at: number; value: ThemeOverrideRow }>();

export function clearVariantCache(themeId?: string): void {
  if (themeId) overrideCache.delete(themeId);
  else overrideCache.clear();
}

async function themeOverrideRow(themeId: string | null | undefined): Promise<ThemeOverrideRow> {
  if (!themeId || !/^[a-z0-9_-]{1,80}$/i.test(themeId)) return { parentId: null, overrides: null };
  const cached = overrideCache.get(themeId);
  if (cached && Date.now() - cached.at < VARIANT_TTL_MS) return cached.value;
  const row = await prisma.theme.findUnique({ where: { id: themeId }, select: { parentTheme: true, masterOverrides: true, builderSpec: true } });
  const value: ThemeOverrideRow = row && row.builderSpec === null
    ? { parentId: row.parentTheme ?? null, overrides: storedOverrides(row.masterOverrides) }
    : { parentId: null, overrides: null };
  overrideCache.set(themeId, { at: Date.now(), value });
  return value;
}

/** Varian untuk id tema, atau null bila tema itu bukan varian (master biasa, tema builder, atau tidak ada). */
export async function resolveVariant(themeId: string | null | undefined): Promise<VariantInfo | null> {
  const row = await themeOverrideRow(themeId);
  return row.parentId && row.overrides ? { parentId: row.parentId, overrides: row.overrides } : null;
}

/**
 * Suntingan Editor Master pada master tulisan tangan itu sendiri (baris tanpa `parentTheme`), atau null. Diterapkan di
 * bawah override varian sehingga varian ikut mewarisi gambar, seksi, dan CSS yang disunting pada master induknya.
 */
export async function resolveMasterEdits(themeId: string | null | undefined): Promise<MasterOverrides | null> {
  const row = await themeOverrideRow(themeId);
  return !row.parentId && row.overrides ? row.overrides : null;
}
