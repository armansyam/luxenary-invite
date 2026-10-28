/**
 * Teks bawaan label dan lapisan elemen di Theme Builder (database `luxenary_test`): validasi spesifikasi, kompilasi
 * (teks statis diganti, token mesin utuh, audit lolos), render lewat engine, dan alur tema -> undangan klien.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeInvitationEdgeCache: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { PATCH as builderPatch, POST as builderPost } from "@/app/api/admin/theme-builder/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { GET as previewGet } from "@/app/api/client/invitations/[id]/preview/route";
import { builderMasterPath, compileAndAudit, renderBuilderPreview } from "@/lib/themeBuilder/server";
import { BUILDER_TEXTS, blockStyle, defaultBuilderSpec, parseBuilderSpec, parseBuilderTexts } from "@/lib/themeBuilder/spec";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_btext_${Date.now()}`;
process.env.AUTH_SECRET ||= "vitest-btext-signing-secret";

const request = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

const sampleTexts = () => Object.fromEntries(BUILDER_TEXTS.map((t) => [t.key, `Uji ${t.key}`]));

describe("lapisan elemen (z)", () => {
  it("menjepit z ke -9..9 dan membulatkan; 0 tidak disimpan", () => {
    const base = defaultBuilderSpec();
    const parsed = parseBuilderSpec({ ...base, blocks: { "couple-name-1": { x: 1, y: 0, scale: 1, rotate: 0, hidden: false, z: 99 }, "couple-name-2": { x: 1, y: 0, scale: 1, rotate: 0, hidden: false, z: -2.6 }, "countdown": { x: 1, y: 0, scale: 1, rotate: 0, hidden: false, z: 0 } } });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.spec.blocks["couple-name-1"]?.z).toBe(9);
    expect(parsed.spec.blocks["couple-name-2"]?.z).toBe(-3);
    expect(parsed.spec.blocks["countdown"]).toEqual({ x: 1, y: 0, scale: 1, rotate: 0, hidden: false });
  });

  it("z membuat position:relative dan z-index dihitung dari 2; blok yang hanya diberi z tetap tersimpan", () => {
    expect(blockStyle({ x: 0, y: 0, scale: 1, rotate: 0, hidden: false })).not.toContain("z-index");
    expect(blockStyle({ x: 0, y: 0, scale: 1, rotate: 0, hidden: false, z: 3 })).toContain("position:relative;z-index:5;");
    expect(blockStyle({ x: 0, y: 0, scale: 1, rotate: 0, hidden: false, z: -4 })).toContain("z-index:-2;");
    const parsed = parseBuilderSpec({ ...defaultBuilderSpec(), blocks: { "couple-photo-1": { x: 0, y: 0, scale: 1, rotate: 0, hidden: false, z: 1 } } });
    expect(parsed.ok && parsed.spec.blocks["couple-photo-1"]).toMatchObject({ z: 1 });
    const html = compileBuilderMaster(parsed.ok ? parsed.spec : defaultBuilderSpec());
    expect(html).toContain('[data-lux-block="couple-photo-1"]{translate:0% 0%;rotate:0deg;scale:1;position:relative;z-index:3;}');
  });
});

describe("teks bawaan label", () => {
  it("katalog: setiap kunci ada di blueprint, kunci unik, dan jenisnya sesuai (token = engine)", () => {
    const blueprint = readBuilderBlueprint("WEDDING");
    const keys = BUILDER_TEXTS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const { key, kind } of BUILDER_TEXTS) {
      const el = blueprint.match(new RegExp(`<([a-zA-Z0-9]+)\\b[^>]*data-lux-field="customLabels\\.${key}"[^>]*>([\\s\\S]*?)</\\1>`));
      expect(el, `elemen ${key} tidak ada di blueprint`).not.toBeNull();
      const hasToken = /\{\{\s*[\w.]+\s*\}\}/.test(el![2]);
      expect(hasToken, `${key}: jenis ${kind} tidak cocok dengan isi blueprint`).toBe(kind === "engine");
    }
  });

  it("parse: satu baris, tanpa < > atau {{ }}, dibatasi 300 karakter, kunci asing dibuang", () => {
    const errors: string[] = [];
    const texts = parseBuilderTexts({ openBtn: "  Buka\n  Sekarang  ", coverBadge: "<b>x</b>", rsvpTitle: "{{firstName}}", closingQuote: "a".repeat(301), palsu: "x", navHome: 5, cdDays: "" }, errors);
    expect(texts).toEqual({ openBtn: "Buka Sekarang", cdDays: "" });
    expect(errors).toHaveLength(4);
    expect(parseBuilderSpec({ ...defaultBuilderSpec(), texts: { coverBadge: "<script>" } }).ok).toBe(false);
    const legacy = parseBuilderSpec({ ...defaultBuilderSpec(), texts: undefined });
    expect(legacy.ok && legacy.spec.texts).toEqual({});
  });

  it("kompilasi: teks statis diganti (ikon SVG tetap), token mesin utuh, audit lolos", () => {
    const spec = { ...defaultBuilderSpec(), texts: sampleTexts() };
    const { html, issues } = compileAndAudit(spec);
    expect(issues).toEqual([]);
    expect(html).toContain('data-lux-field="customLabels.countdownTitle"');
    expect(html).toMatch(/data-lux-field="customLabels\.countdownTitle"[^>]*>Uji countdownTitle</);
    expect(html).toMatch(/data-lux-field="customLabels\.saveDateBtn"[^>]*>\s*<svg[\s\S]*?<\/svg>\s*Uji saveDateBtn\s*<\/a>/);
    // Token milik label "engine" tidak diganti saat kompilasi.
    expect(html).toContain("{{coverBadge}}");
    expect(html).toContain("{{openBtn}}");
    expect(html).not.toContain("Uji coverBadge");
  });

  it("teks statis di-escape", () => {
    const { html } = compileAndAudit({ ...defaultBuilderSpec(), texts: { cdDays: 'Hari & "Malam"' } });
    expect(html).toMatch(/customLabels\.cdDays"[^>]*>Hari &amp; &quot;Malam&quot;</);
  });
});

describe.skipIf(!IS_TEST_DB)("teks bawaan lewat engine dan alur klien", () => {
  const created = { users: [] as string[], admins: [] as string[], themeId: "", drafts: [] as string[] };

  afterAll(async () => {
    sessionUser = null;
    await prisma.invitation.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    if (created.themeId) {
      const theme = await prisma.theme.findUnique({ where: { id: created.themeId }, select: { category: true } });
      await prisma.theme.deleteMany({ where: { id: created.themeId } });
      if (theme) fs.rmSync(builderMasterPath(theme.category as "modern", created.themeId), { force: true });
      fs.rmSync(path.join(process.cwd(), "public", "demo", created.themeId.toLowerCase()), { recursive: true, force: true });
    }
    for (const f of created.drafts) fs.rmSync(f, { force: true });
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("pratinjau builder menampilkan setiap teks bawaan dan mengembalikannya di labels", async () => {
    const spec = { ...defaultBuilderSpec(), texts: sampleTexts() };
    const { html, labels } = await renderBuilderPreview(spec, "kalandra", "client");
    for (const { key } of BUILDER_TEXTS) {
      expect(html, `teks ${key} tidak tampil`).toContain(`Uji ${key}`);
      expect(labels[key], `labels.${key}`).toBe(`Uji ${key}`);
    }
    expect(html).not.toMatch(/\{\{[#/]?[A-Za-z]/);
  });

  it("tanpa teks bawaan, labels memuat teks bawaan blueprint apa adanya", async () => {
    const { labels } = await renderBuilderPreview(defaultBuilderSpec(), "kalandra", "client");
    expect(labels.openBtn).toBeTruthy();
    expect(labels.navHome).toBe("Home");
    expect(labels.coverGuestLabel).toMatch(/Kepada Yth/i);
  });

  it("tema tersimpan: undangan klien baru memakai teks bawaan, dan isian klien tetap menang", async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    created.admins.push(admin.id);
    sessionUser = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    const save = await builderPost(request("/api/admin/theme-builder", "POST", { name: `Uji Teks ${TAG}`, category: "modern", description: "uji", spec: { ...defaultBuilderSpec(), texts: sampleTexts() } }));
    expect(save.status).toBe(200);
    created.themeId = (await save.json()).theme.id;
    const publish = await builderPatch(request("/api/admin/theme-builder", "PATCH", { id: created.themeId, isActive: true }));
    expect(publish.status).toBe(200);

    const user = await prisma.user.create({ data: { email: `${TAG}@client.local`, name: "Klien Uji" } });
    created.users.push(user.id);
    await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-1`, planType: "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() } });
    sessionUser = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };
    const res = await createInvitation(request("/api/client/invitations/create", "POST", {
      eventType: "WEDDING", themeId: created.themeId, planType: "TIER_2",
      participantsJson: JSON.stringify({ groom: { name: "Raka", nickname: "Raka" }, bride: { name: "Dewi", nickname: "Dewi" } }),
    }));
    expect(res.status).toBe(200);
    const inv = await prisma.invitation.findFirstOrThrow({ where: { userId: user.id } });
    created.drafts.push(path.join(process.cwd(), "data", "drafts", `${inv.id}.html`));

    const preview = await previewGet(request(`/api/client/invitations/${inv.id}/preview`, "GET"), { params: Promise.resolve({ id: inv.id }) });
    const html = await preview.text();
    for (const { key } of BUILDER_TEXTS) expect(html, `teks ${key} tidak tampil di undangan klien`).toContain(`Uji ${key}`);

    // Teks itu menjadi nilai awal label klien, dan klien dapat menggantinya.
    const stored = (await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, select: { featureSettings: true } })).featureSettings as { customLabels?: Record<string, string> } | null;
    expect(stored?.customLabels?.openBtn).toBe("Uji openBtn");
    await prisma.invitation.update({ where: { id: inv.id }, data: { featureSettings: { ...(stored ?? {}), customLabels: { ...(stored?.customLabels ?? {}), openBtn: "Masuk" } } } });
    const again = await (await previewGet(request(`/api/client/invitations/${inv.id}/preview`, "GET"), { params: Promise.resolve({ id: inv.id }) })).text();
    expect(again).toContain("Masuk");
  });
});
