import fs from "fs";
import path from "path";
import { isSafePathSegment } from "@/lib/fsSafe";
import { safeCssColor } from "@/lib/safeCss";
import { logger } from "@/lib/logger";

/**
 * Warna utama tema (`--primary` di blok :root) dari piring draf undangan, yaitu salinan master yang benar-benar dirender
 * untuk undangan itu. Slot milik tema yang kosong dan tanpa gambar bawaan jatuh ke palet tema; Studio menampilkan warna
 * ini agar klien tahu apa yang dipakai. Kosong bila draf tidak ada atau tidak mendefinisikan warna yang sah.
 */
export function themeMainColor(invitationId: string): string {
  if (!isSafePathSegment(invitationId)) return "";
  const file = path.join(process.cwd(), "data", "drafts", `${invitationId}.html`);
  let html: string;
  try {
    html = fs.readFileSync(file, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn("ThemePalette", "Piring draf tidak terbaca; warna utama tema dilewati", { invitationId, error: err instanceof Error ? err.message : String(err) });
    }
    return "";
  }
  const root = html.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const value = root.match(/--primary\s*:\s*([^;]+);/)?.[1] ?? "";
  return safeCssColor(value, "");
}
