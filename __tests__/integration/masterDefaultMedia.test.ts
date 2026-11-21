/**
 * Editor Master: panel "Media bawaan slot" (18 Nov 2026). Theme.defaultMedia master tulisan tangan dimuat dan disimpan
 * bersama suntingan master, divalidasi `validateThemeDefaultMedia` (hanya slot milik tema, hanya path milik tema), dan
 * GET mengembalikan bawaan desain master (`themeArtPreviews`) untuk thumbnail. Database luxenary_test; Wajo dikembalikan.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeThemeEdgeCache: vi.fn(async () => ({ success: false, skipped: true })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/themeThumbnailJob", () => ({ requestThemeThumbnails: vi.fn() }));
vi.mock("@/lib/demoPublisher", () => ({ compileAndSaveStaticDemo: vi.fn(async () => "") }));

import { prisma, pool } from "@/lib/prisma";
import { GET, PUT } from "@/app/api/admin/master-editor/route";
import { clearMasterEditsCache } from "@/lib/masterEdits";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const MASTER = "wajo";
const COVER = "/uploads/theme-assets/abcdefabcdefabcdefabcdef.webp";
let before: { masterOverrides: unknown; defaultMedia: unknown } | null = null;

const req = (method: string, query = "", body?: unknown) =>
  new NextRequest(`http://localhost/api/admin/master-editor${query}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const save = (defaultMedia: unknown) => PUT(req("PUT", "", { masterId: MASTER, overrides: { colors: {}, fonts: {} }, defaultMedia }));

describe.skipIf(!IS_TEST_DB)("media bawaan slot di Editor Master", () => {
  beforeAll(async () => {
    before = await prisma.theme.findUnique({ where: { id: MASTER }, select: { masterOverrides: true, defaultMedia: true } });
  });
  afterAll(async () => {
    if (before) {
      await prisma.theme.update({
        where: { id: MASTER },
        data: { masterOverrides: (before.masterOverrides ?? Prisma.DbNull) as Prisma.InputJsonValue, defaultMedia: (before.defaultMedia ?? Prisma.DbNull) as Prisma.InputJsonValue },
      });
    }
    clearMasterEditsCache();
    await prisma.$disconnect();
    await pool.end();
  });

  it("GET ?id memuat media bawaan dan bawaan desain master (tekstur sampul Wajo)", async () => {
    const res = await GET(req("GET", `?id=${MASTER}`));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.master.defaultMedia).toEqual(expect.any(Object));
    expect(data.master.builtinMedia.LANDING_COVER).toBe("/assets/ornaments/background/bg-maroon.webp");
  });

  it("simpan master menyimpan media bawaan yang sah dan mengosongkannya kembali", async () => {
    expect((await save({ LANDING_COVER: COVER })).status).toBe(200);
    expect((await prisma.theme.findUnique({ where: { id: MASTER }, select: { defaultMedia: true } }))?.defaultMedia).toEqual({ LANDING_COVER: COVER });
    expect((await save({})).status).toBe(200);
    expect((await prisma.theme.findUnique({ where: { id: MASTER }, select: { defaultMedia: true } }))?.defaultMedia).toBeNull();
  });

  it("menolak slot foto personal dan path di luar aset tema", async () => {
    const personal = await save({ GROOM_PHOTO: COVER });
    expect(personal.status).toBe(400);
    expect((await personal.json()).error).toContain("GROOM_PHOTO");
    const demoPath = await save({ LANDING_COVER: "/demo/wajo/cover.webp" });
    expect(demoPath.status).toBe(400);
  });

  it("simpan tanpa kolom defaultMedia tidak menyentuh media bawaan", async () => {
    await save({ CLOSING_COVER: COVER });
    expect((await PUT(req("PUT", "", { masterId: MASTER, overrides: { colors: {}, fonts: {} } }))).status).toBe(200);
    expect((await prisma.theme.findUnique({ where: { id: MASTER }, select: { defaultMedia: true } }))?.defaultMedia).toEqual({ CLOSING_COVER: COVER });
  });
});
