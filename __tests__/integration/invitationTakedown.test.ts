/**
 * POST /api/admin/invitations/[id]/lifecycle: TAKE_DOWN dan REOPEN (hanya berjalan di database `luxenary_test`).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: { id: string; role: string; isAdmin: boolean; permissions: string[] } | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as lifecyclePost } from "@/app/api/admin/invitations/[id]/lifecycle/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_takedown_${Date.now()}`;

let adminId = "";
let userId = "";
let invitationId = "";

const call = (body: Record<string, unknown>) =>
  lifecyclePost(
    new NextRequest(`http://localhost/api/admin/invitations/${invitationId}/lifecycle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: { id: invitationId } }
  );

const statusOfInvitation = async () =>
  (await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: { status: true } })).status;

const actAs = (role: string) => {
  sessionUser = { id: adminId, role, isAdmin: true, permissions: [] };
};

describe.skipIf(!IS_TEST_DB)("Penurunan dan pembukaan kembali undangan oleh admin", () => {
  beforeAll(async () => {
    const admin = await prisma.admin.create({
      data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPPORT", permissions: [] },
    });
    adminId = admin.id;
    const user = await prisma.user.create({ data: { email: `${TAG}@t.local`, name: TAG } });
    userId = user.id;
    const inv = await prisma.invitation.create({
      data: { userId, invitationSlug: `${TAG}-inv`, groomSlug: `${TAG}-g`, brideSlug: `${TAG}-b`, status: "PUBLISHED" },
    });
    invitationId = inv.id;
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { id: invitationId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.admin.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("staf tanpa modul invitations (FINANCE) -> 403 dan status tidak berubah", async () => {
    actAs("FINANCE");
    const res = await call({ action: "TAKE_DOWN", reason: "uji" });
    expect(res.status).toBe(403);
    expect(await statusOfInvitation()).toBe("PUBLISHED");
  });

  it("TAKE_DOWN tanpa alasan -> 400 dan status tidak berubah", async () => {
    actAs("SUPPORT");
    expect((await call({ action: "TAKE_DOWN" })).status).toBe(400);
    expect((await call({ action: "TAKE_DOWN", reason: "   " })).status).toBe(400);
    expect(await statusOfInvitation()).toBe("PUBLISHED");
  });

  it("REOPEN pada undangan yang tidak diturunkan -> 409", async () => {
    actAs("SUPPORT");
    expect((await call({ action: "REOPEN" })).status).toBe(409);
    expect(await statusOfInvitation()).toBe("PUBLISHED");
  });

  it("TAKE_DOWN beralasan -> TAKEN_DOWN dan tercatat di audit log", async () => {
    actAs("SUPPORT");
    const res = await call({ action: "TAKE_DOWN", reason: "Konten melanggar ketentuan" });
    expect(res.status).toBe(200);
    expect(await statusOfInvitation()).toBe("TAKEN_DOWN");

    const log = await prisma.adminAuditLog.findFirstOrThrow({ where: { adminId, action: "TAKE_DOWN_INVITATION" } });
    expect(log.details).toContain("Konten melanggar ketentuan");
    expect(log.details).toContain(`${TAG}-inv`);
  });

  it("TAKE_DOWN ulang pada undangan yang sudah diturunkan -> 409", async () => {
    actAs("SUPPORT");
    expect((await call({ action: "TAKE_DOWN", reason: "ulang" })).status).toBe(409);
  });

  it("REOPEN -> PUBLISHED dan tercatat di audit log", async () => {
    actAs("SUPPORT");
    const res = await call({ action: "REOPEN" });
    expect(res.status).toBe(200);
    expect(await statusOfInvitation()).toBe("PUBLISHED");
    expect(await prisma.adminAuditLog.count({ where: { adminId, action: "REOPEN_INVITATION" } })).toBe(1);
  });
});
