/**
 * seed-theme-default-media.ts
 * Mengisi Theme.defaultMedia.GLOBAL_FIXED_BG dari latar yang memang sudah dirender master (CSS `.fixed-bg-layer`) atau
 * dari tekstur spesifikasi builder, sehingga Studio klien dapat menampilkan thumbnail "Bawaan tema".
 * Hanya path aset tema/platform yang diterima (lib/themeDefaultMedia.ts); foto /demo/ tidak pernah disalin.
 * Tema tanpa latar bawaan dilaporkan, tidak ditebak. Tanpa --apply skrip hanya melaporkan.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma, pool } from "../lib/prisma";
import { parseThemeDefaultMedia, type ThemeDefaultMedia } from "../lib/themeDefaultMedia";
import { storedBuilderSpec } from "../lib/themeBuilder/server";
import { THEME_EVENT_FOLDERS } from "../lib/themePaths";

const THEMES_DIR = path.join(process.cwd(), "themes");

function findMaster(themeId: string): string | null {
  for (const { eventFolder } of THEME_EVENT_FOLDERS) {
    const base = path.join(THEMES_DIR, eventFolder);
    if (!fs.existsSync(base)) continue;
    for (const style of fs.readdirSync(base, { withFileTypes: true })) {
      const file = path.join(base, style.isDirectory() ? style.name : "", `${themeId}.html`);
      if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
    }
  }
  return null;
}

function staticBackgroundOf(html: string): string | null {
  for (const block of html.matchAll(/\.fixed-bg-layer\s*\{([^}]*)\}/g)) {
    const url = block[1].match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/)?.[1];
    if (url && !url.includes("{{")) return url;
  }
  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const themes = await prisma.theme.findMany({ select: { id: true, eventType: true, builderSpec: true, defaultMedia: true } });
  const missing: string[] = [];
  let changed = 0;

  for (const theme of themes) {
    const current = parseThemeDefaultMedia(theme.defaultMedia);
    const spec = storedBuilderSpec(theme.builderSpec);
    const master = findMaster(theme.id);
    const detected = spec ? spec.texture : master ? staticBackgroundOf(fs.readFileSync(master, "utf-8")) : null;
    const next: ThemeDefaultMedia = { ...current, ...parseThemeDefaultMedia(detected ? { GLOBAL_FIXED_BG: detected } : {}) };

    if (!next.GLOBAL_FIXED_BG) missing.push(`${theme.id} (${theme.eventType})`);
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      changed += 1;
      console.log(`${apply ? "SET " : "PLAN"} ${theme.id}: GLOBAL_FIXED_BG = ${next.GLOBAL_FIXED_BG}`);
      if (apply) await prisma.theme.update({ where: { id: theme.id }, data: { defaultMedia: next } });
    }
  }

  // Undangan lama belum punya salinan: ambil latar dari piring draf miliknya (yang sebenarnya dirender), bukan dari
  // master saat ini yang mungkin sudah didesain ulang.
  const themeDefaults = new Map(
    (await prisma.theme.findMany({ select: { id: true, defaultMedia: true } })).map((t) => [t.id, parseThemeDefaultMedia(t.defaultMedia)] as const),
  );
  const pending = await prisma.invitation.findMany({ where: { themeDefaultMedia: { equals: Prisma.DbNull } }, select: { id: true, themeId: true } });
  let backfilled = 0;
  for (const inv of pending) {
    const draft = path.join(process.cwd(), "data", "drafts", `${inv.id}.html`);
    const fromDraft = fs.existsSync(draft) ? staticBackgroundOf(fs.readFileSync(draft, "utf-8")) : null;
    const next: ThemeDefaultMedia = { ...(themeDefaults.get(inv.themeId) ?? {}), ...parseThemeDefaultMedia(fromDraft ? { GLOBAL_FIXED_BG: fromDraft } : {}) };
    backfilled += 1;
    if (apply) await prisma.invitation.update({ where: { id: inv.id }, data: { themeDefaultMedia: next } });
  }

  // Isian Studio Demo yang menaut foto latar demo yang filenya tidak ada dikosongkan; pratinjau demo sudah melewati
  // berkas yang tidak ada, jadi hasil tampilan tidak berubah dan rujukan putus hilang dari audit.
  const demoSettings = await prisma.adminSetting.findMany({ where: { key: { startsWith: "theme_demo_" } }, select: { key: true, value: true } });
  let clearedBg = 0;
  for (const setting of demoSettings) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(setting.value);
    } catch {
      console.warn(`Isian ${setting.key} bukan JSON valid; dilewati.`);
      continue;
    }
    const bg = data.globalBgUrl;
    if (typeof bg !== "string" || !bg.startsWith("/") || fs.existsSync(path.join(process.cwd(), "public", bg.split("?")[0]))) continue;
    clearedBg += 1;
    console.log(`${apply ? "CLEAR" : "PLAN "} ${setting.key}: globalBgUrl ${bg} tidak ada`);
    if (apply) await prisma.adminSetting.update({ where: { key: setting.key }, data: { value: JSON.stringify({ ...data, globalBgUrl: "" }) } });
  }

  console.log(`\n${themes.length} tema, ${changed} ${apply ? "diperbarui" : "akan diperbarui (jalankan dengan --apply)"}.`);
  console.log(`${clearedBg} isian Studio Demo dengan latar putus ${apply ? "dikosongkan" : "akan dikosongkan"}.`);
  console.log(`${pending.length} undangan tanpa salinan default, ${backfilled} ${apply ? "diisi" : "akan diisi"}.`);
  console.log(`Tanpa latar bawaan terdeteksi (${missing.length}): ${missing.join(", ") || "-"}`);
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
