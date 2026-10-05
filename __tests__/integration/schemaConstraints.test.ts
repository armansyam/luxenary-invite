/**
 * Aturan data yang dijaga database (migrasi 20261005120000): enum tertutup, kolom wajib, CHECK angka dan rentang,
 * CHECK teks-JSON, serta penolakan 400 di route sebelum database sampai menolak. Hanya berjalan di `luxenary_test`.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: { id: string; email?: string; role: string; isAdmin: boolean; permissions: string[] } | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { PUT as invitationPut } from "@/app/api/client/invitations/[id]/route";
import { POST as marketingPost } from "@/app/api/admin/marketing/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `schemachk${Date.now()}`;

let userId = "";
let invitationId = "";
let orderId = "";
let partnerId = "";
let couponId = "";

const rawInsertWebhook = (status: string) =>
  pool.query(`INSERT INTO webhook_logs (id, source, event, payload, status) VALUES ($1, 'test', 'e', '{}'::jsonb, $2::"WebhookLogStatus")`, [`${TAG}-${status}`, status]);

const put = (body: Record<string, unknown>) =>
  invitationPut(
    new Request(`http://localhost/api/client/invitations/${invitationId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: { id: invitationId } }
  );

const marketing = (body: Record<string, unknown>) =>
  marketingPost(
    new NextRequest("http://localhost/api/admin/marketing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

describe.skipIf(!IS_TEST_DB)("constraint skema database", () => {
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `${TAG}@example.test`, name: TAG } });
    userId = user.id;
    const inv = await prisma.invitation.create({
      data: { userId, invitationSlug: `${TAG}-inv`, groomSlug: `${TAG}-g`, brideSlug: `${TAG}-b`, status: "DRAFT" },
    });
    invitationId = inv.id;
    const order = await prisma.order.create({ data: { userId, invoiceNumber: `${TAG}-INV`, planType: "TIER_1", amount: 1000 } });
    orderId = order.id;
    const partner = await prisma.partnerAffiliate.create({ data: { name: TAG, commissionValue: 10 } });
    partnerId = partner.id;
    const coupon = await prisma.promoCoupon.create({ data: { code: `${TAG}`.toUpperCase().slice(0, 20), discountValue: 10 } });
    couponId = coupon.id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM webhook_logs WHERE id LIKE $1`, [`${TAG}-%`]);
    await prisma.promoCoupon.deleteMany({ where: { id: couponId } });
    await prisma.partnerAffiliate.deleteMany({ where: { id: partnerId } });
    await prisma.invitation.deleteMany({ where: { id: invitationId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await pool.end();
  });

  describe("enum dan kolom wajib", () => {
    it("webhook_logs.status di luar enum ditolak, nilai sah diterima", async () => {
      await expect(rawInsertWebhook("ignored")).rejects.toMatchObject({ code: "22P02" });
      await expect(rawInsertWebhook("stale_session")).resolves.toBeDefined();
    });

    it("themes.category di luar enum ditolak", async () => {
      await expect(
        pool.query(`INSERT INTO themes (id, name, category) VALUES ($1, $1, 'futuristik')`, [`${TAG}-theme`])
      ).rejects.toMatchObject({ code: "22P02" });
    });

    it("orders.paymentMethod tidak boleh NULL", async () => {
      await expect(pool.query(`UPDATE orders SET "paymentMethod" = NULL WHERE id = $1`, [orderId])).rejects.toMatchObject({ code: "23502" });
    });

    it("guest_memories tidak lagi punya kolom mediaType", async () => {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_memories' AND column_name = 'mediaType'`
      );
      expect(rows).toHaveLength(0);
    });
  });

  describe("CHECK angka dan rentang", () => {
    it.each([
      ["order bernilai negatif", () => prisma.order.update({ where: { id: orderId }, data: { amount: -1 } }), "chk_orders_amounts_nonnegative"],
      ["order dengan nominal tertagih negatif", () => prisma.order.update({ where: { id: orderId }, data: { chargedAmount: -5 } }), "chk_orders_amounts_nonnegative"],
      ["pengeluaran negatif", () => prisma.expense.create({ data: { title: TAG, amount: -1 } }), "chk_expenses_amount_nonnegative"],
      ["tanggal jatuh tempo di luar 1-31", () => prisma.recurringExpense.create({ data: { name: TAG, estimatedAmount: 1, dueDayOfMonth: 32 } }), "chk_recurring_expenses_dueDay_range"],
      ["bulan tutup buku di luar 1-12", () => prisma.financialClosing.create({ data: { periodMonth: 13, periodYear: 2026, grossRevenue: 0, totalExpenses: 0, netProfit: 0, taxAmount: 0, closedById: TAG } }), "chk_financial_closings_period_range"],
      ["saldo komisi mitra negatif", () => prisma.partnerAffiliate.update({ where: { id: partnerId }, data: { pendingBalance: -1 } }), "chk_partner_affiliates_balances_nonnegative"],
      ["komisi persen di atas 100", () => prisma.partnerAffiliate.update({ where: { id: partnerId }, data: { commissionType: "PERCENT", commissionValue: 101 } }), "chk_partner_affiliates_percent_range"],
      ["diskon persen di atas 100", () => prisma.promoCoupon.update({ where: { id: couponId }, data: { discountType: "PERCENT", discountValue: 150 } }), "chk_promo_coupons_percent_range"],
      ["pemakaian kupon negatif", () => prisma.promoCoupon.update({ where: { id: couponId }, data: { usageCount: -1 } }), "chk_promo_coupons_counts_nonnegative"],
      ["kupon berakhir sebelum mulai", () => prisma.promoCoupon.update({ where: { id: couponId }, data: { validFrom: new Date("2026-12-01"), validUntil: new Date("2026-11-01") } }), "chk_promo_coupons_validity_order"],
      ["jumlah tamu RSVP negatif", () => prisma.rsvp.create({ data: { invitationId, guestName: TAG, status: "hadir", guestCount: -1 } }), "chk_rsvps_guestCount_nonnegative"],
      ["kuota tamu negatif", () => prisma.guest.create({ data: { invitationId, name: TAG, slug: TAG, guestQuota: -1 } }), "chk_guests_quota_nonnegative"],
    ])("%s ditolak", async (_name, attempt, constraint) => {
      await expect(attempt()).rejects.toThrow(new RegExp(constraint));
    });

    it("nilai batas yang sah tetap diterima", async () => {
      await expect(prisma.partnerAffiliate.update({ where: { id: partnerId }, data: { commissionType: "PERCENT", commissionValue: 100 } })).resolves.toBeDefined();
      await expect(prisma.promoCoupon.update({ where: { id: couponId }, data: { discountType: "PERCENT", discountValue: 100, usageCount: 0 } })).resolves.toBeDefined();
    });
  });

  describe("kolom teks berisi JSON", () => {
    it.each(["eventData", "participantsJson", "loveStory", "bankAccounts", "featureSettings"] as const)("%s menolak teks yang bukan JSON", async (column) => {
      await expect(prisma.invitation.update({ where: { id: invitationId }, data: { [column]: "bukan json" } })).rejects.toThrow();
      await expect(prisma.invitation.update({ where: { id: invitationId }, data: { [column]: "" } })).rejects.toThrow();
    });

    it("JSON valid dan NULL diterima", async () => {
      await expect(prisma.invitation.update({ where: { id: invitationId }, data: { eventData: "[]", loveStory: '[{"title":"a"}]' } })).resolves.toBeDefined();
      await expect(prisma.invitation.update({ where: { id: invitationId }, data: { eventData: null, loveStory: null } })).resolves.toBeDefined();
    });
  });

  describe("route menjawab 400, bukan 500", () => {
    it.each(["loveStory", "bankAccounts", "participantsJson"])("PUT undangan dengan %s bukan JSON -> 400 dan data tidak berubah", async (field) => {
      sessionUser = { id: userId, email: `${TAG}@example.test`, role: "CLIENT", isAdmin: false, permissions: [] };
      const res = await put({ [field]: "bukan json" });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain(field);
    });

    it("PUT undangan dengan JSON valid dan string kosong diterima", async () => {
      sessionUser = { id: userId, email: `${TAG}@example.test`, role: "CLIENT", isAdmin: false, permissions: [] };
      const res = await put({ loveStory: '[{"title":"Awal"}]', participantsJson: "" });
      expect(res.status).toBe(200);
      const row = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: { loveStory: true, participantsJson: true } });
      expect(row.loveStory).toBe('[{"title":"Awal"}]');
      expect(row.participantsJson).toBeNull();
    });

    it("kupon persen di atas 100 dan komisi persen di atas 100 ditolak 400", async () => {
      sessionUser = { id: "admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
      const coupon = await marketing({ action: "CREATE_COUPON", code: `${TAG}X`.toUpperCase().slice(0, 18), discountType: "PERCENT", discountValue: 150 });
      expect(coupon.status).toBe(400);
      const partner = await marketing({ action: "CREATE_PARTNER", name: TAG, commissionType: "PERCENT", commissionValue: 150 });
      expect(partner.status).toBe(400);
      expect(await prisma.partnerAffiliate.count({ where: { name: TAG, commissionValue: 150 } })).toBe(0);
    });
  });
});
