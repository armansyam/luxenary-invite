import fs from "fs";
import path from "path";
import { renderTemplateFile } from "./renderTemplate";
import { composeDemoTemplateData } from "./demoRegistry";
import { prisma } from "./prisma";
import { getAdminSetting } from "./settings";
import { masterTemplateCache } from "./cache";
import { escapeHtml } from "./escapeHtml";
import { logger } from "./logger";

/**
 * Compiles a single theme demo into a standalone static HTML file in public/demo/[themeId]/index.html
 */
export async function compileAndSaveStaticDemo(
  themeId: string,
  customDemoData?: any,
  forcedVersion?: number | string
): Promise<string> {
  masterTemplateCache.clear();
  const cleanId = themeId.toLowerCase().trim();
  let resolvedData = customDemoData;
  let settingUpdatedAt: number = Date.now();

  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: `theme_demo_${cleanId}` },
      select: { value: true, updatedAt: true },
    });
    if (setting) {
      if (resolvedData === undefined && setting.value) {
        resolvedData = JSON.parse(setting.value);
      }
      if (setting.updatedAt) {
        settingUpdatedAt = new Date(setting.updatedAt).getTime();
      }
    }
  } catch (err) {
    logger.warn("DemoPublisher", "Data demo kustom tidak terbaca; demo dikompilasi dengan bawaan tema", { theme: cleanId, error: err instanceof Error ? err.message : String(err) });
  }

  const version = forcedVersion || settingUpdatedAt || Date.now();
  const data = composeDemoTemplateData(cleanId, resolvedData, version);

  // Construct absolute OpenGraph meta tags for rich WhatsApp & social share previews
  const demoHost = (process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : "http://localhost:3000")).replace(/\/$/, "");
  const rawCover = (data as any).landingCoverUrl || (data as any).sidebarPhotoUrl || `/demo/${cleanId}/cover.webp`;
  const absoluteCover = rawCover.startsWith("http") ? rawCover : `${demoHost}${rawCover.startsWith("/") ? "" : "/"}${rawCover}`;
  const evType = ((data as any).eventType || "WEDDING").toUpperCase();
  let demoTitle = `The Wedding of ${(data as any).groomName || "Groom"} & ${(data as any).brideName || "Bride"}`;
  let demoDesc = `Undangan pernikahan digital eksklusif. Desain elegan, split desktop view, RSVP real-time & galeri momen.`;

  if (evType === "BIRTHDAY") {
    demoTitle = `Birthday Celebration of ${(data as any).personName || (data as any).personNickname || "Special One"}`;
    demoDesc = `Undangan ulang tahun digital eksklusif. Desain elegan, responsif, RSVP real-time & galeri momen.`;
  } else if (evType === "KHITAN") {
    demoTitle = `Walimatul Khitan ${(data as any).childName || "Ananda"}`;
    demoDesc = `Undangan Walimatul Khitan digital eksklusif. Doa bersama, agenda acara, dan konfirmasi kehadiran.`;
  } else if (evType === "AQIQAH") {
    demoTitle = `Tasyakuran Aqiqah ${(data as any).babyName || "Buah Hati"}`;
    demoDesc = `Undangan tasyakuran kelahiran dan aqiqah digital eksklusif.`;
  } else if (evType === "WISUDA") {
    demoTitle = `Wisuda & Kelulusan ${(data as any).graduateName || "Wisudawan"}`;
    demoDesc = `Undangan syukuran kelulusan akademik digital eksklusif.`;
  } else if (evType === "GATHERING") {
    demoTitle = (data as any).eventTitle || "Undangan Resmi Acara";
    demoDesc = (data as any).eventSubtitle || `Undangan resmi pertemuan dan silaturahmi.`;
  }
  const platformName = await getAdminSetting("platform_name", "Platform Undangan");

  const safeDemoTitle = escapeHtml(demoTitle);
  const safeDemoDesc = escapeHtml(demoDesc);
  const safeCover = escapeHtml(absoluteCover);

  (data as any).metaTagsHtml = `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>${safeDemoTitle}</title>
    <meta name="description" content="${safeDemoDesc}">
    <meta property="og:site_name" content="${escapeHtml(platformName)}">
    <meta property="og:title" content="${safeDemoTitle}">
    <meta property="og:description" content="${safeDemoDesc}">
    <meta property="og:image" content="${safeCover}">
    <meta property="og:image:secure_url" content="${safeCover}">
    <meta property="og:image:type" content="image/webp">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeDemoTitle}">
    <meta name="twitter:description" content="${safeDemoDesc}">
    <meta name="twitter:image" content="${safeCover}">
  `;

  let html = await renderTemplateFile(cleanId, data);

  // Inject cover-mode script & styles for lightweight catalog preview
  const coverModeInjection = `
    <script>
      if (window.location.search.includes('mode=cover')) {
        document.documentElement.classList.add('mode-cover');
      }
    </script>
    <style>
      html.mode-cover body > *:not(#coverScreen):not(.cover-screen):not(#coverOverlay):not(#hero):not(.hero-section):not(.main-content-wrapper) {
        display: none !important;
      }
      /* Fallback for themes that wrap cover in a main wrapper */
      html.mode-cover .main-scroll-panel > *:not(#coverScreen):not(.cover-screen):not(#coverOverlay):not(#hero):not(.hero-section) {
        display: none !important;
      }
      html.mode-cover body { overflow: hidden !important; background: transparent !important; }
      html.mode-cover { overflow: hidden !important; }
    </style>
  </head>
  `;
  html = html.replace('</head>', coverModeInjection);

  const targetDir = path.join(process.cwd(), "public", "demo", cleanId);
  try {
    await fs.promises.access(targetDir);
  } catch {
    await fs.promises.mkdir(targetDir, { recursive: true });
  }

  const targetFilePath = path.join(targetDir, "index.html");
  await fs.promises.writeFile(targetFilePath, html, "utf-8");

  return `/demo/${cleanId}/index.html`;
}

/**
 * Compiles all active themes in the system into pre-compiled static demo HTML files.
 * Triggered automatically when Admin clicks "Sync & Pembaruan Cache" or modifies Demo Studio.
 */
export async function compileAllStaticDemos(): Promise<number> {
  // Purge in-memory template cache before compiling all static demos so changes are always fresh
  masterTemplateCache.clear();

  const themes = await prisma.theme.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let count = 0;
  for (const t of themes) {
    const themeId = t.id.toLowerCase().trim();

    // Check if custom demo settings exist in database
    let customData = undefined;
    try {
      const setting = await prisma.adminSetting.findUnique({
        where: { key: `theme_demo_${themeId}` },
      });
      if (setting && setting.value) {
        customData = JSON.parse(setting.value);
      }
    } catch (err) {
      logger.warn("DemoPublisher", "Data demo kustom tidak terbaca; demo dikompilasi dengan bawaan tema", { theme: themeId, error: err instanceof Error ? err.message : String(err) });
    }

    await compileAndSaveStaticDemo(themeId, customData);
    count++;
  }

  return count;
}
