import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const themesDir = path.join(process.cwd(), "themes");
  const folders = [
    { name: "premium", category: "premium", series: "Premium" },
    { name: "modern", category: "modern", series: "Modern" },
    { name: "traditional", category: "traditional", series: "Traditional" },
    { name: "", category: "modern", series: "Modern" },
  ];

  const discovered: Array<{ id: string; name: string; category: string; series: string }> = [];

  for (const folder of folders) {
    const targetDir = folder.name ? path.join(themesDir, folder.name) : themesDir;
    if (!fs.existsSync(targetDir)) continue;

    const files = fs.readdirSync(targetDir);
    for (const file of files) {
      if (!file.endsWith(".html") || file === "starter-blueprint.html") continue;
      const id = file.replace(".html", "").toLowerCase();
      if (discovered.some((d) => d.id === id)) continue;

      const formattedName = id
        .split(/[-_]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");

      discovered.push({
        id,
        name: formattedName,
        category: folder.category,
        series: folder.series,
      });
    }
  }

  console.log(`Discovered ${discovered.length} themes on disk.`);

  for (let i = 0; i < discovered.length; i++) {
    const d = discovered[i];
    const existing = await prisma.theme.findUnique({ where: { id: d.id } });

    await prisma.theme.upsert({
      where: { id: d.id },
      update: {
        name: d.name,
        category: d.category,
        series: d.series,
        sortOrder: i + 1,
        ...(existing ? {} : { isActive: true }),
      },
      create: {
        id: d.id,
        name: d.name,
        category: d.category,
        series: d.series,
        sortOrder: i + 1,
        isActive: true,
      },
    });
    console.log(`- Upserted: ${d.id} (${d.name}) [${d.category}]`);
  }

  const allInDb = await prisma.theme.findMany({ orderBy: { sortOrder: "asc" } });
  console.log(`\nTotal Themes in DB: ${allInDb.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
