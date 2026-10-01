/**
 * Alur registrasi: order -> promo -> konfirmasi -> batal / unggah bukti -> pembuatan undangan.
 * Memakai DB nyata (luxenary_test) dan handler route langsung; hanya sesi (`@/auth`) yang di-mock.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { prisma, pool } from "@/lib/prisma";

const session = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (session.user ? { user: session.user } : null)) }));

const gw = vi.hoisted(() => ({ cancel: vi.fn(async (_txId: string): Promise<{ success: boolean; error?: string }> => ({ success: true })) }));
vi.mock("@/lib/gatewayRegistry", () => ({
  getGatewayById: vi.fn(async () => ({ cancel: gw.cancel })),
  getActiveGateway: vi.fn(async () => ({ cancel: gw.cancel })),
  getActiveGatewayId: vi.fn(async () => "midtrans"),
}));

import { POST as createOrder } from "@/app/api/orders/create/route";
import { POST as confirmOrder } from "@/app/api/payments/checkout/confirm/route";
import { POST as validatePromo, DELETE as releasePromo } from "@/app/api/public/promo/validate/route";
import { POST as cancelOrder } from "@/app/api/client/orders/[id]/cancel/route";
import { POST as uploadProof } from "@/app/api/client/orders/[id]/upload-proof/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `reg${Date.now()}`;
const COUPON = `VT${TAG}`.toUpperCase();

const userIds: string[] = [];
const filesToRemove: string[] = [];
let seq = 0;

async function makeUser(label: string) {
  const user = await prisma.user.create({
    data: { email: `vitest_${TAG}_${label}_${seq++}@example.test`, name: `Uji ${label}` },
  });
  userIds.push(user.id);
  return user;
}

const as = (user: { id: string; email: string; name: string }) => {
  session.user = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };
};

const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

let invoiceSeq = 0;
const makeOrder = (userId: string, data: Record<string, unknown> = {}) =>
  prisma.order.create({
    data: { userId, invoiceNumber: `${TAG}-INV-${invoiceSeq++}`, planType: "TIER_1", amount: 99000, status: "PENDING", ...data } as never,
  });

describe.skipIf(!IS_TEST_DB)("alur registrasi", () => {
  beforeAll(async () => {
    await prisma.promoCoupon.create({
      data: { code: COUPON, discountType: "PERCENT", discountValue: 20, perUserLimit: 5, isActive: true },
    });
  });

  afterAll(async () => {
    session.user = null;
    await prisma.promoHold.deleteMany({ where: { promoCode: COUPON } });
    await prisma.invitation.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.promoCoupon.deleteMany({ where: { code: COUPON } });
    for (const f of filesToRemove) fs.rmSync(f, { force: true });
    await prisma.$disconnect();
    await pool.end();
  });

  describe("pembuatan order", () => {
    it("enam permintaan bersamaan menghasilkan satu order PENDING dan semua balasan menunjuk order yang ada", async () => {
      const u = await makeUser("race");
      as(u);
      const results = await Promise.all(
        Array.from({ length: 6 }, () => createOrder(json("/api/orders/create", "POST", { planType: "TIER_1" })))
      );
      const bodies = await Promise.all(results.map((r) => r.json()));
      expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200]);

      const pending = await prisma.order.findMany({ where: { userId: u.id, status: "PENDING", orderType: "NEW" } });
      expect(pending).toHaveLength(1);
      for (const b of bodies) expect(b.orderId).toBe(pending[0].id);
    });
  });

  describe("promo dan konfirmasi", () => {
    it("kode promo ditolak pada order upgrade dan add-on (hanya berlaku untuk paket baru)", async () => {
      const u = await makeUser("promoaddon");
      as(u);
      for (const orderType of ["UPGRADE", "GALLERY_EXTENSION", "MEMORIES_TOPUP"]) {
        const order = await makeOrder(u.id, { planType: "TIER_2", orderType, amount: 50000 });
        const res = await validatePromo(json("/api/public/promo/validate", "POST", { code: COUPON, orderId: order.id }));
        expect(res.status, orderType).toBe(400);
        expect((await res.json()).error).toMatch(/pendaftaran paket baru/);
        expect(await prisma.promoHold.count({ where: { orderId: order.id } })).toBe(0);
      }
    });

    it("diskon persen pada order paket baru dihitung dari harga paket", async () => {
      const u = await makeUser("promo");
      as(u);
      const order = await makeOrder(u.id);
      const res = await validatePromo(json("/api/public/promo/validate", "POST", { code: COUPON, orderId: order.id }));
      expect(res.status).toBe(200);
      expect((await res.json()).discountAmount).toBe(19800);
    });

    it("konfirmasi berulang tidak memotong dua kali, dan melepas promo mengembalikan harga semula", async () => {
      const u = await makeUser("reconfirm");
      as(u);
      const order = await makeOrder(u.id);
      await validatePromo(json("/api/public/promo/validate", "POST", { code: COUPON, orderId: order.id }));

      const amountAfter = async () => Number((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).amount);
      const confirm = () => confirmOrder(json("/api/payments/checkout/confirm", "POST", { orderId: order.id }));

      expect((await confirm()).status).toBe(200);
      expect(await amountAfter()).toBe(79200);
      expect((await confirm()).status).toBe(200);
      expect(await amountAfter()).toBe(79200);

      await releasePromo(json(`/api/public/promo/validate?orderId=${order.id}`, "DELETE"));
      expect((await confirm()).status).toBe(200);
      expect(await amountAfter()).toBe(99000);
    });

    it("pengguna lain tidak bisa melepas promo milik order orang lain", async () => {
      const owner = await makeUser("owner");
      const intruder = await makeUser("intruder");
      as(owner);
      const order = await makeOrder(owner.id);
      await validatePromo(json("/api/public/promo/validate", "POST", { code: COUPON, orderId: order.id }));

      as(intruder);
      const res = await releasePromo(json(`/api/public/promo/validate?orderId=${order.id}`, "DELETE"));
      expect(res.status).toBe(403);
      const hold = await prisma.promoHold.findUniqueOrThrow({ where: { orderId: order.id } });
      expect(hold.status).toBe("HELD");
    });
  });

  describe("pembatalan", () => {
    it("pembatalan yang berpacu dengan pelunasan tidak menimpa status PAID", async () => {
      const u = await makeUser("cancelrace");
      as(u);
      const order = await makeOrder(u.id);

      const holder = await pool.connect();
      try {
        await holder.query("BEGIN");
        await holder.query(`UPDATE orders SET status='PAID', "paidAt"=now() WHERE id=$1`, [order.id]);
        const cancelling = cancelOrder(json(`/api/client/orders/${order.id}/cancel`, "POST"), params(order.id));
        await new Promise((r) => setTimeout(r, 600));
        await holder.query("COMMIT");
        const res = await cancelling;
        expect(res.status).toBe(409);
      } finally {
        holder.release();
      }
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    });

    it("kegagalan internal tidak disembunyikan di luar produksi", async () => {
      const u = await makeUser("cancelerr");
      as(u);
      const badId = "id-dengan-\u0000-karakter-nul";
      const res = await cancelOrder(json("/api/client/orders/x/cancel", "POST"), params(badId));
      expect(res.status).toBe(500);
      expect((await res.json()).error).not.toBe("Terjadi kesalahan sistem saat membatalkan pesanan");
    });
  });

  describe("dua mode pembayaran", () => {
    const setMode = (value: string) =>
      prisma.adminSetting.upsert({ where: { key: "payment_mode" }, create: { key: "payment_mode", value }, update: { value } });
    const form = () => {
      const fd = new FormData();
      fd.set("file", new File(["x"], "b.png", { type: "image/png" }));
      return new Request("http://localhost/upload", { method: "POST", body: fd });
    };
    let originalMode = "GATEWAY";

    beforeAll(async () => {
      originalMode = (await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } }))?.value ?? "GATEWAY";
    });
    afterAll(async () => {
      await setMode(originalMode);
    });

    it("mode GATEWAY: unggah bukti transfer untuk order gateway ditolak 409", async () => {
      await setMode("GATEWAY");
      const u = await makeUser("gwproof");
      as(u);
      const order = await makeOrder(u.id, { paymentMethod: "GATEWAY" });
      expect((await uploadProof(form(), params(order.id))).status).toBe(409);
    });

    it("mode MANUAL: inisiasi pembayaran gateway ditolak 409", async () => {
      await setMode("MANUAL");
      const u = await makeUser("manualgw");
      as(u);
      const order = await makeOrder(u.id, { paymentMethod: "MANUAL_TRANSFER" });
      const { POST: checkout } = await import("@/app/api/payments/checkout/route");
      const res = await checkout(json("/api/payments/checkout", "POST", { orderId: order.id }));
      expect(res.status).toBe(409);
    });
  });

  describe("unggah bukti transfer", () => {
    const form = (file: File) => {
      const fd = new FormData();
      fd.set("file", file);
      return new Request("http://localhost/upload", { method: "POST", body: fd });
    };

    it("file yang tidak valid ditolak 400 dan bukti lama tetap utuh", async () => {
      const u = await makeUser("proof");
      as(u);
      const order = await makeOrder(u.id, { paymentMethod: "MANUAL_TRANSFER" });

      const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#888" } }).png().toBuffer();
      const first = await uploadProof(form(new File([new Uint8Array(png)], "bukti.png", { type: "image/png" })), params(order.id));
      expect(first.status).toBe(200);
      const stored = (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).proofImageUrl!;
      const storedPath = path.join(process.cwd(), "public", stored);
      filesToRemove.push(storedPath);
      expect(fs.existsSync(storedPath)).toBe(true);

      const bad = await uploadProof(form(new File(["ini bukan gambar"], "bukti.png", { type: "image/png" })), params(order.id));
      expect(bad.status).toBe(400);
      expect(fs.existsSync(storedPath)).toBe(true);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).proofImageUrl).toBe(stored);
    });
  });

  describe("pembuatan undangan", () => {
    it("tanpa themeId memakai tema bawaan acara yang ada di katalog (FK)", async () => {
      const u = await makeUser("notheme");
      as(u);
      await makeOrder(u.id, { status: "PAID", paidAt: new Date() });
      const res = await createInvitation(json("/api/client/invitations/create", "POST", { groomName: "Adi", brideName: "Sari" }));
      expect(res.status).toBe(200);
      const inv = await prisma.invitation.findFirstOrThrow({ where: { userId: u.id } });
      expect(inv.themeId).toBe("kalandra");
    });

    it("themeId dengan huruf besar disimpan dalam bentuk kanonik", async () => {
      const u = await makeUser("casetheme");
      as(u);
      await makeOrder(u.id, { status: "PAID", paidAt: new Date() });
      const res = await createInvitation(json("/api/client/invitations/create", "POST", { groomName: "Adi", brideName: "Sari", themeId: "Kalandra" }));
      expect(res.status).toBe(200);
      expect((await prisma.invitation.findFirstOrThrow({ where: { userId: u.id } })).themeId).toBe("kalandra");
    });

    it("order add-on yang sudah lunas tidak membuka hak membuat undangan kedua", async () => {
      const u = await makeUser("second");
      as(u);
      const base = await makeOrder(u.id, { status: "PAID", paidAt: new Date() });
      await prisma.invitation.create({
        data: { userId: u.id, orderId: base.id, status: "PUBLISHED", invitationSlug: `${TAG}-second`, groomSlug: "a", brideSlug: "b" },
      });
      await makeOrder(u.id, { status: "PAID", paidAt: new Date(), orderType: "UPGRADE", planType: "TIER_2", amount: 50000 });

      const res = await createInvitation(json("/api/client/invitations/create", "POST", { groomName: "Budi", brideName: "Ani" }));
      expect(res.status).toBe(403);
      expect(await prisma.invitation.count({ where: { userId: u.id } })).toBe(1);
    });
  });

  describe("perubahan rincian saat sesi gateway sudah terbit", () => {
    const setMode = (value: string) =>
      prisma.adminSetting.upsert({ where: { key: "payment_mode" }, create: { key: "payment_mode", value }, update: { value } });
    const SESSION = JSON.stringify({ qrString: "qr", sessionId: "tx-lama", expiry: Date.now() + 600000 });
    const withSession = (userId: string) =>
      makeOrder(userId, {
        paymentMethod: "GATEWAY", gatewayId: "midtrans", gatewayTxId: "tx-lama", snapToken: SESSION,
        chargedAmount: 99000, checkoutConfirmedAt: new Date(),
      });
    const confirm = (orderId: string) => confirmOrder(json("/api/payments/checkout/confirm", "POST", { orderId }));
    const read = (id: string) => prisma.order.findUniqueOrThrow({ where: { id } });
    let originalMode = "GATEWAY";

    beforeAll(async () => {
      originalMode = (await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } }))?.value ?? "GATEWAY";
      await setMode("GATEWAY");
    });
    afterAll(async () => {
      await setMode(originalMode);
    });

    it("promo diterapkan setelah QR terbit: transaksi lama dibatalkan dan sesi dikosongkan agar QR baru bernominal benar terbit", async () => {
      gw.cancel.mockClear();
      const u = await makeUser("regate");
      as(u);
      const order = await withSession(u.id);
      await validatePromo(json("/api/public/promo/validate", "POST", { code: COUPON, orderId: order.id }));

      expect((await confirm(order.id)).status).toBe(200);
      expect(gw.cancel).toHaveBeenCalledWith("tx-lama");
      const after = await read(order.id);
      expect(Number(after.amount)).toBe(79200);
      expect(after.snapToken).toBeNull();
      expect(after.gatewayTxId).toBeNull();
      expect(after.chargedAmount).toBeNull();
    });

    it("konfirmasi ulang tanpa perubahan nominal mempertahankan QR yang sama", async () => {
      gw.cancel.mockClear();
      const u = await makeUser("rekeep");
      as(u);
      const order = await withSession(u.id);

      expect((await confirm(order.id)).status).toBe(200);
      expect(gw.cancel).not.toHaveBeenCalled();
      const after = await read(order.id);
      expect(after.gatewayTxId).toBe("tx-lama");
      expect(after.snapToken).toBe(SESSION);
      expect(Number(after.chargedAmount)).toBe(99000);
    });

    it("transaksi lama ternyata sudah terbayar: rincian tidak diubah dan dijawab 409", async () => {
      gw.cancel.mockClear();
      gw.cancel.mockResolvedValueOnce({ success: false, error: "Transaksi sudah terbayar" });
      const u = await makeUser("repaid");
      as(u);
      const order = await withSession(u.id);
      await validatePromo(json("/api/public/promo/validate", "POST", { code: COUPON, orderId: order.id }));

      const res = await confirm(order.id);
      expect(res.status).toBe(409);
      const after = await read(order.id);
      expect(Number(after.amount)).toBe(99000);
      expect(after.gatewayTxId).toBe("tx-lama");
    });

    it("mode platform berpindah ke MANUAL: QR gateway lama dibatalkan agar tidak bisa dibayar ganda", async () => {
      gw.cancel.mockClear();
      const u = await makeUser("remanual");
      as(u);
      const order = await withSession(u.id);
      await setMode("MANUAL");
      try {
        expect((await confirm(order.id)).status).toBe(200);
      } finally {
        await setMode("GATEWAY");
      }
      expect(gw.cancel).toHaveBeenCalledWith("tx-lama");
      const after = await read(order.id);
      expect(after.paymentMethod).toBe("MANUAL_TRANSFER");
      expect(after.snapToken).toBeNull();
    });
  });
});
