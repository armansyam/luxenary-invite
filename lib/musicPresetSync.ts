import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export async function syncPhysicalMusicPresets() {
  const musicDir = path.join(process.cwd(), "public", "music");
  if (!fs.existsSync(musicDir)) return;

  try {
    const files = await fs.promises.readdir(musicDir);
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if ([".mp3", ".ogg", ".wav", ".m4a", ".flac", ".aac"].includes(ext)) {
        const fileUrl = `/music/${f}`;
        const exists = await prisma.musicPreset.findFirst({ where: { url: fileUrl } });
        if (!exists) {
          let title = path.basename(f, ext).replace(/[-_]/g, " ");
          let composer = "Koleksi Musik Sistem";
          let genre = "Romantis";
          let sortOrder = 10;

          if (f.toLowerCase().includes("bermuara")) {
            title = "Bermuara";
            composer = "Rizky Febian & Mahalini";
            genre = "Pop Romantis";
            sortOrder = 1;
          } else if (f.toLowerCase().includes("canon")) {
            title = "Canon in D";
            composer = "Johann Pachelbel";
            genre = "Klasik Instrumental Sakral";
            sortOrder = 2;
          }

          await prisma.musicPreset.create({
            data: {
              title,
              composer,
              genre,
              url: fileUrl,
              durationSec: 180,
              isActive: true,
              sortOrder,
            },
          });
        }
      }
    }
  } catch (err) {
    console.warn("[syncPhysicalMusicPresets warning]:", err);
  }
}
