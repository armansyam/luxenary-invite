/**
 * Theme Builder (23 Okt 2026): blueprint pernikahan sebagai dasar master, validasi spesifikasi, kompilator, render lewat
 * engine klien, dan rute admin builder. Rute dipanggil langsung dengan sesi admin tiruan; bagian DB hanya berjalan di
 * database `luxenary_test`.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const authState: { user: Record<string, unknown> | null } = { user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } };
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (authState.user ? { user: authState.user } : null)) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { auditBuilderMaster } from "@/lib/themeBuilder/audit";
import { builderDefaultMedia, renderBuilderPreview } from "@/lib/themeBuilder/server";
import { legacyDefaultMedia, legacyFonts, seedSpecFromMaster } from "@/lib/themeBuilder/legacySeed";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import { BUILDER_BLOCKS, VARIANT_GROUPS, blockStyle, defaultBuilderSpec, parseBuilderSpec, paletteChecks, PALETTE_PRESETS, type BuilderSpec } from "@/lib/themeBuilder/spec";
import { GET, POST, PUT, PATCH } from "@/app/api/admin/theme-builder/route";
import { POST as previewPost } from "@/app/api/admin/theme-builder/preview/route";
import { POST as assetPost, DELETE as assetDelete } from "@/app/api/admin/theme-builder/assets/route";
import { PUT as themesPut } from "@/app/api/admin/themes/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const ROOT = process.cwd();
const RUN = `vitest-builder-${Date.now().toString(36)}`;
const BLUEPRINT_FILE = path.join(ROOT, "themes", "_blueprints", "wedding", "starter-blueprint.html");
const createdThemes: string[] = [];
const createdAssets: string[] = [];

const json = (url: string, method: string, body: unknown) =>
  new Request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) as never;

const withOrnaments = (): BuilderSpec => ({
  ...defaultBuilderSpec(),
  ornaments: [
    { id: "orntop0001", section: "cover", src: "/assets/ornaments/flowers/flower-tl.webp", x: 12, y: 8, anchor: "top", width: 40, rotate: -10, opacity: 0.9, flipX: false, layer: "front" },
    { id: "ornbot0002", section: "closing", src: "/assets/ornaments/flowers/flower-br.webp", x: 88, y: 6, anchor: "bottom", width: 35, rotate: 0, opacity: 1, flipX: true, layer: "back" },
  ],
});

function studioLabelKeys(): string[] {
  const studio = fs.readFileSync(path.join(ROOT, "app", "(client)", "dashboard", "invitation", "[id]", "page.tsx"), "utf8");
  return [...new Set([...studio.matchAll(/updateCustomLabel\("([A-Za-z0-9_]+)"/g)].map((m) => m[1]))];
}

afterAll(async () => {
  if (IS_TEST_DB) {
    for (const id of createdThemes) {
      await prisma.theme.deleteMany({ where: { id } });
      for (const cat of ["minimalist", "modern", "traditional"]) fs.rmSync(path.join(ROOT, "themes", "wedding", cat, `${id}.html`), { force: true });
      fs.rmSync(path.join(ROOT, "public", "demo", id), { recursive: true, force: true });
    }
    for (const url of createdAssets) fs.rmSync(path.join(ROOT, "public", url), { force: true });
  }
  await prisma.$disconnect();
  await pool.end();
});

describe("blueprint pernikahan sebagai dasar master", () => {
  const blueprint = fs.readFileSync(BLUEPRINT_FILE, "utf8");

  it("tanpa warna mati di luar :root, seluruh skrip lolos parse", () => {
    expect(auditBuilderMaster(blueprint, blueprint)).toEqual([]);
  });

  it("mendefinisikan semua variabel CSS yang dibaca potongan HTML engine", () => {
    const engine = fs.readFileSync(path.join(ROOT, "lib", "themeEngine.ts"), "utf8");
    const vars = [...new Set([...engine.matchAll(/var\((--[a-z-]+)/g)].map((m) => m[1]))];
    expect(vars.filter((v) => !new RegExp(`${v}\\s*:`).test(blueprint))).toEqual([]);
  });

  it("salinan unduhan identik dengan sumber, tanpa kelas reveal mati dan tanggal hitung mundur palsu", () => {
    for (const copy of ["starter-blueprint.html", "starter-blueprint-wedding.html"]) {
      expect(fs.readFileSync(path.join(ROOT, "public", "downloads", copy), "utf8")).toBe(blueprint);
    }
    expect(blueprint).not.toMatch(/class="[^"]*\breveal/);
    expect(blueprint).not.toContain("30 * 24 * 60 * 60 * 1000");
    expect(blueprint).toContain("{{homePhotoUrl}}");
    expect(blueprint).toContain("{{landingCoverDesktopUrl}}");
  });

  it.skipIf(!IS_TEST_DB)("render engine: semua token terisi dan ke-34 label Studio tampil", async () => {
    const keys = studioLabelKeys();
    expect(keys.length).toBeGreaterThanOrEqual(34);
    const customLabels = Object.fromEntries(keys.map((k) => [k, `LBL_${k}_X`]));
    const data = (await composeInvitationData(buildDemoInvitation("kalandra", { featureSettings: { customLabels } }))) as Record<string, unknown>;
    const tokens = [...new Set([...blueprint.matchAll(/\{\{\s*(?:#if\s+|#unless\s+)?([\w.]+)\s*\}\}/g)].map((m) => m[1]))];
    expect(tokens.filter((t) => !(t in data))).toEqual([]);
    const html = await renderTemplateFile("vitest-blueprint", data, { eventType: "WEDDING", templateSource: blueprint });
    expect(html.match(/\{\{[^}]*\}\}/g) ?? []).toEqual([]);
    expect(keys.filter((k) => !html.includes(`LBL_${k}_X`))).toEqual([]);
  });
});

describe("validasi spesifikasi builder", () => {
  it("menerima spesifikasi bawaan dan semua palet siap pakai", () => {
    expect(parseBuilderSpec(defaultBuilderSpec()).ok).toBe(true);
    for (const preset of PALETTE_PRESETS) {
      expect(parseBuilderSpec({ ...defaultBuilderSpec(), palette: preset.palette, canvasMode: preset.mode }).ok).toBe(true);
    }
  });

  it("menolak nilai yang bisa menyusup ke CSS atau HTML master", () => {
    const base = defaultBuilderSpec();
    const bad: Array<Partial<BuilderSpec> | Record<string, unknown>> = [
      { palette: { ...base.palette, primary: "#fff;}body{display:none" } },
      { palette: { ...base.palette, accent: "red" } },
      { fonts: { ...base.fonts, heading: "'Comic Sans'" } },
      { texture: "javascript:alert(1)" },
      { variants: { ...base.variants, cover: "<script>" } },
      { animation: "spin" },
      { eventType: "BIRTHDAY" },
    ];
    for (const patch of bad) expect(parseBuilderSpec({ ...base, ...patch }).ok).toBe(false);

    const srcs = [
      "/uploads/theme-assets/../../../.env",
      "javascript:alert(1)",
      "https://evil.example/x.png",
      "/assets/ornaments/background/background-cream.webp",
      "/assets/ornaments/flowers/flower-tl.webp\" onerror=\"alert(1)",
      "/uploads/theme-assets/abc.svg",
    ];
    for (const src of srcs) {
      const spec = { ...withOrnaments(), ornaments: [{ ...withOrnaments().ornaments[0], src }] };
      expect(parseBuilderSpec(spec).ok).toBe(false);
    }
  });

  it("membatasi angka ornamen dan menolak ID ganda", () => {
    const spec = withOrnaments();
    const parsed = parseBuilderSpec({ ...spec, ornaments: [{ ...spec.ornaments[0], x: 9999, opacity: -3, width: "40;}" }] });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.spec.ornaments[0]).toMatchObject({ x: 120, opacity: 0.05, width: 30 });
    expect(parseBuilderSpec({ ...spec, ornaments: [spec.ornaments[0], spec.ornaments[0]] }).ok).toBe(false);
  });

  it("palet bawaan lolos ambang kontras", () => {
    for (const preset of PALETTE_PRESETS) {
      const failing = paletteChecks({ palette: preset.palette, canvasMode: preset.mode }).filter((c) => !c.ok);
      expect({ preset: preset.id, failing }).toEqual({ preset: preset.id, failing: [] });
    }
  });
});

describe("kompilator master", () => {
  const blueprint = readBuilderBlueprint("WEDDING");

  it("setiap varian, mode gelap, dan ornamen menghasilkan master yang lolos audit", () => {
    const specs: BuilderSpec[] = [withOrnaments(), { ...withOrnaments(), canvasMode: "dark", texture: "", radius: "round", animation: "none" }];
    for (const group of VARIANT_GROUPS) {
      for (const option of group.options) specs.push({ ...defaultBuilderSpec(), variants: { ...defaultBuilderSpec().variants, [group.key]: option.id } });
    }
    for (const spec of specs) {
      const html = compileBuilderMaster(spec, blueprint);
      expect(auditBuilderMaster(html, blueprint)).toEqual([]);
    }
  });

  it("menaruh ornamen di penanda seksi dengan posisi berbasis persen", () => {
    const html = compileBuilderMaster(withOrnaments(), blueprint);
    expect(html).not.toContain("<!-- lux-ornaments:cover -->");
    expect(html).toContain("<!-- lux-ornaments:couple -->");
    expect(html).toContain('data-orn-id="orntop0001" style="left:12%;top:8%;width:40%;opacity:0.9;transform:translate(-50%,-50%) rotate(-10deg) scaleX(1);"');
    expect(html).toContain("bottom:6%");
    expect(html).toContain('<html lang="id" data-lux-anim-preset="rise">');
    const coverStart = html.indexOf('data-lux-section="cover"');
    expect(html.indexOf('data-orn-id="orntop0001"')).toBeGreaterThan(coverStart);
    expect(html.indexOf('data-orn-id="orntop0001"')).toBeLessThan(html.indexOf('class="cover-top"'));
  });
});

describe.skipIf(!IS_TEST_DB)("rute admin Theme Builder", () => {
  let themeId = "";

  beforeAll(() => {
    authState.user = { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
  });

  it("menolak tanpa sesi admin", async () => {
    authState.user = null;
    try {
      const res = await previewPost(json("http://x/api/admin/theme-builder/preview", "POST", { spec: defaultBuilderSpec() }));
      expect(res.status).toBe(401);
    } finally {
      authState.user = { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    }
  });

  it("pratinjau dirender engine tanpa menulis berkas", async () => {
    const before = fs.readdirSync(path.join(ROOT, "themes", "wedding", "modern")).length;
    const res = await previewPost(json("http://x/api/admin/theme-builder/preview", "POST", { spec: withOrnaments() }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.issues).toEqual([]);
    expect(data.html).toContain('data-orn-id="orntop0001"');
    expect(data.html.match(/\{\{[^}]*\}\}/g) ?? []).toEqual([]);
    expect(fs.readdirSync(path.join(ROOT, "themes", "wedding", "modern")).length).toBe(before);
  });

  it("membuat draf: berkas master, baris DB nonaktif, spesifikasi tersimpan", async () => {
    const res = await POST(json("http://x/api/admin/theme-builder", "POST", { id: RUN, name: "Vitest Builder", category: "modern", description: "uji", spec: withOrnaments() }));
    const data = await res.json();
    expect(res.status).toBe(200);
    themeId = data.theme.id;
    createdThemes.push(themeId);
    expect(themeId).toBe(RUN);
    const row = await prisma.theme.findUniqueOrThrow({ where: { id: themeId } });
    expect(row.isActive).toBe(false);
    expect((row.builderSpec as { ornaments: unknown[] }).ornaments).toHaveLength(2);
    const file = path.join(ROOT, "themes", "wedding", "modern", `${themeId}.html`);
    expect(fs.existsSync(file)).toBe(true);
    expect(auditBuilderMaster(fs.readFileSync(file, "utf8"), readBuilderBlueprint("WEDDING"))).toEqual([]);
  });

  it("ID ganda, ID tema bawaan, dan ID berbahaya ditolak tanpa menulis berkas", async () => {
    const dup = await POST(json("http://x", "POST", { id: RUN, name: "Ganda", category: "modern", spec: defaultBuilderSpec() }));
    expect(dup.status).toBe(409);
    const builtin = await POST(json("http://x", "POST", { id: "kalandra", name: "Kalandra", category: "minimalist", spec: defaultBuilderSpec() }));
    expect(builtin.status).toBe(409);
    for (const id of ["../../etc", "a/b", "A B"]) {
      const res = await POST(json("http://x", "POST", { id, name: "Jahat", category: "modern", spec: defaultBuilderSpec() }));
      expect(res.status).toBe(400);
    }
    const badSpec = await POST(json("http://x", "POST", { id: `${RUN}-x`, name: "Spek", category: "modern", spec: { ...defaultBuilderSpec(), texture: "javascript:1" } }));
    expect(badSpec.status).toBe(400);
    expect(fs.existsSync(path.join(ROOT, "themes", "wedding", "modern", `${RUN}-x.html`))).toBe(false);
  });

  it("GET mengembalikan spesifikasi; tema tulisan tangan menolak dibuka di builder", async () => {
    const res = await GET(new Request(`http://x/api/admin/theme-builder?id=${themeId}`) as never);
    const data = await res.json();
    expect(data.spec.ornaments).toHaveLength(2);
    const hand = await GET(new Request("http://x/api/admin/theme-builder?id=kalandra") as never);
    expect(hand.status).toBe(409);
    const save = await PUT(json("http://x", "PUT", { id: "kalandra", name: "Kalandra", category: "minimalist", spec: defaultBuilderSpec() }));
    expect(save.status).toBe(409);
  });

  it("simpan dengan gaya baru memindahkan berkas master", async () => {
    const res = await PUT(json("http://x", "PUT", { id: themeId, name: "Vitest Builder 2", category: "traditional", description: "", spec: { ...withOrnaments(), canvasMode: "dark" } }));
    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(ROOT, "themes", "wedding", "traditional", `${themeId}.html`))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "themes", "wedding", "modern", `${themeId}.html`))).toBe(false);
    const row = await prisma.theme.findUniqueOrThrow({ where: { id: themeId } });
    expect(row).toMatchObject({ category: "traditional", series: "Traditional", name: "Vitest Builder 2" });
  });

  it("terbit hanya bila master lolos audit, lewat rute builder maupun daftar tema", async () => {
    const file = path.join(ROOT, "themes", "wedding", "traditional", `${themeId}.html`);
    const good = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, good.replace("data-lux-field=\"customLabels.openBtn\"", "").replace("</style>", ".x{color:#ff0000}</style>"));
    try {
      const viaBuilder = await PATCH(json("http://x", "PATCH", { id: themeId, isActive: true }));
      expect(viaBuilder.status).toBe(422);
      const viaThemes = await themesPut(json("http://x", "PUT", { id: themeId, isActive: true }));
      expect(viaThemes.status).toBe(422);
      expect((await prisma.theme.findUniqueOrThrow({ where: { id: themeId } })).isActive).toBe(false);
    } finally {
      fs.writeFileSync(file, good);
    }
    const ok = await PATCH(json("http://x", "PATCH", { id: themeId, isActive: true }));
    expect(ok.status).toBe(200);
    expect((await prisma.theme.findUniqueOrThrow({ where: { id: themeId } })).isActive).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "public", "demo", themeId, "index.html"))).toBe(true);
  });

  it("unggah ornamen: PNG jadi WebP bernama hash, SVG ditolak, hapus ditolak selama dipakai", async () => {
    const png = await sharp({ create: { width: 80, height: 80, channels: 4, background: { r: 200, g: 120, b: 40, alpha: 0.5 } } }).png().toBuffer();
    const upload = (buf: Buffer, name: string, type: string) => {
      const fd = new FormData();
      fd.append("file", new File([new Uint8Array(buf)], name, { type }));
      return new Request("http://x/api/admin/theme-builder/assets", { method: "POST", body: fd }) as never;
    };
    const res = await assetPost(upload(png, "bunga.png", "image/png"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.url).toMatch(/^\/uploads\/theme-assets\/[a-f0-9]{24}\.webp$/);
    createdAssets.push(data.url);
    const meta = await sharp(path.join(ROOT, "public", data.url)).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.hasAlpha).toBe(true);

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>');
    expect((await assetPost(upload(svg, "x.png", "image/png"))).status).toBe(415);

    const spec = { ...withOrnaments(), ornaments: [{ ...withOrnaments().ornaments[0], src: data.url }] };
    expect((await PUT(json("http://x", "PUT", { id: themeId, name: "Vitest Builder 2", category: "traditional", spec }))).status).toBe(200);
    const blocked = await assetDelete(new Request(`http://x/api/admin/theme-builder/assets?url=${encodeURIComponent(data.url)}`, { method: "DELETE" }) as never);
    expect(blocked.status).toBe(409);
    expect(fs.existsSync(path.join(ROOT, "public", data.url))).toBe(true);

    const traversal = await assetDelete(new Request("http://x/api/admin/theme-builder/assets?url=%2Fuploads%2Ftheme-assets%2F..%2F..%2F..%2F.env", { method: "DELETE" }) as never);
    expect(traversal.status).toBe(400);

    expect((await PUT(json("http://x", "PUT", { id: themeId, name: "Vitest Builder 2", category: "traditional", spec: withOrnaments() }))).status).toBe(200);
    expect((await PATCH(json("http://x", "PATCH", { id: themeId, isActive: false }))).status).toBe(200);
    fs.rmSync(path.join(ROOT, "public", "demo", themeId), { recursive: true, force: true });
    const freed = await assetDelete(new Request(`http://x/api/admin/theme-builder/assets?url=${encodeURIComponent(data.url)}`, { method: "DELETE" }) as never);
    expect(freed.status).toBe(200);
    expect(fs.existsSync(path.join(ROOT, "public", data.url))).toBe(false);
  });

  it("unggah master manual lewat daftar tema melepas status hasil builder", async () => {
    const fd = new FormData();
    fd.append("id", themeId);
    fd.append("file", new File([fs.readFileSync(BLUEPRINT_FILE)], `${themeId}.html`, { type: "text/html" }));
    const res = await themesPut(new Request("http://x/api/admin/themes", { method: "PUT", body: fd }) as never);
    expect(res.status).toBe(200);
    expect((await prisma.theme.findUniqueOrThrow({ where: { id: themeId } })).builderSpec).toBeNull();
  });
});

describe("media bawaan di builder", () => {
  const COVER_A = "/assets/ornaments/background/background-red.webp";

  it("spesifikasi lama tanpa defaultMedia tetap sah; pilihan di luar pustaka latar ditolak", () => {
    const { defaultMedia: _omit, ...legacy } = defaultBuilderSpec();
    const legacyParsed = parseBuilderSpec(legacy);
    expect(legacyParsed.ok && legacyParsed.spec.defaultMedia).toEqual({});

    const ok = parseBuilderSpec({ ...defaultBuilderSpec(), defaultMedia: { LANDING_COVER: COVER_A, CLOSING_COVER: "" } });
    expect(ok.ok && ok.spec.defaultMedia).toEqual({ LANDING_COVER: COVER_A });

    for (const bad of ["/demo/kalandra/cover.webp", "https://example.com/a.webp", "/uploads/invitations/x/c.webp"]) {
      expect(parseBuilderSpec({ ...defaultBuilderSpec(), defaultMedia: { LANDING_COVER: bad } }).ok).toBe(false);
    }
  });

  it("media bawaan tema builder = latar dari tekstur ditambah pilihan admin; Polos tanpa latar", () => {
    const base = { ...defaultBuilderSpec(), defaultMedia: { DESKTOP_SIDEBAR: COVER_A } };
    expect(builderDefaultMedia(base)).toEqual({ GLOBAL_FIXED_BG: base.texture, DESKTOP_SIDEBAR: COVER_A });
    expect(builderDefaultMedia({ ...base, texture: "" })).toEqual({ DESKTOP_SIDEBAR: COVER_A });
  });

  it.skipIf(!IS_TEST_DB)("pratinjau 'Klien baru' memakai bawaan tema, bukan foto demo; 'Contoh demo' memakai foto demo", async () => {
    const spec = { ...defaultBuilderSpec(), defaultMedia: { LANDING_COVER: COVER_A } };
    const client = await renderBuilderPreview(spec, "kalandra", "client");
    expect(client.html).toContain(COVER_A);
    expect(client.html).not.toContain("/demo/kalandra/cover.webp");
    expect(client.html).not.toContain("/demo/kalandra/gallery_01.webp");

    const demo = await renderBuilderPreview(spec, "kalandra", "demo");
    expect(demo.html).toContain("/demo/kalandra/");
  });
});

describe("blok konten dengan properti relatif", () => {
  const blueprintHtml = fs.readFileSync(BLUEPRINT_FILE, "utf8");

  it("setiap blok terdaftar muncul tepat satu kali di blueprint, dan tidak ada penanda yang tidak terdaftar", () => {
    const ids = [...blueprintHtml.matchAll(/data-lux-block="([a-z0-9-]+)"/g)].map((m) => m[1]);
    expect(ids.sort()).toEqual(BUILDER_BLOCKS.map((b) => b.id).sort());
  });

  it("spesifikasi lama tanpa blocks tetap sah; nilai dijepit; blok tak dikenal dan nilai bawaan dibuang", () => {
    const { blocks: _omit, ...legacy } = defaultBuilderSpec();
    const old = parseBuilderSpec(legacy);
    expect(old.ok && old.spec.blocks).toEqual({});

    const parsed = parseBuilderSpec({
      ...defaultBuilderSpec(),
      blocks: {
        "cover-names": { x: 99999, y: -99999, scale: 9, rotate: 400 },
        "opening-photo": { x: 0, y: 0, scale: 1, rotate: 0 },
        "tidak-ada": { x: 5, y: 5, scale: 1, rotate: 0 },
        countdown: { x: 10.5, y: 0, scale: 1.2, rotate: -10 },
      },
    });
    expect(parsed.ok && parsed.spec.blocks).toEqual({
      "cover-names": { x: 1500, y: -1500, scale: 2, rotate: 180, hidden: false },
      countdown: { x: 10.5, y: 0, scale: 1.2, rotate: -10, hidden: false },
    });
    expect(parseBuilderSpec({ ...defaultBuilderSpec(), blocks: { countdown: "x" } }).ok).toBe(false);
  });

  it("kompilasi menulis translate, rotate, dan scale individual (tidak menimpa transform) dan master tetap lolos audit", () => {
    const spec = { ...defaultBuilderSpec(), blocks: { "cover-names": { x: 12, y: -4, scale: 1.1, rotate: 3, hidden: false } } };
    const html = compileBuilderMaster(spec, blueprintHtml);
    expect(blockStyle({ x: 12, y: -4, scale: 1.1, rotate: 3, hidden: false })).toBe("translate:12% -4%;rotate:3deg;scale:1.1;");
    expect(html).toContain('[data-lux-block="cover-names"]{translate:12% -4%;rotate:3deg;scale:1.1;}');
    expect(html).not.toMatch(/\[data-lux-block="cover-names"\]\{[^}]*\btransform\s*:/);
    expect(auditBuilderMaster(html, blueprintHtml)).toEqual([]);
    expect(compileBuilderMaster(defaultBuilderSpec(), blueprintHtml)).not.toContain("lux-builder-blocks");
  });

  it("audit menandai master yang kehilangan penanda blok", () => {
    const html = compileBuilderMaster(defaultBuilderSpec(), blueprintHtml).replace(' data-lux-block="countdown"', "");
    expect(auditBuilderMaster(html, blueprintHtml).map((i) => i.code)).toEqual(["block"]);
  });
});

describe("titik awal dari tema pernikahan lama", () => {
  const legacyFiles = ["minimalist", "modern", "traditional"].flatMap((style) =>
    fs.readdirSync(path.join(ROOT, "themes", "wedding", style)).filter((f) => f.endsWith(".html")).map((f) => ({ style, id: f.replace(".html", ""), file: path.join(ROOT, "themes", "wedding", style, f) })),
  );

  it("setiap master lama menghasilkan spesifikasi yang lolos validasi, dengan warna hanya dari :root", () => {
    expect(legacyFiles.length).toBeGreaterThan(30);
    for (const m of legacyFiles) {
      const html = fs.readFileSync(m.file, "utf8");
      const seed = seedSpecFromMaster(html);
      expect(parseBuilderSpec(seed.spec).ok, m.id).toBe(true);
      const root = html.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
      const primary = root.match(/--primary\s*:\s*(#[0-9a-fA-F]{6})\s*;/)?.[1]?.toLowerCase();
      if (primary) expect(seed.spec.palette.primary, m.id).toBe(primary);
      expect(seed.found.length + seed.missing.length).toBe(8);
    }
  });

  it("huruf master lama dibaca per peran dan hanya keluarga dikenali yang dibawa", () => {
    const html = `<style>.a{font-family:'Cinzel',serif}.b{font-family:'Cinzel',serif}.c{font-family:"Great Vibes",cursive}.d{font-family:'Yaqoote Script',cursive}.e{font-family:'Italiana',serif}.f{font-family:'Jost',sans-serif}.g{font-family:monospace}</style>`;
    expect(legacyFonts(html)).toEqual({ heading: "cinzel", script: "great-vibes", body: "jost" });
    expect(legacyFonts(`<style>.a{font-family:'Pinyon Script',cursive}.b{font-family:'Bellefair',serif}</style>`)).toEqual({ script: "g:Pinyon Script", heading: "g:Bellefair" });
    expect(legacyFonts("<style>.a{font-family:'Lontara'}</style>")).toEqual({});
    let withFonts = 0;
    for (const m of legacyFiles) {
      const seed = seedSpecFromMaster(fs.readFileSync(m.file, "utf8"));
      if (seed.fontsFound.length) withFonts++;
      expect(parseBuilderSpec(seed.spec).ok, m.id).toBe(true);
    }
    expect(withFonts).toBeGreaterThan(25);
  });

  it("media bawaan tema lama hanya yang sah untuk slot builder", () => {
    expect(legacyDefaultMedia({ LANDING_COVER: "/assets/ornaments/background/background-red.webp", DESKTOP_SIDEBAR: "/demo/x/hero.webp", CLOSING_COVER: "https://evil.example/a.png", LAINNYA: "/x" }))
      .toEqual({ LANDING_COVER: "/assets/ornaments/background/background-red.webp" });
    expect(legacyDefaultMedia(null)).toEqual({});
  });

  it("memberi tahu berapa warna tertulis mati di luar :root yang tidak ikut terbawa", () => {
    const candani = legacyFiles.find((m) => m.id === "candani")!;
    expect(seedSpecFromMaster(fs.readFileSync(candani.file, "utf8")).hexOutsideRoot).toBeGreaterThan(0);
  });

  it.skipIf(!IS_TEST_DB)("API: daftar tema lama, titik awal, dan penolakan tema yang bukan tulisan tangan atau tidak ada", async () => {
    const get = (qs: string) => GET(new Request(`http://localhost/api/admin/theme-builder?${qs}`) as never);

    const list = await (await get("legacy=1")).json();
    expect(list.themes.map((t: { id: string }) => t.id)).toContain("candani");
    const rows = await prisma.theme.findMany({ where: { id: { in: list.themes.map((t: { id: string }) => t.id) } }, select: { builderSpec: true, eventType: true } });
    expect(rows.every((r) => r.builderSpec === null && r.eventType === "WEDDING")).toBe(true);

    const res = await get("from=candani");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(parseBuilderSpec(body.spec).ok).toBe(true);
    expect(body.theme).toMatchObject({ id: "", name: "Candani Builder", category: "modern" });
    expect(body.report.source).toBe("Candani");

    expect((await get("from=tidak-ada-ini")).status).toBe(404);
  });
});
