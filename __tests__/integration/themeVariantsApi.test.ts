/**
 * Rute admin Varian Tema (/api/admin/theme-variants): buat, tolak masukan tidak sah, terbitkan (demo statis), ubah, dan
 * hapus yang diblokir bila varian dipakai undangan. Database luxenary_test; master Valente tidak pernah ditulis.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

const authState: { user: Record<string, unknown> | null } = { user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } };
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (authState.user ? { user: authState.user } : null)) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/themeThumbnailJob", () => ({ requestThemeThumbnails: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { GET, POST, PUT, DELETE } from "@/app/api/admin/theme-variants/route";
import { masterTokens } from "@/lib/themeVariants";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = Date.now();
const NAME = `Vitest Varian ${TAG}`;
const VARIANT_ID = `vitest-varian-${TAG}`;
const masterPath = path.join(process.cwd(), "themes/wedding/minimalist/valente.html");
const masterBefore = fs.readFileSync(masterPath, "utf-8");
const color = masterTokens(masterBefore).colors.find((t) => t.name.startsWith("--lux-c-"))!;

const req = (method: string, query = "", body?: unknown) =>
  new NextRequest(`http://localhost/api/admin/theme-variants${query}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

describe.skipIf(!IS_TEST_DB)("rute admin varian tema", () => {
  const created = { users: [] as string[] };

  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    await prisma.theme.deleteMany({ where: { id: VARIANT_ID } });
    fs.rmSync(path.join(process.cwd(), "public", "demo", VARIANT_ID), { recursive: true, force: true });
    await prisma.$disconnect();
    await pool.end();
  });

  it("tanpa sesi admin ditolak", async () => {
    authState.user = null;
    expect((await GET(req("GET", "?parent=valente"))).status).toBe(401);
    authState.user = { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
  });

  it("token induk tersedia; induk builder/varian/tidak ada ditolak", async () => {
    const res = await GET(req("GET", "?parent=valente"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colorGroups.length).toBeGreaterThan(5);
    expect(data.fonts.some((f: { name: string }) => f.name.startsWith("--lux-font-"))).toBe(true);
    expect((await GET(req("GET", "?parent=tidak-ada"))).status).toBe(404);
  });

  it("membuat varian nonaktif yang menyalin metadata induk; masukan tidak sah ditolak", async () => {
    expect((await POST(req("POST", "", { parentId: "valente", name: NAME, overrides: { colors: { "--bukan-variabel": "#000000" } } }))).status).toBe(400);
    expect((await POST(req("POST", "", { parentId: "valente", name: "", overrides: {} }))).status).toBe(400);
    const res = await POST(req("POST", "", { parentId: "valente", name: NAME, overrides: { colors: { [color.name]: "#123456" }, fonts: {} } }));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(VARIANT_ID);
    const row = await prisma.theme.findUniqueOrThrow({ where: { id: VARIANT_ID } });
    const parent = await prisma.theme.findUniqueOrThrow({ where: { id: "valente" } });
    expect(row).toMatchObject({ parentTheme: "valente", isActive: false, category: parent.category, eventType: parent.eventType });
    expect(row.masterOverrides).toEqual({ colors: { [color.name]: "#123456" }, fonts: {} });
    expect((await POST(req("POST", "", { parentId: "valente", name: NAME, overrides: {} }))).status).toBe(409);
    // Varian tidak bisa menjadi induk varian lain.
    expect((await GET(req("GET", `?parent=${VARIANT_ID}`))).status).toBe(409);
  });

  it("pratinjau memakai override; terbit menulis demo statis; master induk tidak berubah", async () => {
    const preview = await POST(req("POST", "?preview", { parentId: "valente", overrides: { colors: { [color.name]: "#abcdef" } } }));
    expect(preview.status).toBe(200);
    expect((await preview.json()).html).toContain(`${color.name}: #abcdef;`);

    const res = await PUT(req("PUT", "", { id: VARIANT_ID, isActive: true }));
    expect(res.status).toBe(200);
    const demo = fs.readFileSync(path.join(process.cwd(), "public", "demo", VARIANT_ID, "index.html"), "utf-8");
    expect(demo).toContain(`${color.name}: #123456;`);
    expect(fs.readFileSync(masterPath, "utf-8")).toBe(masterBefore);

    const got = await (await GET(req("GET", `?id=${VARIANT_ID}`))).json();
    expect(got.variant).toMatchObject({ id: VARIANT_ID, isActive: true, overrides: { colors: { [color.name]: "#123456" } } });
  });

  it("hapus diblokir saat varian dipakai undangan, lalu berhasil setelah tidak dipakai", async () => {
    const user = await prisma.user.create({ data: { email: `vitest_variant_${TAG}@client.local`, name: "Klien Varian" } });
    created.users.push(user.id);
    const inv = await prisma.invitation.create({ data: { userId: user.id, themeId: VARIANT_ID, invitationSlug: `vitest-variant-${TAG}` } });
    expect((await DELETE(req("DELETE", `?id=${VARIANT_ID}`))).status).toBe(409);
    await prisma.invitation.delete({ where: { id: inv.id } });
    expect((await DELETE(req("DELETE", `?id=${VARIANT_ID}`))).status).toBe(200);
    expect(await prisma.theme.findUnique({ where: { id: VARIANT_ID } })).toBeNull();
    expect(fs.existsSync(path.join(process.cwd(), "public", "demo", VARIANT_ID))).toBe(false);
  });
});
