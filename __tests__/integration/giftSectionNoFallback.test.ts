/**
 * Seksi hadiah undangan pernikahan tidak boleh menampilkan rekening yang tidak diisi mempelai. Sebelumnya,
 * tanpa rekening, QRIS, dan alamat, engine menyisipkan rekening tetap "BCA 7330497518" atas nama mempelai.
 * (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, pool } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_gift_${Date.now()}`;

let userId = "";
const created: string[] = [];

async function createInvitation(suffix: string, bankAccounts: string | null) {
  const inv = await prisma.invitation.create({
    data: {
      userId,
      invitationSlug: `${TAG}-${suffix}`,
      groomSlug: `${TAG}-g`,
      brideSlug: `${TAG}-b`,
      groomName: "Budi",
      brideName: "Ani",
      status: "PUBLISHED",
      bankAccounts,
    },
  });
  created.push(inv.id);
  return inv.id;
}

describe.skipIf(!IS_TEST_DB)("seksi hadiah tanpa rekening cadangan", () => {
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `${TAG}@t.local`, name: TAG } });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { id: { in: created } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("tanpa rekening, QRIS, dan alamat: seksi hadiah kosong dan tidak ada nomor rekening tebakan", async () => {
    const id = await createInvitation("kosong", null);
    const data = await composeTemplateData(id);
    expect(data?.giftSectionHtml).toBe("");
    expect(JSON.stringify(data)).not.toContain("7330497518");
  });

  it("rekening yang diisi mempelai tetap ditampilkan", async () => {
    const id = await createInvitation("isi", JSON.stringify([{ bank: "Mandiri", number: "1112223334", name: "Ani" }]));
    const data = await composeTemplateData(id);
    expect(data?.giftSectionHtml).toContain("1112223334");
    expect(data?.giftSectionHtml).toContain("Mandiri");
  });
});
