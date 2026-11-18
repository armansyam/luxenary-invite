/**
 * Berkas bersama antar server aplikasi (lib/sharedFiles.ts), database luxenary_test. SHARED_STORE_DIR menggantikan
 * bucket R2; replika ditiru dengan LUX_SERVER_ROLE=replica dan menghapus/mengubah berkas lokal seolah server lain.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { ensureSharedFile, shareFile, sharedRelativePath, syncSharedFiles, unshareFiles } from "@/lib/sharedFiles";
import { GET as serveUpload } from "@/app/uploads/[...path]/route";
import { serveStaticDemo } from "@/lib/demoPublisher";
import { masterTemplateCache } from "@/lib/cache";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest-shared-${Date.now()}`;
const ASSET_DIR = path.join(process.cwd(), "public", "uploads", "theme-assets");
const asset = path.join(ASSET_DIR, `${TAG}.webp`);
const assetRel = `public/uploads/theme-assets/${TAG}.webp`;
const THEME_ID = TAG.replace(/-/g, "_");
const themeFile = path.join(process.cwd(), "themes", "wedding", "modern", `${THEME_ID}.html`);
const STATE_FILE = path.join(process.cwd(), "data", "shared-files-state.json");
const stateExisted = fs.existsSync(STATE_FILE);
let store = "";

beforeAll(() => {
  store = fs.mkdtempSync(path.join(os.tmpdir(), "lux-shared-"));
  process.env.SHARED_STORE_DIR = store;
});

afterEach(() => {
  delete process.env.LUX_SERVER_ROLE;
});

afterAll(async () => {
  delete process.env.SHARED_STORE_DIR;
  fs.rmSync(asset, { force: true });
  fs.rmSync(themeFile, { force: true });
  fs.rmSync(path.join(process.cwd(), "public", "demo", THEME_ID), { recursive: true, force: true });
  await prisma.theme.deleteMany({ where: { id: THEME_ID } });
  await prisma.renderVersion.deleteMany({ where: { key: `demo:${THEME_ID}` } });
  fs.rmSync(store, { recursive: true, force: true });
  if (!stateExisted) fs.rmSync(STATE_FILE, { force: true });
  await prisma.sharedFile.deleteMany({ where: { OR: [{ path: { contains: TAG } }, { path: { contains: THEME_ID } }] } });
  await prisma.$disconnect();
  await pool.end();
});

describe("sharedRelativePath", () => {
  it("hanya folder bersama; HTML demo dan berkas di luar proyek ditolak", () => {
    expect(sharedRelativePath(asset)).toBe(assetRel);
    expect(sharedRelativePath(path.join(process.cwd(), "themes", "wedding", "modern", "x.html"))).toBe("themes/wedding/modern/x.html");
    expect(sharedRelativePath(path.join(process.cwd(), "public", "demo", "kalandra", "cover.webp"))).toBe("public/demo/kalandra/cover.webp");
    expect(sharedRelativePath(path.join(process.cwd(), "public", "demo", "kalandra", "index.html"))).toBeNull();
    expect(sharedRelativePath(path.join(process.cwd(), "public", "uploads", "invitations", "a.webp"))).toBeNull();
    expect(sharedRelativePath(path.join(process.cwd(), "lib", "prisma.ts"))).toBeNull();
    expect(sharedRelativePath("/etc/passwd")).toBeNull();
  });
});

describe.skipIf(!IS_TEST_DB)("utama menyalin, replika menarik", () => {
  it("berkas baru, berkas yang ditimpa, dan berkas yang dihapus sampai ke replika", async () => {
    fs.mkdirSync(ASSET_DIR, { recursive: true });
    fs.writeFileSync(asset, "VERSI_1");
    await shareFile(asset);
    expect(fs.readFileSync(path.join(store, "shared", assetRel), "utf-8")).toBe("VERSI_1");
    expect(await prisma.sharedFile.findUniqueOrThrow({ where: { path: assetRel } })).toMatchObject({ size: 7, deletedAt: null });

    // Server utama tidak menarik apa pun.
    expect(await syncSharedFiles({ force: true })).toBe(0);

    // Replika belum punya berkasnya.
    process.env.LUX_SERVER_ROLE = "replica";
    fs.rmSync(asset);
    await syncSharedFiles({ force: true });
    expect(fs.readFileSync(asset, "utf-8")).toBe("VERSI_1");

    // Utama menimpa berkas di path yang sama; replika yang masih menyimpan versi lama memperbarui salinannya.
    delete process.env.LUX_SERVER_ROLE;
    fs.writeFileSync(asset, "VERSI_DUA");
    await shareFile(asset);
    process.env.LUX_SERVER_ROLE = "replica";
    fs.writeFileSync(asset, "VERSI_1");
    await syncSharedFiles({ force: true });
    expect(fs.readFileSync(asset, "utf-8")).toBe("VERSI_DUA");

    // Utama menghapus berkas: salinan di penyimpanan hilang dan replika ikut menghapus.
    delete process.env.LUX_SERVER_ROLE;
    await unshareFiles(asset);
    expect(fs.existsSync(path.join(store, "shared", assetRel))).toBe(false);
    expect((await prisma.sharedFile.findUniqueOrThrow({ where: { path: assetRel } })).deletedAt).not.toBeNull();
    process.env.LUX_SERVER_ROLE = "replica";
    await syncSharedFiles({ force: true });
    expect(fs.existsSync(asset)).toBe(false);
  });

  it("rute /uploads di replika menarik berkas yang belum ada lalu menyajikannya", async () => {
    fs.writeFileSync(asset, "ISI_ASET_BARU");
    await shareFile(asset);
    fs.rmSync(asset);

    process.env.LUX_SERVER_ROLE = "replica";
    const res = await serveUpload(new NextRequest(`http://localhost/uploads/theme-assets/${TAG}.webp`), { params: Promise.resolve({ path: ["theme-assets", `${TAG}.webp`] }) });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ISI_ASET_BARU");

    fs.rmSync(asset);
    await ensureSharedFile(asset);
    expect(fs.existsSync(asset)).toBe(true);
  });

  it("master tema buatan server utama dirender di replika yang belum punya berkasnya", async () => {
    const source = fs.readFileSync(path.join(process.cwd(), "themes", "wedding", "minimalist", "kalandra.html"), "utf-8");
    fs.writeFileSync(themeFile, source.replace("</body>", "<p>PENANDA_MASTER_BERSAMA</p></body>"));
    await prisma.theme.create({ data: { id: THEME_ID, name: "Uji Berkas Bersama", category: "modern", eventType: "WEDDING", isActive: false } });
    await shareFile(themeFile);

    process.env.LUX_SERVER_ROLE = "replica";
    fs.rmSync(themeFile);
    masterTemplateCache.clear();
    const html = await serveStaticDemo(THEME_ID);
    expect(html).toContain("PENANDA_MASTER_BERSAMA");
    expect(fs.existsSync(themeFile)).toBe(true);
  });

  it("satu berkas yang objeknya hilang tidak menahan berkas lain", async () => {
    const broken = path.join(ASSET_DIR, `${TAG}-hilang.webp`);
    fs.writeFileSync(broken, "X");
    await shareFile(broken);
    fs.rmSync(path.join(store, "shared", `public/uploads/theme-assets/${TAG}-hilang.webp`));
    fs.rmSync(broken);
    fs.writeFileSync(asset, "SETELAH_BERKAS_RUSAK");
    await shareFile(asset);
    fs.rmSync(asset);

    process.env.LUX_SERVER_ROLE = "replica";
    await syncSharedFiles({ force: true });
    expect(fs.readFileSync(asset, "utf-8")).toBe("SETELAH_BERKAS_RUSAK");
    expect(fs.existsSync(broken)).toBe(false);
  });

  it("menyalin berkas di luar folder bersama ditolak", async () => {
    await expect(shareFile(path.join(process.cwd(), "package.json"))).rejects.toThrow("di luar folder bersama");
  });
});
