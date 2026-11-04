/**
 * Worker antrean thumbnail katalog (dijalankan `lib/themeThumbnailJob.ts`, bukan manual).
 * Per tema: kompilasi demo statis, potret `/demo/<id>` mobile 400x800 dan desktop 1280x800 lewat
 * `generate-all-thumbnails.ts`, periksa berkasnya baru, bersihkan cache Cloudflare kedua URL, tulis `<id>.json`.
 *
 * Hanya satu worker bekerja (advisory lock PostgreSQL); worker lain yang gagal mengambil lock langsung keluar karena
 * pemegang lock memeriksa antrean lagi setelah melepasnya. Butuh Chrome (CHROME_PATH atau lokasi standar).
 */
import "dotenv/config";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { compileAndSaveStaticDemo } from "../lib/demoPublisher";
import { purgeCloudflareCache } from "../lib/cloudflare";
import { prisma, pool } from "../lib/prisma";
import { THUMBNAIL_JOB_DIR } from "../lib/themeThumbnailJob";

const LOCK_KEY = 74_110_401;
const CAPTURE_TIMEOUT_MS = 3 * 60 * 1000;
const THUMBNAIL_FILES = ["thumbnail_mobile.webp", "thumbnail_desktop.webp"];

const queued = () =>
  fs.existsSync(THUMBNAIL_JOB_DIR) ? fs.readdirSync(THUMBNAIL_JOB_DIR).filter((f) => f.endsWith(".queued")).map((f) => f.slice(0, -".queued".length)) : [];

function writeResult(themeId: string, ok: boolean, error?: string) {
  fs.writeFileSync(path.join(THUMBNAIL_JOB_DIR, `${themeId}.json`), JSON.stringify({ ok, finishedAt: new Date().toISOString(), error }));
}

async function capture(themeId: string) {
  const startedAt = Date.now();
  await compileAndSaveStaticDemo(themeId);
  try {
    execFileSync(path.join("node_modules", ".bin", "tsx"), [path.join("scripts", "generate-all-thumbnails.ts"), themeId], {
      stdio: ["ignore", "inherit", "pipe"],
      env: process.env,
      timeout: CAPTURE_TIMEOUT_MS,
    });
  } catch (err) {
    // Penyebab (mis. Chrome tidak ditemukan) ada di stderr skrip pemotret, bukan di pesan "Command failed".
    const stderr = String((err as { stderr?: Buffer }).stderr ?? "");
    process.stderr.write(stderr);
    const cause = stderr.split("\n").find((line) => /^(Fatal:|.*ERROR:)/.test(line.trim()));
    throw new Error(cause ? cause.trim().replace(/^Fatal:\s*(Error:\s*)?/, "") : "Pemotretan gagal; lihat data/theme-thumbnails/worker.log");
  }
  const missing = THUMBNAIL_FILES.filter((file) => {
    const target = path.join(process.cwd(), "public", "demo", themeId, file);
    return !fs.existsSync(target) || fs.statSync(target).size < 1024 || fs.statSync(target).mtimeMs < startedAt;
  });
  if (missing.length) throw new Error(`Thumbnail tidak terbentuk: ${missing.join(", ")}`);

  // /demo/* disimpan Cloudflare 7 hari (next.config.ts); tanpa purge katalog tetap menampilkan gambar lama.
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (origin.startsWith("https://")) {
    const cf = await purgeCloudflareCache({ files: THUMBNAIL_FILES.map((file) => `${origin}/demo/${themeId}/${file}`) });
    if (!cf.success && !cf.skipped) console.error(`[${themeId}] Purge Cloudflare gagal:`, cf);
  }
}

async function drainQueue() {
  // Hanya pemegang lock yang memproses, jadi penanda .running yang tersisa berasal dari worker yang mati: diantrekan ulang.
  for (const f of fs.readdirSync(THUMBNAIL_JOB_DIR).filter((name) => name.endsWith(".running"))) {
    fs.renameSync(path.join(THUMBNAIL_JOB_DIR, f), path.join(THUMBNAIL_JOB_DIR, f.replace(/\.running$/, ".queued")));
  }
  for (let ids = queued(); ids.length; ids = queued()) {
    for (const themeId of ids) {
      const running = path.join(THUMBNAIL_JOB_DIR, `${themeId}.running`);
      fs.renameSync(path.join(THUMBNAIL_JOB_DIR, `${themeId}.queued`), running);
      console.log(`[${new Date().toISOString()}] ${themeId}: mulai`);
      try {
        await capture(themeId);
        writeResult(themeId, true);
        console.log(`[${new Date().toISOString()}] ${themeId}: selesai`);
      } catch (err) {
        const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
        writeResult(themeId, false, message);
        console.error(`[${new Date().toISOString()}] ${themeId}: gagal: ${message}`);
      } finally {
        fs.rmSync(running, { force: true });
      }
    }
  }
}

async function main() {
  const client = await pool.connect();
  try {
    for (;;) {
      const { rows } = await client.query("SELECT pg_try_advisory_lock($1) AS ok", [LOCK_KEY]);
      if (!rows[0].ok) return;
      try {
        await drainQueue();
      } finally {
        await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
      }
      if (!queued().length) return;
    }
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("Worker thumbnail berhenti:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
