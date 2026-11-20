import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

process.env.AUTH_SECRET ||= "vitest-payout-proof-auth-secret-32chars!!";

const sentPayoutEmails: Array<Record<string, any>> = [];
let adminSession: { id: string; email: string; role: string; isAdmin: boolean } | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (adminSession ? { user: adminSession } : null)),
}));

vi.mock("@/lib/mailer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mailer")>();
  return {
    ...actual,
    sendPartnerPayoutEmail: vi.fn(async (input: Record<string, any>) => {
      sentPayoutEmails.push(input);
      return { success: true };
    }),
  };
});

import { prisma, pool } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { buildPartnerPayoutHtml } from "@/lib/email-templates";
import { PARTNER_COOKIE_NAME, signPartnerSession } from "@/lib/partnerAuth";
import { GET as marketingGet, POST as marketingPost } from "@/app/api/admin/marketing/route";
import { GET as adminPayoutReceiptGet } from "@/app/api/admin/marketing/payouts/[expenseId]/receipt/route";
import { GET as partnerDashboardGet } from "@/app/api/partner/dashboard/route";
import { GET as partnerReceiptGet } from "@/app/api/partner/payouts/[expenseId]/receipt/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `payoutproof-${Date.now().toString(36)}`;

// Valid 1x1 PNG binary
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+f9sAAAAASUVORK5CYII=",
  "base64",
);

const cleanup = {
  admins: [] as string[],
  partners: [] as string[],
  expenses: [] as string[],
  receiptRefs: [] as string[],
};

