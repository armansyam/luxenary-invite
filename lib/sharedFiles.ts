import fs from "fs";
import path from "path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "./prisma";
import { privateBucketName, s3Client } from "./storage";
import { logger } from "./logger";
import { masterTemplateCache } from "./cache";

/**
 * Berkas yang dibuat aplikasi di disk server (master Theme Builder, aset tema, font, aset demo, musik, logo, foto uji,
 * arsip undangan) tidak ada di git, jadi server aplikasi lain tidak memilikinya. Setelah ditulis ke disk, berkas disalin
 * ke bucket privat `shared/<path>` dan dicatat di tabel shared_files beserta server asalnya. Setiap server menarik baris
 * yang ditulis server lain sebelum merender dan saat berkas tidak ditemukan; replika juga lewat cron. Sinkron dua arah
 * karena server mana pun dapat menulis (mis. arsip undangan dibuat saat klien menerbitkan ulang dari replika).
 *
 * Penyimpanan bersama: bucket privat R2 (S3_BACKUP_BUCKET_NAME), atau folder `SHARED_STORE_DIR` (uji lokal tanpa R2).
 * Tanpa keduanya penyalinan dilewati: satu server saja tidak membutuhkannya.
 */
export const SHARED_ROOTS = [
  "themes",
  "public/demo",
  "public/uploads/theme-assets",
  "public/uploads/fonts",
  "public/uploads/demo",
  "public/uploads/music",
  "public/uploads/brand",
  "public/uploads/builder-sim",
  "data/archives",
];

