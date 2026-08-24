import fs from "fs";
import path from "path";
import sharp from "sharp";

async function compressAllImages() {
  const exampleDir = path.join(process.cwd(), "public", "example");
  const files = fs.readdirSync(exampleDir);

  const imageFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return [".jpg", ".jpeg", ".png"].includes(ext);
  });

  console.log(`Found ${imageFiles.length} images to compress in ${exampleDir}...`);

  let count = 0;
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const inputPath = path.join(exampleDir, file);
    const stat = fs.statSync(inputPath);
    totalOriginalSize += stat.size;

    // Clean filename: e.g. pio08901.webp or pio_08901.webp
    const baseName = path.basename(file, path.extname(file))
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w-]/g, "");
    
    const outputFilename = `${baseName}.webp`;
    const outputPath = path.join(exampleDir, outputFilename);

    try {
      // Process with sharp: max 1600px width/height, quality 82, preserve crisp details
      await sharp(inputPath)
        .rotate() // auto-orient based on EXIF
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
      totalCompressedSize += newStat.size;

      // Remove the old uncompressed jpg/png file
      fs.unlinkSync(inputPath);

      count++;
      if (count % 15 === 0 || count === imageFiles.length) {
        console.log(`[${count}/${imageFiles.length}] Processed: ${outputFilename} (${Math.round(stat.size / 1024)}KB -> ${Math.round(newStat.size / 1024)}KB)`);
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  const origMB = (totalOriginalSize / (1024 * 1024)).toFixed(1);
  const compMB = (totalCompressedSize / (1024 * 1024)).toFixed(1);
  const savedPercent = (((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100).toFixed(1);

  console.log(`\n🎉 COMPRESSION COMPLETE!`);
  console.log(`- Total Files Processed: ${count}`);
  console.log(`- Original Total Size: ${origMB} MB`);
  console.log(`- Compressed WebP Total Size: ${compMB} MB`);
  console.log(`- Total Bandwidth Saved: ${savedPercent}% reduction!`);
}

compressAllImages().catch(console.error);
