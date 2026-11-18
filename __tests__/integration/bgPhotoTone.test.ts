import { describe, it, expect, afterAll } from "vitest";
import { prisma, pool } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { mergeFeatureSettingsInput } from "@/lib/featureSettings";
import { bgPhotoToneCss, bgPhotoToneFilter, parseBgPhotoTone } from "@/lib/bgPhotoTone";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `bgtone_${Date.now()}`;
const ids = { users: [] as string[], invitations: [] as string[] };

describe("bgPhotoTone", () => {
  it("membatasi nilai ke ±80 dan menolak nilai tidak sah", () => {
    expect(parseBgPhotoTone(-40)).toBe(-40);
    expect(parseBgPhotoTone("35")).toBe(35);
    expect(parseBgPhotoTone(200)).toBe(80);
    expect(parseBgPhotoTone(-200)).toBe(-80);
    expect(parseBgPhotoTone("abc")).toBe(0);
    expect(parseBgPhotoTone(null)).toBe(0);
  });

  it("menggelapkan dengan brightness, menerangkan dengan brightness dan contrast, tanpa nilai warna", () => {
    expect(bgPhotoToneFilter(0)).toBe("");
    expect(bgPhotoToneFilter(-40)).toBe("brightness(0.60)");
    expect(bgPhotoToneFilter(40)).toBe("brightness(1.36) contrast(0.82)");
    expect(bgPhotoToneCss(-40)).toBe(".fixed-bg-layer.has-custom-bg, video.lux-fixed-bg-video { filter: brightness(0.60) !important; }");
    expect(bgPhotoToneCss(0)).toBe("");
  });

  it("sumber fungsi yang disisipkan ke pratinjau menghasilkan rumus yang sama", () => {
    const embedded = new Function(`return (${bgPhotoToneFilter.toString()})`)() as (t: unknown) => string;
    for (const t of [-80, -55, -5, 0, 5, 33, 80, 120, "x"]) expect(embedded(t)).toBe(bgPhotoToneFilter(t));
  });

  it("penyimpanan Studio membatasi nilai dan membuang nilai 0", async () => {
    const saved = await mergeFeatureSettingsInput({ showMusic: true }, { bgPhotoTone: "-150" }, "TIER_3", true);
    expect(saved.ok && saved.value.bgPhotoTone).toBe(-80);
    const reset = await mergeFeatureSettingsInput({ bgPhotoTone: -40 }, { bgPhotoTone: 0 }, "TIER_3", true);
    expect(reset.ok && "bgPhotoTone" in reset.value).toBe(false);
  });
});

async function makeInvitation(featureSettings: object, withBackground: boolean) {
  const key = String(ids.users.length);
  const user = await prisma.user.create({ data: { email: `${TAG}_${key}@example.test`, name: "Uji" } });
  ids.users.push(user.id);
  const order = await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-${key}`, planType: "TIER_3", amount: 1, status: "PAID", paidAt: new Date() } as never });
  const sub = `${TAG.replace(/_/g, "-")}-${key}`.slice(0, 60);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id, orderId: order.id, themeId: "bugis", eventType: "WEDDING" as never, status: "PUBLISHED", subdomain: sub, invitationSlug: sub, publishedAt: new Date(),
      participantsJson: { groom: { name: "Raka", nickname: "Raka" }, bride: { name: "Dewi", nickname: "Dewi" } }, featureSettings,
      eventData: [{ title: "Resepsi", date: "2099-12-05", time: "10:00 – 14:00 WITA", location: "Gedung", isPrimary: true }],
    },
  });
  ids.invitations.push(inv.id);
  if (withBackground) {
    await prisma.invitationMedia.create({ data: { invitationId: inv.id, mediaSlot: "GLOBAL_FIXED_BG" as never, localPath: `/uploads/invitations/${inv.id}/fixed-bg.jpg`, mimeType: "image/jpeg" } });
  }
  return inv;
}

const render = async (invId: string) => renderTemplateFile("bugis", (await composeTemplateData(invId)) as any, { editMode: false, invitationId: invId });

afterAll(async () => {
  await prisma.invitationMedia.deleteMany({ where: { invitationId: { in: ids.invitations } } });
  await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
  await prisma.order.deleteMany({ where: { userId: { in: ids.users } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("render undangan dengan kecerahan foto latar", () => {
  it("menyisipkan filter saat ada foto latar dan nilai bukan 0", async () => {
    const inv = await makeInvitation({ bgPhotoTone: -40 }, true);
    const html = await render(inv.id);
    expect(html).toContain('<style id="luxBgPhotoTone">.fixed-bg-layer.has-custom-bg, video.lux-fixed-bg-video { filter: brightness(0.60) !important; }</style>');
    expect(html).toContain("has-custom-bg");
  });

  it("tidak menyisipkan apa pun tanpa foto latar atau saat nilai 0", async () => {
    const noBg = await makeInvitation({ bgPhotoTone: -40 }, false);
    expect(await render(noBg.id)).not.toContain('id="luxBgPhotoTone"');
    const neutral = await makeInvitation({}, true);
    expect(await render(neutral.id)).not.toContain('id="luxBgPhotoTone"');
  });

  it("pratinjau Studio memuat penerima pesan bgPhotoTone dengan rumus yang sama", async () => {
    const inv = await makeInvitation({}, true);
    const html = await renderTemplateFile("bugis", (await composeTemplateData(inv.id)) as any, { editMode: true, invitationId: inv.id });
    expect(html).toContain("fieldKey === 'bgPhotoTone'");
    expect(html).toContain("var luxBgPhotoToneFilter = function bgPhotoToneFilter(");
  });
});
