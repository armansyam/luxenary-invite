/**
 * Semua <script> inline pada HTML undangan terbit dan halaman demo harus valid sebagai JavaScript.
 *
 * `new Function()` hanya mem-parse, tidak mengeksekusi. Sintaks TypeScript yang tertanam di string template
 * (mis. `catch (err: any)`) atau kutip yang tidak di-escape membuat browser menolak seluruh blok skrip,
 * sehingga fungsi global seperti luxOpenMemoryPreview atau luxSubmitRsvp tidak pernah terdefinisi.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { prisma, pool } from "@/lib/prisma";
import { buildAndSavePublishedHtml, deletePublishedHtml } from "@/lib/staticPublisher";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_syntax_${Date.now()}`;

const INLINE_SCRIPT = /<script(?![^>]*\bsrc\b)(?![^>]*type="(?:application\/(?:ld\+)?json|text\/template|importmap)")[^>]*>([\s\S]*?)<\/script>/g;

function brokenInlineScripts(html: string): string[] {
  const failures: string[] = [];
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    try {
      new Function(match[1]);
    } catch (err: any) {
      failures.push(`${err.message} :: ${match[1].trim().slice(0, 70).replace(/\s+/g, " ")}`);
    }
  }
  return failures;
}

const ids = { users: [] as string[], orders: [] as string[], invitations: [] as string[] };

describe.skipIf(!IS_TEST_DB)("Sintaks JavaScript inline pada seluruh tema", () => {
  let themes: Array<{ id: string; eventType: string }> = [];

  beforeAll(async () => {
    themes = await prisma.theme.findMany({ select: { id: true, eventType: true }, orderBy: { id: "asc" } });
  });

  afterAll(async () => {
    for (const id of ids.invitations) {
      await deletePublishedHtml(id);
      // renderTemplateFile dengan invitationId menulis data/drafts/<id>.html; hapus agar tidak menjadi berkas yatim.
      await fs.promises.rm(path.join(process.cwd(), "data", "drafts", `${id}.html`), { force: true });
    }
    await prisma.guestMemory.deleteMany({ where: { invitationId: { in: ids.invitations } } });
    await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("HTML terbit (fitur momen tamu aktif, ada momen tamu): setiap skrip inline dapat di-parse", async () => {
    const failures: string[] = [];
    let memoryScriptSeen = 0;

    for (let i = 0; i < themes.length; i++) {
      const { id: themeId, eventType } = themes[i];
      const user = await prisma.user.create({ data: { email: `${RUN}_${i}@t.local`, name: "Owner" } });
      ids.users.push(user.id);
      const order = await prisma.order.create({
        data: { userId: user.id, invoiceNumber: `${RUN}-${i}`, planType: "TIER_2", amount: 500000, status: "PAID" },
      });
      ids.orders.push(order.id);
      const inv = await prisma.invitation.create({
        data: {
          userId: user.id,
          orderId: order.id,
          themeId,
          eventType: eventType as any,
          status: "PUBLISHED",
          invitationSlug: `${RUN}-${i}`,
          groomSlug: `${RUN}-g${i}`,
          brideSlug: `${RUN}-b${i}`,
          groomName: "Dimas",
          brideName: "Clarissa",
          groomNickname: "Dimas",
          brideNickname: "Clarissa",
          eventData: JSON.stringify([{ title: "Akad", date: "2026-12-12", time: "08:00", isPrimary: true }]),
          featureSettings: JSON.stringify({ showGuestMemories: true, showGallery: true, showStory: true, showGift: true, showMusic: true }),
        },
      });
      ids.invitations.push(inv.id);
      await prisma.guestMemory.create({
        data: { invitationId: inv.id, senderName: "Tamu", senderEmail: "x@t.local", message: "Selamat", mediaUrl: "/uploads/x.webp", thumbnailUrl: "/uploads/x.webp" },
      });

      const published = await buildAndSavePublishedHtml(inv.id);
      const data = await composeTemplateData(inv.id);
      const preview = data ? await renderTemplateFile(themeId, data, { editMode: false, invitationId: inv.id }) : null;

      for (const [path, html] of [["publish", published], ["preview", preview]] as const) {
        if (!html) {
          failures.push(`${themeId} (${path}): render mengembalikan null`);
          continue;
        }
        if (html.includes("luxSelectedMemoryFile")) memoryScriptSeen++;
        for (const failure of brokenInlineScripts(html)) failures.push(`${themeId} (${path}): ${failure}`);
      }
    }

    expect(memoryScriptSeen, "skrip modul momen tamu harus ikut terender agar tes ini bermakna").toBeGreaterThan(0);
    expect(failures, failures.join("\n")).toEqual([]);
  }, 300_000);

  it("halaman demo seluruh tema: setiap skrip inline dapat di-parse", async () => {
    const failures: string[] = [];
    for (const { id: themeId } of themes) {
      const html = await renderTemplateFile(themeId, {}, { editMode: false });
      for (const failure of brokenInlineScripts(html)) failures.push(`${themeId}: ${failure}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  }, 120_000);
});
