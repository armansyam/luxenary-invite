import { describe, it, expect, vi, afterAll, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

type MockSession = {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
    isAdmin?: boolean;
  };
} | null;

let activeSession: MockSession = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => activeSession),
}));

vi.mock("@/lib/mailer", () => ({
  sendLoginOtpEmail: vi.fn(async () => ({ success: true })),
  sendInvoiceEmail: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/cloudflare", () => ({
  purgeInvitationEdgeCache: vi.fn(async () => {}),
}));

import { prisma, pool } from "@/lib/prisma";
import { POST as freeDraftPost } from "@/app/api/client/invitations/free-draft/route";
import { GET as onboardingStateGet } from "@/app/api/client/onboarding-state/route";
import { PUT as invitationPut, PATCH as invitationPatch } from "@/app/api/client/invitations/[id]/route";
import { GET as invitationPreviewGet } from "@/app/api/client/invitations/[id]/preview/route";
import { GET as publicSlugGet } from "@/app/(public)/[slug]/route";
import { POST as uploadPost } from "@/app/api/client/upload/route";
import { POST as ordersCreatePost } from "@/app/api/orders/create/route";
import { GET as orderStatusGet } from "@/app/api/client/orders/[id]/status/route";
import { POST as invitationCreatePost } from "@/app/api/client/invitations/create/route";
import { GET as guestListGet } from "@/app/api/client/guests/[id]/route";
import { GET as exportGet } from "@/app/api/client/invitations/[id]/export/route";
import { GET as clientGiftClaimsGet } from "@/app/api/client/gift-claims/route";
import { DELETE as clientGiftClaimDelete } from "@/app/api/client/gift-claims/[id]/route";
import { POST as publicGiftClaimPost } from "@/app/api/public/gift-claim/route";
import { settleOrderAsPaid } from "@/lib/paymentSettlement";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { purgeExpiredFreeDrafts } from "@/lib/lifecycleCleanup";
import { composeInvitationData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import {
  buildEnforcedCsp,
  buildStrictAppCspReportOnly,
  generateCspNonce,
  isInvitationHtmlRoute,
} from "@/lib/csp";
import { getCspViolationSummary, recordCspViolation } from "@/lib/cspReports";
import { getCatalogMediaSlots, loadThemeMediaSlotsCatalog } from "@/lib/themeMediaSlotsCatalog";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `wave3-${Date.now().toString(36)}`;

const cleanup = {
  invitations: [] as string[],
  orders: [] as string[],
  users: [] as string[],
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

describe.skipIf(!IS_TEST_DB)("Wave 3 & Deep Audit Integration", () => {
  beforeEach(() => {
    activeSession = null;
  });

  afterAll(async () => {
    for (const invId of cleanup.invitations) {
      fs.rmSync(path.join(process.cwd(), "public", "published", "ids", `${invId}.html`), { force: true });
      fs.rmSync(path.join(process.cwd(), "data", "drafts", `${invId}.html`), { force: true });
      fs.rmSync(path.join(process.cwd(), "public", "uploads", "invitations", invId), { recursive: true, force: true });
    }
    for (const slug of cleanup.slugs) {
      fs.rmSync(path.join(process.cwd(), "data", "archives", slug), { recursive: true, force: true });
    }
    if (cleanup.invitations.length) {
      await prisma.invitation.deleteMany({ where: { id: { in: cleanup.invitations } } }).catch(() => {});
    }
    if (cleanup.orders.length) {
      await prisma.order.deleteMany({ where: { id: { in: cleanup.orders } } }).catch(() => {});
    }
    if (cleanup.users.length) {
      await prisma.user.deleteMany({ where: { id: { in: cleanup.users } } }).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  it("Free Draft full lifecycle: create max-1, watermark all preview routes, block subdomain/audio/>3 photos/publish, convert via paid order, and purge >14d", async () => {
    const user = await prisma.user.create({
      data: {
        email: `${RUN}-free@example.test`,
        name: "Free Draft Tester",
        role: "CLIENT",
      },
    });
    cleanup.users.push(user.id);
    activeSession = { user: { id: user.id, email: user.email, name: user.name || "", role: "CLIENT" } };

    // 1. Create Free Draft (and verify idempotency = max 1)
    const createRes = await freeDraftPost(makeJsonReq("/api/client/invitations/free-draft", "POST", { eventType: "WEDDING" }));
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    const freeDraftId = createJson.invitation.id as string;
    const freeSlug = createJson.invitation.invitationSlug as string;
    cleanup.invitations.push(freeDraftId);
    cleanup.slugs.push(freeSlug);
    expect(createJson.invitation.isFreeDraft).toBe(true);

    const dupRes = await freeDraftPost(makeJsonReq("/api/client/invitations/free-draft", "POST", { eventType: "WEDDING" }));
    expect(dupRes.status).toBe(200);
    const dupJson = await dupRes.json();
    expect(dupJson.alreadyExists).toBe(true);
    expect(dupJson.invitation.id).toBe(freeDraftId);

    // 2. Onboarding state returns FREE_DRAFT with hasPaidOrder: false
    const onboardRes = await onboardingStateGet();
    const onboardJson = await onboardRes.json();
    expect(onboardJson.step).toBe("FREE_DRAFT");
    expect(onboardJson.hasPaidOrder).toBe(false);
    expect(onboardJson.hasFreeDraft).toBe(true);

    // 3. Watermark appears in studio preview AND public ?preview=true route
    const studioPrevRes = await invitationPreviewGet(
      makeJsonReq(`/api/client/invitations/${freeDraftId}/preview`, "GET"),
      { params: Promise.resolve({ id: freeDraftId }) },
    );
    expect(studioPrevRes.status).toBe(200);
    const studioPrevHtml = await studioPrevRes.text();
    expect(studioPrevHtml).toContain("lux-free-draft-watermark-style");
    expect(studioPrevHtml).toContain("PRATINJAU DRAF GRATIS");

    const publicPrevRes = await publicSlugGet(
      makeJsonReq(`/${freeSlug}?preview=true`, "GET"),
      { params: Promise.resolve({ slug: freeSlug }) },
    );
    expect(publicPrevRes.status).toBe(200);
    const publicPrevHtml = await publicPrevRes.text();
    expect(publicPrevHtml).toContain("lux-free-draft-watermark-style");

    // 4. Guards on Free Draft: subdomain (403), >3 photos in PUT (403), Google Drive gallery (403), publish (402), DEPLOY_AND_LOCK (402), audio upload (403)
    const subRes = await invitationPut(
      makeJsonReq(`/api/client/invitations/${freeDraftId}`, "PUT", { subdomain: `${RUN}-squat` }),
      { params: Promise.resolve({ id: freeDraftId }) },
    );
    expect(subRes.status).toBe(403);

    const photoLimitRes = await invitationPut(
      makeJsonReq(`/api/client/invitations/${freeDraftId}`, "PUT", {
        media: {
          LANDING_COVER: "/uploads/dummy/AMS06364.webp",
          HOME_PHOTO: "/uploads/dummy/AMS06353.webp",
          GROOM_PHOTO: "/uploads/dummy/AMS06381.webp",
          BRIDE_PHOTO: "/uploads/dummy/AMS06388.webp",
        },
      }),
      { params: Promise.resolve({ id: freeDraftId }) },
    );
    expect(photoLimitRes.status).toBe(403);

    const driveRes = await invitationPut(
      makeJsonReq(`/api/client/invitations/${freeDraftId}`, "PUT", {
        featureSettings: { galleryDriveFolderUrl: "https://drive.google.com/drive/folders/abc123" },
      }),
      { params: Promise.resolve({ id: freeDraftId }) },
    );
    expect(driveRes.status).toBe(403);

    const pubPutRes = await invitationPut(
      makeJsonReq(`/api/client/invitations/${freeDraftId}`, "PUT", { status: "PUBLISHED" }),
      { params: Promise.resolve({ id: freeDraftId }) },
    );
    expect(pubPutRes.status).toBe(402);

    const deployPutRes = await invitationPut(
      makeJsonReq(`/api/client/invitations/${freeDraftId}`, "PUT", { action: "DEPLOY_AND_LOCK" }),
      { params: Promise.resolve({ id: freeDraftId }) },
    );
    expect(deployPutRes.status).toBe(402);

    const drivePatchRes = await invitationPatch(
      makeJsonReq(`/api/client/invitations/${freeDraftId}`, "PATCH", {
        featureSettings: { galleryDriveFolderUrl: "https://drive.google.com/drive/folders/abc123" },
      }),
      { params: Promise.resolve({ id: freeDraftId }) },
    );
    expect(drivePatchRes.status).toBe(403);

    const audioForm = new FormData();
    audioForm.append("invitationId", freeDraftId);
    audioForm.append("slot", "MUSIC");
    audioForm.append("file", new File([new Uint8Array([0x49, 0x44, 0x33, 0x03])], "song.mp3", { type: "audio/mpeg" }));
    const audioReq = new NextRequest("http://localhost/api/client/upload", { method: "POST", body: audioForm });
    const audioUploadRes = await uploadPost(audioReq);
    expect(audioUploadRes.status).toBe(403);

    // 5. Free Draft user CAN create a paid order (no deadlock!)
    const orderRes = await ordersCreatePost(
      makeJsonReq("/api/orders/create", "POST", { planType: "TIER_2", buyerName: "Free Draft Tester" }),
    );
    expect(orderRes.status).toBe(200);
    const orderJson = await orderRes.json();
    const orderId = orderJson.orderId as string;
    expect(orderId).toBeTruthy();
    cleanup.orders.push(orderId);

    // 6. Settling & fulfilling the NEW order converts Free Draft -> Paid Invitation & removes watermark
    const settled = await settleOrderAsPaid(orderId, {
      gatewayTxId: `tx-${RUN}-1`,
    });
    expect(settled).toBe(true);
    await applyUpgradePlan(orderId);

    const activatedInv = await prisma.invitation.findUnique({ where: { id: freeDraftId } });
    expect(activatedInv?.isFreeDraft).toBe(false);
    expect(activatedInv?.orderId).toBe(orderId);

    const paidStatusRes = await orderStatusGet(
      makeJsonReq(`/api/client/orders/${orderId}/status`, "GET"),
      { params: Promise.resolve({ id: orderId }) },
    );
    expect(paidStatusRes.status).toBe(200);
    const paidStatusJson = await paidStatusRes.json();
    expect(paidStatusJson.status).toBe("PAID");
    expect(paidStatusJson.activatedInvitationId).toBe(freeDraftId);

    const cleanPrevRes = await invitationPreviewGet(
      makeJsonReq(`/api/client/invitations/${freeDraftId}/preview`, "GET"),
      { params: Promise.resolve({ id: freeDraftId }) },
    );
    expect(cleanPrevRes.status).toBe(200);
    const cleanPrevHtml = await cleanPrevRes.text();
    expect(cleanPrevHtml).not.toContain("lux-free-draft-watermark");

    // 7. Purge expired (>14d) free draft + disk files while keeping fresh free draft
    const staleUser = await prisma.user.create({
      data: { email: `${RUN}-stale@example.test`, name: "Stale Free", role: "CLIENT" },
    });
    const freshUser = await prisma.user.create({
      data: { email: `${RUN}-fresh@example.test`, name: "Fresh Free", role: "CLIENT" },
    });
    cleanup.users.push(staleUser.id, freshUser.id);

    const oldDate = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
    const staleDraft = await prisma.invitation.create({
      data: {
        userId: staleUser.id,
        isFreeDraft: true,
        status: "DRAFT",
        themeId: "kalandra",
        invitationSlug: `${RUN}-stale-draft`,
        createdAt: oldDate,
      },
    });
    const freshDraft = await prisma.invitation.create({
      data: {
        userId: freshUser.id,
        isFreeDraft: true,
        status: "DRAFT",
        themeId: "kalandra",
        invitationSlug: `${RUN}-fresh-draft`,
      },
    });
    cleanup.invitations.push(staleDraft.id, freshDraft.id);

    const staleUploadDir = path.join(process.cwd(), "public", "uploads", "invitations", staleDraft.id);
    fs.mkdirSync(staleUploadDir, { recursive: true });
    fs.writeFileSync(path.join(staleUploadDir, "cover.webp"), "dummy");

    const purgedCount = await purgeExpiredFreeDrafts(new Date(), false);
    expect(purgedCount).toBeGreaterThanOrEqual(1);
    expect(await prisma.invitation.findUnique({ where: { id: staleDraft.id } })).toBeNull();
    expect(fs.existsSync(staleUploadDir)).toBe(false);
    expect(await prisma.invitation.findUnique({ where: { id: freshDraft.id } })).not.toBeNull();
  });

  it("Multi-invitation self-service: allows purchasing Invitation #2 with allowAdditional while blocking concurrent double-pay", async () => {
    const user = await prisma.user.create({
      data: { email: `${RUN}-multi@example.test`, name: "Multi Host", role: "CLIENT" },
    });
    cleanup.users.push(user.id);
    activeSession = { user: { id: user.id, email: user.email, name: "Multi Host", role: "CLIENT" } };

    const order1 = await prisma.order.create({
      data: {
        userId: user.id,
        invoiceNumber: `INV-${RUN}-1`,
        planType: "TIER_2",
        orderType: "NEW",
        amount: new Prisma.Decimal(149000),
        status: "PAID",
        paidAt: new Date(),
      },
    });
    cleanup.orders.push(order1.id);

    const inv1 = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order1.id,
        isFreeDraft: false,
        status: "DRAFT",
        themeId: "kalandra",
        invitationSlug: `${RUN}-inv-1`,
      },
    });
    cleanup.invitations.push(inv1.id);

    // Without allowAdditional -> blocked 400
    const blockedRes = await ordersCreatePost(
      makeJsonReq("/api/orders/create", "POST", { planType: "TIER_2" }),
    );
    expect(blockedRes.status).toBe(400);

    // With allowAdditional: true -> creates Order #2 cleanly
    const secondRes = await ordersCreatePost(
      makeJsonReq("/api/orders/create", "POST", { planType: "TIER_2", allowAdditional: true }),
    );
    expect(secondRes.status).toBe(200);
    const secondJson = await secondRes.json();
    const order2Id = secondJson.orderId as string;
    cleanup.orders.push(order2Id);

    // Order #2 status MUST return isUserPaid: false because Order #1 is already linked to Invitation #1
    const order2StatusRes = await orderStatusGet(
      makeJsonReq(`/api/client/orders/${order2Id}/status`, "GET"),
      { params: Promise.resolve({ id: order2Id }) },
    );
    expect(order2StatusRes.status).toBe(200);
    const order2StatusJson = await order2StatusRes.json();
    expect(order2StatusJson.status).toBe("PENDING");
    expect(order2StatusJson.isUserPaid).toBe(false);

    // Create a competing unlinked PENDING order to test double-pay guard
    const competingOrder = await prisma.order.create({
      data: {
        userId: user.id,
        invoiceNumber: `INV-${RUN}-RACE`,
        planType: "TIER_2",
        orderType: "NEW",
        amount: new Prisma.Decimal(149000),
        status: "PENDING",
      },
    });
    cleanup.orders.push(competingOrder.id);

    // Order #2 settles cleanly because Order #1 is already linked to inv1
    const settle2 = await settleOrderAsPaid(order2Id, {
      gatewayTxId: `tx-${RUN}-2`,
    });
    expect(settle2).toBe(true);

    // Competing unlinked Order MUST be blocked from settling while Order #2 is unlinked
    const settleRace = await settleOrderAsPaid(competingOrder.id, {
      gatewayTxId: `tx-${RUN}-race`,
    });
    expect(settleRace).toBe(false);

    // onboarding-state prioritizes unlinked Order #2 -> PAID_NEED_SETUP
    const stateRes = await onboardingStateGet();
    const stateJson = await stateRes.json();
    expect(stateJson.step).toBe("PAID_NEED_SETUP");
    expect(stateJson.orderId).toBe(order2Id);

    // POST /api/client/invitations/create creates Invitation #2 WITHOUT overwriting Invitation #1!
    const inv2Res = await invitationCreatePost(
      makeJsonReq("/api/client/invitations/create", "POST", {
        eventType: "WEDDING",
        themeId: "kalandra",
        groomName: "Ardian",
        brideName: "Nadia",
        events: [{ title: "Akad", date: "2027-06-15", startTime: "09:00", location: "Jakarta" }],
      }),
    );
    expect([200, 201]).toContain(inv2Res.status);
    const inv2Json = await inv2Res.json();
    const inv2Id = (inv2Json.invitationId || inv2Json.id || inv2Json.invitation?.id) as string;
    expect(inv2Id).toBeTruthy();
    cleanup.invitations.push(inv2Id);
    expect(inv2Id).not.toBe(inv1.id);
    const inv2Reload = await prisma.invitation.findUnique({ where: { id: inv2Id } });
    expect(inv2Reload?.orderId).toBe(order2Id);

    const inv1Reload = await prisma.invitation.findUnique({ where: { id: inv1.id } });
    expect(inv1Reload?.orderId).toBe(order1.id);
  });

  it("Bilingual EN full shell, OpenGraph meta, and English live RSVP JS", async () => {
    const composed = await composeInvitationData({
      id: `en-${RUN}`,
      themeId: "velvet-rose",
      eventType: "WEDDING",
      invitationSlug: `${RUN}-en-wedding`,
      status: "DRAFT",
      participantsJson: {
        groom: { nickname: "Liam", fullName: "Liam Pratama" },
        bride: { nickname: "Clara", fullName: "Clara Wijaya" },
      },
      eventData: [{ title: "Wedding Ceremony", date: "2027-08-20", startTime: "10:00", endTime: "12:00", location: "Bali" }],
      featureSettings: { language: "en" },
      media: [],
      rsvps: [],
      giftClaims: [],
    } as never);

    expect(composed.invitationLocale).toBe("en");
    expect(composed.openBtn).toBe("Open Invitation");
    expect(composed.coverGuestLabel).toBe("Dear Honorable Guest");
    expect(composed.rsvpTitle).toBe("RSVP & Attendance");
    expect(composed.rsvpBtnText).toBe("Send RSVP & Wishes");
    expect(String(composed.metaTagsHtml)).toContain("Wedding Invitation");

    const html = await renderTemplateFile("kalandra", composed as Record<string, unknown>, { eventType: "WEDDING" });
    expect(html).toMatch(/<html[^>]*lang="en"/i);
    expect(html).toContain("Thank you, your RSVP & wishes have been received!");
  });

  it("Gift Registry host moderation, enriched CSV exports (wishes/guests/gifts), and guest funnel summary", async () => {
    const owner = await prisma.user.create({
      data: { email: `${RUN}-host@example.test`, name: "Host", role: "CLIENT" },
    });
    const stranger = await prisma.user.create({
      data: { email: `${RUN}-other@example.test`, name: "Other", role: "CLIENT" },
    });
    cleanup.users.push(owner.id, stranger.id);

    const inv = await prisma.invitation.create({
      data: {
        userId: owner.id,
        status: "PUBLISHED",
        themeId: "kalandra",
        invitationSlug: `${RUN}-gift-export`,
        featureSettings: {
          giftRegistry: [
            { id: "toaster-1", name: "Toaster SMEG", priceHint: "Rp 2.500.000", qtyNeeded: 2 },
          ],
        },
      },
    });
    cleanup.invitations.push(inv.id);

    // Seed guests (1 opened + souvenir, 1 unopened VIP) & RSVP with host reply
    await prisma.guest.createMany({
      data: [
        { invitationId: inv.id, name: "Budi Santoso", slug: `${RUN}-budi`, category: "Reguler", isTokenRedeemed: true, souvenirClaimed: true, souvenirClaimedAt: new Date() },
        { invitationId: inv.id, name: "Pak Menteri VIP", slug: `${RUN}-vip`, category: "VIP", isTokenRedeemed: false, souvenirClaimed: false },
      ],
    });
    await prisma.invitationVisit.create({
      data: { invitationId: inv.id, visitorId: `v-${RUN}-1`, guestName: "Budi Santoso", visitCount: 2, firstSeenAt: new Date(), lastSeenAt: new Date() },
    });
    await prisma.rsvp.create({
      data: {
        invitationId: inv.id,
        guestName: "Budi Santoso",
        status: "hadir",
        guestCount: 2,
        message: "Selamat menempuh hidup baru!",
        replyMessage: "Terima kasih banyak Pak Budi!",
        repliedAt: new Date(),
      },
    });

    // Public gift claim
    const claimRes = await publicGiftClaimPost(
      makeJsonReq("/api/public/gift-claim", "POST", {
        invitationId: inv.id,
        itemId: "toaster-1",
        guestName: "Siti Aminah",
        quantity: 1,
        note: "Warna krem ya",
      }),
    );
    expect([200, 201]).toContain(claimRes.status);
    const claimJson = await claimRes.json();
    const claimId = claimJson.claim.id as string;

    // Owner lists claims
    activeSession = { user: { id: owner.id, email: owner.email, role: "CLIENT" } };
    const listRes = await clientGiftClaimsGet(
      makeJsonReq(`/api/client/gift-claims?invitationId=${inv.id}`, "GET"),
    );
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.claims).toHaveLength(1);
    expect(listJson.claims[0].itemName).toBe("Toaster SMEG");

    // Funnel summary includes souvenirCount & unopenedVipGuests
    const sumRes = await guestListGet(
      makeJsonReq(`/api/client/guests/${inv.id}?summary=1`, "GET"),
      { params: Promise.resolve({ id: inv.id }) },
    );
    expect(sumRes.status).toBe(200);
    const sumJson = await sumRes.json();
    expect(sumJson.souvenirCount).toBe(1);
    expect(sumJson.unopenedVipGuests).toHaveLength(1);
    expect(sumJson.unopenedVipGuests[0].name).toBe("Pak Menteri VIP");

    // Enriched CSV exports (wishes, guests, gifts)
    const wishesCsv = await (await exportGet(
      makeJsonReq(`/api/client/invitations/${inv.id}/export?type=wishes`, "GET"),
      { params: Promise.resolve({ id: inv.id }) },
    )).text();
    expect(wishesCsv).toContain("Balasan Tuan Rumah");
    expect(wishesCsv).toContain("Terima kasih banyak Pak Budi!");

    const guestsCsv = await (await exportGet(
      makeJsonReq(`/api/client/invitations/${inv.id}/export?type=guests`, "GET"),
      { params: Promise.resolve({ id: inv.id }) },
    )).text();
    expect(guestsCsv).toContain("Status Dibuka");
    expect(guestsCsv).toContain("Status Souvenir");
    expect(guestsCsv).toContain("Sudah Diambil");

    const giftsCsv = await (await exportGet(
      makeJsonReq(`/api/client/invitations/${inv.id}/export?type=gifts`, "GET"),
      { params: Promise.resolve({ id: inv.id }) },
    )).text();
    expect(giftsCsv).toContain("Nama Kado");
    expect(giftsCsv).toContain("Toaster SMEG");
    expect(giftsCsv).toContain("Siti Aminah");

    // Stranger cannot delete claim (403)
    activeSession = { user: { id: stranger.id, email: stranger.email, role: "CLIENT" } };
    const forbidRes = await clientGiftClaimDelete(
      makeJsonReq(`/api/client/gift-claims/${claimId}`, "DELETE"),
      { params: Promise.resolve({ id: claimId }) },
    );
    expect(forbidRes.status).toBe(403);

    // Owner deletes claim (200)
    activeSession = { user: { id: owner.id, email: owner.email, role: "CLIENT" } };
    const delRes = await clientGiftClaimDelete(
      makeJsonReq(`/api/client/gift-claims/${claimId}`, "DELETE"),
      { params: Promise.resolve({ id: claimId }) },
    );
    expect(delRes.status).toBe(200);
    expect(await prisma.giftClaim.findUnique({ where: { id: claimId } })).toBeNull();
  });

  it("CSP helpers & report telemetry, and Media Slots catalog (81 master unik)", async () => {
    // 1. CSP helpers & telemetry
    const nonce = generateCspNonce();
    expect(nonce.length).toBeGreaterThanOrEqual(16);
    expect(buildEnforcedCsp()).toContain("report-uri /api/security/csp-report");
    expect(buildStrictAppCspReportOnly(nonce)).toContain(`'nonce-${nonce}'`);
    expect(isInvitationHtmlRoute("/dashboard")).toBe(false);
    expect(isInvitationHtmlRoute("/partner")).toBe(false);
    expect(isInvitationHtmlRoute("/s/andi-budi")).toBe(true);
    expect(isInvitationHtmlRoute("/andi-budi")).toBe(true);

    const beforeTotal = getCspViolationSummary().totalSinceBoot;
    recordCspViolation({ directive: "script-src", blocked: "https://evil.test/x.js", document: "/dashboard" });
    const afterSummary = getCspViolationSummary();
    expect(afterSummary.totalSinceBoot).toBe(beforeTotal + 1);
    expect(afterSummary.recent[0].directive).toBe("script-src");

    // 3. Media Slots catalog (loaded from lib/themeMediaSlotsCatalog.json)
    const catalog = loadThemeMediaSlotsCatalog(true);
    expect(Object.keys(catalog).length).toBeGreaterThan(20);
    const valenteSlots = getCatalogMediaSlots("valente");
    expect(valenteSlots).not.toBeNull();
    expect(valenteSlots?.GLOBAL_FIXED_BG).toBeDefined();
    expect(valenteSlots?.LANDING_COVER).toBeDefined();
  });
});
