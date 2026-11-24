/**
 * /demo/<tema> untuk tema nonaktif hanya untuk admin, dan hanya di URL ?admin_preview=1 yang diberi sandbox CSP oleh proxy:
 * tema draf bisa ditulis agen MCP (luxvite_create_draft_theme), jadi skripnya tidak boleh berjalan di origin luxvite.id
 * dengan cookie sesi admin.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

let currentSession: unknown = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => currentSession) }));
vi.mock("@/lib/demoPublisher", () => ({
  serveStaticDemo: vi.fn(async () => "<!DOCTYPE html><html><head></head><body><main>demo</main></body></html>"),
}));

import { prisma } from "@/lib/prisma";
import { GET } from "@/app/demo/[theme]/route";

const RUN = Date.now();
const DRAFT_ID = `vitest-preview-draft-${RUN}`;
const ACTIVE_ID = `vitest-preview-active-${RUN}`;
const admin = { user: { id: "admin-preview", email: "admin@t.local", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } };

const get = (id: string, search = "") => GET(new Request(`http://x/demo/${id}${search}`), { params: Promise.resolve({ theme: id }) });

describe("preview admin tema nonaktif di /demo", () => {
  beforeAll(async () => {
    await prisma.theme.createMany({
      data: [
        { id: DRAFT_ID, name: "Draf Preview", category: "modern", series: "DRAFT_REVIEW", eventType: "WEDDING", isActive: false, sortOrder: 9998 },
        { id: ACTIVE_ID, name: "Aktif Preview", category: "modern", series: "Modern", eventType: "WEDDING", isActive: true, sortOrder: 9999 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.theme.deleteMany({ where: { id: { in: [DRAFT_ID, ACTIVE_ID] } } });
  });

  beforeEach(() => {
    currentSession = null;
  });

  it("tanpa sesi admin tema nonaktif tetap 404, dengan atau tanpa penanda", async () => {
    expect((await get(DRAFT_ID)).status).toBe(404);
    expect((await get(DRAFT_ID, "?admin_preview=1")).status).toBe(404);
  });

  it("admin tanpa penanda admin_preview dialihkan ke URL bertanda (yang diberi sandbox oleh proxy)", async () => {
    currentSession = admin;
    const res = await get(DRAFT_ID);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`/demo/${DRAFT_ID}?admin_preview=1`);
    expect(await res.text()).toBe("");
  });

  it("admin dengan penanda melihat draf dengan banner tanpa emoji", async () => {
    currentSession = admin;
    const res = await get(`${DRAFT_ID}`, "?admin_preview=1");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="luxvite-admin-draft-banner"');
    expect(html).toContain("DRAFT THEMES");
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it("tema aktif disajikan langsung tanpa pengalihan dan tanpa banner admin", async () => {
    currentSession = admin;
    const res = await get(ACTIVE_ID);
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain("luxvite-admin-draft-banner");
  });
});
