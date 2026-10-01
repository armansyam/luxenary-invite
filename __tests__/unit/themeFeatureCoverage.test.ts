/**
 * Lantai cakupan fitur tema (angka di docs/SYSTEM_ARCHITECTURE.md bagian 26). Tes ini gagal bila cakupan turun;
 * bila cakupan naik, naikkan lantainya dan perbarui matriks di dokumen.
 */
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

const FILES = themeFiles(path.join(process.cwd(), "themes")).map((file) => ({ file, html: fs.readFileSync(file, "utf8") }));
const count = (pattern: RegExp) => FILES.filter(({ html }) => pattern.test(html)).length;

const FLOORS: Array<[string, RegExp, number]> = [
  ["requestSmartFullscreen()", /requestSmartFullscreen/, 30],
  ["salam pembuka {{openingGreeting}}", /\{\{openingGreeting\}\}/, 25],
  ["tautan kalender googleCalendarUrl", /googleCalendarUrl/, 21],
  ["hitung mundur targetDate", /targetDate/, 33],
  ["layout split 460px", /460px/, 33],
  ["gaya ::selection kustom", /::selection/, 12],
  ["mitra vendor {{vendorsSectionHtml}}", /\{\{vendorsSectionHtml\}\}/, 28],
  ["galeri kenangan {{memoriesSectionHtml}}", /\{\{memoriesSectionHtml\}\}/, 22],
];

describe("cakupan fitur tema", () => {
  it("jumlah tema tidak berkurang", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(39);
  });

  it.each(FLOORS)("%s tidak turun di bawah lantai", (_name, pattern, floor) => {
    expect(count(pattern)).toBeGreaterThanOrEqual(floor);
  });

  it("tidak ada teks statis keagamaan yang tertanam", () => {
    for (const { file, html } of FILES) {
      expect(html, file).not.toContain("﷽");
      expect(html, file).not.toContain("WALIMATUL 'URS");
    }
  });
});
