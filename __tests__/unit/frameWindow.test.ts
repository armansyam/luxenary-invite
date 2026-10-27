/**
 * Pengukur jendela bingkai: kanal alpha gambar menentukan di mana foto harus dipasang. Gambar sintetis menguji
 * algoritmanya; bingkai bawaan pustaka menjamin bingkai kustom yang nyata terbaca benar.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { defaultBuilderSpec, parseBuilderSpec } from "@/lib/themeBuilder/spec";
import { fitSpecFrames, measureFrameWindow } from "@/lib/themeBuilder/frameWindow";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "lux-frame-"));
const dir = path.join(root, "assets", "ornaments", "uji");
fs.mkdirSync(dir, { recursive: true });
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

/** Bingkai opak berukuran w x h dengan jendela transparan persegi panjang pada [x0,y0]-[x1,y1] (piksel). */
async function frameWithWindow(name: string, w: number, h: number, [x0, y0, x1, y1]: [number, number, number, number]) {
  const solid = await sharp({ create: { width: w, height: h, channels: 4, background: { r: 120, g: 80, b: 30, alpha: 1 } } }).png().toBuffer();
  const hole = await sharp({ create: { width: x1 - x0, height: y1 - y0, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  const buffer = await sharp(solid).composite([{ input: hole, left: x0, top: y0, blend: "dest-out" }]).png().toBuffer();
  fs.writeFileSync(path.join(dir, name), buffer);
  return `/assets/ornaments/uji/${name}`;
}

describe("measureFrameWindow", () => {
  it("mengukur kotak jendela dan rasio dalam piksel asli", async () => {
    const src = await frameWithWindow("portrait.png", 400, 600, [100, 120, 300, 480]);
    const fit = await measureFrameWindow(src, root);
    expect(fit).not.toBeNull();
    expect(fit!.l).toBeCloseTo(0.25, 1);
    expect(fit!.t).toBeCloseTo(0.2, 1);
    expect(fit!.r).toBeCloseTo(0.75, 1);
    expect(fit!.b).toBeCloseTo(0.8, 1);
    expect(fit!.aspect).toBeCloseTo(200 / 360, 1);
  });

  it("bingkai tanpa jendela (tengah opak) dan jendela yang menyentuh tepi menghasilkan null", async () => {
    const solid = await sharp({ create: { width: 200, height: 300, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } } }).png().toBuffer();
    fs.writeFileSync(path.join(dir, "opak.png"), solid);
    expect(await measureFrameWindow("/assets/ornaments/uji/opak.png", root)).toBeNull();
    const edge = await frameWithWindow("tepi.png", 200, 300, [0, 50, 200, 250]);
    expect(await measureFrameWindow(edge, root)).toBeNull();
  });

  it("menolak path di luar pustaka ornamen dan berkas yang tidak ada", async () => {
    expect(await measureFrameWindow("/assets/ornaments/uji/../../../secret.png", root)).toBeNull();
    expect(await measureFrameWindow("/etc/passwd", root)).toBeNull();
    expect(await measureFrameWindow("/assets/ornaments/uji/tidak-ada.png", root)).toBeNull();
  });

  it("bingkai kustom bawaan pustaka: berjendela potret, dan yang opak tidak berjendela", async () => {
    const adat = await measureFrameWindow("/assets/ornaments/bugis/bingkai-adat-bugis.png");
    expect(adat).not.toBeNull();
    expect(adat!.r - adat!.l).toBeGreaterThan(0.5);
    expect(adat!.aspect).toBeGreaterThan(0.6);
    expect(adat!.aspect).toBeLessThan(0.9);
    expect(await measureFrameWindow("/assets/ornaments/bugis/bingkai-adat-bugis-3d.png")).toBeNull();
  });
});

describe("fitSpecFrames", () => {
  it("mengisi jendela dari gambar dan mengabaikan nilai kiriman klien", async () => {
    const src = await frameWithWindow("portrait2.png", 400, 600, [100, 120, 300, 480]);
    const base = defaultBuilderSpec();
    const parsed = parseBuilderSpec({
      ...base,
      frames: { "couple-photo-1": { shape: "default", ornament: "/assets/ornaments/bugis/bingkai-adat-bugis.png", spread: 14, hideRing: false, fit: { l: 0.1, t: 0.1, r: 0.9, b: 0.9, aspect: 1 } } },
    });
    if (!parsed.ok) throw new Error(parsed.errors.join(", "));
    const fitted = await fitSpecFrames(parsed.spec);
    const fit = fitted.frames["couple-photo-1"]!.fit!;
    // Bukan nilai palsu dari klien (0.1..0.9, rasio 1): jendela bingkai asli bentuknya potret.
    expect(fit.aspect).toBeLessThan(0.9);
    expect(fit.l).toBeGreaterThan(0.12);
    expect(src).toContain("portrait2");
  });
});
