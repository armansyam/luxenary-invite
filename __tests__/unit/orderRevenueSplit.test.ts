import { describe, expect, it } from "vitest";
import { splitOrderRevenue } from "@/lib/orderRevenueSplit";

describe("splitOrderRevenue", () => {
  it("order tunggal: seluruh omzet masuk jenis order; add-on tanpa paket", () => {
    expect(splitOrderRevenue({ amount: 149000, orderType: "NEW", planType: "TIER_2" })).toEqual([{ kind: "NEW", plan: "TIER_2", amount: 149000 }]);
    expect(splitOrderRevenue({ amount: 35000, orderType: "MEMORIES_TOPUP", planType: "TIER_2" })).toEqual([{ kind: "MEMORIES_TOPUP", plan: null, amount: 35000 }]);
  });

  it("order bundel dibagi proporsional harga item; total bagian = amount order (termasuk setelah diskon)", () => {
    const parts = splitOrderRevenue({
      amount: 90000,
      orderType: "UPGRADE",
      planType: "TIER_1",
      itemsJson: [
        { type: "UPGRADE", label: "Upgrade", price: 50000, targetPlan: "TIER_2" },
        { type: "MEMORIES_TOPUP", label: "Top-up", price: 35000, photos: 100 },
        { type: "GALLERY_EXTENSION", label: "Galeri", price: 15000, months: 1 },
      ],
    });
    expect(parts.map((p) => p.kind)).toEqual(["UPGRADE", "MEMORIES_TOPUP", "GALLERY_EXTENSION"]);
    expect(parts[0]).toMatchObject({ plan: "TIER_2", amount: 45000 });
    expect(parts[1]).toMatchObject({ plan: null, amount: 31500 });
    expect(parts.reduce((s, p) => s + p.amount, 0)).toBe(90000);
  });

  it("item tidak dikenal atau tanpa harga diabaikan; bila tak ada item sah, pakai jenis order", () => {
    expect(splitOrderRevenue({ amount: 50000, orderType: "UPGRADE", planType: "TIER_3", itemsJson: [{ type: "X", price: 1 }] })).toEqual([
      { kind: "UPGRADE", plan: "TIER_3", amount: 50000 },
    ]);
  });
});
