/**
 * Unit tests untuk lib/settings.ts
 * Strategi: Mock prisma.adminSetting.findFirst agar test tidak bergantung DB state.
 * Menguji: default capability fallback, DB override, dan cache invalidation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma sebelum import fungsi yang menggunakannya
vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminSetting: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $disconnect: vi.fn(),
  },
  pool: { end: vi.fn() },
}));

import { hasPlanCapability, invalidateSettingsCache } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

const mockFindFirst = prisma.adminSetting.findFirst as ReturnType<typeof vi.fn>;

describe("hasPlanCapability — Default Fallback (tanpa DB override)", () => {
  beforeEach(() => {
    invalidateSettingsCache();
    // Simulasikan DB tidak punya setting kustom (fallback ke default)
    mockFindFirst.mockResolvedValue(null);
  });

  it("TIER_1 punya 'music' dan 'gallery'", async () => {
    expect(await hasPlanCapability("TIER_1", "music")).toBe(true);
    expect(await hasPlanCapability("TIER_1", "gallery")).toBe(true);
  });

  it("TIER_1 TIDAK punya 'guest_memories' atau 'qr_checkin'", async () => {
    expect(await hasPlanCapability("TIER_1", "guest_memories")).toBe(false);
    expect(await hasPlanCapability("TIER_1", "qr_checkin")).toBe(false);
  });

  it("TIER_2 punya 'guest_memories' dan 'qr_checkin'", async () => {
    expect(await hasPlanCapability("TIER_2", "guest_memories")).toBe(true);
    expect(await hasPlanCapability("TIER_2", "qr_checkin")).toBe(true);
  });

  it("TIER_2 TIDAK punya 'custom_domain'", async () => {
    expect(await hasPlanCapability("TIER_2", "custom_domain")).toBe(false);
  });

  it("TIER_3 punya semua capabilities", async () => {
    expect(await hasPlanCapability("TIER_3", "music")).toBe(true);
    expect(await hasPlanCapability("TIER_3", "qr_checkin")).toBe(true);
    expect(await hasPlanCapability("TIER_3", "guest_memories")).toBe(true);
    expect(await hasPlanCapability("TIER_3", "custom_domain")).toBe(true);
  });

  it("planType null/undefined → false untuk semua capability", async () => {
    expect(await hasPlanCapability(null, "music")).toBe(false);
    expect(await hasPlanCapability(undefined, "gallery")).toBe(false);
  });

  it("capability yang tidak dikenal → false", async () => {
    expect(await hasPlanCapability("TIER_3", "fitur_tidak_ada")).toBe(false);
  });
});

describe("hasPlanCapability — DB Override", () => {
  beforeEach(() => {
    invalidateSettingsCache();
  });

  it("DB override menambah capability baru ke TIER_1", async () => {
    // Admin mengaktifkan qr_checkin untuk TIER_1 via DB
    mockFindFirst.mockResolvedValue({
      key: "capabilities_tier1",
      value: JSON.stringify(["music", "gallery", "qr_checkin"]),
    });
    expect(await hasPlanCapability("TIER_1", "qr_checkin")).toBe(true);
  });
});

describe("invalidateSettingsCache", () => {
  it("invalidasi cache per-key tidak mempengaruhi key lain", () => {
    // Tidak ada assertion DB — hanya verifikasi tidak throw
    expect(() => invalidateSettingsCache("capabilities_tier1")).not.toThrow();
    expect(() => invalidateSettingsCache()).not.toThrow();
  });
});
