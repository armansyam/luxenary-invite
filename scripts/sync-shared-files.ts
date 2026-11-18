/**
 * Menarik berkas bersama yang ditulis server lain sejak sinkron terakhir (lib/sharedFiles.ts). Dijalankan cron dan
 * deploy.sh di replika; rute dan render di semua server juga menarik sendiri.
 *
 *   npx tsx scripts/sync-shared-files.ts
 */
import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import { sharedStore, syncSharedFiles } from "../lib/sharedFiles";

async function main() {
  if (!sharedStore()) throw new Error("Penyimpanan bersama tidak dikonfigurasi (S3_BACKUP_BUCKET_NAME atau SHARED_STORE_DIR).");
  const changed = await syncSharedFiles({ force: true });
  console.log(`Berkas bersama diperbarui: ${changed}`);
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
