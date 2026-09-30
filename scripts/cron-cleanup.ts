import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import { runLifecycleCleanup, runStaleDataCleanup } from "../lib/lifecycleCleanup";

const DRY_RUN = process.argv.includes("--dry-run");

async function runCleanup() {
  console.log(`[CRON CLEANUP] Siklus hidup undangan (DRY_RUN=${DRY_RUN})`);

  try {
    const lifecycle = await runLifecycleCleanup({ dryRun: DRY_RUN });
    const stale = await runStaleDataCleanup({ dryRun: DRY_RUN });
    console.log(JSON.stringify({ ...lifecycle, ...stale }, null, 2));
    if (lifecycle.archiveFailures.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error("[CRON CLEANUP ERROR]", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runCleanup();
