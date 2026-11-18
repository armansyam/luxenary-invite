/**
 * Purge tertarget (18 Nov 2026): simpan di Studio Demo, Theme Builder, dan Editor Varian hanya membersihkan katalog,
 * halaman demo tema itu, dan berkas aset yang ditimpa, di host apex dan www; tidak lagi purge seluruh zona.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { purgeThemeEdgeCache } from "@/lib/cloudflare";

const env = { ...process.env };
let bodies: Array<{ files?: string[]; purge_everything?: boolean }> = [];

beforeEach(() => {
  process.env.CF_ZONE_ID = "zone";
  process.env.CF_API_TOKEN = "token";
  process.env.NEXT_PUBLIC_APP_URL = "https://luxvite.id";
  bodies = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ success: true }));
  }));
});

afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
});

describe("purgeThemeEdgeCache", () => {
  it("membersihkan katalog, halaman demo, dan aset tanpa query di apex dan www", async () => {
    const res = await purgeThemeEdgeCache("wajo", ["/uploads/demo/wajo/cover.webp?t=123"]);
    expect(res.success).toBe(true);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].purge_everything).toBeUndefined();
    expect(bodies[0].files!.sort()).toEqual([
      "https://luxvite.id/api/public/themes",
      "https://luxvite.id/demo/wajo",
      "https://luxvite.id/uploads/demo/wajo/cover.webp",
      "https://www.luxvite.id/api/public/themes",
      "https://www.luxvite.id/demo/wajo",
      "https://www.luxvite.id/uploads/demo/wajo/cover.webp",
    ]);
  });

  it("pages: false hanya membersihkan aset; lebih dari 30 URL dipecah", async () => {
    await purgeThemeEdgeCache("wajo", ["/uploads/demo/wajo/hero.webp"], { pages: false });
    expect(bodies[0].files).toEqual(["https://luxvite.id/uploads/demo/wajo/hero.webp", "https://www.luxvite.id/uploads/demo/wajo/hero.webp"]);
    bodies = [];
    await purgeThemeEdgeCache("wajo", Array.from({ length: 20 }, (_, i) => `/uploads/demo/wajo/gallery_${i}.webp`));
    expect(bodies.map((b) => b.files!.length)).toEqual([30, 14]);
  });

  it("tanpa URL https tidak menghubungi Cloudflare", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const res = await purgeThemeEdgeCache("wajo");
    expect(res.skipped).toBe(true);
    expect(bodies).toHaveLength(0);
  });
});
