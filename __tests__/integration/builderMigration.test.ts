/**
 * Migrasi master tulisan tangan ke draf builder lewat alur nyata (database `luxenary_test`): spesifikasi dari master
 * lama disimpan lewat rute builder, diterbitkan, dipakai klien membuat undangan, dan pratinjau Studio dirender tanpa
 * token mentah. Dicoba pada master dengan palet terbaca penuh, palet yang tertulis mati, dan huruf Google.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/cloudflare", () => ({ purgeCloudflareCache: vi.fn(async () => ({ success: false, skipped: true })), purgeInvitationEdgeCache: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Huruf Google diunduh server saat simpan; uji tidak boleh bergantung pada jaringan.
vi.mock("@/lib/themeBuilder/fonts", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/themeBuilder/fonts")>()), ensureSpecFonts: vi.fn(async () => undefined) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as builderPost, PATCH as builderPatch } from "@/app/api/admin/theme-builder/route";
import { POST as createInvitation } from "@/app/api/client/invitations/create/route";
import { GET as previewGet } from "@/app/api/client/invitations/[id]/preview/route";
import { builderMasterPath } from "@/lib/themeBuilder/server";
import { legacyDraftSpec } from "@/lib/themeBuilder/legacyMigration";
import { masterPathOf } from "@/lib/themePaths";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_bmig_${Date.now()}`;
const SAMPLES = ["bugis", "kalandra", "candani", "wave", "aeterna", "toraja"];
process.env.AUTH_SECRET ||= "vitest-bmig-signing-secret";

const request = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

describe.skipIf(!IS_TEST_DB)("migrasi master lama ke draf builder", () => {
  const created = { users: [] as string[], admins: [] as string[], themes: [] as Array<{ id: string; category: string }>, drafts: [] as string[] };

  afterAll(async () => {
    sessionUser = null;
    await prisma.invitation.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.order.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    for (const t of created.themes) {
      await prisma.theme.deleteMany({ where: { id: t.id } });
      fs.rmSync(builderMasterPath(t.category as "modern", t.id), { force: true });
      // Menerbitkan tema membangun demo statis; route DELETE tema menghapusnya, tes yang menghapus lewat Prisma wajib juga.
      fs.rmSync(path.join(process.cwd(), "public", "demo", t.id.toLowerCase()), { recursive: true, force: true });
    }
    for (const f of created.drafts) fs.rmSync(f, { force: true });
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: created.admins } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("draf dari tiap master contoh tersimpan, diterbitkan, dan dirender utuh di pratinjau klien", async () => {
    const admin = await prisma.admin.create({ data: { username: TAG, email: `${TAG}@t.local`, name: "Admin Uji", role: "SUPER_ADMIN", permissions: [] } });
    created.admins.push(admin.id);
    const user = await prisma.user.create({ data: { email: `${TAG}@client.local`, name: "Klien Uji" } });
    created.users.push(user.id);
    await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-1`, planType: "TIER_2", amount: 150000, status: "PAID", orderType: "NEW", paidAt: new Date() } });

    for (const legacyId of SAMPLES) {
      const legacy = await prisma.theme.findUniqueOrThrow({ where: { id: legacyId }, select: { id: true, name: true, category: true, defaultMedia: true } });
      const html = fs.readFileSync(masterPathOf("WEDDING", legacy.category, legacy.id), "utf-8");
      const draft = legacyDraftSpec(html, legacy.defaultMedia);
      expect(draft.ok, legacyId).toBe(true);
      if (!draft.ok) continue;

      sessionUser = { id: admin.id, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
      const themeId = `${TAG.slice(-8)}-${legacyId}`.slice(0, 40);
      const save = await builderPost(request("/api/admin/theme-builder", "POST", { id: themeId, name: `${legacy.name} Uji ${TAG.slice(-4)}`, category: legacy.category, description: "uji", spec: draft.spec }));
      expect(save.status, `${legacyId}: ${save.status}`).toBe(200);
      created.themes.push({ id: themeId, category: legacy.category });
      const publish = await builderPatch(request("/api/admin/theme-builder", "PATCH", { id: themeId, isActive: true }));
      expect(publish.status, `${legacyId} terbit`).toBe(200);

      sessionUser = { id: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false };
      const res = await createInvitation(request("/api/client/invitations/create", "POST", {
        eventType: "WEDDING", themeId, planType: "TIER_2",
        participantsJson: JSON.stringify({ groom: { name: "Raka", nickname: "Raka" }, bride: { name: "Dewi", nickname: "Dewi" } }),
      }));
      expect(res.status, `${legacyId} undangan`).toBe(200);
      const inv = await prisma.invitation.findFirstOrThrow({ where: { userId: user.id, themeId } });
      created.drafts.push(path.join(process.cwd(), "data", "drafts", `${inv.id}.html`));

      const preview = await previewGet(request(`/api/client/invitations/${inv.id}/preview`, "GET"), { params: Promise.resolve({ id: inv.id }) });
      expect(preview.status, `${legacyId} pratinjau`).toBe(200);
      const out = await preview.text();
      expect(out, legacyId).toContain("Raka");
      expect(out, legacyId).not.toMatch(/\{\{[#/]?[A-Za-z]/);
      expect(out, legacyId).not.toMatch(/url\(\s*(?:''|""|)\s*\)/);
      // Palet tema lama terbawa ke :root master hasil migrasi.
      expect(out, legacyId).toContain(`--primary: ${draft.spec.palette.primary}`);
    }
  });
});
