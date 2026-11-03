/**
 * Blueprint satu nama Theme Builder (3 Nov 2026): satu kerangka untuk ulang tahun, khitan, aqiqah, wisuda, dan gathering.
 * Kompilasi + audit builder untuk setiap varian, render lewat engine klien untuk kelima jenis acara (token terisi, tanpa
 * teks pernikahan, skrip lolos parse, hitung mundur dari countdownTarget), dan cover desktop pada composer satu nama.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { DEFAULT_THEME_BY_EVENT } from "@/lib/invitationUtils";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { compileBuilderMaster } from "@/lib/themeBuilder/compile";
import { auditBuilderMaster } from "@/lib/themeBuilder/audit";
import { SINGLE_TEXT_KEYS, VARIANT_GROUPS, defaultBuilderSpec, familyBlocks, familySections, familyTexts, familyVariantGroups, type BuilderSpec } from "@/lib/themeBuilder/spec";

const blueprint = fs.readFileSync(path.join(process.cwd(), "themes", "_blueprints", "single-name", "starter-blueprint-single.html"), "utf8");
const SINGLE_EVENTS = ["BIRTHDAY", "KHITAN", "AQIQAH", "WISUDA", "GATHERING"] as const;
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const inlineScripts = (html: string) => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);

describe("blueprint satu nama: kontrak builder", () => {
  it("setiap varian lolos audit builder", () => {
    const specs: BuilderSpec[] = [defaultBuilderSpec(), { ...defaultBuilderSpec(), canvasMode: "dark", radius: "round", animation: "none" }];
    for (const group of VARIANT_GROUPS) {
      for (const option of group.options) specs.push({ ...defaultBuilderSpec(), variants: { ...defaultBuilderSpec().variants, [group.key]: option.id } });
    }
    for (const spec of specs) expect(auditBuilderMaster(compileBuilderMaster(spec, blueprint), blueprint)).toEqual([]);
  });

  it("tidak memakai token khusus pernikahan dan memuat seluruh penanda seksi yang dipakai builder", () => {
    for (const token of ["firstName", "secondName", "coupleMonogram", "weddingDate", "eventDataHtml", "targetDate", "storyItemsHtml"]) {
      expect(blueprint, token).not.toContain(`{{${token}}}`);
    }
    for (const section of ["cover", "sidebar", "opening", "couple", "countdown", "events", "rsvp", "closing"]) {
      expect(blueprint, section).toContain(`data-lux-section="${section}"`);
      expect(blueprint, section).toContain(`<!-- lux-ornaments:${section} -->`);
    }
    for (const block of ["cover-names", "cover-guest", "rsvp-form", "home-schedule", "couple-photo-1", "couple-name-1"]) {
      expect(blueprint, block).toContain(`data-lux-block="${block}"`);
    }
  });
});

describe("daftar builder per keluarga", () => {
  it("setiap kunci teks satu nama punya isian di blueprint; rsvpTitle ada di kartu RSVP buatan mesin", () => {
    for (const key of SINGLE_TEXT_KEYS) {
      if (key === "rsvpTitle") continue;
      expect(blueprint, key).toContain(`data-lux-field="customLabels.${key}"`);
    }
    expect(familyTexts("KHITAN").map((t) => t.key)).toEqual([...SINGLE_TEXT_KEYS].filter((k) => familyTexts("WEDDING").some((t) => t.key === k)));
  });

  it("satu nama: tanpa kisah dan mempelai kedua; profil memakai blok mempelai pertama dengan label sendiri; blok yang tampil ada di blueprint", () => {
    expect(familySections("BIRTHDAY")).not.toContain("story");
    expect(familySections("WEDDING")).toContain("story");
    const blocks = familyBlocks("AQIQAH");
    expect(blocks.map((b) => b.id)).not.toContain("couple-name-2");
    expect(blocks.find((b) => b.id === "couple-photo-1")?.label).toBe("Foto profil");
    for (const b of blocks) expect(blueprint, b.id).toContain(`data-lux-block="${b.id}"`);
    const couple = familyVariantGroups("WISUDA").find((g) => g.key === "couple")!;
    expect(couple.label).toBe("Profil");
    expect(couple.options.map((o) => o.id)).not.toContain("side");
  });
});

describe("blueprint satu nama: render engine untuk kelima jenis acara", () => {
  const master = compileBuilderMaster(defaultBuilderSpec(), blueprint);

  it.each(SINGLE_EVENTS)("%s: token terisi, tanpa teks pernikahan, skrip lolos parse, hitung mundur dari acara utama", async (eventType) => {
    const data = (await composeInvitationData(buildDemoInvitation(DEFAULT_THEME_BY_EVENT[eventType]))) as Record<string, any>;
    const html = await renderTemplateFile("builder-preview", data, { eventType, templateSource: master });

    expect(html.match(/\{\{[^}]{1,60}\}\}/g)).toBeNull();
    expect(html).not.toContain("THE COUPLE");
    expect(html).not.toMatch(/WISHES (&amp;|&) RSVP/);
    expect(html).toContain(escapeHtml(String(data.mainName)));
    // Label Studio Demo tema yang sama menimpa teks bawaan jenis acara di slot berlabel.
    const profileTitle = data.featureSettings?.customLabels?.coupleTitle || data.profileTitle;
    expect(html).toContain(escapeHtml(String(profileTitle)));
    for (const script of inlineScripts(html)) expect(() => new vm.Script(script)).not.toThrow();

    expect(html).toContain('data-lux-field="customLabels.rsvpTitle"');
    expect(data.countdownTarget).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/);
    expect(html).toContain(`const rawTarget = "${data.countdownTarget}"`);
  });
});

describe("cover desktop pada composer satu nama", () => {
  it("cover desktop klien khitan membuat sampul layar penuh (sebelumnya landingCoverDesktopUrl tidak diisi)", async () => {
    const desktop = "/uploads/invitations/klien/cover-desktop.webp";
    const base = buildDemoInvitation("al-fariz");
    const own = (await composeInvitationData({ ...base, media: [{ mediaSlot: "LANDING_COVER_DESKTOP", localPath: desktop }] })) as Record<string, any>;
    expect(own.landingCoverDesktopUrl).toBe(desktop);
    const html = await renderTemplateFile("builder-preview", own, { eventType: "KHITAN", templateSource: compileBuilderMaster(defaultBuilderSpec(), blueprint) });
    expect(html).toContain("FULLSCREEN OVERRIDE");
    expect(html).toContain(desktop);
  });
});
