import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { STORAGE_PROVIDER, s3Client } from "@/lib/storage";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface SnapshotItem {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  isSafetyBackup: boolean;
}

export interface BackupPathInfo {
  configuredPath: string;
  resolvedPath: string;
  isRelative: boolean;
  isValid: boolean;
  isWritable: boolean;
  isFallback: boolean;
  fallbackPath: string;
  error?: string;
  fixCommand?: string;
  locationType: "PROJECT_INTERNAL" | "EXTERNAL_MOUNT" | "CUSTOM_PATH";
}

// Inspeksi path direktori backup, uji izin tulis via file canary, dan siapkan perintah perbaikan jika gagal
export async function inspectBackupPath(configuredPath?: string): Promise<BackupPathInfo> {
  const fallbackPath = path.resolve(process.cwd(), "data", "backups");
  try {
    await fs.promises.mkdir(fallbackPath, { recursive: true });
  } catch {}

  const rawPath = (configuredPath || "").trim();
  const effectiveConfigured = rawPath || "./data/backups";

  // Deteksi traversal berbahaya
  if (effectiveConfigured.includes("..")) {
    return {
      configuredPath: effectiveConfigured,
      resolvedPath: fallbackPath,
      isRelative: false,
      isValid: false,
      isWritable: false,
      isFallback: true,
      fallbackPath,
      error: "Path tidak diizinkan mengandung direktori traversal (..)",
      locationType: "CUSTOM_PATH",
    };
  }

  let targetPath: string;
  let isRelative: boolean;

  if (effectiveConfigured === "./data/backups" || effectiveConfigured === "data/backups") {
    targetPath = fallbackPath;
    isRelative = true;
  } else if (effectiveConfigured === "/data/backups") {
    // Penanganan backward compatibility untuk nilai default lama /data/backups
    let hasRootData = false;
    try {
      hasRootData = fs.existsSync("/data/backups");
    } catch {}
    if (hasRootData) {
      targetPath = "/data/backups";
      isRelative = false;
    } else {
      targetPath = fallbackPath;
      isRelative = true;
    }
  } else if (effectiveConfigured.startsWith("./") || !path.isAbsolute(effectiveConfigured)) {
    targetPath = path.resolve(process.cwd(), effectiveConfigured);
    isRelative = true;
  } else {
    targetPath = path.normalize(effectiveConfigured);
    isRelative = false;
  }

  const isExternalMount = !isRelative && (
    targetPath.startsWith("/mnt") ||
    targetPath.startsWith("/media") ||
    targetPath.startsWith("/Volumes") ||
    targetPath.startsWith("/opt")
  );
  const locationType = isRelative ? "PROJECT_INTERNAL" : (isExternalMount ? "EXTERNAL_MOUNT" : "CUSTOM_PATH");

  // 1. Uji pembuatan folder jika belum ada
  try {
    await fs.promises.mkdir(targetPath, { recursive: true });
  } catch (mkdirErr: any) {
    const detail = mkdirErr.message || String(mkdirErr);
    const fixCmd = `sudo mkdir -p "${targetPath}" && sudo chown -R $USER:$USER "${targetPath}" && sudo chmod -R 775 "${targetPath}"`;
    return {
      configuredPath: effectiveConfigured,
      resolvedPath: fallbackPath,
      isRelative,
      isValid: false,
      isWritable: false,
      isFallback: true,
      fallbackPath,
      error: `Gagal mengakses/membuat folder target: ${detail}`,
      fixCommand: fixCmd,
      locationType,
    };
  }

  // 2. Uji izin tulis via file canary sementara
  const canaryFile = path.join(targetPath, `.canary_test_${Date.now()}`);
  try {
    await fs.promises.writeFile(canaryFile, "test", { encoding: "utf8" });
    await fs.promises.unlink(canaryFile);
  } catch (writeErr: any) {
    const detail = writeErr.message || String(writeErr);
    const fixCmd = `sudo chown -R $USER:$USER "${targetPath}" && sudo chmod -R 775 "${targetPath}"`;
    return {
      configuredPath: effectiveConfigured,
      resolvedPath: fallbackPath,
      isRelative,
      isValid: false,
      isWritable: false,
      isFallback: true,
      fallbackPath,
      error: `Izin tulis ditolak (Permission Denied): ${detail}`,
      fixCommand: fixCmd,
      locationType,
    };
  }

  // Berhasil & Writable
  return {
    configuredPath: effectiveConfigured,
    resolvedPath: targetPath,
    isRelative,
    isValid: true,
    isWritable: true,
    isFallback: false,
    fallbackPath,
    locationType,
  };
}

