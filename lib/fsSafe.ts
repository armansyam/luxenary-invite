import fs from "fs";
import { logger } from "@/lib/logger";

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
