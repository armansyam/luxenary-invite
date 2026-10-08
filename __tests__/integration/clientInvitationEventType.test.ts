/**
 * Daftar undangan klien harus membawa jenis acara dan data peserta: kartu QR cetak dan pratinjau layar pembuka
 * tamu membangun nama dari keduanya, bukan dari nama mempelai (DB luxenary_test).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

let session: any = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session) }));

import { prisma, pool } from "@/lib/prisma";
import { GET } from "@/app/api/client/invitations/route";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_evtype_${Date.now()}`;
const ids = { owner: "", order: "", invitation: "" };

describe.skipIf(!IS_TEST_DB)("GET /api/client/invitations: jenis acara", () => {
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
        eventType: "BIRTHDAY",
        invitationSlug: RUN,
        groomSlug: `${RUN}-g`,
        brideSlug: `${RUN}-b`,
        participantsJson: JSON.stringify({ person: { name: "Rani Kartika", nickname: "Rani", age: 7 } }),
      },
    });
    ids.invitation = inv.id;
    session = { user: { id: user.id, email: user.email, role: "CLIENT", isAdmin: false } };
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { id: ids.invitation } });
    await prisma.order.deleteMany({ where: { id: ids.order } });
    await prisma.user.deleteMany({ where: { id: ids.owner } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("mengembalikan eventType dan participantsJson, sehingga nama kartu mengikuti jenis acara", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    const list: any[] = body.invitations ?? body;
    const mine = list.find((i) => i.id === ids.invitation);

    expect(mine.eventType).toBe("BIRTHDAY");
    expect(typeof mine.participantsJson).toBe("string");
    expect(resolveInvitationDisplayName(mine)).toBe("Rani — Ulang Tahun ke-7");
    expect(resolveInvitationDisplayName(mine)).not.toMatch(/Mempelai/i);
  });
});

describe("resolveInvitationDisplayName", () => {
  it("pernikahan memakai nama panggilan, acara lain memakai peserta", () => {
    expect(resolveInvitationDisplayName({ eventType: "WEDDING", groomNickname: "Raka", brideNickname: "Dewi" })).toBe("Raka & Dewi");
    expect(resolveInvitationDisplayName({ eventType: "KHITAN", participantsJson: JSON.stringify({ child: { nickname: "Fajar" } }) })).toBe("Fajar — Khitanan");
    expect(resolveInvitationDisplayName({ eventType: "GATHERING", participantsJson: JSON.stringify({ event: { title: "Syukuran Kantor" } }) })).toBe("Syukuran Kantor");
  });
});
