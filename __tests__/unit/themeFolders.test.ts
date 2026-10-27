/**
 * Struktur folder themes/: `themes/<folder-acara>/<gaya>/<id>.html` dan `themes/_blueprints/<folder-acara>/`. Pemetaan
 * jenis acara ke folder hanya di lib/themePaths.ts, dan setiap master harus ditemukan renderer di letak itu.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { THEME_EVENT_FOLDERS, THEME_STYLES, eventFolderOf, masterDir, masterFilePath, masterPathOf } from "@/lib/themePaths";
import { resolveThemeEntry } from "@/lib/renderTemplate";

const ROOT = path.join(process.cwd(), "themes");
const eventFolders = THEME_EVENT_FOLDERS.map((f) => f.eventFolder);

const dirs = (p: string) => fs.readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);

const masters = eventFolders.flatMap((folder) =>
  (fs.existsSync(path.join(ROOT, folder)) ? dirs(path.join(ROOT, folder)) : []).flatMap((style) =>
    fs.readdirSync(path.join(ROOT, folder, style)).filter((f) => f.endsWith(".html")).map((file) => ({ folder, style, file, id: file.replace(/\.html$/, "") })),
  ),
);

describe("pemetaan folder acara", () => {
  it("GATHERING di general, jenis lain memakai nama huruf kecilnya", () => {
    expect(eventFolderOf("GATHERING")).toBe("general");
    expect(eventFolderOf("gathering")).toBe("general");
    expect(eventFolders).toEqual(["wedding", "birthday", "khitan", "aqiqah", "wisuda", "general"]);
  });

  it("path master dibentuk dari folder acara, gaya, dan ID huruf kecil", () => {
    expect(masterPathOf("WEDDING", "modern", "Candani")).toBe(path.join(ROOT, "wedding", "modern", "candani.html"));
    expect(masterPathOf("GATHERING", "modern", "prakarsa")).toBe(path.join(ROOT, "general", "modern", "prakarsa.html"));
    expect(masterDir("KHITAN", "traditional")).toBe(path.join(ROOT, "khitan", "traditional"));
    expect(masterFilePath("wisuda", "modern", "toga.html")).toBe(path.join(ROOT, "wisuda", "modern", "toga.html"));
  });
});

describe("isi themes/", () => {
  it("hanya berisi folder acara yang dikenal, _blueprints, dan README", () => {
    const entries = fs.readdirSync(ROOT);
    const unknown = entries.filter((e) => ![...eventFolders, "_blueprints", "README.md"].includes(e));
    expect(unknown).toEqual([]);
  });

  it("setiap folder acara hanya berisi gaya yang dikenal, dan blueprint hanya untuk folder acara yang dikenal", () => {
    for (const folder of eventFolders) {
      if (!fs.existsSync(path.join(ROOT, folder))) continue;
      expect(dirs(path.join(ROOT, folder)).filter((s) => !(THEME_STYLES as readonly string[]).includes(s))).toEqual([]);
    }
    expect(dirs(path.join(ROOT, "_blueprints")).filter((d) => !eventFolders.includes(d))).toEqual([]);
  });

  it("tidak ada master di luar themes/<folder-acara>/<gaya>/ (jalur lama sudah tidak ada)", () => {
    const stray: string[] = [];
    const walk = (dir: string, depth: number) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== "_blueprints") walk(full, depth + 1);
        } else if (e.name.endsWith(".html") && depth !== 2) stray.push(path.relative(ROOT, full));
      }
    };
    walk(ROOT, 0);
    expect(stray).toEqual([]);
  });

  it("ID master huruf kecil, unik di seluruh folder, dan setiap master ditemukan renderer di letaknya", () => {
    expect(masters.length).toBeGreaterThan(30);
    expect(masters.filter((m) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id)).map((m) => m.file)).toEqual([]);
    const ids = masters.map((m) => m.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);

    const mismatched = masters.filter((m) => {
      const entry = resolveThemeEntry(m.id);
      return !entry || eventFolderOf(entry.eventType) !== m.folder || entry.style !== m.style || !fs.existsSync(masterFilePath(entry.eventType, entry.style, entry.file));
    });
    expect(mismatched.map((m) => `${m.folder}/${m.style}/${m.file}`)).toEqual([]);
  });
});
