/**
 * Pembelian lanjutan klien (DB luxenary_test): perpanjangan masa aktif galeri, upgrade paket, dan pemenuhannya
 * setelah lunas. Top-up kuota foto dijaga di paymentRecovery.test.ts; berkas ini menutup dua jalur yang belum diuji.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: { id: string; email: string; role: string; isAdmin: boolean; permissions: string[] } | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as checkoutBundle } from "@/app/api/client/orders/checkout-bundle/route";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { settleOrderAsPaid } from "@/lib/paymentSettlement";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { computeLifecycleDates, DAY_MS } from "@/lib/lifecycleDates";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_addon_${Date.now()}`;
const ids = { users: [] as string[], orders: [] as string[], invitations: [] as string[] };

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

async function makeClient(tag: string, planType: "TIER_2" | "TIER_3", eventDate: string) {
  const user = await prisma.user.create({ data: { email: `${RUN}_${tag}@test.local`, name: tag } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${RUN}-${tag}`, planType, amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  ids.orders.push(order.id);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      orderId: order.id,
      themeId: "kalandra",
      status: "PUBLISHED",
      invitationSlug: `${RUN}-${tag}`,
      groomSlug: `${RUN}-g-${tag}`,
      brideSlug: `${RUN}-b-${tag}`,
      featureSettings: JSON.stringify({}),
      eventData: JSON.stringify([{ title: "Resepsi", date: eventDate, time: "11:00 - 14:00 WITA", timezone: "WITA", location: "Gedung", isPrimary: true }]),
    },
  });
  ids.invitations.push(inv.id);
  sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false, permissions: [] };
  return { userId: user.id, invitationId: inv.id, orderId: order.id };
}

const buy = async (body: Record<string, unknown>) => {
  const res = await checkoutBundle(
    new NextRequest("http://localhost/api/client/orders/checkout-bundle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  const json = await res.json();
  if (json.orderId) ids.orders.push(json.orderId);
  return { status: res.status, json };
};

const payAndFulfill = async (orderId: string) => {
  expect(await settleOrderAsPaid(orderId)).toBeTruthy();
  await applyUpgradePlan(orderId);
};

describe.skipIf(!IS_TEST_DB)("perpanjangan masa aktif galeri", () => {
  it("ditolak bila masa galeri masih lebih dari 7 hari", async () => {
    const { invitationId } = await makeClient("ext-early", "TIER_2", isoDay(new Date(Date.now() + 60 * DAY_MS)));
    const { status, json } = await buy({ invitationId, extensionMonths: 1 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/H-7/);
  });

  it("diterima pada H-7, lunas menambah 30 hari, dan perpanjangan kedua ditolak", async () => {
    const { galleryRetentionDays } = await getLifecycleSettings();
    const eventDate = isoDay(new Date(Date.now() - (galleryRetentionDays - 4) * DAY_MS));
    const { invitationId } = await makeClient("ext-window", "TIER_2", eventDate);
    const before = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } });
    const expiryBefore = computeLifecycleDates(before, await getLifecycleSettings())!.galleryExpiresAt;

    const { status, json } = await buy({ invitationId, extensionMonths: 1 });
    expect(status).toBe(200);
    expect(json.items.map((i: { type: string }) => i.type)).toEqual(["GALLERY_EXTENSION"]);

    await payAndFulfill(json.orderId);
    const after = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } });
    expect(JSON.parse(after.featureSettings || "{}").extraGalleryDays).toBe(30);
    expect(after.galleryExpiresAt!.getTime() - expiryBefore.getTime()).toBe(30 * DAY_MS);

    const again = await buy({ invitationId, extensionMonths: 1 });
    expect(again.status).toBe(400);
  });
});

describe.skipIf(!IS_TEST_DB)("upgrade paket", () => {
  it("TIER_2 ke TIER_3 menagih selisih harga dan menaikkan paket setelah lunas", async () => {
    const { invitationId, orderId } = await makeClient("upg", "TIER_2", isoDay(new Date(Date.now() + 60 * DAY_MS)));
    const prices = await prisma.adminSetting.findMany({ where: { key: { in: ["price_tier2", "price_tier3"] } } });
    const price = (key: string, fallback: number) => Number(prices.find((p) => p.key === key)?.value) || fallback;

    const { status, json } = await buy({ invitationId, targetPlan: "TIER_3" });
    expect(status).toBe(200);
    expect(json.amount).toBe(price("price_tier3", 200000) - price("price_tier2", 150000));

    await payAndFulfill(json.orderId);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).planType).toBe("TIER_3");
  });

  it("turun paket atau paket yang sama ditolak", async () => {
    const { invitationId } = await makeClient("upg-down", "TIER_3", isoDay(new Date(Date.now() + 60 * DAY_MS)));
    expect((await buy({ invitationId, targetPlan: "TIER_2" })).status).toBe(400);
    expect((await buy({ invitationId, targetPlan: "TIER_3" })).status).toBe(400);
  });
});

afterAll(async () => {
  await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
  await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  await prisma.$disconnect();
  await pool.end();
});
