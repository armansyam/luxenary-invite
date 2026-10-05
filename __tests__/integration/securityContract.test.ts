/**
 * Kontrak keamanan terhadap PostgreSQL sungguhan (hanya berjalan di database `luxenary_test`).
 * Setiap kasus di sini pernah terbukti bocor sebelum diperbaiki.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: { id: string; email: string; role: string; isAdmin: boolean } | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { generateReceptionistToken } from "@/lib/receptionistAuth";
import { GET as guestsGet } from "@/app/api/receptionist/guests/route";
import { GET as memoriesGet } from "@/app/api/public/memories/[invitationId]/route";
import { GET as rsvpsGet } from "@/app/api/client/rsvps/route";
import { PUT as invitationPut } from "@/app/api/client/invitations/[id]/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_sec_${Date.now()}`;
const STORED_PIN = "enc:pin-v1";
const GUEST_PHONE = "081234567890";
const GUEST_EMAIL = "budi.pribadi@mail.com";

const ids = { users: [] as string[], invitations: [] as string[] };
let owner: { id: string; email: string };
let attacker: { id: string; email: string };
let loner: { id: string; email: string };
let invA = "";
let invB = "";

const savedSecret = process.env.AUTH_SECRET;

function guestsRequest(invitationId: string, token?: string) {
  return new NextRequest(`http://localhost/api/receptionist/guests?invitationId=${invitationId}`, {
    headers: token ? { "x-receptionist-token": token } : {},
  });
}

function actAs(user: { id: string; email: string } | null, role = "CLIENT") {
  sessionUser = user ? { id: user.id, email: user.email, role, isAdmin: role !== "CLIENT" } : null;
}

describe.skipIf(!IS_TEST_DB)("Kontrak keamanan (DB luxenary_test)", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "vitest-security-contract-secret";
    const mk = async (tag: string) => {
      const u = await prisma.user.create({ data: { email: `${TAG}_${tag}@t.local`, name: tag } });
      ids.users.push(u.id);
      return { id: u.id, email: u.email };
    };
    owner = await mk("owner");
    attacker = await mk("attacker");
    loner = await mk("loner");

    const a = await prisma.invitation.create({
      data: { userId: owner.id, invitationSlug: `${TAG}-a`, groomSlug: `${TAG}-ga`, brideSlug: `${TAG}-ba`, staffPin: STORED_PIN },
    });
    const b = await prisma.invitation.create({
      data: { userId: attacker.id, invitationSlug: `${TAG}-b`, groomSlug: `${TAG}-gb`, brideSlug: `${TAG}-bb`, staffPin: STORED_PIN },
    });
    invA = a.id;
    invB = b.id;
    ids.invitations.push(a.id, b.id);

    const guest = await prisma.guest.create({
      data: { invitationId: invA, name: "Tamu Rahasia", slug: "tamu-rahasia", qrToken: `qr_${TAG}`, phone: GUEST_PHONE },
    });
    await prisma.rsvp.create({
      data: { invitationId: invA, guestId: guest.id, guestName: "Tamu Rahasia", status: "hadir", guestCount: 2, message: "pesan pribadi" },
    });
    await prisma.guestMemory.create({
      data: { invitationId: invA, senderName: "Budi", senderEmail: GUEST_EMAIL, mediaUrl: "/x.webp" },
    });
  });

  afterAll(async () => {
    await prisma.rsvp.deleteMany({ where: { invitationId: { in: ids.invitations } } });
    await prisma.guestMemory.deleteMany({ where: { invitationId: { in: ids.invitations } } });
    await prisma.guest.deleteMany({ where: { invitationId: { in: ids.invitations } } });
    await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.rateLimitCounter.deleteMany({ where: { key: { startsWith: "rcpt_guests:" } } });
    await prisma.$disconnect();
    await pool.end();
    if (savedSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = savedSecret;
  });

  describe("H1 — /api/receptionist/guests", () => {
    it("tanpa token -> 401 dan tidak ada data tamu", async () => {
      const res = await guestsGet(guestsRequest(invA));
      const text = await res.text();
      expect(res.status).toBe(401);
      expect(text).not.toContain(`qr_${TAG}`);
      expect(text).not.toContain("Tamu Rahasia");
    });

    it("token milik undangan LAIN -> 401", async () => {
      const otherToken = generateReceptionistToken(invB, STORED_PIN);
      const res = await guestsGet(guestsRequest(invA, otherToken));
      expect(res.status).toBe(401);
    });

    it("token valid -> 200 dengan daftar tamu", async () => {
      const token = generateReceptionistToken(invA, STORED_PIN);
      const res = await guestsGet(guestsRequest(invA, token));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.guests[0].qrToken).toBe(`qr_${TAG}`);
    });

    it("PIN diganti -> token lama ditolak", async () => {
      const token = generateReceptionistToken(invA, STORED_PIN);
      await prisma.invitation.update({ where: { id: invA }, data: { staffPin: "enc:pin-v2" } });
      try {
        const res = await guestsGet(guestsRequest(invA, token));
        expect(res.status).toBe(401);
      } finally {
        await prisma.invitation.update({ where: { id: invA }, data: { staffPin: STORED_PIN } });
      }
    });
  });

  describe("H3 — /api/public/memories/[invitationId]", () => {
    const fetchMemories = () =>
      memoriesGet(new NextRequest(`http://localhost/api/public/memories/${invA}`), { params: { invitationId: invA } });

    it("tidak membocorkan email pengirim pada undangan yang terbit", async () => {
      await prisma.invitation.update({ where: { id: invA }, data: { status: "PUBLISHED" } });
      try {
        const res = await fetchMemories();
        const text = await res.text();
        expect(res.status).toBe(200);
        expect(text).toContain("Budi");
        expect(text).not.toContain(GUEST_EMAIL);
      } finally {
        await prisma.invitation.update({ where: { id: invA }, data: { status: "DRAFT" } });
      }
    });

    it("undangan DRAFT dan TAKEN_DOWN tidak menyajikan galeri (404)", async () => {
      expect((await fetchMemories()).status).toBe(404);
      await prisma.invitation.update({ where: { id: invA }, data: { status: "TAKEN_DOWN" } });
      try {
        expect((await fetchMemories()).status).toBe(404);
      } finally {
        await prisma.invitation.update({ where: { id: invA }, data: { status: "DRAFT" } });
      }
    });
  });

  describe("H2 — /api/client/rsvps", () => {
    const call = (invitationId?: string) =>
      rsvpsGet(new NextRequest(`http://localhost/api/client/rsvps${invitationId ? `?invitationId=${invitationId}` : ""}`));

    it("tanpa login -> 401", async () => {
      actAs(null);
      expect((await call(invA)).status).toBe(401);
    });

    it("bukan pemilik undangan -> 403 tanpa data", async () => {
      actAs(attacker);
      const res = await call(invA);
      const text = await res.text();
      expect(res.status).toBe(403);
      expect(text).not.toContain(GUEST_PHONE);
    });

    it("user tanpa undangan tidak menerima RSVP milik tenant lain", async () => {
      actAs(loner);
      const res = await call();
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.rsvps).toEqual([]);
      expect(JSON.stringify(body)).not.toContain(GUEST_PHONE);
    });

    it("pemilik -> 200 dengan RSVP miliknya", async () => {
      actAs(owner);
      const res = await call(invA);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.rsvps).toHaveLength(1);
    });

    it("admin dapat membaca RSVP undangan mana pun", async () => {
      actAs(attacker, "SUPER_ADMIN");
      const res = await call(invA);
      expect(res.status).toBe(200);
    });

    it("staf tanpa modul invitations (FINANCE) -> 403 tanpa data", async () => {
      actAs(attacker, "FINANCE");
      const res = await call(invA);
      const text = await res.text();
      expect(res.status).toBe(403);
      expect(text).not.toContain(GUEST_PHONE);
    });

    it("staf dengan modul invitations (SUPPORT) -> 200", async () => {
      actAs(attacker, "SUPPORT");
      expect((await call(invA)).status).toBe(200);
    });
  });

  describe("M6 — PUT /api/client/invitations/[id] validasi status", () => {
    let invDraft = "";
    let invTakenDown = "";

    const put = (id: string, body: Record<string, unknown>) =>
      invitationPut(
        new Request(`http://localhost/api/client/invitations/${id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        { params: { id } }
      );
    const statusOf = async (id: string) => (await prisma.invitation.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;

    beforeAll(async () => {
      const draft = await prisma.invitation.create({
        data: { userId: owner.id, invitationSlug: `${TAG}-m6d`, groomSlug: `${TAG}-gm6d`, brideSlug: `${TAG}-bm6d`, status: "DRAFT" },
      });
      const takenDown = await prisma.invitation.create({
        data: { userId: owner.id, invitationSlug: `${TAG}-m6t`, groomSlug: `${TAG}-gm6t`, brideSlug: `${TAG}-bm6t`, status: "TAKEN_DOWN" },
      });
      invDraft = draft.id;
      invTakenDown = takenDown.id;
      ids.invitations.push(draft.id, takenDown.id);
    });

    it("nilai status di luar enum -> 400 dan status tidak berubah", async () => {
      actAs(owner);
      const res = await put(invDraft, { status: "HACKED" });
      expect(res.status).toBe(400);
      expect(await statusOf(invDraft)).toBe("DRAFT");
    });

    it("pemilik tidak boleh menetapkan status ARCHIVED/TAKEN_DOWN/EVENT_FINISHED sendiri", async () => {
      actAs(owner);
      for (const status of ["ARCHIVED", "TAKEN_DOWN", "EVENT_FINISHED"]) {
        const res = await put(invDraft, { status });
        expect(res.status, status).toBe(403);
      }
      expect(await statusOf(invDraft)).toBe("DRAFT");
    });

    it("pemilik tidak dapat mem-publish ulang undangan yang di-takedown admin", async () => {
      actAs(owner);
      const res = await put(invTakenDown, { status: "PUBLISHED" });
      expect(res.status).toBe(403);
      expect(await statusOf(invTakenDown)).toBe("TAKEN_DOWN");
    });

    it("pemilik lain -> 403 sebelum validasi status", async () => {
      actAs(attacker);
      const res = await put(invTakenDown, { status: "PUBLISHED" });
      expect(res.status).toBe(403);
      expect(await statusOf(invTakenDown)).toBe("TAKEN_DOWN");
    });

    it("staf tanpa modul invitations (FINANCE) tidak dapat mengubah undangan klien", async () => {
      actAs(attacker, "FINANCE");
      const res = await put(invTakenDown, { status: "DRAFT" });
      expect(res.status).toBe(403);
      expect(await statusOf(invTakenDown)).toBe("TAKEN_DOWN");
    });

    it("admin dapat memulihkan undangan yang di-takedown", async () => {
      actAs(attacker, "SUPER_ADMIN");
      const res = await put(invTakenDown, { status: "DRAFT" });
      expect(res.status).toBe(200);
      expect(await statusOf(invTakenDown)).toBe("DRAFT");
    });
  });
});
