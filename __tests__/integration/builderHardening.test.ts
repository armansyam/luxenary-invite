/**
 * Pengerasan alur admin builder dan ganti tema klien (database `luxenary_test`): label yang belum diubah klien
 * mengikuti tema baru, versi simpan (etag) menolak simpan dari salinan basi, jejak audit, batas piksel unggahan.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeInvitationEdgeCache: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma, pool } from "@/lib/prisma";
import { GET as builderGet, PATCH as builderPatch, POST as builderPost, PUT as builderPut } from "@/app/api/admin/theme-builder/route";
import { POST as assetsPost } from "@/app/api/admin/theme-builder/assets/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { PUT as updateInvitation } from "@/app/api/client/invitations/[id]/route";
import { builderMasterPath, THEME_ASSET_DIR } from "@/lib/themeBuilder/server";
import { defaultBuilderSpec } from "@/lib/themeBuilder/spec";
import { reconcileLabelsOnThemeChange } from "@/lib/themeLabels";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_bhard_${Date.now()}`;
process.env.AUTH_SECRET ||= "vitest-bhard-signing-secret";

const request = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

describe("reconcileLabelsOnThemeChange", () => {
  it("label yang sama dengan snapshot ikut tema baru; yang diedit klien dipertahankan", () => {
    const out = reconcileLabelsOnThemeChange(
      { openBtn: "Buka A", coupleTitle: "Judul Klien", navHome: "Home" },
      { openBtn: "Buka A", coupleTitle: "Judul A", navHome: "Home" },
      { openBtn: "Buka B", coupleTitle: "Judul B", closingSub: "Salam B" },
    );
    expect(out.customLabels).toEqual({ openBtn: "Buka B", coupleTitle: "Judul Klien", closingSub: "Salam B" });
    expect(out.labelDefaults).toEqual({ openBtn: "Buka B", coupleTitle: "Judul B", closingSub: "Salam B" });
  });

  it("tanpa snapshot semua label dianggap diedit klien", () => {
    const out = reconcileLabelsOnThemeChange({ openBtn: "Buka A" }, undefined, { openBtn: "Buka B", coupleTitle: "Judul B" });
    expect(out.customLabels).toEqual({ openBtn: "Buka A", coupleTitle: "Judul B" });
  });

  it("label kosong yang disengaja klien tidak ditimpa", () => {
    const out = reconcileLabelsOnThemeChange({ openingGreeting: "" }, { openingGreeting: "Salam" }, { openingGreeting: "Halo" });
    expect(out.customLabels.openingGreeting).toBe("");
  });
});

describe.skipIf(!IS_TEST_DB)("alur admin dan ganti tema klien", () => {
  const created = { users: [] as string[], admins: [] as string[], themes: [] as string[], drafts: [] as string[], files: [] as string[] };

  afterAll(async () => {
    sessionUser = null;
    await prisma.invitation.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    for (const id of created.themes) {
      const theme = await prisma.theme.findUnique({ where: { id }, select: { category: true } });
      await prisma.theme.deleteMany({ where: { id } });
      if (theme) fs.rmSync(builderMasterPath(theme.category as "modern", id), { force: true });
    }
    for (const f of created.drafts) fs.rmSync(f, { force: true });
    for (const f of created.files) fs.rmSync(path.join(THEME_ASSET_DIR, f), { force: true });
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  const saveTheme = async (name: string, texts: Record<string, string>) => {
    const res = await builderPost(request("/api/admin/theme-builder", "POST", { name: `${name} ${TAG}`, category: "modern", description: "uji", spec: { ...defaultBuilderSpec(), texts } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    created.themes.push(body.theme.id);
    const publish = await builderPatch(request("/api/admin/theme-builder", "PATCH", { id: body.theme.id, isActive: true }));
    expect(publish.status).toBe(200);
    return body as { theme: { id: string }; etag: string };
  };

  it("admin: etag menolak simpan basi, jejak audit tercatat, unggahan bermegapiksel besar ditolak", async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    created.admins.push(admin.id);
    sessionUser = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };

    const a = await saveTheme("Tema A", { openBtn: "Buka A", coupleTitle: "Judul A" });
    expect(a.etag).toMatch(/^[a-f0-9]{16}$/);

    const opened = await (await builderGet(request(`/api/admin/theme-builder?id=${a.theme.id}`, "GET"))).json();
    expect(opened.etag).toBe(a.etag);

    const spec = opened.spec;
    const first = await builderPut(request("/api/admin/theme-builder", "PUT", { id: a.theme.id, name: `Tema A ${TAG}`, category: "modern", description: "uji", spec: { ...spec, texts: { ...spec.texts, openBtn: "Buka A2" } }, baseEtag: opened.etag }));
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.etag).not.toBe(opened.etag);

    // Salinan basi (dibuka sebelum simpan di atas) ditolak dan tidak menimpa.
    const stale = await builderPut(request("/api/admin/theme-builder", "PUT", { id: a.theme.id, name: `Tema A ${TAG}`, category: "modern", description: "uji", spec: { ...spec, texts: { openBtn: "Timpa Basi" } }, baseEtag: opened.etag }));
    expect(stale.status).toBe(409);
    expect((await stale.json()).code).toBe("STALE");
    const kept = await prisma.theme.findUniqueOrThrow({ where: { id: a.theme.id }, select: { builderSpec: true } });
    expect((kept.builderSpec as { texts: Record<string, string> }).texts.openBtn).toBe("Buka A2");

    const fresh = await builderPut(request("/api/admin/theme-builder", "PUT", { id: a.theme.id, name: `Tema A ${TAG}`, category: "modern", description: "uji", spec: { ...spec, texts: { openBtn: "Buka A3" } }, baseEtag: firstBody.etag }));
    expect(fresh.status).toBe(200);

    const actions = (await prisma.adminAuditLog.findMany({ where: { adminId: admin.id }, select: { action: true } })).map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(["THEME_BUILDER_CREATE", "THEME_BUILDER_PUBLISH", "THEME_BUILDER_SAVE"]));

    // PNG 9000x9000 (81 MP) kecil di disk tetapi mahal di memori: ditolak sebelum didekode.
    const huge = await sharp({ create: { width: 9000, height: 9000, channels: 3, background: "#336699" } }).png({ compressionLevel: 9 }).toBuffer();
    const form = new FormData();
    form.append("file", new File([new Uint8Array(huge)], "besar.png", { type: "image/png" }));
    const rejected = await assetsPost(new NextRequest("http://localhost/api/admin/theme-builder/assets", { method: "POST", body: form }));
    expect(rejected.status).toBe(413);

    const small = await sharp({ create: { width: 200, height: 300, channels: 3, background: "#aa5533" } }).jpeg().toBuffer();
    const okForm = new FormData();
    okForm.append("file", new File([new Uint8Array(small)], "kecil.jpg", { type: "image/jpeg" }));
    const accepted = await assetsPost(new NextRequest("http://localhost/api/admin/theme-builder/assets", { method: "POST", body: okForm }));
    expect(accepted.status).toBe(200);
    created.files.push(path.basename((await accepted.json()).url));
    expect((await prisma.adminAuditLog.findMany({ where: { adminId: admin.id, action: "THEME_ASSET_UPLOAD" } })).length).toBe(1);
  });

  it("klien ganti tema: label belum diedit mengikuti tema baru, edit klien bertahan; undangan lama tanpa snapshot juga", async () => {
    const a = created.themes[0];
    const b = (await saveTheme("Tema B", { openBtn: "Buka B", coupleTitle: "Judul B", coverBadge: "BADGE B" })).theme.id;

    const user = await prisma.user.create({ data: { email: `${TAG}@client.local`, name: "Klien Uji" } });
    created.users.push(user.id);
    await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-1`, planType: "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() } });
    sessionUser = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };

    const res = await createInvitation(request("/api/client/invitations/create", "POST", {
      eventType: "WEDDING", themeId: a, planType: "TIER_2",
      participantsJson: JSON.stringify({ groom: { name: "Raka", nickname: "Raka" }, bride: { name: "Dewi", nickname: "Dewi" } }),
    }));
    expect(res.status).toBe(200);
    const inv = await prisma.invitation.findFirstOrThrow({ where: { userId: user.id } });
    created.drafts.push(path.join(process.cwd(), "data", "drafts", `${inv.id}.html`));

    const labelsOf = async () => {
      const row = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, select: { featureSettings: true, themeId: true } });
      const fs = row.featureSettings as { customLabels: Record<string, string>; labelDefaults?: Record<string, string>; weddingTagline?: string };
      return { ...fs, themeId: row.themeId };
    };
    const first = await labelsOf();
    expect(first.customLabels.openBtn).toBe("Buka A3");
    expect(first.labelDefaults?.openBtn).toBe("Buka A3");

    // Klien mengubah satu label; label lain belum disentuh.
    await prisma.invitation.update({ where: { id: inv.id }, data: { featureSettings: { ...first, customLabels: { ...first.customLabels, coupleTitle: "Judul Klien" } } as never } });

    const change = await updateInvitation(request(`/api/client/invitations/${inv.id}`, "PUT", { themeId: b }), { params: Promise.resolve({ id: inv.id }) });
    expect(change.status).toBe(200);
    const after = await labelsOf();
    expect(after.themeId).toBe(b);
    expect(after.customLabels.openBtn).toBe("Buka B");
    expect(after.customLabels.coupleTitle).toBe("Judul Klien");
    expect(after.weddingTagline).toBe("BADGE B");
    expect(after.labelDefaults?.openBtn).toBe("Buka B");

    // Undangan lama tanpa snapshot: bawaan tema lama dihitung ulang sebagai pembanding.
    const { labelDefaults: _drop, ...withoutSnapshot } = after;
    await prisma.invitation.update({ where: { id: inv.id }, data: { featureSettings: withoutSnapshot as never } });
    const back = await updateInvitation(request(`/api/client/invitations/${inv.id}`, "PUT", { themeId: a }), { params: Promise.resolve({ id: inv.id }) });
    expect(back.status).toBe(200);
    const restored = await labelsOf();
    expect(restored.customLabels.openBtn).toBe("Buka A3");
    expect(restored.customLabels.coupleTitle).toBe("Judul Klien");
  });
});
