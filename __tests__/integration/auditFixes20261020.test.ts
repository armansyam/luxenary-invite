/**
 * Regresi audit 20 Okt 2026 (DB luxenary_test): struk keuangan privat, portofolio tanpa data tamu, hapus mitra dan
 * lagu yang masih dipakai, kunci ubah tamu pada hari acara, dan panjang minimal password admin.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as uploadReceipt } from "@/app/api/admin/finance/upload-receipt/route";
import { POST as createExpense } from "@/app/api/admin/finance/expenses/route";
import { PUT as updateExpense, DELETE as deleteExpense } from "@/app/api/admin/finance/expenses/[id]/route";
import { GET as getReceipt } from "@/app/api/admin/finance/expenses/[id]/receipt/route";
import { POST as copyToPortfolio } from "@/app/api/admin/portfolio/route";
import { buildAndSavePublishedHtml, deletePublishedHtml } from "@/lib/staticPublisher";
import { deletePortfolio } from "@/lib/storage";
import { POST as marketingAction } from "@/app/api/admin/marketing/route";
import { DELETE as deleteMusic } from "@/app/api/admin/music/[id]/route";
import { PUT as updateGuest } from "@/app/api/client/guests/[id]/route";
import { POST as createAdmin } from "@/app/api/admin/admins/route";
import { PUT as updateOwnProfile } from "@/app/api/admin/profile/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_audit1020_${Date.now()}`;
const ids = {
  admins: [] as string[], expenses: [] as string[], users: [] as string[], invitations: [] as string[], portfolios: [] as string[],
  partners: [] as string[], orders: [] as string[], music: [] as string[],
};

const jsonRequest = (url: string, method: string, body: unknown) =>
  new NextRequest(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const privateDiskPath = (ref: string) => path.join(process.cwd(), "data", "private", ref.slice("private-disk:".length));

let adminSeq = 0;
async function asAdmin(role: "FINANCE" | "SUPPORT" | "SUPER_ADMIN", permissions: string[], passwordHash?: string) {
  const tag = `${RUN}_adm${++adminSeq}`;
  const admin = await prisma.admin.create({ data: { username: tag, email: `${tag}@admin.local`, name: "Admin Uji", role, permissions, passwordHash } });
  ids.admins.push(admin.id);
  sessionUser = { id: admin.id, email: admin.email, role, isAdmin: true, permissions };
  return admin.id;
}

async function makeInvitation(tag: string, data: Record<string, unknown> = {}) {
  const user = await prisma.user.create({ data: { email: `${RUN}_${tag}@t.local`, name: "Pemilik" } });
  ids.users.push(user.id);
  const inv = await prisma.invitation.create({ data: { userId: user.id, eventType: "WEDDING", invitationSlug: `${RUN.replace(/_/g, "-")}-${tag}`, ...data } });
  ids.invitations.push(inv.id);
  return { user, inv };
}

afterAll(async () => {
  sessionUser = null;
  await prisma.affiliateCommission.deleteMany({ where: { partnerId: { in: ids.partners } } });
  await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
  await prisma.partnerAffiliate.deleteMany({ where: { id: { in: ids.partners } } });
  await prisma.musicPreset.deleteMany({ where: { id: { in: ids.music } } });
  for (const slug of ids.portfolios) await deletePortfolio(slug);
  for (const id of ids.invitations) await deletePublishedHtml(id);
  await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  await prisma.expense.deleteMany({ where: { id: { in: ids.expenses } } });
  await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: ids.admins } } });
  await prisma.admin.deleteMany({ where: { id: { in: ids.admins } } });
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("struk keuangan privat", () => {
  async function upload(color: string): Promise<string> {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: color } }).png().toBuffer();
    const form = new FormData();
    form.append("file", new File([new Uint8Array(png)], "struk.png", { type: "image/png" }));
    const res = await uploadReceipt(new NextRequest("http://localhost/api/admin/finance/upload-receipt", { method: "POST", body: form }));
    expect(res.status).toBe(200);
    return (await res.json()).ref;
  }
  const receipt = (id: string) => getReceipt(new NextRequest(`http://localhost/api/admin/finance/expenses/${id}/receipt`), { params: Promise.resolve({ id }) });
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  it("struk tersimpan di data/private dan hanya dibuka admin modul keuangan", async () => {
    await asAdmin("FINANCE", ["finance"]);
    const ref = await upload("#123456");
    expect(ref).toMatch(/^private-disk:receipts\//);
    expect(fs.existsSync(privateDiskPath(ref))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "public", "uploads", "finance", "receipts", path.basename(ref)))).toBe(false);

    const created = await createExpense(jsonRequest("http://localhost/api/admin/finance/expenses", "POST", { title: `${RUN} struk`, amount: 5000, receiptUrl: ref }));
    expect(created.status).toBe(200);
    const { expense } = await created.json();
    ids.expenses.push(expense.id);

    const served = await receipt(expense.id);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await served.arrayBuffer()).equals(fs.readFileSync(privateDiskPath(ref)))).toBe(true);

    await asAdmin("SUPPORT", ["orders"]);
    expect((await receipt(expense.id)).status).toBe(403);
    sessionUser = { id: "klien", role: "CLIENT", isAdmin: false };
    expect((await receipt(expense.id)).status).toBe(401);
  });

  it("URL bebas dan referensi privat selain struk ditolak", async () => {
    await asAdmin("FINANCE", ["finance"]);
    const post = (receiptUrl: string) =>
      createExpense(jsonRequest("http://localhost/api/admin/finance/expenses", "POST", { title: `${RUN} tolak`, amount: 5000, receiptUrl }));
    expect((await post("https://contoh.com/struk.png")).status).toBe(400);
    expect((await post("/uploads/finance/receipts/receipt-1-abc.png")).status).toBe(400);
    expect((await post("private-disk:proofs/bukti-klien.webp")).status).toBe(400);
    expect((await post("private-disk:receipts/../proofs/receipt-1-abc.png")).status).toBe(400);
  });

  it("struk diganti atau pengeluaran dihapus: berkas lama ikut terhapus", async () => {
    await asAdmin("FINANCE", ["finance"]);
    const first = await upload("#aaaaaa");
    const created = await createExpense(jsonRequest("http://localhost/api/admin/finance/expenses", "POST", { title: `${RUN} ganti`, amount: 5000, receiptUrl: first }));
    const { expense } = await created.json();
    ids.expenses.push(expense.id);

    const second = await upload("#bbbbbb");
    const updated = await updateExpense(jsonRequest(`http://localhost/api/admin/finance/expenses/${expense.id}`, "PUT", { receiptUrl: second }), params(expense.id));
    expect(updated.status).toBe(200);
    expect(fs.existsSync(privateDiskPath(first))).toBe(false);
    expect(fs.existsSync(privateDiskPath(second))).toBe(true);

    expect((await deleteExpense(new NextRequest(`http://localhost/api/admin/finance/expenses/${expense.id}`, { method: "DELETE" }), params(expense.id))).status).toBe(200);
    expect(fs.existsSync(privateDiskPath(second))).toBe(false);
    expect((await receipt(expense.id)).status).toBe(404);
  });
});

describe.skipIf(!IS_TEST_DB)("salinan portofolio tanpa data tamu asli", () => {
  it("nama dan ucapan RSVP tidak ikut, ID undangan diganti ID demo, tautan kamera dan galeri ke halaman demo", async () => {
    const themeId = (await prisma.theme.findFirstOrThrow({ where: { eventType: "WEDDING" }, select: { id: true } })).id;
    const user = await prisma.user.create({ data: { email: `${RUN}_porto@t.local`, name: "Pemilik" } });
    ids.users.push(user.id);
    const slug = `${RUN.replace(/_/g, "-")}-porto`;
    const inv = await prisma.invitation.create({
      data: {
        userId: user.id, themeId, eventType: "WEDDING", status: "PUBLISHED", invitationSlug: slug,
        participantsJson: { groom: { name: "Raka", nickname: "Raka" }, bride: { name: "Dewi", nickname: "Dewi" } },
        eventData: [{ title: "Resepsi", date: "2099-01-01", time: "10:00", isPrimary: true }],
        featureSettings: { enableMemories: true },
      },
    });
    ids.invitations.push(inv.id);
    const guestName = `${RUN}TamuRahasia`;
    await prisma.rsvp.create({ data: { invitationId: inv.id, guestName, status: "hadir", message: `${RUN} ucapan pribadi` } });

    expect(await buildAndSavePublishedHtml(inv.id)).toContain(guestName);

    await asAdmin("SUPPORT", ["portfolio"]);
    const res = await copyToPortfolio(jsonRequest("http://localhost/api/admin/portfolio", "POST", { invitationId: inv.id }));
    expect(res.status).toBe(200);
    ids.portfolios.push(slug);

    const html = await fs.promises.readFile(path.join(process.cwd(), "public", "portfolio", `${slug}.html`), "utf-8");
    expect(html).not.toContain(guestName);
    expect(html).not.toContain(`${RUN} ucapan pribadi`);
    expect(html).toMatch(/(?<!\/)demo-portfolio-/);
    expect(html.match(new RegExp(`(?<!/)${inv.id}`, "g"))).toBeNull();
    expect(html).not.toContain(`"/${slug}/sharemoment"`);
    expect(html).not.toContain(`"/${slug}/memories"`);
  });
});

describe.skipIf(!IS_TEST_DB)("hapus mitra dan lagu yang masih dirujuk", () => {
  const deletePartner = (id: string) => marketingAction(jsonRequest("http://localhost/api/admin/marketing", "POST", { action: "DELETE_PARTNER", id, forceConfirm: true }));

  it("mitra berkomisi ditolak 409 walau forceConfirm dikirim, komisi tetap ada; mitra tanpa komisi terhapus", async () => {
    await asAdmin("SUPER_ADMIN", []);
    const { user } = await makeInvitation("mitra");
    const order = await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${RUN}-mitra`, planType: "TIER_1", amount: 150000, status: "PAID" } });
    ids.orders.push(order.id);
    const withCommission = await prisma.partnerAffiliate.create({ data: { name: `${RUN} A`, commissionValue: 10 } });
    const empty = await prisma.partnerAffiliate.create({ data: { name: `${RUN} B`, commissionValue: 10 } });
    ids.partners.push(withCommission.id, empty.id);
    await prisma.affiliateCommission.create({
      data: { partnerId: withCommission.id, orderId: order.id, orderAmount: 150000, commissionAmount: 15000, status: "PAID", paidAt: new Date() },
    });

    expect((await deletePartner(withCommission.id)).status).toBe(409);
    expect(await prisma.affiliateCommission.count({ where: { partnerId: withCommission.id } })).toBe(1);
    expect(await prisma.partnerAffiliate.count({ where: { id: withCommission.id } })).toBe(1);

    expect((await deletePartner(empty.id)).status).toBe(200);
    expect(await prisma.partnerAffiliate.count({ where: { id: empty.id } })).toBe(0);
  });

  it("lagu yang dipakai undangan ditolak 409; lagu bawaan /music/ tidak menghapus berkas repo", async () => {
    await asAdmin("SUPER_ADMIN", []);
    const used = await prisma.musicPreset.create({ data: { title: `${RUN} dipakai`, url: `/uploads/music/${RUN}-dipakai.mp3` } });
    ids.music.push(used.id);
    await makeInvitation("lagu", { musicUrl: used.url });
    const params = (id: string) => ({ params: Promise.resolve({ id }) });
    const del = (id: string) => deleteMusic(new NextRequest(`http://localhost/api/admin/music/${id}`, { method: "DELETE" }), params(id));

    expect((await del(used.id)).status).toBe(409);
    expect(await prisma.musicPreset.count({ where: { id: used.id } })).toBe(1);

    const bundledFile = path.join(process.cwd(), "public", "music", `${RUN}.mp3`);
    fs.writeFileSync(bundledFile, "x");
    try {
      const bundled = await prisma.musicPreset.create({ data: { title: `${RUN} bawaan`, url: `/music/${RUN}.mp3` } });
      ids.music.push(bundled.id);
      expect((await del(bundled.id)).status).toBe(200);
      expect(fs.existsSync(bundledFile)).toBe(true);
    } finally {
      fs.rmSync(bundledFile, { force: true });
    }
  });
});

describe.skipIf(!IS_TEST_DB)("ubah tamu pada hari acara", () => {
  it("klien ditolak 403 mulai hari terima tamu, admin tetap dapat mengubah; sebelum hari itu klien dapat mengubah", async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { user, inv } = await makeInvitation("tamu", { eventData: [{ title: "Resepsi", date: yesterday, time: "10:00", isPrimary: true }] });
    const guest = await prisma.guest.create({ data: { invitationId: inv.id, name: "Budi", slug: `${RUN}-budi` } });
    const put = (body: unknown) => updateGuest(new Request(`http://localhost/api/client/guests/${guest.id}`, { method: "PUT", body: JSON.stringify(body) }), { params: Promise.resolve({ id: guest.id }) });

    sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false };
    expect((await put({ name: "Budi Santoso" })).status).toBe(403);
    expect((await prisma.guest.findUniqueOrThrow({ where: { id: guest.id } })).name).toBe("Budi");

    await asAdmin("SUPPORT", ["invitations"]);
    expect((await put({ tableNumber: "A1" })).status).toBe(200);

    await prisma.invitation.update({ where: { id: inv.id }, data: { eventData: [{ title: "Resepsi", date: "2099-01-01", time: "10:00", isPrimary: true }] } });
    sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false };
    expect((await put({ name: "Budi Santoso" })).status).toBe(200);
  });
});

describe.skipIf(!IS_TEST_DB)("password admin minimal 12 karakter", () => {
  it("tambah admin dan ganti password sendiri menolak password pendek", async () => {
    const bcrypt = (await import("bcryptjs")).default;
    await asAdmin("SUPER_ADMIN", [], await bcrypt.hash("password-lama-panjang", 4));
    const short = await createAdmin(jsonRequest("http://localhost/api/admin/admins", "POST", { username: `${RUN}_pendek`, email: `${RUN}_pendek@t.local`, name: "Pendek", role: "SUPPORT", password: "pendek123" }));
    expect(short.status).toBe(400);
    expect(await prisma.admin.count({ where: { username: `${RUN}_pendek` } })).toBe(0);

    const profile = await updateOwnProfile(jsonRequest("http://localhost/api/admin/profile", "PUT", { currentPassword: "password-lama-panjang", newPassword: "pendek123" }));
    expect(profile.status).toBe(400);
  });
});
