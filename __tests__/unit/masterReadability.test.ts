import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { getDemoThemeData, DEMO_REGISTRY } from "@/lib/demoRegistry";
import { DEFAULT_THEME_BY_EVENT } from "@/lib/invitationUtils";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const block = (src: string, start: string) => { const i = src.indexOf(start); return i < 0 ? "" : src.slice(i, src.indexOf("\n}\n", i)); };

describe("keterbacaan teks master (18 Nov 2026)", () => {
  it("tema tanpa persona demo tidak meminjam foto latar halaman persona", () => {
    const persona = DEMO_REGISTRY[DEFAULT_THEME_BY_EVENT.EVENT];
    expect(persona.globalBgUrl).not.toBe("");
    expect(getDemoThemeData("tema-builder-custom-uji", "EVENT").globalBgUrl).toBe("");
    expect(getDemoThemeData(DEFAULT_THEME_BY_EVENT.EVENT, "EVENT").globalBgUrl).toBe(persona.globalBgUrl);
  });

  it("blok kartu buatan mesin memakai token kartu dengan cadangan token lama", () => {
    const engine = read("lib/themeEngine.ts") + "\n" + read("lib/themeEngine/wishes.ts");
    for (const fn of ["function buildUniversalGiftSection(", "function buildUniversalQrPass(", "function buildUniversalCountdown(", "function buildUniversalWishesSectionHtml("]) {
      const body = block(engine, fn);
      expect(body, fn).not.toBe("");
      expect(body, fn).toContain("var(--card-text, var(--text-main))");
    }
    // Seluruh isi blok ini berada di dalam kartu; judul ucapan (di luar kartu) memang tetap memakai --text-main.
    for (const fn of ["function buildUniversalQrPass(", "function buildUniversalCountdown("]) {
      expect(block(engine, fn), fn).not.toMatch(/style="[^"]*(?<![-\w])color: var\(--text-main\)/);
    }
    const memories = block(engine, "function buildUniversalMemoriesCta(");
    expect(memories).toContain("color: var(--on-primary, var(--text-main))");
    expect(memories).toContain("color: var(--canvas-accent, var(--primary))");
  });

  it("Burgundy Royale memakai lapisan krem di atas tekstur merah (teksnya gelap)", () => {
    const rel = "themes/wedding/modern/burgundy-royale.html";
    const scrim = read(rel).match(/\.scrim-canvas\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(scrim, rel).toContain("var(--bg-light) 95%");
    expect(scrim, rel).not.toMatch(/background:\s*transparent/);
  });

  it("Nur (kartu krem, teks kanvas krem) mendefinisikan token teks kartu", () => {
    const root = read("themes/personal/traditional/nur.html").match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(root).toMatch(/--card-text:\s*var\(--ink\)/);
  });
});
