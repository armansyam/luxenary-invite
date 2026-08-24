import fs from "fs";
import path from "path";
import sharp from "sharp";

async function compressDirectory(dirName) {
  const targetDir = path.join(process.cwd(), "public", dirName);
  if (!fs.existsSync(targetDir)) return;

  const files = fs.readdirSync(targetDir);
  const imageFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return [".jpg", ".jpeg", ".png"].includes(ext);
  });

  if (imageFiles.length === 0) {
    console.log(`[${dirName}] No JPG/PNG files to process.`);
    return;
  }

  console.log(`\n========================================`);
  console.log(`📁 Processing ${dirName}: ${imageFiles.length} photos...`);
  console.log(`========================================`);

  let count = 0;
  let totalOrig = 0;
  let totalComp = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const inputPath = path.join(targetDir, file);
    const stat = fs.statSync(inputPath);
    totalOrig += stat.size;

    const baseName = path.basename(file, path.extname(file))
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w-]/g, "");

    const outputFilename = `${baseName}.webp`;
    const outputPath = path.join(targetDir, outputFilename);

    try {
      await sharp(inputPath)
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality: 82,
          effort: 6,
        })
        .toFile(outputPath);

      const newStat = fs.statSync(outputPath);
      totalComp += newStat.size;

      // Delete raw JPG/PNG
      fs.unlinkSync(inputPath);

      count++;
      if (count % 20 === 0 || count === imageFiles.length) {
        console.log(`[${dirName}] [${count}/${imageFiles.length}] ${outputFilename} (${Math.round(stat.size / 1024)}KB -> ${Math.round(newStat.size / 1024)}KB)`);
      }
    } catch (err) {
      console.error(`[${dirName}] Error processing ${file}:`, err);
    }
  }

  const origMB = (totalOrig / (1024 * 1024)).toFixed(1);
  const compMB = (totalComp / (1024 * 1024)).toFixed(1);
  const saved = (((totalOrig - totalComp) / totalOrig) * 100).toFixed(1);

  console.log(`✅ Finished ${dirName}: ${count} files (${origMB}MB -> ${compMB}MB, saved ${saved}%)`);
}

async function runAll() {
  await compressDirectory("example2");
  await compressDirectory("example3");
  await compressDirectory("example4");
  console.log(`\n🎉 ALL 3 FOLDERS COMPRESSED SUCCESSFULLY TO WEBP!`);
}

runAll().catch(console.error);
