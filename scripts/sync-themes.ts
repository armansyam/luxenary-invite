import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
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
  const STYLE_FOLDERS = [
    { name: "minimalist", category: "minimalist", series: "Minimalist" },
    { name: "modern", category: "modern", series: "Modern" },
    { name: "traditional", category: "traditional", series: "Traditional" },
  ];

  const discovered: Array<{ id: string; name: string; category: string; series: string; eventType: any }> = [];

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

    await prisma.theme.upsert({
      where: { id: d.id },
      update: {
        name: d.name,
        category: d.category,
        series: d.series,
        eventType: d.eventType,
        sortOrder: i + 1,
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
        const customLabels = {
          openBtn: blueprint.openBtn,
          coverSubtitle: blueprint.coverSubtitle,
          rsvpTitle: blueprint.rsvpTitle,
          rsvpBtnText: blueprint.rsvpBtnText || "Kirim Konfirmasi & Doa",
          quoteTitle: blueprint.quoteSectionTitle,
          quoteEyebrow: blueprint.quoteSectionEyebrow,
          coupleTitle: blueprint.coupleSectionTitle,
          coupleEyebrow: blueprint.coupleSectionEyebrow || "THE COUPLE",
          coupleSub: blueprint.coupleSectionSub,
          eventsTitle: blueprint.eventsSectionTitle,
          eventsSub: blueprint.eventsSectionSub,
          storyTitle: blueprint.storySectionTitle,
          storyEyebrow: blueprint.storySectionEyebrow || "OUR JOURNEY",
          galleryTitle: blueprint.gallerySectionTitle,
          galleryEyebrow: blueprint.gallerySectionEyebrow,
          galleryQuote: blueprint.galleryQuote,
          dressCodeTitle: blueprint.dressCodeTitle || "Dress Code",
          dressCodeEyebrow: blueprint.dressCodeEyebrow || "A Guide To",
          dressCodeSubtitle: blueprint.dressCodeSubtitle || "Kami mengundang tamu undangan untuk mengenakan palet warna berikut:",
          streamingTitle: blueprint.streamingTitle || "Live Streaming",
          streamingEyebrow: blueprint.streamingEyebrow || "Virtual Ceremony",
          streamingSubtitle: blueprint.streamingSubtitle || "Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:",
          giftTitle: blueprint.giftSectionTitle,
          giftEyebrow: blueprint.giftSectionEyebrow,
          giftDesc: blueprint.giftSectionDesc,
          turutMengundangTitle: blueprint.turutMengundangTitle || "Turut Mengundang",
          turutMengundangEyebrow: blueprint.turutMengundangEyebrow || "Keluarga Besar",
          turutMengundangSubtitle: blueprint.turutMengundangSubtitle || "Keluarga Besar & Kerabat yang turut berbahagia:",
          wishesTitle: blueprint.wishesSectionTitle,
          wishesSub: blueprint.wishesSectionSub,
        };
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
