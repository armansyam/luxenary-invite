/**
 * Regresi audit 15 Okt 2026 (DB luxenary_test): custom domain dari order UPGRADE dipasang ke undangan yang
 * ditautkan order itu, masa hidup tagihan upgrade/add-on 24 jam, validasi nama domain, dan URL foto sampul kamera tamu.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as activateDomain } from "@/app/api/admin/custom-domains/activate/route";
import { POST as upgradeOrder } from "@/app/api/payments/upgrade/route";
import { POST as checkoutBundle } from "@/app/api/client/orders/checkout-bundle/route";
import { PATCH as patchMemories } from "@/app/api/client/invitations/[id]/memories/route";
import { GET as publicThemes } from "@/app/api/public/themes/route";
import { POST as uploadReceipt } from "@/app/api/admin/finance/upload-receipt/route";
import { POST as createExpense } from "@/app/api/admin/finance/expenses/route";
import { PUT as updateExpense, DELETE as deleteExpense } from "@/app/api/admin/finance/expenses/[id]/route";
import { GET as taxRecap, POST as markTax } from "@/app/api/admin/finance/tax/route";
import { POST as purgeInvitation } from "@/app/api/admin/invitations/[id]/purge/route";
import { normalizeCustomDomain } from "@/lib/domainUtils";
import { getPlanMemoriesQuota, getPublicPlatformSettings, invalidateSettingsCache } from "@/lib/settings";
import { DAY_MS } from "@/lib/lifecycleDates";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_audit1015_${Date.now()}`;
const ids = { users: [] as string[], orders: [] as string[], invitations: [] as string[], admins: [] as string[] };

async function makeUser(tag: string) {
  const user = await prisma.user.create({ data: { email: `${RUN}_${tag}@test.local`, name: tag } });
  ids.users.push(user.id);
  sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false, permissions: [] };
  return user.id;
}

async function makeInvitation(userId: string, tag: string, planType: "TIER_1" | "TIER_2" | "TIER_3" = "TIER_2") {
  const order = await prisma.order.create({
    data: { userId, invoiceNumber: `${RUN}-${tag}`, planType, amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  ids.orders.push(order.id);
  const inv = await prisma.invitation.create({
    data: {
      userId,
      orderId: order.id,
      themeId: "kalandra",
      status: "DRAFT",
      invitationSlug: `${RUN}-${tag}`,
      featureSettings: {},
      eventData: [{ title: "Resepsi", date: new Date(Date.now() + 60 * DAY_MS).toISOString().slice(0, 10), isPrimary: true }],
    },
  });
  ids.invitations.push(inv.id);
  return inv.id;
}

const jsonRequest = (url: string, method: string, body: unknown) =>
  new NextRequest(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const requestUpgrade = async (body: Record<string, unknown>) => {
  const res = await upgradeOrder(jsonRequest("http://localhost/api/payments/upgrade", "POST", body));
  const json = await res.json();
  if (json.orderId) ids.orders.push(json.orderId);
  return { status: res.status, json };
};

const hoursUntil = (date: Date | null) => (date ? (date.getTime() - Date.now()) / 3_600_000 : null);

describe("normalizeCustomDomain", () => {
  it("menerima nama host sah dan membuang skema serta garis miring penutup", () => {
    expect(normalizeCustomDomain(" HTTPS://Nama-Kita.com/ ")).toBe("nama-kita.com");
    expect(normalizeCustomDomain("undangan.nama.co.id")).toBe("undangan.nama.co.id");
    expect(normalizeCustomDomain("xn--80ak6aa92e.xn--p1ai")).toBe("xn--80ak6aa92e.xn--p1ai");
  });

  it("menolak path, port, karakter HTML, label berawalan tanda hubung, dan bukan string", () => {
    for (const bad of ["nama.com/jalur", "nama.com:8443", "nama.com\"><svg>", "-nama.com", "nama", "a.b", "nama..com", 42, null]) {
      expect(normalizeCustomDomain(bad)).toBeNull();
    }
  });
});

describe.skipIf(!IS_TEST_DB)("aktivasi custom domain oleh admin", () => {
  it("domain dari order UPGRADE dipasang ke undangan yang ditautkan order itu, bukan undangan terbaru klien", async () => {
    const userId = await makeUser("activate");
    const upgradedInvitation = await makeInvitation(userId, "activate-a");
    const domain = `uji${Date.now()}.example.com`;
    const { status, json } = await requestUpgrade({ invitationId: upgradedInvitation, targetPlan: "TIER_3", requestedDomain: domain });
    expect(status).toBe(200);
    const newerInvitation = await makeInvitation(userId, "activate-b");

    const admin = await prisma.admin.create({ data: { username: RUN, email: `${RUN}@admin.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    ids.admins.push(admin.id);
    sessionUser = { id: admin.id, email: admin.email, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    const res = await activateDomain(jsonRequest("http://localhost/api/admin/custom-domains/activate", "POST", { orderId: json.orderId }));

    expect(res.status).toBe(200);
    const [target, other] = await Promise.all([
      prisma.invitation.findUniqueOrThrow({ where: { id: upgradedInvitation }, select: { customDomain: true } }),
      prisma.invitation.findUniqueOrThrow({ where: { id: newerInvitation }, select: { customDomain: true } }),
    ]);
    expect(target.customDomain).toBe(domain);
    expect(other.customDomain).toBeNull();
  });
});

describe.skipIf(!IS_TEST_DB)("tagihan upgrade dan add-on", () => {
  it("domain tidak sah pada order upgrade ditolak tanpa membuat order", async () => {
    const userId = await makeUser("upgrade-baddomain");
    const invitationId = await makeInvitation(userId, "upgrade-baddomain");
    const { status } = await requestUpgrade({ invitationId, targetPlan: "TIER_3", requestedDomain: "nama.com/<x>" });
    expect(status).toBe(400);
    expect(await prisma.order.count({ where: { linkedInvitationId: invitationId } })).toBe(0);
  });

  it("order upgrade punya batas hidup 24 jam", async () => {
    const userId = await makeUser("upgrade-expiry");
    const invitationId = await makeInvitation(userId, "upgrade-expiry");
    const { json } = await requestUpgrade({ invitationId, targetPlan: "TIER_3" });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: json.orderId } });
    expect(hoursUntil(order.expiredAt)).toBeGreaterThan(23.9);
  });

  it("order checkout terpadu hidup 24 jam, tidak ikut umur sesi QRIS (payment_expiry_minutes)", async () => {
    const userId = await makeUser("bundle-expiry");
    const invitationId = await makeInvitation(userId, "bundle-expiry");
    const res = await checkoutBundle(jsonRequest("http://localhost/api/client/orders/checkout-bundle", "POST", { invitationId, targetPlan: "TIER_3" }));
    const json = await res.json();
    if (json.orderId) ids.orders.push(json.orderId);
    expect(res.status).toBe(200);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: json.orderId } });
    expect(hoursUntil(order.expiredAt)).toBeGreaterThan(23.9);
  });
});

describe.skipIf(!IS_TEST_DB)("foto sampul kamera tamu", () => {
  it("URL sampul yang dapat keluar dari atribut HTML ditolak dan tidak tersimpan", async () => {
    const userId = await makeUser("memories-cover");
    const invitationId = await makeInvitation(userId, "memories-cover");
    const res = await patchMemories(
      jsonRequest(`http://localhost/api/client/invitations/${invitationId}/memories`, "PATCH", { memoriesCoverPhoto: "/uploads/a.jpg');}</style><script>alert(1)</script>" }),
      { params: Promise.resolve({ id: invitationId }) }
    );
    expect(res.status).toBe(400);
    const inv = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: { featureSettings: true } });
    expect(JSON.stringify(inv.featureSettings)).not.toContain("script");
  });
});

describe.skipIf(!IS_TEST_DB)("kapasitas kamera tamu yang diiklankan", () => {
  it("teks fitur paket memuat kuota yang ditegakkan, bukan angka mati", async () => {
    invalidateSettingsCache();
    const { packages } = await getPublicPlatformSettings();
    for (const pkg of packages.filter((p) => p.capabilities.includes("guest_memories"))) {
      const enforced = (await getPlanMemoriesQuota(pkg.id)).totalQuota.toLocaleString("id-ID");
      const capacityLines = pkg.features.filter((f: string) => f.includes("Kapasitas Total"));
      expect(capacityLines.length).toBeGreaterThan(0);
      for (const line of capacityLines) expect(line).toContain(`Kapasitas Total ${enforced} Foto`);
    }
  });
});

describe.skipIf(!IS_TEST_DB)("unggah struk keuangan admin", () => {
  const upload = (file: File) => {
    sessionUser = { id: "finance-vitest", email: "finance@test.local", role: "FINANCE", isAdmin: true, permissions: ["finance"] };
    const form = new FormData();
    form.append("file", file);
    return uploadReceipt(new NextRequest("http://localhost/api/admin/finance/upload-receipt", { method: "POST", body: form }));
  };

  it("SVG yang mengaku PNG ditolak dan tidak tersimpan", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`;
    const res = await upload(new File([svg], "struk.svg", { type: "image/png" }));
    expect(res.status).toBe(400);
  });

  it("gambar sungguhan disimpan dengan ekstensi dari isi berkas, bukan dari nama", async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const res = await upload(new File([new Uint8Array(png)], "struk.svg", { type: "image/svg+xml" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.url).toMatch(/\.png$/);
    fs.rmSync(path.join(process.cwd(), "public", json.url), { force: true });
  });
});

describe.skipIf(!IS_TEST_DB)("pengeluaran dan tutup buku", () => {
  // Periode jauh di masa depan agar tidak bertabrakan dengan data lain di DB uji.
  const closedYear = 2091;
  const expenseIds: string[] = [];

  let adminSeq = 0;
  const asFinanceAdmin = async () => {
    const tag = `${RUN}_fin${++adminSeq}`;
    const admin = await prisma.admin.create({ data: { username: tag, email: `${tag}@admin.local`, name: "Finance Uji", role: "FINANCE", permissions: ["finance"] } });
    ids.admins.push(admin.id);
    sessionUser = { id: admin.id, email: admin.email, role: "FINANCE", isAdmin: true, permissions: ["finance"] };
    return admin.id;
  };

  afterAll(async () => {
    await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } });
    await prisma.financialClosing.deleteMany({ where: { periodYear: closedYear } });
  });

  it("pengeluaran tidak dapat dipindahkan ke bulan yang sudah ditutup, dan ubah/hapus tercatat di audit", async () => {
    const adminId = await asFinanceAdmin();
    await prisma.financialClosing.create({
      data: { periodMonth: 3, periodYear: closedYear, grossRevenue: 0, totalExpenses: 0, netProfit: 0, taxAmount: 0, closedById: adminId },
    });
    const created = await createExpense(jsonRequest("http://localhost/api/admin/finance/expenses", "POST", { title: "Uji Pindah", amount: 1000, expenseDate: `${closedYear}-05-10` }));
    const { expense } = await created.json();
    expenseIds.push(expense.id);

    const params = { params: Promise.resolve({ id: expense.id }) };
    const moved = await updateExpense(jsonRequest(`http://localhost/api/admin/finance/expenses/${expense.id}`, "PUT", { expenseDate: `${closedYear}-03-15` }), params);
    expect(moved.status).toBe(400);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).expenseDate.toISOString().slice(0, 10)).toBe(`${closedYear}-05-10`);

    expect((await updateExpense(jsonRequest(`http://localhost/api/admin/finance/expenses/${expense.id}`, "PUT", { notes: "dikoreksi" }), params)).status).toBe(200);
    expect((await deleteExpense(new NextRequest(`http://localhost/api/admin/finance/expenses/${expense.id}`, { method: "DELETE" }), params)).status).toBe(200);
    const actions = (await prisma.adminAuditLog.findMany({ where: { adminId }, select: { action: true } })).map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(["CREATE_EXPENSE", "UPDATE_EXPENSE", "DELETE_EXPENSE"]));
  });

  it("periode ditentukan menurut bulan WIB: 1 April 01.00 WIB termasuk April, bukan Maret yang ditutup", async () => {
    await asFinanceAdmin();
    const res = await createExpense(jsonRequest("http://localhost/api/admin/finance/expenses", "POST", { title: "Uji WIB", amount: 1000, expenseDate: `${closedYear}-03-31T18:00:00Z` }));
    const json = await res.json();
    if (json.expense) expenseIds.push(json.expense.id);
    expect(res.status).toBe(200);

    const inMarch = await createExpense(jsonRequest("http://localhost/api/admin/finance/expenses", "POST", { title: "Uji WIB Maret", amount: 1000, expenseDate: `${closedYear}-03-31T16:00:00Z` }));
    expect(inMarch.status).toBe(400);
  });
});

describe.skipIf(!IS_TEST_DB)("rekap dan setoran pajak", () => {
  // Bukan tahun kabisat: 28 Feb 18.00 UTC jatuh pada 1 Maret WIB.
  const taxYear = 2093;

  afterAll(async () => {
    await prisma.expense.deleteMany({ where: { title: `${RUN}-pajak` } });
    await prisma.financialClosing.deleteMany({ where: { periodYear: taxYear } });
  });

  it("omzet diakui pada bulan lunas (WIB), dan tutup buku otomatis dari setoran pajak mengunci pengeluaran", async () => {
    const userId = await makeUser("pajak");
    // Dibuat 28 Feb, lunas 1 Maret 01.00 WIB (28 Feb 18.00 UTC).
    const order = await prisma.order.create({
      data: {
        userId, invoiceNumber: `${RUN}-pajak`, planType: "TIER_2", amount: 200000, status: "PAID", orderType: "NEW",
        createdAt: new Date(`${taxYear}-02-28T10:00:00Z`), paidAt: new Date(`${taxYear}-02-28T18:00:00Z`),
      },
    });
    ids.orders.push(order.id);
    const expense = await prisma.expense.create({ data: { title: `${RUN}-pajak`, amount: 5000, expenseDate: new Date(`${taxYear}-03-10`) } });

    const admin = await prisma.admin.create({ data: { username: `${RUN}_tax`, email: `${RUN}_tax@admin.local`, name: "Pajak Uji", role: "FINANCE", permissions: ["finance"] } });
    ids.admins.push(admin.id);
    sessionUser = { id: admin.id, email: admin.email, role: "FINANCE", isAdmin: true, permissions: ["finance"] };

    const recap = await (await taxRecap(new NextRequest(`http://localhost/api/admin/finance/tax?year=${taxYear}`))).json();
    expect(recap.monthlyBreakdown[1].grossRevenue).toBe(0);
    expect(recap.monthlyBreakdown[2].grossRevenue).toBe(200000);

    const res = await markTax(jsonRequest("http://localhost/api/admin/finance/tax", "POST", { month: 3, year: taxYear, taxPaid: true }));
    expect(res.status).toBe(200);
    const closing = await prisma.financialClosing.findUniqueOrThrow({ where: { periodMonth_periodYear: { periodMonth: 3, periodYear: taxYear } } });
    expect(Number(closing.grossRevenue)).toBe(200000);
    expect(closing.closedById).toBe(admin.id);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).isLocked).toBe(true);
    expect(await prisma.adminAuditLog.count({ where: { adminId: admin.id, action: "CLOSE_FINANCIAL_PERIOD" } })).toBe(1);
  });
});

describe.skipIf(!IS_TEST_DB)("purge cache undangan oleh admin", () => {
  it("undangan arsip tidak dibangun ulang ke hot storage", async () => {
    const userId = await makeUser("purge-archived");
    const invitationId = await makeInvitation(userId, "purge-archived");
    await prisma.invitation.update({ where: { id: invitationId }, data: { status: "ARCHIVED" } });
    sessionUser = { id: "admin-vitest", email: "admin@test.local", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };

    const res = await purgeInvitation(new NextRequest(`http://localhost/api/admin/invitations/${invitationId}/purge`, { method: "POST" }), { params: Promise.resolve({ id: invitationId }) });
    expect(res.status).toBe(200);
    expect((await res.json()).rebakeSuccess).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), "public", "published", "ids", `${invitationId}.html`))).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB)("katalog tema publik", () => {
  it("jenis acara yang tidak dikenal menghasilkan daftar kosong, bukan galat 500", async () => {
    const res = await publicThemes(new Request("http://localhost/api/public/themes?eventType=bukan_jenis"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

afterAll(async () => {
  await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
  await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  await prisma.admin.deleteMany({ where: { id: { in: ids.admins } } });
  await prisma.$disconnect();
  await pool.end();
});
