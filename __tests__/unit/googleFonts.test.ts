import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  FontError,
  ensureGoogleFont,
  googleCssUrl,
  isGoogleFontInstalled,
  parseCatalog,
  pickWeights,
  rewriteLatinFaces,
  searchCatalog,
  type GoogleFontEntry,
} from "@/lib/themeBuilder/fonts";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import { defaultBuilderSpec, fontFamily, googleFontCssUrl, googleFontIds, isGoogleFontId, parseBuilderSpec } from "@/lib/themeBuilder/spec";

const GSTATIC = "https://fonts.gstatic.com/s/italiana/v21/abc.woff2";
const CSS = `/* latin-ext */
@font-face {
  font-family: 'Italiana';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/italiana/v21/ext.woff2) format('woff2');
  unicode-range: U+0100-02BA;
}
/* latin */
@font-face {
  font-family: 'Italiana';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(${GSTATIC}) format('woff2');
  unicode-range: U+0000-00FF;
}
`;

const ITALIANA: GoogleFontEntry = { family: "Italiana", category: "Serif", weights: [400], subsets: ["latin", "latin-ext"] };

function fakeFetch(overrides: Record<string, () => Response> = {}) {
  const calls: string[] = [];
  const fn = async (url: string) => {
    calls.push(url);
    if (overrides[url]) return overrides[url]();
    if (url.startsWith("https://fonts.googleapis.com/css2")) return new Response(CSS, { status: 200 });
    if (url === GSTATIC) return new Response(Buffer.concat([Buffer.from("wOF2"), Buffer.alloc(64)]), { status: 200 });
    return new Response("nope", { status: 404 });
  };
  return { fn, calls };
}

describe("font Google: katalog dan pemilihan bobot", () => {
  it("memfilter keluarga dan mengurutkan yang diawali kata cari lebih dulu", () => {
    const list: GoogleFontEntry[] = [
      { family: "Bodoni Moda", category: "Serif", weights: [400, 700], subsets: ["latin"] },
      { family: "Moda Sans", category: "Sans Serif", weights: [400], subsets: ["latin"] },
      { family: "Noto Sans JP", category: "Sans Serif", weights: [400], subsets: ["japanese"] },
    ];
    expect(searchCatalog(list, "moda", "").map((f) => f.family)).toEqual(["Moda Sans", "Bodoni Moda"]);
    expect(searchCatalog(list, "", "Serif").map((f) => f.family)).toEqual(["Bodoni Moda"]);
    expect(searchCatalog(list, "noto", "")).toEqual([]);
  });

  it("parseCatalog membuang awalan pengaman dan nama keluarga yang tidak aman", () => {
    const raw = `)]}'\n` + JSON.stringify({ familyMetadataList: [
      { family: "Italiana", category: "Serif", fonts: { "400": {}, "400i": {} }, subsets: ["latin"] },
      { family: "Bad;Name", category: "Serif", fonts: { "400": {} }, subsets: ["latin"] },
    ] });
    const list = parseCatalog(raw);
    expect(list).toEqual([{ family: "Italiana", category: "Serif", weights: [400], subsets: ["latin"] }]);
  });

  it("pickWeights dan googleCssUrl", () => {
    expect(pickWeights([300, 400, 500, 700, 900])).toEqual([400, 700]);
    expect(pickWeights([400])).toEqual([400]);
    expect(pickWeights([300, 600])).toEqual([300, 600]);
    expect(googleCssUrl("Italiana", [400])).toBe("https://fonts.googleapis.com/css2?family=Italiana&display=swap");
    expect(googleCssUrl("Playfair Display", [400, 700])).toBe("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap");
  });
});

describe("font Google: penulisan ulang CSS", () => {
  it("hanya menyimpan subset latin dan mengarahkan src ke berkas lokal", () => {
    const { css, sources } = rewriteLatinFaces(CSS, "italiana");
    expect(sources).toEqual([{ file: "1.woff2", url: GSTATIC }]);
    expect(css).toContain("url(/uploads/fonts/italiana/1.woff2) format('woff2')");
    expect(css).not.toContain("gstatic");
    expect(css).not.toContain("latin-ext");
  });

  it("menolak berkas dari domain selain fonts.gstatic.com", () => {
    expect(() => rewriteLatinFaces(CSS.replaceAll("fonts.gstatic.com", "evil.example.com"), "x")).toThrow(FontError);
  });

  it("menolak font tanpa subset latin", () => {
    expect(() => rewriteLatinFaces(CSS.replace("/* latin */", "/* japanese */"), "x")).toThrow(/latin/);
  });
});

