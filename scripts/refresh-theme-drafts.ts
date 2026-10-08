/**
 * Menyalin ulang template master ke piring draft dan membangun ulang HTML terbit.
 *
 * Piring `data/drafts/<id>.html` sengaja dibekukan agar undangan klien tidak berubah saat tema master dihapus atau
 * didesain ulang. Akibatnya perbaikan bug di template master maupun di mesin tema (lib/themeEngine.ts) tidak sampai ke
 * undangan yang sudah ada sampai piringnya disalin ulang dan HTML terbitnya dibangun ulang. Jalankan setelah deploy
 * yang mengubah template atau mesin tema, lalu restart proses agar cache HTML di memori ikut segar.
 *
 *   npx tsx scripts/refresh-theme-drafts.ts                          # dry run, semua tema
 *   npx tsx scripts/refresh-theme-drafts.ts --themes=kalandra,bone   # dry run, tema tertentu
 *   npx tsx scripts/refresh-theme-drafts.ts --apply                  # salin ulang piring, bangun ulang, purge cache
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma, pool } from "../lib/prisma";
import { buildAndSavePublishedHtml } from "../lib/staticPublisher";
import { purgeCloudflareCache } from "../lib/cloudflare";

const apply = process.argv.includes("--apply");
const themesArg = process.argv.find((a) => a.startsWith("--themes="))?.slice("--themes=".length);
const themeFilter = themesArg ? themesArg.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : null;

async function main() {
  const invitations = await prisma.invitation.findMany({
    where: themeFilter ? { themeId: { in: themeFilter } } : {},
    select: { id: true, themeId: true, status: true, invitationSlug: true, subdomain: true, customDomain: true },
  });
  const draftsDir = path.join(process.cwd(), "data", "drafts");
  const withDraft = invitations.filter((inv) => fs.existsSync(path.join(draftsDir, `${inv.id}.html`)));
  const published = invitations.filter((inv) => inv.status === "PUBLISHED");

  console.log(`Undangan cocok: ${invitations.length}; punya piring draft: ${withDraft.length}; terbit (dibangun ulang): ${published.length}`);
  for (const inv of published) console.log(`- ${inv.themeId} ${inv.invitationSlug} (${inv.id})`);

  if (!apply) {
    console.log("\nDry run. Jalankan ulang dengan --apply.");
    return;
  }

  for (const inv of withDraft) fs.rmSync(path.join(draftsDir, `${inv.id}.html`), { force: true });

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").split(":")[0].toLowerCase();
  const urls: string[] = [];
  let failed = 0;
  for (const inv of published) {
    // Membangun HTML terbit sekaligus menyalin ulang piring dari master (renderTemplateFile dengan invitationId).
    const html = await buildAndSavePublishedHtml(inv.id);
    if (!html) {
      failed++;
      console.error(`GAGAL: ${inv.invitationSlug} tidak dapat dibangun ulang`);
      continue;
    }
    if (rootDomain && inv.invitationSlug) urls.push(`https://${rootDomain}/${inv.invitationSlug}`);
    if (rootDomain && inv.subdomain) urls.push(`https://${inv.subdomain}.${rootDomain}/`);
    if (inv.customDomain) urls.push(`https://${inv.customDomain}/`);
  }

  if (urls.length > 0) {
    const purge = await purgeCloudflareCache({ files: urls });
    console.log(`Purge Cloudflare (${urls.length} URL):`, purge.success ? "berhasil" : purge.reason || "gagal");
  }
  console.log(`Selesai: ${withDraft.length} piring disalin ulang, ${published.length - failed} HTML terbit dibangun ulang, ${failed} gagal.`);
  if (failed > 0) process.exitCode = 1;
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
