import { describe, it, expect, beforeAll } from "vitest";
import {
  CLIENT_ACTIVATION_TTL_HOURS,
  CLIENT_ACTIVATION_TTL_MS,
  MIN_PAYABLE_AMOUNT_IDR,
  buildPartnerWhatsAppDeepLink,
  buildPartnerWhatsAppInviteText,
  calculatePartnerWholesaleDiscount,
  formatPartnerPromoLabel,
  generateActivationToken,
  hashActivationToken,
  maskEmailAddress,
  normalizeIndonesianWhatsApp,
} from "@/lib/clientActivation";
import { buildClientActivationEmailHtml, EMAIL_TEMPLATE_CATALOG } from "@/lib/email-templates";

beforeAll(() => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret-for-unit-tests-only";
});

describe("clientActivation utilities", () => {
  it("uses a strict 48-hour activation TTL", () => {
    expect(CLIENT_ACTIVATION_TTL_HOURS).toBe(48);
    expect(CLIENT_ACTIVATION_TTL_MS).toBe(48 * 60 * 60 * 1000);
  });

  it("generates cryptographically unique base64url tokens", () => {
    const t1 = generateActivationToken();
    const t2 = generateActivationToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(40);
    expect(t1).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes tokens deterministically with HMAC-SHA256", () => {
    const token = generateActivationToken();
    const h1 = hashActivationToken(token);
    const h2 = hashActivationToken(`  ${token}  `);
    const h3 = hashActivationToken(`${token}x`);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("masks email addresses without exposing full local part", () => {
    expect(maskEmailAddress("nadia.bagas@gmail.com")).toBe("na***s@gmail.com");
    expect(maskEmailAddress("ab@domain.id")).toBe("a***@domain.id");
    expect(maskEmailAddress("invalid-email")).toBe("***");
  });

  it("calculates upfront partner wholesale percentage & nominal discounts safely", () => {
    // 20% dari Rp 149.000 = Rp 29.800
    expect(
      calculatePartnerWholesaleDiscount(149000, {
        commissionType: "PERCENT",
        commissionValue: 20,
        isActive: true,
      }),
    ).toBe(29800);

    // Prisma Decimal-like object support
    expect(
      calculatePartnerWholesaleDiscount(249000, {
        commissionType: "PERCENT",
        commissionValue: { toNumber: () => 15 },
        isActive: true,
      }),
    ).toBe(37350);

    // Nominal discount
    expect(
      calculatePartnerWholesaleDiscount(149000, {
        commissionType: "NOMINAL",
        commissionValue: 25000,
        isActive: true,
      }),
    ).toBe(25000);

    // Inactive partner => 0
    expect(
      calculatePartnerWholesaleDiscount(149000, {
        commissionType: "PERCENT",
        commissionValue: 20,
        isActive: false,
      }),
    ).toBe(0);

    // Floor protection: never drops net bill below MIN_PAYABLE_AMOUNT_IDR
    expect(
      calculatePartnerWholesaleDiscount(50000, {
        commissionType: "NOMINAL",
        commissionValue: 90000,
        isActive: true,
      }),
    ).toBe(50000 - MIN_PAYABLE_AMOUNT_IDR);
  });

  it("formats partner promo label cleanly", () => {
    expect(formatPartnerPromoLabel("WO Berkah Abadi")).toBe("MITRA: WO Berkah Abadi");
  });

  it("builds WhatsApp invite text and deep link without coupon code clutter", () => {
    const url = "https://luxvite.id/auth/set-password?token=abc123";
    const text = buildPartnerWhatsAppInviteText({
      clientName: "Nadia & Bagas",
      partnerName: "WO Berkah Abadi",
      activationUrl: url,
      platformName: "Luxvite",
    });

    expect(text).toContain("Nadia & Bagas");
    expect(text).toContain("WO Berkah Abadi");
    expect(text).toContain(url);
    expect(text).toContain("48 jam");
    expect(text.toLowerCase()).not.toContain("kupon");

    expect(normalizeIndonesianWhatsApp("0812-3456-7890")).toBe("6281234567890");
    expect(buildPartnerWhatsAppDeepLink("0812-3456-7890", text)).toMatch(
      /^https:\/\/wa\.me\/6281234567890\?text=/,
    );
    expect(buildPartnerWhatsAppDeepLink(null, text)).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it("renders co-branded client activation email template safely and registers it in catalog", () => {
    const rendered = buildClientActivationEmailHtml(
      {
        recipientEmail: "nadia@example.com",
        clientName: "Nadia <script>alert(1)</script>",
        partnerName: "WO Berkah Abadi",
        activationUrl: "https://luxvite.id/auth/set-password?token=xyz987",
        expiresHours: 48,
      },
      { platformName: "Luxvite" },
    );

    expect(rendered.subject).toContain("WO Berkah Abadi");
    expect(rendered.subject).toContain("Luxvite");
    expect(rendered.html).toContain("https://luxvite.id/auth/set-password?token=xyz987");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.text).toContain("48 jam");

    const catalogEntry = EMAIL_TEMPLATE_CATALOG.find((t) => t.key === "PARTNER_CLIENT_ACTIVATION");
    expect(catalogEntry).toBeDefined();
  });
});
