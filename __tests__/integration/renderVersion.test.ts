/**
 * Penanda versi HTML terbit dan demo (lib/renderVersion.ts), database luxenary_test. "Server lain" ditiru dengan
 * menaikkan versi di DB tanpa menyentuh berkas di disk proses ini.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, afterAll } from "vitest";
import { prisma, pool } from "@/lib/prisma";
import { buildAndSavePublishedHtml, deletePublishedHtml, readPublishedHtml, servePublishedHtml } from "@/lib/staticPublisher";
import { compileAndSaveStaticDemo, serveStaticDemo } from "@/lib/demoPublisher";
import { bumpRenderVersion, currentRenderVersion, demoVersionKey, publishedVersionKey, splitVersionMarker } from "@/lib/renderVersion";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_renderver_${Date.now()}`;
const DEMO_THEME = "kalandra";
const demoFile = path.join(process.cwd(), "public", "demo", DEMO_THEME, "index.html");
let userId = "";
let invitationId = "";

afterAll(async () => {
  if (invitationId) await deletePublishedHtml(invitationId);
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.renderVersion.deleteMany({ where: { key: { in: [publishedVersionKey(invitationId)] } } });
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("HTML terbit", () => {
  it("menerbitkan menaikkan versi; salinan basi dibangun ulang tanpa menaikkan versi lagi", async () => {
    const user = await prisma.user.create({ data: { email: `${RUN}@t.local`, name: "Owner" } });
    userId = user.id;
    const inv = await prisma.invitation.create({
      data: {
        userId, themeId: "kalandra", status: "PUBLISHED", invitationSlug: RUN.replace(/_/g, "-"),
        participantsJson: { groom: { name: "Raka Aditya", nickname: "Raka" }, bride: { name: "Dewi Lestari", nickname: "Dewi" } },
        eventData: [{ title: "Akad", date: "2099-01-01", time: "10:00", isPrimary: true }],
      },
    });
    invitationId = inv.id;
    const key = publishedVersionKey(invitationId);

    await buildAndSavePublishedHtml(invitationId);
    const v1 = await currentRenderVersion(key);
    expect(v1).toBe(1);
    expect((await readPublishedHtml(invitationId))?.version).toBe(1);
    expect(await servePublishedHtml(invitationId)).toContain("Raka");
    expect(await currentRenderVersion(key)).toBe(1);

    // Server lain menyimpan perubahan dan menerbitkan ulang: data berubah, versi naik, berkas di sini masih versi 1.
    await prisma.invitation.update({ where: { id: invitationId }, data: { participantsJson: { groom: { name: "Bima Sakti", nickname: "Bima" }, bride: { name: "Dewi Lestari", nickname: "Dewi" } } } });
    const v2 = await bumpRenderVersion(key);
    expect((await readPublishedHtml(invitationId))?.html).toContain("Raka");

    const served = await servePublishedHtml(invitationId);
    expect(served).toContain("Bima");
    expect(served).not.toContain("lux-build:");
    expect((await readPublishedHtml(invitationId))?.version).toBe(v2);
    expect(await currentRenderVersion(key)).toBe(v2);
  });

  it("berkas lama tanpa penanda versi dibangun ulang sekali", async () => {
    const file = path.join(process.cwd(), "public", "published", "ids", `${invitationId}.html`);
    fs.writeFileSync(file, "<html>BERKAS_LAMA</html>");
    expect(await servePublishedHtml(invitationId)).not.toContain("BERKAS_LAMA");
    expect((await readPublishedHtml(invitationId))?.version).toBe(await currentRenderVersion(publishedVersionKey(invitationId)));
  });

  it("menghapus HTML terbit menaikkan versi sehingga salinan server lain tidak cocok lagi", async () => {
    const key = publishedVersionKey(invitationId);
    const before = await currentRenderVersion(key);
    await deletePublishedHtml(invitationId);
    expect(await currentRenderVersion(key)).toBe(before + 1);
    expect(await readPublishedHtml(invitationId)).toBeNull();
  });
});

describe.skipIf(!IS_TEST_DB)("demo tema", () => {
  it("kompilasi admin menaikkan versi; pengunjung memakai berkas yang cocok dan membangun ulang yang basi", async () => {
    const key = demoVersionKey(DEMO_THEME);
    await compileAndSaveStaticDemo(DEMO_THEME);
    const v = await currentRenderVersion(key);
    expect(splitVersionMarker(fs.readFileSync(demoFile, "utf-8")).version).toBe(v);

    // Berkas yang cocok disajikan apa adanya (penanda disembunyikan dari pengunjung).
    const content = fs.readFileSync(demoFile, "utf-8").replace("</body>", "<p>PENANDA_DEMO_LOKAL</p></body>");
    fs.writeFileSync(demoFile, content);
    const same = await serveStaticDemo(DEMO_THEME);
    expect(same).toContain("PENANDA_DEMO_LOKAL");
    expect(same).not.toContain("lux-build:");

    // Admin di server lain menyimpan demo: versi naik, berkas lokal dibangun ulang tanpa menaikkan versi.
    const v2 = await bumpRenderVersion(key);
    expect(await serveStaticDemo(DEMO_THEME)).not.toContain("PENANDA_DEMO_LOKAL");
    expect(splitVersionMarker(fs.readFileSync(demoFile, "utf-8")).version).toBe(v2);
    expect(await currentRenderVersion(key)).toBe(v2);
  });
});
