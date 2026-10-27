/**
 * Mengekspor semua tema builder (spesifikasi dan gambar unggahannya) ke satu berkas JSON per tema.
 *
 * Backup harian hanya memuat database, sedangkan gambar unggahan builder (public/uploads/theme-assets) dan master hasil
 * kompilasi hanya ada di disk server. Berkas hasil skrip ini lengkap: dapat diimpor lewat tombol Impor di Theme Builder
 * atau dipakai `rebuild-builder-masters.ts --assets-from <folder>` untuk memulihkan gambar yang hilang.
 *
 *   npx tsx scripts/export-builder-themes.ts [folder-tujuan]    # bawaan: backups/builder-themes
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma, pool } from "../lib/prisma";
import { exportBundle } from "../lib/themeBuilder/bundle";
import { storedBuilderSpec, type BuilderCategory } from "../lib/themeBuilder/server";

async function main() {
  const dir = path.resolve(process.argv[2] ?? path.join("backups", "builder-themes"));
  await fs.promises.mkdir(dir, { recursive: true });
  const themes = await prisma.theme.findMany({
    where: { builderSpec: { not: null as never } },
    select: { id: true, name: true, category: true, description: true, defaultMusicUrl: true, builderSpec: true },
  });
  let exported = 0;
  let incomplete = 0;
  for (const theme of themes) {
    const spec = storedBuilderSpec(theme.builderSpec);
    if (!spec) {
      console.error(`LEWAT   ${theme.id}: builderSpec tidak lagi valid`);
      incomplete++;
      continue;
    }
    const { bundle, missing } = exportBundle(
      { name: theme.name, category: theme.category as BuilderCategory, description: theme.description ?? "", defaultMusicUrl: theme.defaultMusicUrl ?? "" },
      spec,
    );
    await fs.promises.writeFile(path.join(dir, `${theme.id}.luxtheme.json`), JSON.stringify(bundle), "utf-8");
    exported++;
    if (missing.length) {
      console.error(`ASET    ${theme.id}: ${missing.length} gambar tidak ada di disk (${missing.join(", ")})`);
      incomplete++;
    }
  }
  console.log(`Tema builder: ${themes.length}; diekspor: ${exported}; tidak lengkap: ${incomplete}; folder: ${dir}`);
  if (incomplete) process.exitCode = 1;
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
