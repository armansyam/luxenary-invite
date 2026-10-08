import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { parseFeatureSettings, keepValidMemoriesSettings } from "@/lib/featureSettings";
import { logger } from "@/lib/logger";

describe("parseFeatureSettings", () => {
  it("NULL dan undefined menjadi objek kosong (typeof null === 'object' tidak boleh lolos)", () => {
    expect(parseFeatureSettings(null)).toEqual({});
    expect(parseFeatureSettings(undefined)).toEqual({});
  });

  it("string kosong atau hanya spasi menjadi objek kosong", () => {
    expect(parseFeatureSettings("")).toEqual({});
    expect(parseFeatureSettings("   ")).toEqual({});
  });

  it("string JSON objek di-parse", () => {
    expect(parseFeatureSettings('{"showGuestMemories":false}')).toEqual({ showGuestMemories: false });
  });

  it("objek yang sudah ter-parse dikembalikan apa adanya", () => {
    const value = { showGallery: true };
    expect(parseFeatureSettings(value)).toBe(value);
  });

  it("JSON yang bukan objek (null, angka, string, array) menjadi objek kosong", () => {
    expect(parseFeatureSettings("null")).toEqual({});
    expect(parseFeatureSettings("42")).toEqual({});
    expect(parseFeatureSettings('"teks"')).toEqual({});
    expect(parseFeatureSettings("[1,2]")).toEqual({});
    expect(parseFeatureSettings([1, 2])).toEqual({});
  });

  it("JSON korup menjadi objek kosong dan dicatat, tidak melempar", () => {
    expect(parseFeatureSettings("{bukan json")).toEqual({});
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe("keepValidMemoriesSettings", () => {
  it("filter dan jatah roll yang sah dipertahankan; jatah berupa string dinormalkan menjadi angka", () => {
    expect(keepValidMemoriesSettings({ memoriesFilter: "cinema_noir", memoriesShotsQuota: "12" }, {})).toEqual({
      memoriesFilter: "cinema_noir",
      memoriesShotsQuota: 12,
    });
  });
  it("nilai tidak sah dikembalikan ke nilai tersimpan sebelumnya", () => {
    const existing = { memoriesFilter: "aura_90s", memoriesShotsQuota: 5 };
    expect(keepValidMemoriesSettings({ memoriesFilter: "filter_palsu", memoriesShotsQuota: 9999 }, existing)).toEqual(existing);
  });
  it("nilai tidak sah tanpa nilai tersimpan yang sah dibuang", () => {
    expect(keepValidMemoriesSettings({ memoriesFilter: 7, memoriesShotsQuota: 0, showGallery: true }, { memoriesShotsQuota: 9999 })).toEqual({ showGallery: true });
  });
  it("pecahan dan nilai di luar 1-30 ditolak", () => {
    expect(keepValidMemoriesSettings({ memoriesShotsQuota: 2.5 }, {})).toEqual({});
    expect(keepValidMemoriesSettings({ memoriesShotsQuota: 31 }, {})).toEqual({});
  });
});
