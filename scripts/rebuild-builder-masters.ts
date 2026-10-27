/**
 * Membangun ulang master tema builder (themes/<jenis>/<gaya>/<id>.html) dari `Theme.builderSpec` di database.
 *
 * Master builder hanya ditulis ke disk server (tidak di git) dan backup harian hanya memuat database, jadi setelah
 * memulihkan DB ke server baru master-nya hilang. Spesifikasi di DB adalah sumber sebenarnya: kompilasinya deterministik.
 * Font Google yang dipakai diunduh ulang bila belum ada. Gambar unggahan (public/uploads/theme-assets) bukan bagian DB
 * dan harus dipulihkan dari cadangan folder uploads; skrip ini melaporkan tema yang menautnya tetapi berkasnya hilang.
 *
 *   npx tsx scripts/rebuild-builder-masters.ts            # rencana saja
 *   npx tsx scripts/rebuild-builder-masters.ts --apply    # tulis master yang hilang atau berbeda
 *   npx tsx scripts/rebuild-builder-masters.ts --assets-from backups/builder-themes --apply
 *       # sebelum memeriksa, pulihkan gambar unggahan yang hilang dari berkas ekspor (export-builder-themes.ts)
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma, pool } from "../lib/prisma";
import { builderMasterPath, compileAndAudit, storedBuilderSpec, THEME_ASSET_DIR, type BuilderCategory } from "../lib/themeBuilder/server";
import { readBundle, writeBundleAssets } from "../lib/themeBuilder/bundle";
import { ensureSpecFonts } from "../lib/themeBuilder/fonts";

const APPLY = process.argv.includes("--apply");
const assetsFromIdx = process.argv.indexOf("--assets-from");
const ASSETS_FROM = assetsFromIdx >= 0 ? process.argv[assetsFromIdx + 1] : null;

/** Gambar unggahan yang hilang dipulihkan dari berkas ekspor; tiap gambar diverifikasi hash namanya oleh readBundle. */
async function restoreAssets(dir: string) {
  let restored = 0;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".luxtheme.json"))) {
    const result = await readBundle(JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")));
    if (!result.ok) {
      console.error(`LEWAT   ${file}: ${result.errors[0]}`);
      continue;
    }
    for (const [name, bytes] of result.assets) {
      if (fs.existsSync(path.join(THEME_ASSET_DIR, name))) continue;
      console.log(`PULIH   ${name} (dari ${file})`);
      if (APPLY) await writeBundleAssets(new Map([[name, bytes]]));
      restored++;
    }
  }
  console.log(`Gambar dipulihkan dari berkas ekspor: ${restored}${APPLY ? "" : " (rencana saja)"}\n`);
}

async function main() {
  if (assetsFromIdx >= 0) {
    if (!ASSETS_FROM || !fs.existsSync(ASSETS_FROM)) throw new Error("--assets-from membutuhkan folder berkas ekspor yang ada.");
    await restoreAssets(ASSETS_FROM);
  }
  const themes = await prisma.theme.findMany({ where: { builderSpec: { not: null as never } }, select: { id: true, category: true, builderSpec: true } });
  let missing = 0;
  let differs = 0;
  let broken = 0;
  let lostAssets = 0;
  for (const theme of themes) {
    const spec = storedBuilderSpec(theme.builderSpec);
    if (!spec) {
      console.error(`LEWAT   ${theme.id}: builderSpec tidak lagi valid`);
      broken++;
      continue;
    }
    const compiled = compileAndAudit(spec);
    if (compiled.issues.length) {
      console.error(`GAGAL   ${theme.id}: master gagal audit (${compiled.issues.map((i) => i.code).join(", ")})`);
      broken++;
      continue;
    }
    const assets = [spec.texture, ...Object.values(spec.defaultMedia), ...spec.ornaments.map((o) => o.src), ...Object.values(spec.frames).map((f) => f.ornament)]
      .filter((src): src is string => typeof src === "string" && src.startsWith("/uploads/theme-assets/"));
    for (const src of new Set(assets)) {
      if (!fs.existsSync(path.join(process.cwd(), "public", src))) {
        console.error(`ASET    ${theme.id}: ${src} tidak ada di disk`);
        lostAssets++;
      }
    }

    const file = builderMasterPath(theme.category as BuilderCategory, theme.id);
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : null;
    if (current === compiled.html) continue;
    const state = current === null ? "HILANG" : "BEDA";
    if (current === null) missing++;
    else differs++;
    console.log(`${state.padEnd(7)} ${theme.id} -> ${path.relative(process.cwd(), file)}`);
    if (APPLY) {
      await ensureSpecFonts(spec);
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.writeFile(file, compiled.html, "utf-8");
    }
  }
  console.log(`\nTema builder: ${themes.length}; master hilang: ${missing}; berbeda dari hasil kompilasi: ${differs}; gagal: ${broken}; aset unggahan hilang: ${lostAssets}`);
  console.log(APPLY ? "Master ditulis." : "Rencana saja. Jalankan dengan --apply untuk menulis.");
  if (broken || lostAssets) process.exitCode = 1;
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
