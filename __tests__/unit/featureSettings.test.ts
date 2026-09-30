import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { parseFeatureSettings } from "@/lib/featureSettings";
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
