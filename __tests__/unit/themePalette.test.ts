/**
 * Warna utama tema untuk slot milik tema yang kosong dan tanpa gambar bawaan: dibaca dari :root piring draf, hanya
 * warna yang sah, dan tidak pernah membaca di luar data/drafts.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { themeMainColor } from "@/lib/themePalette";

const DRAFTS = path.join(process.cwd(), "data", "drafts");
const TAG = `vitest-palette-${Date.now().toString(36)}`;
const written: string[] = [];

function draft(name: string, html: string): string {
  const id = `${TAG}-${name}`;
  fs.mkdirSync(DRAFTS, { recursive: true });
  fs.writeFileSync(path.join(DRAFTS, `${id}.html`), html, "utf-8");
  written.push(path.join(DRAFTS, `${id}.html`));
  return id;
}

afterAll(() => {
  for (const file of written) fs.rmSync(file, { force: true });
});

describe("themeMainColor", () => {
  it("mengambil --primary dari blok :root", () => {
    const id = draft("ok", "<style>:root { --bg-dark: #101010; --primary: #ab5e44; --accent: #d4a373; } .x { color: #fff; }</style>");
    expect(themeMainColor(id)).toBe("#ab5e44");
  });

  it("memakai --primary di :root, bukan deklarasi serupa di luar :root", () => {
    const id = draft("scope", "<style>.a { --primary: #111111; } :root { --primary: #222222; }</style>");
    expect(themeMainColor(id)).toBe("#222222");
  });

  it("nilai yang bukan warna sah dikembalikan kosong", () => {
    expect(themeMainColor(draft("bad", "<style>:root { --primary: url(javascript:alert(1)); }</style>"))).toBe("");
    expect(themeMainColor(draft("none", "<style>:root { --accent: #fff; }</style>"))).toBe("");
  });

  it("draf tidak ada atau ID tidak aman -> kosong, tanpa melempar", () => {
    expect(themeMainColor(`${TAG}-tidak-ada`)).toBe("");
    expect(themeMainColor("../package")).toBe("");
    expect(themeMainColor("")).toBe("");
  });
});
