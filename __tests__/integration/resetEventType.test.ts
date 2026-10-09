/**
 * POST /api/admin/invitations/[id]/reset-event-type: admin menghapus draf yang salah jenis acara agar klien mengulang
 * wizard dengan order lunas yang sama (hanya berjalan di database `luxenary_test`).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as resetPost } from "@/app/api/admin/invitations/[id]/reset-event-type/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_reset_${Date.now()}`;

const created = { users: [] as string[], admins: [] as string[] };
let adminId = "";
let seq = 0;

const json = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const reset = (id: string, body: unknown) => resetPost(json(`/api/admin/invitations/${id}/reset-event-type`, body), { params: Promise.resolve({ id }) });
const actAsAdmin = (role: string) => {
  sessionUser = { id: adminId, role, isAdmin: true, permissions: [] };
};

async function makeDraft(data: Record<string, unknown> = {}) {
  seq++;
  const user = await prisma.user.create({ data: { email: `${TAG}_${seq}@t.local`, name: `Klien ${seq}` } });
  created.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${TAG}-${seq}`, planType: "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      orderId: order.id,
      eventType: "WEDDING",
      invitationSlug: `${TAG}-${seq}`,
      groomSlug: `${TAG}-g${seq}`,
      brideSlug: `${TAG}-b${seq}`,
      groomName: "Raka",
      brideName: "Dewi",
      status: "DRAFT",
      ...data,
    } as never,
  });
  return { user, order, inv };
}

describe.skipIf(!IS_TEST_DB)("reset jenis acara oleh admin", () => {
  beforeAll(async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPPORT", permissions: [] } });
    adminId = admin.id;
    created.admins.push(admin.id);
  });

  afterAll(async () => {
    sessionUser = null;
    await prisma.adminAuditLog.deleteMany({ where: { adminId } });
    await prisma.invitation.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("staf tanpa modul invitations (FINANCE) -> 403, draf tetap", async () => {
    const { inv } = await makeDraft();
    actAsAdmin("FINANCE");
    expect((await reset(inv.id, { reason: "uji" })).status).toBe(403);
    expect(await prisma.invitation.count({ where: { id: inv.id } })).toBe(1);
  });

  it("tanpa alasan -> 400, draf tetap", async () => {
    const { inv } = await makeDraft();
    actAsAdmin("SUPPORT");
    expect((await reset(inv.id, { reason: "  " })).status).toBe(400);
    expect(await prisma.invitation.count({ where: { id: inv.id } })).toBe(1);
  });

  it("undangan yang pernah terbit (termasuk yang dikembalikan ke DRAFT) -> 409, tidak terhapus", async () => {
    actAsAdmin("SUPPORT");
    const published = await makeDraft({ status: "PUBLISHED", publishedAt: new Date() });
    const unpublished = await makeDraft({ status: "DRAFT", publishedAt: new Date() });
    for (const { inv } of [published, unpublished]) {
      expect((await reset(inv.id, { reason: "salah jenis" })).status).toBe(409);
      expect(await prisma.invitation.count({ where: { id: inv.id } })).toBe(1);
    }
  });

  it("draf dengan add-on top-up foto yang menempel -> 409, tidak terhapus", async () => {
    actAsAdmin("SUPPORT");
    const { user, inv } = await makeDraft();
    await prisma.order.create({
      data: { userId: user.id, invoiceNumber: `${TAG}-topup`, planType: "TIER_2", amount: 35000, status: "PAID", orderType: "MEMORIES_TOPUP", linkedInvitationId: inv.id, paidAt: new Date() },
    });
    const res = await reset(inv.id, { reason: "salah jenis" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain(`${TAG}-topup`);
    expect(await prisma.invitation.count({ where: { id: inv.id } })).toBe(1);
  });

  it("draf dihapus beserta tamu dan berkas; order tetap lunas dan klien dapat membuat undangan jenis lain", async () => {
    actAsAdmin("SUPPORT");
    const { user, order, inv } = await makeDraft();
    await prisma.guest.create({ data: { invitationId: inv.id, name: "Tamu Satu", slug: `${TAG}-tamu` } });
    const uploadDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id);
    const draftFile = path.join(process.cwd(), "data", "drafts", `${inv.id}.html`);
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, "landing-cover.webp"), "x");
    fs.mkdirSync(path.dirname(draftFile), { recursive: true });
    fs.writeFileSync(draftFile, "<html></html>");
    await prisma.invitationMedia.create({ data: { invitationId: inv.id, mediaSlot: "LANDING_COVER", localPath: `/uploads/invitations/${inv.id}/landing-cover.webp` } });

    const res = await reset(inv.id, { reason: "klien salah memilih Pernikahan, seharusnya Aqiqah" });
    expect(res.status).toBe(200);
    expect(await prisma.invitation.count({ where: { id: inv.id } })).toBe(0);
    expect(await prisma.guest.count({ where: { invitationId: inv.id } })).toBe(0);
    expect(fs.existsSync(uploadDir)).toBe(false);
    expect(fs.existsSync(draftFile)).toBe(false);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    const audit = await prisma.adminAuditLog.findFirst({ where: { adminId, action: "RESET_EVENT_TYPE" }, orderBy: { createdAt: "desc" } });
    expect(audit?.details).toContain("seharusnya Aqiqah");

    sessionUser = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };
    const again = await createInvitation(json("/api/client/invitations/create", {
      eventType: "AQIQAH", participantsJson: JSON.stringify({ baby: { name: "Aisyah", nickname: "Aisyah" } }), planType: "TIER_2",
    }));
    expect(again.status).toBe(200);
    const fresh = await prisma.invitation.findFirstOrThrow({ where: { userId: user.id } });
    expect([fresh.eventType, fresh.orderId, fresh.groomName]).toEqual(["AQIQAH", order.id, "Aisyah"]);
  });
});
