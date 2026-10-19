/**
 * Skenario logika pembayaran gateway lewat handler rute sungguhan (DB luxenary_test) dengan gateway tiruan:
 * refresh, pindah perangkat, klik ganda, webhook ganda, dan pembayaran ganda lintas order.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";

vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/paymentEvents", () => ({ paymentEmitter: { emit: vi.fn() } }));

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string; role: string } },
  active: new Map<string, string>(),
  inits: 0,
  strictUnique: true,
  cancelFails: false,
  initDelayMs: 0,
}));

vi.mock("@/auth", () => ({ auth: async () => state.session }));

// Meniru Midtrans: order_id yang transaksinya masih aktif ditolak, pembatalan membebaskannya kembali.
vi.mock("@/lib/gatewayRegistry", () => {
  const fake = {
    async init(orderId: string) {
      state.inits++;
      if (state.initDelayMs) await new Promise((r) => setTimeout(r, state.initDelayMs));
      if (state.strictUnique && state.active.has(orderId)) throw new Error("Midtrans: The requested order_id has already been taken");
      const tx = `tx-${crypto.randomUUID()}`;
      state.active.set(orderId, tx);
      return { qrString: `QR-${tx}`, sessionId: tx, gatewayTxId: tx, expiryTimestamp: Date.now() + 15 * 60_000 };
    },
    async cancel(txId: string) {
      if (state.cancelFails) return { success: false, error: "timeout" };
      for (const [orderId, tx] of state.active) if (tx === txId) state.active.delete(orderId);
      return { success: true };
    },
    async verify() { return { status: "PENDING" as const }; },
  };
  return {
    getActiveGateway: async () => fake,
    getActiveGatewayId: async () => "midtrans",
    getGatewayById: async () => fake,
  };
});

import { prisma, pool } from "@/lib/prisma";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as regenerateQris } from "@/app/api/payments/qris/regenerate/route";
import { POST as createOrder } from "@/app/api/orders/create/route";
import { POST as midtransWebhook } from "@/app/api/webhook/midtrans/route";
import { MidtransGateway } from "@/lib/gateways/midtrans";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const SERVER_KEY = "SB-Mid-server-scenariokey";
const RUN = `vitest_pay_${Date.now()}`;
const RUN_STARTED_AT = new Date();
const ids = { users: [] as string[] };
const savedSettings = new Map<string, string | null>();
const SETTINGS: Record<string, { value: string; group: string }> = {
  price_tier2: { value: "100000", group: "pricing" },
  midtrans_sandbox_server_key: { value: SERVER_KEY, group: "payment" },
  payment_mode: { value: "GATEWAY", group: "payment" },
};

async function makeUser(tag: string) {
  const u = await prisma.user.create({ data: { email: `${RUN}_${tag}@test.local`, name: tag } });
  ids.users.push(u.id);
  return u;
}
const as = (u: { id: string; email: string | null }) => { state.session = { user: { id: u.id, email: u.email!, role: "CLIENT" } }; };
const jsonReq = (url: string, body: unknown) =>
  new NextRequest(`http://localhost:3000${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function newOrder(planType = "TIER_2") {
  const res = await createOrder(jsonReq("/api/orders/create", { planType }));
  expect(res.status).toBe(200);
  return (await res.json()) as { orderId: string };
}

function webhook(orderId: string, amount: number, over: Record<string, unknown> = {}, key = SERVER_KEY) {
  const gross = `${amount}.00`;
  const statusCode = String(over.status_code ?? "200");
  const signature = crypto.createHash("sha512").update(`${orderId}${statusCode}${gross}${key}`).digest("hex");
  return new NextRequest("http://localhost:3000/api/webhook/midtrans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, status_code: statusCode, gross_amount: gross, transaction_status: "settlement", transaction_id: crypto.randomUUID(), signature_key: signature, ...over }),
  });
}
const orderOf = (id: string) => prisma.order.findUniqueOrThrow({ where: { id } });
const paidNewCount = (userId: string) => prisma.order.count({ where: { userId, orderType: "NEW", status: "PAID" } });

describe.skipIf(!IS_TEST_DB)("skenario pembayaran gateway", () => {
  beforeAll(async () => {
    vi.spyOn(MidtransGateway.prototype, "verify").mockResolvedValue({ status: "PAID" });
    for (const [key, { value, group }] of Object.entries(SETTINGS)) {
      savedSettings.set(key, (await prisma.adminSetting.findUnique({ where: { key } }))?.value ?? null);
      await prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value, group } });
    }
  });

  beforeEach(() => {
    state.active.clear(); state.inits = 0;
    state.strictUnique = true; state.cancelFails = false; state.initDelayMs = 0;
  });

  afterAll(async () => {
    await prisma.promoHold.deleteMany({ where: { order: { userId: { in: ids.users } } } });
    await prisma.order.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    for (const [key, previous] of savedSettings) {
      if (previous === null) await prisma.adminSetting.deleteMany({ where: { key } });
      else await prisma.adminSetting.update({ where: { key }, data: { value: previous } });
    }
    await prisma.webhookLog.deleteMany({ where: { source: "midtrans", createdAt: { gte: RUN_STARTED_AT } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("refresh: checkout dua kali memakai sesi yang sama, gateway dipanggil sekali", async () => {
    const u = await makeUser("refresh"); as(u);
    const { orderId } = await newOrder();
    const a = await (await checkout(jsonReq("/api/payments/checkout", { orderId }))).json();
    const b = await (await checkout(jsonReq("/api/payments/checkout", { orderId }))).json();
    expect(state.inits).toBe(1);
    expect(b.qrString).toBe(a.qrString);
  });

  it("pindah perangkat: sesi lain milik pengguna yang sama menerima QR yang sama; pengguna lain ditolak 403", async () => {
    const u = await makeUser("device"); const other = await makeUser("deviceother"); as(u);
    const { orderId } = await newOrder();
    const a = await (await checkout(jsonReq("/api/payments/checkout", { orderId }))).json();
    as(u);
    const deviceB = await (await checkout(jsonReq("/api/payments/checkout", { orderId }))).json();
    expect(deviceB.qrString).toBe(a.qrString);
    expect(state.inits).toBe(1);
    as(other);
    expect((await checkout(jsonReq("/api/payments/checkout", { orderId }))).status).toBe(403);
  });

  it("klik ganda bersamaan (gateway menolak order_id ganda): keduanya 200 dengan QR yang sama", async () => {
    const u = await makeUser("dblclick"); as(u);
    const { orderId } = await newOrder();
    state.initDelayMs = 40;
    const [r1, r2] = await Promise.all([
      checkout(jsonReq("/api/payments/checkout", { orderId })),
      checkout(jsonReq("/api/payments/checkout", { orderId })),
    ]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    const [b1, b2] = [await r1.json(), await r2.json()];
    const stored = await orderOf(orderId);
    expect(b1.qrString).toBe(stored.gatewayQrString);
    expect(b2.qrString).toBe(stored.gatewayQrString);
  });

  it("galat gateway yang asli tetap dilempar (bukan disamarkan sebagai sesi bersama)", async () => {
    const u = await makeUser("realerror"); as(u);
    const { orderId } = await newOrder();
    // Order_id sudah terpakai di gateway tanpa ada sesi tersimpan di DB: tidak ada sesi bersama yang bisa dipakai.
    state.active.set(orderId, "tx-orphan");
    const res = await checkout(jsonReq("/api/payments/checkout", { orderId }));
    expect(res.status).toBe(500);
    expect((await orderOf(orderId)).gatewayQrString).toBeNull();
  });

  it("penerbitan ulang QR bersamaan (sesi kedaluwarsa): keduanya 200 dengan QR baru yang sama", async () => {
    const u = await makeUser("regen"); as(u);
    const { orderId } = await newOrder();
    const first = await (await checkout(jsonReq("/api/payments/checkout", { orderId }))).json();
    await prisma.order.update({ where: { id: orderId }, data: { gatewaySessionExpiresAt: new Date(Date.now() - 1000) } });
    state.initDelayMs = 40;
    const [r1, r2] = await Promise.all([
      regenerateQris(jsonReq("/api/payments/qris/regenerate", { orderId })),
      regenerateQris(jsonReq("/api/payments/qris/regenerate", { orderId })),
    ]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    const [b1, b2] = [await r1.json(), await r2.json()];
    expect(b1.qrString).toBe(b2.qrString);
    expect(b1.qrString).not.toBe(first.qrString);
  });

  it("webhook settlement ganda dan bersamaan: pelunasan sekali", async () => {
    const u = await makeUser("replay"); as(u);
    const { orderId } = await newOrder();
    await checkout(jsonReq("/api/payments/checkout", { orderId }));
    const charged = Number((await orderOf(orderId)).chargedAmount);
    const rs = await Promise.all([midtransWebhook(webhook(orderId, charged)), midtransWebhook(webhook(orderId, charged)), midtransWebhook(webhook(orderId, charged))]);
    expect(rs.map((r) => r.status)).toEqual([200, 200, 200]);
    expect((await orderOf(orderId)).status).toBe("PAID");
    expect(await paidNewCount(u.id)).toBe(1);
  });

  it("webhook palsu: nominal salah, tanda tangan salah, tanpa tanda tangan tidak melunasi", async () => {
    const u = await makeUser("forged"); as(u);
    const { orderId } = await newOrder();
    await checkout(jsonReq("/api/payments/checkout", { orderId }));
    const charged = Number((await orderOf(orderId)).chargedAmount);
    await midtransWebhook(webhook(orderId, 1000));
    await midtransWebhook(webhook(orderId, charged, {}, "kunci-salah"));
    expect((await midtransWebhook(webhook(orderId, charged, { signature_key: undefined }))).status).toBe(400);
    expect((await orderOf(orderId)).status).toBe("PENDING");
  });

  it("pembayaran terlambat pada order EXPIRED tetap dilunasi", async () => {
    const u = await makeUser("late"); as(u);
    const { orderId } = await newOrder();
    await checkout(jsonReq("/api/payments/checkout", { orderId }));
    const charged = Number((await orderOf(orderId)).chargedAmount);
    await prisma.order.update({ where: { id: orderId }, data: { status: "EXPIRED" } });
    await midtransWebhook(webhook(orderId, charged));
    expect((await orderOf(orderId)).status).toBe("PAID");
  });

  // Order lama EXPIRED (pembatalan di gateway gagal, QR lama masih bisa dibayar) + order baru PENDING dengan QR sendiri.
  async function twoLiveQrs(tag: string) {
    const u = await makeUser(tag); as(u);
    const { orderId: order1 } = await newOrder();
    await checkout(jsonReq("/api/payments/checkout", { orderId: order1 }));
    const charged1 = Number((await orderOf(order1)).chargedAmount);
    state.cancelFails = true;
    const { orderId: order2 } = await (await createOrder(jsonReq("/api/orders/create", { planType: "TIER_2", regenerate: true }))).json();
    state.cancelFails = false;
    await checkout(jsonReq("/api/payments/checkout", { orderId: order2 }));
    const charged2 = Number((await orderOf(order2)).chargedAmount);
    expect((await orderOf(order1)).status).toBe("EXPIRED");
    expect((await orderOf(order2)).status).toBe("PENDING");
    return { u, order1, order2, charged1, charged2 };
  }

  it("dua QR hidup dibayar berurutan: satu order NEW lunas, pembayaran kedua dicatat untuk pengembalian dana", async () => {
    const { u, order1, order2, charged1, charged2 } = await twoLiveQrs("seq");
    await midtransWebhook(webhook(order1, charged1));
    const second = await midtransWebhook(webhook(order2, charged2));
    expect(second.status).toBe(200);
    expect((await orderOf(order2)).status).not.toBe("PAID");
    expect(await paidNewCount(u.id)).toBe(1);
    const log = await prisma.webhookLog.findFirst({
      where: { source: "midtrans", status: "paid_on_closed_order", createdAt: { gte: RUN_STARTED_AT }, payload: { path: ["order_id"], equals: order2 } },
    });
    expect(log).not.toBeNull();
  });

  it("dua QR hidup dibayar BERSAMAAN: hanya satu order NEW lunas", async () => {
    const { u, order1, order2, charged1, charged2 } = await twoLiveQrs("par");
    const [r1, r2] = await Promise.all([midtransWebhook(webhook(order1, charged1)), midtransWebhook(webhook(order2, charged2))]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(await paidNewCount(u.id)).toBe(1);
    const statuses = [(await orderOf(order1)).status, (await orderOf(order2)).status];
    expect(statuses.filter((s) => s === "PAID")).toHaveLength(1);
  });
});
