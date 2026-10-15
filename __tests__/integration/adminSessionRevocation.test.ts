/**
 * Admin yang barisnya dihapus tidak boleh mempertahankan akses lewat JWT yang masih berlaku (DB luxenary_test).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { encode } from "next-auth/jwt";

vi.hoisted(() => {
  process.env.AUTH_SECRET ||= "vitest-session-secret";
  process.env.AUTH_TRUST_HOST = "true";
});

let cookieHeader = "";
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: cookieHeader, host: "localhost:3000", "x-forwarded-proto": "http" }),
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => undefined, delete: () => undefined, has: () => false }),
}));

import { prisma, pool } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAdminModule } from "@/lib/adminAuth";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_adminrev_${Date.now()}`;
let adminId = "";

async function sessionCookie(id: string, sv?: number) {
  const salt = "authjs.session-token";
  const jwt = await encode({
    token: { id, sub: id, role: "SUPER_ADMIN", isAdmin: true, permissions: [], ...(sv === undefined ? {} : { sv }) },
    secret: process.env.AUTH_SECRET as string,
    salt,
  });
  return `${salt}=${jwt}`;
}

describe.skipIf(!IS_TEST_DB)("pencabutan sesi admin", () => {
  beforeAll(async () => {
    const admin = await prisma.admin.create({
      data: { username: RUN, email: `${RUN}@t.local`, name: "Admin Uji", role: "ADMIN", permissions: ["orders"] },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma.admin.deleteMany({ where: { username: RUN } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("admin yang masih ada: role dan izin diambil dari DB, bukan dari token", async () => {
    cookieHeader = await sessionCookie(adminId, 0);
    const session = await auth();
    expect(session?.user?.id).toBe(adminId);
    expect(session?.user?.role).toBe("ADMIN");
    const guard = await requireAdminModule("orders");
    expect(guard.ok).toBe(true);
  });

  it("token tanpa versi sesi (terbit sebelum kolom ada) ditolak", async () => {
    cookieHeader = await sessionCookie(adminId);
    expect((await auth())?.user).toBeUndefined();
    const guard = await requireAdminModule("orders");
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(401);
  });

  it("versi sesi dinaikkan: token lama ditolak, token dengan versi baru diterima", async () => {
    await prisma.admin.update({ where: { id: adminId }, data: { sessionVersion: { increment: 1 } } });

    cookieHeader = await sessionCookie(adminId, 0);
    expect((await auth())?.user).toBeUndefined();
    const stale = await requireAdminModule("orders");
    expect(stale.ok).toBe(false);

    cookieHeader = await sessionCookie(adminId, 1);
    expect((await auth())?.user?.id).toBe(adminId);
    expect((await requireAdminModule("orders")).ok).toBe(true);
  });

  it("admin yang sudah dihapus: sesi tidak memuat pengguna dan guard menolak 401", async () => {
    cookieHeader = await sessionCookie(adminId, 1);
    await prisma.admin.delete({ where: { id: adminId } });
    const session = await auth();
    expect(session?.user).toBeUndefined();
    const guard = await requireAdminModule("orders");
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(401);
  });
});
