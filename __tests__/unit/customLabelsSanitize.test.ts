/**
 * Label khusus dari klien (Studio menyimpan seluruh objek customLabels lewat PUT undangan): kunci, tipe, panjang, dan
 * jumlah dibatasi tanpa mengubah nilai yang sudah tersimpan.
 */
import { describe, it, expect } from "vitest";
import { MAX_CUSTOM_LABELS, MAX_CUSTOM_LABEL_LENGTH, keepValidCustomLabels, mergeFeatureSettingsInput } from "@/lib/featureSettings";

describe("keepValidCustomLabels", () => {
  it("tanpa customLabels di input tidak mengubah apa pun", () => {
    const merged = { showMusic: true };
    expect(keepValidCustomLabels(merged, { customLabels: { a: "x" } })).toBe(merged);
  });

  it("menerima label sah termasuk string kosong dan kunci teks hias", () => {
    const out = keepValidCustomLabels({ customLabels: { hias1: "Syukuran Keluarga", coverBadge: "", openBtn: "Buka" } }, {});
    expect(out.customLabels).toEqual({ hias1: "Syukuran Keluarga", coverBadge: "", openBtn: "Buka" });
  });

  it("membuang kunci tidak sah dan nilai bukan string tanpa nilai tersimpan", () => {
    const out = keepValidCustomLabels({ customLabels: { "a.b": "x", "<k>": "x", ok: "y", num: 5, obj: { a: 1 }, nul: null, "": "z" } }, {});
    expect(out.customLabels).toEqual({ ok: "y" });
  });

  it("nilai tidak sah diganti nilai tersimpan bila ada", () => {
    const stored = { customLabels: { openBtn: "Buka Lama", closingQuote: "x".repeat(MAX_CUSTOM_LABEL_LENGTH + 50) } };
    const out = keepValidCustomLabels({ customLabels: { openBtn: { hack: 1 }, closingQuote: stored.customLabels.closingQuote, baru: "y".repeat(MAX_CUSTOM_LABEL_LENGTH + 1) } }, stored);
    expect(out.customLabels).toEqual({ openBtn: "Buka Lama", closingQuote: stored.customLabels.closingQuote });
  });

  it("menolak label baru yang melebihi batas panjang tetapi menerima tepat di batas", () => {
    const atLimit = "a".repeat(MAX_CUSTOM_LABEL_LENGTH);
    expect(keepValidCustomLabels({ customLabels: { x: atLimit } }, {}).customLabels).toEqual({ x: atLimit });
    expect(keepValidCustomLabels({ customLabels: { x: atLimit + "a" } }, {}).customLabels).toEqual({});
  });

  it("membatasi jumlah kunci", () => {
    const many = Object.fromEntries(Array.from({ length: MAX_CUSTOM_LABELS + 25 }, (_, i) => [`k${i}`, "v"]));
    expect(Object.keys(keepValidCustomLabels({ customLabels: many }, {}).customLabels)).toHaveLength(MAX_CUSTOM_LABELS);
  });

  it("customLabels yang bukan objek dikembalikan ke nilai tersimpan atau dibuang", () => {
    expect(keepValidCustomLabels({ customLabels: "x" }, { customLabels: { a: "1" } }).customLabels).toEqual({ a: "1" });
    expect("customLabels" in keepValidCustomLabels({ customLabels: ["x"] }, {})).toBe(false);
  });
});

describe("mergeFeatureSettingsInput: label digabung per kunci", () => {
  const merge = async (stored: unknown, incoming: unknown) => {
    const r = await mergeFeatureSettingsInput(stored, incoming, "TIER_2", true);
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };

  it("tab basi tidak menghapus label yang baru diubah dari tab lain", async () => {
    const stored = { customLabels: { openBtn: "Buka Baru", hias1: "Teks Baru" }, showMusic: true };
    const out = await merge(stored, { customLabels: { openBtn: "Buka Lama" } });
    expect(out.customLabels).toEqual({ openBtn: "Buka Lama", hias1: "Teks Baru" });
    expect(out.showMusic).toBe(true);
  });

  it("kunci baru ditambahkan, string kosong tetap mengosongkan label, dan input JSON string didukung", async () => {
    const out = await merge({ customLabels: { a: "1" } }, JSON.stringify({ customLabels: { b: "2", a: "" } }));
    expect(out.customLabels).toEqual({ a: "", b: "2" });
  });

  it("tanpa label tersimpan, input dipakai apa adanya setelah disaring", async () => {
    expect((await merge({}, { customLabels: { ok: "y", "bad key": "z" } })).customLabels).toEqual({ ok: "y" });
    expect((await merge({ showMusic: false }, { showMusic: true })).customLabels).toBeUndefined();
  });

  it("label yang sudah tersimpan tidak terdorong keluar oleh batas jumlah kunci", async () => {
    const stored = { customLabels: Object.fromEntries(Array.from({ length: MAX_CUSTOM_LABELS }, (_, i) => [`s${i}`, "v"])) };
    const out = await merge(stored, { customLabels: { baru: "x" } });
    expect(Object.keys(out.customLabels)).toHaveLength(MAX_CUSTOM_LABELS);
    expect(out.customLabels.s0).toBe("v");
    expect(out.customLabels.baru).toBeUndefined();
  });
});
