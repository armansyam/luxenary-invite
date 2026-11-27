/**
 * Uji empiris integrasi (PostgreSQL nyata `luxenary_test`) untuk:
 * 1. Penutupan bypass klaim subdomain pada Draf Gratis di POST /api/client/invitations/create
 * 2. Kunci atomik race condition pembuatan Draf Gratis & partial unique index DB
 * 3. Kunci atomik race condition kuota unggah foto Draf Gratis di POST /api/client/upload
 * 4. Pembatasan guests, guests/bulk, dan staff-pin pada Draf Gratis
 * 5. Verifikasi Cloudflare Turnstile fail-closed & CSP header
 * 6. Pembersihan retensi akun leads kosong (purgeStaleLeadUsers) tanpa menyentuh klien aktif/order
 * 7. Cancel manual order mitra & hapus calon klien mitra (serta proteksi klien PAID)
 * 8. Prioritas midtrans_environment Panel Admin di atas MIDTRANS_IS_PRODUCTION .env
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const session = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (session.user ? { user: session.user } : null)) }));

const partnerSession = vi.hoisted(() => ({ current: null as null | { partnerId: string; sv: number } }));
vi.mock("@/lib/partnerAuth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/partnerAuth")>()),
  getPartnerSessionFromRequest: vi.fn(async () => partnerSession.current),
}));

const gwCancel = vi.hoisted(() => vi.fn(async (_txId: string) => ({ success: true })));
vi.mock("@/lib/gatewayRegistry", () => ({
  getGatewayById: vi.fn(async () => ({ cancel: gwCancel })),
  getActiveGateway: vi.fn(async () => ({ cancel: gwCancel })),
  getActiveGatewayId: vi.fn(async () => "midtrans"),
}));

const mailSpies = vi.hoisted(() => ({
  sendLoginOtpEmail: vi.fn(async (_opts?: Record<string, unknown>) => ({ success: true })),
  sendInvoiceEmail: vi.fn(async (_opts?: Record<string, unknown>) => ({ success: true })),
  sendClientActivationEmail: vi.fn(async (_opts?: Record<string, unknown>) => ({ success: true })),
}));
vi.mock("@/lib/mailer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mailer")>()),
  sendLoginOtpEmail: mailSpies.sendLoginOtpEmail,
  sendInvoiceEmail: mailSpies.sendInvoiceEmail,
  sendClientActivationEmail: mailSpies.sendClientActivationEmail,
}));

import { prisma, pool } from "@/lib/prisma";
import { invalidateSettingsCache } from "@/lib/settings";
import { POST as createFreeDraft } from "@/app/api/client/invitations/free-draft/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { POST as uploadMedia } from "@/app/api/client/upload/route";
import { POST as addGuest } from "@/app/api/client/guests/route";
import { POST as bulkGuests } from "@/app/api/client/guests/bulk/route";
import { PUT as updateGuest, DELETE as deleteGuest } from "@/app/api/client/guests/[id]/route";
import { PATCH as patchRsvp, DELETE as deleteRsvp } from "@/app/api/client/rsvps/[id]/route";
import { DELETE as deleteGiftClaim } from "@/app/api/client/gift-claims/[id]/route";
import { POST as saveCustomDomain } from "@/app/api/client/custom-domain/route";
import { PUT as putStaffPin } from "@/app/api/client/invitations/[id]/staff-pin/route";
import { PUT as putInvitation, PATCH as patchInvitation } from "@/app/api/client/invitations/[id]/route";
import { PATCH as patchMemories } from "@/app/api/client/invitations/[id]/memories/route";
import { POST as createOrder } from "@/app/api/orders/create/route";
import { POST as confirmCheckout } from "@/app/api/payments/checkout/confirm/route";
import { GET as getClientOrders } from "@/app/api/client/orders/route";
import { GET as getClientOrderStatus } from "@/app/api/client/orders/[id]/status/route";
import { POST as cancelClientOrder } from "@/app/api/client/orders/[id]/cancel/route";
import { POST as checkoutBundle } from "@/app/api/client/orders/checkout-bundle/route";
import { POST as paymentsUpgrade } from "@/app/api/payments/upgrade/route";
import { POST as otpRequest } from "@/app/api/auth/otp/request/route";
import { GET as getPartnerClients } from "@/app/api/partner/clients/route";
import { GET as partnerOrderStatus } from "@/app/api/partner/orders/[id]/status/route";
import { POST as partnerCancelOrder } from "@/app/api/partner/orders/[id]/cancel/route";
import { DELETE as partnerDeleteClient } from "@/app/api/partner/clients/[id]/route";
import { purgeStaleLeadUsers } from "@/lib/lifecycleCleanup";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { buildEnforcedCsp, buildStrictAppCspReportOnly, generateCspNonce } from "@/lib/csp";
import { MidtransGateway } from "@/lib/gateways/midtrans";
import { settleOrderAsPaid } from "@/lib/paymentSettlement";
import { applyUpgradePlan } from "@/lib/upgradeHelper";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `sec261127_${Date.now()}`;
const DAY_MS = 24 * 60 * 60 * 1000;

const createdUserIds: string[] = [];
const createdInvIds: string[] = [];
const createdPartnerIds: string[] = [];
const dirsToClean: string[] = [];
let seq = 0;

function jsonReq(url: string, method: string, body?: unknown, ip = `10.99.0.${(seq++ % 200) + 1}`) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": ip,
      "x-real-ip": ip,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function makeUser(label: string, extra: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: {
      email: `${TAG}_${label}_${seq++}@example.test`,
      name: `Uji ${label}`,
      role: "CLIENT",
      ...extra,
    } as never,
  });
  createdUserIds.push(user.id);
  return user;
}

function asClient(u: { id: string; email: string; name: string }) {
  session.user = { id: u.id, email: u.email, name: u.name, role: "CLIENT", isAdmin: false };
}

describe.skipIf(!IS_TEST_DB)("Security & Partner Portal Hardening (2026-11-27)", () => {
  let weddingThemeId = "kalandra";
  const savedEnv = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET: process.env.TURNSTILE_SECRET,
    TURNSTILE_HOSTNAMES: process.env.TURNSTILE_HOSTNAMES,
    MIDTRANS_IS_PRODUCTION: process.env.MIDTRANS_IS_PRODUCTION,
    MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  };
  let origMidtransEnv: string | null = null;
  let origSandboxKey: string | null = null;

  beforeAll(async () => {
    if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "vitest-auth-secret-32-chars-minimum";
    const theme = await prisma.theme.findFirst({ where: { isActive: true, eventType: "WEDDING" }, select: { id: true } });
    if (theme) weddingThemeId = theme.id;
    origMidtransEnv = (await prisma.adminSetting.findUnique({ where: { key: "midtrans_environment" } }))?.value ?? null;
    origSandboxKey = (await prisma.adminSetting.findUnique({ where: { key: "midtrans_sandbox_server_key" } }))?.value ?? null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.AUTH_SECRET = savedEnv.AUTH_SECRET || "vitest-auth-secret-32-chars-minimum";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = savedEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    process.env.TURNSTILE_SECRET = savedEnv.TURNSTILE_SECRET;
    process.env.TURNSTILE_HOSTNAMES = savedEnv.TURNSTILE_HOSTNAMES;
    process.env.MIDTRANS_IS_PRODUCTION = savedEnv.MIDTRANS_IS_PRODUCTION;
    process.env.MIDTRANS_SERVER_KEY = savedEnv.MIDTRANS_SERVER_KEY;
    process.env.STORAGE_PROVIDER = savedEnv.STORAGE_PROVIDER;
  });

  afterAll(async () => {
    session.user = null;
    partnerSession.current = null;
    await prisma.emailOtpToken.deleteMany({ where: { email: { startsWith: TAG } } });
    await prisma.guest.deleteMany({ where: { invitationId: { in: createdInvIds } } });
    await prisma.invitationMedia.deleteMany({ where: { invitationId: { in: createdInvIds } } });
    await prisma.invitation.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.order.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.partnerAffiliate.deleteMany({ where: { id: { in: createdPartnerIds } } });
    if (origMidtransEnv === null) await prisma.adminSetting.deleteMany({ where: { key: "midtrans_environment" } });
    else await prisma.adminSetting.upsert({ where: { key: "midtrans_environment" }, create: { key: "midtrans_environment", value: origMidtransEnv }, update: { value: origMidtransEnv } });
    if (origSandboxKey === null) await prisma.adminSetting.deleteMany({ where: { key: "midtrans_sandbox_server_key" } });
    else await prisma.adminSetting.upsert({ where: { key: "midtrans_sandbox_server_key" }, create: { key: "midtrans_sandbox_server_key", value: origSandboxKey }, update: { value: origSandboxKey } });
    invalidateSettingsCache();
    for (const d of dirsToClean) fs.rmSync(d, { recursive: true, force: true });
    await prisma.$disconnect();
    await pool.end();
  });

  it("1. Draf Gratis TIDAK bisa membypass blokade subdomain lewat POST /api/client/invitations/create", async () => {
    const u = await makeUser("subbypass");
    asClient(u);

    const fdRes = await createFreeDraft(jsonReq("/api/client/invitations/free-draft", "POST", { eventType: "WEDDING", themeId: weddingThemeId }));
    expect(fdRes.status).toBe(201);
    const fdBody = await fdRes.json();
    const invId = fdBody.invitation.id as string;
    createdInvIds.push(invId);

    const squatRes = await createInvitation(
      jsonReq("/api/client/invitations/create", "POST", {
        eventType: "WEDDING",
        themeId: weddingThemeId,
        subdomain: `${TAG}-squat`,
        participantsJson: { groom: { name: "Andi" }, bride: { name: "Sari" } },
      }),
    );
    expect(squatRes.status).toBe(403);

    const stored = await prisma.invitation.findUniqueOrThrow({ where: { id: invId } });
    expect(stored.subdomain).toBeNull();
    expect(stored.invitationSlug).toMatch(/^draf-/);
    expect(stored.isFreeDraft).toBe(true);
  });

  it("2. Enam permintaan paralel POST /api/client/invitations/free-draft hanya membuat tepat 1 Draf Gratis (advisory lock + partial unique index)", async () => {
    const u = await makeUser("fdrace");
    asClient(u);

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        createFreeDraft(jsonReq("/api/client/invitations/free-draft", "POST", { eventType: "WEDDING", themeId: weddingThemeId })),
      ),
    );
    const statuses = responses.map((r) => r.status);
    expect(statuses.every((s) => s === 200 || s === 201)).toBe(true);
    const payloads = await Promise.all(responses.map((r) => r.json()));
    const ids = new Set(payloads.map((p) => p.invitation?.id));
    expect(ids.size).toBe(1);

    const freeDrafts = await prisma.invitation.findMany({ where: { userId: u.id, isFreeDraft: true } });
    expect(freeDrafts).toHaveLength(1);
    createdInvIds.push(freeDrafts[0].id);

    // Verifikasi partial unique index di PostgreSQL menolak baris duplikat langsung.
    await expect(
      prisma.invitation.create({
        data: {
          userId: u.id,
          themeId: weddingThemeId,
          invitationSlug: `${TAG}-dup-direct`,
          isFreeDraft: true,
          status: "DRAFT",
        },
      }),
    ).rejects.toThrow();
  });

  it("3. Lima unggahan foto paralel pada Draf Gratis terkunci atomik maksimal 3 foto", async () => {
    process.env.STORAGE_PROVIDER = "local";
    const u = await makeUser("uploadrace");
    asClient(u);

    const fdRes = await createFreeDraft(jsonReq("/api/client/invitations/free-draft", "POST", { eventType: "WEDDING", themeId: weddingThemeId }));
    const invId = (await fdRes.json()).invitation.id as string;
    createdInvIds.push(invId);
    const uploadDir = path.join(process.cwd(), "public", "uploads", "invitations", invId);
    dirsToClean.push(uploadDir);

    const pngBuf = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#a16207" } }).png().toBuffer();
    const slots = ["LANDING_COVER", "HOME_PHOTO", "GROOM_PHOTO", "BRIDE_PHOTO", "GALLERY_1"];

    const results = await Promise.all(
      slots.map((slot, idx) => {
        const fd = new FormData();
        fd.set("invitationId", invId);
        fd.set("slot", slot);
        fd.set("file", new File([new Uint8Array(pngBuf)], `p${idx}.png`, { type: "image/png" }));
        return uploadMedia(
          new NextRequest("http://localhost/api/client/upload", {
            method: "POST",
            headers: { "cf-connecting-ip": `10.88.1.${idx + 1}` },
            body: fd,
          }),
        );
      }),
    );

    const okCount = results.filter((r) => r.status === 200).length;
    const blockedCount = results.filter((r) => r.status === 403).length;
    expect(okCount).toBe(3);
    expect(blockedCount).toBe(2);

    const diskFiles = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
    expect(diskFiles).toHaveLength(3);
  });

  it("4. Draf Gratis diblokir di guests, guests/bulk, staff-pin, dan PUT invitation staffPin", async () => {
    const u = await makeUser("fdgates");
    asClient(u);

    const fdRes = await createFreeDraft(jsonReq("/api/client/invitations/free-draft", "POST", { eventType: "WEDDING", themeId: weddingThemeId }));
    const invId = (await fdRes.json()).invitation.id as string;
    createdInvIds.push(invId);

    const g1 = await addGuest(jsonReq("/api/client/guests", "POST", { invitationId: invId, name: "Tamu Gratis" }));
    expect(g1.status).toBe(403);
    expect((await g1.json()).code).toBe("FREE_DRAFT_GUESTS_BLOCKED");

    const gBulk = await bulkGuests(jsonReq("/api/client/guests/bulk", "POST", { invitationId: invId, guests: [{ name: "A" }, { name: "B" }] }));
    expect(gBulk.status).toBe(403);
    expect((await gBulk.json()).code).toBe("FREE_DRAFT_GUESTS_BLOCKED");

    const pin1 = await putStaffPin(
      jsonReq(`/api/client/invitations/${invId}/staff-pin`, "PUT", { staffPin: "ABCD" }) as never,
      { params: Promise.resolve({ id: invId }) },
    );
    expect(pin1.status).toBe(403);
    expect((await pin1.json()).code).toBe("FREE_DRAFT_STAFF_PIN_BLOCKED");

    const pin2 = await putInvitation(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", { staffPin: "ABCD" }) as never,
      { params: Promise.resolve({ id: invId }) },
    );
    expect(pin2.status).toBe(403);
    expect((await pin2.json()).code).toBe("FREE_DRAFT_STAFF_PIN_BLOCKED");

    expect(await prisma.guest.count({ where: { invitationId: invId } })).toBe(0);
  });

  it("5. Turnstile OTP fail-closed, menolak token kosong/action salah/hostname salah, meloloskan token valid, dan CSP mengizinkan challenges.cloudflare.com", async () => {
    // Cek CSP
    expect(buildEnforcedCsp()).toContain("https://challenges.cloudflare.com");
    expect(buildStrictAppCspReportOnly(generateCspNonce())).toContain("https://challenges.cloudflare.com");

    // Partial config -> fail-closed
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "";
    process.env.TURNSTILE_SECRET = "secret-only";
    expect((await verifyTurnstileToken({ token: "abc", expectedAction: "client_register_otp" })).ok).toBe(false);

    // Full config
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "0x4AAAAAAA_TEST";
    process.env.TURNSTILE_SECRET = "0x4AAAAAAA_SECRET";
    process.env.TURNSTILE_HOSTNAMES = "localhost";

    // Tanpa token di endpoint OTP -> 403 TURNSTILE_FAILED
    const email = `${TAG}_turnstile@example.test`;
    const missingTok = await otpRequest(jsonReq("/api/auth/otp/request", "POST", { email, purpose: "CLIENT_REGISTER" }));
    expect(missingTok.status).toBe(403);
    expect((await missingTok.json()).code).toBe("TURNSTILE_FAILED");

    // Mock siteverify: action salah -> 403
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, action: "wrong_action", hostname: "localhost" }), { status: 200 }),
    );
    const wrongAct = await otpRequest(
      jsonReq("/api/auth/otp/request", "POST", { email, purpose: "CLIENT_REGISTER", turnstileToken: "tok-bad-act" }),
    );
    expect(wrongAct.status).toBe(403);

    // Mock siteverify: hostname salah -> 403
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, action: "client_register_otp", hostname: "evil.example" }), { status: 200 }),
    );
    const wrongHost = await otpRequest(
      jsonReq("/api/auth/otp/request", "POST", { email, purpose: "CLIENT_REGISTER", turnstileToken: "tok-bad-host" }),
    );
    expect(wrongHost.status).toBe(403);

    // Mock siteverify: valid -> 200
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, action: "client_register_otp", hostname: "localhost" }), { status: 200 }),
    );
    const okRes = await otpRequest(
      jsonReq("/api/auth/otp/request", "POST", { email, purpose: "CLIENT_REGISTER", turnstileToken: "tok-good" }),
    );
    expect(okRes.status).toBe(200);
  });

  it("6. purgeStaleLeadUsers hanya menghapus akun leads kosong > 90 hari, tidak menyentuh akun baru/punya order/punya undangan", async () => {
    const now = new Date();
    const oldDate = new Date(now.getTime() - 100 * DAY_MS);
    const freshDate = new Date(now.getTime() - 10 * DAY_MS);

    const staleLead = await makeUser("stalelead", { createdAt: oldDate });
    const freshLead = await makeUser("freshlead", { createdAt: freshDate });
    const withDraft = await makeUser("withdraft", { createdAt: oldDate });
    const withPaid = await makeUser("withpaid", { createdAt: oldDate });

    const inv = await prisma.invitation.create({
      data: { userId: withDraft.id, themeId: weddingThemeId, invitationSlug: `${TAG}-keep-draft`, isFreeDraft: true, status: "DRAFT" },
    });
    createdInvIds.push(inv.id);
    await prisma.order.create({
      data: { userId: withPaid.id, invoiceNumber: `${TAG}-KEEP-PAID`, planType: "TIER_1", amount: 99000, status: "PAID", paidAt: oldDate },
    });

    const scope = [staleLead.id, freshLead.id, withDraft.id, withPaid.id];
    const dryCount = await purgeStaleLeadUsers(now, true, scope);
    expect(dryCount).toBe(1);

    const purgedCount = await purgeStaleLeadUsers(now, false, scope);
    expect(purgedCount).toBe(1);

    expect(await prisma.user.findUnique({ where: { id: staleLead.id } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: freshLead.id } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: withDraft.id } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: withPaid.id } })).not.toBeNull();
  });

  it("7. Mitra dapat membatalkan order PENDING & menghapus calon klien belum bayar, tetapi tidak bisa menghapus klien PAID", async () => {
    const partner = await prisma.partnerAffiliate.create({
      data: {
        name: "WO Uji Cancel",
        email: `${TAG}_partner@example.test`,
        commissionType: "PERCENT",
        commissionValue: 20,
        isActive: true,
        sessionVersion: 1,
      },
    });
    createdPartnerIds.push(partner.id);
    partnerSession.current = { partnerId: partner.id, sv: 1 };

    // Klien belum bayar
    const unpaidClient = await makeUser("partnerunpaid", { provisionedByPartnerId: partner.id, passwordHash: null });
    const pendingOrder = await prisma.order.create({
      data: {
        userId: unpaidClient.id,
        invoiceNumber: `INV-WO-${TAG}-PEND`,
        planType: "TIER_1",
        amount: 50000,
        status: "PENDING",
        gatewayId: "midtrans",
        gatewayTxId: `tx-${TAG}`,
        gatewayQrString: "000201010212...",
      },
    });

    gwCancel.mockClear();
    const cancelRes = await partnerCancelOrder(
      jsonReq(`/api/partner/orders/${pendingOrder.id}/cancel`, "POST"),
      { params: Promise.resolve({ id: pendingOrder.id }) },
    );
    expect(cancelRes.status).toBe(200);
    expect(gwCancel).toHaveBeenCalledWith(`tx-${TAG}`);

    const afterCancel = await prisma.order.findUniqueOrThrow({ where: { id: pendingOrder.id } });
    expect(afterCancel.status).toBe("EXPIRED");
    expect(afterCancel.gatewayQrString).toBeNull();

    const delUnpaid = await partnerDeleteClient(
      jsonReq(`/api/partner/clients/${unpaidClient.id}`, "DELETE"),
      { params: Promise.resolve({ id: unpaidClient.id }) },
    );
    expect(delUnpaid.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: unpaidClient.id } })).toBeNull();

    // Klien PAID wajib dilindungi 409
    const paidClient = await makeUser("partnerpaid", { provisionedByPartnerId: partner.id, passwordHash: null });
    await prisma.order.create({
      data: {
        userId: paidClient.id,
        invoiceNumber: `INV-WO-${TAG}-PAID`,
        planType: "TIER_1",
        amount: 50000,
        status: "PAID",
        paidAt: new Date(),
      },
    });
    const delPaid = await partnerDeleteClient(
      jsonReq(`/api/partner/clients/${paidClient.id}`, "DELETE"),
      { params: Promise.resolve({ id: paidClient.id }) },
    );
    expect(delPaid.status).toBe(409);
    expect(await prisma.user.findUnique({ where: { id: paidClient.id } })).not.toBeNull();
  });

  it("8. MidtransGateway memprioritaskan midtrans_environment di Panel Admin daripada MIDTRANS_IS_PRODUCTION di .env", async () => {
    await prisma.adminSetting.upsert({
      where: { key: "midtrans_environment" },
      create: { key: "midtrans_environment", value: "sandbox", group: "payment" },
      update: { value: "sandbox" },
    });
    await prisma.adminSetting.upsert({
      where: { key: "midtrans_sandbox_server_key" },
      create: { key: "midtrans_sandbox_server_key", value: "SB-Mid-server-TESTKEY", group: "payment" },
      update: { value: "SB-Mid-server-TESTKEY" },
    });
    process.env.MIDTRANS_IS_PRODUCTION = "true";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ transaction_status: "pending", gross_amount: "5000.00" }), { status: 200 }),
    );

    const gw = new MidtransGateway();
    await gw.verify("00000000-0000-4000-8000-000000000001");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchSpy.mock.calls[0]?.[0] || "");
    expect(calledUrl).toContain("https://api.sandbox.midtrans.com/v2/");
  });

  it("9. Pelunasan order Mitra WO mengirim invoice harga grosir ke email Mitra (bukan pengantin) dan tepat 1 email aktivasi ke pengantin", async () => {
    mailSpies.sendInvoiceEmail.mockClear();
    mailSpies.sendClientActivationEmail.mockClear();

    const partner = await prisma.partnerAffiliate.create({
      data: {
        name: "WO Privasi Harga",
        email: `${TAG}_wo_privacy@example.test`,
        commissionType: "PERCENT",
        commissionValue: 95,
        isActive: true,
        sessionVersion: 1,
      },
    });
    createdPartnerIds.push(partner.id);

    const bride = await makeUser("brideprivacy", { provisionedByPartnerId: partner.id, passwordHash: null });
    const order = await prisma.order.create({
      data: {
        userId: bride.id,
        invoiceNumber: `INV-WO-${TAG}-PRIV`,
        planType: "TIER_1",
        orderType: "NEW",
        amount: 4950,
        discountAmount: 94050,
        status: "PENDING",
      },
    });

    const settled = await settleOrderAsPaid(order.id, { paymentMethod: "GATEWAY" });
    expect(settled).toBe(true);
    await applyUpgradePlan(order.id);
    // Beri jeda singkat bagi promise non-blocking triggerPartnerClientActivationOnPaid & sendInvoiceEmail
    await new Promise((r) => setTimeout(r, 150));

    // 1. Invoice harga grosir (Rp 4.950) WAJIB dikirim ke email Mitra, TIDAK ke email pengantin
    expect(mailSpies.sendInvoiceEmail).toHaveBeenCalledTimes(1);
    const invoiceCall = mailSpies.sendInvoiceEmail.mock.calls[0]?.[0] as { recipientEmail?: string; amount?: number };
    expect(invoiceCall?.recipientEmail).toBe(partner.email);
    expect(invoiceCall?.recipientEmail).not.toBe(bride.email);
    expect(invoiceCall?.amount).toBe(4950);

    // 2. Email aktivasi dikirim tepat 1 kali ke email pengantin dengan 1 token aktif
    expect(mailSpies.sendClientActivationEmail).toHaveBeenCalledTimes(1);
    const actCall = mailSpies.sendClientActivationEmail.mock.calls[0]?.[0] as { recipientEmail?: string };
    expect(actCall?.recipientEmail).toBe(bride.email);
    expect(await prisma.clientActivationToken.count({ where: { userId: bride.id, consumedAt: null } })).toBe(1);
  });

  it("10. Pembelian undangan ke-2 oleh klien eks-mitra memakai harga normal (tanpa diskon grosir) dan invoice PAID dikirim ke klien", async () => {
    mailSpies.sendInvoiceEmail.mockClear();
    mailSpies.sendClientActivationEmail.mockClear();

    const priceSetting = await prisma.adminSetting.findUnique({ where: { key: "price_tier1" } });
    const regularTier1Price = Number(priceSetting?.value || 99000);

    const partner = await prisma.partnerAffiliate.create({
      data: {
        name: "WO Isolasi Diskon",
        email: `${TAG}_wo_iso@example.test`,
        commissionType: "PERCENT",
        commissionValue: 95,
        isActive: true,
        sessionVersion: 1,
      },
    });
    createdPartnerIds.push(partner.id);

    const bride = await makeUser("bride2nd", { provisionedByPartnerId: partner.id });
    const firstOrder = await prisma.order.create({
      data: {
        userId: bride.id,
        invoiceNumber: `INV-WO-${TAG}-FIRST`,
        planType: "TIER_1",
        orderType: "NEW",
        amount: 4950,
        discountAmount: Math.max(0, regularTier1Price - 4950),
        status: "PAID",
        paidAt: new Date(),
      },
    });
    const theme = await prisma.theme.findFirstOrThrow({ where: { isActive: true, eventType: "WEDDING" }, select: { id: true } });
    const firstInv = await prisma.invitation.create({
      data: {
        userId: bride.id,
        orderId: firstOrder.id,
        themeId: theme.id,
        invitationSlug: `${TAG}-bride-first`,
        eventType: "WEDDING",
        status: "PUBLISHED",
        isFreeDraft: false,
      },
    });
    createdInvIds.push(firstInv.id);

    session.user = { id: bride.id, email: bride.email, role: "CLIENT" };

    const createRes = await createOrder(jsonReq("/api/orders/create", "POST", { planType: "TIER_1", allowAdditional: true }));
    expect(createRes.status).toBe(200);
    const createdOrderBody = await createRes.json();
    expect(String(createdOrderBody.invoiceNumber)).toMatch(/^INV-LUX-/);
    expect(createdOrderBody.amount).toBe(regularTier1Price);
    expect(createdOrderBody.partnerDiscount).toBeNull();

    const confirmRes = await confirmCheckout(jsonReq("/api/payments/checkout/confirm", "POST", { orderId: createdOrderBody.orderId }));
    expect(confirmRes.status).toBe(200);
    const confirmedBody = await confirmRes.json();
    expect(confirmedBody.amount).toBe(regularTier1Price);
    expect(confirmedBody.discountAmount).toBe(0);

    const settled = await settleOrderAsPaid(createdOrderBody.orderId, { paymentMethod: "GATEWAY" });
    expect(settled).toBe(true);
    await applyUpgradePlan(createdOrderBody.orderId);
    await new Promise((r) => setTimeout(r, 100));

    // Invoice undangan ke-2 (INV-LUX-...) WAJIB masuk ke email klien, bukan email mitra
    expect(mailSpies.sendInvoiceEmail).toHaveBeenCalledTimes(1);
    const invoiceCall = mailSpies.sendInvoiceEmail.mock.calls[0]?.[0] as { recipientEmail?: string; amount?: number };
    expect(invoiceCall?.recipientEmail).toBe(bride.email);
    expect(invoiceCall?.recipientEmail).not.toBe(partner.email);
    expect(invoiceCall?.amount).toBe(regularTier1Price);
    expect(mailSpies.sendClientActivationEmail).not.toHaveBeenCalled();
  });

  it("11. Isolasi API tagihan 2 arah: klien tidak melihat harga INV-WO-... dan mitra tidak melihat/mengganggu order pribadi klien", async () => {
    const partner = await prisma.partnerAffiliate.create({
      data: {
        name: "WO Isolasi API",
        email: `${TAG}_wo_api@example.test`,
        commissionType: "PERCENT",
        commissionValue: 80,
        isActive: true,
        sessionVersion: 1,
      },
    });
    createdPartnerIds.push(partner.id);

    const bride = await makeUser("brideapi", { provisionedByPartnerId: partner.id });
    const woPaid = await prisma.order.create({
      data: {
        userId: bride.id,
        invoiceNumber: `INV-WO-${TAG}-API1`,
        planType: "TIER_2",
        orderType: "NEW",
        amount: 39800,
        chargedAmount: 40079,
        discountAmount: 159200,
        status: "PAID",
        paidAt: new Date(),
        fulfilledAt: new Date(),
      },
    });
    const woPending = await prisma.order.create({
      data: {
        userId: bride.id,
        invoiceNumber: `INV-WO-${TAG}-APIP`,
        planType: "TIER_1",
        orderType: "NEW",
        amount: 19800,
        status: "PENDING",
      },
    });
    const clientSelfOrder = await prisma.order.create({
      data: {
        userId: bride.id,
        invoiceNumber: `INV-LUX-${TAG}-SELF`,
        planType: "TIER_1",
        orderType: "NEW",
        amount: 99000,
        status: "PENDING",
      },
    });

    // Sisi klien: GET /api/client/orders menyembunyikan seluruh INV-WO-...
    session.user = { id: bride.id, email: bride.email, role: "CLIENT" };
    const ordersRes = await getClientOrders();
    expect(ordersRes.status).toBe(200);
    const ordersList = (await ordersRes.json()) as Array<{ invoiceNumber: string }>;
    expect(ordersList.map((o) => o.invoiceNumber)).toEqual([clientSelfOrder.invoiceNumber]);

    // Sisi klien: GET /api/client/orders/[id]/status menyamarkan harga grosir INV-WO-... tapi tetap mengirim status & planType
    const woStatusRes = await getClientOrderStatus(
      jsonReq(`/api/client/orders/${woPaid.id}/status`, "GET"),
      { params: Promise.resolve({ id: woPaid.id }) },
    );
    expect(woStatusRes.status).toBe(200);
    const woStatusBody = await woStatusRes.json();
    expect(woStatusBody.isPartnerBilled).toBe(true);
    expect(woStatusBody.status).toBe("PAID");
    expect(woStatusBody.planType).toBe("TIER_2");
    expect(woStatusBody.invoiceNumber).toBeNull();
    expect(woStatusBody.amount).toBeNull();
    expect(woStatusBody.chargedAmount).toBeNull();
    expect(woStatusBody.discountAmount).toBe(0);
    expect(woStatusBody.partnerDiscount).toBeNull();

    // Sisi klien dilarang membatalkan/mengonfirmasi tagihan INV-WO-...
    const clientCancelWo = await cancelClientOrder(
      jsonReq(`/api/client/orders/${woPending.id}/cancel`, "POST"),
      { params: Promise.resolve({ id: woPending.id }) },
    );
    expect(clientCancelWo.status).toBe(403);

    const clientConfirmWo = await confirmCheckout(
      jsonReq("/api/payments/checkout/confirm", "POST", { orderId: woPending.id }),
    );
    expect(clientConfirmWo.status).toBe(403);

    // Sisi mitra: GET /api/partner/clients hanya memuat order INV-WO-... (tidak tertimpa INV-LUX-... klien)
    partnerSession.current = { partnerId: partner.id, sv: 1 };
    const pClientsRes = await getPartnerClients(jsonReq("/api/partner/clients", "GET"));
    expect(pClientsRes.status).toBe(200);
    const pClientsBody = (await pClientsRes.json()) as {
      clients: Array<{ id: string; latestOrder: { invoiceNumber: string } | null }>;
    };
    const row = pClientsBody.clients.find((c) => c.id === bride.id);
    expect(row?.latestOrder?.invoiceNumber).toMatch(/^INV-WO-/);

    // Sisi mitra: status/cancel terhadap INV-LUX-... pribadi klien WAJIB 404
    const pStatusSelf = await partnerOrderStatus(
      jsonReq(`/api/partner/orders/${clientSelfOrder.id}/status`, "GET"),
      { params: Promise.resolve({ id: clientSelfOrder.id }) },
    );
    expect(pStatusSelf.status).toBe(404);

    const pCancelSelf = await partnerCancelOrder(
      jsonReq(`/api/partner/orders/${clientSelfOrder.id}/cancel`, "POST"),
      { params: Promise.resolve({ id: clientSelfOrder.id }) },
    );
    expect(pCancelSelf.status).toBe(404);
  });

  it("12. Status ARCHIVED mengunci edit Studio, PATCH pengaturan, PATCH galeri, serta pembelian upgrade/add-on", async () => {
    const owner = await makeUser("archivedlock");
    const paidOrder = await prisma.order.create({
      data: {
        userId: owner.id,
        invoiceNumber: `INV-LUX-${TAG}-ARC`,
        planType: "TIER_1",
        orderType: "NEW",
        amount: 99000,
        status: "PAID",
        paidAt: new Date(),
      },
    });
    const theme = await prisma.theme.findFirstOrThrow({ where: { isActive: true, eventType: "WEDDING" }, select: { id: true } });
    // Sengaja gunakan tanggal acara masa depan untuk memastikan status ARCHIVED tetap mengunci tanpa bergantung tanggal lewat.
    const archivedInv = await prisma.invitation.create({
      data: {
        userId: owner.id,
        orderId: paidOrder.id,
        themeId: theme.id,
        invitationSlug: `${TAG}-archived-lock`,
        eventType: "WEDDING",
        status: "ARCHIVED",
        isFreeDraft: false,
        eventData: [{ title: "Resepsi", date: "2028-12-20", timezone: "WIB", isPrimary: true }],
      },
    });
    createdInvIds.push(archivedInv.id);

    session.user = { id: owner.id, email: owner.email, role: "CLIENT" };

    const putRes = await putInvitation(
      jsonReq(`/api/client/invitations/${archivedInv.id}`, "PUT", { openingQuote: "Coba ubah" }),
      { params: Promise.resolve({ id: archivedInv.id }) },
    );
    expect(putRes.status).toBe(403);

    const patchRes = await patchInvitation(
      jsonReq(`/api/client/invitations/${archivedInv.id}`, "PATCH", { featureSettings: { showStory: false } }),
      { params: Promise.resolve({ id: archivedInv.id }) },
    );
    expect(patchRes.status).toBe(403);

    const memPatchRes = await patchMemories(
      jsonReq(`/api/client/invitations/${archivedInv.id}/memories`, "PATCH", { showGuestMemories: true }),
      { params: Promise.resolve({ id: archivedInv.id }) },
    );
    expect(memPatchRes.status).toBe(403);

    const bundleRes = await checkoutBundle(
      jsonReq("/api/client/orders/checkout-bundle", "POST", { invitationId: archivedInv.id, targetPlan: "TIER_2" }),
    );
    expect(bundleRes.status).toBe(400);

    const upgradeRes = await paymentsUpgrade(
      jsonReq("/api/payments/upgrade", "POST", { invitationId: archivedInv.id, targetPlan: "TIER_2" }),
    );
    expect(upgradeRes.status).toBe(400);

    // Tambahan: tamu, RSVP, klaim kado, dan tautan custom domain baru juga ditolak 403 saat ARCHIVED
    const addGuestRes = await addGuest(
      jsonReq("/api/client/guests", "POST", { invitationId: archivedInv.id, name: "Tamu Arsip" }),
    );
    expect(addGuestRes.status).toBe(403);

    const bulkGuestRes = await bulkGuests(
      jsonReq("/api/client/guests/bulk", "POST", { invitationId: archivedInv.id, guests: [{ name: "Tamu Impor" }] }),
    );
    expect(bulkGuestRes.status).toBe(403);

    const guestRow = await prisma.guest.create({
      data: { invitationId: archivedInv.id, name: "Tamu Lama", slug: `${TAG}-tamu-lama`, qrToken: `${TAG}-qr` },
    });
    const putGuestRes = await updateGuest(
      jsonReq(`/api/client/guests/${guestRow.id}`, "PUT", { name: "Diubah" }),
      { params: Promise.resolve({ id: guestRow.id }) },
    );
    expect(putGuestRes.status).toBe(403);

    const delGuestRes = await deleteGuest(
      jsonReq(`/api/client/guests/${guestRow.id}`, "DELETE"),
      { params: Promise.resolve({ id: guestRow.id }) },
    );
    expect(delGuestRes.status).toBe(403);

    const rsvpRow = await prisma.rsvp.create({
      data: { invitationId: archivedInv.id, guestName: "Pengirim Doa", status: "hadir", message: "Selamat" },
    });
    const patchRsvpRes = await patchRsvp(
      jsonReq(`/api/client/rsvps/${rsvpRow.id}`, "PATCH", { isHidden: true }),
      { params: Promise.resolve({ id: rsvpRow.id }) },
    );
    expect(patchRsvpRes.status).toBe(403);

    const delRsvpRes = await deleteRsvp(
      jsonReq(`/api/client/rsvps/${rsvpRow.id}`, "DELETE"),
      { params: Promise.resolve({ id: rsvpRow.id }) },
    );
    expect(delRsvpRes.status).toBe(403);

    const claimRow = await prisma.giftClaim.create({
      data: { invitationId: archivedInv.id, itemId: "item-1", guestName: "Tamu Kado", quantity: 1 },
    });
    const delClaimRes = await deleteGiftClaim(
      jsonReq(`/api/client/gift-claims/${claimRow.id}`, "DELETE"),
      { params: Promise.resolve({ id: claimRow.id }) },
    );
    expect(delClaimRes.status).toBe(403);

    const tier3Order = await prisma.order.update({ where: { id: paidOrder.id }, data: { planType: "TIER_3" } });
    expect(tier3Order.planType).toBe("TIER_3");
    const domainRes = await saveCustomDomain(
      jsonReq("/api/client/custom-domain", "POST", { invitationId: archivedInv.id, customDomain: "arsip-baru.example.com" }),
    );
    expect(domainRes.status).toBe(403);
  });
});
