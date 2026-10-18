/**
 * Regresi audit 18 Okt 2026 (putaran 3): kode promo yang membuat tagihan Rp 0 ditolak, tebakan kode promo dibatasi,
 * order PENDING yang pernah punya sesi gateway tidak dihapus permanen, sesi gateway order yang digantikan dibatalkan,
 * dan RSVP tidak menerima nama kosong.
 * (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let currentUserId = "";
let asAdmin = false;
vi.mock("@/auth", () => ({
  auth: vi.fn(async () =>
    asAdmin
      ? { user: { id: "admin-vitest", email: "admin@vitest.local", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } }
      : { user: { id: currentUserId, email: `${currentUserId}@t.local`, role: "CLIENT", isAdmin: false } }
  ),
}));

const cancelMock = vi.fn();
vi.mock("@/lib/gatewayRegistry", () => ({
  getGatewayById: vi.fn(async () => ({ cancel: cancelMock })),
  getActiveGateway: vi.fn(async () => ({ cancel: cancelMock })),
  getActiveGatewayId: vi.fn(async () => "midtrans"),
}));

import { prisma, pool } from "@/lib/prisma";
import { expireSupersededOrders } from "@/lib/paymentSession";
import { POST as createOrder } from "@/app/api/orders/create/route";
import { POST as validatePromo } from "@/app/api/public/promo/validate/route";
import { POST as confirmOrder } from "@/app/api/payments/checkout/confirm/route";
import { POST as rsvpPost } from "@/app/api/public/rsvp/route";
import { POST as adminMarketingPost } from "@/app/api/admin/marketing/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_a1018c_${Date.now()}`;
const FULL = `FU${Date.now().toString(36).toUpperCase()}`.slice(0, 18);
const HALF = `HA${Date.now().toString(36).toUpperCase()}`.slice(0, 18);
const SETTINGS: Record<string, string> = { price_tier1: "100000", promo_enabled: "true", payment_mode: "GATEWAY" };
const previous: Record<string, string | null> = {};
const users: string[] = [];
let seq = 0;

const json = (url: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function freshUser(tag: string) {
  const user = await prisma.user.create({ data: { email: `${RUN}-${tag}-${++seq}@t.local`, name: tag } });
  users.push(user.id);
  currentUserId = user.id;
  return user.id;
}

describe.skipIf(!IS_TEST_DB)("putaran 3 audit 18 Okt", () => {
  beforeAll(async () => {
    for (const [key, value] of Object.entries(SETTINGS)) {
      previous[key] = (await prisma.adminSetting.findUnique({ where: { key } }))?.value ?? null;
      await prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value, label: key, group: "payment" } });
    }
    await prisma.promoCoupon.create({ data: { code: FULL, discountType: "PERCENT", discountValue: 100, applicablePlans: [], isActive: true } });
    await prisma.promoCoupon.create({ data: { code: HALF, discountType: "PERCENT", discountValue: 50, applicablePlans: [], isActive: true } });
  });

  beforeEach(() => {
    cancelMock.mockReset();
    cancelMock.mockResolvedValue({ success: true });
  });

  afterAll(async () => {
    await prisma.promoHold.deleteMany({ where: { promoCode: { in: [FULL, HALF] } } });
    await prisma.promoCoupon.deleteMany({ where: { code: { in: [FULL, HALF] } } });
    await prisma.order.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    for (const [key, value] of Object.entries(previous)) {
      if (value === null) await prisma.adminSetting.deleteMany({ where: { key } });
      else await prisma.adminSetting.update({ where: { key }, data: { value } });
    }
    await prisma.rateLimitCounter.deleteMany({ where: { key: { startsWith: "rsvp_post:203.0.113." } } });
    await prisma.$disconnect();
    await pool.end();
  });

  describe("kode promo yang membuat tagihan Rp 0", () => {
    it("diskon 100% ditolak saat diterapkan, tanpa hold; diskon 50% tetap diterima", async () => {
      await freshUser("zero");
      const created = await (await createOrder(json("/api/orders/create", "POST", { planType: "TIER_1" }))).json();

      const full = await validatePromo(json("/api/public/promo/validate", "POST", { code: FULL, orderId: created.orderId }));
      expect(full.status).toBe(400);
      expect((await full.json()).error).toContain("Rp 0");
      expect(await prisma.promoHold.count({ where: { orderId: created.orderId } })).toBe(0);

      const half = await validatePromo(json("/api/public/promo/validate", "POST", { code: HALF, orderId: created.orderId }));
      expect(half.status).toBe(200);
      expect((await half.json()).discountAmount).toBe(50000);
    });

    it("konfirmasi menolak hold yang kini membuat Rp 0 dan melepaskannya", async () => {
      await freshUser("zeroconfirm");
      const created = await (await createOrder(json("/api/orders/create", "POST", { planType: "TIER_1" }))).json();
      await prisma.promoHold.create({
        data: { promoCode: FULL, orderId: created.orderId, userId: currentUserId, status: "HELD", discountAmount: 100000, expiresAt: new Date(Date.now() + 3600_000) },
      });

      const res = await confirmOrder(json("/api/payments/checkout/confirm", "POST", { orderId: created.orderId }));
      expect(res.status).toBe(400);
      expect((await res.json()).promoRevoked).toBe(true);
      expect((await prisma.promoHold.findUniqueOrThrow({ where: { orderId: created.orderId } })).status).toBe("RELEASED");
      const order = await prisma.order.findUniqueOrThrow({ where: { id: created.orderId } });
      expect(order.checkoutConfirmedAt).toBeNull();
    });
  });

  it("admin tidak dapat membuat kupon persen di atas 99 (paket gratis tidak didukung)", async () => {
    asAdmin = true;
    const codes = [`${RUN}A`.toUpperCase().slice(-12), `${RUN}B`.toUpperCase().slice(-12)];
    try {
      const create = (code: string, discountValue: number) =>
        adminMarketingPost(json("/api/admin/marketing", "POST", { action: "CREATE_COUPON", code, discountType: "PERCENT", discountValue }));
      const full = await create(codes[0], 100);
      expect(full.status).toBe(400);
      expect((await full.json()).error).toContain("99");
      const ok = await create(codes[1], 99);
      expect(ok.status).toBe(200);
    } finally {
      asAdmin = false;
      await prisma.promoCoupon.deleteMany({ where: { code: { in: codes.map((c) => c.replace(/[^A-Z0-9-]/g, "")) } } });
    }
  });

  it("tebakan kode promo dibatasi 10 per menit per akun", async () => {
    await freshUser("guess");
    const created = await (await createOrder(json("/api/orders/create", "POST", { planType: "TIER_1" }))).json();
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await validatePromo(json("/api/public/promo/validate", "POST", { code: `TEBAK${i}`, orderId: created.orderId }))).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  describe("order PENDING lama tidak dihapus permanen", () => {
    it("orders/create: draf duplikat berisi sesi gateway ditutup (EXPIRED), bukan dihapus", async () => {
      const userId = await freshUser("dup");
      const old = await prisma.order.create({
        data: {
          userId, invoiceNumber: `${RUN}-old`, planType: "TIER_1", amount: 100000, status: "PENDING", orderType: "NEW",
          gatewayId: "midtrans", gatewayTxId: "tx-old", expiredAt: new Date(Date.now() + 3600_000), createdAt: new Date(Date.now() - 60_000),
        },
      });
      const draftOnly = await prisma.order.create({
        data: { userId, invoiceNumber: `${RUN}-draft`, planType: "TIER_1", amount: 100000, status: "PENDING", orderType: "NEW", expiredAt: new Date(Date.now() + 3600_000), createdAt: new Date(Date.now() - 120_000) },
      });
      const newest = await prisma.order.create({
        data: { userId, invoiceNumber: `${RUN}-new`, planType: "TIER_1", amount: 100000, status: "PENDING", orderType: "NEW", expiredAt: new Date(Date.now() + 3600_000) },
      });

      const res = await createOrder(json("/api/orders/create", "POST", { planType: "TIER_1" }));
      expect((await res.json()).orderId).toBe(newest.id);

      const oldAfter = await prisma.order.findUnique({ where: { id: old.id } });
      expect(oldAfter?.status, "order dengan sesi gateway harus tetap ada").toBe("EXPIRED");
      expect(await prisma.order.findUnique({ where: { id: draftOnly.id } }), "draf tanpa gateway boleh dihapus").toBeNull();
    });
  });

  describe("expireSupersededOrders", () => {
    async function pending(userId: string, extra: Record<string, unknown> = {}) {
      return prisma.order.create({
        data: {
          userId, invoiceNumber: `${RUN}-sup-${++seq}`, planType: "TIER_2", amount: 50000, status: "PENDING", orderType: "MEMORIES_TOPUP",
          expiredAt: new Date(Date.now() + 3600_000), ...extra,
        },
      });
    }

    it("membatalkan sesi gateway lalu menutup order; tanpa sesi langsung ditutup", async () => {
      const userId = await freshUser("sup1");
      const withSession = await pending(userId, { gatewayId: "midtrans", gatewayTxId: "tx-1" });
      const noSession = await pending(userId);

      const closed = await expireSupersededOrders({ userId, orderType: "MEMORIES_TOPUP" }, "Digantikan");
      expect(closed).toBe(2);
      expect(cancelMock).toHaveBeenCalledTimes(1);
      expect(cancelMock).toHaveBeenCalledWith("tx-1");
      for (const o of [withSession, noSession]) {
        const row = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
        expect(row.status).toBe("EXPIRED");
        expect(row.rejectReason).toBe("Digantikan");
      }
    });

    it("order yang sudah terbayar di gateway dibiarkan PENDING; gateway gagal tetap menutup; bukti transfer tidak disentuh", async () => {
      const userId = await freshUser("sup2");
      const paidAtGateway = await pending(userId, { gatewayId: "midtrans", gatewayTxId: "tx-paid" });
      const gatewayDown = await pending(userId, { gatewayId: "midtrans", gatewayTxId: "tx-down" });
      const withProof = await pending(userId, { proofImageUrl: "/uploads/proofs/x.webp" });
      cancelMock.mockImplementation(async (tx: string) => {
        if (tx === "tx-paid") return { success: false, error: "Transaksi sudah terbayar, tidak bisa dibatalkan." };
        throw new Error("timeout");
      });

      const closed = await expireSupersededOrders({ userId, orderType: "MEMORIES_TOPUP" }, "Digantikan");
      expect(closed).toBe(1);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: paidAtGateway.id } })).status).toBe("PENDING");
      expect((await prisma.order.findUniqueOrThrow({ where: { id: gatewayDown.id } })).status).toBe("EXPIRED");
      expect((await prisma.order.findUniqueOrThrow({ where: { id: withProof.id } })).status).toBe("PENDING");
    });
  });

  it("RSVP menolak nama yang hanya spasi", async () => {
    const res = await rsvpPost(
      json("/api/public/rsvp", "POST", { invitationId: crypto.randomUUID(), guestName: "   ", status: "hadir" }, { "cf-connecting-ip": "203.0.113.77" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Nama");
  });
});
