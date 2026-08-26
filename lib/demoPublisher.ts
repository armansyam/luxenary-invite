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
  const data = composeDemoTemplateData(cleanId, "champagne", customDemoData);
  const html = await renderTemplateFile(cleanId, data);

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
