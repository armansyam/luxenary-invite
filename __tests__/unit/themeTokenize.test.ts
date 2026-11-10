/**
 * Tokenisasi master tema (lib/themeTokenize.ts): warna dan huruf yang tertulis langsung di CSS menjadi variabel `:root`
 * tanpa mengubah nilai. Kesetaraan tampilan seluruh master diperiksa di peramban (computed style sebelum/sesudah, 0
 * selisih pada 54 master × 375/1440 px, 10 Nov 2026); tes ini menjaga aturan tokenizer dan status master di repo.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { masterTokenNames, tokenizeMaster } from "@/lib/themeTokenize";

const page = (css: string, body = "") => `<html><head><style>:root { --primary: #d4af37; }\n${css}</style></head><body>${body}</body></html>`;

describe("tokenizeMaster", () => {
  it("warna berwarna menjadi variabel baru per nilai, bukan variabel lama yang kebetulan bernilai sama", () => {
    const { html, report } = tokenizeMaster(page(".a { color: #D4AF37; border: 1px solid #abc; }"));
    expect(html).toContain(".a { color: var(--lux-c-d4af37); border: 1px solid var(--lux-c-aabbcc); }");
    expect(html).toContain("--lux-c-d4af37: #d4af37;");
    expect(html).toContain("--primary: #d4af37;");
    expect(report.colors).toBe(2);
  });

  it("rgba dan hex beralfa menjadi color-mix dengan kepekatan yang sama", () => {
    const { html } = tokenizeMaster(page(".a { background: rgba(212, 175, 55, 0.35); box-shadow: 0 0 4px #d4af3780; }"));
    expect(html).toContain("background: color-mix(in srgb, var(--lux-c-d4af37) 35%, transparent);");
    expect(html).toContain("color-mix(in srgb, var(--lux-c-d4af37) 50.2%, transparent)");
  });

  it("hitam/putih netral, isi url(), token engine, dan nilai :root tidak disentuh", () => {
    const css = ".a { color: #fff; background: rgba(0,0,0,.5) url('{{landingCoverUrl}}'); } .b { background-image: url(\"data:image/svg+xml;utf8,<svg fill='#d4af37'/>\"); }";
    const { html, report } = tokenizeMaster(page(css));
    expect(html).toContain(".a { color: #fff; background: rgba(0,0,0,.5) url('{{landingCoverUrl}}'); }");
    expect(html).toContain("fill='#d4af37'");
    expect(report.skippedNeutral).toBe(2);
    expect(report.colors).toBe(0);
  });

  it("selektor berbentuk hex tidak diubah karena hanya badan deklarasi yang diproses", () => {
    const { html } = tokenizeMaster(page("#ace { color: #123456; }"));
    expect(html).toContain("#ace { color: var(--lux-c-123456); }");
  });

  it("aturan yang memuat token engine tetap diproses", () => {
    const { html } = tokenizeMaster(page(".hero { background: url('{{homePhotoUrl}}') center; border-color: #8b2636; }"));
    expect(html).toContain("border-color: var(--lux-c-8b2636);");
  });

  it("blok @font-face tidak disentuh (var() tidak sah di deskriptornya, huruf tidak akan termuat)", () => {
    const css = "@font-face { font-family: 'Lontara'; src: url('/fonts/Lontara.ttf'); } .x { font-family: 'Lontara', serif; }";
    const { html } = tokenizeMaster(page(css));
    expect(html).toContain("@font-face { font-family: 'Lontara'; src: url('/fonts/Lontara.ttf'); }");
    expect(html).toContain(".x { font-family: var(--lux-font-lontara); }");
  });

  it("font-family menjadi variabel per tumpukan; var/inherit/monospace dibiarkan", () => {
    const css = "h1 { font-family: 'Cinzel', serif; } h2 { font-family: 'Cinzel', Georgia, serif !important; } p { font-family: var(--font-body); } code { font-family: monospace; }";
    const { html, report } = tokenizeMaster(page(css));
    expect(html).toContain("h1 { font-family: var(--lux-font-cinzel); }");
    expect(html).toContain("h2 { font-family: var(--lux-font-cinzel-2) !important; }");
    expect(html).toContain("--lux-font-cinzel: 'Cinzel', serif;");
    expect(html).toContain("--lux-font-cinzel-2: 'Cinzel', Georgia, serif;");
    expect(html).toContain("p { font-family: var(--font-body); }");
    expect(report.fonts).toBe(2);
  });

  it("atribut style ditokenisasi, warna di skrip dan atribut SVG tidak (dan dilaporkan)", () => {
    const { html, report } = tokenizeMaster(page("", `<p style="color:#8b2636">x</p><svg><path fill="#8b2636"/></svg><script>const c = "#8b2636";</script>`));
    expect(html).toContain(`<p style="color:var(--lux-c-8b2636)">`);
    expect(html).toContain(`fill="#8b2636"`);
    expect(html).toContain(`const c = "#8b2636";`);
    expect(report.untouchedOutsideCss).toBe(2);
  });

  it("idempoten dan menolak master tanpa :root", () => {
    const once = tokenizeMaster(page(".a { color: #123456; font-family: 'Lora', serif; }")).html;
    expect(tokenizeMaster(once).html).toBe(once);
    expect(() => tokenizeMaster("<style>.a{color:#123456}</style>")).toThrow(":root");
  });

  it("masterTokenNames mendaftar variabel warna dan huruf yang boleh ditimpa varian", () => {
    const { html } = tokenizeMaster(page(".a { color: #123456; font-family: 'Lora', serif; }"));
    expect(masterTokenNames(html)).toEqual({ colors: ["--primary", "--lux-c-123456"], fonts: ["--lux-font-lora"] });
  });
});

describe("master di repo sudah ditokenisasi", () => {
  const files: string[] = [];
  for (const event of fs.readdirSync("themes")) {
    if (event.startsWith("_") || !fs.statSync(path.join("themes", event)).isDirectory()) continue;
    for (const style of fs.readdirSync(path.join("themes", event))) {
      const dir = path.join("themes", event, style);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) if (f.endsWith(".html")) files.push(path.join(dir, f));
    }
  }

  it.each(files)("%s: tokenisasi ulang tidak mengubah apa pun", (file) => {
    const html = fs.readFileSync(file, "utf-8");
    expect(tokenizeMaster(html).html).toBe(html);
  });

  it.each(files)("%s: deskriptor font-family @font-face berupa nama, bukan var()", (file) => {
    const html = fs.readFileSync(file, "utf-8");
    for (const m of html.matchAll(/@font-face\s*\{([^}]*)\}/gi)) expect(m[1]).not.toMatch(/font-family\s*:\s*var\(/i);
  });
});
