/**
 * Regresi audit 15 Okt 2026, halaman Pengaturan klien: tombol rilis hanya mengirim status & subdomain sehingga
 * suntingan Studio yang lebih baru (tab lain) tidak tertimpa snapshot halaman, dan tombol upgrade benar-benar
 * membuka modal upgrade di dasbor.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, vi, afterAll } from "vitest";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
// Rilis pertama memicu sinkron R2 dan purge Cloudflare di latar; uji tidak boleh menyentuh layanan nyata.
vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage")>()),
  syncDraftToR2: vi.fn(async () => {}),
  deleteFile: vi.fn(async () => {}),
}));
vi.mock("@/lib/staticPublisher", () => ({ buildAndSavePublishedHtml: vi.fn(async () => {}), deletePublishedHtml: vi.fn(async () => {}) }));
vi.mock("@/lib/cloudflare", () => ({ purgeInvitationEdgeCache: vi.fn(async () => {}) }));

import { prisma, pool } from "@/lib/prisma";
import { PUT as putInvitation } from "@/app/api/client/invitations/[id]/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_settingspub_${Date.now()}`;
const created = { userId: "", orderId: "", invitationId: "" };

describe("rilis undangan dari halaman Pengaturan", () => {
  it("payload rilis hanya status dan subdomain", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "app/(client)/dashboard/settings/page.tsx"), "utf-8");
    const publish = src.slice(src.indexOf("const executePublish"), src.indexOf("const isStaffPinValid"));
    expect(publish).not.toContain("...cleanInvitation");
    expect(publish).toMatch(/const payload = \{\s*subdomain:[^}]*status: "PUBLISHED",\s*\};/);
  });

  it.skipIf(!IS_TEST_DB)("rilis tidak menimpa kisah yang disunting setelah halaman Pengaturan dibuka", async () => {
    const user = await prisma.user.create({ data: { email: `${RUN}@test.local`, name: RUN } });
    created.userId = user.id;
    sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false, permissions: [] };
    const order = await prisma.order.create({
      data: { userId: user.id, invoiceNumber: RUN, planType: "TIER_1", amount: 100000, status: "PAID", orderType: "NEW", paidAt: new Date() },
    });
    created.orderId = order.id;
    const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const inv = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order.id,
        themeId: "kalandra",
        status: "DRAFT",
        invitationSlug: RUN,
        eventData: [{ title: "Resepsi", date: future, isPrimary: true, location: "Gedung" }],
        loveStory: [{ title: "Ditulis di Studio setelah Pengaturan dibuka", content: "isi" }],
      },
    });
    created.invitationId = inv.id;

    const sub = RUN.replace(/_/g, "-").slice(0, 40);
    const res = await putInvitation(
      new Request(`http://localhost/api/client/invitations/${inv.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subdomain: sub, status: "PUBLISHED" }),
      }),
      { params: Promise.resolve({ id: inv.id }) },
    );
    expect(res.status).toBe(200);
    const stored = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, select: { status: true, subdomain: true, publishedAt: true, loveStory: true } });
    expect(stored.status).toBe("PUBLISHED");
    expect(stored.subdomain).toBe(sub);
    expect(stored.publishedAt).not.toBeNull();
    expect(stored.loveStory).toEqual([{ title: "Ditulis di Studio setelah Pengaturan dibuka", content: "isi" }]);
  });
});

describe("tombol upgrade dari halaman Pengaturan", () => {
  it("dasbor membuka modal upgrade saat dibuka dengan ?upgrade=true, dan kedua tombol mengarah ke sana", () => {
    const dashboard = fs.readFileSync(path.join(process.cwd(), "app/(client)/dashboard/page.tsx"), "utf-8");
    expect(dashboard).toContain('useState(searchParams?.get("upgrade") === "true")');
    const settings = fs.readFileSync(path.join(process.cwd(), "app/(client)/dashboard/settings/page.tsx"), "utf-8");
    expect(settings.match(/\/dashboard\?upgrade=true/g)?.length).toBe(2);
  });
});

afterAll(async () => {
  if (created.invitationId) await prisma.invitation.deleteMany({ where: { id: created.invitationId } });
  if (created.orderId) await prisma.order.deleteMany({ where: { id: created.orderId } });
  if (created.userId) await prisma.user.deleteMany({ where: { id: created.userId } });
  await prisma.$disconnect();
  await pool.end();
});
