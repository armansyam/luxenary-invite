/**
 * Jenis acara aktif (pengaturan admin `enabled_event_types`): hanya menutup undangan baru, draf yang sudah ada tetap
 * bisa disimpan, tema bawaan yang nonaktif tidak dipakai, dan pengaturan kosong ditolak (hanya di `luxenary_test`).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (session.user ? { user: session.user } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { invalidateSettingsCache, getPublicPlatformSettings } from "@/lib/settings";
import { parseEnabledEventTypes, selectableEventTypes } from "@/lib/invitationUtils";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { POST as saveSettings } from "@/app/api/admin/settings/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_evtypes_${Date.now()}`;
const KEY = "enabled_event_types";

const userIds: string[] = [];
let adminId = "";
let seq = 0;
let previousSetting: string | null = null;
const deactivated: string[] = [];

const json = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function setEnabled(value: string) {
  await prisma.adminSetting.upsert({ where: { key: KEY }, create: { key: KEY, value, group: "platform" }, update: { value } });
  invalidateSettingsCache();
}

async function paidClient() {
  seq++;
  const user = await prisma.user.create({ data: { email: `${TAG}_${seq}@t.local`, name: `Klien ${seq}` } });
  userIds.push(user.id);
  await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${TAG}-${seq}`, planType: "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  session.user = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };
  return user;
}

describe("aturan jenis acara aktif", () => {
  it("kunci kosong, belum ada, atau tak dikenal berarti semua; urutan mengikuti daftar baku", () => {
    expect(parseEnabledEventTypes(undefined)).toHaveLength(6);
    expect(parseEnabledEventTypes(" ")).toHaveLength(6);
    expect(parseEnabledEventTypes("foo")).toHaveLength(6);
    expect(parseEnabledEventTypes("wisuda, WEDDING")).toEqual(["WEDDING", "WISUDA"]);
  });

  it("jenis acara tanpa tema aktif yang cocok tidak bisa dipilih", () => {
    expect(selectableEventTypes(["WEDDING", "BIRTHDAY"], ["WEDDING"])).toEqual(["WEDDING"]);
    // Tema satu nama mana pun cukup untuk acara non-pernikahan.
    expect(selectableEventTypes(["WEDDING", "KHITAN"], ["BIRTHDAY"])).toEqual(["KHITAN"]);
  });
});

describe.skipIf(!IS_TEST_DB)("jenis acara aktif di API", () => {
  beforeAll(async () => {
    previousSetting = (await prisma.adminSetting.findUnique({ where: { key: KEY } }))?.value ?? null;
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    adminId = admin.id;
  });

  afterAll(async () => {
    session.user = null;
    if (deactivated.length) await prisma.theme.updateMany({ where: { id: { in: deactivated } }, data: { isActive: true } });
    if (previousSetting === null) await prisma.adminSetting.deleteMany({ where: { key: KEY } });
    else await setEnabled(previousSetting);
    invalidateSettingsCache();
    await prisma.invitation.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.admin.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("undangan baru untuk jenis acara nonaktif ditolak 400 tanpa membuat undangan; jenis acara aktif lolos", async () => {
    await setEnabled("WEDDING");
    expect((await getPublicPlatformSettings()).enabledEventTypes).toEqual(["WEDDING"]);

    const u = await paidClient();
    const rejected = await createInvitation(json("/api/client/invitations/create", { eventType: "BIRTHDAY", participantsJson: { person: { name: "Nadia" } } }));
    expect(rejected.status).toBe(400);
    expect(await prisma.invitation.count({ where: { userId: u.id } })).toBe(0);

    const ok = await createInvitation(json("/api/client/invitations/create", { eventType: "WEDDING", participantsJson: { groom: { name: "Adi" }, bride: { name: "Sari" } } }));
    expect(ok.status).toBe(200);
  });

  it("draf yang sudah berjenis acara nonaktif tetap bisa disimpan", async () => {
    await setEnabled("WEDDING,KHITAN");
    const u = await paidClient();
    const first = await createInvitation(json("/api/client/invitations/create", { eventType: "KHITAN", participantsJson: { person: { name: "Fariz" } } }));
    expect(first.status).toBe(200);

    await setEnabled("WEDDING");
    const again = await createInvitation(json("/api/client/invitations/create", { eventType: "KHITAN", participantsJson: { person: { name: "Fariz" } } }));
    expect(again.status).toBe(200);
    expect(await prisma.invitation.count({ where: { userId: u.id } })).toBe(1);
  });

  it("tanpa pilihan tema, tema bawaan yang nonaktif diganti tema aktif yang cocok; tanpa tema cocok ditolak 400", async () => {
    await setEnabled("WEDDING,BIRTHDAY,KHITAN,AQIQAH,WISUDA,GATHERING");
    await prisma.theme.update({ where: { id: "al-fariz" }, data: { isActive: false } });
    deactivated.push("al-fariz");

    const u = await paidClient();
    const res = await createInvitation(json("/api/client/invitations/create", { eventType: "KHITAN", participantsJson: { person: { name: "Fariz" } } }));
    expect(res.status).toBe(200);
    const inv = await prisma.invitation.findFirstOrThrow({ where: { userId: u.id } });
    expect(inv.themeId).not.toBe("al-fariz");
    const picked = await prisma.theme.findUniqueOrThrow({ where: { id: inv.themeId! } });
    expect([picked.isActive, picked.eventType === "WEDDING"]).toEqual([true, false]);

    const single = (await prisma.theme.findMany({ where: { isActive: true, NOT: { eventType: "WEDDING" } }, select: { id: true } })).map((t) => t.id);
    await prisma.theme.updateMany({ where: { id: { in: single } }, data: { isActive: false } });
    deactivated.push(...single);
    const u2 = await paidClient();
    const none = await createInvitation(json("/api/client/invitations/create", { eventType: "AQIQAH", participantsJson: { person: { name: "Aisyah" } } }));
    expect(none.status).toBe(400);
    expect(await prisma.invitation.count({ where: { userId: u2.id } })).toBe(0);
  });

  it("admin tidak bisa menyimpan pengaturan tanpa jenis acara; nilai dinormalkan", async () => {
    session.user = { id: adminId, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    const empty = await saveSettings(json("/api/admin/settings", [{ key: KEY, value: "", group: "event_types" }]));
    expect(empty.status).toBe(400);
    const saved = await saveSettings(json("/api/admin/settings", [{ key: KEY, value: "wisuda,wedding", group: "event_types" }]));
    expect(saved.status).toBe(200);
    expect((await prisma.adminSetting.findUniqueOrThrow({ where: { key: KEY } })).value).toBe("WEDDING,WISUDA");
  });
});
