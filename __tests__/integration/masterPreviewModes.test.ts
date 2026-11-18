/**
 * Pratinjau Editor Master (18 Nov 2026): mode "demo" memakai foto contoh, "client" meniru klien baru (hanya media
 * bawaan tema, termasuk yang belum disimpan dari editor), "sim" menambahkan foto uji admin per slot seperti unggahan
 * klien. Foto uji hanya diterima dari folder builder-sim.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeThemeEdgeCache: vi.fn(async () => ({ success: false, skipped: true })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { pool } from "@/lib/prisma";
import { POST } from "@/app/api/admin/theme-variants/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const SIM_NAME = "abcdef0123456789abcdef01.webp";
const SIM_URL = `/uploads/builder-sim/${SIM_NAME}`;
const SIM_FILE = path.join(process.cwd(), "public", "uploads", "builder-sim", SIM_NAME);
const DEFAULT_COVER = "/uploads/theme-assets/fedcba9876543210fedcba98.webp";

const preview = async (extra: Record<string, unknown>) => {
  const res = await POST(new NextRequest("http://localhost/api/admin/theme-variants?preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ parentId: "wajo", mode: "master", overrides: { colors: {}, fonts: {} }, ...extra }),
  }));
  return { status: res.status, html: (await res.json()).html as string };
};

afterAll(async () => {
  fs.rmSync(SIM_FILE, { force: true });
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("mode pratinjau Editor Master", () => {
  it("demo memakai foto contoh tema", async () => {
    const { status, html } = await preview({ previewMode: "demo" });
    expect(status).toBe(200);
    expect(html).toContain("/demo/wajo/");
  });

  it("klien baru tanpa foto demo, dengan media bawaan dari editor", async () => {
    const { html } = await preview({ previewMode: "client", defaultMedia: { LANDING_COVER: DEFAULT_COVER } });
    expect(html).not.toMatch(/\/demo\/wajo\/(cover|groom|bride|hero)\.webp/);
    expect(html).toContain(DEFAULT_COVER);
  });

  it("foto uji menempati slot seperti unggahan klien; URL di luar builder-sim dibuang", async () => {
    fs.mkdirSync(path.dirname(SIM_FILE), { recursive: true });
    fs.writeFileSync(SIM_FILE, await sharp({ create: { width: 40, height: 60, channels: 3, background: { r: 10, g: 120, b: 200 } } }).webp().toBuffer());
    const { html } = await preview({ previewMode: "sim", sim: { slots: { LANDING_COVER: SIM_URL, GROOM_PHOTO: "/demo/wajo/groom.webp" }, gallery: [] } });
    expect(html).toContain(SIM_URL);
    expect(html).not.toContain("/demo/wajo/groom.webp");
  });
});
