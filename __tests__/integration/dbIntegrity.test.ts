/**
 * Integritas skema: FK tema dan payout, presisi uang, indeks FK, dan penolakan hapus tema yang sedang dipakai.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "t", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })),
}));

import { DELETE as deleteTheme } from "@/app/api/admin/themes/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `dbint${Date.now()}`;
const THEME_ID = `${TAG}-theme`;

let userId = "";
let invitationId = "";
let orderId = "";
let partnerId = "";
let commissionId = "";
let expenseId = "";

describe.skipIf(!IS_TEST_DB)("integritas skema database", () => {
  beforeAll(async () => {
    await prisma.theme.create({ data: { id: THEME_ID, name: THEME_ID, category: "modern" } });
    const user = await prisma.user.create({ data: { email: `${TAG}@example.test`, name: TAG } });
    userId = user.id;
    const inv = await prisma.invitation.create({
      data: { userId, themeId: THEME_ID, invitationSlug: `${TAG}-inv`, groomSlug: `${TAG}-g`, brideSlug: `${TAG}-b` },
    });
    invitationId = inv.id;
    const order = await prisma.order.create({
      data: { userId, invoiceNumber: `${TAG}-INV`, planType: "TIER_1", amount: "149000.456" },
    });
    orderId = order.id;
    const partner = await prisma.partnerAffiliate.create({ data: { name: TAG, commissionValue: 10 } });
    partnerId = partner.id;
    const expense = await prisma.expense.create({ data: { title: TAG, amount: 1000 } });
    expenseId = expense.id;
    const commission = await prisma.affiliateCommission.create({
      data: { partnerId, orderId, orderAmount: 149000, commissionAmount: 1000, payoutExpenseId: expenseId },
    });
    commissionId = commission.id;
  });

  afterAll(async () => {
    await prisma.affiliateCommission.deleteMany({ where: { id: commissionId } });
    await prisma.expense.deleteMany({ where: { id: expenseId } });
    await prisma.partnerAffiliate.deleteMany({ where: { id: partnerId } });
    await prisma.invitation.deleteMany({ where: { id: invitationId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.theme.deleteMany({ where: { id: THEME_ID } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("undangan dengan tema yang tidak ada ditolak FK", async () => {
    await expect(
      prisma.invitation.create({
        data: { userId, themeId: `${TAG}-tidak-ada`, invitationSlug: `${TAG}-x`, groomSlug: `${TAG}-xg`, brideSlug: `${TAG}-xb` },
      })
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("tema yang dipakai undangan tidak bisa dihapus di level database", async () => {
    await expect(prisma.theme.delete({ where: { id: THEME_ID } })).rejects.toMatchObject({ code: "P2003" });
    expect(await prisma.theme.count({ where: { id: THEME_ID } })).toBe(1);
  });

  it("DELETE /api/admin/themes menolak tema yang dipakai dengan 409 dan menyebut jumlah undangan", async () => {
    const res = await deleteTheme(new NextRequest(`http://localhost/api/admin/themes?id=${THEME_ID}`, { method: "DELETE" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/1 undangan/);
    expect(await prisma.theme.count({ where: { id: THEME_ID } })).toBe(1);
  });

  it("orders.amount bertipe numeric(12,2) dan membulatkan ke 2 desimal", async () => {
    const { rows } = await pool.query(
      `SELECT numeric_precision p, numeric_scale s FROM information_schema.columns WHERE table_name='orders' AND column_name='amount'`
    );
    expect(rows[0]).toEqual({ p: 12, s: 2 });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.amount.toString()).toBe("149000.46");
  });

  it("menghapus pengeluaran payout menolkan referensinya di komisi, bukan menghapus komisi", async () => {
    await prisma.expense.delete({ where: { id: expenseId } });
    const commission = await prisma.affiliateCommission.findUniqueOrThrow({ where: { id: commissionId } });
    expect(commission.payoutExpenseId).toBeNull();
  });

  it("linkedInvitationId menolak ID yang tidak ada, dan menghapus undangan hanya melepas tautan order (order tetap ada)", async () => {
    await expect(
      prisma.order.create({
        data: { userId, invoiceNumber: `${TAG}-BAD`, planType: "TIER_1", orderType: "MEMORIES_TOPUP", amount: 1000, linkedInvitationId: `${TAG}-tidak-ada` },
      })
    ).rejects.toMatchObject({ code: "P2003" });

    const inv = await prisma.invitation.create({
      data: { userId, themeId: THEME_ID, invitationSlug: `${TAG}-l`, groomSlug: `${TAG}-lg`, brideSlug: `${TAG}-lb` },
    });
    const addOn = await prisma.order.create({
      data: { userId, invoiceNumber: `${TAG}-ADDON`, planType: "TIER_1", orderType: "MEMORIES_TOPUP", amount: 35000, status: "PAID", linkedInvitationId: inv.id },
    });
    await prisma.invitation.delete({ where: { id: inv.id } });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: addOn.id } });
    expect(after.linkedInvitationId).toBeNull();
    expect(after.status).toBe("PAID");
    await prisma.order.delete({ where: { id: addOn.id } });
  });

  it("order UPGRADE yang tertaut ke undangan menaikkan planType order dasar milik undangan itu", async () => {
    const { applyUpgradePlan } = await import("@/lib/upgradeHelper");
    const base = await prisma.order.create({
      data: { userId, invoiceNumber: `${TAG}-BASE`, planType: "TIER_1", amount: 99000, status: "PAID" },
    });
    const inv = await prisma.invitation.create({
      data: { userId, orderId: base.id, themeId: THEME_ID, invitationSlug: `${TAG}-u`, groomSlug: `${TAG}-ug`, brideSlug: `${TAG}-ub` },
    });
    const upgrade = await prisma.order.create({
      data: {
        userId, invoiceNumber: `${TAG}-UPG`, planType: "TIER_2", orderType: "UPGRADE", targetPlanType: "TIER_2",
        amount: 50000, status: "PAID", linkedInvitationId: inv.id,
      },
    });
    try {
      await applyUpgradePlan(upgrade.id);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: base.id } })).planType).toBe("TIER_2");
    } finally {
      await prisma.order.deleteMany({ where: { id: upgrade.id } });
      await prisma.invitation.deleteMany({ where: { id: inv.id } });
      await prisma.order.deleteMany({ where: { id: base.id } });
    }
  });

  it("enum menolak nilai di luar daftar: Rsvp.status dan Order.paymentMethod", async () => {
    await expect(
      prisma.rsvp.create({ data: { invitationId, guestName: "X", status: "ATTENDING" as never } })
    ).rejects.toThrow();
    await expect(
      prisma.order.create({ data: { userId, invoiceNumber: `${TAG}-PM`, planType: "TIER_1", amount: 1, paymentMethod: "QRIS" as never } })
    ).rejects.toThrow();
  });

  it("kolom paymentGatewayRef dan linkedOrderId sudah tidak ada di orders", async () => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name IN ('paymentGatewayRef','linkedOrderId')`
    );
    expect(rows).toEqual([]);
  });

  it("indeks FK rsvps.guestId ada dan kolom mati themes.isFeatured sudah tidak ada", async () => {
    const idx = await pool.query(`SELECT 1 FROM pg_indexes WHERE tablename='rsvps' AND indexname='rsvps_guestId_idx'`);
    expect(idx.rowCount).toBe(1);
    const col = await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_name='themes' AND column_name='isFeatured'`);
    expect(col.rowCount).toBe(0);
  });
});
