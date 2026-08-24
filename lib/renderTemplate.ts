import fs from "fs";
import path from "path";

const THEME_MAP: Record<string, { file: string; folder: "premium" | "traditional" }> = {
  // Clean IDs
  "kalandra": { file: "kalandra.html", folder: "premium" },
  "valente": { file: "valente.html", folder: "premium" },
  "aurelia": { file: "aurelia.html", folder: "premium" },
  "artisan": { file: "artisan.html", folder: "premium" },
  "prameswari": { file: "prameswari.html", folder: "traditional" },

  // Backward compatibility alias mapping
  "kila": { file: "kalandra.html", folder: "premium" },
  "premium-kila": { file: "kalandra.html", folder: "premium" },
  "ivanna": { file: "valente.html", folder: "premium" },
  "premium-ivanna": { file: "valente.html", folder: "premium" },
  "danila": { file: "aurelia.html", folder: "premium" },
  "premium-danila": { file: "aurelia.html", folder: "premium" },
  "papercut": { file: "artisan.html", folder: "premium" },
  "moody-papercut": { file: "artisan.html", folder: "premium" },
  "aruna": { file: "prameswari.html", folder: "traditional" },
  "heritage-aruna": { file: "prameswari.html", folder: "traditional" },
};

/**
 * Render a template file by replacing {{key}} placeholders with values from `data`.
 * Automatically resolves from themes/premium/ or themes/traditional/.
 */
export function renderTemplateFile(templateName: string, data: Record<string, any>): string {
  const info = THEME_MAP[templateName] || { file: `${templateName}.html`, folder: "premium" };

  let tplPath = path.join(process.cwd(), "themes", info.folder, info.file);

  // Fallback checks across folders
  if (!fs.existsSync(tplPath)) {
    const premiumCheck = path.join(process.cwd(), "themes", "premium", `${templateName}.html`);
    const traditionalCheck = path.join(process.cwd(), "themes", "traditional", `${templateName}.html`);
    const modernLegacyCheck = path.join(process.cwd(), "themes", "modern", `${templateName}.html`);
    if (fs.existsSync(premiumCheck)) {
      tplPath = premiumCheck;
    } else if (fs.existsSync(traditionalCheck)) {
      tplPath = traditionalCheck;
    } else if (fs.existsSync(modernLegacyCheck)) {
      tplPath = modernLegacyCheck;
    } else {
      // Default fallback
      tplPath = path.join(process.cwd(), "themes", "premium", "kalandra.html");
    }
  }

  let tpl = fs.readFileSync(tplPath, "utf-8");

  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

