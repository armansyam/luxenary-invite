import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { masterColorGroups, masterColorUsage, recolorWithPalette } from "@/lib/themeVariantCss";
import { blend, gradientAverage, newlyUnreadable, parseCssColor, toHex, type TextSample } from "@/components/admin/variantReadability";
import { PALETTE_PRESETS, contrastRatio } from "@/lib/themeBuilder/spec";

const html = `<style>:root{--bg:#ffffff;--ink:#222222;--gold:#c9a978;--spare:#123456}
.card{--fill:var(--gold)}
body{background:var(--bg);color:var(--ink)}
.card{background-color:var(--fill);border:1px solid var(--ink)}
.btn{box-shadow:0 0 4px var(--gold)}</style><div style="color:var(--gold)">x</div>`;

describe("masterColorUsage", () => {
  it("menghitung pemakaian per jenis properti, termasuk lewat variabel lokal dan atribut style", () => {
    const u = masterColorUsage(html);
    expect(u["--bg"]).toMatchObject({ bg: 1, text: 0 });
    expect(u["--ink"]).toMatchObject({ text: 1, line: 1 });
    expect(u["--gold"]).toMatchObject({ bg: 1, shadow: 1, text: 1 });
    expect(u["--spare"]).toBeUndefined();
  });

  it("Valente: warna latar utama tercatat sebagai latar, aksen sebagai teks", () => {
    const valente = fs.readFileSync(path.join(process.cwd(), "themes/wedding/minimalist/valente.html"), "utf8");
    const u = masterColorUsage(valente);
    expect(u["--bg-main"].bg).toBeGreaterThan(0);
    expect(u["--accent"].text).toBeGreaterThan(0);
  });
});

describe("recolorWithPalette", () => {
  it("mempertahankan urutan terang-gelap sehingga kontras teks dan latar tetap memadai", () => {
    const groups = masterColorGroups(html);
    const sage = PALETTE_PRESETS.find((p) => p.id === "sage")!.palette;
    const colors = recolorWithPalette(groups, sage);
    const bg = colors["--bg"] ?? "#ffffff";
    const ink = colors["--ink"] ?? "#222222";
    expect(contrastRatio(ink, bg)).toBeGreaterThan(contrastRatio("#222222", "#ffffff") * 0.8);
    expect(colors["--gold"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors["--gold"]).not.toBe("#c9a978");
  });
});

describe("variantReadability", () => {
  it("membaca rgb, rgba, dan color(srgb) hasil color-mix", () => {
    expect(parseCssColor("rgb(10, 20, 30)")).toEqual([10, 20, 30, 1]);
    expect(parseCssColor("rgba(10, 20, 30, 0.5)")).toEqual([10, 20, 30, 0.5]);
    expect(parseCssColor("color(srgb 1 0 0 / 0.25)")).toEqual([255, 0, 0, 0.25]);
    expect(parseCssColor("oklch(0.5 0.1 20)")).toBeNull();
    expect(toHex(blend([0, 0, 0, 0.5], [255, 255, 255, 1]))).toBe("#808080");
  });

  it("gradasi berlapis ditumpuk per lapisan; foto di bawah scrim tipis tidak dinilai", () => {
    const cream = gradientAverage("linear-gradient(90deg, rgba(0, 0, 0, 0) 21px, rgba(122, 31, 43, 0.3) 21px, rgba(0, 0, 0, 0) 22px), linear-gradient(rgb(251, 249, 245), rgb(243, 239, 232))");
    expect(contrastRatio(toHex(cream!), "#1d1d1f")).toBeGreaterThan(10);
    expect(gradientAverage('linear-gradient(rgba(10, 10, 10, 0.3), rgba(10, 10, 10, 0.96)), url("a.webp")')).toEqual([10, 10, 10, 1]);
    expect(gradientAverage('linear-gradient(rgba(10, 10, 10, 0.1), rgba(10, 10, 10, 0.2)), url("a.webp")')).toBeNull();
    expect(gradientAverage('url("a.webp")')).toBeNull();
  });

  it("hanya melaporkan teks yang terbaca di master asli lalu gagal setelah varian", () => {
    const el = {} as Element;
    const s = (key: string, ratio: number): TextSample => ({ key, text: key, ratio, min: 4.5, el });
    const before = [s("a", 7), s("b", 2), s("c", 6)];
    const after = [s("a", 3), s("b", 1.5), s("c", 5)];
    expect(newlyUnreadable(before, after).map((x) => x.key)).toEqual(["a"]);
  });
});
