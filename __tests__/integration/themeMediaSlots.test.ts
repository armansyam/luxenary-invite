/**
 * Slot media per tema (19 Nov 2026), alur penuh di database `luxenary_test`: admin mendeklarasikan slot (themes PUT dan
 * Editor Master), undangan menyalin deklarasi saat dibuat dan saat tema diganti, varian mewarisi deklarasi induk, engine
 * membuang foto slot yang tidak dipakai tanpa menghapus barisnya, dan tema tanpa deklarasi (null) tidak berubah.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeThemeEdgeCache: vi.fn(async () => ({ success: false, skipped: true })), purgeInvitationEdgeCache: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { GET as getInvitation, PUT as updateInvitation } from "@/app/api/client/invitations/[id]/route";
import { PUT as themesPut } from "@/app/api/admin/themes/route";
import { GET as variantsGet, PUT as variantsPut } from "@/app/api/admin/theme-variants/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_mediaslots_${Date.now()}`;
const THEME_A = "kalandra";
const THEME_B = "verona";
const VARIANT = `${TAG}-varian`;
const HOME = "/uploads/invitations/klien/home.webp";
const COVER = "/uploads/invitations/klien/cover.webp";

describe("engine: slot yang tidak dipakai tema", () => {
  const virtual = (overrides: Record<string, unknown>) => ({ ...buildDemoInvitation(THEME_A), ...overrides });
  const media = [{ mediaSlot: "HOME_PHOTO", localPath: HOME }, { mediaSlot: "LANDING_COVER", localPath: COVER }];

  it("foto di slot tak dideklarasikan tidak dirender; slot yang dideklarasikan tetap", async () => {
    const data = (await composeInvitationData(virtual({ media, themeMediaSlots: { LANDING_COVER: { places: ["Sampul"] } } }))) as Record<string, unknown>;
    expect(data.landingCoverUrl).toBe(COVER);
    expect(data.homePhotoUrl).toBe("");
    expect(data.hasCustomHomePhoto).toBe(false);
  });

  it("tema tanpa deklarasi (null) merender semua slot seperti sebelumnya", async () => {
    const data = (await composeInvitationData(virtual({ media, themeMediaSlots: null }))) as Record<string, unknown>;
    expect(data.homePhotoUrl).toBe(HOME);
    expect(data.hasCustomHomePhoto).toBe(true);
  });

  it("latar klien di slot tak dipakai tidak membatalkan cover bawaan tema", async () => {
    const ART = "/assets/ornaments/background/background-cream.webp";
    const bg = [{ mediaSlot: "GLOBAL_FIXED_BG", localPath: "/uploads/invitations/klien/bg.webp" }];
    const declared = (await composeInvitationData(virtual({ media: bg, themeDefaultMedia: { LANDING_COVER: ART }, themeMediaSlots: { LANDING_COVER: { places: [] } } }))) as Record<string, unknown>;
    expect(declared.landingCoverUrl).toBe(ART);
    const legacy = (await composeInvitationData(virtual({ media: bg, themeDefaultMedia: { LANDING_COVER: ART }, themeMediaSlots: null }))) as Record<string, unknown>;
    expect(legacy.landingCoverUrl).not.toBe(ART);
  });
});

describe.skipIf(!IS_TEST_DB)("API: deklarasi slot dan salinannya di undangan", () => {
  const created = { users: [] as string[], admins: [] as string[] };
  const original = new Map<string, unknown>();
  process.env.AUTH_SECRET ||= "vitest-mediaslots-signing-secret";

  const request = (url: string, method: string, body: unknown) =>
    new NextRequest(`http://localhost${url}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

  afterAll(async () => {
    sessionUser = null;
    for (const [id, value] of original) {
      if (value === null) await prisma.$executeRaw`UPDATE themes SET media_slots = NULL WHERE id = ${id}`;
      else await prisma.theme.update({ where: { id }, data: { mediaSlots: value as never } });
    }
    await prisma.invitation.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.theme.deleteMany({ where: { id: VARIANT } });
    await prisma.order.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("admin: themes PUT dan Editor Master memvalidasi, menyimpan, dan mengosongkan deklarasi", async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    created.admins.push(admin.id);
    sessionUser = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    for (const id of [THEME_A, THEME_B]) original.set(id, (await prisma.theme.findUniqueOrThrow({ where: { id }, select: { mediaSlots: true } })).mediaSlots);

    expect((await themesPut(request("/api/admin/themes", "PUT", { id: THEME_A, mediaSlots: { GALLERY: { places: [] } } }))).status).toBe(400);
    expect((await themesPut(request("/api/admin/themes", "PUT", { id: THEME_A, mediaSlots: { LANDING_COVER: { places: ["Sampul"] }, GROOM_PHOTO: { places: ["Mempelai"] }, BRIDE_PHOTO: { places: ["Mempelai"] } } }))).status).toBe(200);
    expect((await prisma.theme.findUniqueOrThrow({ where: { id: THEME_A } })).mediaSlots).toEqual({ LANDING_COVER: { places: ["Sampul"] }, GROOM_PHOTO: { places: ["Mempelai"] }, BRIDE_PHOTO: { places: ["Mempelai"] } });

    // Editor Master: GET mengirim deklarasi, PUT menyimpannya bersama suntingan (overrides kosong = master asli).
    await prisma.$executeRaw`UPDATE themes SET media_slots = NULL WHERE id = ${THEME_B}`;
    const loaded = await variantsGet(request(`/api/admin/theme-variants?master=${THEME_B}`, "GET", undefined));
    expect(loaded.status).toBe(200);
    expect((await loaded.json()).master.mediaSlots).toBeNull();
    const bad = await variantsPut(request("/api/admin/theme-variants", "PUT", { masterId: THEME_B, overrides: { colors: {}, fonts: {} }, mediaSlots: { HOME_PHOTO: { places: [""] } } }));
    expect(bad.status).toBe(400);
    const ok = await variantsPut(request("/api/admin/theme-variants", "PUT", { masterId: THEME_B, overrides: { colors: {}, fonts: {} }, mediaSlots: { HOME_PHOTO: { places: ["Latar Home"] } } }));
    expect(ok.status).toBe(200);
    expect((await prisma.theme.findUniqueOrThrow({ where: { id: THEME_B } })).mediaSlots).toEqual({ HOME_PHOTO: { places: ["Latar Home"] } });
    const cleared = await variantsPut(request("/api/admin/theme-variants", "PUT", { masterId: THEME_B, overrides: { colors: {}, fonts: {} }, mediaSlots: null }));
    expect(cleared.status).toBe(200);
    expect((await prisma.theme.findUniqueOrThrow({ where: { id: THEME_B } })).mediaSlots).toBeNull();
    await variantsPut(request("/api/admin/theme-variants", "PUT", { masterId: THEME_B, overrides: { colors: {}, fonts: {} }, mediaSlots: { HOME_PHOTO: { places: ["Latar Home"] } } }));
  });

  it("undangan menyalin deklarasi, menyalin ulang saat ganti tema tanpa menghapus foto, varian mewarisi induk", async () => {
    const user = await prisma.user.create({ data: { email: `${TAG}@client.local`, name: "Klien Uji" } });
    created.users.push(user.id);
    await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-1`, planType: "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() } });
    sessionUser = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };

    const res = await createInvitation(request("/api/client/invitations/create", "POST", {
      eventType: "WEDDING", themeId: THEME_A, planType: "TIER_2",
      participantsJson: JSON.stringify({ groom: { name: "Raka", nickname: "Raka" }, bride: { name: "Dewi", nickname: "Dewi" } }),
    }));
    expect(res.status).toBe(200);
    const inv = await prisma.invitation.findFirstOrThrow({ where: { userId: user.id } });
    expect(inv.themeMediaSlots).toEqual({ LANDING_COVER: { places: ["Sampul"] }, GROOM_PHOTO: { places: ["Mempelai"] }, BRIDE_PHOTO: { places: ["Mempelai"] } });

    const params = { params: Promise.resolve({ id: inv.id }) };
    const saveHome = await updateInvitation(request(`/api/client/invitations/${inv.id}`, "PUT", { media: { HOME_PHOTO: HOME } }), params);
    expect(saveHome.status).toBe(200);

    // Studio membaca deklarasi dari GET; foto Home tersimpan walau tema A tidak memakainya.
    const studio = await (await getInvitation(request(`/api/client/invitations/${inv.id}`, "GET", undefined) as never, params)).json();
    expect(studio.themeMediaSlots.HOME_PHOTO).toBeUndefined();
    expect(studio.mediaMap.HOME_PHOTO).toBe(HOME);

    const change = await updateInvitation(request(`/api/client/invitations/${inv.id}`, "PUT", { themeId: THEME_B }), params);
    expect(change.status).toBe(200);
    const afterChange = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, include: { media: true } });
    expect(afterChange.themeMediaSlots).toEqual({ HOME_PHOTO: { places: ["Latar Home"] } });
    expect(afterChange.media.find((m) => m.mediaSlot === "HOME_PHOTO")?.localPath).toBe(HOME);

    // Varian tanpa deklarasi sendiri memakai deklarasi master induknya.
    await prisma.theme.create({ data: { id: VARIANT, name: "Varian Uji", category: "minimalist", eventType: "WEDDING", parentTheme: THEME_A, masterOverrides: { colors: {}, fonts: {} }, isActive: true } });
    const toVariant = await updateInvitation(request(`/api/client/invitations/${inv.id}`, "PUT", { themeId: VARIANT }), params);
    expect(toVariant.status).toBe(200);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } })).themeMediaSlots).toEqual({ LANDING_COVER: { places: ["Sampul"] }, GROOM_PHOTO: { places: ["Mempelai"] }, BRIDE_PHOTO: { places: ["Mempelai"] } });
  });
});
