/**
 * QR dengan inisial di tengah harus tetap terbaca oleh pemindai yang sama dengan yang dipakai resepsionis
 * (html5-qrcode memakai ZXing). SVG dirasterisasi dengan sharp (librsvg) sehingga huruf di tengah ikut tergambar.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import sharp from "sharp";
import { buildQrSvg } from "@/lib/qrSvg";
import { buildCheckinPayload } from "@/lib/checkinQr";

const require = createRequire(import.meta.url);
const ZX = require("html5-qrcode/third_party/zxing-js.umd.js");

async function decode(svg: string, extra?: (png: Buffer) => Promise<Buffer>): Promise<string | null> {
  let png: Buffer = await sharp(Buffer.from(svg)).flatten({ background: "#ffffff" }).png().toBuffer();
  if (extra) png = await extra(png);
  const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  const source = new ZX.RGBLuminanceSource(Uint8ClampedArray.from(data), info.width, info.height);
  const bitmap = new ZX.BinaryBitmap(new ZX.HybridBinarizer(source));
  const hints = new Map([[ZX.DecodeHintType.TRY_HARDER, true]]);
  try {
    return new ZX.QRCodeReader().decode(bitmap, hints).getText();
  } catch {
    return null;
  }
}

const INV = "afef09d3-de6c-49ac-9766-704f7cd727dc";
const cases: Array<[string, string, string]> = [
  ["pernikahan, 2 huruf", buildCheckinPayload(INV, "Budi Santoso"), "RD"],
  ["acara tunggal, 1 huruf", buildCheckinPayload(INV, "Rani Kartika"), "R"],
  ["nama beraksen", buildCheckinPayload(INV, "Syâmil & Keluarga Besar"), "SK"],
  ["nama terpanjang (100 karakter)", buildCheckinPayload(INV, "N".repeat(100)), "AB"],
  ["tamu umum tautan umum", buildCheckinPayload(INV, "Tamu Undangan"), "RD"],
  ["URL kamera momen", "https://andi-siti.luxvite.id/sharemoment", "AS"],
];

/**
 * Ukuran yang diuji adalah ukuran tampil nyata (160px ≈ 3px per modul). ZXing sesekali gagal pada raster digital yang
 * sangat besar (blok binarisasi 8px lebih kecil dari satu modul), termasuk untuk QR tanpa inisial; kegagalan itu
 * artefak pemindai uji, bukan tanda inisial merusak QR, sehingga ukuran besar sengaja tidak dijadikan syarat.
 */
const DISPLAY_SIZE = 160;

describe("QR dengan inisial di tengah tetap terbaca", () => {
  for (const [label, data, mark] of cases) {
    it(`${label} @${DISPLAY_SIZE}px`, async () => {
      expect(await decode(buildQrSvg(data, DISPLAY_SIZE, mark))).toBe(data);
    });
  }

  it("keterbacaan dengan inisial setara QR tanpa inisial pada 40 nama acak", async () => {
    let seed = 20261006;
    const next = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const alphabet = "abcdefghijklmnopqrstuvwxyz ";
    const names = Array.from({ length: 40 }, () => {
      const length = 4 + Math.floor(next() * 40);
      return Array.from({ length }, () => alphabet[Math.floor(next() * alphabet.length)]).join("").trim() || "tamu";
    });

    let withMark = 0;
    let baseline = 0;
    for (const name of names) {
      const data = buildCheckinPayload(INV, name);
      if ((await decode(buildQrSvg(data, DISPLAY_SIZE, "RD"))) === data) withMark++;
      if ((await decode(buildQrSvg(data, DISPLAY_SIZE))) === data) baseline++;
    }
    expect(withMark / names.length).toBeGreaterThanOrEqual(0.95);
    expect(withMark).toBeGreaterThanOrEqual(baseline - 2);
  });

  it("tanpa inisial tetap terbaca (kompatibel dengan QR lama)", async () => {
    const data = buildCheckinPayload(INV, "Budi Santoso");
    expect(await decode(buildQrSvg(data, 160))).toBe(data);
  });

  it("inisial memuat huruf di tengah dan menaikkan koreksi kesalahan", () => {
    const withMark = buildQrSvg("hello", 160, "RD");
    const without = buildQrSvg("hello", 160);
    expect(withMark).toContain("<circle");
    expect(withMark).toContain(">RD</text>");
    expect(without).not.toContain("<circle");
    expect(withMark.length).toBeGreaterThan(without.length);
  });

  it("inisial dibatasi 2 karakter dan dibersihkan dari markup", () => {
    const svg = buildQrSvg("hello", 160, "<script>");
    expect(svg).not.toContain("<script>");
    expect(svg).toMatch(/>SC<\/text>/);
  });

  it("kontrol negatif: QR yang tengahnya ditutup terlalu lebar memang gagal terbaca", async () => {
    const data = buildCheckinPayload(INV, "Budi Santoso");
    const covered = await decode(buildQrSvg(data, DISPLAY_SIZE, "RD"), async (png) => {
      const cover = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#ffffff" } }).png().toBuffer();
      return sharp(png).composite([{ input: cover, left: 30, top: 30 }]).png().toBuffer();
    });
    expect(covered).not.toBe(data);
  });
});
