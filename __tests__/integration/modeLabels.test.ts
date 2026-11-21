/**
 * Undangan non-pernikahan menyalin label lengkap dari master terpilih yang dirender untuk jenis acaranya, bukan dari
 * blueprint (temuan uji alur 20 Okt 2026: salinan blueprint berisi "THE COUPLE", "WISHES & RSVP" dan "Waktu & Tempat"
 * yang menimpa token jenis acara di halaman terbit). Handler rute pembuatan undangan dipanggil langsung dengan DB
 * luxenary_test; hanya sesi (`@/auth`) yang di-mock.
 */
import { describe, it, expect, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import {
  extractSubEventOptions,
  isThemeInMode,
  resolveSubEventMeta,
  sortThemesForEvent,
} from "@/lib/invitationUtils";

const session = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (session.user ? { user: session.user } : null)) }));

import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { composeInvitationData, composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `snl${Date.now()}`;
const userIds: string[] = [];

const PARTICIPANTS: Record<string, unknown> = {
  WEDDING: { groom: { name: "Raka Aditya", nickname: "Raka" }, bride: { name: "Dewi Lestari", nickname: "Dewi" } },
  "PERSONAL:Ulang Tahun": { person: { name: "Kayla Azzahra", nickname: "Kayla", age: 7 } },
  "PERSONAL:Khitanan": { person: { name: "Muhammad Rafa", nickname: "Rafa", age: 8 } },
  "PERSONAL:Aqiqah": { person: { name: "Aisyah Humaira", nickname: "Aisyah" } },
  "PERSONAL:Wisuda": { person: { name: "Bima Prasetya, S.Kom.", nickname: "Bima", degree: "S.Kom." } },
  "PERSONAL:Tamatan Ngaji": { person: { name: "Bilal Al-Farisi", nickname: "Bilal", detail: "Khatam 30 Juz" } },
  "EVENT:Corporate": { event: { title: "Forum UMKM Sulawesi", organizer: "Komunitas Usaha Digital" } },
};

async function create(eventType: string, themeId: string, subEvent?: string) {
  const n = userIds.length;
  const user = await prisma.user.create({ data: { email: `vitest_${TAG}_${eventType}_${themeId}_${n}@example.test`, name: "Uji" } });
  userIds.push(user.id);
  await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-${eventType}-${themeId}-${n}`, planType: "TIER_3", amount: 1, status: "PAID", paidAt: new Date() } as never });
  session.user = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };
  const pKey = subEvent ? `${eventType}:${subEvent}` : eventType;
  const res = await createInvitation(new NextRequest("http://localhost/api/client/invitations/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType, ...(subEvent ? { subEvent } : {}), participantsJson: JSON.stringify(PARTICIPANTS[pKey] || PARTICIPANTS["PERSONAL:Ulang Tahun"]), weddingDate: "2099-12-05", eventDate: "2099-12-05", city: "Makassar", timeZone: "WITA", eventTime: "10:00 – 14:00 WITA", resepsiTime: "10:00 – 14:00 WITA", themeId, planType: "TIER_3" }),
  }));
  expect(res.status, `${eventType}/${subEvent || ""}/${themeId}`).toBe(200);
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
  const CASES: Array<[string, string | undefined, string]> = [
    ["PERSONAL", "Ulang Tahun", "riang"],
    ["PERSONAL", "Khitanan", "fajar"],
    ["PERSONAL", "Aqiqah", "buaian"],
    ["PERSONAL", "Wisuda", "toga"],
    ["PERSONAL", "Tamatan Ngaji", "al-fariz"],
    ["EVENT", "Corporate", "prakarsa"],
    ["PERSONAL", "Wisuda", "riang"],
    ["PERSONAL", "Ulang Tahun", "festivo"],
  ];

  it.each(CASES)("%s (%s) dengan tema %s: label lengkap dari master sesuai jenis acara, piring tersalin, tanggal tidak dibekukan", async (eventType, subEvent, themeId) => {
    const inv = await create(eventType, themeId, subEvent);
    const labels: Record<string, string> = (inv.featureSettings as any)?.customLabels ?? {};
    const isNewMaster = ["riang", "fajar", "buaian", "toga", "prakarsa"].includes(themeId);

    expect(Object.keys(labels).length, "label tersalin").toBeGreaterThan(5);
    expect(Object.values(labels)).not.toContain("THE COUPLE");
    expect(Object.values(labels)).not.toContain("WISHES & RSVP");
    expect(await prisma.invitationDraft.count({ where: { invitationId: inv.id } }), "piring").toBe(1);

    const data = (await composeTemplateData(inv.id)) as any;
    if (isNewMaster) {
      expect(labels.coupleEyebrow).toBe(data.profileEyebrow);
      expect(labels.eventsTitle).toBe(data.agendaTitle);
      // Teks master berisi {{eventDateFormatted}}: harus tetap mengikuti tanggal acara, bukan dibekukan.
      expect(labels.eventsSub).toBeUndefined();
    }

    const html = await renderTemplateFile(themeId, data, { editMode: false, invitationId: inv.id });
    expect(html).not.toContain("THE COUPLE");
    expect(html).not.toMatch(/WISHES (&amp;|&) RSVP/);
    expect(html).not.toContain("S.Kom..");

    if (isNewMaster) {
      const events = (inv.eventData as any[]).map((e) => ({ ...e, date: "2099-12-19" }));
      await prisma.invitation.update({ where: { id: inv.id }, data: { eventData: events } });
      const moved = await renderTemplateFile(themeId, (await composeTemplateData(inv.id)) as any, { editMode: false, invitationId: inv.id });
      expect(moved).toMatch(/data-lux-field="customLabels\.eventsSub">[^<]*19 Desember 2099/);
    }
  }, 30000);

  it("suntingan label klien menang atas label bawaan", async () => {
    const inv = await create("PERSONAL", "toga", "Wisuda");
    const fsSettings = inv.featureSettings as any;
    await prisma.invitation.update({ where: { id: inv.id }, data: { featureSettings: { ...fsSettings, customLabels: { ...fsSettings.customLabels, coupleTitle: "LABEL_KLIEN_UJI" } } } });
    const html = await renderTemplateFile("toga", (await composeTemplateData(inv.id)) as any, { editMode: false, invitationId: inv.id });
    expect(html).toContain("LABEL_KLIEN_UJI");
  }, 30000);

  it("pernikahan tetap mendapat label bawaan tema", async () => {
    const inv = await create("WEDDING", "kalandra");
    expect(await prisma.invitationDraft.count({ where: { invitationId: inv.id } }), "piring").toBe(1);
    const labels = (inv.featureSettings as any)?.customLabels || {};
    expect(labels.coupleEyebrow).toBeTruthy();
    expect(labels.rsvpTitle).toBeTruthy();
  });
});

describe("sortThemesForEvent & extractSubEventOptions", () => {
  it("tema spesifik subEvent tampil lebih dulu di dalam kategori yang sama", () => {
    const themes = [
      { id: "festivo", eventType: "PERSONAL", subEvent: "Ulang Tahun" },
      { id: "cendekia", eventType: "PERSONAL", subEvent: "Wisuda" },
      { id: "al-khalid", eventType: "PERSONAL", subEvent: "Aqiqah" },
      { id: "toga", eventType: "PERSONAL", subEvent: "Wisuda" },
    ];
    expect(sortThemesForEvent(themes, "PERSONAL", "Wisuda").map((t) => t.id)).toEqual(["cendekia", "toga", "festivo", "al-khalid"]);
    expect(extractSubEventOptions(themes, "PERSONAL")).toEqual(["Aqiqah", "Ulang Tahun", "Wisuda"]);
  });
});

describe("Isolasi 3 Mode Tegas (WEDDING / PERSONAL / EVENT) & Dynamic SubEvent Meta", () => {
  it("isThemeInMode mengisolasi ketat antar 3 mode", () => {
    expect(isThemeInMode("WEDDING", "WEDDING")).toBe(true);
    expect(isThemeInMode("WEDDING", "PERSONAL")).toBe(false);
    expect(isThemeInMode("WEDDING", "EVENT")).toBe(false);

    expect(isThemeInMode("PERSONAL", "PERSONAL")).toBe(true);
    expect(isThemeInMode("PERSONAL", "WEDDING")).toBe(false);
    expect(isThemeInMode("PERSONAL", "EVENT")).toBe(false);

    expect(isThemeInMode("EVENT", "EVENT")).toBe(true);
    expect(isThemeInMode("EVENT", "PERSONAL")).toBe(false);
    expect(isThemeInMode("EVENT", "WEDDING")).toBe(false);
  });

  it("resolveSubEventMeta mendukung preset maupun sub-acara kustom bebas seperti Tamatan Ngaji", () => {
    const customMeta = resolveSubEventMeta("PERSONAL", "Tamatan Ngaji");
    expect(customMeta.label).toBe("Tamatan Ngaji");
    expect(customMeta.coverBadge).toBe("TAMATAN NGAJI");
    expect(customMeta.slugSuffix).toBe("tamatan-ngaji");
  });
});

describe("EVENT non-human parentsHtml guard", () => {
  it("composeInvitationData untuk EVENT tidak pernah mencetak nama orang tua meski sisa draf participantsJson punya parents", async () => {
    const data = await composeInvitationData({
      id: "demo-event-guard",
      invitationSlug: "demo-event-guard",
      eventType: "EVENT",
      subEvent: "Grand Opening",
      themeId: "sinergi",
      participantsJson: {
        event: { title: "Grand Opening Studio", subtitle: "Inovasi Baru", organizer: "PT Kreatif" },
        parents: { father: "Bpk. Sisa Draf", mother: "Ibu Sisa Draf" },
        person: { fatherName: "Bpk. Sisa Draf", motherName: "Ibu Sisa Draf" },
      },
      eventData: [{ title: "Peresmian", date: "2027-07-01", isPrimary: true }],
      media: [],
      featureSettings: {},
      rsvps: [],
      bankAccounts: [],
    });
    expect(data.parentsHtml).toBe("");
    expect(data.mainName).toBe("Grand Opening Studio");
  });
});
