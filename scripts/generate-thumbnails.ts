/**
 * generate-thumbnails.ts
 * Generate thumbnail_mobile.webp (390x844 portrait) untuk semua tema
 * yang belum memilikinya, menggunakan cover.webp sebagai sumber.
 */
import sharp from "sharp";
import path from "path";
import fs from "fs";

const DEMO_DIR = path.join(process.cwd(), "public/demo");
const THUMBNAIL_W = 390;
const THUMBNAIL_H = 844;

async function generateThumbnail(themeId: string): Promise<void> {
  const themeDir = path.join(DEMO_DIR, themeId);
  const coverPath = path.join(themeDir, "cover.webp");
  const outPath = path.join(themeDir, "thumbnail_mobile.webp");

  if (fs.existsSync(outPath)) {
    return;
  }

  if (!fs.existsSync(coverPath)) {
    return;
  }

  try {
    await sharp(coverPath)
      .resize(THUMBNAIL_W, THUMBNAIL_H, { fit: "cover", position: "top" })
      .webp({ quality: 82, effort: 4 })
      .toFile(outPath);

    const stat = fs.statSync(outPath);
    console.log(`✅ ${themeId}: thumbnail generated (${(stat.size / 1024).toFixed(0)}KB)`);
  } catch (err: any) {
    console.error(`❌ ${themeId}: failed — ${err.message}`);
  }
}

async function main() {
  if (!fs.existsSync(DEMO_DIR)) {
    console.log(`⚠️ Demo directory ${DEMO_DIR} does not exist.`);
    return;
  }

  const entries = fs.readdirSync(DEMO_DIR, { withFileTypes: true });
  const themeDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  console.log(`\n📸 Memeriksa dan membuat thumbnail_mobile.webp untuk ${themeDirs.length} tema di public/demo...\n`);
  let generated = 0;
  for (const themeId of themeDirs) {
    const outPath = path.join(DEMO_DIR, themeId, "thumbnail_mobile.webp");
    const wasMissing = !fs.existsSync(outPath);
    await generateThumbnail(themeId);
    if (wasMissing && fs.existsSync(outPath)) generated++;
  }
  console.log(`\n✨ Selesai. Total thumbnail baru yang digenerate: ${generated}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

