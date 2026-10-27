/**
 * Siklus hidup tema builder (database `luxenary_test`): teks "engine" ber-karakter khusus, musik bawaan, duplikat,
 * riwayat versi, serta ekspor dan impor berkas beserta gambar unggahannya.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeInvitationEdgeCache: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { GET as builderGet, POST as builderPost, PUT as builderPut } from "@/app/api/admin/theme-builder/route";
import { POST as importPost } from "@/app/api/admin/theme-builder/import/route";
import { MAX_BUILDER_REVISIONS, THEME_ASSET_DIR, builderMasterPath, recordBuilderRevision, renderBuilderPreview } from "@/lib/themeBuilder/server";
import { defaultBuilderSpec, type BuilderOrnament, type BuilderSpec } from "@/lib/themeBuilder/spec";
import { BUNDLE_FORMAT, exportBundle, readBundle } from "@/lib/themeBuilder/bundle";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_life_${Date.now()}`;
process.env.AUTH_SECRET ||= "vitest-life-signing-secret";

const request = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

const withPrimary = (primary: string): BuilderSpec => {
  const spec = defaultBuilderSpec();
  return { ...spec, palette: { ...spec.palette, primary } };
};

describe("teks engine", () => {
  it("nilai ber-& dan tanda kutip di-escape oleh engine, sama seperti teks statis", async () => {
    const { html } = await renderBuilderPreview({ ...defaultBuilderSpec(), texts: { coverBadge: 'A & "B"' } }, "kalandra", "client");
    expect(html).toMatch(/customLabels\.coverBadge"[^>]*>A &amp; &quot;B&quot;</);
  });
});

describe.skipIf(!IS_TEST_DB)("siklus hidup tema builder", () => {
  const created = { admins: [] as string[], themes: [] as string[], assets: [] as string[], music: [] as string[] };

  afterAll(async () => {
    sessionUser = null;
    for (const id of created.themes) {
      const theme = await prisma.theme.findUnique({ where: { id }, select: { category: true } });
      await prisma.theme.deleteMany({ where: { id } });
      if (theme) fs.rmSync(builderMasterPath(theme.category as "modern", id), { force: true });
    }
    for (const name of created.assets) fs.rmSync(path.join(THEME_ASSET_DIR, name), { force: true });
    await prisma.musicPreset.deleteMany({ where: { id: { in: created.music } } });
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  async function signIn() {
    const n = created.admins.length;
    const admin = await prisma.admin.create({
      data: { username: `${TAG}_${n}`, email: `${TAG}_${n}@uji.test`, name: "Admin Uji Siklus", role: "SUPER_ADMIN", permissions: [] },
    });
    created.admins.push(admin.id);
    sessionUser = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, name: admin.name, email: admin.email };
  }

  async function createTheme(name: string, extra: Record<string, unknown> = {}, spec: BuilderSpec = defaultBuilderSpec()) {
    const res = await builderPost(request("/api/admin/theme-builder", "POST", { name, category: "modern", description: "uji", spec, ...extra }));
    const data = await res.json();
    if (data.theme?.id) created.themes.push(data.theme.id);
    return { res, data };
  }

  async function uploadedWebp(seed: number): Promise<string> {
    const bytes = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: seed, g: 40, b: 90, alpha: 0.5 } } }).webp().toBuffer();
    const name = `${crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 24)}.webp`;
    fs.mkdirSync(THEME_ASSET_DIR, { recursive: true });
    fs.writeFileSync(path.join(THEME_ASSET_DIR, name), bytes);
    created.assets.push(name);
    return name;
  }

  it("musik bawaan: hanya dari pustaka sistem, dipertahankan saat tidak dikirim, dihapus dengan string kosong", async () => {
    await signIn();
    const preset = await prisma.musicPreset.create({ data: { title: `${TAG} lagu`, url: `/music/${TAG}.mp3`, isActive: true } });
    created.music.push(preset.id);

    const bad = await createTheme(`${TAG} musik salah`, { defaultMusicUrl: "/music/tidak-ada.mp3" });
    expect(bad.res.status).toBe(400);
    expect(bad.data.error).toMatch(/pustaka musik/);

    const ok = await createTheme(`${TAG} musik`, { defaultMusicUrl: preset.url });
    expect(ok.res.status).toBe(200);
    const id = ok.data.theme.id as string;
    expect((await prisma.theme.findUnique({ where: { id } }))?.defaultMusicUrl).toBe(preset.url);
    expect((await (await builderGet(request(`/api/admin/theme-builder?id=${id}`, "GET"))).json()).theme.defaultMusicUrl).toBe(preset.url);

    const keep = await builderPut(request("/api/admin/theme-builder", "PUT", { id, name: `${TAG} musik`, category: "modern", description: "uji", spec: withPrimary("#112233") }));
    expect(keep.status).toBe(200);
    expect((await prisma.theme.findUnique({ where: { id } }))?.defaultMusicUrl).toBe(preset.url);

    const rejected = await builderPut(request("/api/admin/theme-builder", "PUT", { id, name: `${TAG} musik`, category: "modern", description: "uji", spec: withPrimary("#112233"), defaultMusicUrl: "/music/asing.mp3" }));
    expect(rejected.status).toBe(400);

    const cleared = await builderPut(request("/api/admin/theme-builder", "PUT", { id, name: `${TAG} musik`, category: "modern", description: "uji", spec: withPrimary("#112233"), defaultMusicUrl: "" }));
    expect(cleared.status).toBe(200);
    expect((await prisma.theme.findUnique({ where: { id } }))?.defaultMusicUrl).toBeNull();
  });

  it("riwayat versi: versi awal, tanpa duplikat, dibatasi, tema lama mendapat versi dasar, dan bisa dibaca", async () => {
    await signIn();
    const { data } = await createTheme(`${TAG} riwayat`);
    const id = data.theme.id as string;
    expect(await prisma.themeBuilderRevision.count({ where: { themeId: id } })).toBe(1);

    const save = (spec: BuilderSpec, name = `${TAG} riwayat`) => builderPut(request("/api/admin/theme-builder", "PUT", { id, name, category: "modern", description: "uji", spec }));
    expect((await save(withPrimary("#0a0b0c"))).status).toBe(200);
    expect(await prisma.themeBuilderRevision.count({ where: { themeId: id } })).toBe(2);

    // Hanya nama yang berubah: spesifikasi sama dengan versi terbaru, jadi tidak ada versi baru.
    expect((await save(withPrimary("#0a0b0c"), `${TAG} riwayat ganti nama`)).status).toBe(200);
    expect(await prisma.themeBuilderRevision.count({ where: { themeId: id } })).toBe(2);

    const list = await (await builderGet(request(`/api/admin/theme-builder?revisions=${id}`, "GET"))).json();
    expect(list.revisions.map((r: { action: string }) => r.action)).toEqual(["SAVE", "CREATE"]);
    expect(list.revisions[0].adminName).toBe("Admin Uji Siklus");

    const oldest = list.revisions[1].id as string;
    const old = await (await builderGet(request(`/api/admin/theme-builder?revision=${oldest}`, "GET"))).json();
    expect(old.spec.palette.primary).toBe(defaultBuilderSpec().palette.primary);
    expect((await builderGet(request("/api/admin/theme-builder?revision=tidak-ada", "GET"))).status).toBe(404);

    // Batas jumlah versi: yang tertua dibuang.
    const session = { user: sessionUser } as unknown as Session;
    const meta = { id, name: "x", category: "modern" as const, description: null };
    for (let i = 0; i < MAX_BUILDER_REVISIONS + 3; i++) {
      await recordBuilderRevision(session, meta, withPrimary(`#${(0x100000 + i).toString(16)}`), "SAVE");
    }
    expect(await prisma.themeBuilderRevision.count({ where: { themeId: id } })).toBe(MAX_BUILDER_REVISIONS);

    // Tema yang dibuat sebelum ada riwayat: penyimpanan pertama mencatat keadaan sebelumnya sebagai versi dasar.
    const legacyId = `${TAG}-lama`.replace(/_/g, "-").slice(0, 40);
    created.themes.push(legacyId);
    await prisma.theme.create({ data: { id: legacyId, name: "Tema lama", category: "modern", eventType: "WEDDING", isActive: false, builderSpec: defaultBuilderSpec() as never } });
    expect(await prisma.themeBuilderRevision.count({ where: { themeId: legacyId } })).toBe(0);
    const res = await builderPut(request("/api/admin/theme-builder", "PUT", { id: legacyId, name: "Tema lama", category: "modern", description: "", spec: withPrimary("#334455") }));
    expect(res.status).toBe(200);
    expect(await prisma.themeBuilderRevision.count({ where: { themeId: legacyId } })).toBe(2);
  });

  it("riwayat ikut terhapus bersama temanya (cascade)", async () => {
    await signIn();
    const { data } = await createTheme(`${TAG} cascade`);
    const id = data.theme.id as string;
    expect(await prisma.themeBuilderRevision.count({ where: { themeId: id } })).toBe(1);
    await prisma.theme.delete({ where: { id } });
    fs.rmSync(builderMasterPath("modern", id), { force: true });
    expect(await prisma.themeBuilderRevision.count({ where: { themeId: id } })).toBe(0);
  });

  it("duplikat: salinan draf dari versi tersimpan, ID unik berurutan, hanya tema builder", async () => {
    await signIn();
    const preset = await prisma.musicPreset.create({ data: { title: `${TAG} lagu dup`, url: `/music/${TAG}-dup.mp3`, isActive: true } });
    created.music.push(preset.id);
    const source = await createTheme(`${TAG} sumber`, { defaultMusicUrl: preset.url }, withPrimary("#445566"));
    const sourceId = source.data.theme.id as string;

    const copy1 = await builderPost(request("/api/admin/theme-builder", "POST", { duplicateFrom: sourceId }));
    const body1 = await copy1.json();
    if (body1.theme?.id) created.themes.push(body1.theme.id);
    expect(copy1.status).toBe(200);
    expect(body1.theme.name).toBe(`${TAG} sumber Salinan`);
    expect(body1.theme.isActive).toBe(false);
    const row1 = await prisma.theme.findUnique({ where: { id: body1.theme.id } });
    expect((row1?.builderSpec as unknown as BuilderSpec).palette.primary).toBe("#445566");
    expect(row1?.defaultMusicUrl).toBe(preset.url);
    expect(fs.existsSync(builderMasterPath("modern", body1.theme.id))).toBe(true);

    const copy2 = await builderPost(request("/api/admin/theme-builder", "POST", { duplicateFrom: sourceId }));
    const body2 = await copy2.json();
    if (body2.theme?.id) created.themes.push(body2.theme.id);
    expect(copy2.status).toBe(200);
    expect(body2.theme.id).not.toBe(body1.theme.id);
    expect(body2.theme.id).toMatch(/-2$/);

    const handwritten = await builderPost(request("/api/admin/theme-builder", "POST", { duplicateFrom: "kalandra" }));
    expect(handwritten.status).toBe(404);
    expect((await builderPost(request("/api/admin/theme-builder", "POST", { duplicateFrom: "tidak-ada-sama-sekali" }))).status).toBe(404);
  });

  it("ekspor dan impor: gambar unggahan ikut, hash diverifikasi, berkas rusak ditolak sebelum menulis apa pun", async () => {
    await signIn();
    const file = await uploadedWebp(11);
    const ornament: BuilderOrnament = { id: "ornuji01", section: "cover", src: `/uploads/theme-assets/${file}`, x: 50, y: 10, anchor: "top", width: 30, rotate: 0, opacity: 1, flipX: false, layer: "back" };
    const spec: BuilderSpec = { ...defaultBuilderSpec(), ornaments: [ornament] };
    const { data } = await createTheme(`${TAG} ekspor`, {}, spec);
    const id = data.theme.id as string;

    const exportRes = await builderGet(request(`/api/admin/theme-builder?export=${id}`, "GET"));
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers.get("content-disposition")).toContain(`${id}.luxtheme.json`);
    const bundle = await exportRes.json();
    expect(bundle.format).toBe(BUNDLE_FORMAT);
    expect(Object.keys(bundle.assets)).toEqual([file]);
    expect((await builderGet(request("/api/admin/theme-builder?export=kalandra", "GET"))).status).toBe(404);

    // Server tujuan belum punya gambarnya.
    fs.rmSync(path.join(THEME_ASSET_DIR, file));
    const imported = await importPost(request("/api/admin/theme-builder/import", "POST", bundle));
    const importedBody = await imported.json();
    expect(imported.status).toBe(200);
    expect(importedBody.assets).toEqual({ written: 1, existing: 0 });
    expect(fs.existsSync(path.join(THEME_ASSET_DIR, file))).toBe(true);
    expect(importedBody.spec.ornaments[0].src).toBe(`/uploads/theme-assets/${file}`);
    expect(importedBody.missingAssets).toEqual([]);
    // Impor tidak membuat tema.
    expect(await prisma.theme.count({ where: { name: { startsWith: `${TAG} ekspor` } } })).toBe(1);

    // Impor kedua: gambar sudah ada, tidak ditimpa.
    const again = await (await importPost(request("/api/admin/theme-builder/import", "POST", bundle))).json();
    expect(again.assets).toEqual({ written: 0, existing: 1 });

    // Isi gambar diganti tanpa mengganti nama: hash tidak cocok.
    const other = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#aabbcc" } }).webp().toBuffer();
    fs.rmSync(path.join(THEME_ASSET_DIR, file));
    const tampered = { ...bundle, assets: { [file]: other.toString("base64") } };
    const tamperedRes = await importPost(request("/api/admin/theme-builder/import", "POST", tampered));
    expect(tamperedRes.status).toBe(400);
    expect((await tamperedRes.json()).details[0]).toMatch(/hash/);
    expect(fs.existsSync(path.join(THEME_ASSET_DIR, file))).toBe(false);

    // Gambar yang ditaut spesifikasi tidak ada di berkas dan tidak ada di disk: dilaporkan, bukan ditolak.
    const noAssets = await (await importPost(request("/api/admin/theme-builder/import", "POST", { ...bundle, assets: {} }))).json();
    expect(noAssets.missingAssets).toEqual([file]);

    // Musik yang tidak ada di pustaka server tujuan dilepas dengan penanda.
    const foreignMusic = await (await importPost(request("/api/admin/theme-builder/import", "POST", { ...bundle, theme: { ...bundle.theme, defaultMusicUrl: "/music/asing.mp3" }, assets: {} }))).json();
    expect(foreignMusic.theme.defaultMusicUrl).toBe("");
    expect(foreignMusic.musicDropped).toBe(true);

    // Bentuk berkas salah.
    expect((await importPost(request("/api/admin/theme-builder/import", "POST", { format: "lain" }))).status).toBe(400);
    expect((await importPost(request("/api/admin/theme-builder/import", "POST", { ...bundle, version: 99 }))).status).toBe(400);
    expect((await importPost(request("/api/admin/theme-builder/import", "POST", { ...bundle, assets: { "../../etc/passwd": "AAAA" } }))).status).toBe(400);
    expect((await importPost(request("/api/admin/theme-builder/import", "POST", { ...bundle, spec: { palette: 1 } }))).status).toBe(400);
  });

  it("readBundle menolak WebP yang tidak terbaca walau hash namanya cocok", async () => {
    const junk = Buffer.from("bukan gambar sama sekali");
    const name = `${crypto.createHash("sha256").update(junk).digest("hex").slice(0, 24)}.webp`;
    const result = await readBundle({ ...exportBundle({ name: "x", category: "modern", description: "", defaultMusicUrl: "" }, defaultBuilderSpec()).bundle, assets: { [name]: junk.toString("base64") } });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toMatch(/tidak dapat dibaca/);
  });

  it("endpoint builder menolak tanpa sesi admin", async () => {
    sessionUser = null;
    expect((await builderGet(request("/api/admin/theme-builder?export=kalandra", "GET"))).status).toBeGreaterThanOrEqual(401);
    expect((await builderGet(request("/api/admin/theme-builder?revisions=kalandra", "GET"))).status).toBeGreaterThanOrEqual(401);
    expect((await importPost(request("/api/admin/theme-builder/import", "POST", {}))).status).toBeGreaterThanOrEqual(401);
  });
});
