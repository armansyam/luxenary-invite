import path from "path";

/**
 * Letak berkas master tema. Satu-satunya sumber aturan: `themes/<folder-acara>/<gaya>/<id>.html`. Folder acara adalah
 * nama jenis acara huruf kecil; satu-satunya pengecualian GATHERING yang disimpan di `general` (nama sejak awal, dan
 * blueprint unduhannya `starter-blueprint-general.html`). Blueprint ada di `themes/_blueprints/<folder-acara>/`.
 */
export const THEME_STYLES = ["minimalist", "modern", "traditional"] as const;
export type ThemeStyle = (typeof THEME_STYLES)[number];

export const THEME_EVENT_TYPES = ["WEDDING", "BIRTHDAY", "KHITAN", "AQIQAH", "WISUDA", "GATHERING"] as const;
export type ThemeEventType = (typeof THEME_EVENT_TYPES)[number];

export function eventFolderOf(eventType: string): string {
  const upper = eventType.toUpperCase();
  return upper === "GATHERING" ? "general" : upper.toLowerCase();
}

/** Seluruh folder acara beserta jenis acaranya, untuk pemindaian master. */
export const THEME_EVENT_FOLDERS: ReadonlyArray<{ eventFolder: string; eventType: ThemeEventType }> = THEME_EVENT_TYPES.map((eventType) => ({
  eventFolder: eventFolderOf(eventType),
  eventType,
}));

const themesRoot = () => path.join(/*turbopackIgnore: true*/ process.cwd(), "themes");

export function masterDir(eventType: string, style: string): string {
  return path.join(themesRoot(), eventFolderOf(eventType), style);
}

/** Path master dari nama berkas (`<id>.html`). */
export function masterFilePath(eventType: string, style: string, fileName: string): string {
  return path.join(masterDir(eventType, style), fileName);
}

/** Path master dari ID tema. */
export function masterPathOf(eventType: string, style: string, themeId: string): string {
  return masterFilePath(eventType, style, `${themeId.toLowerCase()}.html`);
}
