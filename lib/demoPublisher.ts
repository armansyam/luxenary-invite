import fs from "fs";
import path from "path";
import { renderTemplateFile } from "./renderTemplate";
import { composeDemoTemplateData } from "./demoRegistry";
import { prisma } from "./prisma";

/**
 * Compiles a single theme demo into a standalone static HTML file in public/demo/[themeId]/index.html
 */
export async function compileAndSaveStaticDemo(themeId: string, customDemoData?: any): Promise<string> {
  const cleanId = themeId.toLowerCase().trim();
  let resolvedData = customDemoData;
  if (resolvedData === undefined) {
    try {
      const setting = await prisma.adminSetting.findUnique({
        where: { key: `theme_demo_${cleanId}` },
      });
      if (setting && setting.value) {
        resolvedData = JSON.parse(setting.value);
      }
    } catch {}
  }

  const chosenPalette = resolvedData?.defaultPalette || resolvedData?.colorPalette;
  const data = composeDemoTemplateData(cleanId, chosenPalette, resolvedData);

  // Construct absolute OpenGraph meta tags for rich WhatsApp & social share previews
  const demoHost = "https://luxvite.id";
  const rawCover = (data as any).landingCoverUrl || (data as any).sidebarPhotoUrl || `/demo/${cleanId}/cover.webp`;
  const absoluteCover = rawCover.startsWith("http") ? rawCover : `${demoHost}${rawCover.startsWith("/") ? "" : "/"}${rawCover}`;
  const groom = (data as any).groomName || "Groom";
  const bride = (data as any).brideName || "Bride";
  const demoTitle = `The Wedding of ${groom} & ${bride} — ${(data as any).themeName || cleanId.toUpperCase()}`;
  const demoDesc = `Undangan pernikahan digital eksklusif tema ${(data as any).themeName || cleanId.toUpperCase()}. Desain elegan, split desktop view, RSVP real-time & galeri momen.`;

  (data as any).metaTagsHtml = `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>${demoTitle}</title>
    <meta name="description" content="${demoDesc}">
    <meta property="og:site_name" content="Luxenary">
    <meta property="og:title" content="${demoTitle}">
    <meta property="og:description" content="${demoDesc}">
    <meta property="og:image" content="${absoluteCover}">
    <meta property="og:image:secure_url" content="${absoluteCover}">
    <meta property="og:image:type" content="image/webp">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${demoTitle}">
    <meta name="twitter:description" content="${demoDesc}">
    <meta name="twitter:image" content="${absoluteCover}">
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
    } catch {}

    await compileAndSaveStaticDemo(themeId, customData);
    count++;
  }

  return count;
}
