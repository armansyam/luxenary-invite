/**
 * rebuild-static-demos.ts
 * Mengompilasi ulang `public/demo/<id>/index.html` seluruh tema aktif dari master dan mesin render terbaru. Cache demo
 * tidak ikut berubah saat mesin atau master diubah, jadi jalankan skrip ini setelah perubahan tata letak dan saat deploy.
 * Hanya menulis berkas hasil generate; tidak menyentuh Cloudflare, draf klien, atau HTML terbit.
 */
import "dotenv/config";
import { compileAllStaticDemos } from "../lib/demoPublisher";
import { prisma, pool } from "../lib/prisma";

async function main() {
  const count = await compileAllStaticDemos();
  console.log(`${count} demo statis dikompilasi ulang.`);
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
