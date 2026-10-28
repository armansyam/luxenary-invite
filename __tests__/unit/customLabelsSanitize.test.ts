/**
 * Label khusus dari klien (Studio menyimpan seluruh objek customLabels lewat PUT undangan): kunci, tipe, panjang, dan
 * jumlah dibatasi dengan galat yang ditampilkan Studio; nilai yang sudah tersimpan selalu lolos.
 */
import { describe, it, expect } from "vitest";
import { MAX_CUSTOM_LABELS, MAX_CUSTOM_LABEL_LENGTH, MAX_DECORATIVE_LABEL_LENGTH, mergeFeatureSettingsInput, validateCustomLabels } from "@/lib/featureSettings";

const errorOf = (r: { ok: true } | { ok: false; error: string }) => (r.ok ? null : r.error);

describe("validateCustomLabels", () => {
  it("tanpa customLabels di input selalu lolos", () => {
    expect(validateCustomLabels({ showMusic: true }, { customLabels: { a: "x" } })).toEqual({ ok: true });
  });

  it("menerima label sah termasuk string kosong dan kunci teks hias", () => {
    expect(validateCustomLabels({ customLabels: { hias1: "Syukuran Keluarga", coverBadge: "", openBtn: "Buka" } }, {})).toEqual({ ok: true });
  });

  it("menolak kunci tidak sah dan nilai bukan teks dengan pesan yang menyebut kuncinya", () => {
    expect(errorOf(validateCustomLabels({ customLabels: { "a.b": "x" } }, {}))).toMatch(/a\.b/);
    expect(errorOf(validateCustomLabels({ customLabels: { "<k>": "x" } }, {}))).toMatch(/tidak dikenali/);
    expect(errorOf(validateCustomLabels({ customLabels: { num: 5 } }, {}))).toMatch(/num/);
    expect(errorOf(validateCustomLabels({ customLabels: { obj: { a: 1 } } }, {}))).toMatch(/teks/);
    expect(errorOf(validateCustomLabels({ customLabels: "x" }, {}))).toMatch(/objek/);
  });

  it("teks hias dibatasi 120 karakter, label lain 1000", () => {
    expect(validateCustomLabels({ customLabels: { hias1: "a".repeat(MAX_DECORATIVE_LABEL_LENGTH) } }, {})).toEqual({ ok: true });
    expect(errorOf(validateCustomLabels({ customLabels: { hias2: "a".repeat(MAX_DECORATIVE_LABEL_LENGTH + 1) } }, {}))).toMatch(/Teks hias maksimal 120 karakter \(sekarang 121\)/);
    expect(validateCustomLabels({ customLabels: { closingQuote: "a".repeat(MAX_CUSTOM_LABEL_LENGTH) } }, {})).toEqual({ ok: true });
    expect(errorOf(validateCustomLabels({ customLabels: { closingQuote: "a".repeat(MAX_CUSTOM_LABEL_LENGTH + 1) } }, {}))).toMatch(/closingQuote maksimal 1000/);
  });

  it("nilai yang sama dengan tersimpan selalu lolos walau melebihi batas atau kuncinya lama", () => {
    const stored = { customLabels: { closingQuote: "x".repeat(MAX_CUSTOM_LABEL_LENGTH + 50), "legacy.key": "v" } };
    expect(validateCustomLabels({ customLabels: { ...stored.customLabels } }, stored)).toEqual({ ok: true });
  });

  it("membatasi jumlah kunci baru tanpa menolak undangan yang sudah melebihi batas", () => {
    const many = Object.fromEntries(Array.from({ length: MAX_CUSTOM_LABELS + 1 }, (_, i) => [`k${i}`, "v"]));
    expect(errorOf(validateCustomLabels({ customLabels: many }, {}))).toMatch(/paling banyak 100/);
    expect(validateCustomLabels({ customLabels: many }, { customLabels: many })).toEqual({ ok: true });
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

  it("tanpa label tersimpan, input sah dipakai apa adanya", async () => {
    expect((await merge({}, { customLabels: { ok: "y" } })).customLabels).toEqual({ ok: "y" });
    expect((await merge({ showMusic: false }, { showMusic: true })).customLabels).toBeUndefined();
  });

  it("label tidak sah menolak seluruh simpan dengan pesan, label tersimpan tidak berubah", async () => {
    const stored = { customLabels: { hias1: "Lama" } };
    const r = await mergeFeatureSettingsInput(stored, { customLabels: { hias1: "x".repeat(MAX_DECORATIVE_LABEL_LENGTH + 5) } }, "TIER_2", false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Teks hias maksimal 120/);
    expect(stored.customLabels.hias1).toBe("Lama");
  });

  it("kunci baru yang melewati batas jumlah ditolak, label tersimpan tidak hilang", async () => {
    const stored = { customLabels: Object.fromEntries(Array.from({ length: MAX_CUSTOM_LABELS }, (_, i) => [`s${i}`, "v"])) };
    const r = await mergeFeatureSettingsInput(stored, { customLabels: { baru: "x" } }, "TIER_2", true);
    expect(r.ok).toBe(false);
    expect((await merge(stored, { customLabels: { s0: "ubah" } })).customLabels.s0).toBe("ubah");
  });
});
