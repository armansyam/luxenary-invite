import fs from "fs";
import path from "path";
import { parseThemeMediaSlots, type ThemeMediaSlots } from "@/lib/themeMediaSlots";

let cachedCatalog: Record<string, ThemeMediaSlots> | null = null;

/**
 * Memuat katalog deklarasi slot media bawaan untuk seluruh tema master (`lib/themeMediaSlotsCatalog.json`).
 * Setiap entri disaring melalui `parseThemeMediaSlots` agar selalu mematuhi kontrak `ThemeMediaSlots`.
 */
export function loadThemeMediaSlotsCatalog(forceReload = false): Record<string, ThemeMediaSlots> {
  if (cachedCatalog && !forceReload) return cachedCatalog;

  const catalogPath = path.join(process.cwd(), "lib", "themeMediaSlotsCatalog.json");
  if (!fs.existsSync(catalogPath)) {
    cachedCatalog = {};
    return cachedCatalog;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as Record<string, unknown>;
    const normalized: Record<string, ThemeMediaSlots> = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [themeId, rawSlots] of Object.entries(raw)) {
        const key = themeId.trim().toLowerCase();
        if (!key) continue;
        const parsed = parseThemeMediaSlots(rawSlots);
        if (parsed && Object.keys(parsed).length > 0) {
          normalized[key] = parsed;
        }
      }
    }
    cachedCatalog = normalized;
    return cachedCatalog;
  } catch {
    cachedCatalog = {};
    return cachedCatalog;
  }
}

/**
 * Mengembalikan deklarasi slot media bawaan untuk satu tema master, atau `null` bila belum tersedia di katalog.
 */
export function getCatalogMediaSlots(themeId: string): ThemeMediaSlots | null {
  const key = String(themeId || "").trim().toLowerCase();
  if (!key) return null;
  const catalog = loadThemeMediaSlotsCatalog();
  return catalog[key] ?? null;
}
