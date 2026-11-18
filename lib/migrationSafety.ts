import fs from "fs";
import path from "path";

/**
 * Migrasi harus tetap cocok dengan kode rilis sebelumnya: selama deploy, server lain (dan proses lama di server ini
 * sebelum reload) masih menjalankan kode lama di atas skema baru. Perubahan yang mematahkan kode lama dipecah menjadi
 * beberapa rilis (expand/contract, docs/admin/DEPLOYMENT_VPS_CADDY.md Tahap 10). Migrasi tahap "contract" yang kodenya
 * sudah tidak memakai objek yang dihapus sejak rilis sebelumnya ditandai baris `-- lux:contract <alasan>`.
 */
export const MIGRATION_SAFETY_BASELINE = "20261118100000";

const RULES: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bDROP\s+(TABLE|COLUMN)\b/i, message: "menghapus tabel/kolom yang masih dibaca kode lama" },
  { pattern: /\bRENAME\b/i, message: "mengganti nama tabel/kolom yang masih dipakai kode lama" },
  { pattern: /\bALTER\s+COLUMN\s+"?\w+"?\s+(SET\s+DATA\s+)?TYPE\b/i, message: "mengubah tipe kolom" },
  { pattern: /\bALTER\s+COLUMN\s+"?\w+"?\s+SET\s+NOT\s+NULL\b/i, message: "mewajibkan kolom yang mungkin tidak diisi kode lama" },
  { pattern: /\bALTER\s+TYPE\b[\s\S]*?\bADD\s+VALUE\b/i, message: "menambah nilai enum yang ditolak Prisma kode lama saat membaca" },
];

const stripComments = (sql: string) => sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/** Pelanggaran dalam satu berkas migration.sql; kosong bila aman atau ditandai `-- lux:contract`. */
export function migrationSafetyIssues(sql: string): string[] {
  if (/^--\s*lux:contract\b/m.test(sql)) return [];
  const body = stripComments(sql);
  const issues = RULES.filter((r) => r.pattern.test(body)).map((r) => r.message);
  for (const stmt of body.split(";")) {
    if (/\bADD\s+COLUMN\b/i.test(stmt) && /\bNOT\s+NULL\b/i.test(stmt) && !/\bDEFAULT\b/i.test(stmt)) {
      issues.push("menambah kolom NOT NULL tanpa DEFAULT, sehingga insert dari kode lama gagal");
    }
  }
  return issues;
}

/** Migrasi sejak baseline yang melanggar aturan, per folder. */
export function unsafeMigrations(dir = path.join(process.cwd(), "prisma", "migrations")): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name, "migration.sql");
    if (name < MIGRATION_SAFETY_BASELINE || !fs.existsSync(file)) continue;
    const issues = migrationSafetyIssues(fs.readFileSync(file, "utf-8"));
    if (issues.length) out[name] = issues;
  }
  return out;
}
