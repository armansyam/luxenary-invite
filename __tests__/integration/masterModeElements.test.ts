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

describe("Mode Master Tahap 2–3: ornamen, seksi bebas, latar per seksi, urutan seksi", () => {
  const ORN = "/assets/ornaments/jamuan/cover-wide.webp";

  it("parse menolak seksi, gambar, dan teks yang tidak sah; urutan hanya untuk seksi yang aman dipindah", () => {
    const errors: string[] = [];
    const bad = parseMasterOverrides({
      colors: {}, fonts: {},
      ornaments: [{ id: "orn12345", anchor: "tidakada", src: ORN, x: 50, y: 50, width: 30, rotate: 0, opacity: 1, layer: "back" }],
      freeSections: [{ id: "fs123456", after: "couple", title: "Halo {{guestName}}", align: "center" }],
      sectionBackgrounds: { couple: { color: "#ff0000" } },
      sectionOrder: ["couple", "home"],
    }, AURELIA);
    expect(bad.ok).toBe(false);
    if (!bad.ok) errors.push(...bad.errors);
    expect(errors.join(" ")).toMatch(/tidak ada di master/);
    expect(errors.join(" ")).toMatch(/\{\{/);
    expect(errors.join(" ")).toMatch(/token palet/);
    expect(errors.join(" ")).toMatch(/Urutan seksi/);

    const good = parseMasterOverrides({
      colors: {}, fonts: {},
      ornaments: [{ id: "orn12345", anchor: "couple", src: ORN, x: 30, y: 10, width: 40, rotate: 15, opacity: 0.8, layer: "back", hideOn: "mobile" }],
      freeSections: [{ id: "fs123456", after: "couple", eyebrow: "Doa", title: "Untuk <b>kalian</b>", text: "Baris satu\nbaris dua", align: "center" }],
      sectionBackgrounds: { event: { color: "dark" } },
      sectionOrder: ["home", "event", "couple", "rsvp"],
    }, AURELIA);
    expect(good.ok).toBe(true);
  });

  it("render: ornamen di dalam seksi, seksi bebas sesudah seksi tujuan dengan teks di-escape, urutan ditukar, latar dari token", () => {
    const out = applyMasterOverridesTo(AURELIA, {
      colors: {}, fonts: {},
      ornaments: [{ id: "orn12345", anchor: "couple", src: ORN, x: 30, y: 10, width: 40, rotate: 15, opacity: 0.8, layer: "back", hideOn: "mobile" }],
      freeSections: [{ id: "fs123456", after: "couple", eyebrow: "Doa", title: "Untuk <b>kalian</b>", text: "Baris satu\nbaris dua", align: "center" }],
      sectionBackgrounds: { event: { color: "dark" } },
      sectionOrder: ["home", "event", "couple", "rsvp"],
    }, undefined, "lux-master-edits");
    const coupleOpen = out.search(/<section\b[^>]*\bid="couple"/);
    const eventOpen = out.search(/<section\b[^>]*\bid="event"/);
    expect(eventOpen).toBeGreaterThan(-1);
    expect(eventOpen).toBeLessThan(coupleOpen);
    expect(out.slice(coupleOpen, coupleOpen + 2000)).toContain('data-lux-mo="orn12345"');
    expect(out).toContain('class="lux-mo lux-mo-hide-mobile"');
    const fs = out.indexOf('id="lux-fs-fs123456"');
    expect(fs).toBeGreaterThan(coupleOpen);
    expect(out).toContain("Untuk &lt;b&gt;kalian&lt;/b&gt;");
    expect(out).toContain("Baris satu<br>baris dua");
    expect(out).toContain("#event { background-color: var(--bg-dark) !important; background-image: none !important; }");
    expect(out).toContain(":where(#couple) { position: relative; isolation: isolate; }");
  });

  it("master yang strukturnya berubah: entri yang tidak cocok dilewati tanpa merusak HTML", () => {
    const skipped: string[] = [];
    const out = applyMasterOverridesTo(AURELIA, {
      colors: {}, fonts: {},
      ornaments: [{ id: "orn12345", anchor: "hilang", src: ORN, x: 50, y: 50, width: 30, rotate: 0, opacity: 1, layer: "back" }],
      freeSections: [{ id: "fs123456", after: "hilang", title: "x", align: "center" }],
      sectionOrder: ["home", "hilang"],
    }, (n) => skipped.push(n));
    expect(skipped).toEqual(expect.arrayContaining(["sectionOrder", "hilang"]));
    expect(out).not.toContain("lux-fs-");
    expect(out).not.toContain('data-lux-mo="orn12345"');
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