// Dapatkan direktori backup yang valid terisolasi di dalam folder data/backups
export async function getBackupDirectory(configuredPath?: string): Promise<string> {
  const info = await inspectBackupPath(configuredPath);
  return info.isFallback ? info.fallbackPath : info.resolvedPath;
}

// Format bytes ke KB / MB
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Dapatkan URL database aktif saat ini
export async function getActiveDbUrl(): Promise<string> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL tidak ditemukan di environment");
  }
  return url;
}

// Bersihkan URL database agar kompatibel dengan PostgreSQL CLI (pg_dump & pg_restore)
// Prisma menambahkan parameter seperti ?schema=public&connection_limit=... yang ditolak oleh libpq
export function getLibpqDbUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const NON_LIBPQ_PARAMS = [
      "schema",
      "connection_limit",
      "pool_timeout",
      "connect_timeout",
      "socket_timeout",
      "statement_cache_size",
      "pgbouncer",
    ];
    for (const param of NON_LIBPQ_PARAMS) {
      parsed.searchParams.delete(param);
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

// Buat snapshot database instan
export async function createDatabaseSnapshot(customLabel?: string): Promise<{ filename: string; sizeBytes: number; sizeFormatted: string; path: string; offsiteSynced?: boolean }> {
  let backupPathSetting: string | undefined;
  try {
    const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
    if (s?.value) backupPathSetting = s.value;
  } catch {}

  const backupDir = await getBackupDirectory(backupPathSetting);
  const rawDbUrl = await getActiveDbUrl();
  const libpqDbUrl = getLibpqDbUrl(rawDbUrl);

  // Format penamaan: snapshot_{YYYY-MM-DD_HH-mm-ss}_{label}.sql
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const labelSuffix = customLabel ? `_${customLabel.replace(/[^a-zA-Z0-9_-]/g, "")}` : "";
  const filename = `snapshot_${timestamp}${labelSuffix}.sql`;
  const targetPath = path.join(backupDir, filename);

  // Jalankan pg_dump untuk membackup database
  try {
    await execFileAsync("pg_dump", [libpqDbUrl, "-F", "c", "-f", targetPath]);
  } catch (error: any) {
    const detail = error.stderr ? String(error.stderr).trim() : (error.message || String(error));
    throw new Error(`Gagal membuat backup PostgreSQL: ${detail}`);
  }

  const stat = await fs.promises.stat(targetPath);

  // Jalankan retensi otomatis (hapus snapshot lama jika melebihi batas)
  try {
    let retentionLimit = 10;
    const rSetting = await prisma.adminSetting.findUnique({ where: { key: "backup_retention_count" } });
    if (rSetting?.value) retentionLimit = parseInt(rSetting.value, 10) || 10;

    await pruneOldSnapshots(retentionLimit, backupDir);
  } catch {}

  // Replikasi Off-Site ke Cloudflare R2 / S3 jika terkonfigurasi (Disaster Recovery)
  let offsiteSynced = false;
  if ((STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") && s3Client && process.env.S3_BUCKET_NAME) {
    try {
      const fileBuffer = await fs.promises.readFile(targetPath);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `backups/database/${filename}`,
          Body: fileBuffer,
          ContentType: "application/octet-stream",
        })
      );
      offsiteSynced = true;
      console.log(`[Backup Engine] Off-site snapshot berhasil diunggah ke R2: backups/database/${filename}`);
    } catch (r2Err: any) {
      console.warn(`[Backup Engine] Gagal mengunggah snapshot ke R2 (Off-site backup skipped):`, r2Err.message);
    }
  }

  return {
    filename,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    path: targetPath,
    offsiteSynced,
  };
}

