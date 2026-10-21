/**
 * Temuan audit 19 Okt 2026 (c): unggah aset demo, logo, dan favicon dari panel admin menimpa berkas yang dilacak git
 * (`public/demo/<tema>/*.webp`, `public/assets/brand/*`, `public/favicon.ico`, `app/icon.png`), sehingga
 * `git pull --ff-only` di deploy.sh berhenti bila commit baru mengubah berkas yang sama. Unggahan kini ditulis ke
 * `public/uploads/demo/` dan `public/uploads/brand/` (diabaikan git). Handler rute dipanggil langsung, DB luxenary_test.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })),
}));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { POST as demoAssetPost, DELETE as demoAssetDelete } from "@/app/api/admin/themes/[id]/demo-asset/route";
import { POST as brandPost } from "@/app/api/admin/upload-brand/route";
import { GET as brandFile } from "@/app/brand/[file]/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const ROOT = process.cwd();
const THEME = "sinergi";
const SETTING_KEY = `theme_demo_${THEME}`;
const TRACKED = ["public/demo", "public/assets/brand", "public/favicon.ico", "app"];
const uploadsBrand = path.join(ROOT, "public", "uploads", "brand");
const uploadsDemo = path.join(ROOT, "public", "uploads", "demo", THEME);

const gitStatus = () => execFileSync("git", ["status", "--porcelain", "--", ...TRACKED], { cwd: ROOT, encoding: "utf8" });
const sha = (file: string) => crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");
const png = (r: number) => sharp({ create: { width: 64, height: 64, channels: 4, background: { r, g: 10, b: 10, alpha: 1 } } }).png().toBuffer();
const upload = (url: string, fields: Record<string, string>, file: Buffer, name: string) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append("file", new File([new Uint8Array(file)], name, { type: "image/png" }));
  return new Request(url, { method: "POST", body: fd });
};

let originalSetting: { value: string; label: string | null; group: string | null } | null = null;
let statusBefore = "";
let brandBackup: string | null = null;

beforeAll(async () => {
  if (!IS_TEST_DB) return;
  statusBefore = gitStatus();
  originalSetting = await prisma.adminSetting.findUnique({ where: { key: SETTING_KEY }, select: { value: true, label: true, group: true } });
  if (fs.existsSync(uploadsBrand)) {
    brandBackup = fs.mkdtempSync(path.join(ROOT, "data", "vitest-brand-"));
    fs.cpSync(uploadsBrand, brandBackup, { recursive: true });
  }
});

afterAll(async () => {
  if (IS_TEST_DB) {
    fs.rmSync(uploadsDemo, { recursive: true, force: true });
    fs.rmSync(uploadsBrand, { recursive: true, force: true });
    if (brandBackup) {
      fs.cpSync(brandBackup, uploadsBrand, { recursive: true });
      fs.rmSync(brandBackup, { recursive: true, force: true });
    }
    if (originalSetting) {
      await prisma.adminSetting.update({ where: { key: SETTING_KEY }, data: { value: originalSetting.value } });
    } else {
      await prisma.adminSetting.deleteMany({ where: { key: SETTING_KEY } });
    }
    const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
    await compileAndSaveStaticDemo(THEME);
  }
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("unggahan admin tidak menyentuh berkas yang dilacak git", () => {
  it("aset demo ditulis ke public/uploads/demo, dipakai demo statis, dan hapus slot tidak menghapus bawaan git", async () => {
    const tracked = path.join(ROOT, "public", "demo", THEME, "gallery_01.webp");
    const trackedHash = sha(tracked);

    const res = await demoAssetPost(upload(`http://localhost/api/admin/themes/${THEME}/demo-asset`, { slot: "gallery_01" }, await png(200), "foto.png"), { params: Promise.resolve({ id: THEME }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rawUrl).toBe(`/uploads/demo/${THEME}/gallery_01.png`);
    expect(fs.existsSync(path.join(uploadsDemo, "gallery_01.png"))).toBe(true);
    expect(sha(tracked)).toBe(trackedHash);

    const setting = await prisma.adminSetting.findUnique({ where: { key: SETTING_KEY } });
    expect(JSON.parse(setting!.value).galleryPhotos[0]).toBe(body.rawUrl);
    expect(fs.readFileSync(path.join(ROOT, "public", "demo", THEME, "index.html"), "utf8")).toContain(body.rawUrl);

    const del = await demoAssetDelete(new Request(`http://localhost/api/admin/themes/${THEME}/demo-asset?slot=gallery_01`, { method: "DELETE" }), { params: Promise.resolve({ id: THEME }) });
    expect(del.status).toBe(200);
    expect(fs.existsSync(path.join(uploadsDemo, "gallery_01.png"))).toBe(false);
    expect(fs.existsSync(tracked)).toBe(true);
    expect(gitStatus()).toBe(statusBefore);
  });

  it("logo dan favicon ditulis ke public/uploads/brand dan disajikan /brand/<berkas>; tanpa unggahan, bawaan git yang disajikan", async () => {
    fs.rmSync(uploadsBrand, { recursive: true, force: true });
    const bundledLogo = path.join(ROOT, "public", "assets", "brand", "logo.webp");
    const fallback = await brandFile(new Request("http://localhost/brand/logo.webp"), { params: Promise.resolve({ file: "logo.webp" }) });
    expect(fallback.status).toBe(200);
    expect(crypto.createHash("sha1").update(Buffer.from(await fallback.arrayBuffer())).digest("hex")).toBe(sha(bundledLogo));

    const logo = await brandPost(upload("http://localhost/api/admin/upload-brand", { type: "logo" }, await png(30), "logo.png") as never);
    expect(logo.status).toBe(200);
    expect((await logo.json()).url).toMatch(/^\/brand\/logo\.webp\?t=\d+$/);
    const served = await brandFile(new Request("http://localhost/brand/logo.webp"), { params: Promise.resolve({ file: "logo.webp" }) });
    expect(served.headers.get("cache-control")).toBe("public, no-cache");
    expect(crypto.createHash("sha1").update(Buffer.from(await served.arrayBuffer())).digest("hex")).toBe(sha(path.join(uploadsBrand, "logo.webp")));

    const favicon = await brandPost(upload("http://localhost/api/admin/upload-brand", { type: "favicon" }, await png(90), "icon.png") as never);
    expect(favicon.status).toBe(200);
    for (const f of ["favicon.png", "favicon-48x48.png", "favicon-96x96.png", "favicon-192x192.png", "favicon-512x512.png", "apple-touch-icon.png"]) {
      expect(fs.existsSync(path.join(uploadsBrand, f))).toBe(true);
    }
    // Berkas app/icon.png mengalahkan metadata icons sehingga favicon unggahan baru tampil setelah build ulang.
    expect(fs.existsSync(path.join(ROOT, "app", "icon.png"))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, "app", "apple-icon.png"))).toBe(false);
    expect(gitStatus()).toBe(statusBefore);

    const unknown = await brandFile(new Request("http://localhost/brand/x"), { params: Promise.resolve({ file: "../../.env" }) });
    expect(unknown.status).toBe(404);
  });
});
