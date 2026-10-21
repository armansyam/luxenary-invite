/**
 * Temuan uji total 21 Okt 2026 (handler rute dipanggil langsung, DB luxenary_test):
 * 1. Tambah/impor/ubah nama tamu bersamaan menyimpan nama kembar (cek lalu tulis tanpa kunci).
 * 2. Aset Studio Demo menerima SVG berskrip dan HTML berkedok .png; hapus slot tidak menghapus .svg.
 * 3. Musik admin dinilai dari nama/tipe kiriman browser, bukan isi berkas.
 * 4. Tema unggahan admin tersimpan tetapi tidak dapat dirender (THEME_MAP statis).
 * 5. Body JSON rusak atau bukan multipart dibalas 500.
 * 6. Order gateway tanpa bukti dapat disetujui admin lewat API.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })),
}));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeInvitationEdgeCache: vi.fn(async () => null) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/videoOptimizer", () => ({ optimizeWebAudio: vi.fn(async (b: Buffer) => b), optimizeWebVideo: vi.fn(async (b: Buffer) => b) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as addGuest } from "@/app/api/client/guests/route";
import { POST as bulkGuests } from "@/app/api/client/guests/bulk/route";
import { PUT as updateGuest } from "@/app/api/client/guests/[id]/route";
import { POST as demoAssetPost, DELETE as demoAssetDelete } from "@/app/api/admin/themes/[id]/demo-asset/route";
import { POST as musicPost } from "@/app/api/admin/music/route";
import { POST as settingsPost } from "@/app/api/admin/settings/route";
import { POST as scanPost } from "@/app/api/receptionist/scan/route";
import { PUT as invitationPut } from "@/app/api/client/invitations/[id]/route";
import { POST as approveOrder } from "@/app/api/admin/orders/[orderId]/approve/route";
import { renderTemplateFile, resolveThemeEntry } from "@/lib/renderTemplate";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_full1021_${Date.now()}`;
const ROOT = process.cwd();
const DEMO_THEME = `vitest-demo-${Date.now()}`;
const UPLOAD_DIR = path.join(ROOT, "public", "uploads", "demo", DEMO_THEME);
const THEME_ID = `vitest-tema-${Date.now()}`;
const THEME_FILE = path.join(ROOT, "themes", "wedding", "modern", `${THEME_ID}.html`);
let userId = "";
let invitationId = "";

const json = (body: unknown) => new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const broken = (method = "POST") => new Request("http://localhost/x", { method, headers: { "content-type": "application/json" }, body: "{rusak" });
const form = (fields: Record<string, string>, file?: { data: Buffer | string; name: string; type: string }) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) fd.append("file", new File([typeof file.data === "string" ? file.data : new Uint8Array(file.data)], file.name, { type: file.type }));
  return new Request("http://localhost/x", { method: "POST", body: fd });
};
const guestCount = (name: string) => prisma.guest.count({ where: { invitationId, name: { equals: name, mode: "insensitive" } } });

beforeAll(async () => {
  if (!IS_TEST_DB) return;
  const user = await prisma.user.create({ data: { email: `${TAG}@example.test`, name: "Uji" } });
  userId = user.id;
  const order = await prisma.order.create({ data: { userId, invoiceNumber: `${TAG}-inv`, planType: "TIER_3", amount: 1, status: "PAID", paidAt: new Date() } as never });
  const inv = await prisma.invitation.create({
    data: {
      userId, orderId: order.id, themeId: "kalandra", eventType: "WEDDING", status: "DRAFT", invitationSlug: TAG.replace(/_/g, "-"),
      participantsJson: { groom: { name: "Raka" }, bride: { name: "Dewi" } },
      eventData: [{ title: "Resepsi", date: "2099-12-05", time: "10:00 – 14:00 WITA", location: "Gedung", isPrimary: true }],
    } as never,
  });
  invitationId = inv.id;
});

afterAll(async () => {
  if (IS_TEST_DB) {
    await prisma.guest.deleteMany({ where: { invitationId } });
    await prisma.invitation.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.adminSetting.deleteMany({ where: { key: `theme_demo_${DEMO_THEME}` } });
    await prisma.musicPreset.deleteMany({ where: { title: { startsWith: TAG } } });
    fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
    fs.rmSync(path.join(ROOT, "public", "demo", DEMO_THEME), { recursive: true, force: true });
    fs.rmSync(THEME_FILE, { force: true });
    for (const f of fs.readdirSync(path.join(ROOT, "public", "uploads", "music")).filter((f) => f.startsWith(TAG.replace(/_/g, "-")))) fs.rmSync(path.join(ROOT, "public", "uploads", "music", f));
  }
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("nama tamu kembar saat permintaan bersamaan", () => {
  it("tambah tamu bernama sama 8x bersamaan: 1 tersimpan, sisanya 400 (bukan 409/500)", async () => {
    const res = await Promise.all(Array.from({ length: 8 }, () => addGuest(json({ invitationId, name: "Budi Paralel" }))));
    expect(await guestCount("Budi Paralel")).toBe(1);
    expect(res.map((r) => r.status).sort()).toEqual([200, 400, 400, 400, 400, 400, 400, 400]);
  });

  it("dua impor bersamaan berisi nama sama tidak menggandakan", async () => {
    const guests = Array.from({ length: 40 }, (_, i) => ({ name: `Impor Paralel ${i}` }));
    const res = await Promise.all([bulkGuests(json({ invitationId, guests }) as never), bulkGuests(json({ invitationId, guests }) as never), addGuest(json({ invitationId, name: "impor paralel 3" }))]);
    expect(res.every((r) => r.status < 500)).toBe(true);
    expect(await prisma.guest.count({ where: { invitationId, name: { startsWith: "Impor Paralel", mode: "insensitive" } } })).toBe(40);
  });

  it("dua tamu diganti ke nama yang sama bersamaan: hanya satu berhasil", async () => {
    const a = await prisma.guest.create({ data: { invitationId, name: "Asal A", slug: `${TAG}-a`, qrToken: `${TAG}-a` } });
    const b = await prisma.guest.create({ data: { invitationId, name: "Asal B", slug: `${TAG}-b`, qrToken: `${TAG}-b` } });
    const put = (id: string) => updateGuest(new Request("http://localhost/x", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Nama Rebutan" }) }), { params: Promise.resolve({ id }) });
    const res = await Promise.all([put(a.id), put(b.id)]);
    expect(res.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(await guestCount("Nama Rebutan")).toBe(1);
  });
});

describe.skipIf(!IS_TEST_DB)("aset Studio Demo dinilai dari isi berkas", () => {
  const upload = (slot: string, file: { data: Buffer | string; name: string; type: string }) =>
    demoAssetPost(form({ slot }, file), { params: Promise.resolve({ id: DEMO_THEME }) });

  it("SVG berskrip dan HTML berkedok .png ditolak 415, tanpa berkas tertulis", async () => {
    const svg = await upload("vendor_logo_1", { data: `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`, name: "logo.svg", type: "image/svg+xml" });
    expect(svg.status).toBe(415);
    const html = await upload("gallery_01", { data: "<html><script>alert(1)</script></html>", name: "foto.png", type: "image/png" });
    expect(html.status).toBe(415);
    expect(fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : []).toEqual([]);
  });

  it("slot musik menolak gambar; JPEG diberi ekstensi .jpg sesuai isinya", async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();
    expect((await upload("music", { data: png, name: "lagu.mp3", type: "audio/mpeg" })).status).toBe(415);
    const jpg = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer();
    const res = await upload("gallery_02", { data: jpg, name: "foto.webp", type: "image/webp" });
    expect(res.status).toBe(200);
    expect((await res.json()).rawUrl).toBe(`/uploads/demo/${DEMO_THEME}/gallery_02.jpg`);
  });

  it("hapus slot ikut menghapus SVG unggahan lama", async () => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, "vendor_logo_9.svg"), "<svg/>");
    const res = await demoAssetDelete(new Request(`http://localhost/x?slot=vendor_logo_9`, { method: "DELETE" }), { params: Promise.resolve({ id: DEMO_THEME }) });
    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(UPLOAD_DIR, "vendor_logo_9.svg"))).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB)("musik admin dinilai dari isi berkas", () => {
  it("teks berkedok audio/mpeg .mp3 ditolak; MP3 asli diterima", async () => {
    const fake = await musicPost(form({ title: `${TAG} palsu` }, { data: "# bukan audio\n", name: "lagu.mp3", type: "audio/mpeg" }) as never);
    expect(fake.status).toBe(400);
    const real = await musicPost(form({ title: `${TAG} asli` }, { data: fs.readFileSync(path.join(ROOT, "public", "music", "bermuara.mp3")), name: "x.bin", type: "application/octet-stream" }) as never);
    expect(real.status).toBe(200);
  });
});

describe("tema unggahan admin dapat dirender", () => {
  it("entri dibaca dari letak berkas master; nama tidak sah atau tidak ada -> undefined", async () => {
    fs.writeFileSync(THEME_FILE, "<!DOCTYPE html><html><body><p id=\"uji\">{{groomName}}</p></body></html>");
    expect(resolveThemeEntry(THEME_ID)).toEqual({ file: `${THEME_ID}.html`, eventType: "wedding", style: "modern" });
    expect(resolveThemeEntry("kalandra")?.style).toBe("minimalist");
    expect(resolveThemeEntry("../../package")).toBeUndefined();
    expect(resolveThemeEntry("tidak-ada-tema-uji")).toBeUndefined();
    const html = await renderTemplateFile(THEME_ID, { groomName: "Raka Uji" });
    expect(html).toContain("Raka Uji");
  });
});

describe.skipIf(!IS_TEST_DB)("body rusak dibalas 400", () => {
  it("JSON rusak dan bukan multipart tidak 500", async () => {
    expect((await addGuest(broken())).status).toBe(400);
    expect((await settingsPost(broken() as never)).status).toBe(400);
    expect((await scanPost(broken() as never)).status).toBe(400);
    expect((await invitationPut(broken("PUT"), { params: Promise.resolve({ id: invitationId }) })).status).toBe(400);
    expect((await demoAssetPost(json({ slot: "x" }), { params: Promise.resolve({ id: DEMO_THEME }) })).status).toBe(400);
  });
});

describe.skipIf(!IS_TEST_DB)("approve admin wajib bukti transfer", () => {
  it("order gateway atau transfer tanpa bukti ditolak 400 dan tetap PENDING", async () => {
    for (const paymentMethod of ["GATEWAY", "MANUAL_TRANSFER"] as const) {
      const order = await prisma.order.create({ data: { userId, invoiceNumber: `${TAG}-${paymentMethod}`, planType: "TIER_2", amount: 100000, status: "PENDING", paymentMethod } as never });
      const res = await approveOrder(json({}) as never, { params: Promise.resolve({ orderId: order.id }) });
      expect(res.status).toBe(400);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
    }
  });
});
