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

describe("ucapan yang baru dikirim tidak boleh menjadi markup", () => {
  it("menemukan berkas tema", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(39);
  });

  it.each(THEMES.map((file) => [path.relative(process.cwd(), file), file]))("%s", (_name, file) => {
    const lines = fs.readFileSync(file, "utf8").split("\n").filter((line) => /newWishItem\.innerHTML\s*=/.test(line));
    for (const line of lines) {
      expect(line, "name mentah masuk innerHTML").not.toMatch(/\+\s*name\s*\+/);
      expect(line, "message mentah masuk innerHTML").not.toMatch(/\+\s*message\s*\+/);
      expect(line, "count mentah masuk innerHTML").not.toMatch(/\+\s*count\s*\+/);
    }
  });
});
