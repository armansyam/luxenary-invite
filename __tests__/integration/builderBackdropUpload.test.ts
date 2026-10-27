/**
 * Unggahan untuk tekstur latar dan media bawaan, serta daftar bingkai berjendela (database `luxenary_test`).
 * Gambar tanpa transparansi masuk pilihan latar, gambar bertransparansi masuk pilihan ornamen, dan daftar bingkai
 * hanya berisi gambar yang punya jendela transparan.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeInvitationEdgeCache: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { GET as assetsGet, POST as assetsPost } from "@/app/api/admin/theme-builder/assets/route";
import { GET as framesGet } from "@/app/api/admin/theme-builder/frame-window/route";
import { POST as builderPost } from "@/app/api/admin/theme-builder/route";
import { THEME_ASSET_DIR, builderMasterPath } from "@/lib/themeBuilder/server";
import { defaultBuilderSpec, isAllowedBackdropSrc, parseBuilderSpec } from "@/lib/themeBuilder/spec";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_backdrop_${Date.now()}`;
process.env.AUTH_SECRET ||= "vitest-backdrop-signing-secret";

async function upload(buffer: Buffer, name: string, type: string) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(buffer)], name, { type }));
  const res = await assetsPost(new NextRequest("http://localhost/api/admin/theme-builder/assets", { method: "POST", body: form }));
  return { status: res.status, body: await res.json() };
}

describe("validasi tekstur dan media bawaan", () => {
  it("menerima gambar bawaan pustaka latar dan unggahan hash, menolak yang lain", () => {
    expect(isAllowedBackdropSrc("")).toBe(true);
    expect(isAllowedBackdropSrc("/assets/ornaments/background/background-cream.webp")).toBe(true);
    expect(isAllowedBackdropSrc("/uploads/theme-assets/0123456789abcdef01234567.webp")).toBe(true);
    expect(isAllowedBackdropSrc("/uploads/theme-assets/../secret.webp")).toBe(false);
    expect(isAllowedBackdropSrc("/uploads/theme-assets/xyz.webp")).toBe(false);
    expect(isAllowedBackdropSrc("https://example.com/a.webp")).toBe(false);

    const base = defaultBuilderSpec();
    const ok = parseBuilderSpec({ ...base, texture: "/uploads/theme-assets/0123456789abcdef01234567.webp", defaultMedia: { LANDING_COVER: "/uploads/theme-assets/0123456789abcdef01234567.webp" } });
    expect(ok.ok).toBe(true);
    const bad = parseBuilderSpec({ ...base, texture: "https://example.com/a.webp" });
    expect(bad.ok).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB)("unggahan latar dan daftar bingkai", () => {
  const created = { admins: [] as string[], files: [] as string[], themeId: "" };

  afterAll(async () => {
    sessionUser = null;
    for (const f of created.files) fs.rmSync(path.join(THEME_ASSET_DIR, f), { force: true });
    if (created.themeId) {
      const theme = await prisma.theme.findUnique({ where: { id: created.themeId }, select: { category: true } });
      await prisma.theme.deleteMany({ where: { id: created.themeId } });
      if (theme) fs.rmSync(builderMasterPath(theme.category as "modern", created.themeId), { force: true });
    }
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("JPEG tanpa transparansi diterima dan ditandai opaque; PNG bertransparansi tidak", async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    created.admins.push(admin.id);
    sessionUser = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };

    const jpeg = await sharp({ create: { width: 120, height: 160, channels: 3, background: "#8a6d3b" } }).jpeg().toBuffer();
    const bg = await upload(jpeg, "latar.jpg", "image/jpeg");
    expect(bg.status).toBe(200);
    expect(bg.body.opaque).toBe(true);
    created.files.push(path.basename(bg.body.url));

    const png = await sharp({ create: { width: 120, height: 160, channels: 4, background: { r: 200, g: 50, b: 50, alpha: 0.5 } } }).png().toBuffer();
    const orn = await upload(png, "ornamen.png", "image/png");
    expect(orn.status).toBe(200);
    expect(orn.body.opaque).toBe(false);
    created.files.push(path.basename(orn.body.url));

    const list = (await (await assetsGet()).json()) as { uploads: Array<{ url: string; opaque: boolean }> };
    expect(list.uploads.find((u) => u.url === bg.body.url)?.opaque).toBe(true);
    expect(list.uploads.find((u) => u.url === orn.body.url)?.opaque).toBe(false);

    const gif = await upload(Buffer.from("GIF89a-bukan-gambar-valid"), "x.gif", "image/gif");
    expect(gif.status).toBe(415);

    // Tema builder boleh memakai unggahan itu sebagai tekstur dan media bawaan, dan tersimpan ke Theme.defaultMedia.
    const res = await builderPost(new NextRequest("http://localhost/api/admin/theme-builder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `Uji Latar ${TAG}`, category: "modern", description: "uji", spec: { ...defaultBuilderSpec(), texture: bg.body.url, defaultMedia: { LANDING_COVER: bg.body.url } } }),
    }));
    expect(res.status).toBe(200);
    created.themeId = (await res.json()).theme.id;
    const row = await prisma.theme.findUniqueOrThrow({ where: { id: created.themeId }, select: { defaultMedia: true } });
    expect(row.defaultMedia).toMatchObject({ GLOBAL_FIXED_BG: bg.body.url, LANDING_COVER: bg.body.url });
  });

  it("daftar bingkai hanya berisi gambar berjendela transparan", async () => {
    const res = await framesGet();
    expect(res.status).toBe(200);
    const { frames } = (await res.json()) as { frames: Array<{ src: string; group: string; fit: { x: number; y: number; w: number; h: number } }> };
    const srcs = frames.map((f) => f.src);
    expect(srcs).toContain("/assets/ornaments/bugis/bingkai-adat-bugis.png");
    // Ornamen tanpa jendela dan unggahan tanpa jendela tidak ikut.
    expect(srcs).not.toContain("/assets/ornaments/bugis/bingkai-adat-bugis-3d.png");
    expect(srcs.some((s) => created.files.some((f) => s.endsWith(f)))).toBe(false);
    expect(frames.every((f) => f.fit && f.group)).toBe(true);
  });
});
