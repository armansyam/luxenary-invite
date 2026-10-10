/**
 * Kuota add-on berbayar (kolom extraMemoriesQuota/extraGalleryDays) tidak dapat ditulis pemilik undangan lewat
 * PUT/PATCH; gating paket berlaku di PATCH; JSON rusak ditolak, bukan disimpan mentah (DB luxenary_test).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

let session: any = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session) }));

import { Prisma } from "@prisma/client";
import { prisma, pool } from "@/lib/prisma";
import { PUT, PATCH } from "@/app/api/client/invitations/[id]/route";
import { hasPlanCapability } from "@/lib/settings";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_fstamper_${Date.now()}`;
const ids = { owner: "", order: "", invitation: "" };

const req = (method: string, body: unknown) =>
  new Request(`http://localhost/api/client/invitations/${ids.invitation}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const ctx = () => ({ params: Promise.resolve({ id: ids.invitation }) });
const stored = async () => {
  const inv = await prisma.invitation.findUniqueOrThrow({ where: { id: ids.invitation } });
  return inv.featureSettings as Record<string, unknown>;
};
const resetFs = (fs: Record<string, unknown>) =>
  prisma.invitation.update({ where: { id: ids.invitation }, data: { featureSettings: fs as Prisma.InputJsonObject, status: "DRAFT", extraMemoriesQuota: 10, extraGalleryDays: 30 } });
const quota = () => prisma.invitation.findUniqueOrThrow({ where: { id: ids.invitation }, select: { extraMemoriesQuota: true, extraGalleryDays: true } });

describe.skipIf(!IS_TEST_DB)("featureSettings: manipulasi klien pada rute undangan", () => {
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `${RUN}@t.local`, name: "Owner" } });
    ids.owner = user.id;
    const order = await prisma.order.create({ data: { userId: user.id, invoiceNumber: RUN, planType: "TIER_1", amount: 100000, status: "PAID" } });
    ids.order = order.id;
    const inv = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order.id,
        themeId: "kalandra",
        status: "DRAFT",
        invitationSlug: RUN,
        participantsJson: { groom: { name: "Pria" }, bride: { name: "Wanita" } },
        extraMemoriesQuota: 10,
        extraGalleryDays: 30,
      },
    });
    ids.invitation = inv.id;
    session = { user: { id: user.id, role: "CLIENT", isAdmin: false } };
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { id: ids.invitation } });
    await prisma.order.deleteMany({ where: { id: ids.order } });
    await prisma.user.deleteMany({ where: { id: ids.owner } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("PATCH tidak dapat menaikkan kuota foto maupun hari galeri yang dibeli", async () => {
    await resetFs({});
    const res = await PATCH(req("PATCH", { featureSettings: { extraMemoriesQuota: 99999, extraGalleryDays: 999, showGift: true }, extraMemoriesQuota: 99999 }), ctx());
    expect(res.status).toBe(200);
    expect(await quota()).toEqual({ extraMemoriesQuota: 10, extraGalleryDays: 30 });
    expect((await stored()).showGift).toBe(true);
  });

  it("PUT tidak dapat menaikkan kuota foto yang dibeli", async () => {
    await resetFs({});
    const res = await PUT(req("PUT", { featureSettings: { extraMemoriesQuota: 99999 }, extraMemoriesQuota: 99999, extraGalleryDays: 999 }), ctx());
    expect(res.status).toBe(200);
    expect(await quota()).toEqual({ extraMemoriesQuota: 10, extraGalleryDays: 30 });
  });

  it("PUT dengan featureSettings null tidak menghapus add-on berbayar", async () => {
    await resetFs({ showGift: true });
    const res = await PUT(req("PUT", { featureSettings: null }), ctx());
    expect(res.status).toBe(200);
    expect(await quota()).toEqual({ extraMemoriesQuota: 10, extraGalleryDays: 30 });
  });

  it("PATCH menerapkan gating paket pada fitur berbayar", async () => {
    await resetFs({});
    await PATCH(req("PATCH", { featureSettings: { showQrCheckin: true, showGuestMemories: true } }), ctx());
    const fs = await stored();
    expect(Boolean(fs.showQrCheckin)).toBe(await hasPlanCapability("TIER_1", "qr_checkin"));
    expect(Boolean(fs.showGuestMemories)).toBe(await hasPlanCapability("TIER_1", "guest_memories"));
  });

  it("JSON rusak ditolak 400 dan tidak disimpan mentah", async () => {
    await resetFs({ showGift: true });
    const put = await PUT(req("PUT", { featureSettings: "{bukan json" }), ctx());
    const patch = await PATCH(req("PATCH", { featureSettings: "{bukan json" }), ctx());
    expect(put.status).toBe(400);
    expect(patch.status).toBe(400);
    expect(await stored()).toEqual({ showGift: true });
  });

  it("eventData yang tidak dapat divalidasi ditolak 400", async () => {
    const res = await PUT(req("PUT", { eventData: { bukan: "array" } }), ctx());
    expect(res.status).toBe(400);
  });

  it("PATCH participantsJson ditolak setelah publikasi (nama inti terkunci)", async () => {
    await prisma.invitation.update({ where: { id: ids.invitation }, data: { status: "PUBLISHED" } });
    const res = await PATCH(req("PATCH", { participantsJson: { person: { name: "Nama Baru" } } }), ctx());
    expect(res.status).toBe(403);
  });
});
