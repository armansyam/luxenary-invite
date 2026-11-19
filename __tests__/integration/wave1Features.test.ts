import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { NextRequest } from "next/server";

const authState: { user: Record<string, unknown> | null } = { user: null };
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (authState.user ? { user: authState.user } : null)) }));
vi.mock("@/lib/cloudflare", () => ({
  purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })),
  purgeThemeEdgeCache: vi.fn(async () => ({ success: false, skipped: true })),
  purgeInvitationEdgeCache: vi.fn(async () => undefined),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { composeInvitationData } from "@/lib/themeEngine";
import { deletePublishedHtml } from "@/lib/staticPublisher";
import { GET as publicRsvpGet, POST as publicRsvpPost } from "@/app/api/public/rsvp/route";
import { GET as clientRsvpGet } from "@/app/api/client/rsvps/route";
import { PATCH as clientRsvpPatch, DELETE as clientRsvpDelete } from "@/app/api/client/rsvps/[id]/route";
import { GET as publicCalendarIcsGet } from "@/app/api/public/invitations/[slug]/calendar.ics/route";
import { POST as adminSettingsPost } from "@/app/api/admin/settings/route";
import { buildIcsCalendar } from "@/lib/calendarLinks";
import { parseXlsxRows } from "@/lib/xlsxParser";
import { sanitizeGa4MeasurementId, sanitizeMetaPixelId, sanitizeTikTokPixelId } from "@/lib/pixelValidation";
import { getPublicPlatformSettings, invalidateSettingsCache } from "@/lib/settings";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `wave1-${Date.now().toString(36)}`;

const cleanup = {
  invitations: [] as string[],
  orders: [] as string[],
  users: [] as string[],
  admins: [] as string[],
  settingKeys: [] as string[],
};

function makeJsonReq(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
}

