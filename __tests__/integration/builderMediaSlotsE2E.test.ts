/**
 * Pengujian E2E terintegrasi Theme Builder Fase 5 + Studio Klien + Render Undangan (19 Nov 2026):
 * 1. Alur Admin Theme Builder (Wedding): buat draf dengan replaceSlot, replaceable free section, centered layout,
 *    hidden events ornament -> simpan `Theme.mediaSlots` -> pratinjau `client` vs `sim` -> sunting & terbitkan.
 * 2. Alur User/Klien Studio: buat undangan -> verifikasi `GET /api/client/invitations/[id]` (deklarasi + preview) ->
 *    render awal (ilustrasi tampil) -> upload `GLOBAL_FIXED_BG` saja (tidak menimpa ilustrasi cover) ->
 *    upload `HOME_PHOTO` + `GROOM_PHOTO` -> render (foto klien menggantikan ilustrasi) ->
 *    ubah `displayOrder` ke `BRIDE_FIRST` -> ganti tema tanpa `HOME_PHOTO` (foto tetap tersimpan, tak dirender) -> hapus foto.
 * 3. Alur Admin Theme Builder + Single-Name (`BIRTHDAY`): `simSlotsFor` punya `GROOM_PHOTO` ("Foto profil utama"),
 *    foto uji `LANDING_COVER` tidak menimpa ilustrasi `GROOM_PHOTO`, sedangkan foto uji `GROOM_PHOTO` menggantikannya.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";

const authState: { user: Record<string, unknown> | null } = { user: null };
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (authState.user ? { user: authState.user } : null)) }));
vi.mock("@/lib/cloudflare", () => ({
  purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })),
  purgeThemeEdgeCache: vi.fn(async () => ({ success: false, skipped: true })),
  purgeInvitationEdgeCache: vi.fn(async () => undefined),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { composeInvitationData, composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { deletePublishedHtml } from "@/lib/staticPublisher";
import { renderBuilderPreview } from "@/lib/themeBuilder/server";
import { builderMediaSlots } from "@/lib/themeBuilder/mediaSlots";
import { simSlotsFor } from "@/lib/themeBuilder/simSlots";
import { defaultBuilderSpec, type BuilderSpec } from "@/lib/themeBuilder/spec";
import { POST as builderPost, PUT as builderPut, PATCH as builderPatch } from "@/app/api/admin/theme-builder/route";
import { PUT as masterEditorPut } from "@/app/api/admin/master-editor/route";
import { POST as uploadPost } from "@/app/api/client/upload/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { GET as getInvitation, PUT as updateInvitation } from "@/app/api/client/invitations/[id]/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const ROOT = process.cwd();
const RUN = `e2e-slot-${Date.now().toString(36)}`;
const ART_HOME = "/assets/ornaments/flowers/flower-tl.webp";
const ART_COVER = "/assets/ornaments/flowers/flower-tr.webp";
const ART_FREE = "/assets/ornaments/flowers/flower-br.webp";
const SIM_HOME = "/uploads/builder-sim/0123456789abcdef01234567.webp";
const SIM_SIDEBAR = "/uploads/builder-sim/abcdef0123456789abcdef01.webp";
const SIM_COVER = "/uploads/builder-sim/fedcba9876543210fedcba98.webp";
const SIM_PROFILE = "/uploads/builder-sim/111122223333444455556666.webp";

const cleanup = {
  themes: [] as Array<{ id: string; eventFolder: string; category: string }>,
  users: [] as string[],
  admins: [] as string[],
  invitations: [] as string[],
  restoredMediaSlots: new Map<string, unknown>(),
};

const jsonReq = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

async function makePng(r: number, g: number, b: number): Promise<Buffer> {
  return sharp({ create: { width: 64, height: 64, channels: 3, background: { r, g, b } } }).png().toBuffer();
}

describe.skipIf(!IS_TEST_DB)("E2E Theme Builder Fase 5 & Studio Klien", () => {
  process.env.AUTH_SECRET ||= "vitest-e2e-mediaslots-secret";

  afterAll(async () => {
    authState.user = null;
    for (const [id, prev] of cleanup.restoredMediaSlots) {
      if (prev === null) await prisma.$executeRaw`UPDATE themes SET media_slots = NULL WHERE id = ${id}`;
      else await prisma.theme.update({ where: { id }, data: { mediaSlots: prev as never } });
    }
    for (const invId of cleanup.invitations) {
      await deletePublishedHtml(invId);
      await prisma.invitationDraft.deleteMany({ where: { invitationId: invId } });
      fs.rmSync(path.join(ROOT, "data", "drafts", `${invId}.html`), { force: true });
      fs.rmSync(path.join(ROOT, "public", "uploads", "invitations", invId), { recursive: true, force: true });
    }
    await prisma.invitationMedia.deleteMany({ where: { invitationId: { in: cleanup.invitations } } });
    await prisma.invitation.deleteMany({ where: { userId: { in: cleanup.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: cleanup.users } } });
    await prisma.user.deleteMany({ where: { id: { in: cleanup.users } } });
    for (const t of cleanup.themes) {
      await prisma.themeBuilderRevision.deleteMany({ where: { themeId: t.id } });
      await prisma.theme.deleteMany({ where: { id: t.id } });
      fs.rmSync(path.join(ROOT, "themes", t.eventFolder, t.category, `${t.id}.html`), { force: true });
      fs.rmSync(path.join(ROOT, "public", "demo", t.id), { recursive: true, force: true });
    }
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: cleanup.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: cleanup.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("alur penuh Admin Builder Wedding -> Studio Klien -> Upload -> Render -> displayOrder -> Ganti Tema", async () => {
    const admin = await prisma.admin.create({
      data: { username: `${RUN}-adm`, email: `${RUN}-adm@t.local`, name: "Admin E2E", role: "SUPER_ADMIN", permissions: [] },
    });
    cleanup.admins.push(admin.id);
    authState.user = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };

    const weddingThemeId = `${RUN}-wed`;
    const weddingSpec: BuilderSpec = {
      ...defaultBuilderSpec("WEDDING"),
      desktopLayout: "centered",
      eventsPlacement: "home",
      ornaments: [
        { id: "e2ehome01", section: "opening", src: ART_HOME, x: 50, y: 20, anchor: "top", width: 40, rotate: 0, opacity: 1, flipX: false, layer: "front", replaceSlot: "HOME_PHOTO" },
        { id: "e2ecov002", section: "story", src: ART_COVER, x: 50, y: 50, anchor: "top", width: 35, rotate: 0, opacity: 1, flipX: true, layer: "back", replaceSlot: "LANDING_COVER" },
        { id: "e2ehid003", section: "events", src: ART_FREE, x: 50, y: 50, anchor: "top", width: 30, rotate: 0, opacity: 1, flipX: false, layer: "back", replaceSlot: "CLOSING_COVER" },
      ],
      freeSections: [
        {
          id: "free1",
          after: "story",
          eyebrow: "Potret",
          title: "Keluarga",
          body: "Doa restu.",
          align: "center",
          photo: { source: "replaceable", src: ART_FREE, slot: "GROOM_PHOTO", shape: "rect", position: "top" },
        },
      ],
    };

    const createThemeRes = await builderPost(jsonReq("/api/admin/theme-builder", "POST", {
      id: weddingThemeId,
      name: "E2E Slot Builder",
      category: "modern",
      description: "Tema E2E fase 5",
      spec: weddingSpec,
    }) as never);
    expect(createThemeRes.status).toBe(200);
    cleanup.themes.push({ id: weddingThemeId, eventFolder: "wedding", category: "modern" });

    const createdRow = await prisma.theme.findUniqueOrThrow({ where: { id: weddingThemeId } });
    const slots = createdRow.mediaSlots as Record<string, { places: string[]; preview?: string }>;
    expect(slots.DESKTOP_SIDEBAR).toBeUndefined();
    expect(slots.HOME_PHOTO).toEqual({ places: ["Ilustrasi di Pembuka"], preview: ART_HOME });
    expect(slots.LANDING_COVER).toEqual({ places: ["Sampul", "Ilustrasi di Kisah"], preview: ART_COVER });
    expect(slots.GROOM_PHOTO).toEqual({ places: ["Profil mempelai", "Seksi Keluarga"], preview: ART_FREE });
    // Ornamen di seksi #events tersembunyi karena eventsPlacement="home" tidak boleh masuk ke places CLOSING_COVER.
    expect(slots.CLOSING_COVER).toEqual({ places: ["Penutup"] });

    // Verifikasi pratinjau builder mode "client" vs "sim" (termasuk filtering DESKTOP_SIDEBAR).
    const clientPreview = await renderBuilderPreview(weddingSpec, undefined, "client");
    expect(clientPreview.issues).toEqual([]);
    expect(clientPreview.html).toContain(`class="lux-orn-art" src="${ART_HOME}"`);
    expect(clientPreview.html).not.toMatch(/lux-orn-art"[^>]*visibility:hidden/);

    const simPreview = await renderBuilderPreview(weddingSpec, undefined, "sim", {
      slots: { DESKTOP_SIDEBAR: SIM_SIDEBAR, HOME_PHOTO: SIM_HOME },
      gallery: [],
    });
    expect(simPreview.html).not.toContain(SIM_SIDEBAR);
    expect(simPreview.html).toContain(`class="lux-orn-photo" src="${SIM_HOME}"`);
    expect(simPreview.html).toMatch(/lux-orn-art"[^>]*visibility:hidden/);

    // Edit ulang via PUT + terbitkan via PATCH.
    const putThemeRes = await builderPut(jsonReq("/api/admin/theme-builder", "PUT", {
      id: weddingThemeId,
      name: "E2E Slot Builder Updated",
      category: "modern",
      description: "Tema E2E fase 5 updated",
      spec: weddingSpec,
    }) as never);
    expect(putThemeRes.status).toBe(200);

    const publishRes = await builderPatch(jsonReq("/api/admin/theme-builder", "PATCH", {
      id: weddingThemeId,
      isActive: true,
    }) as never);
    expect(publishRes.status).toBe(200);

    // ── Alur 2: User / Klien Studio ──
    const client = await prisma.user.create({
      data: { email: `${RUN}-client@t.local`, name: "Klien E2E" },
    });
    cleanup.users.push(client.id);
    await prisma.order.create({
      data: { userId: client.id, invoiceNumber: `${RUN}-ORD`, planType: "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() },
    });
    authState.user = { id: client.id, email: client.email, name: client.name, role: "CLIENT", isAdmin: false };

    const createInvRes = await createInvitation(jsonReq("/api/client/invitations/create", "POST", {
      eventType: "WEDDING",
      themeId: weddingThemeId,
      planType: "TIER_2",
      weddingDate: "2099-11-20",
      participantsJson: JSON.stringify({ groom: { name: "Raka", nickname: "Raka" }, bride: { name: "Dewi", nickname: "Dewi" } }),
    }));
    expect(createInvRes.status).toBe(200);
    const { invitationId } = await createInvRes.json();
    cleanup.invitations.push(invitationId);

    // Studio GET mengembalikan themeMediaSlots beserta preview dan tanpa DESKTOP_SIDEBAR.
    const studioGet1 = await getInvitation(jsonReq(`/api/client/invitations/${invitationId}`, "GET") as never, {
      params: Promise.resolve({ id: invitationId }),
    });
    expect(studioGet1.status).toBe(200);
    const studioJson1 = await studioGet1.json();
    expect(studioJson1.themeMediaSlots.DESKTOP_SIDEBAR).toBeUndefined();
    expect(studioJson1.themeMediaSlots.HOME_PHOTO).toEqual({ places: ["Ilustrasi di Pembuka"], preview: ART_HOME });

    // Render 1 (0 unggahan klien): semua ilustrasi tema tampil, 0 token tersisa.
    const renderData1 = (await composeTemplateData(invitationId)) as Record<string, any>;
    const html1 = await renderTemplateFile(weddingThemeId, renderData1);
    expect(renderData1.clientHomePhoto).toBe(false);
    expect(renderData1.clientCoverPhoto).toBe(false);
    expect(renderData1.clientFirstPhoto).toBe(false);
    expect(html1).toContain(`class="lux-orn-art" src="${ART_HOME}"`);
    expect(html1).toContain(`class="lux-orn-art" src="${ART_COVER}"`);
    expect(html1).toContain(`<img src="${ART_FREE}"`);
    expect(html1).not.toContain('class="lux-orn-photo"');
    expect(html1.match(/\{\{[^}]*\}\}/g) ?? []).toEqual([]);

    // Upload nyata 1: hanya GLOBAL_FIXED_BG (TIDAK boleh memicu clientCoverPhoto).
    const uploadSlot = async (slot: string, rgb: [number, number, number], ipSuffix: number) => {
      const fd = new FormData();
      fd.append("invitationId", invitationId);
      fd.append("slot", slot);
      fd.append("file", new File([new Uint8Array(await makePng(...rgb))], `${slot}.png`, { type: "image/png" }));
      const req = new NextRequest("http://localhost/api/client/upload", {
        method: "POST",
        headers: { "x-real-ip": `127.0.1.${ipSuffix}` },
        body: fd,
      });
      const res = await uploadPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.url).toMatch(new RegExp(`^/uploads/invitations/${invitationId}/`));
      return data.url as string;
    };

    const bgUrl = await uploadSlot("GLOBAL_FIXED_BG", [30, 40, 50], 1);
    const saveBg = await updateInvitation(
      jsonReq(`/api/client/invitations/${invitationId}`, "PUT", { media: { GLOBAL_FIXED_BG: bgUrl } }),
      { params: Promise.resolve({ id: invitationId }) },
    );
    expect(saveBg.status).toBe(200);

    const renderData2 = (await composeTemplateData(invitationId)) as Record<string, any>;
    const html2 = await renderTemplateFile(weddingThemeId, renderData2);
    expect(renderData2.clientCoverPhoto).toBe(false);
    expect(html2).toContain(`class="lux-orn-art" src="${ART_COVER}"`);
    expect(html2).not.toMatch(/data-orn-id="e2ecov002"[\s\S]*?class="lux-orn-photo"/);

    // Upload nyata 2: HOME_PHOTO & GROOM_PHOTO -> foto klien menggantikan ilustrasi tema.
    const homeUrl = await uploadSlot("HOME_PHOTO", [180, 120, 80], 2);
    const groomUrl = await uploadSlot("GROOM_PHOTO", [80, 140, 190], 3);
    const savePhotos = await updateInvitation(
      jsonReq(`/api/client/invitations/${invitationId}`, "PUT", {
        media: { HOME_PHOTO: homeUrl, GROOM_PHOTO: groomUrl },
      }),
      { params: Promise.resolve({ id: invitationId }) },
    );
    expect(savePhotos.status).toBe(200);

    const renderData3 = (await composeTemplateData(invitationId)) as Record<string, any>;
    const html3 = await renderTemplateFile(weddingThemeId, renderData3);
    expect(renderData3.clientHomePhoto).toBe(true);
    expect(renderData3.clientFirstPhoto).toBe(true);
    expect(html3).toContain(`class="lux-orn-photo" src="${homeUrl}"`);
    expect(html3).toContain(`<img src="${groomUrl}"`);

    // Uji displayOrder BRIDE_FIRST: GROOM_PHOTO menjadi secondPhoto -> clientFirstPhoto false, clientSecondPhoto true.
    const setBrideFirst = await updateInvitation(
      jsonReq(`/api/client/invitations/${invitationId}`, "PUT", { featureSettings: { displayOrder: "BRIDE_FIRST" } }),
      { params: Promise.resolve({ id: invitationId }) },
    );
    expect(setBrideFirst.status).toBe(200);

    const renderData4 = (await composeTemplateData(invitationId)) as Record<string, any>;
    const html4 = await renderTemplateFile(weddingThemeId, renderData4);
    expect(renderData4.clientFirstPhoto).toBe(false);
    expect(renderData4.clientSecondPhoto).toBe(true);
    expect(html4).toContain(`<img src="${ART_FREE}"`);

    // Uji ganti tema ke tema dengan deklarasi tanpa HOME_PHOTO: baris media tetap tersimpan tetapi tak dirender.
    const secondThemeId = "kalandra";
    cleanup.restoredMediaSlots.set(
      secondThemeId,
      (await prisma.theme.findUniqueOrThrow({ where: { id: secondThemeId }, select: { mediaSlots: true } })).mediaSlots,
    );
    authState.user = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    const declKalandra = await masterEditorPut(jsonReq("/api/admin/master-editor", "PUT", {
      masterId: secondThemeId,
      overrides: { colors: {}, fonts: {} },
      mediaSlots: { LANDING_COVER: { places: ["Sampul"] }, GROOM_PHOTO: { places: ["Mempelai"] }, BRIDE_PHOTO: { places: ["Mempelai"] } },
    }) as never);
    expect(declKalandra.status).toBe(200);

    authState.user = { id: client.id, email: client.email, name: client.name, role: "CLIENT", isAdmin: false };
    const switchTheme = await updateInvitation(
      jsonReq(`/api/client/invitations/${invitationId}`, "PUT", { themeId: secondThemeId }),
      { params: Promise.resolve({ id: invitationId }) },
    );
    expect(switchTheme.status).toBe(200);

    const afterSwitch = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, include: { media: true } });
    expect((afterSwitch.themeMediaSlots as Record<string, unknown>).HOME_PHOTO).toBeUndefined();
    expect(afterSwitch.media.some((m) => m.mediaSlot === "HOME_PHOTO" && m.localPath === homeUrl)).toBe(true);

    const renderAfterSwitch = (await composeTemplateData(invitationId)) as Record<string, any>;
    expect(renderAfterSwitch.homePhotoUrl).toBe("");
    expect(renderAfterSwitch.clientHomePhoto).toBe(false);

    // Hapus foto sisa dari Studio: baris HOME_PHOTO terhapus dari DB dan berkas fisik dihapus.
    const deleteUnusedHome = await updateInvitation(
      jsonReq(`/api/client/invitations/${invitationId}`, "PUT", { media: { HOME_PHOTO: "" } }),
      { params: Promise.resolve({ id: invitationId }) },
    );
    expect(deleteUnusedHome.status).toBe(200);
    const remainingMedia = await prisma.invitationMedia.findMany({ where: { invitationId } });
    expect(remainingMedia.some((m) => m.mediaSlot === "HOME_PHOTO")).toBe(false);
  });

  it("alur Single-Name PERSONAL: simSlotsFor tampilkan Foto profil utama; cover tidak menimpa ilustrasi profil", async () => {
    const admin = await prisma.admin.create({
      data: { username: `${RUN}-adm2`, email: `${RUN}-adm2@t.local`, name: "Admin Bday E2E", role: "SUPER_ADMIN", permissions: [] },
    });
    cleanup.admins.push(admin.id);
    authState.user = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };

    const bdayThemeId = `${RUN}-bday`;
    const bdaySpec: BuilderSpec = {
      ...defaultBuilderSpec("PERSONAL"),
      ornaments: [
        { id: "e2ebday01", section: "opening", src: ART_FREE, x: 50, y: 30, anchor: "top", width: 35, rotate: 0, opacity: 1, flipX: false, layer: "front", replaceSlot: "PROFILE_PHOTO" },
      ],
    };

    const res = await builderPost(jsonReq("/api/admin/theme-builder", "POST", {
      id: bdayThemeId,
      name: "E2E Birthday Slot",
      category: "modern",
      description: "Tema Birthday E2E",
      subEvent: "Ulang Tahun",
      spec: bdaySpec,
    }) as never);
    expect(res.status).toBe(200);
    cleanup.themes.push({ id: bdayThemeId, eventFolder: "personal", category: "modern" });

    const bdaySlots = simSlotsFor("PERSONAL");
    expect(bdaySlots.find((s) => s.slot === "PROFILE_PHOTO")?.label).toBe("Foto profil utama");
    expect(bdaySlots.some((s) => s.slot === "BRIDE_PHOTO")).toBe(false);

    const row = await prisma.theme.findUniqueOrThrow({ where: { id: bdayThemeId } });
    expect((row.mediaSlots as Record<string, { preview?: string }>).PROFILE_PHOTO?.preview).toBe(ART_FREE);

    // Simulasi hanya LANDING_COVER terisi: composePersonalData mem-fallback personPhotoUrl ke cover, namun
    // clientMainPhoto wajib tetap false sehingga ilustrasi PROFILE_PHOTO tidak tergantikan oleh sampul.
    const simCoverOnly = await renderBuilderPreview(bdaySpec, undefined, "sim", {
      slots: { LANDING_COVER: SIM_COVER },
      gallery: [],
    });
    expect(simCoverOnly.html).toContain(`class="lux-orn-art" src="${ART_FREE}"`);
    expect(simCoverOnly.html).not.toMatch(/data-orn-id="e2ebday01"[\s\S]*?class="lux-orn-photo"/);

    // Simulasi PROFILE_PHOTO terisi: ilustrasi diganti foto profil uji.
    const simProfile = await renderBuilderPreview(bdaySpec, undefined, "sim", {
      slots: { LANDING_COVER: SIM_COVER, PROFILE_PHOTO: SIM_PROFILE },
      gallery: [],
    });
    expect(simProfile.html).toContain(`class="lux-orn-photo" src="${SIM_PROFILE}"`);
    expect(simProfile.html).toMatch(/lux-orn-art"[^>]*visibility:hidden/);

    // Pastikan composeInvitationData langsung untuk PERSONAL juga menghormati deklarasi builderMediaSlots.
    const composed = (await composeInvitationData({
      id: "virtual-bday-e2e",
      themeId: bdayThemeId,
      eventType: "PERSONAL",
      subEvent: "Ulang Tahun",
      participantsJson: { person: { name: "Nadia", nickname: "Nadia", age: "17" } },
      eventData: [{ title: "Sweet 17", date: "2099-08-10", time: "19:00 WIB", isPrimary: true }],
      media: [{ mediaSlot: "LANDING_COVER", localPath: SIM_COVER }],
      themeMediaSlots: builderMediaSlots(bdaySpec),
      featureSettings: {},
      builderSpec: bdaySpec,
      rsvps: [],
    })) as Record<string, any>;
    expect(composed.clientCoverPhoto).toBe(true);
    expect(composed.clientMainPhoto).toBe(false);
  });
});