describe("font Google: unduh ke server", () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "lux-fonts-")); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("mengunduh sekali, menulis font.css lokal, dan idempoten", async () => {
    const { fn, calls } = fakeFetch();
    await ensureGoogleFont("italiana", { dir, fetchImpl: fn, catalog: [ITALIANA] });
    expect(isGoogleFontInstalled("Italiana", dir)).toBe(true);
    expect(fs.readFileSync(path.join(dir, "italiana", "font.css"), "utf-8")).toContain("/uploads/fonts/italiana/1.woff2");
    expect(fs.readFileSync(path.join(dir, "italiana", "1.woff2")).subarray(0, 4).toString()).toBe("wOF2");
    const first = calls.length;
    await ensureGoogleFont("Italiana", { dir, fetchImpl: fn, catalog: [ITALIANA] });
    expect(calls.length).toBe(first);
    expect(fs.readdirSync(dir).filter((n) => n.startsWith(".tmp"))).toEqual([]);
  });

  it("permintaan serentak untuk font sama hanya mengunduh satu kali", async () => {
    const { fn, calls } = fakeFetch();
    await Promise.all([1, 2, 3].map(() => ensureGoogleFont("Italiana", { dir, fetchImpl: fn, catalog: [ITALIANA] })));
    expect(calls.filter((u) => u === GSTATIC)).toHaveLength(1);
  });

  it("menolak nama di luar katalog tanpa menghubungi Google", async () => {
    const { fn, calls } = fakeFetch();
    await expect(ensureGoogleFont("../../etc/passwd", { dir, fetchImpl: fn, catalog: [ITALIANA] })).rejects.toThrow(/katalog/);
    expect(calls).toEqual([]);
  });

  it("berkas bukan woff2 ditolak dan tidak meninggalkan folder setengah jadi", async () => {
    const { fn } = fakeFetch({ [GSTATIC]: () => new Response("<html>", { status: 200 }) });
    await expect(ensureGoogleFont("Italiana", { dir, fetchImpl: fn, catalog: [ITALIANA] })).rejects.toThrow(/woff2/);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("galat jaringan dilaporkan apa adanya, bukan dianggap berhasil", async () => {
    const failing = async () => { throw new Error("ENOTFOUND"); };
    await expect(ensureGoogleFont("Italiana", { dir, fetchImpl: failing as any, catalog: [ITALIANA] })).rejects.toThrow(/ENOTFOUND/);
    expect(isGoogleFontInstalled("Italiana", dir)).toBe(false);
  });
});

describe("font Google: spesifikasi dan kompilasi", () => {
  it("id Google sah, id berbahaya ditolak", () => {
    const base = defaultBuilderSpec();
    expect(parseBuilderSpec({ ...base, fonts: { ...base.fonts, heading: "g:Italiana" } }).ok).toBe(true);
    for (const bad of ["g:", "g:x", "g:a;b", "g:</style>", "g:Italiana'}body{", "gg:Italiana", "g:../etc"]) {
      expect(parseBuilderSpec({ ...base, fonts: { ...base.fonts, heading: bad } }).ok, bad).toBe(false);
    }
    expect(isGoogleFontId("g:Playfair Display")).toBe(true);
  });

  it("master memuat link CSS font dan variabel huruf dengan cadangan generik per peran", () => {
    const base = defaultBuilderSpec();
    const spec = { ...base, fonts: { heading: "g:Italiana", body: "g:Lato", script: "g:Italiana" } };
    const html = compileBuilderMaster(spec, readBuilderBlueprint("WEDDING"));
    expect(googleFontIds(spec.fonts)).toEqual(["g:Italiana", "g:Lato"]);
    expect(html).toContain(`<link rel="stylesheet" href="${googleFontCssUrl("g:Italiana")}" />`);
    expect(html).toContain(`<link rel="stylesheet" href="/uploads/fonts/lato/font.css" />`);
    expect(html).toContain("--font-heading: 'Italiana', Georgia, serif;");
    expect(html).toContain("--font-body: 'Lato', system-ui, sans-serif;");
    expect(html).toContain("--font-script: 'Italiana', cursive;");
    expect(fontFamily("g:Lato", "body")).toBe("'Lato', system-ui, sans-serif");
  });

  it("tanpa font Google master tidak menambah link", () => {
    const html = compileBuilderMaster(defaultBuilderSpec(), readBuilderBlueprint("WEDDING"));
    expect(html).not.toContain("/uploads/fonts/");
  });
});
