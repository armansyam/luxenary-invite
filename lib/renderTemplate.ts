import fs from "fs";
import path from "path";

const THEME_MAP: Record<string, { file: string; folder: "modern" | "traditional" }> = {
  // New Clean IDs
  "kalandra": { file: "kalandra.html", folder: "modern" },
  "valente": { file: "valente.html", folder: "modern" },
  "aurelia": { file: "aurelia.html", folder: "modern" },
  "artisan": { file: "artisan.html", folder: "modern" },
  "prameswari": { file: "prameswari.html", folder: "traditional" },

  // Backward compatibility alias mapping
  "kila": { file: "kalandra.html", folder: "modern" },
  "premium-kila": { file: "kalandra.html", folder: "modern" },
  "ivanna": { file: "valente.html", folder: "modern" },
  "premium-ivanna": { file: "valente.html", folder: "modern" },
  "danila": { file: "aurelia.html", folder: "modern" },
  "premium-danila": { file: "aurelia.html", folder: "modern" },
  "papercut": { file: "artisan.html", folder: "modern" },
  "moody-papercut": { file: "artisan.html", folder: "modern" },
  "aruna": { file: "prameswari.html", folder: "traditional" },
  "heritage-aruna": { file: "prameswari.html", folder: "traditional" },
};

/**
 * Render a template file by replacing {{key}} placeholders with values from `data`.
 * Automatically resolves from themes/modern/ or themes/traditional/.
 */
export function renderTemplateFile(templateName: string, data: Record<string, any>): string {
  const info = THEME_MAP[templateName] || { file: `${templateName}.html`, folder: "modern" };

  let tplPath = path.join(process.cwd(), "themes", info.folder, info.file);

  // Fallback checks across folders
  if (!fs.existsSync(tplPath)) {
    const modernCheck = path.join(process.cwd(), "themes", "modern", `${templateName}.html`);
    const traditionalCheck = path.join(process.cwd(), "themes", "traditional", `${templateName}.html`);
    if (fs.existsSync(modernCheck)) {
      tplPath = modernCheck;
    } else if (fs.existsSync(traditionalCheck)) {
      tplPath = traditionalCheck;
    } else {
      // Default fallback
      tplPath = path.join(process.cwd(), "themes", "modern", "kalandra.html");
    }
  }

  let tpl = fs.readFileSync(tplPath, "utf-8");

  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

