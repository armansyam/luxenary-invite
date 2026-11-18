/**
 * Simpan Studio Demo (18 Nov 2026): unggahan slot dengan deferPublish=1 hanya menyimpan berkas dan membersihkan URL
 * berkas itu; demo dikompilasi dan katalog/halaman demo dibersihkan sekali oleh demo-data di akhir simpan. Sebelumnya
 * setiap slot mengompilasi demo dan purge seluruh zona Cloudflare.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })),
}));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: true })), purgeThemeEdgeCache: vi.fn(async () => ({ success: true })) }));
vi.mock("@/lib/demoPublisher", () => ({ compileAndSaveStaticDemo: vi.fn(async () => "") }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { purgeCloudflareCache, purgeThemeEdgeCache } from "@/lib/cloudflare";
import { compileAndSaveStaticDemo } from "@/lib/demoPublisher";
import { POST as demoAssetPost, DELETE as demoAssetDelete } from "@/app/api/admin/themes/[id]/demo-asset/route";
import { POST as demoDataPost } from "@/app/api/admin/themes/[id]/demo-data/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const THEME = "sinergi";
const KEY = `theme_demo_${THEME}`;
const uploadsDemo = path.join(process.cwd(), "public", "uploads", "demo", THEME);
const params = { params: Promise.resolve({ id: THEME }) };
let original: string | null = null;

const upload = async (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 200, g: 20, b: 20 } } }).png().toBuffer();
  fd.append("file", new File([new Uint8Array(png)], "foto.png", { type: "image/png" }));
  return demoAssetPost(new Request(`http://localhost/api/admin/themes/${THEME}/demo-asset`, { method: "POST", body: fd }), params);
};

beforeAll(async () => {
  if (IS_TEST_DB) original = (await prisma.adminSetting.findUnique({ where: { key: KEY } }))?.value ?? null;
});
beforeEach(() => vi.clearAllMocks());
afterAll(async () => {
  if (IS_TEST_DB) {
    fs.rmSync(uploadsDemo, { recursive: true, force: true });
    if (original === null) await prisma.adminSetting.deleteMany({ where: { key: KEY } });
    else await prisma.adminSetting.update({ where: { key: KEY }, data: { value: original } });
  }
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("simpan Studio Demo", () => {
  it("slot dengan deferPublish tidak mengompilasi demo dan hanya membersihkan URL berkasnya", async () => {
    const res = await upload({ slot: "gallery_01", deferPublish: "1" });
    expect(res.status).toBe(200);
    const { rawUrl } = await res.json();
    expect(compileAndSaveStaticDemo).not.toHaveBeenCalled();
    expect(purgeThemeEdgeCache).toHaveBeenCalledWith(THEME, [rawUrl], { pages: false });

    const del = await demoAssetDelete(new Request(`http://localhost/api/admin/themes/${THEME}/demo-asset?slot=gallery_01&deferPublish=1`, { method: "DELETE" }), params);
    expect(del.status).toBe(200);
    expect(compileAndSaveStaticDemo).not.toHaveBeenCalled();
    expect(purgeThemeEdgeCache).not.toHaveBeenCalledWith(THEME);
  });

  it("demo-data di akhir simpan mengompilasi sekali dan membersihkan katalog/halaman demo, tanpa purge seluruh zona", async () => {
    const res = await demoDataPost(new Request(`http://localhost/api/admin/themes/${THEME}/demo-data`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagline: "uji" }) }), params);
    expect(res.status).toBe(200);
    expect(compileAndSaveStaticDemo).toHaveBeenCalledTimes(1);
    expect(purgeThemeEdgeCache).toHaveBeenCalledWith(THEME);
    expect(purgeCloudflareCache).not.toHaveBeenCalled();
  });

  it("unggahan tunggal (logo vendor) tetap mengompilasi demo dan membersihkan halaman", async () => {
    const res = await upload({ slot: "gallery_02" });
    expect(res.status).toBe(200);
    expect(compileAndSaveStaticDemo).toHaveBeenCalledTimes(1);
    expect(purgeThemeEdgeCache).toHaveBeenCalledWith(THEME, [expect.stringContaining("/uploads/demo/")], { pages: true });
  });
});
