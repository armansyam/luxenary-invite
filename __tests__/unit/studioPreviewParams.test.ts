/**
 * Skrip runtime undangan membaca nama tamu dari ?to=, ?v=, atau ?u= (lib/renderTemplate.ts). Iframe pratinjau Studio
 * dulu memakai ?v=<versi> untuk memaksa muat ulang, sehingga sampul menampilkan nama tamu "0", "1", ... (4 Nov 2026).
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("URL pratinjau Studio tidak bertabrakan dengan parameter nama tamu", () => {
  it("iframe pratinjau tidak memakai to, v, atau u", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "app", "(client)", "dashboard", "invitation", "[id]", "page.tsx"), "utf8");
    const previewUrls = src.match(/\/preview\?[^`"']*/g) || [];
    expect(previewUrls.length).toBeGreaterThan(0);
    for (const url of previewUrls) expect(url).not.toMatch(/[?&](to|v|u)=/);
  });
});
