/**
 * generate-builder-thumbnails.ts
 * Membuat thumbnail katalog (mobile 400x800 dan desktop 1280x800) untuk tema builder: mengompilasi demo statis
 * `public/demo/<id>/index.html` dari master terbaru, lalu memotretnya lewat `generate-all-thumbnails.ts` (Chrome lokal).
 * Katalog membaca `public/demo/<id>/thumbnail_*.webp` otomatis (`lib/publicAsset.ts`).
 *
 * Pemakaian (server Next.js harus menyala di APP_URL, bawaan http://localhost:3000):
 *   npx tsx scripts/generate-builder-thumbnails.ts <id-tema>     satu tema
 *   npx tsx scripts/generate-builder-thumbnails.ts --all         semua tema builder
 *
 * Sengaja skrip lokal, bukan tombol di admin: memotret butuh Chrome dan ratusan MB memori, terlalu berat untuk VPS 2 GB.
 * Keluar dengan kode 1 bila ada thumbnail yang tidak terbentuk.
 */
import "dotenv/config";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { compileAndSaveStaticDemo } from "../lib/demoPublisher";
import { prisma, pool } from "../lib/prisma";

async function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const all = process.argv.includes("--all");
  if (!arg && !all) {
    console.error("Pakai: npx tsx scripts/generate-builder-thumbnails.ts <id-tema> | --all");
    process.exit(1);
  }

  const themes = await prisma.theme.findMany({
    where: arg ? { id: arg.toLowerCase().trim() } : { builderSpec: { not: undefined } },
    select: { id: true, builderSpec: true },
    orderBy: { id: "asc" },
  });
  const builderThemes = themes.filter((t) => t.builderSpec !== null);
  if (!builderThemes.length) {
    console.error(arg ? `Tema builder "${arg}" tidak ditemukan.` : "Tidak ada tema builder.");
    process.exit(1);
  }

  const failed: string[] = [];
  for (const { id } of builderThemes) {
    console.log(`\n== ${id}: kompilasi demo statis`);
    await compileAndSaveStaticDemo(id);
    execFileSync("npx", ["tsx", path.join("scripts", "generate-all-thumbnails.ts"), id], { stdio: "inherit", env: process.env });
    for (const file of ["thumbnail_mobile.webp", "thumbnail_desktop.webp"]) {
      const target = path.join(process.cwd(), "public", "demo", id, file);
      if (!fs.existsSync(target) || fs.statSync(target).size < 1024) failed.push(`${id}/${file}`);
    }
  }

  if (failed.length) {
    console.error(`\nGAGAL: ${failed.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log(`\n${builderThemes.length} tema builder: thumbnail mobile dan desktop terbentuk.`);
  }
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
