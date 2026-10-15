/**
 * Regresi audit 14 Okt 2026 (DB luxenary_test): kredensial SMTP di endpoint publik, URL media klien (traversal dan
 * berkas undangan lain), XSS lewat URL media, tolak order yang sudah lunas, dan validasi checkout add-on.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));

import { prisma, pool } from "@/lib/prisma";
import { GET as publicSettings } from "@/app/api/public/settings/route";
import { PUT as putInvitation } from "@/app/api/client/invitations/[id]/route";
import { POST as rejectOrder } from "@/app/api/admin/orders/[orderId]/reject/route";
import { POST as checkoutBundle } from "@/app/api/client/orders/checkout-bundle/route";
import { renderTemplateFile, THEME_MAP } from "@/lib/renderTemplate";
import { composeTemplateData } from "@/lib/themeEngine";
import { DAY_MS } from "@/lib/lifecycleDates";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_audit1014_${Date.now()}`;
const ids = { users: [] as string[], orders: [] as string[], invitations: [] as string[] };
const createdDirs: string[] = [];

async function makeClient(tag: string, opts: { planType?: "TIER_1" | "TIER_2" | "TIER_3"; status?: "DRAFT" | "PUBLISHED"; eventDate?: string | null } = {}) {
  const user = await prisma.user.create({ data: { email: `${RUN}_${tag}@test.local`, name: tag } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${RUN}-${tag}`, planType: opts.planType ?? "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  ids.orders.push(order.id);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      orderId: order.id,
      themeId: "kalandra",
      status: opts.status ?? "DRAFT",
      invitationSlug: `${RUN}-${tag}`,
      featureSettings: {},
      eventData: opts.eventDate === null ? [] : [{ title: "Resepsi", date: opts.eventDate ?? new Date(Date.now() + 60 * DAY_MS).toISOString().slice(0, 10), isPrimary: true }],
    },
  });
  ids.invitations.push(inv.id);
  sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false, permissions: [] };
  return { userId: user.id, invitationId: inv.id, orderId: order.id };
}

const jsonRequest = (url: string, method: string, body: unknown) =>
  new NextRequest(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const putMedia = (invitationId: string, media: Record<string, string>) =>
  putInvitation(jsonRequest(`http://localhost/api/client/invitations/${invitationId}`, "PUT", { media }), { params: Promise.resolve({ id: invitationId }) });

const buy = async (body: Record<string, unknown>) => {
  const res = await checkoutBundle(jsonRequest("http://localhost/api/client/orders/checkout-bundle", "POST", body));
  const json = await res.json();
  if (json.orderId) ids.orders.push(json.orderId);
  return { status: res.status, json };
};

describe.skipIf(!IS_TEST_DB)("kredensial SMTP tidak keluar lewat endpoint publik", () => {
  it("GET /api/public/settings tidak memuat kunci smtp apa pun", async () => {
    const json = await (await publicSettings()).json();
    expect(Object.keys(json).filter((k) => /smtp/i.test(k))).toEqual([]);
  });
});

describe.skipIf(!IS_TEST_DB)("URL media klien", () => {
  it("URL dengan segmen .. ditolak sebelum apa pun tersimpan", async () => {
    const { invitationId } = await makeClient("media-traversal");
    const res = await putMedia(invitationId, { GROOM_PHOTO: "/uploads/../../.env" });
    expect(res.status).toBe(400);
    expect(await prisma.invitationMedia.count({ where: { invitationId } })).toBe(0);
  });

  it("mengosongkan media yang menunjuk berkas undangan lain tidak menghapus berkas itu", async () => {
    const victim = await makeClient("media-victim");
    const victimDir = path.join(process.cwd(), "public", "uploads", "invitations", victim.invitationId);
    fs.mkdirSync(victimDir, { recursive: true });
    createdDirs.push(victimDir);
    const victimFile = path.join(victimDir, "cover.webp");
    fs.writeFileSync(victimFile, "victim");

    const { invitationId } = await makeClient("media-attacker");
    const foreignUrl = `/uploads/invitations/${victim.invitationId}/cover.webp`;
    expect((await putMedia(invitationId, { GROOM_PHOTO: foreignUrl })).status).toBe(200);
    expect((await putMedia(invitationId, { GROOM_PHOTO: "" })).status).toBe(200);

    expect(fs.existsSync(victimFile)).toBe(true);
    expect(await prisma.invitationMedia.count({ where: { invitationId } })).toBe(0);
  });
});

describe.skipIf(!IS_TEST_DB)("URL media tidak dapat keluar dari atribut HTML", () => {
  it("payload pada foto mempelai di-encode, bukan disisipkan mentah", async () => {
    const themeId = Object.keys(THEME_MAP).find((k) => THEME_MAP[k].file.endsWith("bone.html"))!;
    const payload = 'x" onerror="alert(document.domain)" data-x="';
    const html = await renderTemplateFile(themeId, { groomPhotoUrl: payload, bridePhotoUrl: payload } as any, { editMode: false, invitationId: "probe" });
    expect(html).not.toContain('onerror="alert(document.domain)"');
    expect(html).toContain("x%22%20onerror=%22alert(document.domain)%22");
  });

  it("path lokal berisi kutip atau tag ditolak saat disimpan", async () => {
    const { invitationId } = await makeClient("media-quote");
    expect((await putMedia(invitationId, { CLOSING_COVER: `/uploads/x" onmouseover="alert(1)` })).status).toBe(400);
    expect((await putMedia(invitationId, { GALLERY: "/uploads/a</script><script>alert(1)</script>.jpg" })).status).toBe(400);
    expect(await prisma.invitationMedia.count({ where: { invitationId } })).toBe(0);
  });

  it("media jahat yang sudah tersimpan tidak keluar dari style maupun <script> saat dirender", async () => {
    const { invitationId } = await makeClient("media-stored", { planType: "TIER_3" });
    await prisma.invitationMedia.createMany({
      data: [
        { invitationId, mediaSlot: "CLOSING_COVER", localPath: `/uploads/x" onmouseover="alert('closing')" a="` },
        { invitationId, mediaSlot: "GALLERY", localPath: "/uploads/a</script><script>alert('gallery')</script>.jpg" },
      ],
    });
    const html = await renderTemplateFile("kalandra", (await composeTemplateData(invitationId)) as any, { editMode: false });
    expect(html).not.toContain(`" onmouseover="alert('closing')"`);
    expect(html).not.toContain("</script><script>alert('gallery')");
  });
});

describe.skipIf(!IS_TEST_DB)("label kustom klien", () => {
  it("label yang disisipkan themeEngine di-escape", async () => {
    const { invitationId } = await makeClient("labels", { planType: "TIER_3" });
    const keys = ["storyTitle", "galleryQuote", "dressCodeTitle", "streamingSubtitle", "turutMengundangTitle", "giftDesc", "memoriesTitle"];
    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        featureSettings: {
          customLabels: Object.fromEntries(keys.map((k) => [k, `<img src=x onerror=alert('${k}')>`])),
          dressCodeNote: "putih",
          turutMengundang: "Keluarga A",
          liveStreamYoutubeUrl: "https://youtu.be/abcdefghijk",
        },
        bankAccounts: [{ bank: "BCA", number: "1", name: "A" }],
      },
    });
    const html = await renderTemplateFile("kalandra", (await composeTemplateData(invitationId)) as any, { editMode: false });
    expect(html.match(/<img src=x onerror=alert\('[a-zA-Z]+'\)>/g) ?? []).toEqual([]);
  });
});

describe.skipIf(!IS_TEST_DB)("tolak order manual", () => {
  it("order yang sudah PAID tidak dapat ditolak dan tetap PAID", async () => {
    const { orderId } = await makeClient("reject-paid");
    sessionUser = { id: "admin-vitest", email: "admin@test.local", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    const res = await rejectOrder(jsonRequest(`http://localhost/api/admin/orders/${orderId}/reject`, "POST", { reason: "uji" }), {
      params: Promise.resolve({ orderId }),
    });
    expect(res.status).toBe(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PAID");
  });
});

describe.skipIf(!IS_TEST_DB)("checkout add-on", () => {
  it("perpanjangan galeri ditolak bila jadwal terima tamu belum bertanggal", async () => {
    const { invitationId } = await makeClient("ext-nodate", { eventDate: null });
    const { status, json } = await buy({ invitationId, extensionMonths: 1 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/Tanggal jadwal terima tamu/);
  });

  it("top-up kuota foto ditolak untuk paket tanpa kamera tamu", async () => {
    const { invitationId } = await makeClient("topup-tier1", { planType: "TIER_1" });
    const { status } = await buy({ invitationId, topupBatches: 1 });
    expect(status).toBe(400);
  });

  it("jumlah top-up bukan bilangan bulat ditolak", async () => {
    const { invitationId } = await makeClient("topup-fraction", { planType: "TIER_2" });
    expect((await buy({ invitationId, topupBatches: 0.5 })).status).toBe(400);
  });
});

afterAll(async () => {
  for (const dir of createdDirs) fs.rmSync(dir, { recursive: true, force: true });
  await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
  await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  await prisma.$disconnect();
  await pool.end();
});
