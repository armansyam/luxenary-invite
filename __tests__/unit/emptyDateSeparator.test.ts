/**
 * Tanggal acara kosong pada draf membuat {{weddingDateDay}} dan {{weddingDateMonth}} kosong; pemisah di antaranya ("/")
 * harus ikut hilang. Sebelum 5 Nov 2026 delapan master pernikahan menampilkan "/" sendirian di sampul dan slide pembuka.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import { THEME_MAP } from "@/lib/renderTemplate";
import { masterFilePath } from "@/lib/themePaths";

describe("pemisah tanggal di master", () => {
  it("pemisah antara token hari dan bulan selalu berada di dalam {{#if weddingDateDay}}", () => {
    const bare: string[] = [];
    for (const [id, entry] of Object.entries(THEME_MAP)) {
      const html = fs.readFileSync(masterFilePath(entry.eventType, entry.style, entry.file), "utf8");
      for (const m of html.matchAll(/(\{\{#if weddingDateDay\}\})?\{\{weddingDateDay\}\}\s*[^{\s]\s*\{\{weddingDateMonth\}\}/g)) {
        if (!m[1]) bare.push(id);
      }
    }
    expect(bare).toEqual([]);
  });
});
