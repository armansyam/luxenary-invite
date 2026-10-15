/**
 * Mengatur ulang password satu akun admin dengan password acak, mencabut semua sesinya, dan menulis kredensial ke
 * berkas ber-izin 600. Password tidak pernah dicetak.
 *
 *   npx tsx scripts/set-admin-password.ts admin@contoh.com
 *   npx tsx scripts/set-admin-password.ts admin@contoh.com --out=/home/amsdev/kredensial-admin.txt
 */
import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { prisma, pool } from "../lib/prisma";
import { generateAdminPassword, setAdminPassword, writeAdminCredentialFile } from "../lib/adminCredentials";

async function main() {
  const email = process.argv[2];
  if (!email || email.startsWith("--")) {
    console.error("Pemakaian: npx tsx scripts/set-admin-password.ts <email> [--out=<berkas>]");
    process.exitCode = 1;
    return;
  }
  const outArg = process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length);
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const outFile = outArg || path.join(os.homedir(), `admin-credentials-${stamp}.txt`);

  const password = generateAdminPassword();
  writeAdminCredentialFile(outFile, email.trim().toLowerCase(), password);
  try {
    await setAdminPassword(prisma, email, password);
  } catch (err) {
    fs.rmSync(outFile, { force: true });
    throw err;
  }
  console.log(`Password ${email} diatur ulang dan semua sesi lamanya dicabut. Kredensial ada di: ${outFile} (izin 600).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