describe.skipIf(!IS_TEST_DB)("Partner Payout Proof Upload & Automatic Email (DB luxenary_test)", () => {
  afterAll(async () => {
    for (const ref of cleanup.receiptRefs) {
      await deleteFile(ref).catch(() => {});
    }
    if (cleanup.expenses.length) {
      await prisma.expense.deleteMany({ where: { id: { in: cleanup.expenses } } }).catch(() => {});
    }
    if (cleanup.partners.length) {
      await prisma.partnerAffiliate.deleteMany({ where: { id: { in: cleanup.partners } } }).catch(() => {});
    }
    await prisma.adminAuditLog.deleteMany({ where: { details: { contains: RUN } } }).catch(() => {});
    if (cleanup.admins.length) {
      await prisma.admin.deleteMany({ where: { id: { in: cleanup.admins } } }).catch(() => {});
    }
    await prisma.$disconnect();
    await pool.end();
  });

  it("uploads transfer proof privately, emails partner with attachment, exposes receipt to owner & marketing admin only, and blocks IDOR / invalid file", async () => {
    const admin = await prisma.admin.create({
      data: {
        username: `admin_${RUN}`,
        email: `admin-${RUN}@luxvite.test`,
        name: `Admin Uji ${RUN}`,
        role: "SUPER_ADMIN",
      },
    });
    cleanup.admins.push(admin.id);
    adminSession = { id: admin.id, email: admin.email, role: "SUPER_ADMIN", isAdmin: true };

    const partnerA = await prisma.partnerAffiliate.create({
      data: {
        name: `Mitra Alpha ${RUN}`,
        email: `alpha-${RUN}@test.local`,
        bankName: "BCA",
        accountNumber: "1234567890",
        accountName: "Alpha Event",
        commissionType: "PERCENT",
        commissionValue: 10,
        pendingBalance: 150000,
        totalPaidOut: 0,
        isActive: true,
      },
    });
    const partnerB = await prisma.partnerAffiliate.create({
      data: {
        name: `Mitra Beta ${RUN}`,
        email: `beta-${RUN}@test.local`,
        commissionType: "NOMINAL",
        commissionValue: 25000,
        pendingBalance: 50000,
        totalPaidOut: 0,
        isActive: true,
      },
    });
    const partnerNoEmail = await prisma.partnerAffiliate.create({
      data: {
        name: `Mitra Tanpa Email ${RUN}`,
        email: null,
        commissionType: "NOMINAL",
        commissionValue: 25000,
        pendingBalance: 40000,
        totalPaidOut: 0,
        isActive: true,
      },
    });
    cleanup.partners.push(partnerA.id, partnerB.id, partnerNoEmail.id);

    // 1. Disguised SVG uploaded as .png must be rejected with 400 and leave balance untouched
    const badForm = new FormData();
    badForm.append("action", "PAYOUT_PARTNER");
    badForm.append("partnerId", partnerA.id);
    badForm.append("amount", "50000");
    badForm.append("receiptFile", new File(["<svg><script>alert(1)</script></svg>"], "evil.png", { type: "image/png" }));
    const badRes = await marketingPost(
      new NextRequest("http://localhost/api/admin/marketing", { method: "POST", body: badForm }),
    );
    expect(badRes.status).toBe(400);
    const untouchedA = await prisma.partnerAffiliate.findUniqueOrThrow({ where: { id: partnerA.id } });
    expect(Number(untouchedA.pendingBalance)).toBe(150000);

    // 2. Valid partial payout with PNG transfer proof
    const form = new FormData();
    form.append("action", "PAYOUT_PARTNER");
    form.append("partnerId", partnerA.id);
    form.append("amount", "50000");
    form.append("paymentSource", "TRANSFER_BANK");
    form.append("referenceNumber", `TRF-${RUN}`);
    form.append("notes", `Pencairan tahap 1 ${RUN}`);
    form.append("receiptFile", new File([PNG_1X1], "bukti-transfer.png", { type: "image/png" }));

    const payoutRes = await marketingPost(
      new NextRequest("http://localhost/api/admin/marketing", { method: "POST", body: form }),
    );
    expect(payoutRes.status).toBe(200);
    const payoutJson = await payoutRes.json();
    expect(payoutJson.success).toBe(true);
    expect(payoutJson.remainingBalance).toBe(100000);
    expect(payoutJson.hasReceipt).toBe(true);
    expect(payoutJson.emailSent).toBe(true);
    expect(payoutJson.emailRecipient).toBe(partnerA.email);
    expect(payoutJson.emailError).toBeNull();

    const expenseId: string = payoutJson.expenseId;
    cleanup.expenses.push(expenseId);

    // Verify DB Expense record links partnerAffiliateId and private receiptUrl
    const expense = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
    expect(expense.partnerAffiliateId).toBe(partnerA.id);
    expect(expense.referenceNumber).toBe(`TRF-${RUN}`);
    expect(expense.receiptUrl).toMatch(/^private-(bucket|disk):receipts\/receipt-\d+-[a-z0-9]+\.png$/);
    if (expense.receiptUrl) cleanup.receiptRefs.push(expense.receiptUrl);

    // Verify automatic email payload & binary attachment
    expect(sentPayoutEmails).toHaveLength(1);
    const mailCall = sentPayoutEmails[0];
    expect(mailCall.recipientEmail).toBe(partnerA.email);
    expect(mailCall.amount).toBe(50000);
    expect(mailCall.remainingBalance).toBe(100000);
    expect(mailCall.accountNumberMasked).toBe("******7890");
    expect(mailCall.referenceNumber).toBe(`TRF-${RUN}`);
    expect(mailCall.hasAttachment).toBe(true);
    expect(mailCall.attachment.contentType).toBe("image/png");
    expect(Buffer.compare(mailCall.attachment.content, PNG_1X1)).toBe(0);

    // Verify HTML template rendering
    const rendered = buildPartnerPayoutHtml({
      partnerName: partnerA.name,
      recipientEmail: partnerA.email!,
      amount: 50000,
      remainingBalance: 100000,
      paidAtFormatted: "20 November 2026 pukul 09.00 WIB",
      bankName: "BCA",
      accountNumberMasked: "******7890",
      accountName: "Alpha Event",
      paymentSource: "TRANSFER_BANK",
      referenceNumber: `TRF-${RUN}`,
      notes: `Pencairan tahap 1 ${RUN}`,
      hasAttachment: true,
    });
    expect(rendered.subject).toContain("50.000");
    expect(rendered.html).toContain("******7890");
    expect(rendered.html).toContain(`TRF-${RUN}`);
    expect(rendered.html).toContain("Bukti transfer terlampir");

    // 3. Partner A dashboard includes partial payout with hasReceipt=true and never exposes raw receiptUrl
    const cookieA = signPartnerSession(partnerA.id, partnerA.email!);
    const dashRes = await partnerDashboardGet(
      new NextRequest("http://localhost/api/partner/dashboard", {
        headers: { cookie: `${PARTNER_COOKIE_NAME}=${cookieA}` },
      }),
    );
    expect(dashRes.status).toBe(200);
    const dashJson = await dashRes.json();
    expect(dashJson.payouts).toHaveLength(1);
    expect(dashJson.payouts[0].id).toBe(expenseId);
    expect(dashJson.payouts[0].amount).toBe(50000);
    expect(dashJson.payouts[0].hasReceipt).toBe(true);
    expect("receiptUrl" in dashJson.payouts[0]).toBe(false);

    // 4. Partner A can view & download own receipt
    const viewRes = await partnerReceiptGet(
      new NextRequest(`http://localhost/api/partner/payouts/${expenseId}/receipt`, {
        headers: { cookie: `${PARTNER_COOKIE_NAME}=${cookieA}` },
      }),
      { params: Promise.resolve({ expenseId }) },
    );
    expect(viewRes.status).toBe(200);
    expect(viewRes.headers.get("content-type")).toBe("image/png");
    expect(viewRes.headers.get("cache-control")).toBe("private, no-store");
    expect(viewRes.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.compare(Buffer.from(await viewRes.arrayBuffer()), PNG_1X1)).toBe(0);

    const dlRes = await partnerReceiptGet(
      new NextRequest(`http://localhost/api/partner/payouts/${expenseId}/receipt?download=1`, {
        headers: { cookie: `${PARTNER_COOKIE_NAME}=${cookieA}` },
      }),
      { params: Promise.resolve({ expenseId }) },
    );
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers.get("content-disposition")).toMatch(/^attachment;/);

    // 5. IDOR check: Partner B cannot access Partner A's payout receipt -> 404
    const cookieB = signPartnerSession(partnerB.id, partnerB.email!);
    const idorRes = await partnerReceiptGet(
      new NextRequest(`http://localhost/api/partner/payouts/${expenseId}/receipt`, {
        headers: { cookie: `${PARTNER_COOKIE_NAME}=${cookieB}` },
      }),
      { params: Promise.resolve({ expenseId }) },
    );
    expect(idorRes.status).toBe(404);

    // 6. Unauthenticated request -> 401
    const unauthRes = await partnerReceiptGet(
      new NextRequest(`http://localhost/api/partner/payouts/${expenseId}/receipt`),
      { params: Promise.resolve({ expenseId }) },
    );
    expect(unauthRes.status).toBe(401);

    // 7. Admin Marketing GET returns payout history & receipt endpoint serves partner payout receipt ONLY
    const mktRes = await marketingGet();
    expect(mktRes.status).toBe(200);
    const mktJson = await mktRes.json();
    const foundPayout = mktJson.payouts.find((p: { id: string }) => p.id === expenseId);
    expect(foundPayout?.hasReceipt).toBe(true);

    const adminViewRes = await adminPayoutReceiptGet(
      new NextRequest(`http://localhost/api/admin/marketing/payouts/${expenseId}/receipt`),
      { params: Promise.resolve({ expenseId }) },
    );
    expect(adminViewRes.status).toBe(200);
    expect(Buffer.compare(Buffer.from(await adminViewRes.arrayBuffer()), PNG_1X1)).toBe(0);

    // Non-partner finance expense cannot be opened via marketing payout receipt endpoint -> 404
    const infraExpense = await prisma.expense.create({
      data: {
        title: `Server VPS ${RUN}`,
        category: "INFRASTRUCTURE",
        amount: 200000,
        receiptUrl: expense.receiptUrl,
      },
    });
    cleanup.expenses.push(infraExpense.id);
    const crossModuleRes = await adminPayoutReceiptGet(
      new NextRequest(`http://localhost/api/admin/marketing/payouts/${infraExpense.id}/receipt`),
      { params: Promise.resolve({ expenseId: infraExpense.id }) },
    );
    expect(crossModuleRes.status).toBe(404);

    // 8. Partner without email: payout succeeds, reports emailSent=false & PARTNER_EMAIL_MISSING honestly
    const noEmailRes = await marketingPost(
      new NextRequest("http://localhost/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PAYOUT_PARTNER",
          partnerId: partnerNoEmail.id,
          amount: 40000,
        }),
      }),
    );
    expect(noEmailRes.status).toBe(200);
    const noEmailJson = await noEmailRes.json();
    cleanup.expenses.push(noEmailJson.expenseId);
    expect(noEmailJson.emailSent).toBe(false);
    expect(noEmailJson.emailError).toBe("PARTNER_EMAIL_MISSING");
  });
});
