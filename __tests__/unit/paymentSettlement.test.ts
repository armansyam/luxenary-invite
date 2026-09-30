import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {}, pool: { end: vi.fn() } }));
vi.mock("@/lib/marketing", () => ({ processOrderPaidMarketing: vi.fn() }));

import { isGatewayAmountValid } from "@/lib/paymentSettlement";

describe("isGatewayAmountValid", () => {
  it("chargedAmount ada: harus sama persis", () => {
    const order = { amount: 500000, chargedAmount: 503500 };
    expect(isGatewayAmountValid(order, 503500)).toBe(true);
    expect(isGatewayAmountValid(order, 500000)).toBe(false);
    expect(isGatewayAmountValid(order, 510000)).toBe(false);
  });

  it("chargedAmount ada dalam bentuk string/Decimal-like", () => {
    expect(isGatewayAmountValid({ amount: "500000.00", chargedAmount: "503500.00" }, 503500)).toBe(true);
  });

  it("chargedAmount null (order lama): minimal sama dengan amount", () => {
    const order = { amount: 500000, chargedAmount: null };
    expect(isGatewayAmountValid(order, 500000)).toBe(true);
    expect(isGatewayAmountValid(order, 503500)).toBe(true);
    expect(isGatewayAmountValid(order, 499999)).toBe(false);
  });

  it("nominal tidak valid ditolak: NaN, nol, negatif", () => {
    const order = { amount: 500000, chargedAmount: 500000 };
    expect(isGatewayAmountValid(order, NaN)).toBe(false);
    expect(isGatewayAmountValid(order, 0)).toBe(false);
    expect(isGatewayAmountValid(order, -500000)).toBe(false);
  });
});
