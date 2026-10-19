import { describe, it, expect } from "vitest";
import { anonymizePortfolioHtml } from "@/lib/portfolioHtml";

const ID = "004bcb9d-9b9e-46fd-8c2e-9b1cf4a74d65";

describe("anonymizePortfolioHtml", () => {
  it("mengganti ID di skrip, formulir, dan QR; ID di path media dibiarkan", () => {
    const html = [
      `<input type="hidden" name="invitationId" value="${ID}">`,
      `const INVITATION_ID = "${ID}";`,
      `var invId = window.__LUX_INVITATION_ID__ || '${ID}';`,
      `src="/api/public/qr?size=160&amp;data=LUX%7C${ID}%7CTamu"`,
      `<img src="/uploads/invitations/${ID}/cover.webp">`,
    ].join("\n");
    const out = anonymizePortfolioHtml(html, { invitationId: ID, slug: "raka-dewi", subdomain: null });
    expect(out).toContain(`value="demo-portfolio-raka-dewi"`);
    expect(out).toContain(`INVITATION_ID = "demo-portfolio-raka-dewi"`);
    expect(out).toContain(`|| 'demo-portfolio-raka-dewi'`);
    expect(out).toContain(`LUX%7Cdemo-portfolio-raka-dewi%7C`);
    expect(out).toContain(`/uploads/invitations/${ID}/cover.webp`);
  });

  it("tautan kamera dan galeri slug maupun subdomain dialihkan ke halaman demo", () => {
    const html = `<a href="/raka-dewi/sharemoment"></a><a href="/raka-dewi/memories"></a><a href="/s/rakadewi/sharemoment"></a><a href="/s/rakadewi/memories"></a>`;
    const out = anonymizePortfolioHtml(html, { invitationId: ID, slug: "raka-dewi", subdomain: "rakadewi" });
    expect(out).toBe(`<a href="/demo/sharemoment"></a><a href="/demo/memories"></a><a href="/demo/sharemoment"></a><a href="/demo/memories"></a>`);
  });
});
