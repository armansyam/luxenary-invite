import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import type { PrismaClient } from "@prisma/client";

/**
 * Password bawaan versi lama. String ini sudah tercantum di dokumen dan riwayat git, jadi yang berbahaya adalah akun
 * yang masih memakainya, bukan keberadaan string di kode; seed mendeteksi dan menonaktifkan akun semacam itu.
 */
export const LEGACY_DEFAULT_PASSWORD = "admin123";
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

type Db = Pick<PrismaClient, "admin" | "adminAuditLog">;

/** Password acak berhuruf besar, kecil, dan angka. */
export function generateAdminPassword(length = 24): string {
  for (;;) {
    const candidate = crypto.randomBytes(length * 2).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, length);
    if (candidate.length === length && /[a-z]/.test(candidate) && /[A-Z]/.test(candidate) && /\d/.test(candidate)) {
      return candidate;
    }
  }
}

/**
 * Menonaktifkan (passwordHash = null) setiap admin yang masih memakai password bawaan lama dan mencabut sesinya.
 * Akun tanpa hash ditolak `authorize`, jadi login hanya mungkin lagi sesudah password diatur lewat set-admin-password.
 * @returns email akun yang dinonaktifkan
 */
export async function disableLegacyDefaultPasswordAdmins(db: Db): Promise<string[]> {
  const admins = await db.admin.findMany({
    where: { passwordHash: { not: null } },
    select: { id: true, email: true, passwordHash: true },
  });
  const disabled: string[] = [];
  for (const admin of admins) {
    if (!admin.passwordHash || !(await bcrypt.compare(LEGACY_DEFAULT_PASSWORD, admin.passwordHash))) continue;
    await db.admin.update({ where: { id: admin.id }, data: { passwordHash: null, sessionVersion: { increment: 1 } } });
    await db.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: "ADMIN_DEFAULT_PASSWORD_DISABLED",
        details: "Password bawaan lama terdeteksi oleh seed; login dinonaktifkan sampai password diatur ulang",
      },
    });
    disabled.push(admin.email);
  }
  return disabled;
}

/** Mengganti password admin, mencabut semua sesinya, dan mencatat audit. Melempar bila email tidak ditemukan. */
export async function setAdminPassword(db: Db, email: string, password: string): Promise<string> {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`Password minimal ${MIN_ADMIN_PASSWORD_LENGTH} karakter.`);
  }
  const admin = await db.admin.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
  if (!admin) throw new Error("Admin dengan email itu tidak ditemukan.");
  await db.admin.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 } },
  });
  await db.adminAuditLog.create({
    data: { adminId: admin.id, action: "ADMIN_PASSWORD_ROTATED", details: "Password diatur ulang lewat skrip operator; sesi lama dicabut" },
  });
  return admin.id;
}

/** Menulis kredensial ke berkas ber-izin 600 dan menolak menimpa berkas yang sudah ada. */
export function writeAdminCredentialFile(filePath: string, email: string, password: string): void {
  fs.writeFileSync(filePath, `${email}: ${password}\n`, { flag: "wx", mode: 0o600 });
}
