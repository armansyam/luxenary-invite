/**
 * Mode Master (11 Nov 2026): tata letak elemen tema tulisan tangan tanpa blueprint, disimpan di `masterOverrides`
 * sebagai lapisan; berkas master tidak ditulis. Posisi HP dan desktop terpisah, sampul desktop layar penuh opsional.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import { applyMasterOverridesTo, elementEditsCss, isElementSelector, parseMasterOverrides } from "@/lib/themeVariantCss";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { renderTemplateFile, THEME_MAP } from "@/lib/renderTemplate";
import { masterPathOf } from "@/lib/themePaths";

const aureliaPath = masterPathOf(THEME_MAP.aurelia.eventType, THEME_MAP.aurelia.style, "aurelia");
const AURELIA = fs.readFileSync(aureliaPath, "utf8");

describe("alamat elemen", () => {
  it("menerima alamat buatan editor dan menolak isi selain selektor", () => {
    expect(isElementSelector("#coverScreen > div.cover-inner > h1.cover-name")).toBe(true);
    expect(isElementSelector("svg.cover-wide > use:nth-of-type(3)")).toBe(true);
    expect(isElementSelector("h1{color:red}")).toBe(false);
    expect(isElementSelector("#a > b, body")).toBe(false);
    expect(isElementSelector("div[style]")).toBe(false);
    expect(isElementSelector("")).toBe(false);
  });

  it("parseMasterOverrides menyimpan posisi per tampilan, membuang posisi bawaan dan split di luar sampul", () => {
    const r = parseMasterOverrides({
      colors: {}, fonts: {}, coverDesktop: "full",
      elements: {
        "#coverScreen > h1.cover-name": { mobile: { x: 0, y: 12, scale: 1, rotate: 0 }, desktop: { x: -80, y: 0, scale: 1.3, rotate: 0 }, desktopSplit: { x: 0, y: 0, scale: 1, rotate: 0, hidden: true } },
        "#home > p.home-quote": { desktopSplit: { x: 10, y: 0, scale: 1, rotate: 0 }, mobile: { x: 0, y: 0, scale: 1, rotate: 0 } },
      },
    }, AURELIA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.coverDesktop).toBe("full");
    expect(r.value.elements).toEqual({
      "#coverScreen > h1.cover-name": { mobile: { x: 0, y: 12, scale: 1, rotate: 0 }, desktop: { x: -80, y: 0, scale: 1.3, rotate: 0 }, desktopSplit: { x: 0, y: 0, scale: 1, rotate: 0, hidden: true } },
    });
    expect(parseMasterOverrides({ colors: {}, fonts: {}, elements: { "h1{}": { mobile: { x: 5, y: 0, scale: 1, rotate: 0 } } } }, AURELIA).ok).toBe(false);
    expect(parseMasterOverrides({ colors: {}, fonts: {}, coverDesktop: "lebar" }, AURELIA).ok).toBe(false);
  });
});

describe("CSS tata letak elemen", () => {
  it("HP di bawah 900px, desktop di atasnya; elemen sampul dibedakan oleh gaya split mesin", () => {
    const css = elementEditsCss({
      "#coverScreen > h1.cover-name": { mobile: { x: 0, y: 12, scale: 1, rotate: 0 }, desktop: { x: -80, y: 0, scale: 1.3, rotate: 0 }, desktopSplit: { x: 0, y: 5, scale: 1, rotate: 0, hidden: true } },
      "#home > p.home-quote": { desktop: { x: 10, y: 0, scale: 1, rotate: 15 } },
      "bad{}": { mobile: { x: 1, y: 0, scale: 1, rotate: 0 } },
    });
    expect(css).toContain("@media (max-width: 899.98px) {\n#coverScreen > h1.cover-name{translate:0% 12% !important;rotate:0deg !important;scale:1 !important;}");
    expect(css).toContain(":root:not(:has(#lux-cover-desktop-split)) #coverScreen > h1.cover-name{translate:-80% 0% !important;rotate:0deg !important;scale:1.3 !important;transform-box:fill-box;transform-origin:center;}");
    expect(css).toContain(":root:has(#lux-cover-desktop-split) #coverScreen > h1.cover-name{translate:0% 5% !important;rotate:0deg !important;scale:1 !important;display:none !important;}");
    expect(css).toContain("\n#home > p.home-quote{translate:10% 0% !important;rotate:15deg !important;scale:1 !important;transform-box:fill-box;transform-origin:center;}");
    expect(css).not.toContain("bad{}");
  });

  it("berkas master tidak berubah; lapisan disisipkan dan penanda sampul layar penuh dipasang", () => {
    const before = fs.readFileSync(aureliaPath, "utf8");
    const out = applyMasterOverridesTo(AURELIA, { colors: {}, fonts: {}, coverDesktop: "full", elements: { "#coverScreen": { desktop: { x: 0, y: 0, scale: 1, rotate: 0, hidden: true } } } }, undefined, "lux-master-edits");
    expect(out).toContain('data-lux-desktop-cover="full"');
    expect(out).toContain('<style id="lux-master-edits">');
    expect(fs.readFileSync(aureliaPath, "utf8")).toBe(before);
  });

  it("mesin: sampul layar penuh tanpa foto sampul klien, split begitu klien punya foto sampul", async () => {
    const edited = applyMasterOverridesTo(AURELIA, { colors: {}, fonts: {}, coverDesktop: "full" });
    const noPhoto = (await composeInvitationData({ ...buildDemoInvitation("aurelia"), media: [], themeDefaultMedia: null })) as Record<string, any>;
    const full = await renderTemplateFile("aurelia", { ...noPhoto, landingCoverUrl: "" }, { eventType: "WEDDING", templateSource: edited });
    expect(full).not.toContain('id="lux-cover-desktop-split"');
    const withPhoto = (await composeInvitationData({ ...buildDemoInvitation("aurelia"), media: [{ mediaSlot: "LANDING_COVER", localPath: "/uploads/invitations/klien/cover.webp" }], themeDefaultMedia: null })) as Record<string, any>;
    const split = await renderTemplateFile("aurelia", withPhoto, { eventType: "WEDDING", templateSource: edited });
    expect(split).toContain('id="lux-cover-desktop-split"');
  });
});
