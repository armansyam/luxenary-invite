/**
 * Thumbnail katalog otomatis: rute admin hanya mengantrekan tema aktif, dan status dibaca dari penanda antrean di
 * `data/theme-thumbnails/` (hanya di database `luxenary_test`). Worker Chrome-nya diuji lewat build produksi lokal.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma } from "@/lib/prisma";
import { requestThemeThumbnails, themeThumbnailStatus, THUMBNAIL_JOB_DIR } from "@/lib/themeThumbnailJob";
import { GET, POST } from "@/app/api/admin/themes/[id]/thumbnails/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const ACTIVE = `vitest-thumb-on-${Date.now()}`;
const INACTIVE = `vitest-thumb-off-${Date.now()}`;
const marker = (id: string, ext: string) => path.join(THUMBNAIL_JOB_DIR, `${id}.${ext}`);
const call = (fn: typeof GET, id: string) => fn(new Request("http://x"), { params: Promise.resolve({ id }) });

describe.skipIf(!IS_TEST_DB)("thumbnail katalog otomatis", () => {
  beforeAll(async () => {
    await prisma.theme.createMany({
      data: [
        { id: ACTIVE, name: "Vitest Thumb On", category: "modern", isActive: true },
        { id: INACTIVE, name: "Vitest Thumb Off", category: "modern", isActive: false },
      ],
    });
    fs.mkdirSync(THUMBNAIL_JOB_DIR, { recursive: true });
  });

  beforeEach(() => {
    vi.mocked(requestThemeThumbnails).mockClear();
    sessionUser = { id: "vitest_admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
  });

  afterAll(async () => {
    await prisma.theme.deleteMany({ where: { id: { in: [ACTIVE, INACTIVE] } } });
    for (const id of [ACTIVE, INACTIVE]) for (const ext of ["queued", "running", "json"]) fs.rmSync(marker(id, ext), { force: true });
  });

  it("POST mengantrekan tema aktif; tema nonaktif 409, tidak ada 404, ID tidak sah 400, tanpa sesi 401", async () => {
    expect((await call(POST, ACTIVE)).status).toBe(202);
    expect(vi.mocked(requestThemeThumbnails)).toHaveBeenCalledWith(ACTIVE);

    const off = await call(POST, INACTIVE);
    expect(off.status).toBe(409);
    expect((await off.json()).error).toMatch(/Terbitkan tema/);
    expect((await call(POST, "vitest-tidak-ada")).status).toBe(404);
    expect((await call(POST, "..%2Fetc")).status).toBe(400);
    expect(vi.mocked(requestThemeThumbnails)).toHaveBeenCalledTimes(1);

    sessionUser = null;
    expect((await call(POST, ACTIVE)).status).toBe(401);
  });

  it("status mengikuti penanda: running mengalahkan queued, hasil json menjadi done/failed", async () => {
    expect(themeThumbnailStatus(ACTIVE)).toEqual({ state: "idle" });

    fs.writeFileSync(marker(ACTIVE, "json"), JSON.stringify({ ok: false, finishedAt: "2026-11-04T06:00:00.000Z", error: "Chrome tidak ditemukan" }));
    expect(themeThumbnailStatus(ACTIVE)).toEqual({ state: "failed", finishedAt: "2026-11-04T06:00:00.000Z", error: "Chrome tidak ditemukan" });

    fs.writeFileSync(marker(ACTIVE, "queued"), "x");
    expect(themeThumbnailStatus(ACTIVE).state).toBe("queued");
    fs.writeFileSync(marker(ACTIVE, "running"), "x");
    const res = await call(GET, ACTIVE);
    expect(await res.json()).toEqual({ state: "running" });

    fs.rmSync(marker(ACTIVE, "queued"));
    fs.rmSync(marker(ACTIVE, "running"));
    fs.writeFileSync(marker(ACTIVE, "json"), JSON.stringify({ ok: true, finishedAt: "2026-11-04T06:01:00.000Z" }));
    expect(themeThumbnailStatus(ACTIVE)).toEqual({ state: "done", finishedAt: "2026-11-04T06:01:00.000Z", error: undefined });
    expect(themeThumbnailStatus("../x")).toEqual({ state: "idle" });
  });
});
