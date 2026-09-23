import { prisma } from "../lib/prisma";

/**
 * Global setup: dijalankan SEKALI sebelum seluruh test suite oleh Vitest.
 * Koneksi DB bersifat OPSIONAL — test unit (dengan mock) tetap berjalan tanpa DB.
 * Hanya membersihkan entitas test jika DB tersedia.
 */
export async function setup() {
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
    await prisma.$disconnect();
  } catch {}
  console.log("\n[TEST TEARDOWN] Prisma disconnected.");
}
