/**
 * Regresi: metadata portofolio menyimpan kategori tema. Galeri /portfolio memfilter dengan
 * `item.category.toLowerCase()`, sehingga metadata tanpa kategori membuat tombol filter melempar TypeError.
 * Unggahan ke storage diganti spy agar tes tidak menulis ke R2.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "admin-vitest", email: "admin@test.local", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })),
}));

const uploads = new Map<string, Buffer>();
vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage")>()),
  uploadPortfolioFile: vi.fn(async (buffer: Buffer, relativePath: string) => {
    uploads.set(relativePath, buffer);
    return `/portfolio/${relativePath}`;
  }),
  listPortfolioSlugs: vi.fn(async () => []),
}));

import { prisma, pool } from "@/lib/prisma";
import { GET as listPortfolio, POST as addPortfolio } from "@/app/api/admin/portfolio/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_portfolio_${Date.now()}`;
const created = { userId: "", orderId: "", invitationId: "" };

describe.skipIf(!IS_TEST_DB)("metadata portofolio", () => {
  it("menyimpan kategori tema yang dipakai tombol filter galeri", async () => {
    const theme = await prisma.theme.findUniqueOrThrow({ where: { id: "kalandra" }, select: { category: true } });
    const user = await prisma.user.create({ data: { email: `${RUN}@test.local`, name: RUN } });
    created.userId = user.id;
    const order = await prisma.order.create({
      data: { userId: user.id, invoiceNumber: RUN, planType: "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() },
    });
    created.orderId = order.id;
    const inv = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order.id,
        themeId: "kalandra",
        status: "PUBLISHED",
        invitationSlug: RUN,
        featureSettings: {},
        participantsJson: { groom: { name: "Raka", nickname: "Raka" }, bride: { name: "Sinta", nickname: "Sinta" } },
      },
    });
    created.invitationId = inv.id;

    const htmlPath = path.join(process.cwd(), "public", "published", "ids", `${inv.id}.html`);
    fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
    fs.writeFileSync(htmlPath, "<html><body>portofolio</body></html>");
    try {
      const res = await addPortfolio(
        new NextRequest("http://localhost/api/admin/portfolio", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ invitationId: inv.id }),
        }),
      );
      expect(res.status).toBe(200);

      const metadata = JSON.parse(uploads.get(`assets/${RUN}/metadata.json`)!.toString("utf-8"));
      expect(metadata.category).toBe(theme.category);
      expect(["minimalist", "modern", "traditional"]).toContain(metadata.category);
    } finally {
      fs.rmSync(htmlPath, { force: true });
    }
  });

  it("logo vendor dari featureSettings ikut disalin, karena arsip dan hapus klien mengosongkan invitations/<id>/", async () => {
    expect(created.invitationId).not.toBe("");
    const logoUrl = `/uploads/invitations/${created.invitationId}/vendor-1.webp`;
    const logoPath = path.join(process.cwd(), "public", logoUrl);
    const htmlPath = path.join(process.cwd(), "public", "published", "ids", `${created.invitationId}.html`);
    await prisma.invitation.update({
      where: { id: created.invitationId },
      data: { featureSettings: { vendors: [{ name: "Studio Vendor Uji", category: "Fotografi", logoUrl }] } },
    });
    fs.mkdirSync(path.dirname(logoPath), { recursive: true });
    fs.writeFileSync(logoPath, Buffer.from("logo-vendor"));
    fs.writeFileSync(htmlPath, "<html><body>portofolio</body></html>");
    uploads.clear();
    try {
      const res = await addPortfolio(
        new NextRequest("http://localhost/api/admin/portfolio", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ invitationId: created.invitationId }),
        }),
      );
      expect(res.status).toBe(200);
      const html = uploads.get(`${RUN}.html`)!.toString("utf-8");
      expect(html).toContain("Studio Vendor Uji");
      expect(html).not.toContain(`invitations/${created.invitationId}/`);
      expect(html).toContain(`/portfolio/assets/${RUN}/vendor-1.webp`);
      expect(uploads.get(`assets/${RUN}/vendor-1.webp`)?.toString()).toBe("logo-vendor");
    } finally {
      fs.rmSync(htmlPath, { force: true });
      fs.rmSync(path.dirname(logoPath), { recursive: true, force: true });
    }
  });

  it("kandidat portofolio berasal dari seluruh undangan terbit, bukan 50 undangan terbaru di overview", async () => {
    const published = await prisma.invitation.count({ where: { status: "PUBLISHED" } });
    const res = await listPortfolio(new NextRequest("http://localhost/api/admin/portfolio"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidates).toHaveLength(published);
    expect(body.candidates.every((c: { status: string }) => c.status === "PUBLISHED")).toBe(true);
    if (created.invitationId) expect(body.candidates.map((c: { id: string }) => c.id)).toContain(created.invitationId);
  });
});

afterAll(async () => {
  if (created.invitationId) await prisma.invitation.deleteMany({ where: { id: created.invitationId } });
  if (created.orderId) await prisma.order.deleteMany({ where: { id: created.orderId } });
  if (created.userId) await prisma.user.deleteMany({ where: { id: created.userId } });
  await prisma.$disconnect();
  await pool.end();
});
