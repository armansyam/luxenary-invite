/**
 * Midtrans memisahkan Signature Secret Key (penanda tangan notifikasi) dari Server Key (panggilan API). Setelah
 * merchant membuat Server Key baru, notifikasi tetap ditandatangani Signature Secret Key; tanpa isian itu Server Key
 * dipakai karena nilainya sama. (hanya berjalan di database `luxenary_test`)
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
const NEW_SERVER_KEY = "SB-Mid-server-vitestrotatedkey";
const SIGNATURE_SECRET_KEY = "vitest-signature-secret-key";
const RUN = `vitest_wsig_${Date.now()}`;
const RUN_STARTED_AT = new Date();
const KEYS = ["midtrans_sandbox_server_key", "midtrans_sandbox_signature_key"];
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

function settlementSignedWith(orderId: string, key: string) {
  const signature = crypto.createHash("sha512").update(`${orderId}200100000.00${key}`).digest("hex");
  return new NextRequest("http://localhost:3000/api/webhook/midtrans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: orderId,
      status_code: "200",
      gross_amount: "100000.00",
      transaction_status: "settlement",
      transaction_id: crypto.randomUUID(),
      signature_key: signature,
    }),
  });
}

const setKey = (key: string, value: string) =>
  prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value, group: "midtrans" } });
const statusOf = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

describe.skipIf(!IS_TEST_DB)("webhook Midtrans: Signature Secret Key terpisah dari Server Key", () => {
  const verify = vi.spyOn(MidtransGateway.prototype, "verify");
  const savedEnv = { server: process.env.MIDTRANS_SERVER_KEY, signature: process.env.MIDTRANS_SIGNATURE_KEY };

  beforeAll(async () => {
    delete process.env.MIDTRANS_SERVER_KEY;
    delete process.env.MIDTRANS_SIGNATURE_KEY;
    await setKey("midtrans_sandbox_server_key", NEW_SERVER_KEY);
    await setKey("midtrans_sandbox_signature_key", SIGNATURE_SECRET_KEY);
  });

  afterEach(() => verify.mockReset());

  afterAll(async () => {
    verify.mockRestore();
    if (savedEnv.server !== undefined) process.env.MIDTRANS_SERVER_KEY = savedEnv.server;
    if (savedEnv.signature !== undefined) process.env.MIDTRANS_SIGNATURE_KEY = savedEnv.signature;
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.adminSetting.deleteMany({ where: { key: { in: KEYS } } });
    await prisma.webhookLog.deleteMany({ where: { source: "midtrans", createdAt: { gte: RUN_STARTED_AT } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("notifikasi yang ditandatangani Signature Secret Key diterima walau Server Key sudah diganti", async () => {
    verify.mockResolvedValue({ status: "PAID" });
    const order = await makePendingOrder("sig");

    expect((await midtransWebhook(settlementSignedWith(order.id, SIGNATURE_SECRET_KEY))).status).toBe(200);
    expect(await statusOf(order.id)).toBe("PAID");
  });

  it("signature dari Server Key baru ditolak setelah Signature Secret Key diisi", async () => {
    verify.mockResolvedValue({ status: "PAID" });
    const order = await makePendingOrder("rotated");

    const res = await midtransWebhook(settlementSignedWith(order.id, NEW_SERVER_KEY));
    expect(res.status).toBe(200);
    expect((await res.json()).reason).toBe("invalid_signature");
    expect(verify).not.toHaveBeenCalled();
    expect(await statusOf(order.id)).toBe("PENDING");
  });

  it("tanpa Signature Secret Key, Server Key dipakai (nilai keduanya sama sebelum Server Key baru dibuat)", async () => {
    await prisma.adminSetting.update({ where: { key: "midtrans_sandbox_signature_key" }, data: { value: "" } });
    verify.mockResolvedValue({ status: "PAID" });
    const order = await makePendingOrder("legacy");

    expect((await midtransWebhook(settlementSignedWith(order.id, NEW_SERVER_KEY))).status).toBe(200);
    expect(await statusOf(order.id)).toBe("PAID");

    const forged = await makePendingOrder("forged");
    expect((await (await midtransWebhook(settlementSignedWith(forged.id, SIGNATURE_SECRET_KEY))).json()).reason).toBe("invalid_signature");
    expect(await statusOf(forged.id)).toBe("PENDING");
  });

  it("MIDTRANS_SIGNATURE_KEY dari .env dipakai sebagai cadangan", async () => {
    await prisma.adminSetting.updateMany({ where: { key: { in: KEYS } }, data: { value: "" } });
    process.env.MIDTRANS_SIGNATURE_KEY = SIGNATURE_SECRET_KEY;
    verify.mockResolvedValue({ status: "PAID" });
    const order = await makePendingOrder("env");

    expect((await midtransWebhook(settlementSignedWith(order.id, SIGNATURE_SECRET_KEY))).status).toBe(200);
    expect(await statusOf(order.id)).toBe("PAID");
    delete process.env.MIDTRANS_SIGNATURE_KEY;
  });
});
