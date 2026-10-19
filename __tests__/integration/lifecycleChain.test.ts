/**
 * Rantai penuh lewat handler route nyata, berurutan, satu klien dan satu admin pada DB `luxenary_test`:
 * pesan paket -> konfirmasi -> bukti transfer -> persetujuan admin -> undangan -> terbit -> PIN, tamu, RSVP,
 * resepsionis -> tutup ke galeri -> arsip oleh cron -> hapus klien. Hanya sesi (`@/auth`) yang dipalsukan;
 * berlalunya waktu disimulasikan dengan memundurkan tanggal acara di DB karena route tidak menerima jam sisipan.
 * Setiap langkah yang menolak (401/403/409/410) diuji di titik rantai tempat penolakan itu bermakna.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { invalidateSettingsCache } from "@/lib/settings";
import { buildCheckinPayload } from "@/lib/checkinQr";
import { POST as createOrder } from "@/app/api/orders/create/route";
import { POST as confirmOrder } from "@/app/api/payments/checkout/confirm/route";
import { POST as uploadProof } from "@/app/api/client/orders/[id]/upload-proof/route";
import { POST as approveOrder } from "@/app/api/admin/orders/[orderId]/approve/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { GET as getInvitation, PUT as putInvitation } from "@/app/api/client/invitations/[id]/route";
import { PUT as putStaffPin } from "@/app/api/client/invitations/[id]/staff-pin/route";
import { POST as postGuest } from "@/app/api/client/guests/route";
import { POST as postRsvp } from "@/app/api/public/rsvp/route";
import { POST as verifyPin } from "@/app/api/receptionist/verify-pin/route";
import { POST as scan } from "@/app/api/receptionist/scan/route";
import { POST as lifecycle } from "@/app/api/admin/invitations/[id]/lifecycle/route";
import { POST as cronCleanup } from "@/app/api/cron/cleanup/route";
import { DELETE as deleteClient } from "@/app/api/admin/users/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_chain_${Date.now()}`;
const CRON_SECRET = `${TAG}_secret`;
const PIN = "AB12";
const GROOM = "Bagas";
const BRIDE = "Laras";

const json = (url: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

const state = {
  adminId: "",
  clientId: "",
  strangerId: "",
  orderId: "",
  invitationId: "",
  slug: "",
  proofPath: "",
  token: "",
};
const savedSettings = new Map<string, string | null>();

async function setSetting(key: string, value: string) {
  if (!savedSettings.has(key)) {
    savedSettings.set(key, (await prisma.adminSetting.findUnique({ where: { key } }))?.value ?? null);
  }
  await prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value, group: "setup" } });
  invalidateSettingsCache();
}

const asClient = (id: string, email: string) => {
  sessionUser = { id, email, name: "Klien Uji", role: "CLIENT", isAdmin: false };
};
const asAdmin = () => {
  sessionUser = { id: state.adminId, email: `${TAG}_admin@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
};

const invitationFile = () => path.join(process.cwd(), "public", "published", "ids", `${state.invitationId}.html`);

async function clearRateLimits() {
  await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'verify-pin:%' OR key LIKE 'scan:%' OR key LIKE 'rsvp_post:%'");
}

describe.skipIf(!IS_TEST_DB)("rantai klien dan admin: daftar paket sampai hapus klien", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET ||= "vitest-chain-signing-secret";
    process.env.CRON_SECRET = CRON_SECRET;
    await clearRateLimits();

    const admin = await prisma.admin.create({
      data: { username: TAG, email: `${TAG}_admin@t.local`, name: "Admin Uji", role: "SUPPORT", permissions: [] },
    });
    state.adminId = admin.id;
    const client = await prisma.user.create({ data: { email: `${TAG}_client@t.local`, name: "Klien Uji" } });
    state.clientId = client.id;
    const stranger = await prisma.user.create({ data: { email: `${TAG}_stranger@t.local`, name: "Klien Lain" } });
    state.strangerId = stranger.id;

    await setSetting("payment_mode", "MANUAL");
    await setSetting("nas_archive_enabled", "false");
    await setSetting("retention_cleanup_days", "30");
    const price = await prisma.adminSetting.findUnique({ where: { key: "price_tier3" } });
    if (!price || !(Number(price.value) > 0)) await setSetting("price_tier3", "250000");
  });

  afterAll(async () => {
    sessionUser = null;
    await clearRateLimits();
    const users = [state.clientId, state.strangerId].filter(Boolean);
    await prisma.rsvp.deleteMany({ where: { invitation: { userId: { in: users } } } });
    await prisma.guest.deleteMany({ where: { invitation: { userId: { in: users } } } });
    await prisma.invitation.deleteMany({ where: { userId: { in: users } } });
    await prisma.order.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.adminAuditLog.deleteMany({ where: { adminId: state.adminId } });
    await prisma.admin.deleteMany({ where: { id: state.adminId } });
    for (const [key, value] of savedSettings) {
      if (value === null) await prisma.adminSetting.deleteMany({ where: { key } });
      else await prisma.adminSetting.update({ where: { key }, data: { value } });
    }
    invalidateSettingsCache();
    for (const file of [state.proofPath, state.invitationId ? invitationFile() : ""].filter(Boolean)) fs.rmSync(file, { force: true });
    await pool.end();
  });

  it("memesan paket: tanpa sesi 401, akun admin 403, klien membuat order PENDING sesuai harga paket", async () => {
    sessionUser = null;
    expect((await createOrder(json("/api/orders/create", "POST", { planType: "TIER_3" }))).status).toBe(401);

    asAdmin();
    expect((await createOrder(json("/api/orders/create", "POST", { planType: "TIER_3" }))).status).toBe(403);

    asClient(state.clientId, `${TAG}_client@t.local`);
    expect((await createOrder(json("/api/orders/create", "POST", { planType: "TIER_3" }))).status).toBe(200);
    const order = await prisma.order.findFirstOrThrow({ where: { userId: state.clientId } });
    state.orderId = order.id;
    const price = await prisma.adminSetting.findUniqueOrThrow({ where: { key: "price_tier3" } });
    expect(order.status).toBe("PENDING");
    expect(order.planType).toBe("TIER_3");
    expect(Number(order.amount)).toBe(Number(price.value));
  });

  it("undangan belum bisa dibuat sebelum lunas", async () => {
    const res = await createInvitation(json("/api/client/invitations/create", "POST", {
      eventType: "WEDDING",
      participantsJson: { groom: { name: GROOM }, bride: { name: BRIDE } },
    }));
    expect(res.status).toBe(403);
    expect(await prisma.invitation.count({ where: { userId: state.clientId } })).toBe(0);
  });

  it("transfer manual: konfirmasi, persetujuan ditolak tanpa bukti, lalu bukti diunggah", async () => {
    const confirm = await confirmOrder(json("/api/payments/checkout/confirm", "POST", { orderId: state.orderId }));
    expect(confirm.status).toBe(200);
    const confirmed = await prisma.order.findUniqueOrThrow({ where: { id: state.orderId } });
    expect(confirmed.paymentMethod).toBe("MANUAL_TRANSFER");
    expect(confirmed.status).toBe("PENDING");

    asAdmin();
    const early = await approveOrder(json(`/api/admin/orders/${state.orderId}/approve`, "POST"), { params: Promise.resolve({ orderId: state.orderId }) });
    expect(early.status).toBe(400);

    asClient(state.clientId, `${TAG}_client@t.local`);
    const png = await sharp({ create: { width: 24, height: 24, channels: 3, background: "#777" } }).png().toBuffer();
    const fd = new FormData();
    fd.set("file", new File([new Uint8Array(png)], "bukti.png", { type: "image/png" }));
    const up = await uploadProof(new Request("http://localhost/upload", { method: "POST", body: fd }), idParams(state.orderId));
    expect(up.status).toBe(200);
    const withProof = await prisma.order.findUniqueOrThrow({ where: { id: state.orderId } });
    expect(withProof.proofImageUrl).toMatch(/^private-disk:proofs\//);
    state.proofPath = path.join(process.cwd(), "data", "private", withProof.proofImageUrl!.slice("private-disk:".length));
  });

  it("persetujuan admin: klien 401, admin melunasi, klik ganda tidak mengubah apa pun", async () => {
    const call = () => approveOrder(json(`/api/admin/orders/${state.orderId}/approve`, "POST"), { params: Promise.resolve({ orderId: state.orderId }) });

    asClient(state.clientId, `${TAG}_client@t.local`);
    expect((await call()).status).toBe(401);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: state.orderId } })).status).toBe("PENDING");

    asAdmin();
    expect((await call()).status).toBe(200);
    const paid = await prisma.order.findUniqueOrThrow({ where: { id: state.orderId } });
    expect(paid.status).toBe("PAID");
    expect(paid.paidAt).not.toBeNull();

    expect((await call()).status).toBe(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: state.orderId } })).paidAt?.getTime()).toBe(paid.paidAt?.getTime());
    expect(await prisma.adminAuditLog.count({ where: { adminId: state.adminId, action: "APPROVE_MANUAL_ORDER" } })).toBe(1);
  });

  it("membuat undangan: satu draf per klien walau dikirim ulang, tertaut ke order lunas", async () => {
    asClient(state.clientId, `${TAG}_client@t.local`);
    const body = {
      eventType: "WEDDING",
      participantsJson: { groom: { name: GROOM }, bride: { name: BRIDE } },
      weddingDate: "2099-06-20",
      timeZone: "WIB",
      resepsiTime: "11:00",
      city: "Bandung",
    };
    expect((await createInvitation(json("/api/client/invitations/create", "POST", body))).status).toBe(200);
    expect((await createInvitation(json("/api/client/invitations/create", "POST", body))).status).toBe(200);

    const rows = await prisma.invitation.findMany({ where: { userId: state.clientId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("DRAFT");
    expect(rows[0].orderId).toBe(state.orderId);
    expect(rows[0].invitationSlug).toBeTruthy();
    state.invitationId = rows[0].id;
    state.slug = rows[0].invitationSlug!;
  });

  it("isolasi: klien lain 403 dan tanpa sesi 401 pada undangan ini", async () => {
    asClient(state.strangerId, `${TAG}_stranger@t.local`);
    expect((await getInvitation(json(`/api/client/invitations/${state.invitationId}`, "GET") as never, idParams(state.invitationId))).status).toBe(403);
    sessionUser = null;
    expect((await getInvitation(json(`/api/client/invitations/${state.invitationId}`, "GET") as never, idParams(state.invitationId))).status).toBe(401);
  });

  it("terbit: HTML statis dibangun berisi nama mempelai, lalu studio terkunci", async () => {
    asClient(state.clientId, `${TAG}_client@t.local`);
    const res = await putInvitation(json(`/api/client/invitations/${state.invitationId}`, "PUT", { status: "PUBLISHED" }) as never, idParams(state.invitationId));
    expect(res.status).toBe(200);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: state.invitationId } })).status).toBe("PUBLISHED");

    await vi.waitFor(() => {
      if (!fs.existsSync(invitationFile())) throw new Error("HTML terbit belum dibangun");
    }, { timeout: 30000, interval: 250 });
    const html = fs.readFileSync(invitationFile(), "utf-8");
    expect(html).toContain(GROOM);
    expect(html).toContain(BRIDE);

    const locked = await putInvitation(json(`/api/client/invitations/${state.invitationId}`, "PUT", { themeId: "bone" }) as never, idParams(state.invitationId));
    expect(locked.status).toBe(403);
  });

  it("pasca-terbit: PIN panitia terenkripsi, tamu ditambah, RSVP hanya dapat diubah oleh perangkat yang membuatnya", async () => {
    asClient(state.clientId, `${TAG}_client@t.local`);
    const pin = await putStaffPin(json(`/api/client/invitations/${state.invitationId}/staff-pin`, "PUT", { staffPin: PIN }) as never, idParams(state.invitationId));
    expect(pin.status).toBe(200);
    const stored = await prisma.invitation.findUniqueOrThrow({ where: { id: state.invitationId }, select: { staffPin: true } });
    expect(stored.staffPin).not.toBe(PIN);

    const guest = await postGuest(json("/api/client/guests", "POST", { invitationId: state.invitationId, name: "Tamu Satu" }));
    expect(guest.status).toBe(200);

    sessionUser = null;
    const rsvp = (message: string, cookie?: string) =>
      postRsvp(json("/api/public/rsvp", "POST", { invitationId: state.invitationId, guestName: "Tamu Satu", status: "hadir", guestCount: 2, message }, cookie ? { cookie } : {}));
    const first = await rsvp("Selamat");
    expect(first.status).toBe(200);
    const editCookie = (first.headers.get("set-cookie") || "").split(";")[0];
    expect(editCookie).toContain("=");

    // Nama yang sama dari perangkat tanpa cookie pemilik tidak boleh menimpa RSVP.
    expect((await rsvp("Menimpa")).status).toBe(409);
    expect((await prisma.rsvp.findFirstOrThrow({ where: { invitationId: state.invitationId } })).message).toBe("Selamat");

    // Perangkat pemilik memperbarui baris yang sama, tanpa baris baru.
    expect((await rsvp("Selamat, sampai jumpa", editCookie)).status).toBe(200);
    const rows = await prisma.rsvp.findMany({ where: { invitationId: state.invitationId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].message).toBe("Selamat, sampai jumpa");

    const bad = await postRsvp(json("/api/public/rsvp", "POST", { invitationId: state.invitationId, guestName: "Tamu Satu", status: "APA-SAJA" }));
    expect(bad.status).toBe(400);
  });

  it("resepsionis: PIN salah 401, PIN benar menerbitkan token, pindai sekali sah dan kedua idempoten", async () => {
    sessionUser = null;
    const wrong = await verifyPin(json("/api/receptionist/verify-pin", "POST", { invitationId: state.invitationId, pin: "ZZ99" }));
    expect(wrong.status).toBe(401);
    const ok = await verifyPin(json("/api/receptionist/verify-pin", "POST", { invitationId: state.invitationId, pin: PIN }));
    expect(ok.status).toBe(200);
    state.token = (await ok.json()).token;
    expect(state.token).toBeTruthy();

    const doScan = () =>
      scan(json("/api/receptionist/scan", "POST", {
        qrToken: buildCheckinPayload(state.invitationId, "Tamu Satu"),
        invitationId: state.invitationId,
        isCheckIn: true,
        token: state.token,
      }));
    const first = await (await doScan()).json();
    expect(first.success).toBe(true);
    const second = await (await doScan()).json();
    expect(second.alreadyRedeemed).toBe(true);
    expect(await prisma.guest.count({ where: { invitationId: state.invitationId, isTokenRedeemed: true } })).toBe(1);
  });

  it("tutup ke galeri: RSVP baru ditolak 410, klien tidak boleh menurunkan status sendiri", async () => {
    asClient(state.clientId, `${TAG}_client@t.local`);
    const self = await putInvitation(json(`/api/client/invitations/${state.invitationId}`, "PUT", { status: "ARCHIVED" }) as never, idParams(state.invitationId));
    expect(self.status).toBe(403);

    asAdmin();
    const close = await lifecycle(json(`/api/admin/invitations/${state.invitationId}/lifecycle`, "POST", { action: "CLOSE_TO_GALLERY" }), { params: { id: state.invitationId } });
    expect(close.status).toBe(200);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: state.invitationId } })).status).toBe("EVENT_FINISHED");

    sessionUser = null;
    const late = await postRsvp(json("/api/public/rsvp", "POST", { invitationId: state.invitationId, guestName: "Tamu Terlambat", status: "hadir" }));
    expect(late.status).toBe(410);
  });

  it("arsip oleh cron: tanpa rahasia 401, dengan rahasia status ARCHIVED dan RSVP dibersihkan", async () => {
    // Acara dimundurkan jauh melewati retention_cleanup_days; route cron memakai jam sistem.
    const past = [{ title: "Resepsi", date: "2020-01-10", time: "11:00", timezone: "WIB", isPrimary: true }];
    await prisma.invitation.update({ where: { id: state.invitationId }, data: { eventData: past } });

    sessionUser = null;
    const denied = await cronCleanup(json("/api/cron/cleanup", "POST", undefined, { authorization: "Bearer salah" }));
    expect(denied.status).toBe(401);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: state.invitationId } })).status).toBe("EVENT_FINISHED");

    const run = await cronCleanup(json("/api/cron/cleanup", "POST", undefined, { authorization: `Bearer ${CRON_SECRET}` }));
    expect(run.status).toBe(200);
    const after = await prisma.invitation.findUniqueOrThrow({ where: { id: state.invitationId } });
    expect(after.status).toBe("ARCHIVED");
    expect(await prisma.rsvp.count({ where: { invitationId: state.invitationId } })).toBe(0);
  });

  it("hapus klien oleh admin: klien 401, punya transaksi lunas 409, setelah tidak lunas admin 200 tanpa data yatim dan jejak audit tercatat", async () => {
    const del = () => deleteClient(new Request(`http://localhost/api/admin/users?id=${state.clientId}`, { method: "DELETE" }));

    asClient(state.strangerId, `${TAG}_stranger@t.local`);
    expect((await del()).status).toBe(401);
    expect(await prisma.user.count({ where: { id: state.clientId } })).toBe(1);

    // Order lunas adalah catatan keuangan: akun tidak dapat dihapus dan tidak ada yang berubah.
    asAdmin();
    const blocked = await del();
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).error).toContain("transaksi lunas");
    expect(await prisma.user.count({ where: { id: state.clientId } })).toBe(1);
    expect(await prisma.order.count({ where: { userId: state.clientId, status: "PAID" } })).toBeGreaterThan(0);

    // Setelah tidak ada lagi order lunas (mis. dikembalikan dananya), penghapusan berjalan penuh.
    await prisma.order.updateMany({ where: { userId: state.clientId }, data: { status: "EXPIRED" } });
    expect((await del()).status).toBe(200);
    expect(await prisma.user.count({ where: { id: state.clientId } })).toBe(0);
    expect(await prisma.order.count({ where: { userId: state.clientId } })).toBe(0);
    expect(await prisma.invitation.count({ where: { id: state.invitationId } })).toBe(0);
    expect(await prisma.guest.count({ where: { invitationId: state.invitationId } })).toBe(0);
    expect(await prisma.adminAuditLog.count({ where: { adminId: state.adminId, action: "DELETE_CLIENT" } })).toBe(1);
    expect((await del()).status).toBe(404);
  });
});
