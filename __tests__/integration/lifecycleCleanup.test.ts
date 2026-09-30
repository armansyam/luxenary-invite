/**
 * Siklus hidup undangan pada PostgreSQL sungguhan (hanya berjalan di database `luxenary_test`).
 * Waktu disuntikkan lewat opsi `now` sehingga setiap jam retensi diuji tanpa menunggu.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

vi.mock("@/lib/staticPublisher", () => ({
  buildAndSavePublishedHtml: vi.fn(async () => "<html></html>"),
  deletePublishedHtml: vi.fn(async () => true),
  getPublishedHtml: vi.fn(async () => null),
}));
vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage")>()),
  deleteFile: vi.fn(async () => true),
}));

import { prisma, pool } from "@/lib/prisma";
import { invalidateSettingsCache } from "@/lib/settings";
import { runLifecycleCleanup } from "@/lib/lifecycleCleanup";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_lc_${Date.now()}`;
const DAY = 24 * 60 * 60 * 1000;

const SETTINGS: Record<string, string> = {
  subdomain_grace_days: "7",
  retention_cleanup_days: "30",
  nas_archive_retention_days: "365",
  retention_custom_domain_days: "365",
  subdomain_auto_recycle: "true",
  nas_archive_enabled: "false",
};

// Acara utama 12 Desember 2026 di WIT: awal hari = 2026-12-11T15:00Z
const EVENT_DAY_START = new Date("2026-12-11T15:00:00.000Z");
const EVENT_DATA = JSON.stringify([
  { title: "Akad", date: "2026-12-10", timezone: "WIB", isPrimary: false },
  { title: "Resepsi", date: "2026-12-12", timezone: "WIT", isPrimary: true },
]);
const at = (offsetMs: number) => new Date(EVENT_DAY_START.getTime() + offsetMs);

const created = { users: [] as string[], invitations: [] as string[] };
const savedSettings = new Map<string, string | null>();
let themeId = "";
let nasDir = "";
let counter = 0;

async function setSetting(key: string, value: string) {
  await prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value, group: "setup" } });
  invalidateSettingsCache();
}

async function makeInvitation(data: Record<string, unknown> = {}) {
  counter++;
  const user = await prisma.user.create({ data: { email: `${TAG}_${counter}@t.local`, name: "Owner" } });
  created.users.push(user.id);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      themeId,
      status: "EVENT_FINISHED",
      invitationSlug: `${TAG}-${counter}`,
      groomSlug: `${TAG}-g${counter}`,
      brideSlug: `${TAG}-b${counter}`,
      groomName: "Budi",
      brideName: "Sari",
      eventData: EVENT_DATA,
      ...data,
    } as any,
  });
  created.invitations.push(inv.id);
  return inv;
}

const statusOf = async (id: string) => (await prisma.invitation.findUniqueOrThrow({ where: { id } })).status;

describe.skipIf(!IS_TEST_DB)("Siklus hidup undangan (DB luxenary_test)", () => {
  beforeAll(async () => {
    themeId = (await prisma.theme.findFirstOrThrow({ where: { eventType: "WEDDING" }, select: { id: true } })).id;
    nasDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lux-archive-"));
    for (const key of [...Object.keys(SETTINGS), "nas_archive_path"]) {
      savedSettings.set(key, (await prisma.adminSetting.findUnique({ where: { key } }))?.value ?? null);
    }
    for (const [key, value] of Object.entries(SETTINGS)) await setSetting(key, value);
    await setSetting("nas_archive_path", nasDir);
  });

  afterAll(async () => {
    for (const id of created.invitations) {
      // Proses publikasi dapat menulis data/drafts/<id>.html; hapus agar tidak menjadi berkas yatim.
      await fs.promises.rm(path.join(process.cwd(), "data", "drafts", `${id}.html`), { force: true });
    }
    await prisma.rsvp.deleteMany({ where: { invitationId: { in: created.invitations } } });
    await prisma.guestMemory.deleteMany({ where: { invitationId: { in: created.invitations } } });
    await prisma.invitationMedia.deleteMany({ where: { invitationId: { in: created.invitations } } });
    await prisma.invitation.deleteMany({ where: { id: { in: created.invitations } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    for (const [key, value] of savedSettings) {
      if (value === null) await prisma.adminSetting.deleteMany({ where: { key } });
      else await prisma.adminSetting.update({ where: { key }, data: { value } });
    }
    invalidateSettingsCache();
    await fs.promises.rm(nasDir, { recursive: true, force: true });
    await prisma.$disconnect();
    await pool.end();
  });

  it("PUBLISHED baru selesai pada awal hari berikutnya menurut zona acara (WIT), bukan pukul 09.00 hari-H", async () => {
    const inv = await makeInvitation({ status: "PUBLISHED" });

    // 10.00 UTC di hari-H = 19.00 WIT hari-H: aturan UTC lama sudah menutup, aturan zona acara belum
    await runLifecycleCleanup({ now: new Date("2026-12-12T10:00:00.000Z") });
    expect(await statusOf(inv.id)).toBe("PUBLISHED");

    await runLifecycleCleanup({ now: at(DAY + 60_000) });
    expect(await statusOf(inv.id)).toBe("EVENT_FINISHED");
  });

  it("subdomain kembali ke pool sesuai subdomain_grace_days, terpisah dari jam galeri", async () => {
    const inv = await makeInvitation({ subdomain: `${TAG}-sub` });

    await runLifecycleCleanup({ now: at(6 * DAY) });
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } })).subdomain).toBe(`${TAG}-sub`);

    await runLifecycleCleanup({ now: at(8 * DAY) });
    const after = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.subdomain).toBeNull();
    expect(after.status).toBe("EVENT_FINISHED");
  });

  it("perpanjangan galeri (galleryExpiresAt) menahan pembersihan; tanpa itu galeri dibersihkan dan undangan ARCHIVED", async () => {
    const extended = await makeInvitation({ galleryExpiresAt: at(90 * DAY) });
    const plain = await makeInvitation();
    for (const inv of [extended, plain]) {
      await prisma.guestMemory.create({ data: { invitationId: inv.id, senderName: "Tamu", senderEmail: "t@t.local", mediaUrl: "/x.webp" } });
      await prisma.rsvp.create({ data: { invitationId: inv.id, guestName: "Tamu", status: "hadir" } });
    }

    const result = await runLifecycleCleanup({ now: at(31 * DAY) });

    expect(result.archiveFailures).toEqual([]);
    expect(await statusOf(extended.id)).toBe("EVENT_FINISHED");
    expect(await prisma.guestMemory.count({ where: { invitationId: extended.id } })).toBe(1);

    expect(await statusOf(plain.id)).toBe("ARCHIVED");
    expect(await prisma.guestMemory.count({ where: { invitationId: plain.id } })).toBe(0);
    expect(await prisma.rsvp.count({ where: { invitationId: plain.id } })).toBe(0);
  });

  describe("dengan arsip NAS aktif", () => {
    beforeAll(async () => {
      await setSetting("nas_archive_enabled", "true");
    });
    afterAll(async () => {
      await setSetting("nas_archive_enabled", "false");
    });

    it("arsip gagal (aset milik platform tidak dapat disalin): tidak ada yang dihapus dan status tetap", async () => {
      const inv = await makeInvitation();
      await prisma.invitationMedia.create({
        data: { invitationId: inv.id, mediaSlot: "LANDING_COVER", localPath: `/uploads/${TAG}/hilang.webp` },
      });
      await prisma.rsvp.create({ data: { invitationId: inv.id, guestName: "Tamu", status: "hadir" } });

      const result = await runLifecycleCleanup({ now: at(31 * DAY) });

      expect(result.archiveFailures.map((f) => f.invitationId)).toContain(inv.id);
      expect(await statusOf(inv.id)).toBe("EVENT_FINISHED");
      expect(await prisma.rsvp.count({ where: { invitationId: inv.id } })).toBe(1);
      expect(await prisma.invitationMedia.count({ where: { invitationId: inv.id } })).toBe(1);
      expect(fs.existsSync(path.join(nasDir, inv.invitationSlug, "index.html"))).toBe(false);
    });

    it("arsip sukses -> ARCHIVED, berkas arsip ada; setelah 365 hari sejak acara arsip dibersihkan", async () => {
      const inv = await makeInvitation();

      const first = await runLifecycleCleanup({ now: at(31 * DAY) });
      expect(first.archiveFailures.map((f) => f.invitationId)).not.toContain(inv.id);
      expect(await statusOf(inv.id)).toBe("ARCHIVED");
      const archiveFile = path.join(nasDir, inv.invitationSlug, "index.html");
      expect(fs.existsSync(archiveFile)).toBe(true);

      await runLifecycleCleanup({ now: at(300 * DAY) });
      expect(fs.existsSync(archiveFile)).toBe(true);

      const last = await runLifecycleCleanup({ now: at(366 * DAY) });
      expect(last.purgedArchives).toBeGreaterThanOrEqual(1);
      expect(fs.existsSync(path.join(nasDir, inv.invitationSlug))).toBe(false);
      expect(await statusOf(inv.id)).toBe("ARCHIVED");
    });
  });

  it("dryRun tidak mengubah data", async () => {
    const inv = await makeInvitation({ subdomain: `${TAG}-dry` });
    const result = await runLifecycleCleanup({ now: at(31 * DAY), dryRun: true });
    expect(result.archivedInvitations + result.recycledSubdomains).toBeGreaterThanOrEqual(1);
    const after = await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.status).toBe("EVENT_FINISHED");
    expect(after.subdomain).toBe(`${TAG}-dry`);
  });
});
