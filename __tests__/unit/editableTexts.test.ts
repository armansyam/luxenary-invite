/**
 * Daftar teks hias yang boleh diubah klien (isian Studio "Teks Hias Tema") dibaca dari `Theme.builderSpec` mentah:
 * hanya kunci hias1-hias3 dengan teks, satu entri per kunci, urut kunci.
 */
import { describe, it, expect } from "vitest";
import { editableTextsOf } from "@/lib/themeBuilder/texts";

const text = (value: string, labelKey?: string) => ({ value, font: "script", size: 20, color: "accent", spacing: 0, ...(labelKey ? { labelKey } : {}) });

describe("editableTextsOf", () => {
  it("mengambil teks hias editable dari ornamen, urut kunci, tanpa ornamen gambar dan teks statis", () => {
    const spec = {
      ornaments: [
        { id: "a", section: "closing", src: "", text: text("Terima kasih", "hias2") },
        { id: "b", section: "cover", src: "/assets/ornaments/x.webp" },
        { id: "c", section: "opening", src: "", text: text("Bersama keluarga") },
        { id: "d", section: "cover", src: "", text: text("Save the Date", "hias1") },
      ],
    };
    expect(editableTextsOf(spec)).toEqual([
      { key: "hias1", value: "Save the Date", section: "cover" },
      { key: "hias2", value: "Terima kasih", section: "closing" },
    ]);
  });

  it("mengabaikan kunci di luar hias1-hias3 dan kunci ganda", () => {
    const spec = {
      ornaments: [
        { id: "a", section: "cover", src: "", text: text("Satu", "hias1") },
        { id: "b", section: "opening", src: "", text: text("Dua", "hias1") },
        { id: "c", section: "cover", src: "", text: text("Judul", "coverBadge") },
      ],
    };
    expect(editableTextsOf(spec)).toEqual([{ key: "hias1", value: "Satu", section: "cover" }]);
  });

  it("kosong untuk tema tanpa spesifikasi builder", () => {
    expect(editableTextsOf(null)).toEqual([]);
    expect(editableTextsOf({})).toEqual([]);
    expect(editableTextsOf({ ornaments: "x" })).toEqual([]);
  });
});
