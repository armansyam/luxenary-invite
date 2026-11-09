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
export function applyMasterOverrides(parentHtml: string, overrides: MasterOverrides): string {
  return applyMasterOverridesTo(parentHtml, overrides, (name) => logger.warn("ThemeVariants", "Override tidak sah dilewati", { name: name.slice(0, 60) }));
}

export interface VariantInfo {
  parentId: string;
  overrides: MasterOverrides;
}

// Varian jarang berubah; cache singkat menghindari kueri DB di setiap render undangan varian. Rute admin
// memanggil clearVariantCache saat varian disimpan (proses lain menyusul setelah TTL).
const VARIANT_TTL_MS = 30_000;
const variantCache = new Map<string, { at: number; value: VariantInfo | null }>();

export function clearVariantCache(themeId?: string): void {
  if (themeId) variantCache.delete(themeId);
  else variantCache.clear();
}

/** Varian untuk id tema, atau null bila tema itu bukan varian (master biasa, tema builder, atau tidak ada). */
export async function resolveVariant(themeId: string | null | undefined): Promise<VariantInfo | null> {
  if (!themeId || !/^[a-z0-9_-]{1,80}$/i.test(themeId)) return null;
  const cached = variantCache.get(themeId);
  if (cached && Date.now() - cached.at < VARIANT_TTL_MS) return cached.value;
  const row = await prisma.theme.findUnique({ where: { id: themeId }, select: { parentTheme: true, masterOverrides: true } });
  const raw = row?.masterOverrides as Partial<MasterOverrides> | null | undefined;
  const value: VariantInfo | null = row?.parentTheme && raw && typeof raw === "object"
    ? { parentId: row.parentTheme, overrides: { colors: { ...(raw.colors ?? {}) }, fonts: { ...(raw.fonts ?? {}) } } }
    : null;
  variantCache.set(themeId, { at: Date.now(), value });
  return value;
}
