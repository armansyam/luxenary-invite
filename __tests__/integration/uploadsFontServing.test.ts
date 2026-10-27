/**
 * Rute /uploads menyajikan CSS dan woff2 hanya dari folder fonts/ (font Google yang diunduh server). Berkas ber-ekstensi
 * sama di folder unggahan lain tidak boleh tampil sebagai stylesheet di origin ini.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { GET } from "@/app/uploads/[...path]/route";

const UPLOADS = path.join(process.cwd(), "public", "uploads");
const TAG = `zz-vitest-${Date.now()}`;
const fontDir = path.join(UPLOADS, "fonts", TAG);
const otherDir = path.join(UPLOADS, TAG);

const get = (...segments: string[]) =>
  GET(new NextRequest(`http://localhost/uploads/${segments.join("/")}`), { params: Promise.resolve({ path: segments }) });

afterAll(() => {
  fs.rmSync(fontDir, { recursive: true, force: true });
  fs.rmSync(otherDir, { recursive: true, force: true });
});

describe("rute /uploads: css dan woff2 hanya dari fonts/", () => {
  it("menyajikan font.css dan woff2 dari fonts/ dengan tipe yang benar", async () => {
    fs.mkdirSync(fontDir, { recursive: true });
    fs.writeFileSync(path.join(fontDir, "font.css"), "@font-face{}");
    fs.writeFileSync(path.join(fontDir, "1.woff2"), Buffer.from("wOF2"));
    const css = await get("fonts", TAG, "font.css");
    expect(css.status).toBe(200);
    expect(css.headers.get("content-type")).toContain("text/css");
    const font = await get("fonts", TAG, "1.woff2");
    expect(font.status).toBe(200);
    expect(font.headers.get("content-type")).toBe("font/woff2");
  });

  it("menolak css dan woff2 di folder unggahan lain", async () => {
    fs.mkdirSync(otherDir, { recursive: true });
    fs.writeFileSync(path.join(otherDir, "evil.css"), "body{display:none}");
    fs.writeFileSync(path.join(otherDir, "evil.woff2"), Buffer.from("wOF2"));
    expect((await get(TAG, "evil.css")).status).toBe(404);
    expect((await get(TAG, "evil.woff2")).status).toBe(404);
  });

  it("gambar di folder lain tetap disajikan", async () => {
    fs.mkdirSync(otherDir, { recursive: true });
    fs.writeFileSync(path.join(otherDir, "a.webp"), "x");
    expect((await get(TAG, "a.webp")).status).toBe(200);
  });
});
