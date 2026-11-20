import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

process.env.AUTH_SECRET ||= "vitest-wave2-auth-secret-32chars-min!!";

const sentOtps: Array<{ to: string; code: string; purpose: string }> = [];

vi.mock("@/lib/mailer", () => ({
  sendLoginOtpEmail: vi.fn(async (input: { to: string; code: string; purpose: string }) => {
    sentOtps.push(input);
    return { success: true };
  }),
  sendInvoiceEmail: vi.fn(async () => ({ success: true })),
}));

import bcrypt from "bcryptjs";
import { prisma, pool } from "@/lib/prisma";
import { createAndStoreOtp, verifyAndConsumeOtp, OTP_MAX_ATTEMPTS } from "@/lib/emailOtp";
import { POST as clientOtpRequestPost } from "@/app/api/auth/otp/request/route";
import { POST as clientRegisterPost } from "@/app/api/auth/register/route";
import { POST as clientResetPasswordPost } from "@/app/api/auth/reset-password/route";
import { composeInvitationData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { getLocaleDict } from "@/lib/themeEngine/locale";
import { encryptPin } from "@/lib/pinEncryption";
import { generateReceptionistToken } from "@/lib/receptionistAuth";
import { GET as sseCheckinGet } from "@/app/api/sse/checkin/route";
import { POST as souvenirPost } from "@/app/api/receptionist/souvenir/route";
import { GET as receptionistGuestsGet } from "@/app/api/receptionist/guests/route";
import { POST as scanPost } from "@/app/api/receptionist/scan/route";
import { GET as giftClaimGet, POST as giftClaimPost } from "@/app/api/public/gift-claim/route";
import { PARTNER_COOKIE_NAME, signPartnerSession, verifyPartnerSession } from "@/lib/partnerAuth";
import { POST as partnerOtpReqPost } from "@/app/api/partner/auth/request-otp/route";
import { POST as partnerSetPasswordPost } from "@/app/api/partner/auth/set-password/route";
import { POST as partnerPasswordLoginPost } from "@/app/api/partner/auth/login/route";
import { GET as partnerDashboardGet } from "@/app/api/partner/dashboard/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `wave2-${Date.now().toString(36)}`;

const cleanup = {
  invitations: [] as string[],
  orders: [] as string[],
  users: [] as string[],
  partners: [] as string[],
  coupons: [] as string[],
  otpEmails: [] as string[],
  slugs: [] as string[],
};

function makeJsonReq(url: string, method: string, body?: unknown, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe.skipIf(!IS_TEST_DB)("Wave 2 Features Integration (#2, #8, #10A/B, #10C, #11)", () => {
  const clearTestRateLimits = async () => {
    await prisma.rateLimitCounter
      .deleteMany({
        where: {
          OR: [
            { key: { startsWith: "otp_req:" } },
            { key: { startsWith: "client_reg_ip:" } },
            { key: { startsWith: "client_reset_ip:" } },
            { key: { startsWith: "partner_otp_" } },
            { key: { startsWith: "partner_setpw_ip:" } },
            { key: { startsWith: "partner_login_fail:" } },
          ],
        },
      })
      .catch(() => {});
  };

  beforeAll(async () => {
    await clearTestRateLimits();
  });

  afterAll(async () => {
    for (const invId of cleanup.invitations) {
      fs.rmSync(path.join(process.cwd(), "public", "published", "ids", `${invId}.html`), { force: true });
      fs.rmSync(path.join(process.cwd(), "data", "drafts", `${invId}.html`), { force: true });
    }
    for (const slug of cleanup.slugs) {
      fs.rmSync(path.join(process.cwd(), "data", "archives", slug), { recursive: true, force: true });
    }
    if (cleanup.invitations.length) {
      await prisma.invitation.deleteMany({ where: { id: { in: cleanup.invitations } } }).catch(() => {});
    }
    if (cleanup.coupons.length) {
      await prisma.promoCoupon.deleteMany({ where: { id: { in: cleanup.coupons } } }).catch(() => {});
    }
    if (cleanup.orders.length) {
      await prisma.order.deleteMany({ where: { id: { in: cleanup.orders } } }).catch(() => {});
    }
    if (cleanup.partners.length) {
      await prisma.partnerAffiliate.deleteMany({ where: { id: { in: cleanup.partners } } }).catch(() => {});
    }
    if (cleanup.users.length) {
      await prisma.user.deleteMany({ where: { id: { in: cleanup.users } } }).catch(() => {});
    }
    if (cleanup.otpEmails.length) {
      await prisma.emailOtpToken.deleteMany({ where: { email: { in: cleanup.otpEmails } } }).catch(() => {});
    }
    await clearTestRateLimits();
    await pool.end().catch(() => {});
  });

  async function seedInvitationWithStaffAndRegistry() {
    const user = await prisma.user.create({
      data: {
        email: `${RUN}-${Math.random().toString(36).slice(2, 7)}@example.com`,
        name: "Wave2 Host",
        role: "CLIENT",
      },
    });
    cleanup.users.push(user.id);

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        invoiceNumber: `INV-${RUN}-${Math.random().toString(36).slice(2, 6)}`,
        planType: "TIER_3",
        amount: 250000,
        status: "PAID",
        orderType: "NEW",
        paidAt: new Date(),
      },
    });
    cleanup.orders.push(order.id);

    const rawPin = "889900";
    const encryptedPin = encryptPin(rawPin);
    const slug = `${RUN}-inv-${Math.random().toString(36).slice(2, 6)}`;
    cleanup.slugs.push(slug);

    const inv = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order.id,
        themeId: "aeterna",
        invitationSlug: slug,
        subdomain: slug,
        status: "PUBLISHED",
        eventType: "WEDDING",
        staffPin: encryptedPin,
        participantsJson: {
          groomName: "Ardian",
          brideName: "Nadia",
        },
        eventData: [
          {
            title: "Akad Nikah",
            date: "2027-06-20",
            startTime: "09:00",
            endTime: "10:30",
            timezone: "WIB",
            location: "Hotel Dharmawangsa",
            address: "Jakarta Selatan",
            isPrimary: true,
          },
        ],
        featureSettings: {
          language: "en",
          showRsvp: true,
          showGift: true,
          giftRegistry: [
            {
              id: "coffee-machine",
              name: "Espresso Maker",
              note: "Warna hitam matte",
              qtyNeeded: 1,
            },
            {
              id: "dinner-set",
              name: "Ceramic Dinnerware",
              qtyNeeded: 2,
            },
          ],
        },
      },
    });
    cleanup.invitations.push(inv.id);

    const staffToken = generateReceptionistToken(inv.id, encryptedPin);
    return { user, order, inv, staffToken };
  }

  it("#2 Client Registration OTP + Password Hash + Reset Password OTP + replay/expiry/lockout", async () => {
    const email = `${RUN}-otp@example.com`;
    cleanup.otpEmails.push(email);

    // Invalid email rejected
    const badReq = await clientOtpRequestPost(makeJsonReq("/api/auth/otp/request", "POST", { email: "invalid-email", purpose: "CLIENT_REGISTER" }));
    expect(badReq.status).toBe(400);

    // Request registration OTP
    const reqRes = await clientOtpRequestPost(makeJsonReq("/api/auth/otp/request", "POST", { email, purpose: "CLIENT_REGISTER" }));
    expect(reqRes.status).toBe(200);
    const reqJson = await reqRes.json();
    expect(reqJson.message).toMatch(/Spam/i);
    const sent = sentOtps.find((item) => item.to === email && item.purpose === "CLIENT_REGISTER");
    expect(sent?.code).toMatch(/^\d{6}$/);

    // Complete registration -> creates User with bcrypt passwordHash
    const regRes = await clientRegisterPost(
      makeJsonReq("/api/auth/register", "POST", {
        name: "Calon Pengantin Uji",
        email,
        password: "PasswordAman#2026",
        code: sent!.code,
      }),
    );
    expect(regRes.status).toBe(201);
    const regJson = await regRes.json();
    expect(regJson.success).toBe(true);
    cleanup.users.push(regJson.user.id);

    const createdUser = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, passwordHash: true } });
    expect(createdUser?.name).toBe("Calon Pengantin Uji");
    expect(createdUser?.passwordHash).toBeTruthy();
    expect(await bcrypt.compare("PasswordAman#2026", createdUser!.passwordHash!)).toBe(true);

    // Duplicate registration OTP rejected with 409
    const dupOtp = await clientOtpRequestPost(makeJsonReq("/api/auth/otp/request", "POST", { email, purpose: "CLIENT_REGISTER" }));
    expect(dupOtp.status).toBe(409);

    // Reset password via OTP
    const resetReq = await clientOtpRequestPost(makeJsonReq("/api/auth/otp/request", "POST", { email, purpose: "CLIENT_RESET_PASSWORD" }));
    expect(resetReq.status).toBe(200);
    const resetMail = sentOtps.find((item) => item.to === email && item.purpose === "CLIENT_RESET_PASSWORD");
    expect(resetMail?.code).toMatch(/^\d{6}$/);

    const resetDone = await clientResetPasswordPost(
      makeJsonReq("/api/auth/reset-password", "POST", {
        email,
        code: resetMail!.code,
        newPassword: "PasswordBaru#2026",
      }),
    );
    expect(resetDone.status).toBe(200);
    const updatedUser = await prisma.user.findUnique({ where: { email }, select: { passwordHash: true } });
    expect(await bcrypt.compare("PasswordBaru#2026", updatedUser!.passwordHash!)).toBe(true);
    expect(await bcrypt.compare("PasswordAman#2026", updatedUser!.passwordHash!)).toBe(false);

    // Replay must fail
    const replay = await verifyAndConsumeOtp(email, "CLIENT_RESET_PASSWORD", resetMail!.code);
    expect(replay).toEqual({ ok: false, reason: "NOT_FOUND" });

    // Brute-force lockout after OTP_MAX_ATTEMPTS wrong guesses
    const fresh = await createAndStoreOtp(email, "CLIENT_REGISTER");
    const wrongCode = fresh.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      const attempt = await verifyAndConsumeOtp(email, "CLIENT_REGISTER", wrongCode);
      expect(attempt).toEqual({ ok: false, reason: "INVALID_CODE" });
    }
    const lockedAttempt = await verifyAndConsumeOtp(email, "CLIENT_REGISTER", fresh.code);
    expect(lockedAttempt).toEqual({ ok: false, reason: "TOO_MANY_ATTEMPTS" });

    // Expired token rejection
    const expOtp = await createAndStoreOtp(email, "CLIENT_REGISTER");
    await prisma.emailOtpToken.update({
      where: { id: expOtp.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const expRes = await verifyAndConsumeOtp(email, "CLIENT_REGISTER", expOtp.code);
    expect(expRes).toEqual({ ok: false, reason: "EXPIRED" });
  });

  it("#8 & #10C Bilingual EN locale renders English HTML/lang and includes Gift Registry claims", async () => {
    const { inv } = await seedInvitationWithStaffAndRegistry();

    const enDict = getLocaleDict("en");
    expect(enDict.locale).toBe("en");
    expect(enDict.saveGoogleCal).toBe("Google Calendar");

    const loaded = await prisma.invitation.findUnique({
      where: { id: inv.id },
      include: { media: true, rsvps: true, giftClaims: true, guestMemories: true, order: { select: { planType: true } } },
    });
    const data = (await composeInvitationData(loaded!)) as Record<string, any>;
    expect(data.invitationLocale).toBe("en");
    expect(data.eventDataHtml).toContain("Google Calendar");
    expect(data.giftCardsHtml).toContain("Espresso Maker");
    expect(data.giftCardsHtml).toContain(enDict.giftRegistryTitle);

    const html = await renderTemplateFile("aeterna", data, { eventType: "WEDDING" });
    expect(html).toContain('<html lang="en"');
    expect(html).toContain("Espresso Maker");
    expect(html).toContain("Google Calendar");
  });

  it("#10C Gift Registry: atomic reservation succeeds once and concurrent last-slot claim fails with 409", async () => {
    const { inv } = await seedInvitationWithStaffAndRegistry();

    // Two concurrent guests race for the single Espresso Maker (qtyNeeded = 1)
    const [r1, r2] = await Promise.all([
      giftClaimPost(
        makeJsonReq("/api/public/gift-claim", "POST", {
          invitationId: inv.id,
          itemId: "coffee-machine",
          guestName: "Budi",
          quantity: 1,
        }),
      ),
      giftClaimPost(
        makeJsonReq("/api/public/gift-claim", "POST", {
          invitationId: inv.id,
          itemId: "coffee-machine",
          guestName: "Sari",
          quantity: 1,
        }),
      ),
    ]);

    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses[0]).toBeLessThan(300);
    expect(statuses[1]).toBe(409);

    const getRes = await giftClaimGet(new NextRequest(`http://localhost/api/public/gift-claim?invitationId=${inv.id}`));
    const getBody = await getRes.json();
    expect(getRes.status).toBe(200);
    const espresso = getBody.claims.find((c: { itemId: string }) => c.itemId === "coffee-machine");
    expect(espresso?.claimedQty).toBe(1);
    expect(espresso?.claimers.length).toBe(1);
  });

  it("#10A/B SSE Check-in & Souvenir Tracking: token gate, scan emission, souvenir toggle, and guest count", async () => {
    const { inv, staffToken } = await seedInvitationWithStaffAndRegistry();

    const guest = await prisma.guest.create({
      data: {
        invitationId: inv.id,
        name: "Tamu VIP Satu",
        slug: `tamu-vip-${Math.random().toString(36).slice(2, 6)}`,
        category: "VIP",
        tableNumber: "VIP-01",
        qrToken: `QR-${RUN}-${Math.random().toString(36).slice(2, 6)}`,
        isTokenRedeemed: false,
      },
    });

    // SSE rejects unauthenticated request
    const unauthSse = await sseCheckinGet(new NextRequest(`http://localhost/api/sse/checkin?invitationId=${inv.id}`));
    expect(unauthSse.status).toBe(401);

    // SSE opens cleanly with valid token and aborts cleanly
    const abortCtrl = new AbortController();
    const okSse = await sseCheckinGet(
      new NextRequest(`http://localhost/api/sse/checkin?invitationId=${inv.id}&token=${encodeURIComponent(staffToken)}`, {
        signal: abortCtrl.signal,
      }),
    );
    expect(okSse.status).toBe(200);
    expect(okSse.headers.get("content-type")).toContain("text/event-stream");
    abortCtrl.abort();

    // Check-in scan succeeds and includes tableNumber + souvenirClaimed
    const scanRes = await scanPost(
      makeJsonReq("/api/receptionist/scan", "POST", {
        invitationId: inv.id,
        qrToken: guest.qrToken,
        isCheckIn: true,
        token: staffToken,
      }),
    );
    expect(scanRes.status).toBe(200);
    const scanJson = await scanRes.json();
    expect(scanJson.guest?.tableNumber).toBe("VIP-01");
    expect(scanJson.guest?.souvenirClaimed).toBe(false);

    // Unauthorized souvenir toggle is rejected
    const unauthSouv = await souvenirPost(
      makeJsonReq("/api/receptionist/souvenir", "POST", {
        invitationId: inv.id,
        guestId: guest.id,
        claimed: true,
      }),
    );
    expect(unauthSouv.status).toBe(401);

    // Toggle souvenir claimed -> true
    const souvOn = await souvenirPost(
      makeJsonReq(
        "/api/receptionist/souvenir",
        "POST",
        { invitationId: inv.id, guestId: guest.id, claimed: true },
        { "x-receptionist-token": staffToken },
      ),
    );
    expect(souvOn.status).toBe(200);
    const souvOnJson = await souvOn.json();
    expect(souvOnJson.guest?.souvenirClaimed).toBe(true);
    expect(souvOnJson.guest?.souvenirClaimedAt).toBeTruthy();

    // Receptionist guests endpoint reports souvenirCount = 1
    const guestsRes = await receptionistGuestsGet(
      new NextRequest(`http://localhost/api/receptionist/guests?invitationId=${inv.id}`, {
        headers: { "x-receptionist-token": staffToken },
      }),
    );
    expect(guestsRes.status).toBe(200);
    const guestsJson = await guestsRes.json();
    expect(guestsJson.souvenirCount).toBe(1);

    // Toggle souvenir claimed -> false
    const souvOff = await souvenirPost(
      makeJsonReq(
        "/api/receptionist/souvenir",
        "POST",
        { invitationId: inv.id, guestId: guest.id, claimed: false },
        { "x-receptionist-token": staffToken },
      ),
    );
    expect(souvOff.status).toBe(200);
    expect((await souvOff.json()).guest?.souvenirClaimed).toBe(false);
  });

  it("#11 Partner Portal: OTP verify sets HttpOnly cookie and dashboard returns read-only coupons + commissions", async () => {
    const partnerEmail = `${RUN}-partner@example.com`;
    cleanup.otpEmails.push(partnerEmail);

    const partner = await prisma.partnerAffiliate.create({
      data: {
        name: "WO Harmoni",
        email: partnerEmail,
        bankName: "BCA",
        accountNumber: "1234567890",
        accountName: "WO Harmoni",
        commissionType: "PERCENT",
        commissionValue: 15,
        pendingBalance: 75000,
        totalPaidOut: 150000,
        isActive: true,
      },
    });
    cleanup.partners.push(partner.id);

    const coupon = await prisma.promoCoupon.create({
      data: {
        code: `${RUN.toUpperCase()}15`,
        discountType: "PERCENT",
        discountValue: 10,
        partnerId: partner.id,
        usageCount: 3,
        isActive: true,
      },
    });
    cleanup.coupons.push(coupon.id);

    const buyer = await prisma.user.create({
      data: {
        email: `${RUN}-buyer@example.com`,
        name: "Partner Referral Buyer",
        role: "CLIENT",
      },
    });
    cleanup.users.push(buyer.id);

    const order = await prisma.order.create({
      data: {
        userId: buyer.id,
        invoiceNumber: `INV-${RUN}-REF`,
        planType: "TIER_2",
        amount: 500000,
        status: "PAID",
        orderType: "NEW",
        promoCouponId: coupon.id,
        paidAt: new Date(),
      },
    });
    cleanup.orders.push(order.id);

    await prisma.affiliateCommission.create({
      data: {
        partnerId: partner.id,
        orderId: order.id,
        orderAmount: 500000,
        commissionAmount: 75000,
        status: "PENDING",
      },
    });

    // Session helper tamper check
    const rawCookie = signPartnerSession(partner.id, partnerEmail);
    expect(verifyPartnerSession(rawCookie)?.partnerId).toBe(partner.id);
    expect(verifyPartnerSession(`${rawCookie}tamper`)).toBeNull();

    // Unauthenticated dashboard is 401
    const unauthDash = await partnerDashboardGet(new NextRequest("http://localhost/api/partner/dashboard"));
    expect(unauthDash.status).toBe(401);

    // Unactivated partner trying password login receives 403 PASSWORD_NOT_SET
    const preActLogin = await partnerPasswordLoginPost(
      makeJsonReq("/api/partner/auth/login", "POST", { email: partnerEmail, password: "MitraPassword#2026" }),
    );
    expect(preActLogin.status).toBe(403);
    const preActJson = await preActLogin.json();
    expect(preActJson.code).toBe("PASSWORD_NOT_SET");

    // Partner Opsi A: Activation OTP -> set password -> HttpOnly session cookie
    const otpReq = await partnerOtpReqPost(
      makeJsonReq("/api/partner/auth/request-otp", "POST", { email: partnerEmail, purpose: "PARTNER_ACTIVATE" }),
    );
    expect(otpReq.status).toBe(200);
    const otpReqJson = await otpReq.json();
    expect(otpReqJson.message).toMatch(/Spam/i);
    const partnerMail = sentOtps.find((m) => m.to === partnerEmail && m.purpose === "PARTNER_ACTIVATE");
    expect(partnerMail?.code).toMatch(/^\d{6}$/);

    const activateRes = await partnerSetPasswordPost(
      makeJsonReq("/api/partner/auth/set-password", "POST", {
        email: partnerEmail,
        code: partnerMail!.code,
        password: "MitraPassword#2026",
        purpose: "PARTNER_ACTIVATE",
      }),
    );
    expect(activateRes.status).toBe(200);
    expect(activateRes.cookies.get(PARTNER_COOKIE_NAME)?.value).toBeTruthy();

    // Already-activated partner cannot re-run PARTNER_ACTIVATE (409)
    const repeatActivate = await partnerOtpReqPost(
      makeJsonReq("/api/partner/auth/request-otp", "POST", { email: partnerEmail, purpose: "PARTNER_ACTIVATE" }),
    );
    expect(repeatActivate.status).toBe(409);

    // Wrong password rejected (401)
    const wrongLogin = await partnerPasswordLoginPost(
      makeJsonReq("/api/partner/auth/login", "POST", { email: partnerEmail, password: "SalahPassword123" }),
    );
    expect(wrongLogin.status).toBe(401);

    // Password login succeeds and returns HttpOnly session cookie
    const pwLoginRes = await partnerPasswordLoginPost(
      makeJsonReq("/api/partner/auth/login", "POST", { email: partnerEmail, password: "MitraPassword#2026" }),
    );
    expect(pwLoginRes.status).toBe(200);
    const sessionCookie = pwLoginRes.cookies.get(PARTNER_COOKIE_NAME)?.value;
    expect(sessionCookie).toBeTruthy();

    // Partner password reset via OTP
    const resetOtpReq = await partnerOtpReqPost(
      makeJsonReq("/api/partner/auth/request-otp", "POST", { email: partnerEmail, purpose: "PARTNER_RESET_PASSWORD" }),
    );
    expect(resetOtpReq.status).toBe(200);
    const resetPartnerMail = sentOtps.find((m) => m.to === partnerEmail && m.purpose === "PARTNER_RESET_PASSWORD");
    expect(resetPartnerMail?.code).toMatch(/^\d{6}$/);

    const resetPwRes = await partnerSetPasswordPost(
      makeJsonReq("/api/partner/auth/set-password", "POST", {
        email: partnerEmail,
        code: resetPartnerMail!.code,
        password: "MitraBaru#2026",
        purpose: "PARTNER_RESET_PASSWORD",
      }),
    );
    expect(resetPwRes.status).toBe(200);
    const newLoginRes = await partnerPasswordLoginPost(
      makeJsonReq("/api/partner/auth/login", "POST", { email: partnerEmail, password: "MitraBaru#2026" }),
    );
    expect(newLoginRes.status).toBe(200);
    const newSessionCookie = newLoginRes.cookies.get(PARTNER_COOKIE_NAME)?.value;
    expect(newSessionCookie).toBeTruthy();

    // Old session cookie from before password reset is revoked (401)
    const staleDashRes = await partnerDashboardGet(
      new NextRequest("http://localhost/api/partner/dashboard", {
        headers: { cookie: `${PARTNER_COOKIE_NAME}=${sessionCookie}` },
      }),
    );
    expect(staleDashRes.status).toBe(401);

    // Authenticated dashboard with fresh post-reset HttpOnly session cookie
    const dashReq = new NextRequest("http://localhost/api/partner/dashboard", {
      headers: { cookie: `${PARTNER_COOKIE_NAME}=${newSessionCookie}` },
    });
    const dashRes = await partnerDashboardGet(dashReq);
    expect(dashRes.status).toBe(200);
    const dash = await dashRes.json();

    expect(dash.partner.name).toBe("WO Harmoni");
    expect(dash.partner.pendingBalance).toBe(75000);
    expect(dash.partner.totalPaidOut).toBe(150000);
    expect(dash.partner.accountNumberMasked).toMatch(/^\*+7890$/);
    expect(dash.coupons[0].code).toBe(coupon.code);
    expect(dash.commissions).toHaveLength(1);
    expect(dash.commissions[0].order.invoiceNumber).toBe(order.invoiceNumber);
  });
});
