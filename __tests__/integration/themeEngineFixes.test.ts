/**
 * Regresi theme engine 20 Okt 2026 (DB luxenary_test): render selalu dari master (tanpa salinan data/drafts), label
 * kustom berlaku di seksi buatan engine untuk semua tema non-pernikahan, dan editor pratinjau hanya menyunting kunci
 * yang punya tempat simpan.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, afterAll } from "vitest";
import { prisma, pool } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { isLiveEditField, LIVE_EDIT_FIELD_PATTERN } from "@/lib/liveEditFields";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_themefix_${Date.now()}`;
const ids = { users: [] as string[], orders: [] as string[], invitations: [] as string[] };

const LABEL_KEYS = ["rsvpTitle", "rsvpNameLabel", "rsvpStatusLabel", "rsvpCountLabel", "rsvpMessageLabel", "rsvpBtnText", "wishesTitle", "galleryEyebrow", "galleryTitle", "giftEyebrow", "giftTitle"];
const marker = (key: string) => `${RUN}_${key}`;

let seq = 0;
async function makeInvitation(themeId: string, eventType: string) {
  const i = ++seq;
  const user = await prisma.user.create({ data: { email: `${RUN}_${i}@t.local`, name: "Owner" } });
  ids.users.push(user.id);
  const order = await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${RUN}-${i}`, planType: "TIER_3", amount: 500000, status: "PAID" } });
  ids.orders.push(order.id);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id, orderId: order.id, themeId, eventType: eventType as any, status: "PUBLISHED", invitationSlug: `${RUN.replace(/_/g, "-")}-${i}`,
      participantsJson: { person: { name: "Raka", nickname: "Raka" }, baby: { name: "Raka", nickname: "Raka" }, child: { name: "Raka", nickname: "Raka" }, event: { title: "Raka" } },
      eventData: [{ title: "Acara", date: "2099-01-01", time: "10:00", isPrimary: true }],
      bankAccounts: [{ bank: "BCA", number: "123", name: "Raka" }],
      featureSettings: {
        showGallery: true, showGift: true, showRsvp: true, galleryPhotosList: "https://lh3.googleusercontent.com/d/abc=w800",
        customLabels: Object.fromEntries(LABEL_KEYS.map((k) => [k, marker(k)])),
      },
    },
  });
  ids.invitations.push(inv.id);
  return inv;
}

afterAll(async () => {
  await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
  await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("render dari master", () => {
  it("render dengan invitationId tidak menulis salinan ke data/drafts", async () => {
    const theme = await prisma.theme.findFirstOrThrow({ where: { eventType: "WEDDING" }, select: { id: true } });
    const inv = await makeInvitation(theme.id, "WEDDING");
    const data = await composeTemplateData(inv.id);
    await renderTemplateFile(theme.id, data!, { editMode: false, invitationId: inv.id });
    expect(fs.existsSync(path.join(process.cwd(), "data", "drafts", `${inv.id}.html`))).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB)("label kustom pada tema non-pernikahan", () => {
  it("label RSVP, ucapan, galeri, dan kado klien muncul di setiap tema non-pernikahan", async () => {
    const themes = await prisma.theme.findMany({ where: { eventType: { not: "WEDDING" } }, select: { id: true, eventType: true } });
    expect(themes.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const theme of themes) {
      const inv = await makeInvitation(theme.id, theme.eventType);
      const html = await renderTemplateFile(theme.id, (await composeTemplateData(inv.id))!, { editMode: false, invitationId: inv.id });
      for (const key of LABEL_KEYS) if (!html.includes(marker(key))) missing.push(`${theme.id}:${key}`);
    }
    expect(missing).toEqual([]);
  });
});

describe("kunci sunting langsung", () => {
  it("hanya kunci yang punya tempat simpan yang diizinkan", () => {
    for (const ok of ["weddingTagline", "openingQuote", "openingQuoteRef", "customLabels.rsvpTitle", "events.0.title", "stories.2.content", "groomName", "brideMother"]) {
      expect(isLiveEditField(ok), ok).toBe(true);
    }
    for (const bad of ["weddingDate", "firstDisplayName", "groomParents", "narrative.closingQuote", "roles.groom", "coupleNames", "guestName", "customLabels.", "events.x.title"]) {
      expect(isLiveEditField(bad), bad).toBe(false);
    }
  });

  it("editor pratinjau memuat pola yang sama dan menunggu hasil simpan dari Studio", async () => {
    const html = await renderTemplateFile("kalandra", { featureSettings: {} }, { editMode: true });
    const literal = html.match(/const LIVE_EDIT_FIELD_RE = new RegExp\(("(?:[^"\\]|\\.)*")\);/);
    expect(literal).not.toBeNull();
    expect(JSON.parse(literal![1])).toBe(LIVE_EDIT_FIELD_PATTERN);
    expect(html).toContain("LUX_INLINE_SAVE_RESULT");
  });
});
