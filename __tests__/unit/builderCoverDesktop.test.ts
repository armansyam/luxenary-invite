/**
 * Sampul desktop Theme Builder (11 Nov 2026): mode layar penuh atau split tersimpan di spesifikasi, posisi blok sampul
 * per tampilan desktop, dan aturan gambar Cover desktop (landscape) bawaan.
 */
import { describe, it, expect } from "vitest";
import { compileBuilderMaster } from "@/lib/themeBuilder/compile";
import { coverDesktopCss, defaultBuilderSpec, parseBuilderSpec } from "@/lib/themeBuilder/spec";

const COVER = "/assets/ornaments/background/background-cream.webp";
const LANDSCAPE = "/assets/ornaments/background/background-flower.webp";

describe("parseBuilderSpec: sampul desktop", () => {
  it("menyimpan mode layar penuh dan posisi per tampilan; posisi bawaan dan blok bukan sampul dibuang", () => {
    const r = parseBuilderSpec({
      ...defaultBuilderSpec(),
      coverDesktop: {
        mode: "full",
        full: { "cover-names": { x: -40, y: 10, scale: 1.4, rotate: 0, align: "left", maxWidth: 720 }, "cover-badge": { x: 0, y: 0, scale: 1, rotate: 0 }, "home-title": { x: 5, y: 0, scale: 1, rotate: 0 } },
        split: { "cover-date": { x: 0, y: 20, scale: 1, rotate: 0 } },
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.coverDesktop).toEqual({
      mode: "full",
      full: { "cover-names": { x: -40, y: 10, scale: 1.4, rotate: 0, align: "left", maxWidth: 720 } },
      split: { "cover-date": { x: 0, y: 20, scale: 1, rotate: 0 } },
    });
  });

  it("mode split tanpa posisi tidak disimpan", () => {
    const r = parseBuilderSpec({ ...defaultBuilderSpec(), coverDesktop: { mode: "split" } });
    expect(r.ok && r.spec.coverDesktop).toBe(undefined);
  });

  it("gambar landscape hanya pada layar penuh; layar penuh dengan foto sampul bawaan wajib punya gambar landscape", () => {
    const splitWithLandscape = parseBuilderSpec({ ...defaultBuilderSpec(), defaultMedia: { LANDING_COVER_DESKTOP: LANDSCAPE } });
    expect(splitWithLandscape.ok).toBe(false);
    const fullWithoutLandscape = parseBuilderSpec({ ...defaultBuilderSpec(), coverDesktop: { mode: "full" }, defaultMedia: { LANDING_COVER: COVER } });
    expect(fullWithoutLandscape.ok).toBe(false);
    const fullOk = parseBuilderSpec({ ...defaultBuilderSpec(), coverDesktop: { mode: "full" }, defaultMedia: { LANDING_COVER: COVER, LANDING_COVER_DESKTOP: LANDSCAPE } });
    expect(fullOk.ok && fullOk.spec.defaultMedia.LANDING_COVER_DESKTOP).toBe(LANDSCAPE);
    // Tanpa foto sampul bawaan, layar penuh boleh tanpa gambar landscape (latar sampul dari palet dan ornamen).
    expect(parseBuilderSpec({ ...defaultBuilderSpec(), coverDesktop: { mode: "full" } }).ok).toBe(true);
  });
});

describe("coverDesktopCss dan master hasil kompilasi", () => {
  it("posisi layar penuh dan split dibedakan oleh keberadaan gaya split dari mesin, hanya di desktop", () => {
    const css = coverDesktopCss({ full: { "cover-names": { x: -40, y: 0, scale: 1.2, rotate: 0 } }, split: { "cover-names": { x: 0, y: 10, scale: 1, rotate: 0, hidden: true } } });
    expect(css.startsWith("@media (min-width: 900px)")).toBe(true);
    expect(css).toContain(':root:not(:has(#lux-cover-desktop-split)) [data-lux-block="cover-names"]{translate:-40% 0%;rotate:0deg;scale:1.2;}');
    expect(css).toContain(':root:has(#lux-cover-desktop-split) [data-lux-block="cover-names"]{translate:0% 10%;rotate:0deg;scale:1;display:none;}');
    expect(coverDesktopCss(undefined)).toBe("");
  });

  it("mode layar penuh memberi penanda data-lux-desktop-cover pada sampul; split tidak", () => {
    const full = compileBuilderMaster({ ...defaultBuilderSpec(), coverDesktop: { mode: "full", full: { "cover-names": { x: 10, y: 0, scale: 1, rotate: 0 } } } });
    expect(full).toContain('id="coverScreen" data-lux-desktop-cover="full"');
    expect(full).toContain(':root:not(:has(#lux-cover-desktop-split)) [data-lux-block="cover-names"]');
    expect(compileBuilderMaster(defaultBuilderSpec())).not.toContain("data-lux-desktop-cover");
  });
});
