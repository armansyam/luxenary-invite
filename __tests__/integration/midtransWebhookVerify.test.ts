/**
 * Webhook Midtrans mengonfirmasi status ke API Midtrans sebelum melunasi order: signature dari kunci yang valid
 * saja tidak cukup. API menjawab bukan PAID atau tidak terjangkau -> order tetap PENDING dan webhook dijawab 503
 * agar Midtrans mengirim ulang. (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";

vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/paymentEvents", () => ({ paymentEmitter: { emit: vi.fn() } }));

import { prisma, pool } from "@/lib/prisma";
import { POST as midtransWebhook } from "@/app/api/webhook/midtrans/route";
import { MidtransGateway } from "@/lib/gateways/midtrans";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const SERVER_KEY = "SB-Mid-server-vitestverifykey";
const RUN = `vitest_wverify_${Date.now()}`;
const RUN_STARTED_AT = new Date();
const ids = { users: [] as string[], orders: [] as string[] };

async function makePendingOrder(tag: string) {
  const user = await prisma.user.create({ data: { email: `${RUN}_${tag}@test.local`, name: tag } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${RUN}-${tag}`, planType: "TIER_2", amount: 100000, chargedAmount: 100000, status: "PENDING" },
  });
  ids.orders.push(order.id);
  return order;
}

function settlementWebhook(orderId: string) {
  const statusCode = "200";
  const amount = "100000.00";
  const signature = crypto.createHash("sha512").update(`${orderId}${statusCode}${amount}${SERVER_KEY}`).digest("hex");
  return new NextRequest("http://localhost:3000/api/webhook/midtrans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: orderId,
      status_code: statusCode,
      gross_amount: amount,
      transaction_status: "settlement",
      transaction_id: crypto.randomUUID(),
      signature_key: signature,
    }),
  });
}

const statusOf = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

describe.skipIf(!IS_TEST_DB)("webhook Midtrans: konfirmasi status ke API sebelum pelunasan", () => {
  const verify = vi.spyOn(MidtransGateway.prototype, "verify");

  beforeAll(async () => {
    await prisma.adminSetting.upsert({
      where: { key: "midtrans_sandbox_server_key" },
      update: { value: SERVER_KEY },
      create: { key: "midtrans_sandbox_server_key", value: SERVER_KEY, group: "payment" },
    });
  });

  afterEach(() => {
    verify.mockReset();
  });

  afterAll(async () => {
    verify.mockRestore();
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.adminSetting.deleteMany({ where: { key: "midtrans_sandbox_server_key" } });
    await prisma.webhookLog.deleteMany({ where: { source: "midtrans", createdAt: { gte: RUN_STARTED_AT } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("API mengonfirmasi PAID: order dilunasi", async () => {
    verify.mockResolvedValue({ status: "PAID" });
    const order = await makePendingOrder("paid");

    expect((await midtransWebhook(settlementWebhook(order.id))).status).toBe(200);
    expect(verify).toHaveBeenCalledWith(order.id);
    expect(await statusOf(order.id)).toBe("PAID");
  });

  it("signature valid tetapi API menjawab PENDING: tidak dilunasi dan dijawab 503", async () => {
    verify.mockResolvedValue({ status: "PENDING" });
    const order = await makePendingOrder("pending");

    const res = await midtransWebhook(settlementWebhook(order.id));
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("status_unconfirmed");
    expect(await statusOf(order.id)).toBe("PENDING");
  });

  it("API menjawab FAILED: tidak dilunasi", async () => {
    verify.mockResolvedValue({ status: "FAILED" });
    const order = await makePendingOrder("failed");

    expect((await midtransWebhook(settlementWebhook(order.id))).status).toBe(503);
    expect(await statusOf(order.id)).toBe("PENDING");
  });

  it("API tidak terjangkau: tidak dilunasi, 503 agar Midtrans mengirim ulang, lalu berhasil saat API pulih", async () => {
    verify.mockRejectedValueOnce(new Error("network down"));
    const order = await makePendingOrder("down");

    const res = await midtransWebhook(settlementWebhook(order.id));
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("gateway_status_unavailable");
    expect(await statusOf(order.id)).toBe("PENDING");

    verify.mockResolvedValue({ status: "PAID" });
    expect((await midtransWebhook(settlementWebhook(order.id))).status).toBe(200);
    expect(await statusOf(order.id)).toBe("PAID");
  });
});
