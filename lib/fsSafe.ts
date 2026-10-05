import fs from "fs";
import { logger } from "@/lib/logger";

/**
 * Nilai dari URL atau body (slug portofolio, ID tema) yang akan menjadi satu segmen path di disk. Hanya huruf,
 * angka, `-`, dan `_`: tanpa titik atau garis miring sehingga `../` tidak dapat keluar dari folder tujuan.
 */
export function isSafePathSegment(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(value);
}

/**
 * Menghapus berkas atau folder bila ada. Berkas yang memang tidak ada bukan masalah (force: true);
 * galat lain (izin, I/O) dicatat sebagai peringatan alih-alih ditelan, dan tidak menggagalkan pemanggil
 * karena pembersihan adalah pekerjaan sampingan.
 */
export async function removeIfExists(target: string, options?: { recursive?: boolean }): Promise<void> {
  try {
    await fs.promises.rm(target, { recursive: options?.recursive ?? false, force: true });
  } catch (err) {
    logger.warn("FsCleanup", "Gagal menghapus berkas", {
      target,
      code: (err as NodeJS.ErrnoException).code,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
