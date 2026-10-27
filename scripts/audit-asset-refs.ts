/**
 * audit-asset-refs.ts
 * Gerbang rujukan aset (hanya membaca): setiap path aset lokal yang tertulis di kode, seed, master tema, dan DB
 * harus ada di public/. Master tema dan media bawaan tema tidak boleh menaut /demo/ (foto model etalase).
 * Keluar dengan kode 1 bila ada rujukan putus atau pelanggaran.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma, pool } from "../lib/prisma";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const ASSET_RE = /\/(?:demo|assets|theme-assets|uploads\/theme-assets|fonts|music)\/[A-Za-z0-9_\-./]+\.(?:webp|png|jpe?g|svg|mp4|mp3|woff2?|json)/g;

const CODE_FILES = ["lib/demoRegistry.ts", "lib/themeDefaults.ts", "prisma/defaultSettings.ts", "lib/themeDefaultMedia.ts"];

function htmlUnder(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? htmlUnder(full) : e.name.endsWith(".html") ? [full] : [];
  });
}

interface Finding {
  source: string;
  ref: string;
}

function refsOf(text: string): string[] {
  return [...new Set(text.match(ASSET_RE) ?? [])].filter((ref) => !ref.includes("{{"));
}

async function main() {
  const missing: Finding[] = [];
  const demoInMaster: Finding[] = [];
  let scanned = 0;

  const check = (source: string, text: string, forbidDemo: boolean) => {
    scanned += 1;
    for (const ref of refsOf(text)) {
      if (forbidDemo && ref.startsWith("/demo/")) demoInMaster.push({ source, ref });
      if (!fs.existsSync(path.join(PUBLIC_DIR, ref))) missing.push({ source, ref });
    }
  };

  for (const rel of CODE_FILES) {
    const file = path.join(ROOT, rel);
    if (fs.existsSync(file)) check(rel, fs.readFileSync(file, "utf-8"), false);
  }
  for (const file of htmlUnder(path.join(ROOT, "themes"))) check(path.relative(ROOT, file), fs.readFileSync(file, "utf-8"), true);

  const themes = await prisma.theme.findMany({ select: { id: true, thumbnail: true, defaultMedia: true } });
  for (const t of themes) {
    check(`db:themes.${t.id}.default_media`, JSON.stringify(t.defaultMedia ?? {}), true);
    if (t.thumbnail) check(`db:themes.${t.id}.thumbnail`, t.thumbnail, false);
  }

  const demoSettings = await prisma.adminSetting.findMany({ where: { key: { startsWith: "theme_demo_" } }, select: { key: true, value: true } });
  for (const s of demoSettings) check(`db:admin_settings.${s.key}`, s.value, false);

  console.log(`Sumber dipindai: ${scanned}`);
  console.log(`Rujukan putus: ${missing.length}`);
  for (const f of missing.slice(0, 40)) console.log(`  ${f.source} -> ${f.ref}`);
  console.log(`Master/media bawaan yang menaut /demo/: ${demoInMaster.length}`);
  for (const f of demoInMaster.slice(0, 40)) console.log(`  ${f.source} -> ${f.ref}`);
  if (missing.length || demoInMaster.length) process.exitCode = 1;
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
