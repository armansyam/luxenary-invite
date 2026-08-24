import fs from "fs";
import path from "path";

const themes = [
  { id: "kalandra", srcDir: "example" },
  { id: "valente", srcDir: "example2" },
  { id: "aurelia", srcDir: "example3" },
  { id: "prameswari", srcDir: "example4" },
  
  // Duplicates for the remaining 5 for now
  { id: "wave", srcDir: "example" },
  { id: "artisan", srcDir: "example2" },
  { id: "papercut", srcDir: "example3" },
  { id: "ameera", srcDir: "example4" },
  { id: "dillalucky", srcDir: "example4" },
];

function setupDemoFolders() {
  const publicDir = path.join(process.cwd(), "public");

  for (const t of themes) {
    const srcPath = path.join(publicDir, t.srcDir);
    const destPath = path.join(publicDir, "demo", t.id);

    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    if (!fs.existsSync(srcPath)) {
      console.warn(`Source folder not found: ${srcPath}`);
      continue;
    }

    const files = fs.readdirSync(srcPath).filter(f => f.endsWith(".webp"));
    if (files.length < 5) {
      console.warn(`Folder ${srcPath} has too few photos (${files.length})`);
      continue;
    }

    // Standardized Slots:
    // Index 0: cover.webp
    // Index 1: hero.webp
    // Index 2: background.webp
    // Index 3: groom.webp
    // Index 4: bride.webp
    // Index 5..12: gallery_01.webp .. gallery_08.webp

    const copyMap = [
      { src: files[0], dest: "cover.webp" },
      { src: files[1] || files[0], dest: "hero.webp" },
      { src: files[2] || files[0], dest: "background.webp" },
      { src: files[3] || files[0], dest: "groom.webp" },
      { src: files[4] || files[1] || files[0], dest: "bride.webp" },
    ];

    // Add up to 8 gallery photos
    for (let g = 0; g < 8; g++) {
      const srcFile = files[5 + g] || files[g % files.length];
      const numStr = String(g + 1).padStart(2, "0");
      copyMap.push({ src: srcFile, dest: `gallery_${numStr}.webp` });
    }

    for (const item of copyMap) {
      const srcFileAbs = path.join(srcPath, item.src);
      const destFileAbs = path.join(destPath, item.dest);
      fs.copyFileSync(srcFileAbs, destFileAbs);
    }

    console.log(`✅ [public/demo/${t.id}] Prepared standardized slots (cover, hero, background, groom, bride, gallery_01..08) from ${t.srcDir}`);
  }
}

setupDemoFolders();
