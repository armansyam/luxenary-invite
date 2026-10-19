/**
 * Regresi 19 Okt 2026: og:image HTML terbit memilih slot menurut prioritas (sampul dulu), bukan unggahan terbaru.
 * Sebelumnya foto mempelai yang diunggah setelah sampul menjadi gambar pratinjau WhatsApp.
 * (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma, pool } from "@/lib/prisma";
import { buildAndSavePublishedHtml, deletePublishedHtml, waitForPendingArchiveSyncs } from "@/lib/staticPublisher";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_ogprio_${Date.now()}`;
const ids = { users: [] as string[], orders: [] as string[], invitations: [] as string[] };

async function makePublished(tag: string) {
  const user = await prisma.user.create({ data: { email: `${RUN}_${tag}@test.local`, name: tag } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${RUN}-${tag}`, planType: "TIER_3", amount: 200000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  ids.orders.push(order.id);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      orderId: order.id,
      themeId: "kalandra",
      status: "PUBLISHED",
      invitationSlug: `${RUN}-${tag}`,
      featureSettings: {},
      eventData: [{ title: "Resepsi", date: "2026-12-20", isPrimary: true, location: "Gedung" }],
    },
  });
  ids.invitations.push(inv.id);
  return inv.id;
}

const ogImage = (html: string | null) => html?.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null;

describe.skipIf(!IS_TEST_DB)("prioritas og:image HTML terbit", () => {
  it("sampul menang walau foto mempelai diunggah lebih baru", async () => {
    const invitationId = await makePublished("cover");
    await prisma.invitationMedia.create({
      data: { invitationId, mediaSlot: "LANDING_COVER", localPath: `/uploads/${RUN}/cover.webp`, createdAt: new Date(Date.now() - 60_000) },
    });
    await prisma.invitationMedia.create({ data: { invitationId, mediaSlot: "BRIDE_PHOTO", localPath: `/uploads/${RUN}/bride.webp` } });

    const html = await buildAndSavePublishedHtml(invitationId);
    expect(ogImage(html)).toMatch(/\/cover\.webp$/);
    await deletePublishedHtml(invitationId);
  });

  it("tanpa sampul, foto mempelai pria dipakai sebelum foto mempelai wanita", async () => {
    const invitationId = await makePublished("nocover");
    await prisma.invitationMedia.create({
      data: { invitationId, mediaSlot: "GROOM_PHOTO", localPath: `/uploads/${RUN}/groom.webp`, createdAt: new Date(Date.now() - 60_000) },
    });
    await prisma.invitationMedia.create({ data: { invitationId, mediaSlot: "BRIDE_PHOTO", localPath: `/uploads/${RUN}/bride.webp` } });

    const html = await buildAndSavePublishedHtml(invitationId);
    expect(ogImage(html)).toMatch(/\/groom\.webp$/);
    await deletePublishedHtml(invitationId);
  });
});

afterAll(async () => {
  await waitForPendingArchiveSyncs();
  if (IS_TEST_DB) {
    await prisma.invitationMedia.deleteMany({ where: { invitationId: { in: ids.invitations } } });
    await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  }
  await prisma.$disconnect();
  await pool.end();
});
