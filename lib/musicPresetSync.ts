import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

function formatTitleFromFilename(filename: string, ext: string): string {
  const base = path.basename(filename, ext).replace(/[-_]+/g, " ").trim();
  return base
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export async function syncPhysicalMusicPresets() {
  const musicDir = path.join(process.cwd(), "public", "music");
  if (!fs.existsSync(musicDir)) return;

  try {
    const files = await fs.promises.readdir(musicDir);
    const audioFiles = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return [".mp3", ".ogg", ".wav", ".m4a", ".flac", ".aac"].includes(ext);
    });

    for (const f of audioFiles) {
      const ext = path.extname(f).toLowerCase();
      const fileUrl = `/music/${f}`;
      const exists = await prisma.musicPreset.findFirst({ where: { url: fileUrl } });
      if (!exists) {
        const title = formatTitleFromFilename(f, ext);
        const count = await prisma.musicPreset.count();

        await prisma.musicPreset.create({
          data: {
            title,
            composer: null,
            genre: null,
            url: fileUrl,
            durationSec: 180,
            isActive: true,
            sortOrder: count + 1,
          },
        });
      }
    }
  } catch (err) {
    console.warn("[syncPhysicalMusicPresets warning]:", err);
  }
}
