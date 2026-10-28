/**
 * migrate-legacy-to-builder.ts
 * Membuat draf tema builder dari master pernikahan tulisan tangan, supaya tema lama punya padanan yang bisa diedit di
 * builder. Titik awalnya sama dengan "Mulai dari tema lama" (`seedSpecFromMaster`: palet, huruf, tekstur) ditambah
 * media dan musik bawaan tema lama. Tata letak mengikuti blueprint, bukan master lama: desain tulisan tangannya tidak
 * ikut dan tidak diubah. Tema lama dan undangan kliennya tidak disentuh; hasilnya draf `<id>-builder` (`isActive=false`).
 *
 * Tanpa --apply hanya mencetak rencana. Yang sudah punya padanan dilewati, jadi aman dijalankan ulang.
 *   npx tsx scripts/migrate-legacy-to-builder.ts [id-tema ...]            rencana
 *   npx tsx scripts/migrate-legacy-to-builder.ts [id-tema ...] --apply    tulis master, baris tema, dan riwayat
 * Keluar dengan kode 1 bila ada master yang gagal audit.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import type { Prisma } from "@prisma/client";
import { prisma, pool } from "../lib/prisma";
import { masterPathOf } from "../lib/themePaths";
import { ensureSpecFonts } from "../lib/themeBuilder/fonts";
import { fitSpecFrames } from "../lib/themeBuilder/frameWindow";
import { legacyDraftSpec } from "../lib/themeBuilder/legacyMigration";
import { BUILDER_CATEGORIES, builderDefaultMedia, builderMasterPath, compileAndAudit, isSafeThemeId, recordBuilderRevision, resolveThemeMusic, themeIdTaken, type BuilderCategory } from "../lib/themeBuilder/server";

const SERIES: Record<BuilderCategory, string> = { minimalist: "Minimalist", modern: "Modern", traditional: "Traditional" };

async function main() {
  const apply = process.argv.includes("--apply");
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase());

  const legacy = await prisma.theme.findMany({
    where: { eventType: "WEDDING", ...(only.length ? { id: { in: only } } : {}) },
    select: { id: true, name: true, category: true, description: true, defaultMedia: true, defaultMusicUrl: true, builderSpec: true },
    orderBy: { id: "asc" },
  });
  const candidates = legacy.filter((t) => t.builderSpec === null && (BUILDER_CATEGORIES as string[]).includes(t.category));

  let created = 0;
  let skipped = 0;
  const failed: string[] = [];
  console.log(`${apply ? "TULIS" : "RENCANA"}: ${candidates.length} tema tulisan tangan`);

  for (const theme of candidates) {
    const category = theme.category as BuilderCategory;
    const targetId = `${theme.id}-builder`.slice(0, 40);
    const file = masterPathOf("WEDDING", theme.category, theme.id);
    if (!isSafeThemeId(targetId)) { failed.push(`${theme.id}: ID padanan tidak aman`); continue; }
    if (await themeIdTaken(targetId)) { skipped++; console.log(`LEWAT   ${theme.id}: ${targetId} sudah ada`); continue; }
    if (!fs.existsSync(file)) { failed.push(`${theme.id}: master tidak ada di disk`); continue; }

    const draft = legacyDraftSpec(fs.readFileSync(file, "utf-8"), theme.defaultMedia);
    if (!draft.ok) { failed.push(`${theme.id}: spesifikasi tidak valid (${draft.errors.join("; ")})`); continue; }
    const { seed } = draft;
    const music = await resolveThemeMusic(theme.defaultMusicUrl ?? "");
    const musicUrl = music.ok ? music.url : null;

    console.log(`${apply ? "BUAT   " : "RENCANA"} ${targetId}: palet ${seed.found.length}/8, huruf ${seed.fontsFound.length}/3, tekstur ${seed.textureFound ? "ya" : "tidak"}, media ${Object.keys(draft.spec.defaultMedia).length}, musik ${musicUrl ? "ya" : "tidak"}`);
    if (!apply) continue;

    await ensureSpecFonts(draft.spec);
    const spec = await fitSpecFrames(draft.spec);
    const { html, issues } = compileAndAudit(spec);
    if (issues.length) { failed.push(`${theme.id}: gagal audit (${issues.map((i) => i.code).join(", ")})`); continue; }

    const target = builderMasterPath(category, targetId);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, html, "utf-8");
    try {
      const maxOrder = await prisma.theme.aggregate({ _max: { sortOrder: true } });
      const row = await prisma.theme.create({
        data: {
          id: targetId,
          name: `${theme.name} Builder`.slice(0, 60),
          description: `Padanan builder dari tema ${theme.name}: palet, huruf, dan media diambil dari tema lama; tata letak mengikuti blueprint.`,
          category,
          eventType: "WEDDING",
          series: SERIES[category],
          isActive: false,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          builderSpec: spec as unknown as Prisma.InputJsonObject,
          defaultMedia: builderDefaultMedia(spec),
          defaultMusicUrl: musicUrl,
        },
        select: { id: true, name: true, category: true, description: true },
      });
      await recordBuilderRevision(null, { ...row, category }, spec, "CREATE");
      created++;
    } catch (err) {
      fs.rmSync(target, { force: true });
      failed.push(`${theme.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n${apply ? `${created} draf dibuat` : "Rencana saja; tambahkan --apply untuk menulis"}, ${skipped} dilewati, ${failed.length} gagal.`);
  for (const f of failed) console.error(`GAGAL   ${f}`);
  if (failed.length) process.exitCode = 1;
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
