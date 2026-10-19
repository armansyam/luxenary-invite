/**
 * Bukti transfer tidak boleh punya URL publik: unggahan masuk penyimpanan privat, admin membukanya lewat tautan
 * bertanda tangan yang kedaluwarsa (hanya di database `luxenary_test`).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { createProofLink, PROOF_LINK_TTL_SECONDS } from "@/lib/proofLink";
import { POST as uploadProof } from "@/app/api/client/orders/[id]/upload-proof/route";
import { GET as adminProof } from "@/app/api/admin/orders/[orderId]/proof/route";
import { GET as proofFile } from "@/app/api/files/proof/[orderId]/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_proofpriv_${Date.now()}`;
const privatePath = (ref: string) => path.join(process.cwd(), "data", "private", ref.slice("private-disk:".length));

let userId = "";
let orderSeq = 0;

const makeOrder = (data: { proofImageUrl?: string } = {}) =>
  prisma.order.create({
    data: { userId, invoiceNumber: `${TAG}-INV-${++orderSeq}`, planType: "TIER_1", amount: 150000, paymentMethod: "MANUAL_TRANSFER", ...data },
  });

const asClient = () => {
  sessionUser = { id: userId, email: `${TAG}@t.local`, name: "Klien Uji", role: "CLIENT", isAdmin: false };
};
const asAdmin = () => {
  sessionUser = { id: `${TAG}_admin`, email: `${TAG}_admin@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
};

async function upload(orderId: string, color: string) {
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: color } }).png().toBuffer();
  const fd = new FormData();
  fd.set("file", new File([new Uint8Array(png)], "bukti.png", { type: "image/png" }));
  asClient();
  return uploadProof(new Request("http://localhost/upload", { method: "POST", body: fd }), { params: Promise.resolve({ id: orderId }) });
}

const getAdminProof = (orderId: string) =>
  adminProof(new NextRequest(`http://localhost/api/admin/orders/${orderId}/proof`), { params: Promise.resolve({ orderId }) });
const getFile = (link: string) => {
  const url = new URL(link, "http://localhost");
  const orderId = decodeURIComponent(url.pathname.split("/").pop()!);
  return proofFile(new NextRequest(url), { params: Promise.resolve({ orderId }) });
};

describe.skipIf(!IS_TEST_DB)("bukti transfer privat", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET ||= "vitest-proof-signing-secret";
    userId = (await prisma.user.create({ data: { email: `${TAG}@t.local`, name: "Klien Uji" } })).id;
  });

  afterAll(async () => {
    sessionUser = null;
    for (const order of await prisma.order.findMany({ where: { userId }, select: { proofImageUrl: true } })) {
      await deleteFile(order.proofImageUrl);
    }
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("unggahan disimpan di data/private, bukan public/uploads", async () => {
    const order = await makeOrder();
    expect((await upload(order.id, "#777")).status).toBe(200);
    const ref = (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).proofImageUrl!;
    expect(ref).toMatch(/^private-disk:proofs\/[^/]+\.webp$/);
    expect(fs.existsSync(privatePath(ref))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "public", "uploads", ref.slice("private-disk:".length)))).toBe(false);
  });

  it("rute admin: klien 401, admin dialihkan ke tautan bertanda tangan yang menyajikan berkas tanpa cache", async () => {
    const order = await makeOrder();
    await upload(order.id, "#456");
    const ref = (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).proofImageUrl!;

    asClient();
    expect((await getAdminProof(order.id)).status).toBe(401);
    sessionUser = null;
    expect((await getAdminProof(order.id)).status).toBe(401);

    asAdmin();
    const redirect = await getAdminProof(order.id);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("cache-control")).toBe("no-store");
    const link = redirect.headers.get("location")!;
    expect(link).toMatch(new RegExp(`^/api/files/proof/${order.id}\\?exp=\\d+&sig=[0-9a-f]{64}$`));

    sessionUser = null;
    const served = await getFile(link);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/webp");
    expect(served.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await served.arrayBuffer()).equals(fs.readFileSync(privatePath(ref)))).toBe(true);
  });

  it("tanda tangan diubah, dipakai untuk order lain, atau kedaluwarsa ditolak 403", async () => {
    // Order kedua dibuat setelah unggahan pertama: unggahan menghapus order PENDING lain milik klien yang belum berbukti.
    const a = await makeOrder();
    await upload(a.id, "#123");
    const b = await makeOrder();
    await upload(b.id, "#321");
    const refA = (await prisma.order.findUniqueOrThrow({ where: { id: a.id } })).proofImageUrl!;
    const link = createProofLink(a.id, refA);

    expect((await getFile(link)).status).toBe(200);
    expect((await getFile(link.replace(/sig=./, (m) => (m.endsWith("0") ? "sig=1" : "sig=0")))).status).toBe(403);
    expect((await getFile(link.replace(`/proof/${a.id}`, `/proof/${b.id}`))).status).toBe(403);
    expect((await getFile(link.replace(/&sig=.*/, ""))).status).toBe(403);

    const expired = createProofLink(a.id, refA, Date.now() - (PROOF_LINK_TTL_SECONDS + 5) * 1000);
    expect((await getFile(expired)).status).toBe(403);
    const tooLong = link.replace(/exp=\d+/, `exp=${Math.floor(Date.now() / 1000) + 86400}`);
    expect((await getFile(tooLong)).status).toBe(403);
  });

  it("bukti diganti: tautan lama berhenti berlaku dan berkas lama terhapus", async () => {
    const order = await makeOrder();
    await upload(order.id, "#aaa");
    const oldRef = (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).proofImageUrl!;
    const oldLink = createProofLink(order.id, oldRef);

    await upload(order.id, "#bbb");
    const newRef = (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).proofImageUrl!;
    expect(newRef).not.toBe(oldRef);
    expect(fs.existsSync(privatePath(oldRef))).toBe(false);
    expect((await getFile(oldLink)).status).toBe(403);
    expect((await getFile(createProofLink(order.id, newRef))).status).toBe(200);
  });

  it("nilai bukti yang bukan referensi privat tidak dapat dibuka: rute admin 404, rute berkas 403", async () => {
    const order = await makeOrder({ proofImageUrl: `/uploads/proofs/${TAG}-publik.webp` });
    asAdmin();
    expect((await getAdminProof(order.id)).status).toBe(404);
    expect((await getFile(createProofLink(order.id, order.proofImageUrl!))).status).toBe(403);
  });

});
