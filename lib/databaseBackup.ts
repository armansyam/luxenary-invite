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

// Dapatkan direktori backup yang valid terisolasi di dalam folder data/backups
export function getBackupDirectory(configuredPath?: string): string {
  const localDir = path.join(process.cwd(), "data", "backups");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  if (configuredPath && path.isAbsolute(configuredPath) && !configuredPath.includes("..")) {
    try {
      if (!fs.existsSync(configuredPath)) {
        fs.mkdirSync(configuredPath, { recursive: true });
      }
      return configuredPath;
    } catch {
      // Fallback ke localDir
    }
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

// Buat snapshot database instan
export async function createDatabaseSnapshot(customLabel?: string): Promise<{ filename: string; sizeBytes: number; sizeFormatted: string; path: string }> {
  let backupPathSetting: string | undefined;
  try {
    const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
    if (s?.value) backupPathSetting = s.value;
  } catch {}

  const backupDir = getBackupDirectory(backupPathSetting);
  const activeDbPath = getActiveDbPath();

  if (!fs.existsSync(activeDbPath)) {
    throw new Error(`File database aktif tidak ditemukan di path: ${activeDbPath}`);
  }

  // Format penamaan: snapshot_{YYYY-MM-DD_HH-mm-ss}_{label}.db
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const labelSuffix = customLabel ? `_${customLabel.replace(/[^a-zA-Z0-9_-]/g, "")}` : "";
  const filename = `snapshot_${timestamp}${labelSuffix}.db`;
  const targetPath = path.join(backupDir, filename);

  // Salin file database secara atomik
  fs.copyFileSync(activeDbPath, targetPath);

  const stat = fs.statSync(targetPath);

  // Jalankan retensi otomatis (hapus snapshot lama jika melebihi batas)
  try {
    let retentionLimit = 10;
    const rSetting = await prisma.adminSetting.findUnique({ where: { key: "backup_retention_count" } });
    if (rSetting?.value) retentionLimit = parseInt(rSetting.value, 10) || 10;

    await pruneOldSnapshots(retentionLimit, backupDir);
  } catch {}

  return {
    filename,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    path: targetPath,
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
  if (!fs.existsSync(backupDir)) return [];

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

  const backupDir = getBackupDirectory(backupPathSetting);
  const snapshotPath = path.join(backupDir, safeName);

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`File snapshot "${safeName}" tidak ditemukan di direktori backup.`);
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

  const backupDir = getBackupDirectory(backupPathSetting);
  const targetPath = path.join(backupDir, safeName);

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }

  return { success: true };
}

// Rotasi snapshot lama
export async function pruneOldSnapshots(keepCount: number, backupDir: string) {
  if (!fs.existsSync(backupDir)) return;
  const files = fs.readdirSync(backupDir);
  const snapshots: Array<{ name: string; time: number; path: string }> = [];

  for (const f of files) {
    if (!f.endsWith(".db") && !f.endsWith(".sqlite")) continue;
    const p = path.join(backupDir, f);
    try {
      const stat = fs.statSync(p);
      snapshots.push({ name: f, time: stat.mtime.getTime(), path: p });
    } catch {}
  }

  snapshots.sort((a, b) => b.time - a.time);

  if (snapshots.length > keepCount) {
    const toDelete = snapshots.slice(keepCount);
    for (const item of toDelete) {
      try {
        fs.unlinkSync(item.path);
      } catch {}
    }
  }
}
