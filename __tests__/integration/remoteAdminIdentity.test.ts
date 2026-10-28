/**
 * Regresi 29 Okt 2026: selama mode remote `session.user` berisi klien yang sedang dibuka. Formulir profil admin dan
 * penerima email uji dulu diisi dari session itu, sehingga menyimpan profil menimpa nama/email admin dengan milik klien
 * dan email uji SMTP terkirim ke klien. Keduanya kini dibaca dari admin yang bertindak (originalAdminId).
 * (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, afterAll } from "vitest";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma } from "@/lib/prisma";
import { adminActorEmail } from "@/lib/adminAuth";
import { GET as profileGet, PUT as profilePut } from "@/app/api/admin/profile/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_remote_${Date.now()}`;
const adminIds: string[] = [];

async function remoteAs(adminId: string) {
  sessionUser = {
    id: `${TAG}_client`,
    email: `${TAG}_client@uji.test`,
    name: "Klien Remote",
    role: "CLIENT",
    isAdmin: true,
    isRemote: true,
    originalAdminId: adminId,
    originalRole: "SUPER_ADMIN",
    permissions: [],
  };
}

describe.skipIf(!IS_TEST_DB)("identitas admin selama mode remote (DB)", () => {
  afterAll(async () => {
    sessionUser = null;
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: adminIds } } });
    await prisma.admin.deleteMany({ where: { id: { in: adminIds } } });
  });

  it("profil dan email default berasal dari admin yang bertindak, bukan klien yang dibuka", async () => {
    const admin = await prisma.admin.create({
      data: { username: `${TAG}_adm`, email: `${TAG}_adm@t.local`, name: "Admin Asli", role: "SUPER_ADMIN" },
    });
    adminIds.push(admin.id);
    await remoteAs(admin.id);

    const res = await profileGet();
    expect(res.status).toBe(200);
    const { admin: shown } = await res.json();
    expect(shown).toEqual({ name: "Admin Asli", email: `${TAG}_adm@t.local`, username: `${TAG}_adm` });

    const put = await profilePut(
      new Request("http://localhost/api/admin/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: shown.name, email: shown.email, currentPassword: "", newPassword: "" }),
      })
    );
    expect(put.status).toBe(200);
    const row = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id }, select: { name: true, email: true } });
    expect(row).toEqual({ name: "Admin Asli", email: `${TAG}_adm@t.local` });

    expect(await adminActorEmail({ user: sessionUser } as never)).toBe(`${TAG}_adm@t.local`);
  });
});
