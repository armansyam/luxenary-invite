/**
 * Regresi audit 19 Okt 2026: jejak audit bertahan saat admin dihapus, isian tamu dan keuangan divalidasi, slug undangan
 * tidak bentrok dengan rute aplikasi, feed RSVP undangan yang diturunkan kosong, header Range, nominal gateway di status
 * order, ringkasan tamu, URL tepercaya untuk gateway, dan tutup buku/pajak hanya untuk periode yang sudah berakhir.
 * (bagian DB hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));

import { prisma, pool } from "@/lib/prisma";
import { parseByteRange } from "@/lib/httpRange";
import { getTrustedAppUrl } from "@/lib/serverDomainUtils";
import { runStaleDataCleanup } from "@/lib/lifecycleCleanup";
import { wibParts } from "@/lib/financePeriods";
import { DELETE as deleteAdmin } from "@/app/api/admin/admins/[id]/route";
import { POST as guestPost } from "@/app/api/client/guests/route";
import { GET as guestsGet, PUT as guestPut } from "@/app/api/client/guests/[id]/route";
import { POST as guestBulkPost } from "@/app/api/client/guests/bulk/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { GET as rsvpFeed } from "@/app/api/public/rsvp/route";
import { GET as orderStatus } from "@/app/api/client/orders/[id]/status/route";
import { GET as expensesGet, POST as expensesPost } from "@/app/api/admin/finance/expenses/route";
import { POST as recurringPost } from "@/app/api/admin/finance/recurring/route";
import { POST as recurringPay } from "@/app/api/admin/finance/recurring/[id]/pay/route";
import { POST as closingPost } from "@/app/api/admin/finance/closing/route";
import { POST as taxPost } from "@/app/api/admin/finance/tax/route";
import { GET as downloadUrls } from "@/app/api/client/memories/download-urls/route";
import { POST as lockUploads } from "@/app/api/client/memories/lock/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_a1019_${Date.now()}`;
const ids = { users: [] as string[], admins: [] as string[] };
let seq = 0;

const json = (url: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function makeAdmin(role: "SUPER_ADMIN" | "ADMIN" = "SUPER_ADMIN") {
  seq++;
  const admin = await prisma.admin.create({
    data: { username: `${TAG}_adm${seq}`, email: `${TAG}_adm${seq}@t.local`, name: `Admin ${seq}`, role },
  });
  ids.admins.push(admin.id);
  return admin;
}

const asAdmin = (adminId: string) => {
  sessionUser = { id: adminId, email: `${adminId}@t.local`, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
};

async function makeClient(opts: { withInvitation?: boolean; status?: "DRAFT" | "PUBLISHED" | "TAKEN_DOWN" } = {}) {
  seq++;
  const user = await prisma.user.create({ data: { email: `${TAG}_${seq}@t.local`, name: `Klien ${seq}` } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${TAG}-${seq}`, planType: "TIER_2", amount: 100000, status: "PAID", orderType: "NEW", paidAt: new Date(), fulfilledAt: new Date() },
  });
  let invitationId = "";
  if (opts.withInvitation !== false) {
    const inv = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order.id,
        invitationSlug: `${TAG}-${seq}`,
        participantsJson: { groom: { name: "Raka" }, bride: { name: "Dewi" } },
        status: opts.status ?? "DRAFT",
        eventData: [{ title: "Resepsi", date: "2099-01-10", startTime: "10:00", timezone: "WIB", isPrimary: true }],
      },
    });
    invitationId = inv.id;
  }
  sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false };
  return { user, order, invitationId };
}

describe("parseByteRange", () => {
  it("rentang biasa, akhir yang lewat ujung dipotong, dan rentang akhiran", () => {
    expect(parseByteRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
    expect(parseByteRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseByteRange("bytes=500-", 1000)).toEqual({ start: 500, end: 999 });
    expect(parseByteRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseByteRange("bytes=-5000", 1000)).toEqual({ start: 0, end: 999 });
  });

  it("di luar berkas -> unsatisfiable; tanpa header atau beberapa rentang -> null", () => {
    expect(parseByteRange("bytes=1000-", 1000)).toBe("unsatisfiable");
    expect(parseByteRange("bytes=-0", 1000)).toBe("unsatisfiable");
    expect(parseByteRange("bytes=50-10", 1000)).toBe("unsatisfiable");
    expect(parseByteRange("bytes=0-0", 0)).toBe("unsatisfiable");
    expect(parseByteRange(null, 1000)).toBeNull();
    expect(parseByteRange("bytes=0-1,5-9", 1000)).toBeNull();
  });
});

describe("getTrustedAppUrl", () => {
  it("memakai NEXT_PUBLIC_APP_URL, bukan header Host", async () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.contoh.test/";
    try {
      expect(await getTrustedAppUrl()).toBe("https://app.contoh.test");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
});

describe.skipIf(!IS_TEST_DB)("audit 19 Okt (DB)", () => {
  afterAll(async () => {
    sessionUser = null;
    await prisma.expense.deleteMany({ where: { title: { contains: TAG } } });
    await prisma.recurringExpense.deleteMany({ where: { name: { contains: TAG } } });
    await prisma.webhookLog.deleteMany({ where: { event: TAG } });
    await prisma.adminAuditLog.deleteMany({ where: { OR: [{ adminId: { in: ids.admins } }, { adminLabel: { contains: TAG } }] } });
    await prisma.admin.deleteMany({ where: { id: { in: ids.admins } } });
    await prisma.invitation.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("menghapus admin tidak menghapus jejak auditnya; nama pelaku tersimpan", async () => {
    const actor = await makeAdmin();
    const target = await makeAdmin("ADMIN");
    const log = await prisma.adminAuditLog.create({ data: { adminId: target.id, action: "TEST_ACTION", details: TAG } });

    asAdmin(actor.id);
    const res = await deleteAdmin(new Request(`http://localhost/api/admin/admins/${target.id}`, { method: "DELETE" }), { params: Promise.resolve({ id: target.id }) });
    expect(res.status).toBe(200);

    const kept = await prisma.adminAuditLog.findUnique({ where: { id: log.id } });
    expect(kept, "catatan audit admin yang dihapus harus tetap ada").not.toBeNull();
    expect(kept!.adminId).toBeNull();
    expect(kept!.adminLabel).toContain(target.username);
    expect(await prisma.adminAuditLog.count({ where: { adminId: actor.id, action: "DELETE_ADMIN" } })).toBe(1);
  });

  describe("isian tamu", () => {
    it("nama bukan teks atau terlalu panjang ditolak 400; jatah orang dibatasi 100", async () => {
      const { invitationId } = await makeClient();
      const post = (body: Record<string, unknown>) => guestPost(json("/api/client/guests", "POST", { invitationId, ...body }));

      expect((await post({ name: { x: 1 } })).status).toBe(400);
      expect((await post({ name: "N".repeat(101) })).status).toBe(400);

      const big = await post({ name: "Tamu Besar", guestLimit: 999999999999, phone: 81234, tableNumber: 7 });
      expect(big.status).toBe(200);
      const guest = await big.json();
      expect(guest.guestQuota).toBe(100);
      expect(guest.phone).toBe("81234");
      expect(guest.tableNumber).toBe("7");

      const put = await guestPut(json(`/api/client/guests/${guest.id}`, "PUT", { guestQuota: -5, category: { bad: true } }), { params: Promise.resolve({ id: guest.id }) });
      expect(put.status).toBe(200);
      const updated = await put.json();
      expect(updated.guestQuota).toBe(1);
      expect(updated.category).toBeNull();
    });

    it("impor massal: baris tidak sah -> 400 tanpa menyimpan apa pun", async () => {
      const { invitationId } = await makeClient();
      const res = await guestBulkPost(json("/api/client/guests/bulk", "POST", { invitationId, guests: [{ name: "Ani" }, { name: ["bukan teks"] }] }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("Baris ke-2");
      expect(await prisma.guest.count({ where: { invitationId } })).toBe(0);
    });

    it("ringkasan tamu untuk dasbor menghitung tanpa memuat daftar", async () => {
      const { invitationId } = await makeClient();
      await prisma.guest.createMany({
        data: [
          { invitationId, name: "A", slug: `${TAG}-a`, waStatus: "SENT", isTokenRedeemed: true },
          { invitationId, name: "B", slug: `${TAG}-b`, waStatus: "SENT" },
          { invitationId, name: "C", slug: `${TAG}-c` },
        ],
      });
      const res = await guestsGet(json(`/api/client/guests/${invitationId}?summary=1`, "GET"), { params: Promise.resolve({ id: invitationId }) });
      expect(await res.json()).toEqual({ guestCount: 3, waSentCount: 2, checkedInCount: 1 });
    });
  });

  it("unduh semua foto momen (ZIP di peramban): daftar berkas untuk pemilik, lalu unggahan dikunci; orang lain 403", async () => {
    const owner = await makeClient({ status: "PUBLISHED" });
    await prisma.guestMemory.createMany({
      data: [
        { invitationId: owner.invitationId, senderName: "Ani", senderEmail: "gst_a", mediaUrl: "/uploads/guest-memories/x/a.jpg" },
        { invitationId: owner.invitationId, senderName: "Budi", senderEmail: "gst_b", mediaUrl: "/uploads/guest-memories/x/b.webp" },
      ],
    });
    const urls = await downloadUrls(json(`/api/client/memories/download-urls?invitationId=${owner.invitationId}`, "GET"));
    const body = await urls.json();
    expect(urls.status).toBe(200);
    expect(body.files.map((f: { filename: string }) => f.filename)).toEqual(["001_Ani.jpg", "002_Budi.webp"]);

    const lock = await lockUploads(json(`/api/client/memories/lock?invitationId=${owner.invitationId}`, "POST"));
    expect(lock.status).toBe(200);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: owner.invitationId } })).memoriesUploadLocked).toBe(true);

    await makeClient({ withInvitation: false });
    expect((await downloadUrls(json(`/api/client/memories/download-urls?invitationId=${owner.invitationId}`, "GET"))).status).toBe(403);
    await prisma.guestMemory.deleteMany({ where: { invitationId: owner.invitationId } });
  });

  it("slug gathering yang sama dengan rute aplikasi diberi akhiran", async () => {
    const { user } = await makeClient({ withInvitation: false });
    const res = await createInvitation(
      json("/api/client/invitations/create", "POST", { eventType: "GATHERING", participantsJson: { event: { title: "Demo" } } })
    );
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    const inv = await prisma.invitation.findUniqueOrThrow({ where: { id: body.invitationId } });
    expect(inv.userId).toBe(user.id);
    expect(inv.invitationSlug).not.toBe("demo");
    expect(inv.invitationSlug.startsWith("demo-")).toBe(true);
  });

  it("feed RSVP undangan yang diturunkan kosong", async () => {
    const { invitationId } = await makeClient({ status: "TAKEN_DOWN" });
    await prisma.rsvp.create({ data: { invitationId, guestName: "Tamu", status: "hadir", message: "Selamat" } });
    const res = await rsvpFeed(json(`/api/public/rsvp?invitationId=${invitationId}`, "GET", undefined, { "cf-connecting-ip": "203.0.113.91" }));
    expect((await res.json()).rsvps).toEqual([]);
    await prisma.rsvp.deleteMany({ where: { invitationId } });
  });

  it("status order mengembalikan chargedAmount yang ditagih gateway", async () => {
    const { user } = await makeClient({ withInvitation: false });
    const order = await prisma.order.create({
      data: { userId: user.id, invoiceNumber: `${TAG}-chg`, planType: "TIER_1", amount: 100000, chargedAmount: 100700, status: "PAID", orderType: "NEW", paidAt: new Date(), fulfilledAt: new Date() },
    });
    const res = await orderStatus(json(`/api/client/orders/${order.id}/status`, "GET"), { params: Promise.resolve({ id: order.id }) });
    const body = await res.json();
    expect(body.amount).toBe(100000);
    expect(body.chargedAmount).toBe(100700);
  });

  it("pembersihan rutin menghitung log webhook lebih dari 365 hari (uji kering)", async () => {
    await prisma.webhookLog.create({ data: { source: "test", event: TAG, payload: {}, createdAt: new Date(Date.now() - 400 * 86400_000) } });
    const result = await runStaleDataCleanup({ dryRun: true });
    expect(result.purgedWebhookLogs).toBeGreaterThanOrEqual(1);
  });

  describe("keuangan admin", () => {
    it("pengeluaran: kategori asing, nominal bukan angka, dan URL bukti javascript: ditolak 400", async () => {
      asAdmin((await makeAdmin()).id);
      const post = (body: Record<string, unknown>) => expensesPost(json("/api/admin/finance/expenses", "POST", { title: `${TAG} beban`, amount: 1000, ...body }));
      expect((await post({ category: "BUKAN_KATEGORI" })).status).toBe(400);
      expect((await post({ amount: "abc" })).status).toBe(400);
      expect((await post({ amount: 1e13 })).status).toBe(400);
      expect((await post({ receiptUrl: "javascript:alert(1)" })).status).toBe(400);
      expect((await post({ title: { x: 1 } })).status).toBe(400);
    });

    it("ekspor CSV menetralkan formula", async () => {
      asAdmin((await makeAdmin()).id);
      const created = await expensesPost(json("/api/admin/finance/expenses", "POST", { title: `=HYPERLINK("x") ${TAG}`, amount: 2500 }));
      expect(created.status).toBe(200);
      const res = await expensesGet(json(`/api/admin/finance/expenses?export=csv&search=${encodeURIComponent(TAG)}`, "GET"));
      const csv = await res.text();
      expect(csv).toContain(`"'=HYPERLINK(""x"") ${TAG}"`);
    });

    it("bayar tagihan rutin dua kali bersamaan hanya membukukan satu pengeluaran", async () => {
      asAdmin((await makeAdmin()).id);
      const created = await (await recurringPost(json("/api/admin/finance/recurring", "POST", { name: `${TAG} listrik`, estimatedAmount: 150000, dueDayOfMonth: 5 }))).json();
      const recurringId = created.recurringExpense.id;
      const pay = () => recurringPay(json(`/api/admin/finance/recurring/${recurringId}/pay`, "POST", {}), { params: Promise.resolve({ id: recurringId }) });

      const statuses = (await Promise.all([pay(), pay()])).map((r) => r.status).sort();
      expect(statuses).toEqual([200, 400]);
      const { year, monthIndex } = wibParts(new Date());
      const ref = `REC-${recurringId.slice(0, 8)}-${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      expect(await prisma.expense.count({ where: { referenceNumber: ref } })).toBe(1);
    });

    it("tagihan rutin: tanggal jatuh tempo bukan angka ditolak 400", async () => {
      asAdmin((await makeAdmin()).id);
      const res = await recurringPost(json("/api/admin/finance/recurring", "POST", { name: `${TAG} air`, estimatedAmount: 50000, dueDayOfMonth: "abc" }));
      expect(res.status).toBe(400);
    });

    it("tutup buku dan catat pajak untuk bulan yang belum berakhir ditolak 400 tanpa membuat tutup buku", async () => {
      asAdmin((await makeAdmin()).id);
      const { year } = wibParts(new Date());
      const future = { month: 1, year: year + 1 };
      const closing = await closingPost(json("/api/admin/finance/closing", "POST", future));
      expect(closing.status).toBe(400);
      expect((await closing.json()).error).toContain("belum berakhir");
      const tax = await taxPost(json("/api/admin/finance/tax", "POST", { ...future, taxPaid: true }));
      expect(tax.status).toBe(400);
      expect(await prisma.financialClosing.count({ where: { periodMonth: 1, periodYear: year + 1 } })).toBe(0);
    });
  });
});
