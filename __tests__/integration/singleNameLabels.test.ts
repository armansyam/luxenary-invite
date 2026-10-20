/**
 * Undangan non-pernikahan tidak menyimpan salinan label blueprint (temuan uji alur 20 Okt 2026: "THE COUPLE",
 * "WISHES & RSVP" dan "Waktu & Tempat" menimpa token jenis acara di halaman terbit). Handler rute pembuatan undangan
 * dipanggil langsung dengan DB luxenary_test; hanya sesi (`@/auth`) yang di-mock.
 */
import { describe, it, expect, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { sortThemesForEvent } from "@/lib/invitationUtils";

const session = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (session.user ? { user: session.user } : null)) }));

import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `snl${Date.now()}`;
const userIds: string[] = [];

const PARTICIPANTS: Record<string, unknown> = {
  WEDDING: { groom: { name: "Raka Aditya", nickname: "Raka" }, bride: { name: "Dewi Lestari", nickname: "Dewi" } },
  BIRTHDAY: { person: { name: "Kayla Azzahra", nickname: "Kayla", age: 7 } },
  KHITAN: { child: { name: "Muhammad Rafa", nickname: "Rafa", age: 8 } },
  AQIQAH: { baby: { name: "Aisyah Humaira", nickname: "Aisyah" } },
  WISUDA: { person: { name: "Bima Prasetya, S.Kom.", nickname: "Bima", degree: "S.Kom." } },
  GATHERING: { event: { title: "Forum UMKM Sulawesi", organizer: "Komunitas Usaha Digital" } },
};

async function create(eventType: string, themeId: string) {
  const user = await prisma.user.create({ data: { email: `vitest_${TAG}_${eventType}_${themeId}@example.test`, name: "Uji" } });
  userIds.push(user.id);
  await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-${eventType}-${themeId}`, planType: "TIER_3", amount: 1, status: "PAID", paidAt: new Date() } as never });
  session.user = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };
  const res = await createInvitation(new NextRequest("http://localhost/api/client/invitations/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType, participantsJson: JSON.stringify(PARTICIPANTS[eventType]), weddingDate: "2099-12-05", eventDate: "2099-12-05", city: "Makassar", timeZone: "WITA", eventTime: "10:00 – 14:00 WITA", resepsiTime: "10:00 – 14:00 WITA", themeId, planType: "TIER_3" }),
  }));
  expect(res.status, `${eventType}/${themeId}`).toBe(200);
  return prisma.invitation.findFirstOrThrow({ where: { userId: user.id } });
}

afterAll(async () => {
  if (userIds.length) {
    await prisma.invitation.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("label undangan non-pernikahan", () => {
  const CASES: Array<[string, string]> = [
    ["BIRTHDAY", "riang"], ["KHITAN", "fajar"], ["AQIQAH", "buaian"], ["WISUDA", "toga"], ["GATHERING", "prakarsa"],
    // Tema satu nama dipakai jenis acara lain.
    ["WISUDA", "riang"], ["BIRTHDAY", "festivo"],
  ];

  it.each(CASES)("%s dengan tema %s: tanpa salinan label, halaman memakai teks jenis acara", async (eventType, themeId) => {
    const inv = await create(eventType, themeId);
    expect((inv.featureSettings as any)?.customLabels ?? {}).toEqual({});

    const data = (await composeTemplateData(inv.id)) as any;
    const html = await renderTemplateFile(themeId, data, { editMode: false, invitationId: inv.id });
    expect(html).not.toContain("THE COUPLE");
    expect(html).not.toMatch(/WISHES (&amp;|&) RSVP/);
    expect(html).not.toContain("S.Kom..");
    if (["riang", "fajar", "buaian", "toga", "prakarsa"].includes(themeId)) expect(html).toContain(data.profileEyebrow);
  }, 30000);

  it("pernikahan tetap mendapat label bawaan tema", async () => {
    const inv = await create("WEDDING", "kalandra");
    const labels = (inv.featureSettings as any)?.customLabels || {};
    expect(labels.coupleEyebrow).toBeTruthy();
    expect(labels.rsvpTitle).toBeTruthy();
  });
});

describe("sortThemesForEvent", () => {
  it("tema jenis acara undangan tampil lebih dulu, urutan lain tetap", () => {
    const themes = [{ id: "festivo", eventType: "BIRTHDAY" }, { id: "cendekia", eventType: "WISUDA" }, { id: "riang", eventType: "BIRTHDAY" }, { id: "toga", eventType: "WISUDA" }];
    expect(sortThemesForEvent(themes, "WISUDA").map((t) => t.id)).toEqual(["cendekia", "toga", "festivo", "riang"]);
    expect(sortThemesForEvent(themes, "wisuda").map((t) => t.id)).toEqual(["cendekia", "toga", "festivo", "riang"]);
    expect(themes.map((t) => t.id)).toEqual(["festivo", "cendekia", "riang", "toga"]);
  });
});
