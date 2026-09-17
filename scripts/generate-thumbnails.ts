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

const THEMES_MISSING = [
  "ameera", "candani", "chronicle", "dillalucky", "lagaligo",
  "lumina", "mayang", "papercut", "prameswari", "solaria", "wave"
];

async function generateThumbnail(themeId: string): Promise<void> {
  const themeDir = path.join(DEMO_DIR, themeId);
  const coverPath = path.join(themeDir, "cover.webp");
  const outPath = path.join(themeDir, "thumbnail_mobile.webp");

  if (fs.existsSync(outPath)) {
    console.log(`⏭️  ${themeId}: already exists — skip.`);
    return;
  }

  if (!fs.existsSync(coverPath)) {
    console.warn(`⚠️  ${themeId}: cover.webp not found — skip.`);
    return;
  }

  try {
    await sharp(coverPath)
      .resize(THUMBNAIL_W, THUMBNAIL_H, { fit: "cover", position: "top" })
      .webp({ quality: 82, effort: 4 })
      .toFile(outPath);

    const stat = fs.statSync(outPath);
    console.log(`✅ ${themeId}: generated (${(stat.size / 1024).toFixed(0)}KB)`);
  } catch (err: any) {
    console.error(`❌ ${themeId}: failed — ${err.message}`);
  }
}

async function main() {
  console.log(`\n📸 Generating thumbnail_mobile.webp for ${THEMES_MISSING.length} themes...\n`);
  for (const themeId of THEMES_MISSING) {
    await generateThumbnail(themeId);
  }
  console.log(`\n✨ Done.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
