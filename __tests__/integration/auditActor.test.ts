/**
 * Catatan audit harus memuat admin yang benar-benar bertindak, dan tertulis atomik bersama perubahannya
 * (hanya berjalan di database `luxenary_test`).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

type TestSession = {
  id: string;
  role: string;
  isAdmin: boolean;
  permissions: string[];
  originalAdminId?: string;
  originalRole?: string;
};
let sessionUser: TestSession | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as unlockPost } from "@/app/api/admin/invitations/[id]/unlock/route";
import { POST as expensePost } from "@/app/api/admin/finance/expenses/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_audit_${Date.now()}`;

let firstAdminId = "";
let actingAdminId = "";
let userId = "";
let invitationId = "";

const unlock = (body: Record<string, unknown>) =>
  unlockPost(
    new NextRequest(`http://localhost/api/admin/invitations/${invitationId}/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: { id: invitationId } }
  );

const addExpense = (title: string) =>
  expensePost(
    new NextRequest("http://localhost/api/admin/finance/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, amount: 1000, category: "OTHER", expenseDate: "2099-01-15" }),
    })
  );

const logsFor = (action: string) => prisma.adminAuditLog.findMany({ where: { action, details: { contains: TAG } } });

describe.skipIf(!IS_TEST_DB)("pelaku catatan audit", () => {
  beforeAll(async () => {
    const first = await prisma.admin.create({ data: { username: `${TAG}_a`, email: `${TAG}_a@t.local`, name: "Admin Pertama", role: "SUPER_ADMIN", permissions: [] } });
    const acting = await prisma.admin.create({ data: { username: `${TAG}_b`, email: `${TAG}_b@t.local`, name: "Admin Bertindak", role: "SUPER_ADMIN", permissions: [] } });
    firstAdminId = first.id;
    actingAdminId = acting.id;
    const user = await prisma.user.create({ data: { email: `${TAG}@t.local`, name: TAG } });
    userId = user.id;
    const inv = await prisma.invitation.create({
      data: { userId, invitationSlug: `${TAG}-inv`, groomSlug: `${TAG}-g`, brideSlug: `${TAG}-b`, groomName: TAG, brideName: TAG, status: "PUBLISHED" },
    });
    invitationId = inv.id;
  });

  afterAll(async () => {
    await prisma.expense.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.invitation.deleteMany({ where: { id: invitationId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.admin.deleteMany({ where: { id: { in: [firstAdminId, actingAdminId] } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("buka dan kunci darurat tercatat atas nama admin yang login, bukan admin pertama di tabel", async () => {
    sessionUser = { id: actingAdminId, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    expect((await unlock({ durationHours: 1 })).status).toBe(200);
    expect((await unlock({ lockImmediately: true })).status).toBe(200);

    const [opened] = await logsFor("UNLOCK_INVITATION");
    const [locked] = await logsFor("LOCK_INVITATION");
    expect(opened.adminId).toBe(actingAdminId);
    expect(locked.adminId).toBe(actingAdminId);
    expect(await prisma.adminAuditLog.count({ where: { adminId: firstAdminId } })).toBe(0);
  });

  it("selama sesi remote, pelaku tetap admin asli (originalAdminId), bukan ID klien", async () => {
    sessionUser = { id: userId, originalAdminId: actingAdminId, originalRole: "SUPER_ADMIN", role: "CLIENT", isAdmin: true, permissions: [] };
    expect((await unlock({ durationHours: 2 })).status).toBe(200);
    const logs = await logsFor("UNLOCK_INVITATION");
    expect(logs.every((l) => l.adminId === actingAdminId)).toBe(true);
    expect(logs).toHaveLength(2);
  });

  it("pengeluaran dan catatan auditnya tertulis bersama atas nama admin yang login", async () => {
    sessionUser = { id: actingAdminId, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    const res = await addExpense(`${TAG}-beban`);
    expect(res.status).toBe(200);

    const expense = await prisma.expense.findFirstOrThrow({ where: { title: `${TAG}-beban` } });
    expect(expense.createdById).toBe(actingAdminId);
    const [log] = await logsFor("CREATE_EXPENSE");
    expect(log.adminId).toBe(actingAdminId);
  });

  it("admin yang tidak ada di tabel (FK gagal) membatalkan pengeluaran, bukan meninggalkannya tanpa jejak", async () => {
    sessionUser = { id: "bukan-admin-terdaftar", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    const res = await addExpense(`${TAG}-yatim`);
    expect(res.status).toBe(500);
    expect(await prisma.expense.count({ where: { title: `${TAG}-yatim` } })).toBe(0);
  });
});
