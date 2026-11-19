/**
 * Scrim dinamis di atas foto latar klien (lib/bgPhotoTone.ts): nilai awal dari kecerahan foto klien sendiri, hanya alfa
 * gradasi master yang diganti (warna dan bentuk tetap), lapisan foto tidak disentuh.
 */
import { describe, it, expect } from "vitest";
import { parseBgScrim, rescaleScrimLayers, suggestBgScrim } from "@/lib/bgPhotoTone";

describe("parseBgScrim", () => {
  it("kosong = bawaan tema; angka dijepit 0–90", () => {
    expect(parseBgScrim(undefined)).toBeNull();
    expect(parseBgScrim(null)).toBeNull();
    expect(parseBgScrim("")).toBeNull();
    expect(parseBgScrim("abc")).toBeNull();
    expect(parseBgScrim(55.4)).toBe(55);
    expect(parseBgScrim(-10)).toBe(0);
    expect(parseBgScrim(150)).toBe(90);
  });
});

describe("suggestBgScrim", () => {
  it("foto gelap mendapat lapisan tipis, foto terang lebih pekat", () => {
    expect(suggestBgScrim(0)).toBe(35);
    expect(suggestBgScrim(1)).toBe(80);
    expect(suggestBgScrim(0.2)).toBeLessThan(suggestBgScrim(0.8));
  });
});

describe("rescaleScrimLayers", () => {
  it("mengganti alfa titik warna gradasi di atas foto, mempertahankan warna dan lapisan foto", () => {
    const base = 'radial-gradient(circle at 50% 25%, color(srgb 0.24 0.15 0.1) 0%, color(srgb 0.13 0.08 0.05 / 0.96) 88%), url("https://x/foto.webp")';
    expect(rescaleScrimLayers(base, 60)).toBe('radial-gradient(circle at 50% 25%, color(srgb 0.24 0.15 0.1 / 0.6) 0%, color(srgb 0.13 0.08 0.05 / 0.6) 88%), url("https://x/foto.webp")');
  });

  it("rgb/rgba ikut diganti; gradasi di bawah foto tidak disentuh", () => {
    const base = 'linear-gradient(rgb(10, 10, 10) 0%, rgba(10, 10, 10, 0.95) 100%), url("a.webp"), linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))';
    expect(rescaleScrimLayers(base, 40)).toBe('linear-gradient(rgba(10, 10, 10, 0.4) 0%, rgba(10, 10, 10, 0.4) 100%), url("a.webp"), linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))');
  });
});
