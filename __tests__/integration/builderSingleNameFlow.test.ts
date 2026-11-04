/**
 * Theme Builder untuk acara satu nama sampai klien (database `luxenary_test`, 3 Nov 2026): admin membuat tema KHITAN
 * dari blueprint satu nama, master ditulis ke folder khitan, jenis acara terkunci, seksi yang tidak ada ditolak, terbit
 * lolos audit; klien khitan memakai tema itu dan pratinjau Studio memuat rancangan admin; pratinjau builder wisuda
 * memakai demo wisuda.
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
import { POST as builderPost, PUT as builderPut, PATCH as builderPatch } from "@/app/api/admin/theme-builder/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { GET as previewGet } from "@/app/api/client/invitations/[id]/preview/route";
import { GET as publicThemes } from "@/app/api/public/themes/route";
import { builderMasterPath, renderBuilderPreview } from "@/lib/themeBuilder/server";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { compileAndSaveStaticDemo } from "@/lib/demoPublisher";
import { defaultBuilderSpec, type BuilderOrnament, type BuilderSpec } from "@/lib/themeBuilder/spec";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_bsingle_${Date.now()}`;
const FRAME = "/assets/ornaments/bugis/bingkai-adat-bugis.png";
const ORN = "/assets/ornaments/bugis/bingkai-adat-bugis-minimal.png";
process.env.AUTH_SECRET ||= "vitest-bsingle-signing-secret";

const request = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

const orn = (id: string, extra: Partial<BuilderOrnament>): BuilderOrnament => ({ id, section: "couple", src: ORN, x: 50, y: 40, anchor: "top", width: 30, rotate: 0, opacity: 1, flipX: false, layer: "back", ...extra });

function khitanSpec(): BuilderSpec {
  return {
    ...defaultBuilderSpec("KHITAN"),
    eventsPlacement: "home",
    frames: { "couple-photo-1": { shape: "default", ornament: FRAME, spread: 18, hideRing: false, fit: null } },
    texts: { coverBadge: "Walimatul Khitan Ceria", countdownTitle: "Menuju Hari Khitan" },
    ornaments: [orn("sngorn001", { section: "cover", attach: "cover-names", x: 90, y: 4 }), orn("sngorn002", { section: "cover", layer: "front" })],
  };
}

describe.skipIf(!IS_TEST_DB)("Theme Builder satu nama sampai klien", () => {
  const created = { users: [] as string[], admins: [] as string[], themeId: "", drafts: [] as string[] };

  afterAll(async () => {
    sessionUser = null;
    await prisma.invitation.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    if (created.themeId) {
      const theme = await prisma.theme.findUnique({ where: { id: created.themeId }, select: { category: true } });
      await prisma.themeBuilderRevision.deleteMany({ where: { themeId: created.themeId } });
      await prisma.theme.deleteMany({ where: { id: created.themeId } });
      if (theme) fs.rmSync(builderMasterPath(theme.category as "modern", created.themeId, "KHITAN"), { force: true });
      fs.rmSync(path.join(process.cwd(), "public", "demo", created.themeId.toLowerCase()), { recursive: true, force: true });
    }
    for (const f of created.drafts) fs.rmSync(f, { force: true });
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("admin membuat tema khitan: master di folder khitan, jenis acara terkunci, seksi kisah ditolak, terbit lolos audit", async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    created.admins.push(admin.id);
    sessionUser = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };

    const story = await builderPost(request("/api/admin/theme-builder", "POST", { name: `Uji Kisah ${TAG}`, category: "modern", spec: { ...khitanSpec(), ornaments: [orn("sngorn009", { section: "story" })] } }));
    expect(story.status).toBe(400);

    const save = await builderPost(request("/api/admin/theme-builder", "POST", { name: `Uji Khitan ${TAG}`, category: "modern", description: "uji", spec: khitanSpec() }));
    expect(save.status).toBe(200);
    created.themeId = (await save.json()).theme.id;

    expect(fs.existsSync(builderMasterPath("modern", created.themeId, "KHITAN"))).toBe(true);
    expect(fs.existsSync(builderMasterPath("modern", created.themeId, "WEDDING"))).toBe(false);
    // Aturan master yang sama dengan e2eFindings20261020 (yang melewati _blueprints): token di komentar ikut terganti.
    expect(fs.readFileSync(builderMasterPath("modern", created.themeId, "KHITAN"), "utf8")).not.toMatch(/<!--[^>]*\{\{\s*[\w.]+\s*\}\}[^>]*-->/);
    expect((await prisma.theme.findUniqueOrThrow({ where: { id: created.themeId } })).eventType).toBe("KHITAN");

    const switched = await builderPut(request("/api/admin/theme-builder", "PUT", { id: created.themeId, name: `Uji Khitan ${TAG}`, category: "modern", spec: { ...khitanSpec(), eventType: "BIRTHDAY" } }));
    expect(switched.status).toBe(409);

    const publish = await builderPatch(request("/api/admin/theme-builder", "PATCH", { id: created.themeId, isActive: true }));
    expect(publish.status).toBe(200);

    const list = (await (await publicThemes(new Request("http://localhost/api/public/themes?eventType=KHITAN"))).json()) as Array<{ id: string }>;
    expect(list.some((t) => t.id === created.themeId)).toBe(true);
  });

  it("demo statis tema khitan (sumber thumbnail katalog) memakai persona khitan, bukan pernikahan kalandra", async () => {
    await compileAndSaveStaticDemo(created.themeId);
    const html = fs.readFileSync(path.join(process.cwd(), "public", "demo", created.themeId.toLowerCase(), "index.html"), "utf-8");
    const persona = (await composeInvitationData(buildDemoInvitation("al-fariz"))) as Record<string, unknown>;
    expect(html).toMatch(/<title>Walimatul Khitan /);
    expect(html).not.toContain("The Wedding of");
    expect(html).toContain(String(persona.mainName).replace(/&/g, "&amp;"));
  });

  it("klien khitan memakai tema itu: pratinjau Studio memuat profil, jadwal di Home, bingkai, ornamen, dan teks builder", async () => {
    const user = await prisma.user.create({ data: { email: `${TAG}@client.local`, name: "Klien Uji" } });
    created.users.push(user.id);
    await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-1`, planType: "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() } });
    sessionUser = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };

    const res = await createInvitation(request("/api/client/invitations/create", "POST", {
      eventType: "KHITAN", themeId: created.themeId, planType: "TIER_2", weddingDate: "2099-12-05", eventDate: "2099-12-05",
      participantsJson: JSON.stringify({ child: { name: "Muhammad Rafa Aditya", nickname: "Rafa" } }),
    }));
    expect(res.status).toBe(200);
    const inv = await prisma.invitation.findFirstOrThrow({ where: { userId: user.id } });
    created.drafts.push(path.join(process.cwd(), "data", "drafts", `${inv.id}.html`));
    expect(inv.themeId).toBe(created.themeId);

    const preview = await previewGet(request(`/api/client/invitations/${inv.id}/preview`, "GET"), { params: Promise.resolve({ id: inv.id }) });
    expect(preview.status).toBe(200);
    const html = await preview.text();

    expect(html).toContain("Muhammad Rafa Aditya");
    expect(html).toContain('<style id="lux-builder-events">');
    expect(html).toContain('[data-lux-block="couple-photo-1"]::after');
    expect(html).toMatch(/data-lux-block="cover-names"[^>]*><span class="lux-orn is-attached" data-orn-id="sngorn001"/);
    expect(html).toContain('data-orn-id="sngorn002"');
    // Teks "engine" builder menjadi label bawaan; teks "static" tertulis di master saat kompilasi.
    expect(html).toMatch(/data-lux-field="customLabels\.coverBadge"[^>]*>Walimatul Khitan Ceria</);
    expect(html).toMatch(/data-lux-field="customLabels\.countdownTitle"[^>]*>Menuju Hari Khitan</);
    expect(html).not.toMatch(/\{\{[#/]?[A-Za-z]/);
    expect(html).not.toContain("THE COUPLE");
  });

  it("pratinjau builder wisuda memakai demo wisuda", async () => {
    const spec = defaultBuilderSpec("WISUDA");
    const { html, issues } = await renderBuilderPreview(spec, undefined, "demo");
    expect(issues).toEqual([]);
    const demo = (await composeInvitationData(buildDemoInvitation("cendekia"))) as Record<string, unknown>;
    expect(html).toContain(String(demo.mainName).replace(/&/g, "&amp;"));
    expect(html).not.toMatch(/\{\{[#/]?[A-Za-z]/);
  });
});
