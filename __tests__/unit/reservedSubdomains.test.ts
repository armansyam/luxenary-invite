import { describe, it, expect } from "vitest";
import { isReservedSubdomain } from "@/lib/domainUtils";

describe("subdomain terlarang", () => {
  it.each(["secure", "bayar", "payment", "billing", "account", "verify", "official", "wa", "whatsapp", "help"])(
    "menolak nama berisiko phishing: %s",
    (name) => {
      expect(isReservedSubdomain(name)).toBe(true);
      expect(isReservedSubdomain(name.toUpperCase())).toBe(true);
    }
  );

  it("nama pasangan biasa tetap boleh", () => {
    expect(isReservedSubdomain("andi-siti")).toBe(false);
    expect(isReservedSubdomain("secure-andi")).toBe(false);
  });
});
