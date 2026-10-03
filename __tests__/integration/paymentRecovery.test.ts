/**
 * Pemulihan pembayaran (DB luxenary_test): pemenuhan layanan idempoten dan dapat diulang, pembayaran yang
 * masuk untuk order EXPIRED tidak hilang diam-diam, dan cron menyapu order PAID yang belum terpenuhi.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";

vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/paymentEvents", () => ({ paymentEmitter: { emit: vi.fn() } }));

const lifecycleFailure = vi.hoisted(() => ({ failNext: false }));
vi.mock("@/lib/lifecycleSettings", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/lifecycleSettings")>();
  return {
    ...original,
    getLifecycleSettings: async () => {
      if (lifecycleFailure.failNext) {
        lifecycleFailure.failNext = false;
        throw new Error("db down");
      }
      return original.getLifecycleSettings();
    },
  };
});

import { prisma, pool } from "@/lib/prisma";
import { POST as midtransWebhook } from "@/app/api/webhook/midtrans/route";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { runStaleDataCleanup } from "@/lib/lifecycleCleanup";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const SERVER_KEY = "SB-Mid-server-vitestrecoverykey";
const RUN = `vitest_recov_${Date.now()}`;
const RUN_STARTED_AT = new Date();
const ids = { users: [] as string[], orders: [] as string[], invitations: [] as string[] };

async function makeUser(tag: string) {
  const u = await prisma.user.create({ data: { email: `${RUN}_${tag}@test.local`, name: tag } });
  ids.users.push(u.id);
  return u;
}

async function makeOrder(userId: string, over: Record<string, any> = {}) {
  const o = await prisma.order.create({
    data: { userId, invoiceNumber: `${RUN}-${crypto.randomUUID().slice(0, 8)}`, planType: "TIER_2", amount: 100000, ...over },
  });
  ids.orders.push(o.id);
  return o;
}

async function makeInvitation(userId: string, orderId: string | null, tag: string) {
  const inv = await prisma.invitation.create({
    data: { userId, orderId, themeId: "kalandra", invitationSlug: `${RUN}-${tag}`, groomSlug: `${RUN}-g-${tag}`, brideSlug: `${RUN}-b-${tag}`, featureSettings: JSON.stringify({}) },
  });
  ids.invitations.push(inv.id);
  return inv;
}

const quotaOf = async (invitationId: string) =>
  JSON.parse((await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } })).featureSettings || "{}").extraMemoriesQuota ?? 0;

function paidWebhook(orderId: string, amount = "100000.00", options: { gatewayOrderId?: string; signedOrderId?: string } = {}) {
  const statusCode = "200";
  const gatewayOrderId = options.gatewayOrderId ?? orderId;
  const signature = crypto
    .createHash("sha512")
    .update(`${options.signedOrderId ?? gatewayOrderId}${statusCode}${amount}${SERVER_KEY}`)
    .digest("hex");
  return new NextRequest("http://localhost:3000/api/webhook/midtrans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: gatewayOrderId,
      status_code: statusCode,
      gross_amount: amount,
      transaction_status: "settlement",
      transaction_id: crypto.randomUUID(),
      signature_key: signature,
    }),
  });
}

describe.skipIf(!IS_TEST_DB)("pemulihan pembayaran", () => {
  beforeAll(async () => {
    await prisma.adminSetting.upsert({
      where: { key: "midtrans_server_key" },
      update: { value: SERVER_KEY },
      create: { key: "midtrans_server_key", value: SERVER_KEY, group: "payment" },
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.adminSetting.deleteMany({ where: { key: "midtrans_server_key" } });
    await prisma.webhookLog.deleteMany({ where: { source: "midtrans", createdAt: { gte: RUN_STARTED_AT } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("applyUpgradePlan idempoten: dua pemanggilan menambah kuota top-up sekali", async () => {
    const u = await makeUser("idem");
    const inv = await makeInvitation(u.id, null, "idem");
    const topup = await makeOrder(u.id, { orderType: "MEMORIES_TOPUP", status: "PAID", paidAt: new Date(), linkedInvitationId: inv.id });

    await applyUpgradePlan(topup.id);
    await applyUpgradePlan(topup.id);

    expect(await quotaOf(inv.id)).toBe(100);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: topup.id } })).fulfilledAt).not.toBeNull();
  });

  it("pemenuhan yang gagal melepas klaim, lalu berhasil pada percobaan berikutnya tanpa ganda", async () => {
    const u = await makeUser("retry");
    const inv = await makeInvitation(u.id, null, "retry");
    await prisma.invitation.update({
      where: { id: inv.id },
      data: { eventData: JSON.stringify([{ title: "Akad", date: "2099-01-01", time: "09:00", isPrimary: true }]) },
    });
    const extension = await makeOrder(u.id, { orderType: "GALLERY_EXTENSION", status: "PAID", paidAt: new Date(), linkedInvitationId: inv.id });
    const expiryOf = async () => (await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } })).galleryExpiresAt;

    lifecycleFailure.failNext = true;
    await expect(applyUpgradePlan(extension.id)).rejects.toThrow("db down");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: extension.id } })).fulfilledAt).toBeNull();
    expect(await expiryOf()).toBeNull();

    await applyUpgradePlan(extension.id);
    expect(await expiryOf()).not.toBeNull();
    expect((await prisma.order.findUniqueOrThrow({ where: { id: extension.id } })).fulfilledAt).not.toBeNull();
  });

  it("webhook untuk order PAID yang belum terpenuhi menjalankan pemenuhan sekali", async () => {
    const u = await makeUser("replay");
    const inv = await makeInvitation(u.id, null, "replay");
    const topup = await makeOrder(u.id, { orderType: "MEMORIES_TOPUP", status: "PAID", paidAt: new Date(), linkedInvitationId: inv.id, chargedAmount: 100000 });

    expect((await midtransWebhook(paidWebhook(topup.id))).status).toBe(200);
    expect((await midtransWebhook(paidWebhook(topup.id))).status).toBe(200);
    expect(await quotaOf(inv.id)).toBe(100);
  });

  it("pembayaran valid untuk order EXPIRED dilunasi bila pengguna belum punya paket PAID", async () => {
    const u = await makeUser("late");
    const order = await makeOrder(u.id, { status: "EXPIRED", chargedAmount: 100000 });

    const res = await midtransWebhook(paidWebhook(order.id));
    expect(res.status).toBe(200);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("PAID");
    expect(after.paidAt).not.toBeNull();
  });

  it("pembayaran untuk order EXPIRED tidak dilunasi otomatis bila pengguna sudah punya paket PAID, dan dicatat", async () => {
    const u = await makeUser("dup");
    await makeOrder(u.id, { status: "PAID", paidAt: new Date(), fulfilledAt: new Date() });
    const stale = await makeOrder(u.id, { status: "EXPIRED", chargedAmount: 100000 });

    const res = await midtransWebhook(paidWebhook(stale.id));
    expect(res.status).toBe(200);
    expect((await res.json()).reason).toBe("order_closed");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: stale.id } })).status).toBe("EXPIRED");
    const log = await prisma.webhookLog.findFirst({ where: { source: "midtrans", status: "paid_on_closed_order", createdAt: { gte: RUN_STARTED_AT } } });
    expect(log).not.toBeNull();
  });

  it("webhook dengan order_id sesi terbit ulang (<uuid>~sufiks) melunasi order, tanda tangan dihitung atas ID mentah", async () => {
    const u = await makeUser("suffix");
    const order = await makeOrder(u.id, { chargedAmount: 100000 });
    const gatewayOrderId = `${order.id}~lx9k2a`;

    const res = await midtransWebhook(paidWebhook(order.id, "100000.00", { gatewayOrderId }));
    expect(res.status).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
  });

  it("webhook bersufiks dengan tanda tangan atas UUID polos ditolak", async () => {
    const u = await makeUser("suffixbad");
    const order = await makeOrder(u.id, { chargedAmount: 100000 });

    const res = await midtransWebhook(paidWebhook(order.id, "100000.00", { gatewayOrderId: `${order.id}~lx9k2a`, signedOrderId: order.id }));
    expect((await res.json()).reason).toBe("invalid_signature");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
  });

  it("sufiks dengan karakter tidak sah ditolak sebelum menyentuh order", async () => {
    const u = await makeUser("suffixchar");
    const order = await makeOrder(u.id, { chargedAmount: 100000 });
    const res = await midtransWebhook(paidWebhook(order.id, "100000.00", { gatewayOrderId: `${order.id}~a b/c` }));
    expect((await res.json()).reason).toBe("invalid_order_id_format");
  });

  it("MidtransGateway.init mengirim order_id unik hanya pada penerbitan ulang", async () => {
    const { MidtransGateway } = await import("@/lib/gateways/midtrans");
    const u = await makeUser("init");
    const order = await makeOrder(u.id);
    const sent: string[] = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      sent.push(JSON.parse(String((init as RequestInit).body)).transaction_details.order_id);
      return new Response(JSON.stringify({ qr_string: "000201", transaction_id: crypto.randomUUID() }), { status: 200 });
    });
    try {
      await new MidtransGateway().init(order.id, 100000);
      await new MidtransGateway().init(order.id, 100000, undefined, "lx9k2a");
    } finally {
      fetchSpy.mockRestore();
    }
    expect(sent).toEqual([order.id, `${order.id}~lx9k2a`]);
  });

  it("sapuan cron memenuhi order PAID yang macet dan menghapus baris limiter kedaluwarsa", async () => {
    const u = await makeUser("sweep");
    const inv = await makeInvitation(u.id, null, "sweep");
    const stuck = await makeOrder(u.id, {
      orderType: "MEMORIES_TOPUP",
      status: "PAID",
      paidAt: new Date(Date.now() - 3600_000),
      linkedInvitationId: inv.id,
    });
    await pool.query("INSERT INTO rate_limit_counters (key, count, expires_at) VALUES ($1, 1, now() - interval '1 hour')", [`${RUN}:expired`]);

    const result = await runStaleDataCleanup();
    expect(result.refulfilledOrders).toBeGreaterThanOrEqual(1);
    expect(result.purgedRateLimitRows).toBeGreaterThanOrEqual(1);
    expect(await quotaOf(inv.id)).toBe(100);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: stuck.id } })).fulfilledAt).not.toBeNull();
    const left = await pool.query("SELECT 1 FROM rate_limit_counters WHERE key = $1", [`${RUN}:expired`]);
    expect(left.rowCount).toBe(0);
  });
});
