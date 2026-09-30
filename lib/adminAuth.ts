import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";

export type AdminGuard =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

function deny(status: 401 | 403, error: string): AdminGuard {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

/**
 * Otorisasi server-side per modul admin. Menyembunyikan tab di UI bukan kontrol keamanan:
 * setiap rute admin wajib memanggil guard ini.
 *
 * - 401: belum login atau bukan akun admin.
 * - 403: akun admin, tetapi peran/izinnya tidak mencakup modul tersebut.
 *
 * @param moduleId id modul dari `ADMIN_MODULES` (lib/adminPermissions.ts). Modul `settings`,
 *                 `database`, dan `team` hanya dapat dibuka oleh SUPER_ADMIN.
 */
export async function requireAdminModule(moduleId: string): Promise<AdminGuard> {
  const session = await auth();
  if (!session?.user || !isAdminSession(session)) {
    return deny(401, "Unauthorized. Khusus Administrator.");
  }
  if (!hasAdminPermission(session.user, moduleId)) {
    return deny(403, "Forbidden. Akun Anda tidak memiliki akses ke modul ini.");
  }
  return { ok: true, session };
}

/** Untuk aksi yang tidak boleh dilakukan selain Super Administrator (misalnya membuka kembali tutup buku). */
export async function requireSuperAdmin(): Promise<AdminGuard> {
  const session = await auth();
  if (!session?.user || !isAdminSession(session)) {
    return deny(401, "Unauthorized. Khusus Administrator.");
  }
  const effectiveRole = session.user.originalRole || session.user.role;
  if (effectiveRole !== "SUPER_ADMIN") {
    return deny(403, "Akses ditolak. Aksi ini hanya diizinkan untuk Super Administrator.");
  }
  return { ok: true, session };
}

/** Untuk rute yang cukup mensyaratkan akun admin mana pun (misalnya mengubah profil sendiri). */
export async function requireAnyAdmin(): Promise<AdminGuard> {
  const session = await auth();
  if (!session?.user || !isAdminSession(session)) {
    return deny(401, "Unauthorized. Khusus Administrator.");
  }
  return { ok: true, session };
}

export function isAdminSession(session: Session): boolean {
  const { isAdmin, role, originalRole } = session.user;
  const effective = originalRole || role;
  return (
    isAdmin === true ||
    effective === "SUPER_ADMIN" ||
    effective === "ADMIN" ||
    effective === "FINANCE" ||
    effective === "SUPPORT"
  );
}
