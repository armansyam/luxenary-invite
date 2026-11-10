/**
 * Editor Master (/api/admin/theme-variants mode master): suntingan master tulisan tangan disimpan di masterOverrides
 * baris master itu sendiri, diterapkan saat render di bawah override varian, membeku di piring undangan, dan tidak
 * pernah menulis berkas master. Database luxenary_test; master Badrika dikembalikan ke aslinya di akhir.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/themeThumbnailJob", () => ({ requestThemeThumbnails: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { GET, POST, PUT } from "@/app/api/admin/theme-variants/route";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { clearVariantCache, masterTokens } from "@/lib/themeVariants";
import { masterImageRefs, masterSections } from "@/lib/themeVariantCss";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = Date.now();
const MASTER = "badrika";
const VARIANT_ID = `vitest-master-edit-varian-${TAG}`;
const DRAFT_ID = `vitest-master-edit-${TAG}`;
const masterPath = path.join(process.cwd(), "themes/wedding/modern/badrika.html");
const masterBefore = fs.readFileSync(masterPath, "utf-8");
const image = masterImageRefs(masterBefore)[0]?.path;
const section = masterSections(masterBefore).find((s) => s !== "home");
const color = masterTokens(masterBefore).colors.find((t) => t.name.startsWith("--lux-c-"))!;
const REPLACEMENT = "/uploads/theme-assets/abcdefabcdefabcdefabcdef.webp";

const req = (method: string, query = "", body?: unknown) =>
  new NextRequest(`http://localhost/api/admin/theme-variants${query}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

async function renderMaster(themeId: string, invitationId?: string): Promise<string> {
  const data = (await composeInvitationData(buildDemoInvitation(MASTER, undefined, "WEDDING"))) as Record<string, any>;
  return renderTemplateFile(themeId, data, { eventType: "WEDDING", ...(invitationId ? { invitationId } : {}) });
}

describe.skipIf(!IS_TEST_DB)("Editor Master", () => {
  afterAll(async () => {
    await prisma.theme.update({ where: { id: MASTER }, data: { masterOverrides: Prisma.DbNull } });
    await prisma.theme.deleteMany({ where: { id: VARIANT_ID } });
    fs.rmSync(path.join(process.cwd(), "data", "drafts", `${DRAFT_ID}.html`), { force: true });
    clearVariantCache();
    await prisma.$disconnect();
    await pool.end();
  });

  it("master contoh punya gambar bawaan dan seksi ber-id", () => {
    expect(image).toMatch(/^\/assets\//);
    expect(section).toBeTruthy();
  });

  it("GET ?master mengembalikan token, gambar, seksi, dan suntingan kosong", async () => {
    const res = await GET(req("GET", `?master=${MASTER}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.master).toMatchObject({ id: MASTER, overrides: { colors: {}, fonts: {} } });
    expect(data.images.map((i: { path: string }) => i.path)).toContain(image);
    expect(data.sections).toContain(section);
  });

  it("suntingan tidak sah ditolak", async () => {
    const bad = [
      { images: { "/assets/tidak/ada.webp": REPLACEMENT } },
      { images: { [image]: "https://contoh.com/a.webp" } },
      { hiddenSections: ["bukan-seksi-master"] },
      { css: ".a { color: #ff0000; }" },
    ];
    for (const overrides of bad) {
      const res = await PUT(req("PUT", "", { masterId: MASTER, overrides: { colors: {}, fonts: {}, ...overrides } }));
      expect(res.status).toBe(400);
    }
  });

  it("simpan suntingan: render memakai gambar pengganti, seksi tersembunyi, CSS, dan warna; berkas master tidak berubah", async () => {
    const before = await renderMaster(MASTER, DRAFT_ID);
    expect(before).not.toContain(REPLACEMENT);

    const overrides = { colors: { [color.name]: "#123456" }, fonts: {}, images: { [image]: REPLACEMENT }, hiddenSections: [section], css: ".vitest-master-edit { letter-spacing: 1px; }" };
    const res = await PUT(req("PUT", "", { masterId: MASTER, overrides }));
    expect(res.status).toBe(200);
    expect((await res.json()).count).toBe(4);
    const row = await prisma.theme.findUniqueOrThrow({ where: { id: MASTER } });
    expect(row.masterOverrides).toEqual(overrides);

    const html = await renderMaster(MASTER);
    expect(html).toContain(REPLACEMENT);
    expect(html).not.toContain(image);
    expect(html).toContain('<style id="lux-master-edits">');
    expect(html).toContain(`#${section}, a[href="#${section}"] { display: none !important; }`);
    expect(html).toContain(".vitest-master-edit { letter-spacing: 1px; }");
    expect(html).toContain(`${color.name}: #123456;`);
    expect(fs.readFileSync(masterPath, "utf-8")).toBe(masterBefore);

    // Undangan yang dirender sebelum suntingan tetap memakai piring bekunya.
    expect(await renderMaster(MASTER, DRAFT_ID)).not.toContain(REPLACEMENT);
  });

  it("varian mewarisi suntingan master; varian sendiri hanya boleh warna dan huruf", async () => {
    expect((await POST(req("POST", "", { parentId: MASTER, name: `Vitest Master Edit Varian ${TAG}`, overrides: { colors: {}, fonts: {}, hiddenSections: [section] } }))).status).toBe(400);
    const created = await POST(req("POST", "", { parentId: MASTER, name: `Vitest Master Edit Varian ${TAG}`, overrides: { colors: { [color.name]: "#abcdef" }, fonts: {} } }));
    expect(created.status).toBe(200);
    expect((await created.json()).id).toBe(VARIANT_ID);

    const html = await renderMaster(VARIANT_ID);
    expect(html).toContain(REPLACEMENT);
    const edits = html.indexOf('<style id="lux-master-edits">');
    const variant = html.indexOf('<style id="lux-master-overrides">');
    expect(edits).toBeGreaterThan(-1);
    expect(variant).toBeGreaterThan(edits);
    expect(html.slice(variant)).toContain(`${color.name}: #abcdef;`);

    const preview = await POST(req("POST", "?preview", { parentId: MASTER, overrides: { colors: {}, fonts: {} } }));
    expect((await preview.json()).html).toContain(REPLACEMENT);
  });

  it("menyimpan suntingan kosong mengembalikan master ke aslinya", async () => {
    const res = await PUT(req("PUT", "", { masterId: MASTER, overrides: { colors: {}, fonts: {} } }));
    expect(res.status).toBe(200);
    expect((await prisma.theme.findUniqueOrThrow({ where: { id: MASTER } })).masterOverrides).toBeNull();
    const html = await renderMaster(MASTER);
    expect(html).toContain(image);
    expect(html).not.toContain("lux-master-edits");
  });
});
