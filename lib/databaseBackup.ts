import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";

export interface SnapshotItem {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  isSafetyBackup: boolean;
}

// Dapatkan direktori backup yang valid
export function getBackupDirectory(configuredPath?: string): string {
  if (configuredPath && path.isAbsolute(configuredPath)) {
    try {
      if (!fs.existsSync(configuredPath)) {
        fs.mkdirSync(configuredPath, { recursive: true });
      }
      return configuredPath;
    } catch {
      // Jika izin folder /data sistem ditolak, fallback ke ./data/backups di project
    }
  }

  const localDir = path.join(process.cwd(), "data", "backups");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}

// Format bytes ke KB / MB
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Dapatkan path database aktif saat ini
export function getActiveDbPath(): string {
  const rootDb = path.join(process.cwd(), "dev.db");
  if (fs.existsSync(rootDb)) return rootDb;
  const prismaDb = path.join(process.cwd(), "prisma", "dev.db");
  if (fs.existsSync(prismaDb)) return prismaDb;
  return rootDb;
}

// Buat snapshot database saat ini
export async function createDatabaseSnapshot(customLabel?: string): Promise<{ success: boolean; filename: string; path: string; sizeBytes: number }> {
  const dbPath = getActiveDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`File database aktif tidak ditemukan di ${dbPath}`);
  }

  // Ambil path backup dari setting jika ada
  let backupPathSetting: string | undefined;
  try {
    const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
    if (s?.value) backupPathSetting = s.value;
  } catch {}

  const backupDir = getBackupDirectory(backupPathSetting);

  // Buat nama file unik berformat tanggal dan jam
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  const prefix = customLabel ? `safety_${customLabel}` : `snapshot_luxenary`;
  const filename = `${prefix}_${timestamp}.db`;
  const targetPath = path.join(backupDir, filename);

  // Salin file database secara atomic
  fs.copyFileSync(dbPath, targetPath);

  const stats = fs.statSync(targetPath);

  // Jalankan rotasi/pembersihan snapshot lama sesuai batas retensi
  await cleanupOldSnapshots(backupDir);

  return {
    success: true,
    filename,
    path: targetPath,
    sizeBytes: stats.size,
  };
}

// Ambil daftar seluruh file snapshot
export async function listDatabaseSnapshots(): Promise<SnapshotItem[]> {
  let backupPathSetting: string | undefined;
  try {
    const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
    if (s?.value) backupPathSetting = s.value;
  } catch {}

  const backupDir = getBackupDirectory(backupPathSetting);
  const files = fs.readdirSync(backupDir);

  const snapshots: SnapshotItem[] = [];

  for (const f of files) {
    if (!f.endsWith(".db") && !f.endsWith(".sqlite")) continue;
    const fullPath = path.join(backupDir, f);
    try {
      const stat = fs.statSync(fullPath);
      snapshots.push({
        filename: f,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        isSafetyBackup: f.startsWith("safety_"),
      });
    } catch {}
  }

  // Urutkan dari yang paling baru
  snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return snapshots;
}

// Restore database dari snapshot
export async function restoreDatabaseSnapshot(filename: string): Promise<{ success: boolean; safetyBackup: string; restoredFrom: string }> {
  let backupPathSetting: string | undefined;
  try {
    const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
    if (s?.value) backupPathSetting = s.value;
  } catch {}

  const backupDir = getBackupDirectory(backupPathSetting);
  const snapshotPath = path.join(backupDir, filename);

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`File snapshot "${filename}" tidak ditemukan di direktori backup.`);
  }

  // 1. Buat safety backup dari database aktif saat ini sebelum ditimpa
  const safety = await createDatabaseSnapshot("pre_restore");

  // 2. Timpa database aktif dengan file snapshot
  const activeDbPath = getActiveDbPath();
  fs.copyFileSync(snapshotPath, activeDbPath);

  // Jika prisma/dev.db juga ada, sinkronkan
  const secondaryDbPath = path.join(process.cwd(), "prisma", "dev.db");
  if (fs.existsSync(secondaryDbPath)) {
    fs.copyFileSync(snapshotPath, secondaryDbPath);
  }

  return {
    success: true,
    safetyBackup: safety.filename,
    restoredFrom: filename,
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

  const backupDir = getBackupDirectory(backupPathSetting);
  const targetPath = path.join(backupDir, safeName);

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }

  return { success: true };
}

// Bersihkan snapshot lama sesuai batas retensi
async function cleanupOldSnapshots(backupDir: string) {
  try {
    let retentionCount = 10;
    const s = await prisma.adminSetting.findUnique({ where: { key: "backup_retention_count" } });
    if (s?.value) {
      const parsed = parseInt(s.value, 10);
      if (!isNaN(parsed) && parsed > 0) retentionCount = parsed;
    }

    const files = fs.readdirSync(backupDir)
      .filter((f) => f.endsWith(".db") || f.endsWith(".sqlite"))
      .map((f) => {
        const full = path.join(backupDir, f);
        return { name: f, full, mtime: fs.statSync(full).mtime.getTime() };
      })
      .sort((a, b) => b.mtime - a.mtime);

    // Hapus snapshot di luar batas retensi
    if (files.length > retentionCount) {
      const toDelete = files.slice(retentionCount);
      for (const item of toDelete) {
        try {
          fs.unlinkSync(item.full);
        } catch {}
      }
    }
  } catch (err) {
    console.warn("Gagal rotasi backup:", err);
  }
}
