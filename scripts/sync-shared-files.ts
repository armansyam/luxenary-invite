/**
 * Server replika (`LUX_SERVER_ROLE=replica`): menarik berkas bersama yang berubah sejak sinkron terakhir
 * (lib/sharedFiles.ts). Dijalankan cron replika tiap menit dan deploy-replica.sh; rute dan render juga menarik sendiri.
 *
 *   LUX_SERVER_ROLE=replica npx tsx scripts/sync-shared-files.ts
 */
import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import { isReplicaServer, syncSharedFiles } from "../lib/sharedFiles";

async function main() {
  if (!isReplicaServer()) throw new Error("Hanya untuk server replika (LUX_SERVER_ROLE=replica).");
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
