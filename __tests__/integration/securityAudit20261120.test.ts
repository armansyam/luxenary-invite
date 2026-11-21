/**
 * Regression tests for Security, Subdomain/Custom-Domain, Payment, Finance,
 * Partner Session Revocation, Public Draft Lock, & Free Draft EventType Overhaul (2026-11-20).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const TEST_DB = process.env.DATABASE_URL || "";
const IS_TEST_DB = /_test\b/i.test(TEST_DB);

let activeSession: any = null;
let activeAdminGuard: any = {
  ok: true,
  session: {
    user: {
      id: "admin-audit-test",
      email: "admin-audit@luxvite.test",
      role: "SUPER_ADMIN",
      isAdmin: true,
      isRemote: false,
    },
  },
};

vi.mock("@/auth", () => ({
  auth: async () => activeSession,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/adminAuth", () => ({
  requireAdminModule: async () => activeAdminGuard,
  requireAnyAdmin: async () => activeAdminGuard,
  adminActorId: (s: { user?: { id?: string } }) => s?.user?.id || "admin-audit-test",
}));

import { prisma, pool } from "@/lib/prisma";
import { PARTNER_COOKIE_NAME, signPartnerSession } from "@/lib/partnerAuth";
import { createAndStoreOtp } from "@/lib/emailOtp";
import { MidtransGateway } from "@/lib/gateways/midtrans";
import { POST as marketingPost } from "@/app/api/admin/marketing/route";
import { GET as partnerDashboardGet } from "@/app/api/partner/dashboard/route";
import { POST as partnerSetPasswordPost } from "@/app/api/partner/auth/set-password/route";
import { PUT as expensePut, DELETE as expenseDelete } from "@/app/api/admin/finance/expenses/[id]/route";
import { GET as orderStatusGet } from "@/app/api/client/orders/[id]/status/route";
import { POST as rsvpPost, GET as rsvpGet } from "@/app/api/public/rsvp/route";
import { POST as memoriesUploadPost } from "@/app/api/public/memories/upload/route";
import { POST as giftClaimPost, GET as giftClaimGet } from "@/app/api/public/gift-claim/route";
import { GET as sseMemoriesGet } from "@/app/api/sse/memories/route";
import { GET as subdomainCheckGet } from "@/app/api/client/subdomain/check/route";
import { POST as freeDraftPost } from "@/app/api/client/invitations/free-draft/route";
import { PUT as clientInvitationPut } from "@/app/api/client/invitations/[id]/route";
import { GET as adminUsersGet } from "@/app/api/admin/users/route";
import { GET as adminInvitationsGet } from "@/app/api/admin/invitations/route";
import { activateFreeDraftForOrder } from "@/lib/freeDraftActivation";
import { customDomainResolutionCache, invalidateInvitationLookup } from "@/lib/cache";
import { upsertGoogleUser } from "@/lib/auth";
import { GET as clientPasswordGet, PUT as clientPasswordPut } from "@/app/api/client/account/password/route";
import UnifiedAddonModal from "@/components/client/UnifiedAddonModal";

function jsonReq(path: string, method: string, body?: unknown, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      "cf-connecting-ip": "198.51.100.77",
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("MidtransGateway.verify() fraud_status & grossAmount + UnifiedAddonModal guard", () => {
  it("verify() menangani capture+challenge (PENDING), capture+deny (FAILED), capture+accept (PAID+grossAmount), settlement (PAID+grossAmount)", async () => {
    const gw = new MidtransGateway();
    vi.spyOn(gw as any, "getConfig").mockResolvedValue({
      serverKey: "SB-Mid-server-test",
      clientKey: "SB-Mid-client-test",
      snapUrl: "https://app.sandbox.midtrans.com/snap/v1/transactions",
      apiUrl: "https://api.sandbox.midtrans.com/v2",
    });

    const origFetch = global.fetch;
    try {
      global.fetch = vi.fn().mockResolvedValueOnce({
        json: async () => ({ transaction_status: "capture", fraud_status: "challenge", gross_amount: "149000.00" }),
      }) as any;
      expect(await gw.verify("ord-1")).toEqual({ status: "PENDING", grossAmount: 149000 });

      global.fetch = vi.fn().mockResolvedValueOnce({
        json: async () => ({ transaction_status: "capture", fraud_status: "deny", gross_amount: "149000.00" }),
      }) as any;
      expect(await gw.verify("ord-2")).toEqual({ status: "FAILED", grossAmount: 149000 });

      global.fetch = vi.fn().mockResolvedValueOnce({
        json: async () => ({ transaction_status: "capture", fraud_status: "accept", gross_amount: "149000.00" }),
      }) as any;
      expect(await gw.verify("ord-3")).toEqual({ status: "PAID", grossAmount: 149000 });

      global.fetch = vi.fn().mockResolvedValueOnce({
        json: async () => ({ transaction_status: "settlement", gross_amount: "249000.00" }),
      }) as any;
      expect(await gw.verify("ord-4")).toEqual({ status: "PAID", grossAmount: 249000 });
    } finally {
      global.fetch = origFetch;
    }
  });

  it("UnifiedAddonModal tidak merender modal untuk isFreeDraft=true atau currentPlan kosong", () => {
    const freeHtml = renderToStaticMarkup(
      createElement(UnifiedAddonModal, {
        isOpen: true,
        onClose: () => {},
        invitationId: "inv-free",
        currentPlan: "TIER_1",
        currentQuota: 0,
        isFreeDraft: true,
      }),
    );
    expect(freeHtml).toBe("");

    const emptyPlanHtml = renderToStaticMarkup(
      createElement(UnifiedAddonModal, {
        isOpen: true,
        onClose: () => {},
        invitationId: "inv-free",
        currentPlan: "",
        currentQuota: 0,
      }),
    );
    expect(emptyPlanHtml).toBe("");
  });
});

describe.skipIf(!IS_TEST_DB)("Security Audit & Free Draft Overhaul (DB Integration)", () => {
  const RUN = `sec261120_${Date.now().toString(36)}`;
  const cleanup = {
    adminIds: [] as string[],
    userIds: [] as string[],
    partnerIds: [] as string[],
    expenseIds: [] as string[],
    invitationIds: [] as string[],
    orderIds: [] as string[],
    otpEmails: [] as string[],
  };

  let adminId = "";

  beforeAll(async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-for-audit-20261120";
    const admin = await prisma.admin.create({
      data: {
        username: `${RUN}_adm`,
        email: `${RUN}_adm@example.test`,
        name: "Audit Admin",
        passwordHash: await bcrypt.hash("AdminPass123!", 10),
        role: "SUPER_ADMIN",
      },
    });
    adminId = admin.id;
    cleanup.adminIds.push(admin.id);
    activeAdminGuard = {
      ok: true,
      session: {
        user: { id: admin.id, email: admin.email, role: "SUPER_ADMIN", isAdmin: true, isRemote: false },
      },
    };
  });

  afterAll(async () => {
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: cleanup.adminIds } } }).catch(() => {});
    if (cleanup.invitationIds.length) {
      await prisma.giftClaim.deleteMany({ where: { invitationId: { in: cleanup.invitationIds } } }).catch(() => {});
      await prisma.rsvp.deleteMany({ where: { invitationId: { in: cleanup.invitationIds } } }).catch(() => {});
      await prisma.invitation.deleteMany({ where: { id: { in: cleanup.invitationIds } } }).catch(() => {});
    }
    if (cleanup.orderIds.length) {
      await prisma.order.deleteMany({ where: { id: { in: cleanup.orderIds } } }).catch(() => {});
    }
    if (cleanup.expenseIds.length) {
      await prisma.expense.deleteMany({ where: { id: { in: cleanup.expenseIds } } }).catch(() => {});
    }
    if (cleanup.partnerIds.length) {
      await prisma.partnerAffiliate.deleteMany({ where: { id: { in: cleanup.partnerIds } } }).catch(() => {});
    }
    if (cleanup.userIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } }).catch(() => {});
    }
    if (cleanup.otpEmails.length) {
      await prisma.emailOtpToken.deleteMany({ where: { email: { in: cleanup.otpEmails } } }).catch(() => {});
    }
    if (cleanup.adminIds.length) {
      await prisma.admin.deleteMany({ where: { id: { in: cleanup.adminIds } } }).catch(() => {});
    }
    await prisma.rateLimitCounter.deleteMany({ where: { key: { contains: "198.51.100.77" } } }).catch(() => {});
    await pool.end().catch(() => {});
  });

  it("Partner email unik case-insensitive (409) & reset sandi membatalkan sesi mitra lama via sessionVersion", async () => {
    const email = `${RUN}_partner@example.test`;
    cleanup.otpEmails.push(email);

    const create1 = await marketingPost(
      jsonReq("/api/admin/marketing", "POST", {
        action: "CREATE_PARTNER",
        name: "Mitra Pertama",
        email: email.toUpperCase(),
        commissionType: "PERCENT",
        commissionValue: 10,
      }),
    );
    expect(create1.status).toBe(200);
    const p1 = (await create1.json()).partner;
    cleanup.partnerIds.push(p1.id);

    // Duplicate email (different casing) -> 409
    const createDup = await marketingPost(
      jsonReq("/api/admin/marketing", "POST", {
        action: "CREATE_PARTNER",
        name: "Mitra Duplikat",
        email,
        commissionType: "PERCENT",
        commissionValue: 10,
      }),
    );
    expect(createDup.status).toBe(409);

    // Old session signed with sv=0 works initially
    const oldToken = signPartnerSession(p1.id, email, 0);
    const dashBefore = await partnerDashboardGet(
      jsonReq("/api/partner/dashboard", "GET", undefined, { cookie: `${PARTNER_COOKIE_NAME}=${oldToken}` }),
    );
    expect(dashBefore.status).toBe(200);

    // Activate / reset password via OTP -> increments sessionVersion to 1
    const otp = await createAndStoreOtp(email, "PARTNER_ACTIVATE");
    expect(otp.code).toBeTruthy();
    const setPwRes = await partnerSetPasswordPost(
      jsonReq("/api/partner/auth/set-password", "POST", {
        email,
        code: otp.code,
        password: "NewPartnerPass123!",
        purpose: "PARTNER_ACTIVATE",
      }),
    );
    expect(setPwRes.status).toBe(200);

    // Old token (sv=0) is now rejected with 401
    const dashAfterOld = await partnerDashboardGet(
      jsonReq("/api/partner/dashboard", "GET", undefined, { cookie: `${PARTNER_COOKIE_NAME}=${oldToken}` }),
    );
    expect(dashAfterOld.status).toBe(401);

    // Fresh token (sv=1) works
    const newToken = signPartnerSession(p1.id, email, 1);
    const dashAfterNew = await partnerDashboardGet(
      jsonReq("/api/partner/dashboard", "GET", undefined, { cookie: `${PARTNER_COOKIE_NAME}=${newToken}` }),
    );
    expect(dashAfterNew.status).toBe(200);
  });

  it("Pengeluaran payout komisi mitra tidak bisa dihapus (409) atau diubah nominal/kategorinya (409) di Finance", async () => {
    const partner = await prisma.partnerAffiliate.create({
      data: { name: "Mitra Kas", email: `${RUN}_kas@example.test`, commissionType: "NOMINAL", commissionValue: 20000 },
    });
    cleanup.partnerIds.push(partner.id);

    const exp = await prisma.expense.create({
      data: {
        title: "Payout Komisi Mitra: Mitra Kas",
        category: "MARKETING",
        amount: 40000,
        partnerAffiliateId: partner.id,
        createdById: adminId,
      },
    });
    cleanup.expenseIds.push(exp.id);

    const delRes = await expenseDelete(
      jsonReq(`/api/admin/finance/expenses/${exp.id}`, "DELETE"),
      { params: Promise.resolve({ id: exp.id }) },
    );
    expect(delRes.status).toBe(409);

    const putAmountRes = await expensePut(
      jsonReq(`/api/admin/finance/expenses/${exp.id}`, "PUT", { amount: 10000 }),
      { params: Promise.resolve({ id: exp.id }) },
    );
    expect(putAmountRes.status).toBe(409);

    const putCatRes = await expensePut(
      jsonReq(`/api/admin/finance/expenses/${exp.id}`, "PUT", { category: "INFRASTRUCTURE" }),
      { params: Promise.resolve({ id: exp.id }) },
    );
    expect(putCatRes.status).toBe(409);

    // Updating non-financial note still succeeds
    const putNoteRes = await expensePut(
      jsonReq(`/api/admin/finance/expenses/${exp.id}`, "PUT", { notes: "Catatan referensi bank diperbarui" }),
      { params: Promise.resolve({ id: exp.id }) },
    );
    expect(putNoteRes.status).toBe(200);
  });

  it("Order status 401 sebelum DB lookup, Public DRAFT ditolak (RSVP/Memories/Gift-Claim/SSE), dan subdomain/check wajib login", async () => {
    activeSession = null;
    // Order status auth-first (no 404 existence oracle)
    const unauthStatus = await orderStatusGet(
      jsonReq("/api/client/orders/nonexistent-id-123/status", "GET"),
      { params: Promise.resolve({ id: "nonexistent-id-123" }) },
    );
    expect(unauthStatus.status).toBe(401);

    // subdomain/check requires auth
    const unauthSub = await subdomainCheckGet(jsonReq("/api/client/subdomain/check?subdomain=calon-uji", "GET"));
    expect(unauthSub.status).toBe(401);

    // SSE rejects nonexistent UUID with 404
    const sseMissing = await sseMemoriesGet(
      jsonReq(`/api/sse/memories?invitationId=${crypto.randomUUID()}`, "GET"),
    );
    expect(sseMissing.status).toBe(404);

    // Create a DRAFT invitation and verify all public endpoints reject it
    const user = await prisma.user.create({
      data: { email: `${RUN}_draftlock@example.test`, name: "Draft User", role: "CLIENT" },
    });
    cleanup.userIds.push(user.id);

    const draftInv = await prisma.invitation.create({
      data: {
        userId: user.id,
        status: "DRAFT",
        isFreeDraft: true,
        themeId: "kalandra",
        invitationSlug: `${RUN}-draft-lock`,
        featureSettings: { giftRegistry: [{ id: "g1", name: "Kado", qtyNeeded: 2 }] },
      },
    });
    cleanup.invitationIds.push(draftInv.id);

    const rsvpPostRes = await rsvpPost(
      jsonReq("/api/public/rsvp", "POST", { invitationId: draftInv.id, guestName: "Anon", status: "hadir" }),
    );
    expect(rsvpPostRes.status).toBe(403);

    const rsvpGetRes = await rsvpGet(jsonReq(`/api/public/rsvp?invitationId=${draftInv.id}`, "GET"));
    expect(rsvpGetRes.status).toBe(200);
    expect((await rsvpGetRes.json()).rsvps).toEqual([]);

    const memPostRes = await memoriesUploadPost(
      jsonReq("/api/public/memories/upload", "POST", {
        invitationId: draftInv.id,
        senderName: "Anon",
        senderEmail: "anon@test.id",
        base64File: "AAAA",
      }),
    );
    expect(memPostRes.status).toBe(403);

    const giftPostRes = await giftClaimPost(
      jsonReq("/api/public/gift-claim", "POST", {
        invitationId: draftInv.id,
        itemId: "g1",
        guestName: "Anon",
        quantity: 1,
      }),
    );
    expect(giftPostRes.status).toBe(403);

    const giftGetRes = await giftClaimGet(jsonReq(`/api/public/gift-claim?invitationId=${draftInv.id}`, "GET"));
    expect(giftGetRes.status).toBe(200);
    expect((await giftGetRes.json()).claims).toEqual([]);

    const sseDraft = await sseMemoriesGet(jsonReq(`/api/sse/memories?invitationId=${draftInv.id}`, "GET"));
    expect(sseDraft.status).toBe(404);

    // Authenticated user CAN check subdomain
    activeSession = { user: { id: user.id, email: user.email, role: "CLIENT" } };
    const authSub = await subdomainCheckGet(jsonReq("/api/client/subdomain/check?subdomain=calon-uji-unik", "GET"));
    expect(authSub.status).toBe(200);
    expect((await authSub.json()).available).toBe(true);
  });

  it("Free Draft wajib memilih eventType, bisa ganti eventType selama Draf Gratis, dikunci jika berbayar, dan tampil akurat di Admin API", async () => {
    const user = await prisma.user.create({
      data: { email: `${RUN}_freedraft@example.test`, name: "Trial Client", role: "CLIENT" },
    });
    cleanup.userIds.push(user.id);
    activeSession = { user: { id: user.id, email: user.email, role: "CLIENT" } };

    // Without eventType (when >1 enabled) -> 400 EVENT_TYPE_REQUIRED
    const missingRes = await freeDraftPost(jsonReq("/api/client/invitations/free-draft", "POST", {}));
    const missingBody = await missingRes.json();
    expect(missingRes.status).toBe(400);
    expect(missingBody.code).toBe("EVENT_TYPE_REQUIRED");

    // With non-wedding eventType + explicit themeId (e.g. from /portfolio "Gunakan Tema Ini") -> 201
    const createRes = await freeDraftPost(
      jsonReq("/api/client/invitations/free-draft", "POST", { eventType: "PERSONAL", subEvent: "Ulang Tahun", themeId: "gala" }),
    );
    const createBody = await createRes.json();
    expect(createRes.status, JSON.stringify(createBody)).toBe(201);
    const invId = createBody.invitation.id as string;
    cleanup.invitationIds.push(invId);
    expect(createBody.invitation.eventType).toBe("PERSONAL");
    expect(createBody.invitation.subEvent).toBe("Ulang Tahun");
    expect(createBody.invitation.themeId).toBe("gala");
    expect(createBody.invitation.isFreeDraft).toBe(true);

    // Switch subEvent within PERSONAL preserves chosen themeId
    const changeNonWeddingRes = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        action: "CHANGE_INVITATION_MODE",
        eventType: "PERSONAL",
        subEvent: "Khitanan",
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    const changeNonWeddingBody = await changeNonWeddingRes.json();
    expect(changeNonWeddingRes.status, JSON.stringify(changeNonWeddingBody)).toBe(200);
    expect(changeNonWeddingBody.invitation.eventType).toBe("PERSONAL");
    expect(changeNonWeddingBody.invitation.subEvent).toBe("Khitanan");
    expect(changeNonWeddingBody.invitation.themeId).toBe("gala");

    // Switch eventType while Draft to WEDDING with explicit themeId -> 200
    const changeRes = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        action: "CHANGE_INVITATION_MODE",
        eventType: "WEDDING",
        themeId: "aeterna",
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    const changeBody = await changeRes.json();
    expect(changeRes.status, JSON.stringify(changeBody)).toBe(200);
    expect(changeBody.invitation.eventType).toBe("WEDDING");
    expect(changeBody.invitation.themeId).toBe("aeterna");

    // Edit customLabel & openingQuote, then switch theme within the SAME eventType via CHANGE_INVITATION_MODE -> preserves edited label & quote
    await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        openingQuote: "Kutipan Kustom Klien",
        featureSettings: {
          customLabels: { coverTitle: "Judul Sampul Kustom Klien" },
        },
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    const sameEventThemeChangeRes = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        action: "CHANGE_INVITATION_MODE",
        eventType: "WEDDING",
        themeId: "kalandra",
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    const sameEventThemeChangeBody = await sameEventThemeChangeRes.json();
    expect(sameEventThemeChangeRes.status).toBe(200);
    expect(sameEventThemeChangeBody.invitation.themeId).toBe("kalandra");
    expect(sameEventThemeChangeBody.invitation.openingQuote).toBe("Kutipan Kustom Klien");
    expect((sameEventThemeChangeBody.invitation.featureSettings as any)?.customLabels?.coverTitle).toBe(
      "Judul Sampul Kustom Klien",
    );

    // Admin Users API separates Free Draft from paid active clients and exposes isFreeDraft
    const leadsRes = await adminUsersGet(jsonReq(`/api/admin/users?filter=leads&search=${encodeURIComponent(user.email)}`, "GET"));
    expect(leadsRes.status).toBe(200);
    const leadsData = await leadsRes.json();
    expect(leadsData.users).toHaveLength(1);
    expect(leadsData.users[0].invitations[0].isFreeDraft).toBe(true);

    const activeRes = await adminUsersGet(jsonReq(`/api/admin/users?filter=active&search=${encodeURIComponent(user.email)}`, "GET"));
    expect(activeRes.status).toBe(200);
    expect((await activeRes.json()).users).toHaveLength(0);

    // Admin Invitations API returns isFreeDraft: true and order: null
    const invListRes = await adminInvitationsGet(jsonReq(`/api/admin/invitations?search=${encodeURIComponent(user.email)}`, "GET"));
    expect(invListRes.status).toBe(200);
    const invListData = await invListRes.json();
    expect(invListData.invitations[0].isFreeDraft).toBe(true);
    expect(invListData.invitations[0].order).toBeNull();

    // Published invitation cannot use CHANGE_INVITATION_MODE -> 403
    await prisma.invitation.update({ where: { id: invId }, data: { isFreeDraft: false, status: "PUBLISHED" } });
    const lockedRes = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        action: "CHANGE_INVITATION_MODE",
        eventType: "PERSONAL",
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    expect(lockedRes.status).toBe(403);
  });

  it("Konversi Free Draft -> Lunas memperbarui slug draf-xxxxxxxx menjadi slug kanonikal nama peserta & tanggal serta menurunkan subdomain awal", async () => {
    const user = await prisma.user.create({
      data: { email: `${RUN}_slugconv@example.test`, name: "Slug Convert User", role: "CLIENT" },
    });
    cleanup.userIds.push(user.id);
    activeSession = { user: { id: user.id, email: user.email, role: "CLIENT" } };

    const createRes = await freeDraftPost(
      jsonReq("/api/client/invitations/free-draft", "POST", { eventType: "WEDDING", themeId: "kalandra" }),
    );
    expect(createRes.status).toBe(201);
    const inv = (await createRes.json()).invitation;
    cleanup.invitationIds.push(inv.id);
    expect(inv.invitationSlug).toMatch(/^draf-[0-9a-f]{8}$/i);

    // Klien mengisi nama mempelai dan tanggal acara selama masih mode Draf Gratis
    const nickTag = Date.now().toString(36).slice(-4);
    const editRes = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${inv.id}`, "PUT", {
        participantsJson: {
          groom: { name: `Dimas ${nickTag}`, nickname: `dimas${nickTag}` },
          bride: { name: `Clarissa ${nickTag}`, nickname: `clarissa${nickTag}` },
        },
        eventData: [
          {
            title: "Resepsi Pernikahan",
            date: "2027-03-03",
            startTime: "10:00",
            endTime: "13:00",
            timezone: "WIB",
            location: "Hotel Mulia",
            isPrimary: true,
          },
        ],
      }),
      { params: Promise.resolve({ id: inv.id }) },
    );
    expect(editRes.status).toBe(200);

    // Klien melunasi paket NEW -> activateFreeDraftForOrder harus mengganti slug draf-xxxxxxxx & menurunkan subdomain
    const paidOrder = await prisma.order.create({
      data: {
        userId: user.id,
        invoiceNumber: `INV-${RUN}-CONV`,
        planType: "TIER_2",
        orderType: "NEW",
        amount: 149000,
        status: "PAID",
        paidAt: new Date(),
      },
    });
    cleanup.orderIds.push(paidOrder.id);

    const activatedId = await activateFreeDraftForOrder(paidOrder.id, user.id);
    expect(activatedId).toBe(inv.id);

    const afterActivate = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(afterActivate.isFreeDraft).toBe(false);
    expect(afterActivate.orderId).toBe(paidOrder.id);
    expect(afterActivate.invitationSlug).toBe(`dimas${nickTag}-clarissa${nickTag}-030327`);
    expect(afterActivate.subdomain).toBe(`dimas${nickTag}-clarissa${nickTag}`);

    // Cache customDomainResolutionCache ikut dibersihkan saat invalidateInvitationLookup dipanggil
    customDomainResolutionCache.set("pasangan-uji.example", { slug: afterActivate.invitationSlug, subdomain: afterActivate.subdomain });
    expect(customDomainResolutionCache.get("pasangan-uji.example")).not.toBeNull();
    invalidateInvitationLookup(afterActivate.invitationSlug, afterActivate.subdomain, afterActivate.id);
    expect(customDomainResolutionCache.get("pasangan-uji.example")).toBeNull();
  });

  it("upsertGoogleUser menormalisasi huruf kecil email & menautkan akun legacy case-insensitive tanpa menimpa nama lokal", async () => {
    const rawEmail = `Google.Case_${RUN}@Example.Test`;
    const normalizedEmail = rawEmail.toLowerCase();
    const googleSub = `sub-${RUN}-1`;

    // 1. Registrasi langsung via Google menyimpan email huruf kecil
    const created = await upsertGoogleUser({
      sub: googleSub,
      email: `  ${rawEmail}  `,
      name: "Budi Santoso",
      picture: "https://example.test/avatar.png",
    });
    cleanup.userIds.push(created.id);
    expect(created.email).toBe(normalizedEmail);
    expect(created.googleId).toBe(googleSub);
    expect(created.role).toBe("CLIENT");

    // 2. Klien ubah nama lokal lalu login ulang Google -> nama lokal dipertahankan
    await prisma.user.update({ where: { id: created.id }, data: { name: "Budi Custom" } });
    const relogged = await upsertGoogleUser({
      sub: googleSub,
      email: rawEmail,
      name: "Budi Google Baru",
      picture: "https://example.test/avatar2.png",
    });
    expect(relogged.id).toBe(created.id);
    expect(relogged.name).toBe("Budi Custom");
    expect(relogged.email).toBe(normalizedEmail);

    // 3. Akun lama dengan email mixed-case ditautkan berdasarkan case-insensitive email & dinormalisasi ke lowercase
    const legacyEmail = `Legacy.Mixed_${RUN}@Example.Test`;
    const legacyUser = await prisma.user.create({
      data: { email: legacyEmail, name: "Pengguna Lama", role: "CLIENT" },
    });
    cleanup.userIds.push(legacyUser.id);
    const linked = await upsertGoogleUser({
      sub: `sub-${RUN}-legacy`,
      email: legacyEmail.toLowerCase(),
      name: "Nama Google",
    });
    expect(linked.id).toBe(legacyUser.id);
    expect(linked.email).toBe(legacyEmail.toLowerCase());
    expect(linked.googleId).toBe(`sub-${RUN}-legacy`);
    expect(linked.name).toBe("Pengguna Lama");
  });

  it("Client /api/client/account/password: tolak 401 anonim & 403 remote admin, izinkan akun Google buat sandi awal, dan verifikasi sandi lama saat ubah sandi", async () => {
    // 1. Anonim ditolak 401
    activeSession = null;
    expect((await clientPasswordGet()).status).toBe(401);
    expect((await clientPasswordPut(jsonReq("/api/client/account/password", "PUT", { newPassword: "PasswordBaru#1" }))).status).toBe(401);

    // 2. Remote admin ditolak 403 (admin tidak boleh mengubah sandi pribadi klien)
    const user = await prisma.user.create({
      data: { email: `${RUN}_pwsettings@example.test`, name: "Klien Sandi", googleId: `gsub-${RUN}`, role: "CLIENT" },
    });
    cleanup.userIds.push(user.id);
    activeSession = { user: { id: user.id, email: user.email, role: "CLIENT", isAdmin: true, isRemote: true } };
    expect((await clientPasswordGet()).status).toBe(403);
    expect((await clientPasswordPut(jsonReq("/api/client/account/password", "PUT", { newPassword: "PasswordBaru#1" }))).status).toBe(403);

    // 3. Pemilik akun Google-only bisa cek status (hasPassword=false) lalu buat sandi pertama
    activeSession = { user: { id: user.id, email: user.email, role: "CLIENT", isAdmin: false, isRemote: false } };
    const statusRes = await clientPasswordGet();
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();
    expect(statusJson.hasPassword).toBe(false);
    expect(statusJson.hasGoogle).toBe(true);

    const setInitial = await clientPasswordPut(
      jsonReq("/api/client/account/password", "PUT", { newPassword: "SandiPertama#2026" }),
    );
    expect(setInitial.status).toBe(200);

    // 4. Setelah punya sandi, ubah sandi dengan currentPassword salah ditolak 401
    const wrongCurrent = await clientPasswordPut(
      jsonReq("/api/client/account/password", "PUT", { currentPassword: "SalahPassword", newPassword: "SandiKedua#2026" }),
    );
    expect(wrongCurrent.status).toBe(401);

    // 5. Ubah sandi dengan currentPassword benar -> 200 & hash terbarui di DB
    const validChange = await clientPasswordPut(
      jsonReq("/api/client/account/password", "PUT", { currentPassword: "SandiPertama#2026", newPassword: "SandiKedua#2026" }),
    );
    expect(validChange.status).toBe(200);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    expect(await bcrypt.compare("SandiKedua#2026", updated.passwordHash!)).toBe(true);
    expect(await bcrypt.compare("SandiPertama#2026", updated.passwordHash!)).toBe(false);
  });

  it("Isolasi 3 Kategori Tegas & CHANGE_SUB_EVENT: tolak tema lintas kategori (400) dan izinkan ganti subEvent dinamis (termasuk kustom Tamatan Ngaji / Corporate) saat DRAFT", async () => {
    const user = await prisma.user.create({
      data: { email: `${RUN}_cat3@example.test`, name: "Klien 3 Kategori", role: "CLIENT" },
    });
    cleanup.userIds.push(user.id);
    activeSession = { user: { id: user.id, email: user.email, role: "CLIENT", isAdmin: false, isRemote: false } };

    // 1. Free Draft PERSONAL menolak tema WEDDING ("kalandra") & tema EVENT ("sinergi") dengan 400
    const resRejectWed = await freeDraftPost(
      jsonReq("/api/client/invitations/free-draft", "POST", { eventType: "PERSONAL", subEvent: "Ulang Tahun", themeId: "kalandra" }),
    );
    expect(resRejectWed.status).toBe(400);

    const resRejectEvent = await freeDraftPost(
      jsonReq("/api/client/invitations/free-draft", "POST", { eventType: "PERSONAL", subEvent: "Ulang Tahun", themeId: "sinergi" }),
    );
    expect(resRejectEvent.status).toBe(400);

    // 2. Buat Draf Gratis PERSONAL dengan tema Personal "festivo" -> 201
    const resCreate = await freeDraftPost(
      jsonReq("/api/client/invitations/free-draft", "POST", { eventType: "PERSONAL", subEvent: "Ulang Tahun", themeId: "festivo" }),
    );
    expect(resCreate.status).toBe(201);
    const createJson = await resCreate.json();
    expect(createJson.invitation.eventType).toBe("PERSONAL");
    expect(createJson.invitation.subEvent).toBe("Ulang Tahun");
    expect(createJson.invitation.themeId).toBe("festivo");
    const invId = createJson.invitation.id as string;
    cleanup.invitationIds.push(invId);

    // 3. Klien Personal bisa ganti ke tema Personal lain ("cendekia"), tapi ditolak 400 ke tema EVENT ("sinergi") atau WEDDING ("bugis")
    const resPersonalOk = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", { themeId: "cendekia" }),
      { params: Promise.resolve({ id: invId }) },
    );
    expect(resPersonalOk.status).toBe(200);

    const resCrossEvent = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", { themeId: "sinergi" }),
      { params: Promise.resolve({ id: invId }) },
    );
    expect(resCrossEvent.status).toBe(400);

    const resCrossWed = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", { themeId: "bugis" }),
      { params: Promise.resolve({ id: invId }) },
    );
    expect(resCrossWed.status).toBe(400);

    // 4. Simulasikan undangan berbayar (isFreeDraft = false, status = DRAFT) dengan data peserta terisi:
    //    klien tetap BISA ganti subEvent (termasuk kustom bebas "Tamatan Ngaji") via CHANGE_SUB_EVENT tanpa kehilangan tema & data tokoh!
    await prisma.invitation.update({
      where: { id: invId },
      data: {
        isFreeDraft: false,
        participantsJson: {
          person: { name: "Nadia Putri", nickname: "Nadia", detail: "Khatam 30 Juz", fatherName: "Bpk. Arman", motherName: "Ibu Lina" },
        },
      },
    });
    const resSubSwitch = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        action: "CHANGE_SUB_EVENT",
        subEvent: "Tamatan Ngaji",
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    expect(resSubSwitch.status).toBe(200);
    const afterSub = await prisma.invitation.findUniqueOrThrow({ where: { id: invId } });
    expect(afterSub.eventType).toBe("PERSONAL");
    expect(afterSub.subEvent).toBe("Tamatan Ngaji");
    expect(afterSub.themeId).toBe("cendekia");
    const kept = afterSub.participantsJson as any;
    expect(kept.person?.name).toBe("Nadia Putri");
    expect(kept.person?.fatherName).toBe("Bpk. Arman");

    // 5. Draf berbayar (isFreeDraft = false, status = DRAFT) dapat berpindah mode + tema secara atomik lewat CHANGE_INVITATION_MODE
    const resPaidModeSwitch = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        action: "CHANGE_INVITATION_MODE",
        eventType: "EVENT",
        subEvent: "Grand Opening",
        themeId: "sinergi",
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    expect(resPaidModeSwitch.status).toBe(200);
    const afterPaidMode = await prisma.invitation.findUniqueOrThrow({ where: { id: invId } });
    expect(afterPaidMode.eventType).toBe("EVENT");
    expect(afterPaidMode.subEvent).toBe("Grand Opening");
    expect(afterPaidMode.themeId).toBe("sinergi");

    // Pindah balik ke PERSONAL (Wisuda) dengan tema cendekia + seksi Kisah & Perjalanan Hidup (showStory ON vs OFF)
    const resBackToWisuda = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        action: "CHANGE_INVITATION_MODE",
        eventType: "PERSONAL",
        subEvent: "Wisuda",
        themeId: "cendekia",
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    expect(resBackToWisuda.status).toBe(200);

    const { composeTemplateData } = await import("@/lib/themeEngine");
    const { renderTemplateFile } = await import("@/lib/renderTemplate");
    await prisma.invitation.update({
      where: { id: invId },
      data: {
        participantsJson: { person: { name: "Nadia Putri, S.Kom.", nickname: "Nadia" } },
        loveStory: [
          { title: "Awal Masuk Kuliah", date: "2022", content: "Memulai perjalanan di Fakultas Ilmu Komputer." },
          { title: "Sidang Skripsi & Kelulusan", date: "2026", content: "Lulus dengan predikat Cum Laude." },
        ],
        featureSettings: { showStory: true, customLabels: { storyTitle: "Perjalanan Studi" } },
      },
    });
    const htmlWithStory = await renderTemplateFile(
      "cendekia",
      (await composeTemplateData(invId)) as Record<string, unknown>,
      { eventType: "PERSONAL" },
    );
    expect(htmlWithStory).toContain('id="story"');
    expect(htmlWithStory).toContain("Perjalanan Studi");
    expect(htmlWithStory).toContain("Awal Masuk Kuliah");
    expect(htmlWithStory).toContain("Sidang Skripsi &amp; Kelulusan");

    // Saat showStory dimatikan klien (false), seksi #story wajib 100% disembunyikan di hasil render
    await prisma.invitation.update({
      where: { id: invId },
      data: {
        featureSettings: { showStory: false, customLabels: { storyTitle: "Perjalanan Studi" } },
      },
    });
    const htmlHiddenStory = await renderTemplateFile(
      "cendekia",
      (await composeTemplateData(invId)) as Record<string, unknown>,
      { eventType: "PERSONAL" },
    );
    expect(htmlHiddenStory).not.toContain('id="story"');
    expect(htmlHiddenStory).not.toContain("Awal Masuk Kuliah");

    // 6. CHANGE_SUB_EVENT dan CHANGE_INVITATION_MODE menolak setelah PUBLISHED (403)
    await prisma.invitation.update({ where: { id: invId }, data: { status: "PUBLISHED" } });
    const resAfterPub = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        action: "CHANGE_SUB_EVENT",
        subEvent: "Khitanan",
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    expect(resAfterPub.status).toBe(403);
    const resModeAfterPub = await clientInvitationPut(
      jsonReq(`/api/client/invitations/${invId}`, "PUT", {
        action: "CHANGE_INVITATION_MODE",
        eventType: "WEDDING",
        themeId: "kalandra",
      }),
      { params: Promise.resolve({ id: invId }) },
    );
    expect(resModeAfterPub.status).toBe(403);
  });
});
