/**
 * participantsJson satu-satunya sumber nama peserta (migrasi 20261010140000). Sebelumnya nama mempelai juga tersimpan di
 * kolom groomName, brideName, dan seterusnya, dan PUT mengabaikan perubahan nama pada draf yang sudah bernama (200 tetapi
 * nama tidak berubah).
 * (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { PUT as invitationPut, PATCH as invitationPatch } from "@/app/api/client/invitations/[id]/route";
import { GET as adminInvitationsGet } from "@/app/api/admin/invitations/route";
import { participantNames, withWeddingField, weddingFieldValue } from "@/lib/participantUtils";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const STAMP = Date.now().toString(36);
const TAG = `vitest_participants_${STAMP}`;
const created = { users: [] as string[], admins: [] as string[] };
let adminId = "";
let seq = 0;

const send = (method: "PUT" | "PATCH", id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/client/invitations/${id}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const put = (id: string, body: unknown) => invitationPut(send("PUT", id, body) as never, { params: Promise.resolve({ id }) });
const patch = (id: string, body: unknown) => invitationPatch(send("PATCH", id, body) as never, { params: Promise.resolve({ id }) });

async function makeInvitation(data: Record<string, unknown>) {
  seq++;
  const user = await prisma.user.create({ data: { email: `${TAG}_${seq}@t.local`, name: `Klien ${seq}` } });
  created.users.push(user.id);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      eventType: "WEDDING",
      invitationSlug: `${TAG}-${seq}`,
      status: "DRAFT",
      eventData: [{ title: "Resepsi", date: "2099-12-12", time: "11:00", timezone: "WITA", location: "Gedung", isPrimary: true }],
      ...data,
    } as never,
  });
  sessionUser = { id: user.id, role: "CLIENT" };
  return inv;
}

describe("participantUtils", () => {
  it("field template pernikahan dipetakan ke participantsJson tanpa menyentuh peran lain", () => {
    const start = { groom: { name: "Raka", father: "Pak Hasan" }, bride: { name: "Dewi" } };
    const next = withWeddingField(start, "groomName", "Raka Putra");
    expect(next).toEqual({ groom: { name: "Raka Putra", father: "Pak Hasan" }, bride: { name: "Dewi" } });
    expect(start.groom.name).toBe("Raka");
    expect(weddingFieldValue(next, "brideName")).toBe("Dewi");
    expect(withWeddingField(start, "weddingTagline", "x")).toEqual(start);
  });

  it("nama tampilan: panggilan didahulukan, nama lengkap untuk email dan audit", () => {
    const p = { groom: { name: "Raka Putra", nickname: "Raka" }, bride: { name: "Dewi Ayu" } };
    expect(participantNames("WEDDING", p)).toEqual({ full: "Raka Putra & Dewi Ayu", short: "Raka & Dewi Ayu", first: "Raka", second: "Dewi Ayu" });
    expect(participantNames("GATHERING", { event: { title: "Reuni 2010" } }).full).toBe("Reuni 2010");
    expect(participantNames("WEDDING", null).full).toBe("");
  });
});

describe.skipIf(!IS_TEST_DB)("participantsJson sebagai satu-satunya sumber nama", () => {
  beforeAll(async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPPORT", permissions: [] } });
    adminId = admin.id;
    created.admins.push(admin.id);
  });

  afterAll(async () => {
    sessionUser = null;
    await prisma.invitation.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("kolom nama lama sudah tidak ada di tabel invitations", async () => {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'invitations' AND (column_name LIKE 'groom%' OR column_name LIKE 'bride%')
    `;
    expect(rows).toEqual([]);
  });

  it("draf yang sudah bernama tetap dapat memperbaiki nama mempelai", async () => {
    const inv = await makeInvitation({ participantsJson: { groom: { name: "Rakaa" }, bride: { name: "Dewi" } }, subdomain: `${TAG}-sub-${seq + 1}`.replace(/_/g, "-") });
    const res = await put(inv.id, { participantsJson: { groom: { name: "Raka" }, bride: { name: "Dewi" } } });
    expect(res.status).toBe(200);
    const row = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(row.participantsJson).toEqual({ groom: { name: "Raka" }, bride: { name: "Dewi" } });
  });

  it("subdomain pernikahan dibuat dari nama panggilan saat studio pertama kali menyimpan peserta", async () => {
    const inv = await makeInvitation({ participantsJson: Prisma.DbNull });
    const res = await put(inv.id, { participantsJson: { groom: { name: "Raka Putra", nickname: `Raka${STAMP}` }, bride: { nickname: `Dewi${STAMP}` } } });
    expect(res.status).toBe(200);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } })).subdomain).toBe(`raka${STAMP}-dewi${STAMP}`);
  });

  it("acara satu nama tidak mendapat subdomain otomatis", async () => {
    const inv = await makeInvitation({ eventType: "KHITAN", participantsJson: Prisma.DbNull });
    expect((await put(inv.id, { participantsJson: { child: { name: "Fatih" } } })).status).toBe(200);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } })).subdomain).toBeNull();
  });

  it("setelah terbit, peserta tidak dapat diubah lewat PATCH; kunci darurat admin membukanya", async () => {
    const before = { groom: { name: "Raka" }, bride: { name: "Dewi" } };
    const inv = await makeInvitation({ status: "PUBLISHED", publishedAt: new Date(), participantsJson: before });
    expect((await patch(inv.id, { participantsJson: { groom: { name: "Ganti" }, bride: { name: "Dewi" } } })).status).toBe(403);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } })).participantsJson).toEqual(before);

    await prisma.invitation.update({ where: { id: inv.id }, data: { adminUnlockedUntil: new Date(Date.now() + 60 * 60 * 1000) } });
    expect((await patch(inv.id, { participantsJson: { groom: { name: "Raka Putra" }, bride: { name: "Dewi" } } })).status).toBe(200);
  });

  it("pencarian admin menemukan nama peserta, tetapi tidak mencocokkan nama kunci JSON", async () => {
    const nickname = `Zulfa${STAMP}`;
    const inv = await makeInvitation({ participantsJson: { groom: { name: "Raka" }, bride: { name: "Zulfa Ayu", nickname } } });
    sessionUser = { id: adminId, role: "SUPPORT", isAdmin: true, permissions: [] };
    const search = async (q: string) => {
      const res = await adminInvitationsGet(new NextRequest(`http://localhost/api/admin/invitations?search=${encodeURIComponent(q)}&limit=100`));
      expect(res.status).toBe(200);
      return ((await res.json()).invitations as Array<{ id: string }>).map((row) => row.id);
    };
    expect(await search(nickname.toLowerCase())).toContain(inv.id);
    // "%" dan "_" dari kotak pencarian adalah huruf biasa, bukan wildcard ILIKE.
    expect(await search(`zulf%${STAMP}`)).not.toContain(inv.id);
    expect(await search("nickname")).not.toContain(inv.id);
  });
});
