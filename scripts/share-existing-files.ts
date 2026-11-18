/**
 * Menyalin berkas buatan aplikasi yang sudah ada di disk server utama (sebelum penyalinan otomatis ada, atau yang
 * ditaruh manual lewat scp, mis. foto demo di public/demo/<id>/) ke penyimpanan bersama dan tabel shared_files.
 * Berkas yang dilacak git dilewati karena setiap server sudah memilikinya. Idempoten: berkas yang ukurannya sama
 * dengan catatan tidak diunggah ulang. Dijalankan deploy.sh di server utama.
 *
 *   npx tsx scripts/share-existing-files.ts            # dry run
 *   npx tsx scripts/share-existing-files.ts --apply
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { prisma, pool } from "../lib/prisma";
import { SHARED_ROOTS, filesUnder, shareFile, sharedRelativePath, sharedStore } from "../lib/sharedFiles";

const apply = process.argv.includes("--apply");

async function main() {
  if (!sharedStore()) {
    console.log("Penyimpanan bersama tidak dikonfigurasi (S3_BACKUP_BUCKET_NAME/SHARED_STORE_DIR); dilewati.");
    return;
  }
  const tracked = new Set(execFileSync("git", ["ls-files", "-z", "--", ...SHARED_ROOTS], { encoding: "utf8" }).split("\0").filter(Boolean));
  const known = new Map((await prisma.sharedFile.findMany({ where: { deletedAt: null }, select: { path: true, size: true } })).map((r) => [r.path, r.size]));
  let pending = 0;
  let bytes = 0;
  for (const root of SHARED_ROOTS) {
    for (const file of filesUnder(path.join(process.cwd(), root))) {
      const rel = sharedRelativePath(file);
      if (!rel || tracked.has(rel) || /(^|\/)\.tmp-|\.tmp$/.test(rel)) continue;
      const size = fs.statSync(file).size;
      if (known.get(rel) === size) continue;
      pending++;
      bytes += size;
      if (apply) await shareFile(file);
    }
  }
  console.log(`${apply ? "Disalin" : "Akan disalin"}: ${pending} berkas (${(bytes / 1024 / 1024).toFixed(1)} MB).${apply ? "" : " Jalankan ulang dengan --apply."}`);
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
