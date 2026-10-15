/**
 * Penegakan kredensial admin (DB luxenary_test): akun berpassword bawaan lama dinonaktifkan dan sesinya dicabut,
 * set-admin-password memutar password dan versi sesi, dan rute ganti password/peran menaikkan sessionVersion.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import {
  LEGACY_DEFAULT_PASSWORD,
  disableLegacyDefaultPasswordAdmins,
  generateAdminPassword,
  setAdminPassword,
  writeAdminCredentialFile,
} from "@/lib/adminCredentials";
import { PUT as updateProfile } from "@/app/api/admin/profile/route";
import { PUT as updateAdmin } from "@/app/api/admin/admins/[id]/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_admincred_${Date.now()}`;
const STRONG = "KataSandiKuat-2026-xyz";

const ids: Record<string, string> = {};
const tmpFiles: string[] = [];

const putJson = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const versionOf = async (id: string) => (await prisma.admin.findUniqueOrThrow({ where: { id } })).sessionVersion;

async function makeAdmin(label: string, password: string | null, role: "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
  const admin = await prisma.admin.create({
    data: {
      username: `${TAG}_${label}`,
      email: `${TAG}_${label}@t.local`,
      name: `Admin ${label}`,
      role,
      permissions: role === "SUPER_ADMIN" ? [] : ["orders"],
      passwordHash: password === null ? null : await bcrypt.hash(password, 4),
    },
  });
  ids[label] = admin.id;
  return admin;
}

describe.skipIf(!IS_TEST_DB)("kredensial admin", () => {
  beforeAll(async () => {
    await makeAdmin("legacy", LEGACY_DEFAULT_PASSWORD);
    await makeAdmin("kuat", STRONG);
    await makeAdmin("super", STRONG, "SUPER_ADMIN");
    await makeAdmin("target", STRONG);
  });

  afterAll(async () => {
    sessionUser = null;
    const created = Object.values(ids);
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created } } });
    await prisma.admin.deleteMany({ where: { id: { in: created } } });
    for (const file of tmpFiles) fs.rmSync(file, { force: true });
    await prisma.$disconnect();
    await pool.end();
  });

  describe("penegakan password bawaan lama", () => {
    it("akun berpassword bawaan dinonaktifkan dan sesinya dicabut; akun lain tidak tersentuh", async () => {
      const before = await versionOf(ids.legacy);
      const disabled = await disableLegacyDefaultPasswordAdmins(prisma);
      expect(disabled).toContain(`${TAG}_legacy@t.local`);
      expect(disabled).not.toContain(`${TAG}_kuat@t.local`);

      const legacy = await prisma.admin.findUniqueOrThrow({ where: { id: ids.legacy } });
      expect(legacy.passwordHash).toBeNull();
      expect(legacy.sessionVersion).toBe(before + 1);
      expect(await prisma.adminAuditLog.count({ where: { adminId: ids.legacy, action: "ADMIN_DEFAULT_PASSWORD_DISABLED" } })).toBe(1);

      const kuat = await prisma.admin.findUniqueOrThrow({ where: { id: ids.kuat } });
      expect(await bcrypt.compare(STRONG, kuat.passwordHash!)).toBe(true);
      expect(kuat.sessionVersion).toBe(0);
    });

    it("dijalankan ulang: tidak ada perubahan lagi (idempoten)", async () => {
      const before = await versionOf(ids.legacy);
      const again = await disableLegacyDefaultPasswordAdmins(prisma);
      expect(again).not.toContain(`${TAG}_legacy@t.local`);
      expect(await versionOf(ids.legacy)).toBe(before);
    });
  });

  describe("set-admin-password", () => {
    it("memutar password, menaikkan versi sesi, dan mencatat audit", async () => {
      const before = await versionOf(ids.legacy);
      const password = generateAdminPassword();
      expect(password).toHaveLength(24);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/\d/);

      await setAdminPassword(prisma, `${TAG}_legacy@t.local`, password);
      const admin = await prisma.admin.findUniqueOrThrow({ where: { id: ids.legacy } });
      expect(await bcrypt.compare(password, admin.passwordHash!)).toBe(true);
      expect(await bcrypt.compare(LEGACY_DEFAULT_PASSWORD, admin.passwordHash!)).toBe(false);
      expect(admin.sessionVersion).toBe(before + 1);
      expect(await prisma.adminAuditLog.count({ where: { adminId: ids.legacy, action: "ADMIN_PASSWORD_ROTATED" } })).toBe(1);
    });

    it("menolak password pendek dan email yang tidak ada tanpa mengubah apa pun", async () => {
      const before = await versionOf(ids.kuat);
      await expect(setAdminPassword(prisma, `${TAG}_kuat@t.local`, "pendek")).rejects.toThrow(/minimal/);
      await expect(setAdminPassword(prisma, `${TAG}_tidak-ada@t.local`, generateAdminPassword())).rejects.toThrow(/tidak ditemukan/);
      expect(await versionOf(ids.kuat)).toBe(before);
    });

    it("berkas kredensial ber-izin 600 dan tidak menimpa berkas yang sudah ada", () => {
      const file = path.join(os.tmpdir(), `${TAG}-cred.txt`);
      tmpFiles.push(file);
      writeAdminCredentialFile(file, "a@t.local", "rahasia-uji");
      expect(fs.statSync(file).mode & 0o777).toBe(0o600);
      expect(fs.readFileSync(file, "utf8")).toBe("a@t.local: rahasia-uji\n");
      expect(() => writeAdminCredentialFile(file, "a@t.local", "lain")).toThrow(/EEXIST/);
      expect(fs.readFileSync(file, "utf8")).toBe("a@t.local: rahasia-uji\n");
    });
  });

  describe("rute yang mengubah kredensial", () => {
    it("ganti password sendiri menaikkan versi; password lama salah tidak mengubah apa pun", async () => {
      sessionUser = { id: ids.kuat, role: "ADMIN", isAdmin: true, permissions: ["orders"] };
      const before = await versionOf(ids.kuat);

      const wrong = await updateProfile(putJson("/api/admin/profile", { currentPassword: "salah-salah-1", newPassword: "PasswordBaru-2026-abc" }));
      expect(wrong.status).toBe(400);
      expect(await versionOf(ids.kuat)).toBe(before);

      const ok = await updateProfile(putJson("/api/admin/profile", { currentPassword: STRONG, newPassword: "PasswordBaru-2026-abc" }));
      expect(ok.status).toBe(200);
      expect(await versionOf(ids.kuat)).toBe(before + 1);
    });

    it("akun tanpa password aktif ditolak 409 dan string pintas lama tidak lagi berlaku", async () => {
      const disabled = await makeAdmin("nonaktif", null);
      sessionUser = { id: disabled.id, role: "ADMIN", isAdmin: true, permissions: ["orders"] };
      const before = await versionOf(disabled.id);
      const res = await updateProfile(putJson("/api/admin/profile", { currentPassword: "default_admin_password_bypass_check", newPassword: "PasswordBaru-2026-abc" }));
      expect(res.status).toBe(409);
      expect(await versionOf(disabled.id)).toBe(before);
      expect((await prisma.admin.findUniqueOrThrow({ where: { id: disabled.id } })).passwordHash).toBeNull();
    });

    it("super admin: ganti password, peran, atau izin akun lain menaikkan versi; ubah nama saja tidak", async () => {
      sessionUser = { id: ids.super, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
      const call = (body: Record<string, unknown>) =>
        updateAdmin(putJson(`/api/admin/admins/${ids.target}`, body) as never, { params: Promise.resolve({ id: ids.target }) });
      const v0 = await versionOf(ids.target);

      expect((await call({ name: "Nama Baru" })).status).toBe(200);
      expect(await versionOf(ids.target)).toBe(v0);

      expect((await call({ permissions: ["orders", "users"] })).status).toBe(200);
      expect(await versionOf(ids.target)).toBe(v0 + 1);

      expect((await call({ role: "FINANCE" })).status).toBe(200);
      expect(await versionOf(ids.target)).toBe(v0 + 2);

      expect((await call({ password: "PasswordTim-2026-abc" })).status).toBe(200);
      expect(await versionOf(ids.target)).toBe(v0 + 3);
    });
  });
});
