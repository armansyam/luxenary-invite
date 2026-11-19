import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  invitationLookupCache,
  renderVersionCache,
  portfolioHtmlCache,
  portfolioListCache,
  portfolioExistsCache,
  invalidateInvitationLookup,
  invalidatePortfolioCache,
} from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { currentRenderVersion, bumpRenderVersion } from "@/lib/renderVersion";
import { purgePortfolioEdgeCache } from "@/lib/cloudflare";

describe("High-Traffic L1 Caches (lib/cache.ts)", () => {
  beforeEach(() => {
    invitationLookupCache.clear();
    renderVersionCache.clear();
    portfolioHtmlCache.clear();
    portfolioListCache.clear();
    portfolioExistsCache.clear();
  });

  it("invalidateInvitationLookup menghapus slug, subdomain, dan visit-inv sekaligus", () => {
    invitationLookupCache.set("slug:raka-dina", { id: "inv-1" });
    invitationLookupCache.set("subdomain:raka", { id: "inv-1" });
    invitationLookupCache.set("visit-inv:inv-1", { status: "PUBLISHED", userId: "u-1" });
    invitationLookupCache.set("visit-inv:inv-2", { status: "PUBLISHED", userId: "u-2" });

    invalidateInvitationLookup("raka-dina", "raka", "inv-1");

    expect(invitationLookupCache.get("slug:raka-dina")).toBeNull();
    expect(invitationLookupCache.get("subdomain:raka")).toBeNull();
    expect(invitationLookupCache.get("visit-inv:inv-1")).toBeNull();
    // Undangan lain tetap terjaga di cache
    expect(invitationLookupCache.get("visit-inv:inv-2")).toEqual({ status: "PUBLISHED", userId: "u-2" });
  });

  it("invalidatePortfolioCache menghapus daftar portofolio serta slug target tanpa menghapus slug lain", () => {
    portfolioListCache.set("all", [{ id: "a" }, { id: "b" }]);
    portfolioHtmlCache.set("a", "<html>A</html>");
    portfolioHtmlCache.set("b", "<html>B</html>");
    portfolioExistsCache.set("a", true);
    portfolioExistsCache.set("b", true);

    invalidatePortfolioCache("a");

    expect(portfolioListCache.get("all")).toBeNull();
    expect(portfolioHtmlCache.get("a")).toBeNull();
    expect(portfolioExistsCache.get("a")).toBeNull();
    expect(portfolioHtmlCache.get("b")).toBe("<html>B</html>");
    expect(portfolioExistsCache.get("b")).toBe(true);
  });

  it("renderVersionCache menyimpan angka versi dan mendukung penyimpanan nilai 0", () => {
    renderVersionCache.set("published:inv-zero", 0);
    expect(renderVersionCache.get("published:inv-zero")).toBe(0);
    renderVersionCache.set("published:inv-zero", 3);
    expect(renderVersionCache.get("published:inv-zero")).toBe(3);
  });

  it("currentRenderVersion hanya memanggil DB sekali dalam masa TTL dan bumpRenderVersion write-through ke cache", async () => {
    const findSpy = vi.spyOn(prisma.renderVersion, "findUnique").mockResolvedValueOnce({ version: 7 } as any);
    const execSpy = vi.spyOn(prisma, "$queryRaw").mockResolvedValueOnce([{ version: 8 }] as any);

    try {
      expect(await currentRenderVersion("published:inv-cache-test")).toBe(7);
      expect(await currentRenderVersion("published:inv-cache-test")).toBe(7);
      expect(await currentRenderVersion("published:inv-cache-test")).toBe(7);
      expect(findSpy).toHaveBeenCalledTimes(1);

      expect(await bumpRenderVersion("published:inv-cache-test")).toBe(8);
      expect(await currentRenderVersion("published:inv-cache-test")).toBe(8);
      expect(findSpy).toHaveBeenCalledTimes(1);
      expect(execSpy).toHaveBeenCalledTimes(1);
    } finally {
      findSpy.mockRestore();
      execSpy.mockRestore();
    }
  });

  it("purgePortfolioEdgeCache membangun URL apex dan www untuk /portfolio dan /portfolio/<slug>", async () => {
    const prevUrl = process.env.NEXT_PUBLIC_APP_URL;
    const prevZone = process.env.CF_ZONE_ID;
    const prevToken = process.env.CF_API_TOKEN;
    process.env.NEXT_PUBLIC_APP_URL = "https://luxvite.id";
    process.env.CF_ZONE_ID = "zone-test";
    process.env.CF_API_TOKEN = "token-test";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    try {
      const res = await purgePortfolioEdgeCache("raka-dina");
      expect(res.success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body));
      expect(body.files).toEqual([
        "https://luxvite.id/portfolio",
        "https://luxvite.id/portfolio/raka-dina",
        "https://www.luxvite.id/portfolio",
        "https://www.luxvite.id/portfolio/raka-dina",
      ]);
    } finally {
      fetchSpy.mockRestore();
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = prevUrl;
      if (prevZone === undefined) delete process.env.CF_ZONE_ID; else process.env.CF_ZONE_ID = prevZone;
      if (prevToken === undefined) delete process.env.CF_API_TOKEN; else process.env.CF_API_TOKEN = prevToken;
    }
  });
});
