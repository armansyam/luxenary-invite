/**
 * Status `webhook_logs` setelah notifikasi Midtrans ditangani: pending, cancel, dan duplikat untuk order yang sudah
 * PAID ditandai `processed`; `received` hanya tersisa bila penanganan berhenti di tengah (order tidak ditemukan).
 * (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";

vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/paymentEvents", () => ({ paymentEmitter: { emit: vi.fn() } }));

import { prisma, pool } from "@/lib/prisma";
import { POST as midtransWebhook } from "@/app/api/webhook/midtrans/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const SERVER_KEY = "SB-Mid-server-vitestlogstatuskey";
const RUN = `vitest_wlog_${Date.now()}`;
const RUN_STARTED_AT = new Date();
const ids = { users: [] as string[], orders: [] as string[] };

// gatewayTxId seperti yang disimpan saat charge dibuat; notifikasi dengan transaction_id lain dianggap sesi lama.
async function makeOrder(tag: string, status: "PENDING" | "PAID") {
  const user = await prisma.user.create({ data: { email: `${RUN}_${tag}@test.local`, name: tag } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: {
      userId: user.id, invoiceNumber: `${RUN}-${tag}`, planType: "TIER_2", amount: 100000, chargedAmount: 100000, status,
      gatewayTxId: crypto.randomUUID(),
      ...(status === "PAID" && { paidAt: new Date(), fulfilledAt: new Date() }),
    },
  });
  ids.orders.push(order.id);
  return order;
}

function notification(orderId: string, transactionStatus: string, statusCode: string, transactionId: string | null = crypto.randomUUID()) {
  const amount = "100000.00";
  const signature = crypto.createHash("sha512").update(`${orderId}${statusCode}${amount}${SERVER_KEY}`).digest("hex");
  return new NextRequest("http://localhost:3000/api/webhook/midtrans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: orderId,
      status_code: statusCode,
      gross_amount: amount,
      transaction_status: transactionStatus,
      transaction_id: transactionId,
      signature_key: signature,
    }),
  });
}

const logOf = (orderId: string) =>
  prisma.webhookLog.findFirstOrThrow({ where: { source: "midtrans", payload: { path: ["order_id"], equals: orderId } }, orderBy: { createdAt: "desc" } });
const statusOf = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

describe.skipIf(!IS_TEST_DB)("webhook Midtrans: status webhook_logs", () => {
  beforeAll(async () => {
    await prisma.adminSetting.upsert({
      where: { key: "midtrans_sandbox_server_key" },
      update: { value: SERVER_KEY },
      create: { key: "midtrans_sandbox_server_key", value: SERVER_KEY, group: "payment" },
    });
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.adminSetting.deleteMany({ where: { key: "midtrans_sandbox_server_key" } });
    await prisma.webhookLog.deleteMany({ where: { source: "midtrans", createdAt: { gte: RUN_STARTED_AT } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("pending: order tetap PENDING dan log processed", async () => {
    const order = await makeOrder("pending", "PENDING");
    expect((await midtransWebhook(notification(order.id, "pending", "201", order.gatewayTxId))).status).toBe(200);
    expect(await statusOf(order.id)).toBe("PENDING");
    const log = await logOf(order.id);
    expect(log.status).toBe("processed");
    expect(log.processedAt).not.toBeNull();
  });

  it("cancel: order EXPIRED dan log processed", async () => {
    const order = await makeOrder("cancel", "PENDING");
    expect((await midtransWebhook(notification(order.id, "cancel", "202", order.gatewayTxId))).status).toBe(200);
    expect(await statusOf(order.id)).toBe("EXPIRED");
    expect((await logOf(order.id)).status).toBe("processed");
  });

  it("cancel dari sesi gateway lama: order tetap PENDING dan log stale_session (tidak ditimpa processed)", async () => {
    const order = await makeOrder("stale", "PENDING");
    expect((await midtransWebhook(notification(order.id, "cancel", "202"))).status).toBe(200);
    expect(await statusOf(order.id)).toBe("PENDING");
    expect((await logOf(order.id)).status).toBe("stale_session");
  });

  it("settlement ulang untuk order yang sudah PAID: log processed", async () => {
    const order = await makeOrder("dup", "PAID");
    const res = await midtransWebhook(notification(order.id, "settlement", "200"));
    expect(res.status).toBe(200);
    expect((await res.json()).note).toBe("already_paid");
    expect((await logOf(order.id)).status).toBe("processed");
  });

  it("order tidak ditemukan: 404 dan log tetap received", async () => {
    const missing = crypto.randomUUID();
    expect((await midtransWebhook(notification(missing, "pending", "201"))).status).toBe(404);
    const log = await logOf(missing);
    expect(log.status).toBe("received");
    expect(log.processedAt).toBeNull();
  });
});
