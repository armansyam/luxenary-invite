/**
 * Integration tests — alur pembayaran & pemenuhan pesanan terhadap PostgreSQL sungguhan.
 *
 * Hanya berjalan jika DATABASE_URL menunjuk ke database `luxenary_test`.
 * Tanpa itu seluruh suite di-skip agar tidak pernah menulis ke database kerja.
 *
 * Jalankan:
 *   DATABASE_URL="postgresql://.../luxenary_test?schema=public" npx vitest run __tests__/integration
 *
 * Test menegaskan perilaku BENAR. Test yang gagal = bug terkonfirmasi di kode.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";

vi.mock("@/lib/mailer", () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/paymentEvents", () => ({
  paymentEmitter: { emit: vi.fn() },
}));

import { prisma, pool } from "@/lib/prisma";
import { POST as midtransWebhook } from "@/app/api/webhook/midtrans/route";
import { applyBundleFulfillment } from "@/lib/upgradeHelper";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const SERVER_KEY = "SB-Mid-server-vitestintegrationkey";
const RUN = `vitest_${Date.now()}`;
const RUN_STARTED_AT = new Date();

const ids = {
  users: [] as string[],
  orders: [] as string[],
  invitations: [] as string[],
  partners: [] as string[],
  coupons: [] as string[],
};

async function makeUser(tag: string) {
  const u = await prisma.user.create({
    data: { email: `${RUN}_${tag}@test.local`, name: `User ${tag}` },
  });
  ids.users.push(u.id);
  return u;
}

async function makeOrder(
  userId: string,
  over: Record<string, any> = {}
) {
  const o = await prisma.order.create({
    data: {
      userId,
      invoiceNumber: `${RUN}-${crypto.randomUUID().slice(0, 8)}`,
      planType: "TIER_2",
      amount: 500000,
      ...over,
    },
  });
  ids.orders.push(o.id);
  return o;
}

async function makeInvitation(userId: string, orderId: string | null, tag: string) {
  const inv = await prisma.invitation.create({
    data: {
      userId,
      orderId,
      invitationSlug: `${RUN}-${tag}`,
      groomSlug: `${RUN}-g-${tag}`,
      brideSlug: `${RUN}-b-${tag}`,
      featureSettings: JSON.stringify({}),
    },
  });
  ids.invitations.push(inv.id);
  return inv;
}

function signedWebhook(
  orderId: string,
  opts: { status?: string; amount?: string; signature?: string | null } = {}
) {
  const statusCode = "200";
  const amount = opts.amount ?? "500000.00";
  const signature =
    opts.signature === undefined
      ? crypto
          .createHash("sha512")
          .update(`${orderId}${statusCode}${amount}${SERVER_KEY}`)
          .digest("hex")
      : opts.signature;
  const body: Record<string, any> = {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: amount,
    transaction_status: opts.status ?? "settlement",
    transaction_id: crypto.randomUUID(),
  };
  if (signature !== null) body.signature_key = signature;
  return new NextRequest("http://localhost:3000/api/webhook/midtrans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!IS_TEST_DB)("Integrasi pembayaran & pemenuhan (DB luxenary_test)", () => {
  beforeAll(async () => {
    await prisma.adminSetting.upsert({
      where: { key: "midtrans_server_key" },
      update: { value: SERVER_KEY },
      create: { key: "midtrans_server_key", value: SERVER_KEY, group: "payment" },
    });
  });

  afterAll(async () => {
    await prisma.affiliateCommission.deleteMany({ where: { orderId: { in: ids.orders } } });
    await prisma.promoHold.deleteMany({ where: { orderId: { in: ids.orders } } });
    await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
    await prisma.promoCoupon.deleteMany({ where: { id: { in: ids.coupons } } });
    await prisma.partnerAffiliate.deleteMany({ where: { id: { in: ids.partners } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.adminSetting.deleteMany({ where: { key: "midtrans_server_key" } });
    await prisma.webhookLog.deleteMany({ where: { source: "midtrans", createdAt: { gte: RUN_STARTED_AT } } });
    await prisma.$disconnect();
    await pool.end();
  });

  // ── D: keamanan webhook ────────────────────────────────────────────────────
  describe("D. Verifikasi signature webhook", () => {
    it("signature salah -> order tetap PENDING", async () => {
      const u = await makeUser("d1");
      const o = await makeOrder(u.id);
      const res = await midtransWebhook(signedWebhook(o.id, { signature: "deadbeef" }));
      const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
      expect(res.status).toBe(200);
      expect(after.status).toBe("PENDING");
    });

    it("tanpa signature -> 400 dan order tetap PENDING", async () => {
      const u = await makeUser("d2");
      const o = await makeOrder(u.id);
      const res = await midtransWebhook(signedWebhook(o.id, { signature: null }));
      const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
      expect(res.status).toBe(400);
      expect(after.status).toBe("PENDING");
    });
  });

  // ── C: nominal ─────────────────────────────────────────────────────────────
  describe("C. Nominal webhook vs nominal yang ditagihkan", () => {
    it("gross_amount != chargedAmount (signature valid) -> tetap PENDING dan WebhookLog amount_mismatch", async () => {
      const u = await makeUser("c1");
      const o = await makeOrder(u.id, { amount: 500000, chargedAmount: 500000 });
      const res = await midtransWebhook(signedWebhook(o.id, { amount: "1000.00" }));
      const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
      const logs = await prisma.webhookLog.findMany({
        where: { source: "midtrans", status: "amount_mismatch", payload: { path: ["order_id"], equals: o.id } },
      });
      expect(res.status).toBe(200);
      expect(after.status).toBe("PENDING");
      expect(logs).toHaveLength(1);
    });

    it("mode BUYER: chargedAmount = amount + biaya layanan, dibayar penuh -> PAID (pembayaran sah tidak ditolak)", async () => {
      const u = await makeUser("c2");
      const o = await makeOrder(u.id, { amount: 500000, chargedAmount: 503500 });
      await midtransWebhook(signedWebhook(o.id, { amount: "503500.00" }));
      const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
      expect(after.status).toBe("PAID");
    });

    it("mode BUYER: dibayar sebesar amount saja (kurang biaya layanan) -> tetap PENDING", async () => {
      const u = await makeUser("c3");
      const o = await makeOrder(u.id, { amount: 500000, chargedAmount: 503500 });
      await midtransWebhook(signedWebhook(o.id, { amount: "500000.00" }));
      const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
      expect(after.status).toBe("PENDING");
    });

    it("order lama tanpa chargedAmount: bayar >= amount -> PAID, bayar < amount -> PENDING", async () => {
      // User berbeda: pelunasan satu order menghapus order PENDING lain milik user yang sama (purgeObsoleteUserOrders)
      const u1 = await makeUser("c4a");
      const u2 = await makeUser("c4b");
      const paid = await makeOrder(u1.id, { amount: 500000 });
      const short = await makeOrder(u2.id, { amount: 500000 });
      await midtransWebhook(signedWebhook(paid.id, { amount: "500000.00" }));
      await midtransWebhook(signedWebhook(short.id, { amount: "1000.00" }));
      const a = await prisma.order.findUniqueOrThrow({ where: { id: paid.id } });
      const b = await prisma.order.findUniqueOrThrow({ where: { id: short.id } });
      expect(a.status).toBe("PAID");
      expect(b.status).toBe("PENDING");
    });
  });

  // ── Happy path + idempotensi ───────────────────────────────────────────────
  describe("Webhook settlement + marketing", () => {
    async function seedPromoOrder(tag: string, pendingBalance = 0) {
      const u = await makeUser(tag);
      const partner = await prisma.partnerAffiliate.create({
        data: {
          name: `Mitra ${tag}`,
          commissionType: "PERCENT",
          commissionValue: 10,
          pendingBalance,
        },
      });
      ids.partners.push(partner.id);
      const coupon = await prisma.promoCoupon.create({
        data: {
          code: `${RUN}-${tag}`.toUpperCase(),
          discountValue: 0,
          partnerId: partner.id,
        },
      });
      ids.coupons.push(coupon.id);
      const order = await makeOrder(u.id, { promoCouponId: coupon.id, promoCodeApplied: coupon.code });
      await prisma.promoHold.create({
        data: {
          promoCode: coupon.code,
          orderId: order.id,
          userId: u.id,
          discountAmount: 0,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      return { order, partner, coupon };
    }

    it("settlement valid -> PAID, hold CONSUMED, komisi 10% tercatat, saldo mitra bertambah", async () => {
      const { order, partner, coupon } = await seedPromoOrder("h1");
      const res = await midtransWebhook(signedWebhook(order.id));
      expect(res.status).toBe(200);

      const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      const hold = await prisma.promoHold.findUniqueOrThrow({ where: { orderId: order.id } });
      const com = await prisma.affiliateCommission.findUnique({ where: { orderId: order.id } });
      const p = await prisma.partnerAffiliate.findUniqueOrThrow({ where: { id: partner.id } });
      const c = await prisma.promoCoupon.findUniqueOrThrow({ where: { id: coupon.id } });

      expect(o.status).toBe("PAID");
      expect(hold.status).toBe("CONSUMED");
      expect(Number(com?.commissionAmount)).toBe(50000);
      expect(Number(p.pendingBalance)).toBe(50000);
      expect(c.usageCount).toBe(1);
    });

    it("webhook dikirim 3x paralel -> tepat 1 komisi, saldo & usageCount tidak berlipat", async () => {
      const { order, partner, coupon } = await seedPromoOrder("h2");
      await Promise.all([
        midtransWebhook(signedWebhook(order.id)),
        midtransWebhook(signedWebhook(order.id)),
        midtransWebhook(signedWebhook(order.id)),
      ]);
      const count = await prisma.affiliateCommission.count({ where: { orderId: order.id } });
      const p = await prisma.partnerAffiliate.findUniqueOrThrow({ where: { id: partner.id } });
      const c = await prisma.promoCoupon.findUniqueOrThrow({ where: { id: coupon.id } });
      expect(count).toBe(1);
      expect(Number(p.pendingBalance)).toBe(50000);
      expect(c.usageCount).toBe(1);
    });

    it("B. kegagalan di tengah marketing -> rollback penuh (PENDING, hold HELD, tanpa komisi), lalu pulih saat webhook diulang", async () => {
      // Overflow Decimal(12,2) pada pendingBalance memaksa partnerAffiliate.update gagal
      // SETELAH affiliateCommission.create berhasil — kegagalan nyata di DB, tanpa mock.
      const { order, partner, coupon } = await seedPromoOrder("b1", 9999999999.5);
      const res = await midtransWebhook(signedWebhook(order.id));

      const o1 = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      const hold1 = await prisma.promoHold.findUniqueOrThrow({ where: { orderId: order.id } });
      const com1 = await prisma.affiliateCommission.findUnique({ where: { orderId: order.id } });
      const c1 = await prisma.promoCoupon.findUniqueOrThrow({ where: { id: coupon.id } });

      // Gateway harus mendapat 500 agar mengirim ulang; tidak ada efek samping yang tersisa.
      expect(res.status).toBe(500);
      expect(o1.status).toBe("PENDING");
      expect(hold1.status).toBe("HELD");
      expect(com1).toBeNull();
      expect(c1.usageCount).toBe(0);

      // Setelah penyebab kegagalan diperbaiki, webhook ulang harus menyelesaikan semuanya.
      await prisma.partnerAffiliate.update({ where: { id: partner.id }, data: { pendingBalance: 0 } });
      const retry = await midtransWebhook(signedWebhook(order.id));
      const o2 = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      const com2 = await prisma.affiliateCommission.findUnique({ where: { orderId: order.id } });
      const p2 = await prisma.partnerAffiliate.findUniqueOrThrow({ where: { id: partner.id } });

      expect(retry.status).toBe(200);
      expect(o2.status).toBe("PAID");
      expect(Number(com2?.commissionAmount)).toBe(50000);
      expect(Number(p2.pendingBalance)).toBe(50000);
    });
  });

  // ── A: isolasi antar-tenant pada pemenuhan bundle ──────────────────────────
  describe("A. applyBundleFulfillment — isolasi antar user", () => {
    it("order bundle tanpa linkedInvitationId dari user TANPA undangan -> undangan user lain tidak boleh berubah", async () => {
      const victim = await makeUser("a-victim");
      const victimOrder = await makeOrder(victim.id, { status: "PAID" });
      const victimInv = await makeInvitation(victim.id, victimOrder.id, "a-victim");

      const buyer = await makeUser("a-buyer"); // belum punya undangan sama sekali
      const bundle = await makeOrder(buyer.id, {
        status: "PAID",
        orderType: "MEMORIES_TOPUP",
        linkedInvitationId: null,
        itemsJson: JSON.stringify([{ type: "MEMORIES_TOPUP", photos: 100 }]),
      });

      await applyBundleFulfillment(bundle.id);

      const after = await prisma.invitation.findUniqueOrThrow({ where: { id: victimInv.id } });
      const fs = JSON.parse(after.featureSettings || "{}");
      expect(fs.extraMemoriesQuota ?? 0).toBe(0);
    });

    it("order bundle dengan linkedInvitationId valid -> hanya undangan miliknya yang berubah", async () => {
      const owner = await makeUser("a-owner");
      const ownerOrder = await makeOrder(owner.id, { status: "PAID" });
      const ownerInv = await makeInvitation(owner.id, ownerOrder.id, "a-owner");

      const other = await makeUser("a-other");
      const otherOrder = await makeOrder(other.id, { status: "PAID" });
      const otherInv = await makeInvitation(other.id, otherOrder.id, "a-other");

      const bundle = await makeOrder(owner.id, {
        status: "PAID",
        orderType: "MEMORIES_TOPUP",
        linkedInvitationId: ownerInv.id,
        itemsJson: JSON.stringify([{ type: "MEMORIES_TOPUP", photos: 50 }]),
      });

      await applyBundleFulfillment(bundle.id);

      const ownerAfter = await prisma.invitation.findUniqueOrThrow({ where: { id: ownerInv.id } });
      const otherAfter = await prisma.invitation.findUniqueOrThrow({ where: { id: otherInv.id } });
      expect(JSON.parse(ownerAfter.featureSettings || "{}").extraMemoriesQuota).toBe(50);
      expect(JSON.parse(otherAfter.featureSettings || "{}").extraMemoriesQuota ?? 0).toBe(0);
    });
  });
});
