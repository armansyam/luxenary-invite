/**
 * Token engine untuk seksi bebas Theme Builder (galeri mini dan tombol peta) di semua jenis acara, dari undangan
 * virtual demo yang dirender engine yang sama dengan undangan klien (database `luxenary_test` untuk data tema).
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma, pool } from "@/lib/prisma";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { DEFAULT_THEME_BY_EVENT } from "@/lib/invitationUtils";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");

describe.skipIf(!IS_TEST_DB)("token seksi bebas di engine", () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it.each(Object.entries(DEFAULT_THEME_BY_EVENT))("%s: foto galeri dan peta acara pertama", async (eventType, themeId) => {
    const demo = buildDemoInvitation(themeId, undefined, eventType);
    const map = "https://maps.google.com/?q=a&b=c";
    const inv = {
      ...demo,
      eventType,
      eventData: [{ title: "Acara", mapsUrl: "" }, { title: "Resepsi", mapsUrl: map }],
      featureSettings: { ...(demo.featureSettings || {}), showGallery: true, galleryPhotosList: "https://example.com/a.jpg\nhttps://example.com/b.jpg" },
    };
    const data = (await composeInvitationData(inv)) as Record<string, string>;
    expect(data.luxGalleryPhoto1).toBe("https://example.com/a.jpg");
    expect(data.luxGalleryPhoto2).toBe("https://example.com/b.jpg");
    expect(data.luxGalleryPhoto3).toBe("");
    // Mentah, bukan &amp;: renderTemplate meng-escape nilai token saat dirender.
    expect(data.luxPrimaryMapUrl).toBe(map);
  });

  it("galeri dimatikan klien: galeri mini ikut kosong", async () => {
    const demo = buildDemoInvitation("kalandra");
    const data = (await composeInvitationData({ ...demo, featureSettings: { showGallery: false, galleryPhotosList: "https://example.com/a.jpg" } })) as Record<string, string>;
    expect(data.luxGalleryPhoto1).toBe("");
  });
});
