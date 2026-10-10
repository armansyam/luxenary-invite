/**
 * Setelah undangan terbit, studio terkunci tetapi PIN panitia dan daftar tamu tetap dapat diubah klien
 * (keputusan pemilik 10 Okt 2026). Daftar tamu terkunci mulai hari terima tamu pada zona waktu acara.
 * (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { decryptPin } from "@/lib/pinEncryption";
import { PUT as staffPinPut } from "@/app/api/client/invitations/[id]/staff-pin/route";
import { PUT as invitationPut } from "@/app/api/client/invitations/[id]/route";
import { POST as guestPost } from "@/app/api/client/guests/route";
import { POST as guestBulkPost } from "@/app/api/client/guests/bulk/route";
import { NextRequest } from "next/server";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_pubedit_${Date.now()}`;
const users: string[] = [];
let seq = 0;

const req = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const setPin = (id: string, staffPin: unknown) => staffPinPut(req(`/api/client/invitations/${id}/staff-pin`, { staffPin }), { params: Promise.resolve({ id }) });
const addGuest = (invitationId: string, name: string) =>
  guestPost(new NextRequest("http://localhost/api/client/guests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ invitationId, name }) }));
const addGuestsBulk = (invitationId: string, names: string[]) =>
  guestBulkPost(new NextRequest("http://localhost/api/client/guests/bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ invitationId, guests: names.map((name) => ({ name })) }) }));

async function makeInvitation(status: string, date: string, timezone = "WITA") {
  seq++;
  const user = await prisma.user.create({ data: { email: `${TAG}_${seq}@t.local`, name: `Klien ${seq}` } });
  users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${TAG}-${seq}`, planType: "TIER_3", amount: 200000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      orderId: order.id,
      invitationSlug: `${TAG}-${seq}`,
      groomSlug: `${TAG}-g${seq}`,
      brideSlug: `${TAG}-b${seq}`,
      groomName: "Raka",
      brideName: "Dewi",
      status: status as never,
      publishedAt: status === "DRAFT" ? null : new Date(),
      eventData: [{ title: "Resepsi", date, time: "11:00", timezone, location: "Gedung", isPrimary: true }],
    },
  });
  sessionUser = { id: user.id, role: "CLIENT" };
  return inv;
}

describe.skipIf(!IS_TEST_DB)("perubahan klien setelah undangan terbit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    sessionUser = null;
    await prisma.invitation.deleteMany({ where: { userId: { in: users } } });
    await prisma.order.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("undangan terbit: PUT utama tetap 403, PIN lewat endpoint khusus tersimpan terenkripsi", async () => {
    const inv = await makeInvitation("PUBLISHED", "2099-12-12");
    const locked = await invitationPut(req(`/api/client/invitations/${inv.id}`, { staffPin: "AB12" }) as never, { params: Promise.resolve({ id: inv.id }) });
    expect(locked.status).toBe(403);

    const res = await setPin(inv.id, " AB12 ");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ staffPin: "AB12" });
    const stored = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, select: { staffPin: true } });
    expect(stored.staffPin).not.toBe("AB12");
    expect(decryptPin(stored.staffPin!)).toBe("AB12");
  });

  it("PIN tidak sah -> 400; bukan pemilik -> 403; tanpa sesi -> 401", async () => {
    const inv = await makeInvitation("PUBLISHED", "2099-12-12");
    expect((await setPin(inv.id, "12")).status).toBe(400);
    expect((await setPin(inv.id, "AB 12")).status).toBe(400);
    sessionUser = { id: "pengguna-lain", role: "CLIENT" };
    expect((await setPin(inv.id, "AB12")).status).toBe(403);
    sessionUser = null;
    expect((await setPin(inv.id, "AB12")).status).toBe(401);
  });

  it("undangan diarsipkan atau hari acara sudah lewat -> 409, PIN lama tetap", async () => {
    const archived = await makeInvitation("ARCHIVED", "2099-12-12");
    expect((await setPin(archived.id, "AB12")).status).toBe(409);
    const past = await makeInvitation("PUBLISHED", "2020-01-10");
    expect((await setPin(past.id, "AB12")).status).toBe(409);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: past.id } })).staffPin).toBeNull();
  });

  it("daftar tamu undangan terbit dapat ditambah sebelum hari acara", async () => {
    const inv = await makeInvitation("PUBLISHED", "2099-12-12");
    expect((await addGuest(inv.id, "Pak Budi")).status).toBe(200);
    expect((await addGuestsBulk(inv.id, ["Bu Sari", "Mas Andi"])).status).toBe(200);
    expect(await prisma.guest.count({ where: { invitationId: inv.id } })).toBe(3);
  });

  it("kunci daftar tamu mengikuti zona waktu acara, bukan zona server", async () => {
    // 11 Des 2099 15:30 UTC = 12 Des 00:30 WIT (hari acara sudah mulai) = 11 Des 22:30 WIB (belum).
    const wit = await makeInvitation("PUBLISHED", "2099-12-12", "WIT");
    const witOwner = sessionUser;
    const wib = await makeInvitation("PUBLISHED", "2099-12-12", "WIB");
    const wibOwner = sessionUser;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2099-12-11T15:30:00Z"));

    sessionUser = witOwner;
    expect((await addGuest(wit.id, "Tamu WIT")).status).toBe(403);
    expect((await addGuestsBulk(wit.id, ["Tamu WIT 2"])).status).toBe(403);
    sessionUser = wibOwner;
    expect((await addGuest(wib.id, "Tamu WIB")).status).toBe(200);
  });
});
