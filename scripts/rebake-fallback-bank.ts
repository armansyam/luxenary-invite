/**
 * Membangun ulang HTML terbit yang masih memuat rekening cadangan lama "7330497518".
 *
 * Sampai Oktober 2026 engine menyisipkan rekening itu ke seksi hadiah undangan pernikahan yang tidak punya rekening,
 * QRIS, maupun alamat. Perbaikan engine hanya berlaku untuk HTML yang dibangun sesudahnya; HTML yang sudah terbit
 * di public/published/ids/ perlu dibangun ulang sekali.
 *
 *   npx tsx scripts/rebake-fallback-bank.ts           # hanya menampilkan undangan yang terdampak
 *   npx tsx scripts/rebake-fallback-bank.ts --apply   # membangun ulang lalu purge cache Cloudflare
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma, pool } from "../lib/prisma";
import { buildAndSavePublishedHtml } from "../lib/staticPublisher";
import { purgeCloudflareCache } from "../lib/cloudflare";

const LEGACY_NUMBER = "7330497518";
const apply = process.argv.includes("--apply");

async function main() {
  const idsDir = path.join(process.cwd(), "public", "published", "ids");
  const files = fs.existsSync(idsDir) ? fs.readdirSync(idsDir).filter((f) => f.endsWith(".html")) : [];
  const affected = files
    .filter((f) => fs.readFileSync(path.join(idsDir, f), "utf-8").includes(LEGACY_NUMBER))
    .map((f) => f.replace(/\.html$/, ""));

  console.log(`HTML terbit diperiksa: ${files.length}; memuat rekening cadangan: ${affected.length}`);
  if (affected.length === 0) return;

  const invitations = await prisma.invitation.findMany({
    where: { id: { in: affected } },
    select: { id: true, invitationSlug: true, subdomain: true, customDomain: true },
  });
  for (const inv of invitations) console.log(`- ${inv.invitationSlug} (${inv.id})`);

  if (!apply) {
    console.log("\nDry run. Jalankan ulang dengan --apply untuk membangun ulang.");
    return;
  }

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").split(":")[0].toLowerCase();
  const urls: string[] = [];
  let failed = 0;
  for (const inv of invitations) {
    const html = await buildAndSavePublishedHtml(inv.id);
    if (!html || html.includes(LEGACY_NUMBER)) {
      failed++;
      console.error(`GAGAL: ${inv.invitationSlug} belum bersih setelah dibangun ulang`);
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
  console.log(`Selesai: ${invitations.length - failed} dibangun ulang, ${failed} gagal.`);
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
