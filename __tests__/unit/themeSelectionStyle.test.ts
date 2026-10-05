import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function themeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "_blueprints") return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return themeFiles(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

const THEMES = themeFiles(path.join(process.cwd(), "themes"));

describe("seleksi teks memakai palet tema, bukan bawaan peramban", () => {
  it("menemukan berkas tema", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(39);
  });

  it.each(THEMES.map((file) => [path.relative(process.cwd(), file), file]))("%s", (_name, file) => {
    const source = fs.readFileSync(file, "utf8");
    const rule = source.match(/::selection\s*\{([^}]*)\}/);
    expect(rule, "aturan ::selection tidak ditemukan").not.toBeNull();

    const token = rule![1].match(/var\((--[a-z-]+)[,)]/);
    expect(token, "::selection tidak memakai token palet tema").not.toBeNull();
    expect(source, `token ${token![1]} tidak didefinisikan di tema`).toMatch(new RegExp(`^\\s*${token![1]}\\s*:`, "m"));
  });
});
