import fs from "fs";
import path from "path";

/**
 * Render a template file by replacing {{key}} placeholders with values from `data`.
 * If `data` contains HTML (e.g. eventDataHtml), it is inserted as-is.
 */
export function renderTemplateFile(templateName: string, data: Record<string, string>): string {
  const tplPath = path.join(process.cwd(), "themes", `${templateName}.html`);
  let tpl = fs.readFileSync(tplPath, "utf-8");

  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = data[key];
    return val ?? "";
  });
}