// Ambil daftar seluruh file snapshot
export async function listDatabaseSnapshots(): Promise<SnapshotItem[]> {
  let backupPathSetting: string | undefined;
  try {
    const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
    if (s?.value) backupPathSetting = s.value;
  } catch {}

  const backupDir = await getBackupDirectory(backupPathSetting);
  try {
    await fs.promises.access(backupDir);
  } catch {
    return [];
  }

  const files = await fs.promises.readdir(backupDir);

  const snapshots: SnapshotItem[] = [];

  for (const f of files) {
    if (!f.endsWith(".sql") && !f.endsWith(".backup")) continue;
    const fullPath = path.join(backupDir, f);
    try {
      const stat = await fs.promises.stat(fullPath);
      snapshots.push({
        filename: f,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        isSafetyBackup: f.startsWith("safety_") || f.includes("pre_restore"),
      });
    } catch {}
  }

  // Urutkan dari yang paling baru
  snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return snapshots;
}

// Restore database dari snapshot
export async function restoreDatabaseSnapshot(filename: string): Promise<{ success: boolean; safetySnapshot: string; restoredFrom: string }> {
  const safeName = path.basename(filename);
  let backupPathSetting: string | undefined;
  try {
    const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
    if (s?.value) backupPathSetting = s.value;
  } catch {}

  const backupDir = await getBackupDirectory(backupPathSetting);
  const snapshotPath = path.join(backupDir, safeName);

  try {
    await fs.promises.access(snapshotPath);
  } catch {
    throw new Error(`File snapshot "${safeName}" tidak ditemukan di direktori backup.`);
  }

  // 1. Buat safety backup dari database aktif saat ini sebelum ditimpa
  const safety = await createDatabaseSnapshot("pre_restore");

  // 2. Timpa database aktif dengan file snapshot menggunakan pg_restore
  const rawDbUrl = await getActiveDbUrl();
  const libpqDbUrl = getLibpqDbUrl(rawDbUrl);
  try {
    // Kita hapus database dulu dan buat ulang (secara clean) atau timpa menggunakan pg_restore -c
    await execFileAsync("pg_restore", ["--clean", "--if-exists", "-d", libpqDbUrl, snapshotPath]);
  } catch (error: any) {
    const detail = error.stderr ? String(error.stderr).trim() : (error.message || String(error));
    throw new Error(`Gagal mengembalikan backup PostgreSQL: ${detail}`);
  }

  return {
    success: true,
    safetySnapshot: safety.filename,
    restoredFrom: safeName,
  };
}

// Hapus snapshot tertentu
export async function deleteDatabaseSnapshot(filename: string): Promise<{ success: boolean }> {
  // Cegah directory traversal
  const safeName = path.basename(filename);
  let backupPathSetting: string | undefined;
  try {
    const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
    if (s?.value) backupPathSetting = s.value;
  } catch {}

  const backupDir = await getBackupDirectory(backupPathSetting);
  const targetPath = path.join(backupDir, safeName);

  try {
    await fs.promises.access(targetPath);
    await fs.promises.unlink(targetPath);
  } catch {}

  // Sinkronisasi hapus dari R2/S3 jika terkonfigurasi
  if ((STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") && s3Client && process.env.S3_BUCKET_NAME) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `backups/database/${safeName}`,
        })
      );
    } catch {}
  }

  return { success: true };
}

// Rotasi snapshot lama
export async function pruneOldSnapshots(keepCount: number, backupDir: string) {
  try {
    await fs.promises.access(backupDir);
  } catch {
    return;
  }
  
  const files = await fs.promises.readdir(backupDir);
  const snapshots: Array<{ name: string; time: number; path: string }> = [];

  for (const f of files) {
    if (!f.endsWith(".sql") && !f.endsWith(".backup")) continue;
    const p = path.join(backupDir, f);
    try {
      const stat = await fs.promises.stat(p);
      snapshots.push({ name: f, time: stat.mtime.getTime(), path: p });
    } catch {}
  }

  snapshots.sort((a, b) => b.time - a.time);

  if (snapshots.length > keepCount) {
    const toDelete = snapshots.slice(keepCount);
    for (const item of toDelete) {
      try {
        await fs.promises.unlink(item.path);
        // Hapus juga dari R2 jika ada
        if ((STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") && s3Client && process.env.S3_BUCKET_NAME) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: `backups/database/${item.name}`,
            })
          ).catch(() => {});
        }
      } catch {}
    }
  }
}
