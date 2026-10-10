/**
 * Sesi gateway (QRIS / URL checkout) terpisah dari batas hidup order: QR yang habis diterbitkan ulang selama order
 * belum kedaluwarsa. Sebelumnya kedaluwarsa QR ditulis ke Order.expiredAt sehingga order ikut mati bersama QR dan
 * /api/payments/qris/regenerate selalu menjawab 410. (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

const QR_MINUTES = 15;
const gw = vi.hoisted(() => ({
  issued: 0,
  init: vi.fn(),
  cancel: vi.fn(async () => ({ success: true })),
  verify: vi.fn(async () => ({ status: "PENDING" })),
}));
gw.init.mockImplementation(async () => {
  gw.issued++;
  return { qrString: `qr-${gw.issued}`, sessionId: `tx-${gw.issued}`, gatewayTxId: `tx-${gw.issued}`, expiryTimestamp: Date.now() + QR_MINUTES * 60_000 };
});
vi.mock("@/lib/gatewayRegistry", () => ({
  getGatewayById: vi.fn(async () => gw),
  getActiveGateway: vi.fn(async () => gw),
  getActiveGatewayId: vi.fn(async () => "midtrans"),
}));
vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn(async () => undefined) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as checkoutPost } from "@/app/api/payments/checkout/route";
import { POST as regeneratePost } from "@/app/api/payments/qris/regenerate/route";
import { GET as statusGet } from "@/app/api/client/orders/[id]/status/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_gwsession_${Date.now()}`;
const users: string[] = [];
const HOUR = 3_600_000;

const post = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json", host: "localhost" }, body: JSON.stringify(body) });
const checkout = (orderId: string) => checkoutPost(post("/api/payments/checkout", { orderId }));
const regenerate = (orderId: string) => regeneratePost(post("/api/payments/qris/regenerate", { orderId }));
const status = async (id: string) => (await statusGet(new NextRequest(`http://localhost/api/client/orders/${id}/status`), { params: Promise.resolve({ id }) })).json();

async function makeOrder() {
  const user = await prisma.user.create({ data: { email: `${TAG}_${users.length}@t.local`, name: "Klien" } });
  users.push(user.id);
  sessionUser = { id: user.id, email: user.email, role: "CLIENT" };
  return prisma.order.create({
    data: {
      userId: user.id, invoiceNumber: `${TAG}-${users.length}`, planType: "TIER_1", amount: 99000, status: "PENDING",
      orderType: "NEW", paymentMethod: "GATEWAY", checkoutConfirmedAt: new Date(), expiredAt: new Date(Date.now() + 24 * HOUR),
    },
  });
}

describe.skipIf(!IS_TEST_DB)("sesi gateway terpisah dari batas hidup order", () => {
  let originalMode: string | null = null;

  beforeAll(async () => {
    originalMode = (await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } }))?.value ?? null;
    await prisma.adminSetting.upsert({ where: { key: "payment_mode" }, create: { key: "payment_mode", value: "GATEWAY" }, update: { value: "GATEWAY" } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    sessionUser = null;
    if (originalMode !== null) await prisma.adminSetting.update({ where: { key: "payment_mode" }, data: { value: originalMode } });
    await prisma.promoHold.deleteMany({ where: { order: { userId: { in: users } } } });
    await prisma.order.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("checkout menyimpan sesi QR di kolomnya sendiri tanpa memendekkan batas hidup order", async () => {
    const order = await makeOrder();
    const res = await checkout(order.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    expect(after.gatewayQrString).toBe(body.qrString);
    expect(after.gatewayCheckoutUrl).toBeNull();
    expect(after.gatewaySessionExpiresAt!.getTime()).toBe(body.expiryTimestamp);
    expect(after.gatewayTxId).toBe(body.sessionId);
    expect(after.expiredAt!.getTime()).toBe(order.expiredAt!.getTime());

    // Membuka ulang halaman pembayaran selama QR masih berlaku memakai sesi yang sama, tanpa panggilan gateway baru.
    const issuedBefore = gw.issued;
    const again = await (await checkout(order.id)).json();
    expect(again.qrString).toBe(body.qrString);
    expect(gw.issued).toBe(issuedBefore);
  });

  it("QR habis: order tetap PENDING, halaman pembayaran ditandai sesi habis, dan QR baru dapat diterbitkan", async () => {
    const order = await makeOrder();
    const first = await (await checkout(order.id)).json();

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + (QR_MINUTES + 5) * 60_000);

    const view = await status(order.id);
    expect(view.status).toBe("PENDING");
    expect(view.isQrisSessionExpired).toBe(true);
    expect(view.gatewayQrString).toBe(first.qrString);

    const res = await regenerate(order.id);
    expect(res.status).toBe(200);
    const renewed = await res.json();
    expect(renewed.qrString).not.toBe(first.qrString);

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("PENDING");
    expect(after.gatewayQrString).toBe(renewed.qrString);
    expect(after.expiredAt!.getTime()).toBe(order.expiredAt!.getTime());
    expect((await status(order.id)).isQrisSessionExpired).toBe(false);
  });

  it("sesi tidak pernah melewati batas hidup order, dan order yang batasnya lewat ditolak", async () => {
    const order = await makeOrder();
    await prisma.order.update({ where: { id: order.id }, data: { expiredAt: new Date(Date.now() + 5 * 60_000) } });
    await checkout(order.id);
    const capped = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(capped.gatewaySessionExpiresAt!.getTime()).toBe(capped.expiredAt!.getTime());

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 10 * 60_000);
    expect((await regenerate(order.id)).status).toBe(410);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("EXPIRED");
  });
});
