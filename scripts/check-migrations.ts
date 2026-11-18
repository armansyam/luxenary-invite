/**
 * Gerbang deploy.sh sebelum `prisma migrate deploy`: menolak migrasi yang mematahkan kode rilis sebelumnya
 * (lib/migrationSafety.ts). Keluar dengan kode 1 bila ada pelanggaran.
 *
 *   npx tsx scripts/check-migrations.ts
 */
import { unsafeMigrations } from "../lib/migrationSafety";

const found = unsafeMigrations();
const names = Object.keys(found);
if (names.length) {
  console.error("❌ Migrasi tidak cocok dengan kode rilis sebelumnya:");
  for (const name of names) for (const issue of found[name]) console.error(`   ${name}: ${issue}`);
  console.error("   Pecah menjadi beberapa rilis, atau tandai tahap penghapusan dengan baris `-- lux:contract <alasan>`.");
  process.exit(1);
}
console.log("✅ Semua migrasi baru cocok dengan kode rilis sebelumnya.");
