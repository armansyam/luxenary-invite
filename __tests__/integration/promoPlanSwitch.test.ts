/**
 * Diskon promo tidak boleh terbawa saat paket diganti, dan melepas promo setelah konfirmasi mengembalikan
 * order ke harga normal (DB luxenary_test).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";

let currentUserId = "";
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: currentUserId, email: `${currentUserId}@t.local`, role: "CLIENT", isAdmin: false } })),
}));

import { prisma, pool } from "@/lib/prisma";
import { POST as createOrder } from "@/app/api/orders/create/route";
import { POST as validatePromo, DELETE as removePromo } from "@/app/api/public/promo/validate/route";
import { POST as confirmOrder } from "@/app/api/payments/checkout/confirm/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_promoswitch_${Date.now()}`;
const CODE = `PS${Date.now().toString(36).toUpperCase()}`.slice(0, 18);
const SETTINGS: Record<string, string> = { price_tier1: "100000", price_tier3: "500000", promo_enabled: "true", payment_mode: "GATEWAY" };
const previous: Record<string, string | null> = {};
let couponId = "";

const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function freshUser(tag: string) {
  const user = await prisma.user.create({ data: { email: `${RUN}-${tag}@t.local`, name: tag } });
  currentUserId = user.id;
  return user.id;
}

async function cleanup(userId: string) {
  await prisma.order.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

describe.skipIf(!IS_TEST_DB)("promo dan penggantian paket", () => {
  beforeAll(async () => {
    for (const [key, value] of Object.entries(SETTINGS)) {
      previous[key] = (await prisma.adminSetting.findUnique({ where: { key } }))?.value ?? null;
      await prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value, label: key, group: "payment" } });
    }
    const coupon = await prisma.promoCoupon.create({
      data: { code: CODE, discountType: "PERCENT", discountValue: 50, applicablePlans: [], isActive: true },
    });
    couponId = coupon.id;
  });

  afterAll(async () => {
    await prisma.promoHold.deleteMany({ where: { promoCode: CODE } });
    await prisma.promoCoupon.deleteMany({ where: { id: couponId } });
    for (const [key, value] of Object.entries(previous)) {
      if (value === null) await prisma.adminSetting.deleteMany({ where: { key } });
      else await prisma.adminSetting.update({ where: { key }, data: { value } });
    }
    await prisma.$disconnect();
    await pool.end();
  });

  it("promo di paket mahal lalu pindah ke paket murah: hold dilepas dan order tidak berdiskon", async () => {
    const userId = await freshUser("switch");
    try {
      const created = await (await createOrder(json("/api/orders/create", "POST", { planType: "TIER_3" }))).json();
      expect(created.amount).toBe(500000);

      const promo = await (await validatePromo(json("/api/public/promo/validate", "POST", { code: CODE, orderId: created.orderId }))).json();
      expect(promo.discountAmount).toBe(250000);

      const switched = await (await createOrder(json("/api/orders/create", "POST", { planType: "TIER_1" }))).json();
      expect(switched.orderId).toBe(created.orderId);
      expect(switched.planChanged).toBe(true);

      const held = await prisma.promoHold.count({ where: { orderId: created.orderId, status: "HELD" } });
      expect(held).toBe(0);

      const confirmed = await (await confirmOrder(json("/api/payments/checkout/confirm", "POST", { orderId: created.orderId }))).json();
      expect(confirmed.amount).toBe(100000);
      expect(confirmed.discountAmount).toBe(0);
      expect(confirmed.promoCode).toBeNull();
    } finally {
      await cleanup(userId);
    }
  });

  it("konfirmasi menolak hold untuk paket di luar applicablePlans", async () => {
    await prisma.promoCoupon.update({ where: { id: couponId }, data: { applicablePlans: ["TIER_3"] } });
    const userId = await freshUser("plans");
    try {
      const created = await (await createOrder(json("/api/orders/create", "POST", { planType: "TIER_1" }))).json();
      await prisma.promoHold.create({
        data: { promoCode: CODE, orderId: created.orderId, userId, status: "HELD", discountAmount: 250000, expiresAt: new Date(Date.now() + 3600_000) },
      });
      const res = await confirmOrder(json("/api/payments/checkout/confirm", "POST", { orderId: created.orderId }));
      expect(res.status).toBe(400);
      const order = await prisma.order.findUniqueOrThrow({ where: { id: created.orderId } });
      expect(Number(order.amount)).toBe(100000);
      expect(order.promoCodeApplied).toBeNull();
    } finally {
      await cleanup(userId);
      await prisma.promoCoupon.update({ where: { id: couponId }, data: { applicablePlans: [] } });
    }
  });

  it("melepas promo setelah konfirmasi mengembalikan harga normal dan mewajibkan konfirmasi ulang", async () => {
    const userId = await freshUser("remove");
    try {
      const created = await (await createOrder(json("/api/orders/create", "POST", { planType: "TIER_3" }))).json();
      await validatePromo(json("/api/public/promo/validate", "POST", { code: CODE, orderId: created.orderId }));
      const confirmed = await (await confirmOrder(json("/api/payments/checkout/confirm", "POST", { orderId: created.orderId }))).json();
      expect(confirmed.amount).toBe(250000);

      const res = await removePromo(json(`/api/public/promo/validate?orderId=${created.orderId}`, "DELETE"));
      expect(res.status).toBe(200);

      const order = await prisma.order.findUniqueOrThrow({ where: { id: created.orderId } });
      expect(Number(order.amount)).toBe(500000);
      expect(order.discountAmount).toBeNull();
      expect(order.promoCodeApplied).toBeNull();
      expect(order.promoCouponId).toBeNull();
      expect(order.checkoutConfirmedAt).toBeNull();
      expect(await prisma.promoHold.count({ where: { orderId: created.orderId, status: "HELD" } })).toBe(0);
    } finally {
      await cleanup(userId);
    }
  });
});
