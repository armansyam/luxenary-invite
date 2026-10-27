/**
 * Media bawaan tema (27 Okt 2026): aturan slot dan path yang sah, penyuntikan di engine tanpa mengalahkan foto klien,
 * galeri tidak diisi gambar bawaan, OG tidak memakai foto demo, validasi API admin, serta penyalinan (pembekuan) ke
 * undangan saat dibuat dan saat tema diganti. Bagian DB hanya berjalan di database `luxenary_test`.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeInvitationEdgeCache: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { applyThemeDefaultMedia, parseThemeDefaultMedia, validateThemeDefaultMedia } from "@/lib/themeDefaultMedia";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { GET as getInvitation, PUT as updateInvitation } from "@/app/api/client/invitations/[id]/route";
import { PUT as themesPut } from "@/app/api/admin/themes/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_defmedia_${Date.now()}`;
const COVER = "/assets/ornaments/background/background-cream.webp";
const SIDEBAR = "/assets/ornaments/background/background-flower.webp";
const BG = "/assets/ornaments/background/background-red.webp";

describe("aturan media bawaan tema", () => {
  it("hanya slot milik tema dan path aset tema yang diterima", () => {
    expect(parseThemeDefaultMedia({ LANDING_COVER: COVER, GROOM_PHOTO: COVER, HOME_PHOTO: COVER, GALLERY: COVER })).toEqual({ LANDING_COVER: COVER });
    expect(parseThemeDefaultMedia({ LANDING_COVER: "/demo/kalandra/cover.webp" })).toEqual({});
    expect(parseThemeDefaultMedia({ LANDING_COVER: "/uploads/invitations/x/cover.webp" })).toEqual({});
    expect(parseThemeDefaultMedia({ LANDING_COVER: "https://example.com/a.webp" })).toEqual({});
    expect(parseThemeDefaultMedia({ LANDING_COVER: "/assets/ornaments/../../secret.webp" })).toEqual({});
    expect(parseThemeDefaultMedia(null)).toEqual({});
    expect(parseThemeDefaultMedia([COVER])).toEqual({});
  });

  it("validasi admin menolak dengan pesan, bukan membuang diam-diam", () => {
    expect(validateThemeDefaultMedia({ GROOM_PHOTO: COVER })).toMatchObject({ ok: false });
    expect(validateThemeDefaultMedia({ LANDING_COVER: "/demo/kalandra/cover.webp" })).toMatchObject({ ok: false });
    expect(validateThemeDefaultMedia("x")).toMatchObject({ ok: false });
    expect(validateThemeDefaultMedia({ LANDING_COVER: COVER, CLOSING_COVER: "" })).toEqual({ ok: true, value: { LANDING_COVER: COVER } });
    expect(validateThemeDefaultMedia(null)).toEqual({ ok: true, value: {} });
  });

  it("bawaan mengisi slot kosong, foto klien menang, latar tidak disuntikkan, cover bawaan mengalah pada latar klien", () => {
    const defaults = { LANDING_COVER: COVER, DESKTOP_SIDEBAR: SIDEBAR, GLOBAL_FIXED_BG: BG };
    const empty = applyThemeDefaultMedia([], defaults);
    expect(empty.map((m) => [m.mediaSlot, m.localPath])).toEqual([["LANDING_COVER", COVER], ["DESKTOP_SIDEBAR", SIDEBAR]]);
    expect(empty.every((m) => (m as { isThemeDefault?: boolean }).isThemeDefault)).toBe(true);

    const clientCover = [{ mediaSlot: "LANDING_COVER", localPath: "/uploads/invitations/a/c.webp" }];
    expect(applyThemeDefaultMedia(clientCover, defaults).filter((m) => m.mediaSlot === "LANDING_COVER")).toEqual(clientCover);

    const clientBg = [{ mediaSlot: "GLOBAL_FIXED_BG", localPath: "/uploads/invitations/a/bg.webp" }];
    expect(applyThemeDefaultMedia(clientBg, defaults).some((m) => m.mediaSlot === "LANDING_COVER")).toBe(false);

    const input = [{ mediaSlot: "HOME_PHOTO", localPath: "/uploads/invitations/a/h.webp" }];
    applyThemeDefaultMedia(input, defaults);
    expect(input).toHaveLength(1);
  });
});

describe("engine: bawaan tema di data undangan", () => {
  const virtual = (overrides: Record<string, unknown>) => ({ ...buildDemoInvitation("kalandra"), media: [], ...overrides });

  it("cover bawaan dipakai saat klien belum mengunggah; foto klien tetap menang", async () => {
    const bare = (await composeInvitationData(virtual({ themeDefaultMedia: { LANDING_COVER: COVER } }))) as Record<string, unknown>;
    expect(bare.landingCoverUrl).toBe(COVER);

    const own = "/uploads/invitations/klien/cover.webp";
    const owned = (await composeInvitationData(virtual({ themeDefaultMedia: { LANDING_COVER: COVER }, media: [{ mediaSlot: "LANDING_COVER", localPath: own }] }))) as Record<string, unknown>;
    expect(owned.landingCoverUrl).toBe(own);
  });

  it("tanpa bawaan dan tanpa foto klien: cover kosong, bukan foto demo", async () => {
    const data = (await composeInvitationData(virtual({ themeDefaultMedia: null }))) as Record<string, unknown>;
    expect(data.landingCoverUrl).toBe("");
  });

  it("tema satu nama: galeri kosong tidak diisi gambar bawaan, cover klien tetap jadi cadangan galeri", async () => {
    const base = buildDemoInvitation("kalandra-birthday", { galleryPhotos: [] });
    const bare = (await composeInvitationData({ ...base, media: [], themeDefaultMedia: { LANDING_COVER: COVER } })) as Record<string, unknown>;
    expect(bare.landingCoverUrl).toBe(COVER);
    expect([1, 2, 3, 4, 5, 6].map((n) => bare[`galleryPhoto${n}`])).toEqual(["", "", "", "", "", ""]);

    const own = "/uploads/invitations/klien/cover.webp";
    const owned = (await composeInvitationData({ ...base, media: [{ mediaSlot: "LANDING_COVER", localPath: own }], themeDefaultMedia: { LANDING_COVER: COVER } })) as Record<string, unknown>;
    expect(owned.galleryPhoto1).toBe(own);
  });

  it("gambar OG tanpa cover memakai banner platform, bukan foto model demo", async () => {
    const data = await composeInvitationData(virtual({ themeDefaultMedia: null }));
    const serialized = JSON.stringify(data);
    expect(serialized).toContain("/assets/brand/og-banner.jpg");
    expect(serialized).not.toContain("/demo/kalandra/cover.webp");
  });
});

describe.skipIf(!IS_TEST_DB)("API admin dan penyalinan ke undangan", () => {
  const created = { users: [] as string[], admins: [] as string[] };
  const original = new Map<string, unknown>();
  const THEME_A = "kalandra";
  const THEME_B = "verona";
  process.env.AUTH_SECRET ||= "vitest-defmedia-signing-secret";

  const request = (url: string, method: string, body: unknown) =>
    new NextRequest(`http://localhost${url}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

  afterAll(async () => {
    sessionUser = null;
    for (const [id, value] of original) {
      await prisma.theme.update({ where: { id }, data: { defaultMedia: (value ?? undefined) as never } });
      if (value === null) await prisma.$executeRaw`UPDATE themes SET default_media = NULL WHERE id = ${id}`;
    }
    await prisma.invitation.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("PUT admin tema: menolak foto demo dan slot foto personal, menyimpan bawaan yang sah", async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    created.admins.push(admin.id);
    sessionUser = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    for (const id of [THEME_A, THEME_B]) original.set(id, (await prisma.theme.findUniqueOrThrow({ where: { id }, select: { defaultMedia: true } })).defaultMedia);

    const bad = await themesPut(request("/api/admin/themes", "PUT", { id: THEME_A, defaultMedia: { LANDING_COVER: "/demo/kalandra/cover.webp" } }));
    expect(bad.status).toBe(400);
    const personal = await themesPut(request("/api/admin/themes", "PUT", { id: THEME_A, defaultMedia: { GROOM_PHOTO: COVER } }));
    expect(personal.status).toBe(400);

    const ok = await themesPut(request("/api/admin/themes", "PUT", { id: THEME_A, defaultMedia: { LANDING_COVER: COVER, GLOBAL_FIXED_BG: BG } }));
    expect(ok.status).toBe(200);
    const okB = await themesPut(request("/api/admin/themes", "PUT", { id: THEME_B, defaultMedia: { LANDING_COVER: SIDEBAR } }));
    expect(okB.status).toBe(200);
    expect((await prisma.theme.findUniqueOrThrow({ where: { id: THEME_A } })).defaultMedia).toEqual({ LANDING_COVER: COVER, GLOBAL_FIXED_BG: BG });
  });

  it("undangan baru menyalin bawaan tema, tidak ikut berubah saat admin mengubah tema, dan disalin ulang saat tema diganti", async () => {
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
    expect(inv.themeDefaultMedia).toEqual({ LANDING_COVER: COVER, GLOBAL_FIXED_BG: BG });

    // Studio klien membaca bawaan tema dari respons GET undangan.
    const studio = await getInvitation(request(`/api/client/invitations/${inv.id}`, "GET", undefined) as never, { params: Promise.resolve({ id: inv.id }) });
    expect(studio.status).toBe(200);
    expect((await studio.json()).themeDefaultMedia).toEqual({ LANDING_COVER: COVER, GLOBAL_FIXED_BG: BG });

    sessionUser = { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    await themesPut(request("/api/admin/themes", "PUT", { id: THEME_A, defaultMedia: { LANDING_COVER: SIDEBAR } }));
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } })).themeDefaultMedia).toEqual({ LANDING_COVER: COVER, GLOBAL_FIXED_BG: BG });

    sessionUser = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };
    const change = await updateInvitation(request(`/api/client/invitations/${inv.id}`, "PUT", { themeId: THEME_B }), { params: Promise.resolve({ id: inv.id }) });
    expect(change.status).toBe(200);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } })).themeDefaultMedia).toEqual({ LANDING_COVER: SIDEBAR });
  });
});
