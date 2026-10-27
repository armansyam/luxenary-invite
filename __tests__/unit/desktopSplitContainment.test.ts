/**
 * Kontrak tata letak desktop split (>= 900px): hero kiri tidak boleh tertutup lapisan apa pun dari kolom undangan,
 * dan isi undangan (ornamen, bayangan, modal, toast) tidak boleh keluar dari kolom kanan 460px. Diperiksa pada CSS
 * blueprint dan hasil kompilasi builder; tampilan visual diuji terpisah di peramban.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { compileBuilderMaster } from "@/lib/themeBuilder/compile";
import { defaultBuilderSpec } from "@/lib/themeBuilder/spec";

const blueprint = fs.readFileSync(path.join(process.cwd(), "themes", "_blueprints", "wedding", "starter-blueprint.html"), "utf8");

/** Isi blok `@media (min-width: 900px) { ... }` pertama, dengan pencocokan kurung kurawal. */
function desktopBlock(css: string): string {
  const start = css.indexOf("@media (min-width: 900px) {");
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error("Blok @media desktop tidak seimbang.");
}

// Isi aturan CSS; token engine `{{...}}` di dalam url() tidak boleh dianggap penutup aturan.
const BODY = "((?:[^{}]|\\{\\{[^}]*\\}\\})*)";

const rule = (block: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = block.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{${BODY}\\}`));
  return m ? m[1] : "";
};

describe.each([
  ["blueprint", blueprint],
  ["hasil kompilasi builder dengan ornamen", compileBuilderMaster({
    ...defaultBuilderSpec(),
    ornaments: [{ id: "orntest001", section: "opening", src: "/assets/ornaments/flowers/flower-tl.webp", x: -15, y: 10, anchor: "top", width: 60, rotate: 0, opacity: 1, flipX: false, layer: "back" }],
  })],
])("desktop split: %s", (_name, html) => {
  const block = desktopBlock(html);

  it("hero berada di atas kolom undangan dan memotong isinya sendiri", () => {
    const hero = rule(block, ".sidebar-desktop");
    const heroZ = Number(hero.match(/z-index:\s*(\d+)/)?.[1]);
    const panelZ = Number(block.match(/\.main-scroll-panel\s*\{[^}]*?z-index:\s*(\d+)/)?.[1]);
    expect(heroZ).toBeGreaterThan(panelZ);
    expect(hero).toMatch(/overflow:\s*hidden/);
  });

  it("kolom undangan memotong luapan horizontal tanpa membuat kontainer gulir bagi elemen fixed", () => {
    expect(block).toMatch(/\.main-scroll-panel\s*\{[^}]*overflow-x:\s*clip/);
    expect(block).not.toMatch(/\.main-scroll-panel\s*\{[^}]*\bcontain:\s*paint/);
  });

  it("modal dan toast dipatok ke kolom kanan, bukan ke seluruh viewport", () => {
    const modal = rule(block, ".modal-bg");
    expect(modal).toMatch(/left:\s*calc\(100% - 460px\)/);
    expect(modal).toMatch(/width:\s*460px/);
    expect(rule(block, "#luxCopyToast")).toMatch(/left:\s*calc\(100% - 230px\)\s*!important/);
  });

  it("latar global dan scrim hanya di dalam kolom undangan", () => {
    const bg = block.match(/\.fixed-bg-layer,\s*\.scrim-canvas\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(bg).toMatch(/width:\s*460px\s*!important/);
    expect(bg).toMatch(/left:\s*calc\(100% - 460px\)\s*!important/);
  });

  it("sampul desktop dipatok ke kolom dan memakai slot LANDING_COVER_DESKTOP", () => {
    const cover = rule(block, ".cover-overlay");
    expect(cover).toMatch(/left:\s*calc\(100% - 460px\)\s*!important/);
    expect(cover).toContain("{{landingCoverDesktopUrl}}");
  });
});

describe("mesin render: kontainmen berlaku untuk semua master", () => {
  it("menyisipkan blok kontainmen untuk kedua keluarga kelas hero dan kolom, sekali, di dalam head", async () => {
    const { renderTemplateFile } = await import("@/lib/renderTemplate");
    const html = await renderTemplateFile("vitest-containment", {}, { eventType: "WEDDING", templateSource: "<!DOCTYPE html><html><head><title>x</title></head><body><main class=\"main-scroll-panel\"></main></body></html>" });
    expect(html.match(/id="luxDesktopContainment"/g)).toHaveLength(1);
    const style = html.match(/<style id="luxDesktopContainment">[\s\S]*?<\/style>/)?.[0] ?? "";
    for (const selector of [".sidebar-desktop", ".left-hero", ".main-scroll-panel", ".right-panel", ".page-wrap", ".modal-bg", "#luxCopyToast"]) expect(style).toContain(selector);
    expect(style).toMatch(/overflow-x:\s*clip/);
    expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(html.indexOf("luxDesktopContainment")).toBeLessThan(html.indexOf("</head>"));
  });
});
