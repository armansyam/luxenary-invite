import { describe, it, expect } from "vitest";
import { normalizeRsvpStatus } from "@/lib/rsvpStatus";

describe("normalizeRsvpStatus", () => {
  it.each([
    ["hadir", "hadir"],
    ["HADIR", "hadir"],
    [" Hadir ", "hadir"],
    ["tidak", "tidak"],
    ["TIDAK_HADIR", "tidak"],
    ["tidak hadir", "tidak"],
    ["Tidak-Hadir", "tidak"],
    ["ragu", "ragu"],
    ["RAGU", "ragu"],
    ["ragu-ragu", "ragu"],
  ])("%s -> %s", (raw, expected) => {
    expect(normalizeRsvpStatus(raw)).toBe(expected);
  });

  it.each([["APA-SAJA"], [""], ["  "], [null], [undefined], [42], [{}], ["hadirr"]])("%j ditolak", (raw) => {
    expect(normalizeRsvpStatus(raw)).toBeNull();
  });
});
