import fs from "fs";
import path from "path";
import { prisma, pool } from "../lib/prisma";

// Rute pembuatan undangan dan render dengan invitationId menyalin master ke data/drafts/<id>.html. Folder itu dipakai
// bersama DB dev, jadi teardown hanya menghapus piring yang muncul selama tes dan tidak punya undangan di DB uji.
const DRAFTS_DIR = path.join(process.cwd(), "data", "drafts");
const listDrafts = () => (fs.existsSync(DRAFTS_DIR) ? fs.readdirSync(DRAFTS_DIR).filter((f) => f.endsWith(".html")) : []);
let draftsBefore = new Set<string>();

/**
 * Global setup: dijalankan SEKALI sebelum seluruh test suite oleh Vitest.
 * Koneksi DB bersifat OPSIONAL — test unit (dengan mock) tetap berjalan tanpa DB.
 * Hanya membersihkan entitas test jika DB tersedia.
 */
export async function setup() {
  draftsBefore = new Set(listDrafts());
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("\n[TEST SETUP] DB connection OK. Cleaning stale vitest_ entities...");

    const prefix = "vitest_";
    const staleUsers = await prisma.user.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true },
    });

    if (staleUsers.length > 0) {
      const ids = staleUsers.map((u) => u.id);
      await prisma.rsvp.deleteMany({ where: { invitation: { userId: { in: ids } } } });
      await prisma.guest.deleteMany({ where: { invitation: { userId: { in: ids } } } });
      await prisma.invitationMedia.deleteMany({ where: { invitation: { userId: { in: ids } } } });
      await prisma.invitation.deleteMany({ where: { userId: { in: ids } } });
      await prisma.order.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      console.log(`[TEST SETUP] Cleaned ${staleUsers.length} stale test users.`);
    }
  } catch (_err) {
    // DB tidak tersedia (dev tanpa DB, atau CI sebelum migrate) — test unit tetap berjalan
    console.warn("\n[TEST SETUP] DB unavailable — unit tests with mocks will still run normally.");
  }
}

export async function teardown() {
  try {
    const created = listDrafts().filter((f) => !draftsBefore.has(f));
    let removed = 0;
    for (const file of created) {
      const owner = await prisma.invitation.findUnique({ where: { id: file.replace(/\.html$/, "") }, select: { id: true } });
      if (owner) continue;
      fs.rmSync(path.join(DRAFTS_DIR, file), { force: true });
      removed++;
    }
    if (removed) console.log(`\n[TEST TEARDOWN] Removed ${removed} draft copies created by tests.`);
  } catch (err) {
    console.warn("\n[TEST TEARDOWN] Draft cleanup skipped:", err instanceof Error ? err.message : err);
  }
  try {
    await prisma.$disconnect();
    await pool.end();
  } catch {}
  console.log("\n[TEST TEARDOWN] Prisma disconnected.");
}