describe.skipIf(!IS_TEST_DB)("Wave 1 Features Integration (#4, #5, #6, #9a)", () => {
  afterAll(async () => {
    authState.user = null;
    for (const invId of cleanup.invitations) {
      await deletePublishedHtml(invId).catch(() => {});
    }
    if (cleanup.invitations.length) {
      const invs = await prisma.invitation.findMany({
        where: { id: { in: cleanup.invitations } },
        select: { invitationSlug: true },
      });
      for (const inv of invs) {
        fs.rmSync(path.join(process.cwd(), "data", "archives", inv.invitationSlug), { recursive: true, force: true });
      }
      await prisma.invitation.deleteMany({ where: { id: { in: cleanup.invitations } } }).catch(() => {});
    }
    if (cleanup.orders.length) {
      await prisma.order.deleteMany({ where: { id: { in: cleanup.orders } } }).catch(() => {});
    }
    if (cleanup.users.length) {
      await prisma.user.deleteMany({ where: { id: { in: cleanup.users } } }).catch(() => {});
    }
    if (cleanup.admins.length) {
      await prisma.admin.deleteMany({ where: { id: { in: cleanup.admins } } }).catch(() => {});
    }
    if (cleanup.settingKeys.length) {
      await prisma.adminSetting.deleteMany({ where: { key: { in: cleanup.settingKeys } } }).catch(() => {});
      invalidateSettingsCache();
    }
    await pool.end().catch(() => {});
  });

  async function seedClientInvitation(status: "DRAFT" | "PUBLISHED" = "PUBLISHED") {
    const user = await prisma.user.create({
      data: {
        email: `${RUN}-${Math.random().toString(36).slice(2, 7)}@example.com`,
        name: "Wave1 Client",
        role: "CLIENT",
      },
    });
    cleanup.users.push(user.id);

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        invoiceNumber: `INV-${RUN}-${Math.random().toString(36).slice(2, 6)}`,
        planType: "TIER_2",
        amount: 150000,
        status: "PAID",
        orderType: "NEW",
        paidAt: new Date(),
      },
    });
    cleanup.orders.push(order.id);

    const inv = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order.id,
        themeId: "kalandra",
        eventType: "WEDDING",
        status,
        invitationSlug: `${RUN}-slug-${Math.random().toString(36).slice(2, 6)}`,
        participantsJson: {
          groom: { name: "Raka Putra", nickname: "Raka" },
          bride: { name: "Nadia Sari", nickname: "Nadia" },
        },
        eventData: [
          {
            title: "Akad Nikah",
            date: "2099-05-10",
            startTime: "08:00",
            endTime: "10:00",
            timezone: "WITA",
            location: "Masjid Raya",
            address: "Jl. Jenderal Sudirman No. 1",
          },
          {
            title: "Resepsi",
            date: "2099-05-10",
            startTime: "19:00",
            endTime: "22:00",
            timezone: "WITA",
            location: "Ballroom Hotel",
            address: "Jl. Pettarani No. 10",
          },
        ],
      },
    });
    cleanup.invitations.push(inv.id);
    return { user, inv };
  }

  it("#5 Moderasi RSVP: balas ucapan, sembunyikan/tampilkan, hapus, dan otorisasi kepemilikan", async () => {
    const { user, inv } = await seedClientInvitation("PUBLISHED");
    const intruder = await prisma.user.create({
      data: { email: `${RUN}-intruder@example.com`, name: "Intruder", role: "CLIENT" },
    });
    cleanup.users.push(intruder.id);

    // 1. Tamu mengirim RSVP publik
    const submitRes = await publicRsvpPost(
      makeJsonReq("/api/public/rsvp", "POST", {
        invitationId: inv.id,
        guestName: "Budi Tamu",
        status: "hadir",
        guestCount: 2,
        message: "Selamat menempuh hidup baru!",
      }),
    );
    expect(submitRes.status).toBe(200);
    const submitJson = await submitRes.json();
    const rsvpId = submitJson.rsvp.id as string;

    // 2. Non-pemilik ditolak memoderasi (401/403)
    authState.user = null;
    const unauthRes = await clientRsvpPatch(
      makeJsonReq(`/api/client/rsvps/${rsvpId}`, "PATCH", { isHidden: true }),
      { params: Promise.resolve({ id: rsvpId }) },
    );
    expect(unauthRes?.status).toBe(401);

    authState.user = { id: intruder.id, email: intruder.email, name: intruder.name, role: "CLIENT" };
    const forbRes = await clientRsvpPatch(
      makeJsonReq(`/api/client/rsvps/${rsvpId}`, "PATCH", { replyMessage: "Bajakan" }),
      { params: Promise.resolve({ id: rsvpId }) },
    );
    expect(forbRes?.status).toBe(403);

    // 3. Pemilik membalas ucapan -> cache terhapus & muncul di publik + render engine
    authState.user = { id: user.id, email: user.email, name: user.name, role: "CLIENT" };
    const replyRes = await clientRsvpPatch(
      makeJsonReq(`/api/client/rsvps/${rsvpId}`, "PATCH", { replyMessage: "Terima kasih banyak, Budi!" }),
      { params: Promise.resolve({ id: rsvpId }) },
    );
    expect(replyRes?.status).toBe(200);

    const pubAfterReply = await publicRsvpGet(makeJsonReq(`/api/public/rsvp?invitationId=${inv.id}`, "GET"));
    const pubAfterReplyJson = await pubAfterReply.json();
    expect(pubAfterReplyJson.rsvps).toHaveLength(1);
    expect(pubAfterReplyJson.rsvps[0].replyMessage).toBe("Terima kasih banyak, Budi!");

    const rendered = await composeInvitationData({ ...inv, media: [], rsvps: pubAfterReplyJson.rsvps });
    expect(String(rendered.wishesHtml)).toContain("Terima kasih banyak, Budi!");

    // 4. Sembunyikan ucapan -> hilang dari GET publik, masih muncul di dashboard klien dengan hiddenCount=1
    const hideRes = await clientRsvpPatch(
      makeJsonReq(`/api/client/rsvps/${rsvpId}`, "PATCH", { isHidden: true }),
      { params: Promise.resolve({ id: rsvpId }) },
    );
    expect(hideRes?.status).toBe(200);

    const pubAfterHide = await publicRsvpGet(makeJsonReq(`/api/public/rsvp?invitationId=${inv.id}`, "GET"));
    expect((await pubAfterHide.json()).rsvps).toHaveLength(0);

    const dashAfterHide = await clientRsvpGet(makeJsonReq(`/api/client/rsvps?invitationId=${inv.id}`, "GET"));
    const dashJson = await dashAfterHide.json();
    expect(dashJson.stats.hiddenCount).toBe(1);
    expect(dashJson.rsvps).toHaveLength(1);
    expect(dashJson.rsvps[0].isHidden).toBe(true);

    // 5. Hapus permanen -> 0 baris tersisa
    const delRes = await clientRsvpDelete(
      makeJsonReq(`/api/client/rsvps/${rsvpId}`, "DELETE"),
      { params: Promise.resolve({ id: rsvpId }) },
    );
    expect(delRes?.status).toBe(200);
    expect(await prisma.rsvp.count({ where: { id: rsvpId } })).toBe(0);
  });

  it("#6 Kalender Google & .ics RFC 5545 serta guard draf", async () => {
    const { inv: publishedInv } = await seedClientInvitation("PUBLISHED");
    const { inv: draftInv } = await seedClientInvitation("DRAFT");

    // 1. Fungsi buildIcsCalendar langsung (konversi WITA +08 ke UTC: 08:00 WITA = 00:00Z, 19:00 WITA = 11:00Z)
    const icsDirect = buildIcsCalendar(
      "Raka & Nadia",
      publishedInv.eventData as any[],
      "WIB",
      publishedInv.invitationSlug,
    );
    expect(icsDirect).toContain("BEGIN:VCALENDAR");
    expect(icsDirect).toContain("DTSTART:20990510T000000Z");
    expect(icsDirect).toContain("DTEND:20990510T020000Z");
    expect(icsDirect).toContain("DTSTART:20990510T110000Z");

    // 2. Endpoint GET publik .ics untuk PUBLISHED
    authState.user = null;
    const resPub = await publicCalendarIcsGet(
      makeJsonReq(`/api/public/invitations/${publishedInv.invitationSlug}/calendar.ics?session=1`, "GET"),
      { params: Promise.resolve({ slug: publishedInv.invitationSlug }) },
    );
    expect(resPub.status).toBe(200);
    expect(resPub.headers.get("Content-Type")).toContain("text/calendar");
    const bodyText = await resPub.text();
    expect(bodyText).toContain("SUMMARY:The Wedding of Raka & Nadia — Resepsi");
    expect(bodyText).toContain("DTSTART:20990510T110000Z");

    // 3. DRAFT ditolak tanpa sesi/token pratinjau
    const resDraft = await publicCalendarIcsGet(
      makeJsonReq(`/api/public/invitations/${draftInv.invitationSlug}/calendar.ics`, "GET"),
      { params: Promise.resolve({ slug: draftInv.invitationSlug }) },
    );
    expect(resDraft.status).toBe(403);

    // 4. HTML event memuat tombol Google Calendar & .ics
    const rendered = await composeInvitationData({ ...publishedInv, media: [], rsvps: [] });
    expect(String(rendered.eventDataHtml)).toContain("google.com/calendar/render");
    expect(String(rendered.eventDataHtml)).toContain(`/api/public/invitations/${publishedInv.invitationSlug}/calendar.ics`);
  });

  it("#9a Parser .xlsx membaca sharedStrings, sparse columns, entitas XML, dan menolak arsip rusak", async () => {
    const zip = new JSZip();
    zip.file(
      "xl/workbook.xml",
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tamu" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    );
    zip.file(
      "xl/_rels/workbook.xml.rels",
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    );
    zip.file(
      "xl/sharedStrings.xml",
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Nama</t></si><si><t>Nomor WhatsApp</t></si><si><t>Kategori</t></si><si><t>Nomor Meja</t></si><si><t>Andi &amp; Partner</t></si><si><t>VIP</t></si><si><t>Meja 1</t></si></sst>`,
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="F1" t="s"><v>3</v></c></row>
        <row r="2"><c r="A2" t="s"><v>4</v></c><c r="B2" t="inlineStr"><is><t>08123456789</t></is></c><c r="C2" t="s"><v>5</v></c><c r="F2" t="s"><v>6</v></c></row>
      </sheetData></worksheet>`,
    );

    const buf = await zip.generateAsync({ type: "uint8array" });
    const rows = await parseXlsxRows(buf);
    expect(rows).toEqual([
      ["Nama", "Nomor WhatsApp", "Kategori", "", "", "Nomor Meja"],
      ["Andi & Partner", "08123456789", "VIP", "", "", "Meja 1"],
    ]);

    await expect(parseXlsxRows(new Uint8Array([1, 2, 3]))).rejects.toThrow(/valid/);
  });

  it("#4 Pixel konversi: sanitasi anti-XSS dan validasi AdminSettings", async () => {
    expect(sanitizeMetaPixelId("123456789012345")).toBe("123456789012345");
    expect(sanitizeMetaPixelId("<script>alert(1)</script>")).toBe("");
    expect(sanitizeTikTokPixelId("C9ABCDE123456")).toBe("C9ABCDE123456");
    expect(sanitizeTikTokPixelId("bad;alert(1)")).toBe("");
    expect(sanitizeGa4MeasurementId("g-abc123def4")).toBe("G-ABC123DEF4");
    expect(sanitizeGa4MeasurementId("UA-12345-1")).toBe("");

    const admin = await prisma.admin.create({
      data: {
        email: `${RUN}-admin@example.com`,
        username: `${RUN}_admin`,
        passwordHash: "hash",
        name: "Wave1 Admin",
        role: "SUPER_ADMIN",
        permissions: ["settings"],
      },
    });
    cleanup.admins.push(admin.id);
    authState.user = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: "SUPER_ADMIN",
      isAdmin: true,
      permissions: ["settings"],
    };

    const badRes = await adminSettingsPost(
      makeJsonReq("/api/admin/settings", "POST", [{ key: "meta_pixel_id", value: "abc<script>", group: "analytics" }]),
    );
    expect(badRes.status).toBe(400);

    // Simpan snapshot setting agar dikembalikan saat cleanup
    const prevMeta = await prisma.adminSetting.findUnique({ where: { key: "meta_pixel_id" } });
    const prevGa4 = await prisma.adminSetting.findUnique({ where: { key: "ga4_measurement_id" } });

    const okRes = await adminSettingsPost(
      makeJsonReq("/api/admin/settings", "POST", [
        { key: "meta_pixel_id", value: "987654321098765", group: "analytics" },
        { key: "ga4_measurement_id", value: "g-wave1test9", group: "analytics" },
      ]),
    );
    expect(okRes.status).toBe(200);

    const pub = await getPublicPlatformSettings();
    expect(pub.metaPixelId).toBe("987654321098765");
    expect(pub.ga4MeasurementId).toBe("G-WAVE1TEST9");

    // Pulihkan nilai semula
    await prisma.adminSetting.upsert({
      where: { key: "meta_pixel_id" },
      create: { key: "meta_pixel_id", value: prevMeta?.value ?? "", group: "analytics" },
      update: { value: prevMeta?.value ?? "" },
    });
    await prisma.adminSetting.upsert({
      where: { key: "ga4_measurement_id" },
      create: { key: "ga4_measurement_id", value: prevGa4?.value ?? "", group: "analytics" },
      update: { value: prevGa4?.value ?? "" },
    });
    invalidateSettingsCache();
  });
});
