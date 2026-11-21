import fs from "fs";
import path from "path";
import { renderTemplateFile } from "./renderTemplate";
import { composeInvitationData } from "./themeEngine";
import { buildDemoInvitation } from "./demoInvitation";
import { prisma } from "./prisma";
import { getAdminSetting } from "./settings";
import { masterTemplateCache } from "./cache";
import { escapeHtml } from "./escapeHtml";
import { logger } from "./logger";
import { isSafePathSegment } from "./fsSafe";
import { resolveSubEventMeta } from "./invitationUtils";
import { bumpRenderVersion, currentRenderVersion, demoVersionKey, splitVersionMarker, withVersionMarker, writeFileAtomic } from "./renderVersion";
import { syncSharedFiles } from "./sharedFiles";

function cleanDemoId(themeId: string): string {
  const cleanId = themeId.toLowerCase().trim();
  if (!isSafePathSegment(cleanId)) {
    throw new Error(`ID tema tidak valid untuk demo statis: ${JSON.stringify(themeId)}`);
  }
  return cleanId;
}

const demoFilePath = (cleanId: string) => path.join(process.cwd(), "public", "demo", cleanId, "index.html");

/**
 * Dipanggil setelah data demo atau master tema berubah: mengompilasi demo ke public/demo/<id>/index.html dan menaikkan
 * versinya agar server aplikasi lain membangun ulang salinan mereka.
 */
export async function compileAndSaveStaticDemo(themeId: string, customDemoData?: any): Promise<string> {
  const cleanId = cleanDemoId(themeId);
  const version = await bumpRenderVersion(demoVersionKey(cleanId));
  await buildStaticDemo(cleanId, customDemoData, version);
  return `/demo/${cleanId}/index.html`;
}

/** HTML demo untuk pengunjung; berkas yang belum ada atau bertanda versi lain dibangun ulang tanpa menaikkan versi. */
export async function serveStaticDemo(themeId: string): Promise<string> {
  const cleanId = cleanDemoId(themeId);
  const version = await currentRenderVersion(demoVersionKey(cleanId));
  try {
    const file = splitVersionMarker(await fs.promises.readFile(demoFilePath(cleanId), "utf-8"));
    if (file.version === version) return file.html;
  } catch (err) {
    // Belum ada demo statis (ENOENT) adalah jalur normal menuju kompilasi di bawah; galat lain dicatat.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn("DemoPublisher", "Demo statis tidak terbaca; dikompilasi ulang", { theme: cleanId, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return buildStaticDemo(cleanId, undefined, version);
}

async function buildStaticDemo(cleanId: string, customDemoData: any, version: number): Promise<string> {
  // Hasil kompilasi disimpan dengan versi ini, jadi aset demo yang baru dibuat server lain wajib sudah tertarik.
  await syncSharedFiles({ force: true });
  masterTemplateCache.clear();
  let resolvedData = customDemoData;

  try {
    if (resolvedData === undefined) {
      const setting = await prisma.adminSetting.findUnique({ where: { key: `theme_demo_${cleanId}` }, select: { value: true } });
      if (setting?.value) resolvedData = JSON.parse(setting.value);
    }
  } catch (err) {
    logger.warn("DemoPublisher", "Data demo kustom tidak terbaca; demo dikompilasi dengan bawaan tema", { theme: cleanId, error: err instanceof Error ? err.message : String(err) });
  }

  // Demo dirender oleh engine undangan klien dari undangan virtual, sehingga hasilnya sama dengan undangan nyata.
  const theme = await prisma.theme.findUnique({ where: { id: cleanId }, select: { eventType: true, subEvent: true } });
  const data = (await composeInvitationData(buildDemoInvitation(cleanId, resolvedData, theme?.eventType, theme?.subEvent))) as Record<string, any>;

  // Construct absolute OpenGraph meta tags for rich WhatsApp & social share previews
  const demoHost = (process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : "http://localhost:3000")).replace(/\/$/, "");
  const rawCover = (data as any).landingCoverUrl || (data as any).sidebarPhotoUrl || `/demo/${cleanId}/cover.webp`;
  const absoluteCover = rawCover.startsWith("http") ? rawCover : `${demoHost}${rawCover.startsWith("/") ? "" : "/"}${rawCover}`;
  const evType = ((data as any).eventType || "WEDDING").toUpperCase();
  const subEvent = (data as any).subEvent ?? theme?.subEvent ?? null;
  let demoTitle = `The Wedding of ${(data as any).groomNickname || "Groom"} & ${(data as any).brideNickname || "Bride"}`;
  let demoDesc = `Undangan pernikahan digital eksklusif. Desain elegan, split desktop view, RSVP real-time & galeri momen.`;

  if (evType === "PERSONAL") {
    const meta = resolveSubEventMeta("PERSONAL", subEvent);
    const displayName = (data as any).mainName || (data as any).personName || (data as any).personNickname || "Tuan Rumah";
    demoTitle = `${meta.eventLabel} ${displayName}`;
    demoDesc = `Undangan ${meta.label.toLowerCase()} digital eksklusif. Desain elegan, responsif, RSVP real-time & galeri momen.`;
  } else if (evType === "EVENT") {
    demoTitle = (data as any).eventTitle || subEvent || "Undangan Resmi Acara";
    demoDesc = (data as any).eventSubtitle || `Undangan resmi acara dan silaturahmi digital eksklusif.`;
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

  let html = await renderTemplateFile(cleanId, data, { editMode: false, invitationId: `demo-${cleanId}` });

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

  // Cron harian mengompilasi ulang demo saat situs melayani pengunjung; /demo/[theme] tidak boleh membaca berkas setengah tertulis.
  await writeFileAtomic(demoFilePath(cleanId), withVersionMarker(html, version));
  return html;
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

const STALE_DEMO_MAX_AGE_MS = 7 * 86_400_000;

/**
 * Tanggal acara demo dihitung saat kompilasi (`demoEventDate`), jadi demo statis yang tidak dikompilasi ulang
 * lama-lama kembali menampilkan hitung mundur 00. Dipanggil cron harian: hanya demo yang berkasnya hilang atau
 * berumur lebih dari 7 hari yang dikompilasi ulang.
 */
export async function recompileStaleStaticDemos(now = Date.now()): Promise<{ recompiled: number; failed: string[] }> {
  const themes = await prisma.theme.findMany({ where: { isActive: true }, select: { id: true } });
  let recompiled = 0;
  const failed: string[] = [];
  for (const t of themes) {
    const themeId = t.id.toLowerCase().trim();
    const filePath = demoFilePath(themeId);
    const mtime = await fs.promises.stat(filePath).then((s) => s.mtimeMs, () => 0);
    if (now - mtime < STALE_DEMO_MAX_AGE_MS) continue;
    try {
      await compileAndSaveStaticDemo(themeId);
      recompiled++;
    } catch (err) {
      failed.push(themeId);
      logger.error("DemoPublisher", "Gagal mengompilasi ulang demo statis yang basi", err, { theme: themeId });
    }
  }
  return { recompiled, failed };
}
