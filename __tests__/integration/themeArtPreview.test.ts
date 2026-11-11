/**
 * Thumbnail "Bawaan tema" (11 Nov 2026): gambar yang tampil di undangan sebelum slot diisi harus terlihat di Studio
 * klien dan Studio Demo admin, termasuk latar global yang ditulis di CSS master.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { THEME_MAP } from "@/lib/renderTemplate";
import { masterPathOf } from "@/lib/themePaths";
import { masterBuiltinBackground, themeArtPreviews } from "@/lib/themeArtPreview";

describe("gambar bawaan master", () => {
  it("membaca latar dari aturan .fixed-bg-layer, bukan dari varian has-custom-bg", () => {
    const css = ".fixed-bg-layer.has-custom-bg { background-image: url('/assets/x/custom.webp'); } .fixed-bg-layer { background-image: linear-gradient(red, blue), url('/assets/ornaments/background/background-flower.webp'); }";
    expect(masterBuiltinBackground(css)).toBe("/assets/ornaments/background/background-flower.webp");
    expect(masterBuiltinBackground(".fixed-bg-layer { background: var(--bg-canvas); }")).toBe(null);
  });

  it("Aurelia: latar global bunga; Jamuan: pratinjau ilustrasi tanpa latar gambar", () => {
    expect(themeArtPreviews("aurelia").GLOBAL_FIXED_BG).toBe("/assets/ornaments/background/background-flower.webp");
    const jamuan = themeArtPreviews("jamuan");
    expect(jamuan.LANDING_COVER).toBe("/assets/theme-previews/jamuan/landing_cover.webp");
    expect(jamuan.GLOBAL_FIXED_BG).toBeUndefined();
    expect(themeArtPreviews("../etc")).toEqual({});
  });

  it("setiap master yang menulis latar global di CSS terbaca, dan berkas gambarnya ada di public/", () => {
    let withBg = 0;
    for (const [id, entry] of Object.entries(THEME_MAP)) {
      const html = fs.readFileSync(masterPathOf(entry.eventType, entry.style, id), "utf8");
      const bg = masterBuiltinBackground(html);
      if (!bg) continue;
      withBg++;
      expect(themeArtPreviews(id).GLOBAL_FIXED_BG, id).toBe(bg);
      expect(fs.existsSync(path.join(process.cwd(), "public", bg)), `${id}: ${bg}`).toBe(true);
    }
    expect(withBg).toBeGreaterThan(30);
  });
});
