/**
 * Memindahkan piring lama `data/drafts/<id>.html` (disk server) ke tabel invitation_drafts. Idempoten: piring yang
 * sudah ada di DB tidak ditimpa. Berkas dihapus setelah diimpor; berkas tanpa undangan di DB juga dihapus karena
 * tidak pernah dirender lagi. Dijalankan deploy.sh setelah `prisma migrate deploy`.
 *
 *   npx tsx scripts/migrate-drafts-to-db.ts
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma, pool } from "../lib/prisma";
import { normalizeDraftEventType } from "../lib/invitationDraft";

const DRAFTS_DIR = path.join(process.cwd(), "data", "drafts");

async function main() {
  const files = fs.existsSync(DRAFTS_DIR) ? fs.readdirSync(DRAFTS_DIR).filter((f) => f.endsWith(".html")) : [];
  let imported = 0;
  let kept = 0;
  let orphaned = 0;
  for (const file of files) {
    const invitationId = file.slice(0, -".html".length);
    const full = path.join(DRAFTS_DIR, file);
    const inv = await prisma.invitation.findUnique({ where: { id: invitationId }, select: { themeId: true, eventType: true } });
    if (!inv) {
      fs.rmSync(full, { force: true });
      orphaned++;
      continue;
    }
    const raw = fs.readFileSync(full, "utf-8");
    // Piring lama berkepala `<!-- lux-theme:x -->` dan `<!-- lux-event:y -->`; piring yang lebih tua tanpa kepala itu
    // dirender untuk tema dan jenis acara undangan saat ini.
    const head = raw.slice(0, 300);
    const themeId = head.match(/<!--\s*lux-theme:\s*([a-zA-Z0-9_-]+)\s*-->/)?.[1] ?? inv.themeId;
    const eventType = normalizeDraftEventType(head.match(/<!--\s*lux-event:\s*([a-zA-Z0-9_-]+)\s*-->/)?.[1] ?? inv.eventType);
    const html = raw.replace(/^<!--\s*lux-theme:[^>]*-->\n?/, "").replace(/^<!--\s*lux-event:[^>]*-->\n?/, "");
    const created = await prisma.invitationDraft.createMany({ data: [{ invitationId, themeId, eventType, html }], skipDuplicates: true });
    if (created.count) imported++;
    else kept++;
    fs.rmSync(full, { force: true });
  }
  console.log(`Piring disk: ${files.length}; diimpor ke DB: ${imported}; sudah ada di DB: ${kept}; tanpa undangan (dihapus): ${orphaned}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