interface SharedStore {
  put(key: string, body: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

export function sharedStore(): SharedStore | null {
  const dir = process.env.SHARED_STORE_DIR?.trim();
  if (dir) {
    const full = (key: string) => path.join(dir, key);
    return {
      put: async (key, body) => {
        await fs.promises.mkdir(path.dirname(full(key)), { recursive: true });
        await fs.promises.writeFile(full(key), body);
      },
      get: (key) => fs.promises.readFile(full(key)).catch((err: NodeJS.ErrnoException) => {
        if (err.code === "ENOENT") return null;
        throw err;
      }),
      remove: (key) => fs.promises.rm(full(key), { force: true }),
    };
  }
  const bucket = privateBucketName();
  if (!bucket || !s3Client) return null;
  const client = s3Client;
  return {
    put: async (key, body) => {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, CacheControl: "private, no-store" }));
    },
    get: async (key) => {
      try {
        const data = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return data.Body ? Buffer.from(await data.Body.transformToByteArray()) : null;
      } catch (err) {
        if ((err as { name?: string }).name === "NoSuchKey") return null;
        throw err;
      }
    },
    remove: async (key) => {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

/** Nama server ini (shared_files.origin, header X-Lux-Server); wajib diisi dan unik di setiap replika (deploy.sh). */
export const serverName = () => process.env.LUX_SERVER_NAME?.trim() || "utama";

const objectKey = (relPath: string) => `shared/${relPath}`;

/** Path relatif proyek berpemisah "/", atau null bila berkas di luar folder yang dibagikan. */
export function sharedRelativePath(absPath: string): string | null {
  const rel = path.relative(process.cwd(), path.resolve(absPath)).split(path.sep).join("/");
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  if (!SHARED_ROOTS.some((root) => rel === root || rel.startsWith(`${root}/`))) return null;
  // HTML demo dan HTML terbit adalah cache yang dibangun ulang tiap server (lib/renderVersion.ts).
  if (rel.startsWith("public/demo/") && rel.endsWith("/index.html")) return null;
  return rel;
}

function requireRelative(absPath: string): string {
  const rel = sharedRelativePath(absPath);
  if (!rel) throw new Error(`Berkas di luar folder bersama: ${absPath}`);
  return rel;
}

export function filesUnder(absDir: string): string[] {
  if (!fs.existsSync(absDir)) return [];
  return fs.readdirSync(absDir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return entry.isFile() ? [full] : [];
  });
}

/** Menyalin berkas yang baru ditulis ke disk ke penyimpanan bersama. */
export async function shareFile(absPath: string): Promise<void> {
  const rel = requireRelative(absPath);
  const store = sharedStore();
  if (!store) return;
  const body = await fs.promises.readFile(absPath);
  await store.put(objectKey(rel), body);
  await prisma.$executeRaw`
    INSERT INTO shared_files (path, size, origin, updated_at, deleted_at) VALUES (${rel}, ${body.length}, ${serverName()}, now(), NULL)
    ON CONFLICT (path) DO UPDATE SET size = EXCLUDED.size, origin = EXCLUDED.origin, updated_at = now(), deleted_at = NULL`;
}

export async function shareDirectory(absDir: string): Promise<void> {
  for (const file of filesUnder(absDir)) {
    if (sharedRelativePath(file)) await shareFile(file);
  }
}

/** Dipanggil setelah berkas atau folder dihapus dari disk: hapus salinannya dan tandai agar replika ikut menghapus. */
export async function unshareFiles(absPath: string): Promise<void> {
  const rel = requireRelative(absPath);
  const store = sharedStore();
  if (!store) return;
  const rows = await prisma.sharedFile.findMany({
    where: { deletedAt: null, OR: [{ path: rel }, { path: { startsWith: `${rel}/` } }] },
    select: { path: true },
  });
  for (const row of rows) await store.remove(objectKey(row.path));
  // Waktu ditulis dengan now() di SQL: parameter DateTime lewat adapter pg dikirim tanpa zona dan bergeser sebesar
  // selisih zona waktu sesi (sama seperti rateLimitDb di lib/rateLimit.ts), sehingga replika melewatkan baris ini.
  const paths = rows.map((r) => r.path);
  if (paths.length) await prisma.$executeRaw`UPDATE shared_files SET origin = ${serverName()}, updated_at = now(), deleted_at = now() WHERE path = ANY(${paths})`;
}

// --- Sinkron antar server ---

const STATE_FILE = path.join(process.cwd(), "data", "shared-files-state.json");
// Baris dengan updated_at lebih awal bisa ter-commit setelah sinkron membaca baris yang lebih baru; jendela ini
// membaca ulang baris di sekitar tanda air, dan baris yang sudah ditarik dilewati lewat `files`.
const OVERLAP_MICROS = BigInt(60_000_000);
const MIN_INTERVAL_MS = 2_000;

// Penanda waktu dibaca sebagai epoch mikrodetik (teks) dari SQL: adapter pg menggeser timestamptz sebesar selisih zona
// waktu, baik saat menulis parameter maupun saat membaca kolom.
interface SharedRow {
  path: string;
  stamp: string;
  deleted: boolean;
}

async function applyRow(store: SharedStore, row: Pick<SharedRow, "path" | "deleted">): Promise<void> {
  const segments = row.path.split("/");
  if (
    !SHARED_ROOTS.some((root) => row.path === root || row.path.startsWith(`${root}/`)) ||
    segments.some((seg) => !seg || seg === "." || seg === "..")
  ) {
    throw new Error(`Path berkas bersama tidak valid: ${row.path}`);
  }
  const target = path.join(/*turbopackIgnore: true*/ process.cwd(), ...segments);
  if (row.deleted) {
    await fs.promises.rm(target, { force: true });
  } else {
    const body = await store.get(objectKey(row.path));
    if (!body) throw new Error(`Berkas bersama ${row.path} tercatat tetapi tidak ada di penyimpanan`);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.${process.pid}.tmp`;
    await fs.promises.writeFile(temp, body);
    await fs.promises.rename(temp, target);
  }
  if (row.path.startsWith("themes/")) masterTemplateCache.delete(target);
}

interface SyncState {
  watermark: string | null;
  files: Record<string, string>;
}

let state: SyncState | null = null;
let inFlight: Promise<number> | null = null;
let lastSyncAt = 0;

function loadState(): SyncState {
  if (state) return state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as SyncState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn("SharedFiles", "Status sinkron tidak terbaca; semua berkas diperiksa ulang", { error: err instanceof Error ? err.message : String(err) });
    }
    state = { watermark: null, files: {} };
  }
  return state;
}

async function saveState(s: SyncState): Promise<void> {
  await fs.promises.mkdir(path.dirname(STATE_FILE), { recursive: true });
  const temp = `${STATE_FILE}.${process.pid}.tmp`;
  await fs.promises.writeFile(temp, JSON.stringify(s));
  await fs.promises.rename(temp, STATE_FILE);
}

async function pullChanges(): Promise<number> {
  const store = sharedStore();
  if (!store) return 0;
  const s = loadState();
  const since = s.watermark ? (BigInt(s.watermark) - OVERLAP_MICROS).toString() : "0";
  const rows = await prisma.$queryRaw<SharedRow[]>`
    SELECT path, (extract(epoch FROM updated_at) * 1000000)::bigint::text AS stamp, deleted_at IS NOT NULL AS deleted
    FROM shared_files
    WHERE updated_at > to_timestamp(${since}::numeric / 1000000) AND origin <> ${serverName()}
    ORDER BY updated_at`;
  let changed = 0;
  let failed = false;
  for (const row of rows) {
    if (s.files[row.path] === row.stamp) continue;
    try {
      await applyRow(store, row);
    } catch (err) {
      // Satu berkas yang gagal tidak menahan berkas lain; tanpa catatan stamp berkas ini dicoba lagi pada sinkron berikutnya.
      failed = true;
      logger.error("SharedFiles", "Berkas bersama gagal ditarik", err, { path: row.path });
      continue;
    }
    s.files[row.path] = row.stamp;
    changed++;
  }
  // Tanda air hanya maju bila semua baris berhasil, agar baris yang gagal tetap terbaca pada sinkron berikutnya.
  if (rows.length && !failed) s.watermark = rows[rows.length - 1].stamp;
  if (changed || rows.length) await saveState(s);
  return changed;
}

/**
 * Menarik berkas bersama yang ditulis server lain sejak sinkron terakhir. Panggilan bersamaan berbagi satu proses sinkron,
 * dan panggilan dalam 2 detik setelah sinkron selesai dilewati kecuali `force`. Tanpa penyimpanan bersama tidak berbuat apa-apa.
 */
export async function syncSharedFiles(options: { force?: boolean } = {}): Promise<number> {
  if (!sharedStore()) return 0;
  if (inFlight) return inFlight;
  if (!options.force && Date.now() - lastSyncAt < MIN_INTERVAL_MS) return 0;
  inFlight = pullChanges().finally(() => {
    lastSyncAt = Date.now();
    inFlight = null;
  });
  return inFlight;
}

/**
 * Tarik perubahan terbaru; bila berkas yang diminta tetap tidak ada di disk (mis. terhapus setelah pernah ditarik),
 * berkas itu sendiri diambil dari penyimpanan bila tercatat.
 */
export async function ensureSharedFile(absPath: string): Promise<void> {
  if (!sharedStore()) return;
  await syncSharedFiles();
  if (fs.existsSync(absPath)) return;
  const rel = sharedRelativePath(absPath);
  const store = sharedStore();
  if (!rel || !store) return;
  const row = await prisma.sharedFile.findUnique({ where: { path: rel }, select: { deletedAt: true } });
  if (row && !row.deletedAt) await applyRow(store, { path: rel, deleted: false });
}
