/**
 * Warna utama tema untuk slot milik tema yang kosong dan tanpa gambar bawaan: dibaca dari :root piring draf dan hanya
 * warna yang sah.
 */
import { describe, it, expect } from "vitest";
import { primaryColorOf } from "@/lib/themePalette";

describe("primaryColorOf", () => {
  it("mengambil --primary dari blok :root", () => {
    expect(primaryColorOf("<style>:root { --bg-dark: #101010; --primary: #ab5e44; --accent: #d4a373; } .x { color: #fff; }</style>")).toBe("#ab5e44");
  });

  it("memakai --primary di :root, bukan deklarasi serupa di luar :root", () => {
    expect(primaryColorOf("<style>.a { --primary: #111111; } :root { --primary: #222222; }</style>")).toBe("#222222");
  });

  it("nilai yang bukan warna sah dikembalikan kosong", () => {
    expect(primaryColorOf("<style>:root { --primary: url(javascript:alert(1)); }</style>")).toBe("");
    expect(primaryColorOf("<style>:root { --accent: #fff; }</style>")).toBe("");
  });
});
