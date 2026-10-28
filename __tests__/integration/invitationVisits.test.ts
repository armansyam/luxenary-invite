/**
 * Statistik kunjungan undangan: POST /api/public/visit mencatat satu baris per peramban (visitCount bertambah), hanya untuk
 * undangan terbit, tidak untuk pemilik/admin/demo; ringkasan dan daftar tamu di dasbor membaca hasilnya
 * (hanya berjalan di database `luxenary_test`).
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as visitPost } from "@/app/api/public/visit/route";
import { GET as guestsGet } from "@/app/api/client/guests/[id]/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_visit_${Date.now()}`;
const users: string[] = [];

const visit = (body: Record<string, unknown>) =>
  visitPost(new NextRequest("http://localhost/api/public/visit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const vid = (n: number) => `${TAG.replace(/[^A-Za-z0-9]/g, "")}v${n}`.padEnd(20, "x");

async function makeInvitation(status: "DRAFT" | "PUBLISHED") {
  const user = await prisma.user.create({ data: { email: `${TAG}_${users.length}@t.local`, name: "Klien" } });
  users.push(user.id);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      invitationSlug: `${TAG}-${users.length}`,
      participantsJson: { groom: { name: "Raka" }, bride: { name: "Dewi" } },
      status,
      eventData: [{ title: "Resepsi", date: "2099-01-10", startTime: "10:00", timezone: "WIB", isPrimary: true }],
    },
  });
  return { user, inv };
}

describe.skipIf(!IS_TEST_DB)("statistik kunjungan undangan (DB)", () => {
  afterAll(async () => {
    sessionUser = null;
    await prisma.invitation.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'visit:inv:%'");
  });

  it("mencatat per peramban, mengikat nama tamu, dan tampil di ringkasan serta daftar tamu", async () => {
    const { user, inv } = await makeInvitation("PUBLISHED");
    await prisma.guest.createMany({
      data: [
        { invitationId: inv.id, name: "Bapak Budi", slug: `${TAG}-budi`, waStatus: "SENT" },
        { invitationId: inv.id, name: "Ibu Sari", slug: `${TAG}-sari`, waStatus: "SENT" },
      ],
    });

    sessionUser = null;
    expect(await (await visit({ invitationId: inv.id, visitorId: vid(1), guestName: "bapak budi " })).json()).toEqual({ counted: true });
    // Peramban yang sama membuka lagi (sesi baru): baris sama, hitungan bertambah, nama lama tidak hilang.
    expect(await (await visit({ invitationId: inv.id, visitorId: vid(1), guestName: null })).json()).toEqual({ counted: true });
    expect(await (await visit({ invitationId: inv.id, visitorId: vid(2) })).json()).toEqual({ counted: true });

    const rows = await prisma.invitationVisit.findMany({ where: { invitationId: inv.id }, orderBy: { visitorId: "asc" } });
    expect(rows.map((r) => [r.visitCount, r.guestName])).toEqual([[2, "bapak budi"], [1, null]]);

    sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false };
    const params = { params: Promise.resolve({ id: inv.id }) };
    const summary = await (await guestsGet(new Request(`http://localhost/api/client/guests/${inv.id}?summary=1`), params)).json();
    expect(summary).toMatchObject({ guestCount: 2, waSentCount: 2, openCount: 3, visitorCount: 2, openedGuestCount: 1 });

    const list: Array<{ name: string; openedAt: string | null }> = await (await guestsGet(new Request(`http://localhost/api/client/guests/${inv.id}`), params)).json();
    const byName = Object.fromEntries(list.map((g) => [g.name, g.openedAt]));
    expect(byName["Bapak Budi"]).toBeTruthy();
    expect(byName["Ibu Sari"]).toBeNull();
  });

  it("tidak dihitung: draf, pemilik, admin, demo; masukan tidak sah ditolak", async () => {
    const { inv: draft } = await makeInvitation("DRAFT");
    const { user, inv } = await makeInvitation("PUBLISHED");

    sessionUser = null;
    expect(await (await visit({ invitationId: draft.id, visitorId: vid(3) })).json()).toEqual({ counted: false });
    expect(await (await visit({ invitationId: "demo-aeterna", visitorId: vid(3) })).json()).toEqual({ counted: false });

    sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false };
    expect(await (await visit({ invitationId: inv.id, visitorId: vid(4) })).json()).toEqual({ counted: false });
    sessionUser = { id: "admin-x", role: "SUPER_ADMIN", isAdmin: true, isRemote: true };
    expect(await (await visit({ invitationId: inv.id, visitorId: vid(5) })).json()).toEqual({ counted: false });

    sessionUser = null;
    expect((await visit({ invitationId: inv.id, visitorId: "pendek" })).status).toBe(400);
    expect((await visit({ invitationId: inv.id, visitorId: vid(6), guestName: 42 })).status).toBe(400);
    expect(await prisma.invitationVisit.count({ where: { invitationId: { in: [draft.id, inv.id] } } })).toBe(0);
  });
});
