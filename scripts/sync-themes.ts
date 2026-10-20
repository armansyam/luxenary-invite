import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import type { ThemeCategory } from "@prisma/client";
import fs from "fs";
import path from "path";

async function main() {
  const themesDir = path.join(process.cwd(), "themes");
  const EVENT_FOLDERS = [
    { eventFolder: "wedding",  eventType: "WEDDING" as const },
    { eventFolder: "birthday", eventType: "BIRTHDAY" as const },
    { eventFolder: "khitan",   eventType: "KHITAN" as const },
    { eventFolder: "aqiqah",   eventType: "AQIQAH" as const },
    { eventFolder: "wisuda",   eventType: "WISUDA" as const },
    { eventFolder: "general",  eventType: "GATHERING" as const },
  ];
  const STYLE_FOLDERS: Array<{ name: string; category: ThemeCategory; series: string }> = [
    { name: "minimalist", category: "minimalist", series: "Minimalist" },
    { name: "modern", category: "modern", series: "Modern" },
    { name: "traditional", category: "traditional", series: "Traditional" },
  ];

  const discovered: Array<{ id: string; name: string; category: ThemeCategory; series: string; eventType: any }> = [];

  for (const { eventFolder, eventType } of EVENT_FOLDERS) {
    for (const style of STYLE_FOLDERS) {
      const targetDir = path.join(themesDir, eventFolder, style.name);
      if (!fs.existsSync(targetDir)) continue;

      const files = fs.readdirSync(targetDir);
      for (const file of files) {
        if (!file.endsWith(".html") || file.includes("blueprint")) continue;
        const id = file.replace(".html", "").toLowerCase();
        if (discovered.some((d) => d.id === id)) continue;

        const formattedName = id
          .split(/[-_]/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");

        discovered.push({
          id,
          name: formattedName,
          category: style.category,
          series: style.series,
          eventType,
        });
      }
    }
  }

  console.log(`Discovered ${discovered.length} themes on disk.`);

  for (let i = 0; i < discovered.length; i++) {
    const d = discovered[i];
    const existing = await prisma.theme.findUnique({ where: { id: d.id } });

    // Nama, urutan, dan status aktif yang diubah admin lewat panel dipertahankan; skrip ini berjalan di setiap deploy.
    await prisma.theme.upsert({
      where: { id: d.id },
      update: {
        category: d.category,
        series: d.series,
        eventType: d.eventType,
        ...(existing ? {} : { isActive: true }),
      },
      create: {
        id: d.id,
        name: d.name,
        category: d.category,
        series: d.series,
        eventType: d.eventType,
        sortOrder: i + 1,
        isActive: true,
      },
    });

    // Also seed AdminSetting theme_demo_${d.id} if not already present
    const { DEMO_REGISTRY } = await import("../lib/demoRegistry");
    const { getThemeBlueprint } = await import("../lib/themeDefaults");
    const settingKey = `theme_demo_${d.id}`;
    const existingSetting = await prisma.adminSetting.findUnique({ where: { key: settingKey } });

    if (!existingSetting) {
      const demo = DEMO_REGISTRY[d.id];
      if (demo) {
        const blueprint = getThemeBlueprint(d.id, demo);
        // Hanya label yang memang didefinisikan data demo. Menyalin seluruh blueprint (beserta cadangan pernikahan seperti
        // "THE COUPLE") membuat nilai itu menimpa teks master; Studio Demo sudah menampilkan blueprint sebagai cadangan.
        const customLabels = (demo as { customLabels?: Record<string, string> }).customLabels || {};
        const val = JSON.stringify({
          ...demo,
          openingQuote: demo.openingQuote || blueprint.openingQuote,
          openingQuoteRef: demo.openingQuoteRef || blueprint.openingQuoteRef,
          closingQuote: blueprint.closingQuote,
          closingSub: blueprint.closingSub,
          audioUrl: demo.audioUrl || blueprint.defaultMusicUrl,
          customLabels,
        });
        await prisma.adminSetting.create({
          data: {
            key: settingKey,
            value: val,
            label: `Demo Data Konfigurasi - ${d.name.toUpperCase()}`,
            group: "themes",
          },
        });
        console.log(`- Created AdminSetting: ${settingKey}`);
      }
    }

    console.log(`- Upserted: ${d.id} (${d.name}) [${d.category}]`);
  }

  const allInDb = await prisma.theme.findMany({ orderBy: { sortOrder: "asc" } });
  const allSettings = await prisma.adminSetting.count({ where: { key: { startsWith: "theme_demo_" } } });
  console.log(`\nTotal Themes in DB: ${allInDb.length}`);
  console.log(`Total theme_demo_* in AdminSetting DB: ${allSettings}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
