/**
 * Antrean thumbnail katalog yang dipotret di server (`scripts/theme-thumbnail-worker.ts`, Chrome headless).
 *
 * Permintaan hanya menulis berkas penanda `<id>.queued` lalu menyalakan worker terpisah, sehingga request admin tidak
 * menunggu Chrome. Antrean di disk dipakai bersama kedua instance PM2; worker memegang advisory lock PostgreSQL agar
 * hanya satu Chrome berjalan, dan permintaan beruntun untuk tema yang sama menyatu menjadi satu pemotretan.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { isSafePathSegment } from "./fsSafe";
import { logger } from "./logger";

export const THUMBNAIL_JOB_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "theme-thumbnails");

export type ThumbnailJobState = "idle" | "queued" | "running" | "done" | "failed";

export interface ThumbnailJobStatus {
  state: ThumbnailJobState;
  finishedAt?: string;
  error?: string;
}

export function requestThemeThumbnails(themeId: string): void {
  if (!isSafePathSegment(themeId)) throw new Error(`ID tema tidak valid: ${JSON.stringify(themeId)}`);
  fs.mkdirSync(THUMBNAIL_JOB_DIR, { recursive: true });
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ THUMBNAIL_JOB_DIR, `${themeId}.queued`), new Date().toISOString());
  startWorker();
}

function startWorker(): void {
  const cwd = /*turbopackIgnore: true*/ process.cwd();
  const log = fs.openSync(path.join(/*turbopackIgnore: true*/ THUMBNAIL_JOB_DIR, "worker.log"), "a");
  const child = spawn(path.join(cwd, "node_modules", ".bin", "tsx"), [path.join("scripts", "theme-thumbnail-worker.ts")], {
    cwd,
    detached: true,
    stdio: ["ignore", log, log],
    // Chrome memotret server ini sendiri, bukan domain publik, agar hasilnya tidak bergantung pada cache Cloudflare.
    env: { ...process.env, APP_URL: `http://127.0.0.1:${process.env.PORT || 3000}` },
  });
  child.on("error", (err) => logger.error("ThemeThumbnail", "Worker thumbnail gagal dijalankan", err));
  child.unref();
  fs.closeSync(log);
}

export function themeThumbnailStatus(themeId: string): ThumbnailJobStatus {
  if (!isSafePathSegment(themeId)) return { state: "idle" };
  const file = (ext: string) => path.join(/*turbopackIgnore: true*/ THUMBNAIL_JOB_DIR, `${themeId}.${ext}`);
  if (fs.existsSync(file("running"))) return { state: "running" };
  if (fs.existsSync(file("queued"))) return { state: "queued" };
  if (!fs.existsSync(file("json"))) return { state: "idle" };
  const result = JSON.parse(fs.readFileSync(file("json"), "utf8")) as { ok: boolean; finishedAt: string; error?: string };
  return { state: result.ok ? "done" : "failed", finishedAt: result.finishedAt, error: result.error };
}
