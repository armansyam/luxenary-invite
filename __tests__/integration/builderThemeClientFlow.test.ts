/**
 * E2E tema builder sampai klien (database `luxenary_test`): admin menyimpan dan menerbitkan tema dengan tempat jadwal
 * di Home, bingkai foto, blok yang digeser, dan ornamen berurutan; klien membuat undangan dengan tema itu dan
 * memuat pratinjau Studio; lalu admin mengubah tema dan undangan klien (piring draf) tidak ikut berubah.
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
import { GET as studioGet, PUT as invitationPut } from "@/app/api/client/invitations/[id]/route";
import { GET as previewGet } from "@/app/api/client/invitations/[id]/preview/route";
import { GET as publicThemes } from "@/app/api/public/themes/route";
import { renderPublishedHtml } from "@/lib/staticPublisher";
import { builderMasterPath } from "@/lib/themeBuilder/server";
import { defaultBuilderSpec, moveOrnament, type BuilderOrnament, type BuilderSpec } from "@/lib/themeBuilder/spec";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_bflow_${Date.now()}`;
const FRAME = "/assets/ornaments/bugis/bingkai-adat-bugis.png";
const ORN_A = "/assets/ornaments/bugis/bingkai-adat-bugis-minimal.png";
process.env.AUTH_SECRET ||= "vitest-bflow-signing-secret";

const request = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

const orn = (id: string, src: string): BuilderOrnament => ({ id, section: "opening", src, x: 50, y: 40, anchor: "top", width: 30, rotate: 0, opacity: 1, flipX: false, layer: "back" });

function designedSpec(): BuilderSpec {
  const base = defaultBuilderSpec();
  return {
    ...base,
    eventsPlacement: "home",
    frames: { "couple-photo-1": { shape: "default", ornament: FRAME, spread: 18, hideRing: false, fit: null } },
    blocks: { "cover-monogram": { x: 12, y: 4, scale: 1.1, rotate: 0, hidden: false }, "opening-quote": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true } },
    // "ujibbb02" dinaikkan ke paling depan: urutan akhir di DOM harus ujiaaa01, ujiccc03, ujibbb02.
    ornaments: [
      ...moveOrnament([orn("ujibbb02", ORN_A), orn("ujiaaa01", FRAME), orn("ujiccc03", ORN_A)], "ujibbb02", "front"),
      // Teks hias bebas di sampul, gambar yang menempel ke formulir RSVP, dan teks yang menempel ke isi penutup.
      { ...orn("ujitxt006", ""), section: "cover", layer: "front", text: { value: "Save the Date", font: "script", size: 28, color: "on-dark", spacing: 0.05, labelKey: "hias1" } },
      { ...orn("ujiatt004", ORN_A), section: "rsvp", attach: "rsvp-form", x: 90, y: 4, width: 40 },
      { ...orn("ujitxt005", ""), section: "closing", attach: "closing-content", layer: "front", text: { value: 'Kami & "Kita"', font: "heading", size: 20, color: "accent", spacing: 0 } },
    ],
  };
}

describe.skipIf(!IS_TEST_DB)("tema builder sampai klien", () => {
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
    }
    for (const f of created.drafts) fs.rmSync(f, { force: true });
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("admin menyimpan dan menerbitkan; tema masuk katalog klien tanpa thumbnail", async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    created.admins.push(admin.id);
    sessionUser = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };

    const save = await builderPost(request("/api/admin/theme-builder", "POST", { name: `Uji Alur ${TAG}`, category: "modern", description: "uji", spec: designedSpec() }));
    expect(save.status).toBe(200);
    created.themeId = (await save.json()).theme.id;

    const publish = await builderPatch(request("/api/admin/theme-builder", "PATCH", { id: created.themeId, isActive: true }));
    expect(publish.status).toBe(200);

    const list = (await (await publicThemes(new Request("http://localhost/api/public/themes?eventType=WEDDING"))).json()) as Array<{ id: string; thumbnailMobile: unknown; thumbnailDesktop: unknown }>;
    expect(list.find((t) => t.id === created.themeId)).toMatchObject({ thumbnailMobile: null, thumbnailDesktop: null });
  });

  it("klien membuat undangan dengan tema itu dan pratinjau Studio memuat seluruh rancangan admin", async () => {
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
    expect(inv.themeId).toBe(created.themeId);

    const studio = await studioGet(request(`/api/client/invitations/${inv.id}`, "GET") as never, { params: Promise.resolve({ id: inv.id }) });
    expect(studio.status).toBe(200);

    const preview = await previewGet(request(`/api/client/invitations/${inv.id}/preview`, "GET"), { params: Promise.resolve({ id: inv.id }) });
    expect(preview.status).toBe(200);
    const html = await preview.text();

    // Jadwal dipindah ke Home (tepat satu token, wadah tampil, seksi Acara disembunyikan).
    expect(html).toContain('<style id="lux-builder-events">');
    expect(html).toContain("#events { display: none; }");
    expect(html).toContain('class="home-schedule"');
    // Bingkai foto, blok yang digeser, dan urutan ornamen terbawa.
    expect(html).toContain('[data-lux-block="couple-photo-1"]::after');
    expect(html).toContain('[data-lux-block="cover-monogram"]{translate:12% 4%;rotate:0deg;scale:1.1;}');
    // Urutan dokumen: ornamen seksi menurut penanda seksinya, lalu yang menempel di dalam bloknya.
    expect([...html.matchAll(/data-orn-id="([^"]+)"/g)].map((m) => m[1])).toEqual(["ujitxt006", "ujiaaa01", "ujiccc03", "ujibbb02", "ujiatt004", "ujitxt005"]);
    // Ornamen menempel: anak blok berupa span, teks di-escape, gaya acuan blok terpasang.
    expect(html).toMatch(/data-lux-block="rsvp-form"[^>]*><span class="lux-orn is-attached" data-orn-id="ujiatt004"/);
    expect(html).toContain('<span class="lux-orn is-front is-attached lux-orn-text" data-orn-id="ujitxt005"');
    expect(html).toContain("Kami &amp; &quot;Kita&quot;");
    expect(html).toContain('[data-lux-block="rsvp-form"],[data-lux-block="closing-content"]{position:relative;isolation:isolate;}');
    // Teks label yang dibaca Studio dan sunting langsung tidak boleh memuat ornamen.
    const labelHosts = [...html.matchAll(/<([a-zA-Z0-9]+)\b[^>]*data-lux-field="[^"]+"[^>]*>([\s\S]*?)<\/\1>/g)];
    expect(labelHosts.length).toBeGreaterThan(0);
    expect(labelHosts.filter((m) => m[2].includes("lux-orn"))).toEqual([]);
    // Elemen opsional yang disembunyikan admin tidak tampil, tetapi yang digeser tetap.
    expect(html).toContain('[data-lux-block="opening-quote"]{translate:0% 0%;rotate:0deg;scale:1;display:none;}');
    // Tidak ada token mentah dan tidak ada rujukan media kosong.
    expect(html).not.toMatch(/\{\{[#/]?[A-Za-z]/);
    expect(html).not.toMatch(/url\(\s*(?:''|""|)\s*\)/);
    expect(html).not.toMatch(/<img\b(?![^>]*\sid\s*=)[^>]*\ssrc=(?:""|'')/);
  });

  it("klien mengubah teks hias yang ditandai editable lewat simpan Studio, dan pratinjau menampilkannya", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: created.users[0] } });
    const inv = await prisma.invitation.findFirstOrThrow({ where: { userId: user.id } });
    sessionUser = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };

    // Teks awal terbawa ke label bawaan undangan saat dibuat, sehingga Studio menampilkan teks admin.
    const before = await (await previewGet(request(`/api/client/invitations/${inv.id}/preview`, "GET"), { params: Promise.resolve({ id: inv.id }) })).text();
    expect(before).toMatch(/data-orn-id="ujitxt006"[^>]*data-lux-field="customLabels\.hias1"[^>]*>Save the Date</);

    // Studio mengirim seluruh objek customLabels; penggabungan featureSettings dangkal.
    const currentFs = (inv.featureSettings ?? {}) as { customLabels?: Record<string, string> };
    const saved = await invitationPut(request(`/api/client/invitations/${inv.id}`, "PUT", { featureSettings: { customLabels: { ...(currentFs.customLabels ?? {}), hias1: 'Syukuran "Keluarga" & Sahabat' } } }), { params: Promise.resolve({ id: inv.id }) });
    expect(saved.status).toBe(200);

    const after = await (await previewGet(request(`/api/client/invitations/${inv.id}/preview`, "GET"), { params: Promise.resolve({ id: inv.id }) })).text();
    expect(after).toMatch(/data-orn-id="ujitxt006"[^>]*data-lux-field="customLabels\.hias1"[^>]*>Syukuran &quot;Keluarga&quot; &amp; Sahabat</);
    expect(after).not.toMatch(/data-orn-id="ujitxt006"[^>]*>Save the Date</);
    // Teks hias statis lain di tema itu tidak berubah dan tetap tanpa penanda sunting.
    expect(after).toMatch(/data-orn-id="ujitxt005"(?![^>]*data-lux-field)/);

    // HTML terbit yang disajikan ke tamu: teks klien tampil, tanpa mode sunting, dan teks statis tetap disembunyikan dari pembaca layar.
    const published = (await renderPublishedHtml(inv.id)) as string;
    expect(published).toMatch(/data-orn-id="ujitxt006"[^>]*data-lux-field="customLabels\.hias1"(?![^>]*aria-hidden)[^>]*>Syukuran &quot;Keluarga&quot; &amp; Sahabat</);
    expect(published).not.toContain("luxInlineEditorStyles");
    expect(published).not.toMatch(/data-orn-id="ujitxt006"[^>]*contenteditable/);
    expect(published).not.toContain("Save the Date");
    expect(published).toMatch(/data-orn-id="ujitxt005"[^>]*aria-hidden="true"/);
    expect(published).not.toMatch(/\{\{[#/]?[A-Za-z]/);
  });

  it("admin mengubah tema sesudahnya: undangan klien (piring draf) tidak ikut berubah", async () => {
    const inv = await prisma.invitation.findFirstOrThrow({ where: { userId: created.users[0] } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: created.users[0] } });

    sessionUser = { id: created.admins[0], role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    const changed = { ...designedSpec(), eventsPlacement: "section" as const, frames: {}, blocks: {}, ornaments: [] };
    const put = await builderPut(request("/api/admin/theme-builder", "PUT", { id: created.themeId, name: `Uji Alur ${TAG}`, category: "modern", description: "uji", spec: changed }));
    expect(put.status).toBe(200);

    sessionUser = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };
    const preview = await previewGet(request(`/api/client/invitations/${inv.id}/preview`, "GET"), { params: Promise.resolve({ id: inv.id }) });
    const html = await preview.text();
    expect(html).toContain('<style id="lux-builder-events">');
    expect(html).toContain('[data-lux-block="couple-photo-1"]::after');
    expect(html).toContain('data-orn-id="ujiaaa01"');
  });
});
