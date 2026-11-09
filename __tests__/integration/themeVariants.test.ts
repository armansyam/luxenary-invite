/**
 * Varian Tema (lib/themeVariants.ts): baris Theme dengan parentTheme + masterOverrides dirender dari master induk dengan
 * override :root, dibekukan ke piring undangan bersama override-nya, dan memakai data demo induk. Database luxenary_test.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { prisma, pool } from "@/lib/prisma";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { applyMasterOverrides, clearVariantCache, masterColorGroups, masterTokens, parseMasterOverrides, resolveVariant } from "@/lib/themeVariants";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const VARIANT_ID = `vitest_variant_${Date.now()}`;
const PARENT = "valente";
const parentHtml = fs.readFileSync(path.join(process.cwd(), "themes/wedding/minimalist/valente.html"), "utf-8");
const draftId = `vitest-variant-draft-${Date.now()}`;
const draftPath = path.join(process.cwd(), "data", "drafts", `${draftId}.html`);

describe("validasi dan penyisipan override", () => {
  const color = masterTokens(parentHtml).colors.find((t) => t.name.startsWith("--lux-c-"))!;
  const font = masterTokens(parentHtml).fonts[0];

  it("hanya variabel master induk, hex, dan font katalog/Google yang diterima; nilai asli dibuang", () => {
    const unchanged = masterTokens(parentHtml).colors.find((t) => t.name !== color.name)!;
    const ok = parseMasterOverrides({ colors: { [color.name]: "#00AA55", [unchanged.name]: unchanged.value }, fonts: { [font.name]: "g:Playfair Display" } }, parentHtml);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.colors).toEqual({ [color.name]: "#00aa55" });
      expect(ok.value.fonts).toEqual({ [font.name]: "g:Playfair Display" });
    }
    expect(parseMasterOverrides({ colors: { "--tidak-ada": "#000000" } }, parentHtml).ok).toBe(false);
    expect(parseMasterOverrides({ colors: { [color.name]: "red;}</style>" } }, parentHtml).ok).toBe(false);
    expect(parseMasterOverrides({ fonts: { [font.name]: "Comic Sans" } }, parentHtml).ok).toBe(false);
  });

  it("gaya override disisipkan terakhir di head, dengan cadangan generik dari tumpukan aslinya", () => {
    const html = applyMasterOverrides(parentHtml, { colors: { [color.name]: "#00aa55" }, fonts: { [font.name]: "playfair" } });
    const style = html.match(/<style id="lux-master-overrides">([^<]*)<\/style>/)?.[1] ?? "";
    expect(style).toContain(`${color.name}: #00aa55;`);
    expect(style).toMatch(new RegExp(`${font.name}: 'Playfair Display', (serif|cursive|sans-serif);`));
    expect(html.indexOf("lux-master-overrides")).toBeGreaterThan(html.indexOf(":root"));
    expect(html.indexOf("lux-master-overrides")).toBeLessThan(html.indexOf("</head>"));
    // Nama atau nilai yang lolos validasi tetapi dirusak di DB tidak ditulis ke CSS.
    expect(applyMasterOverrides(parentHtml, { colors: { "--x;}body{": "#000000", [color.name]: "url(x)" }, fonts: {} })).toBe(parentHtml);
  });

  it("warna dikelompokkan per nilai asli", () => {
    const groups = masterColorGroups(parentHtml);
    expect(groups.every((g) => g.names.length >= 1)).toBe(true);
    expect(new Set(groups.map((g) => g.value)).size).toBe(groups.length);
  });
});

describe.skipIf(!IS_TEST_DB)("render varian dari DB", () => {
  const color = masterTokens(parentHtml).colors.find((t) => t.name.startsWith("--lux-c-"))!;

  afterAll(async () => {
    fs.rmSync(draftPath, { force: true });
    await prisma.theme.deleteMany({ where: { id: VARIANT_ID } });
    clearVariantCache();
    await prisma.$disconnect();
    await pool.end();
  });

  it("dirender dari master induk dengan override, dan piring dibekukan bersama override", async () => {
    await prisma.theme.create({ data: { id: VARIANT_ID, name: "Uji Varian", category: "minimalist", eventType: "WEDDING", parentTheme: PARENT, isActive: false, masterOverrides: { colors: { [color.name]: "#00aa55" }, fonts: {} } } });
    clearVariantCache();
    expect(await resolveVariant(VARIANT_ID)).toEqual({ parentId: PARENT, overrides: { colors: { [color.name]: "#00aa55" }, fonts: {} } });
    expect(await resolveVariant(PARENT)).toBeNull();

    const data = await composeInvitationData({ ...buildDemoInvitation(PARENT), id: draftId, themeId: VARIANT_ID });
    const html = await renderTemplateFile(VARIANT_ID, data as Record<string, any>, { invitationId: draftId, eventType: "WEDDING" });
    expect(html).toContain(`${color.name}: #00aa55;`);
    // Teks bawaan master induk tetap dipakai (komposer memakai id induk).
    expect(html).toContain("Julian");
    const draft = fs.readFileSync(draftPath, "utf-8");
    expect(draft).toContain(`<!-- lux-theme:${VARIANT_ID} -->`);
    expect(draft).toContain(`${color.name}: #00aa55;`);

    // Mengubah varian sesudahnya tidak mengubah undangan yang sudah dibekukan.
    await prisma.theme.update({ where: { id: VARIANT_ID }, data: { masterOverrides: { colors: { [color.name]: "#112233" }, fonts: {} } } });
    clearVariantCache();
    const again = await renderTemplateFile(VARIANT_ID, data as Record<string, any>, { invitationId: draftId, eventType: "WEDDING" });
    expect(again).toContain(`${color.name}: #00aa55;`);
    expect(again).not.toContain("#112233");
  });
});
