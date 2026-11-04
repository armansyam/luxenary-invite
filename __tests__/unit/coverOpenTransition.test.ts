/**
 * Animasi buka sampul: aturan `.opened` yang menyembunyikan sampul dengan `visibility: hidden` harus diimbangi
 * `visibility` di daftar transisi sampul (ditunda sampai geser/pudar selesai). Tanpa itu `visibility` berganti di frame
 * pertama dan sampul lenyap seketika; sebelum 5 Nov 2026 hal ini terjadi pada 29 master dan blueprint builder.
 * Transisi di dalam `@media (prefers-reduced-motion: reduce)` dikecualikan karena memang mematikan animasi.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { THEME_MAP } from "@/lib/renderTemplate";

const COVER = /^(\.cover-screen|\.cover-overlay|#coverScreen|#coverOverlay)$/;

function withoutBlock(css: string, opener: RegExp): string {
  let out = css;
  for (let m = opener.exec(out); m; m = opener.exec(out)) {
    let depth = 0;
    let end = out.length;
    for (let i = out.indexOf("{", m.index); i < out.length; i++) {
      if (out[i] === "{") depth++;
      if (out[i] === "}" && --depth === 0) { end = i + 1; break; }
    }
    out = out.slice(0, m.index) + out.slice(end);
  }
  return out;
}

/** Master yang menyembunyikan sampul dengan visibility tetapi tidak mentransisikannya; [] berarti aman. */
function instantCoverHides(html: string): string[] {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n").replace(/\{\{[^}]*\}\}/g, "");
  const scoped = withoutBlock(css.replace(/\/\*[\s\S]*?\*\//g, ""), /@media\s*\(prefers-reduced-motion[^{]*\{/);
  const rules = [...scoped.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].split(",").map((s) => s.trim()), body: m[2] }));
  const transitionsOf = (base: string) => rules.filter((r) => r.selectors.includes(base)).flatMap((r) => [...r.body.matchAll(/transition\s*:\s*([^;]+)/g)].map((m) => m[1].trim()));
  const problems: string[] = [];
  for (const r of rules) {
    if (!/visibility\s*:\s*hidden/.test(r.body)) continue;
    // Satu aturan `.opened` sering menyebut dua nama kelas sampul sekaligus; hanya salah satunya dipakai elemen, jadi
    // cukup satu yang bertransisi, tetapi setiap transisi yang ada wajib memuat visibility.
    const bases = r.selectors.map((s) => s.replace(/\.opened$/, "")).filter((b, i) => b !== r.selectors[i] && COVER.test(b));
    if (!bases.length) continue;
    const found = bases.flatMap((b) => transitionsOf(b).map((t) => `${b}: ${t}`));
    if (!found.length) problems.push(`${bases.join(", ")}: tanpa transisi`);
    problems.push(...found.filter((t) => !/\bvisibility\b|\ball\b/.test(t.split(": ")[1])));
  }
  return [...new Set(problems)];
}

const masters = [
  ...Object.entries(THEME_MAP).map(([id, info]) => {
    const folder = info.eventType === "gathering" ? "general" : info.eventType;
    return [id, path.join(process.cwd(), "themes", folder, info.style, info.file)] as const;
  }),
  ["blueprint pernikahan", path.join(process.cwd(), "themes", "_blueprints", "wedding", "starter-blueprint.html")] as const,
  ["blueprint satu nama", path.join(process.cwd(), "themes", "_blueprints", "single-name", "starter-blueprint-single.html")] as const,
].filter(([, file]) => fs.existsSync(file));

describe("animasi buka sampul", () => {
  it("pendeteksi menangkap visibility yang tidak ikut transisi", () => {
    const bad = "<style>.cover-screen { transition: transform 0.8s ease, opacity 0.8s ease; } .cover-screen.opened { opacity: 0; visibility: hidden; }</style>";
    const good = bad.replace("opacity 0.8s ease;", "opacity 0.8s ease, visibility 0s linear 0.8s;");
    const reduced = good.replace("</style>", "@media (prefers-reduced-motion: reduce) { .cover-screen { transition: none; } }</style>");
    expect(instantCoverHides(bad)).toEqual([".cover-screen: transform 0.8s ease, opacity 0.8s ease"]);
    expect(instantCoverHides(good)).toEqual([]);
    expect(instantCoverHides(reduced)).toEqual([]);
  });

  it.each(masters)("%s: sampul tidak lenyap seketika saat dibuka", (_id, file) => {
    expect(instantCoverHides(fs.readFileSync(file, "utf8"))).toEqual([]);
  });
});
