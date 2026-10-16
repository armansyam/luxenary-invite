/**
 * Batas permintaan per pengguna pada /api/payments/checkout dan /api/payments/qris/regenerate: 15 per menit,
 * kunci terpisah per rute, lalu 429. (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

const gw = vi.hoisted(() => ({
  init: vi.fn(async () => ({ qrString: "qr", sessionId: "tx-ratelimit", gatewayTxId: "tx-ratelimit", expiryTimestamp: Date.now() + 15 * 60_000 })),
  cancel: vi.fn(async () => ({ success: true })),
  verify: vi.fn(async () => ({ status: "PENDING" })),
}));
vi.mock("@/lib/gatewayRegistry", () => ({
  getGatewayById: vi.fn(async () => gw),
  getActiveGateway: vi.fn(async () => gw),
  getActiveGatewayId: vi.fn(async () => "midtrans"),
}));
vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn(async () => undefined) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as checkoutPost } from "@/app/api/payments/checkout/route";
import { POST as regeneratePost } from "@/app/api/payments/qris/regenerate/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_payratelimit_${Date.now()}`;
const LIMIT = 15;
const userIds: string[] = [];

const post = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json", host: "localhost" }, body: JSON.stringify(body) });

async function makeUserWithOrder(suffix: string) {
  const user = await prisma.user.create({ data: { email: `${TAG}_${suffix}@t.local`, name: "Klien" } });
  userIds.push(user.id);
  sessionUser = { id: user.id, email: user.email, role: "CLIENT" };
  const order = await prisma.order.create({
    data: {
      userId: user.id, invoiceNumber: `${TAG}-${suffix}`, planType: "TIER_1", amount: 99000, status: "PENDING",
      orderType: "NEW", paymentMethod: "GATEWAY", checkoutConfirmedAt: new Date(), expiredAt: new Date(Date.now() + 24 * 3_600_000),
    },
  });
  return { user, order };
}

describe.skipIf(!IS_TEST_DB)("batas permintaan pembayaran per pengguna", () => {
  afterAll(async () => {
    sessionUser = null;
    for (const id of userIds) {
      await pool.query("DELETE FROM rate_limit_counters WHERE key IN ($1, $2)", [`payments_checkout:${id}`, `payments_qris_regenerate:${id}`]);
    }
    await prisma.promoHold.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("checkout: 15 permintaan pertama lolos, yang ke-16 dijawab 429", async () => {
    const { order } = await makeUserWithOrder("checkout");
    for (let i = 0; i < LIMIT; i++) {
      const res = await checkoutPost(post("/api/payments/checkout", { orderId: order.id }));
      expect(res.status, `permintaan ke-${i + 1}`).not.toBe(429);
    }
    const blocked = await checkoutPost(post("/api/payments/checkout", { orderId: order.id }));
    expect(blocked.status).toBe(429);
  });

  it("regenerate: dihitung terpisah dari checkout dan dibatasi 15 per menit", async () => {
    const { order } = await makeUserWithOrder("regenerate");
    for (let i = 0; i < LIMIT; i++) {
      const res = await regeneratePost(post("/api/payments/qris/regenerate", { orderId: order.id }));
      expect(res.status, `permintaan ke-${i + 1}`).not.toBe(429);
    }
    const blocked = await regeneratePost(post("/api/payments/qris/regenerate", { orderId: order.id }));
    expect(blocked.status).toBe(429);

    const checkoutStillOpen = await checkoutPost(post("/api/payments/checkout", { orderId: order.id }));
    expect(checkoutStillOpen.status).not.toBe(429);
  });

  it("pengguna lain tidak ikut terblokir", async () => {
    const { order } = await makeUserWithOrder("other");
    const res = await checkoutPost(post("/api/payments/checkout", { orderId: order.id }));
    expect(res.status).not.toBe(429);
  });
});
