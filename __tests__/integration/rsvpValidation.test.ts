/**
 * POST /api/public/rsvp: status dinormalkan ke hadir/tidak/ragu, nilai lain ditolak, dan panjang input dibatasi.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { POST as rsvpPost } from "@/app/api/public/rsvp/route";
import { RSVP_NAME_MAX, RSVP_MESSAGE_MAX } from "@/lib/rsvpStatus";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `rsvpval${Date.now()}`;

let invitationId = "";
let ipSeq = 0;

const post = (body: unknown) =>
  rsvpPost(
    new NextRequest("http://localhost/api/public/rsvp", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": `198.51.100.${(ipSeq++ % 200) + 20}` },
      body: JSON.stringify(body),
    })
  );

const storedStatuses = async () =>
  (await prisma.rsvp.findMany({ where: { invitationId }, orderBy: { respondedAt: "asc" } })).map((r) => [r.guestName, r.status, r.guestCount]);

describe.skipIf(!IS_TEST_DB)("validasi RSVP publik", () => {
  beforeAll(async () => {
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'rsvp_post:%'");
    const user = await prisma.user.create({ data: { email: `${TAG}@example.test`, name: TAG } });
    const inv = await prisma.invitation.create({
      data: { userId: user.id, invitationSlug: `${TAG}-inv`, groomSlug: `${TAG}-g`, brideSlug: `${TAG}-b`, status: "PUBLISHED" },
    });
    invitationId = inv.id;
  });

  afterAll(async () => {
    await prisma.rsvp.deleteMany({ where: { invitationId } });
    await prisma.invitation.deleteMany({ where: { id: invitationId } });
    await prisma.user.deleteMany({ where: { email: `${TAG}@example.test` } });
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'rsvp_post:%'");
    await prisma.$disconnect();
    await pool.end();
  });

  it("ragam nilai tema disimpan sebagai nilai kanonik", async () => {
    const cases: Array<[string, string, string]> = [
      ["Tamu A", "HADIR", "hadir"],
      ["Tamu B", "TIDAK_HADIR", "tidak"],
      ["Tamu C", "RAGU", "ragu"],
      ["Tamu D", "tidak", "tidak"],
    ];
    for (const [guestName, status] of cases) {
      const res = await post({ invitationId, guestName, status, guestCount: 2 });
      expect(res.status, status).toBe(200);
    }
    const rows = await storedStatuses();
    expect(rows).toEqual([
      ["Tamu A", "hadir", 2],
      ["Tamu B", "tidak", 0],
      ["Tamu C", "ragu", 0],
      ["Tamu D", "tidak", 0],
    ]);
  });

  it("status di luar daftar -> 400 dan tidak tersimpan", async () => {
    const before = (await storedStatuses()).length;
    const res = await post({ invitationId, guestName: "Penyusup", status: "APA-SAJA" });
    expect(res.status).toBe(400);
    expect((await storedStatuses()).length).toBe(before);
  });

  it("nama dan pesan melebihi batas -> 400", async () => {
    const before = (await storedStatuses()).length;
    const longName = await post({ invitationId, guestName: "N".repeat(RSVP_NAME_MAX + 1), status: "hadir" });
    expect(longName.status).toBe(400);
    const longMessage = await post({ invitationId, guestName: "Pesan Panjang", status: "hadir", message: "A".repeat(RSVP_MESSAGE_MAX + 1) });
    expect(longMessage.status).toBe(400);
    expect((await storedStatuses()).length).toBe(before);
  });

  it("batas tepat diterima", async () => {
    const res = await post({ invitationId, guestName: "N".repeat(RSVP_NAME_MAX), status: "hadir", message: "A".repeat(RSVP_MESSAGE_MAX) });
    expect(res.status).toBe(200);
  });

  it("tipe data salah -> 400, bukan 500", async () => {
    for (const body of [
      { invitationId: 123, guestName: "X", status: "hadir" },
      { invitationId, guestName: { a: 1 }, status: "hadir" },
      { invitationId, guestName: "X", status: "hadir", message: ["a"] },
    ]) {
      const res = await post(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it("kirim ulang dengan ragam status lain memperbarui baris yang sama", async () => {
    const first = await post({ invitationId, guestName: "Tamu Ulang", status: "HADIR", guestCount: 2 });
    const second = await post({ invitationId, guestName: "tamu ulang", status: "TIDAK_HADIR" });
    expect((await first.json()).rsvp.id).toBe((await second.json()).rsvp.id);
    const row = (await storedStatuses()).find(([n]) => String(n).toLowerCase() === "tamu ulang");
    expect(row).toEqual(["Tamu Ulang", "tidak", 0]);
  });
});
