/**
 * Regresi audit 18 Okt 2026 (putaran 2): tanggal dan jam acara bukan isian bebas (XSS lewat skrip hitung mundur),
 * skrip hitung mundur menyisipkan nilai lewat JSON, dan pembayaran upgrade tidak menurunkan paket.
 * (bagian DB hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));

import { prisma, pool } from "@/lib/prisma";
import { isClockTimeInput, normalizeEventDateInput } from "@/lib/lifecycleDates";
import { composeTemplateData } from "@/lib/themeEngine";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { PUT as invitationPut } from "@/app/api/client/invitations/[id]/route";
import { POST as createPost } from "@/app/api/client/invitations/create/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_a1018b_${Date.now()}`;
const ids = { users: [] as string[], invitations: [] as string[] };
let seq = 0;

const put = (id: string, body: unknown) =>
  invitationPut(
    new NextRequest(`http://localhost/api/client/invitations/${id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) }
  );

async function makeDraft(planType: "TIER_1" | "TIER_2" | "TIER_3" = "TIER_2") {
  seq++;
  const user = await prisma.user.create({ data: { email: `${TAG}_${seq}@t.local`, name: `Klien ${seq}` } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${TAG}-${seq}`, planType, amount: 100000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      orderId: order.id,
      invitationSlug: `${TAG}-${seq}`,
      participantsJson: { groom: { name: "Raka" }, bride: { name: "Dewi" } },
      status: "DRAFT",
      eventData: [{ title: "Resepsi", date: "2026-12-12", startTime: "10:00", endTime: "12:00", timezone: "WIB", isPrimary: true }],
    },
  });
  ids.invitations.push(inv.id);
  sessionUser = { id: user.id, email: user.email, role: "CLIENT" };
  return { user, order, inv };
}

describe("normalizeEventDateInput dan isClockTimeInput", () => {
  it("menerima tanggal nyata, membuang bagian jam, dan menolak sisanya", () => {
    expect(normalizeEventDateInput("2026-12-12")).toBe("2026-12-12");
    expect(normalizeEventDateInput(" 2026-12-12T10:00:00 ")).toBe("2026-12-12");
    expect(normalizeEventDateInput("2026-12-12Tx\";alert(1);//")).toBe("2026-12-12");
    expect(normalizeEventDateInput("")).toBe("");
    expect(normalizeEventDateInput(undefined)).toBe("");
    expect(normalizeEventDateInput('2026-12-12";alert(1);//')).toBeNull();
    expect(normalizeEventDateInput("2026-02-30")).toBeNull();
    expect(normalizeEventDateInput("12/12/2026")).toBeNull();
    expect(normalizeEventDateInput({ a: 1 })).toBeNull();
  });

  it("jam: kosong atau JJ:MM saja", () => {
    for (const ok of ["", undefined, null, "09:00", "9:05", "23:59", "9.30"]) expect(isClockTimeInput(ok), String(ok)).toBe(true);
    for (const bad of ['"+x+"', "24:00", "12:60", "selesai", "09:00 WIB", 900]) expect(isClockTimeInput(bad), String(bad)).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB)("PUT undangan: tanggal dan jam acara divalidasi", () => {
  afterAll(async () => {
    sessionUser = null;
    await prisma.invitation.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  });

  it("tanggal bermuatan skrip ditolak 400 dan tidak tersimpan", async () => {
    const { inv } = await makeDraft();
    const res = await put(inv.id, { eventData: [{ title: "Resepsi", date: '2026-12-12";alert(1);//', startTime: "10:00", isPrimary: true }] });
    expect(res.status).toBe(400);
    const stored = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, select: { eventData: true } });
    expect((stored.eventData as Array<{ date: string }>)[0].date).toBe("2026-12-12");
  });

  it("jam mulai lima karakter bermuatan skrip ditolak 400", async () => {
    const { inv } = await makeDraft();
    const res = await put(inv.id, { eventData: [{ title: "Resepsi", date: "2026-12-12", startTime: '"+x+"', isPrimary: true }] });
    expect(res.status).toBe(400);
  });

  it("tanggal berakhiran muatan skrip setelah 'T' disimpan sebagai tanggal saja", async () => {
    const { inv } = await makeDraft();
    const res = await put(inv.id, { eventData: [{ title: "Resepsi", date: '2026-12-20T";window.__pwn=1;//', startTime: "09:00", isPrimary: true }] });
    expect(res.status).toBe(200);
    const stored = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, select: { eventData: true } });
    expect((stored.eventData as Array<{ date: string }>)[0].date).toBe("2026-12-20");
  });

  it("tanggal berakhiran jam disimpan sebagai tanggal saja", async () => {
    const { inv } = await makeDraft();
    const res = await put(inv.id, { eventData: [{ title: "Resepsi", date: "2026-12-20T09:00:00", startTime: "09:00", endTime: "11:00", isPrimary: true }] });
    expect(res.status).toBe(200);
    const stored = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, select: { eventData: true } });
    expect((stored.eventData as Array<{ date: string }>)[0].date).toBe("2026-12-20");
  });

  it("create undangan menolak tanggal bermuatan skrip", async () => {
    const { user } = await makeDraft();
    sessionUser = { id: user.id, email: user.email, role: "CLIENT" };
    await prisma.invitation.deleteMany({ where: { userId: user.id } });
    const res = await createPost(
      new NextRequest("http://localhost/api/client/invitations/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventType: "WEDDING", participantsJson: { groom: { name: "A" }, bride: { name: "B" } }, weddingDate: '2026-12-12";alert(1);//' }),
      })
    );
    expect(res.status).toBe(400);
  });
});

describe.skipIf(!IS_TEST_DB)("skrip hitung mundur: nilai disisipkan lewat JSON", () => {
  it("tanggal dan jam bermuatan skrip dari data lama tetap menjadi string aman", async () => {
    const { inv } = await makeDraft();
    // Ditulis langsung ke DB: meniru data yang tersimpan sebelum validasi ada. Bagian sebelum "T" lolos pemeriksaan
    // tanggal sesi utama, sedangkan sisanya ikut terbawa ke skrip hitung mundur.
    await prisma.invitation.update({
      where: { id: inv.id },
      data: { eventData: [{ title: "Resepsi", date: '2026-12-12T";window.__pwn=1;//', startTime: '"+x+"', timezone: "WIB", isPrimary: true }] },
    });

    const data = await composeTemplateData(inv.id);
    const html = String(data?.musicPlayerHtml ?? "");
    const match = html.match(/const targetStr = ("(?:[^"\\]|\\.)*");/);
    expect(match, "deklarasi targetStr harus berupa literal JSON").not.toBeNull();
    const literal = JSON.parse(match![1]) as string;
    expect(literal).toContain("window.__pwn=1");
    expect(html).not.toContain('T";window.__pwn=1;//');
    expect(() => new Function(html.replace(/^[\s\S]*?<script[^>]*>/, "").replace(/<\/script>[\s\S]*$/, ""))).not.toThrow();
  });
});

describe.skipIf(!IS_TEST_DB)("pembayaran upgrade tidak menurunkan paket", () => {
  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
    await pool.end();
  });

  async function upgradeOrder(userId: string, invitationId: string, from: "TIER_1" | "TIER_2" | "TIER_3", target: "TIER_1" | "TIER_2" | "TIER_3") {
    seq++;
    return prisma.order.create({
      data: {
        userId, invoiceNumber: `${TAG}-upg-${seq}`, planType: target, amount: 50000, status: "PAID", paidAt: new Date(),
        orderType: "UPGRADE", upgradedFromPlan: from, targetPlanType: target, linkedInvitationId: invitationId,
      },
    });
  }

  it("paket TIER_3 + pembayaran upgrade ke TIER_2 tetap TIER_3", async () => {
    const { user, order, inv } = await makeDraft("TIER_3");
    const upg = await upgradeOrder(user.id, inv.id, "TIER_1", "TIER_2");
    await applyUpgradePlan(upg.id);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).planType).toBe("TIER_3");
  });

  it("paket TIER_2 + pembayaran upgrade ke TIER_3 naik ke TIER_3", async () => {
    const { user, order, inv } = await makeDraft("TIER_2");
    const upg = await upgradeOrder(user.id, inv.id, "TIER_2", "TIER_3");
    await applyUpgradePlan(upg.id);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).planType).toBe("TIER_3");
  });

  it("jalur bundle (itemsJson): upgrade ke paket lebih rendah tidak menurunkan, ke paket lebih tinggi menaikkan", async () => {
    const { user, order, inv } = await makeDraft("TIER_3");
    seq++;
    const bundle = await prisma.order.create({
      data: {
        userId: user.id, invoiceNumber: `${TAG}-bun-${seq}`, planType: "TIER_2", amount: 50000, status: "PAID", paidAt: new Date(),
        orderType: "UPGRADE", targetPlanType: "TIER_2", linkedInvitationId: inv.id,
        itemsJson: [{ type: "UPGRADE", targetPlan: "TIER_2" }],
      },
    });
    await applyUpgradePlan(bundle.id);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).planType).toBe("TIER_3");

    const t1 = await makeDraft("TIER_1");
    seq++;
    const bundleUp = await prisma.order.create({
      data: {
        userId: t1.user.id, invoiceNumber: `${TAG}-bun-${seq}`, planType: "TIER_3", amount: 50000, status: "PAID", paidAt: new Date(),
        orderType: "UPGRADE", targetPlanType: "TIER_3", linkedInvitationId: t1.inv.id,
        itemsJson: [{ type: "UPGRADE", targetPlan: "TIER_3" }],
      },
    });
    await applyUpgradePlan(bundleUp.id);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: t1.order.id } })).planType).toBe("TIER_3");
  });
});
