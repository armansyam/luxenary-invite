/**
 * republish-published.ts
 * Menerbitkan ulang snapshot HTML undangan yang sudah terbit agar perbaikan mesin render sampai ke klien. Tanpa --apply
 * hanya melaporkan rencana. Hanya undangan PUBLISHED, tidak terkunci permanen, dengan hari tamu datang >= --min-days
 * (bawaan 7) yang dipilih; sisanya dilaporkan beserta alasannya. Cache tepi Cloudflare hanya dibersihkan dengan --purge.
 *
 *   npx tsx scripts/republish-published.ts                  # rencana saja
 *   npx tsx scripts/republish-published.ts --apply --min-days=14
 */
import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import { planRepublish } from "../lib/republishPlan";

function numberFlag(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} harus bilangan >= 0.`);
  return value;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const purge = process.argv.includes("--purge");
  const minDays = numberFlag("min-days", 7);

  const rows = await prisma.invitation.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, status: true, eventData: true, isLockedPermanently: true, invitationSlug: true, subdomain: true, customDomain: true },
  });
  const plan = planRepublish(rows, new Date(), minDays);

  console.log(`PUBLISHED: ${rows.length} | akan diterbitkan ulang: ${plan.eligible.length} | dilewati: ${plan.skipped.length} (min ${minDays} hari)`);
  for (const s of plan.skipped.slice(0, 30)) console.log(`  lewati ${s.id}: ${s.reason}`);
  if (!apply) {
    console.log("Tanpa --apply: tidak ada yang diubah.");
    return;
  }

  const provider = process.env.STORAGE_PROVIDER || "local";
  const failures: string[] = [];
  for (const id of plan.eligible) {
    try {
      if (provider === "r2" || provider === "s3") {
        const { syncDraftToR2 } = await import("../lib/storage");
        await syncDraftToR2(id);
      } else {
        const { buildAndSavePublishedHtml } = await import("../lib/staticPublisher");
        await buildAndSavePublishedHtml(id);
      }
      if (purge) {
        const { purgeInvitationEdgeCache } = await import("../lib/cloudflare");
        const inv = rows.find((r) => r.id === id)!;
        await purgeInvitationEdgeCache(inv);
      }
      console.log(`  terbit ulang ${id}`);
    } catch (err) {
      failures.push(id);
      console.error(`  GAGAL ${id}:`, err instanceof Error ? err.message : err);
    }
  }
  // Penerbit memulai sinkron arsip NAS di latar belakang; tunggu sebelum koneksi DB ditutup.
  const { waitForPendingArchiveSyncs } = await import("../lib/staticPublisher");
  await waitForPendingArchiveSyncs();
  console.log(`Selesai: ${plan.eligible.length - failures.length} berhasil, ${failures.length} gagal.`);
  if (failures.length) process.exitCode = 1;
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
