/**
 * Blueprint mandiri PERSONAL & EVENT Theme Builder:
 * - themes/_blueprints/personal/starter-blueprint-personal.html (dengan couple-parents-1 dan seksi #story native)
 * - themes/_blueprints/event/starter-blueprint-event.html (non-personal tanpa couple-parents-1, dengan seksi #story native)
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { compileBuilderMaster } from "@/lib/themeBuilder/compile";
import { auditBuilderMaster } from "@/lib/themeBuilder/audit";
import { TEXT_KEYS_BY_MODE, VARIANT_GROUPS, defaultBuilderSpec, blocksForMode, sectionsForMode, textsForMode, layoutStylesForMode, type BuilderSpec } from "@/lib/themeBuilder/spec";

const personalBlueprint = fs.readFileSync(path.join(process.cwd(), "themes", "_blueprints", "personal", "starter-blueprint-personal.html"), "utf8");
const eventBlueprint = fs.readFileSync(path.join(process.cwd(), "themes", "_blueprints", "event", "starter-blueprint-event.html"), "utf8");
const SINGLE_EVENTS = [
  ["PERSONAL", "festivo"],
  ["PERSONAL", "al-fariz"],
  ["PERSONAL", "al-khalid"],
  ["PERSONAL", "cendekia"],
  ["EVENT", "sinergi"],
] as const;
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const inlineScripts = (html: string) => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);

describe("blueprint mandiri PERSONAL & EVENT: kontrak builder", () => {
  it("setiap varian lolos audit builder untuk PERSONAL dan EVENT", () => {
    for (const [ev, bp] of [["PERSONAL", personalBlueprint], ["EVENT", eventBlueprint]] as const) {
      const specs: BuilderSpec[] = [defaultBuilderSpec(ev), { ...defaultBuilderSpec(ev), canvasMode: "dark", radius: "round", animation: "none" }];
      for (const group of VARIANT_GROUPS) {
        for (const option of group.options) specs.push({ ...defaultBuilderSpec(ev), variants: { ...defaultBuilderSpec(ev).variants, [group.key]: option.id } });
      }
      for (const spec of specs) expect(auditBuilderMaster(compileBuilderMaster(spec, bp), bp)).toEqual([]);
    }
  });

  it("memuat penanda seksi native termasuk story; EVENT bersih tanpa couple-parents-1", () => {
    for (const bp of [personalBlueprint, eventBlueprint]) {
      for (const token of ["firstName", "secondName", "coupleMonogram", "weddingDate", "eventDataHtml", "targetDate"]) {
        expect(bp, token).not.toContain(`{{${token}}}`);
      }
      for (const section of ["cover", "sidebar", "opening", "couple", "countdown", "events", "story", "rsvp", "closing"]) {
        expect(bp, section).toContain(`data-lux-section="${section}"`);
        expect(bp, section).toContain(`<!-- lux-ornaments:${section} -->`);
      }
      for (const block of ["cover-names", "cover-guest", "rsvp-form", "home-schedule", "couple-photo-1", "couple-name-1", "story-eyebrow", "story-title", "story-list"]) {
        expect(bp, block).toContain(`data-lux-block="${block}"`);
      }
    }
    expect(personalBlueprint).toContain('data-lux-block="couple-parents-1"');
    expect(eventBlueprint).not.toContain("couple-parents-1");
    expect(eventBlueprint).not.toContain("{{parentsHtml}}");
  });
});

describe("daftar builder per mode mandiri", () => {
  it("setiap kunci teks PERSONAL & EVENT punya isian di blueprint; rsvpTitle ada di kartu RSVP buatan mesin", () => {
    for (const [mode, bp] of [["PERSONAL", personalBlueprint], ["EVENT", eventBlueprint]] as const) {
      for (const key of TEXT_KEYS_BY_MODE[mode]) {
        if (key === "rsvpTitle") continue;
        expect(bp, `${mode}:${key}`).toContain(`data-lux-field="customLabels.${key}"`);
      }
    }
    expect(textsForMode("PERSONAL").map((t) => t.key)).toEqual([...TEXT_KEYS_BY_MODE.PERSONAL].filter((k) => textsForMode("WEDDING").some((t) => t.key === k)));
    expect(textsForMode("EVENT").map((t) => t.key)).toEqual([...TEXT_KEYS_BY_MODE.EVENT].filter((k) => textsForMode("WEDDING").some((t) => t.key === k)));
  });

  it("PERSONAL & EVENT memiliki story native; EVENT tanpa couple-parents-1; blok yang tampil ada di blueprint masing-masing", () => {
    expect(sectionsForMode("PERSONAL")).toContain("story");
    expect(sectionsForMode("EVENT")).toContain("story");
    expect(sectionsForMode("WEDDING")).toContain("story");

    const pBlocks = blocksForMode("PERSONAL");
    expect(pBlocks.map((b) => b.id)).not.toContain("couple-name-2");
    expect(pBlocks.map((b) => b.id)).toContain("couple-parents-1");
    expect(pBlocks.find((b) => b.id === "couple-photo-1")?.label).toBe("Foto profil");
    for (const b of pBlocks) expect(personalBlueprint, b.id).toContain(`data-lux-block="${b.id}"`);

    const eBlocks = blocksForMode("EVENT");
    expect(eBlocks.map((b) => b.id)).not.toContain("couple-name-2");
    expect(eBlocks.map((b) => b.id)).not.toContain("couple-parents-1");
    expect(eBlocks.find((b) => b.id === "couple-photo-1")?.label).toBe("Foto / visual acara");
    for (const b of eBlocks) expect(eventBlueprint, b.id).toContain(`data-lux-block="${b.id}"`);

    const coupleP = layoutStylesForMode("PERSONAL").find((g) => g.key === "couple")!;
    expect(coupleP.label).toBe("Profil");
    expect(coupleP.options.map((o) => o.id)).not.toContain("side");
    expect(layoutStylesForMode("PERSONAL").some((g) => g.key === "story")).toBe(true);
    expect(layoutStylesForMode("EVENT").some((g) => g.key === "story")).toBe(true);
  });
});

describe("blueprint mandiri PERSONAL & EVENT: render engine", () => {
  const personalMaster = compileBuilderMaster(defaultBuilderSpec("PERSONAL"), personalBlueprint);
  const eventMaster = compileBuilderMaster(defaultBuilderSpec("EVENT"), eventBlueprint);

  it.each(SINGLE_EVENTS)("%s (%s): token terisi, tanpa teks pernikahan, tanpa duplikasi #story, skrip lolos parse", async (eventType, demoThemeId) => {
    const master = eventType === "EVENT" ? eventMaster : personalMaster;
    const data = (await composeInvitationData(buildDemoInvitation(demoThemeId))) as Record<string, any>;
    const html = await renderTemplateFile("builder-preview", data, { eventType, templateSource: master });

    expect(html.match(/\{\{[^}]{1,60}\}\}/g)).toBeNull();
    expect(html).not.toContain("THE COUPLE");
    expect(html).not.toMatch(/WISHES (&amp;|&) RSVP/);
    expect((html.match(/id="story"/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(html).toContain(escapeHtml(String(data.mainName)));
    const profileTitle = data.featureSettings?.customLabels?.coupleTitle || data.profileTitle;
    expect(html).toContain(escapeHtml(String(profileTitle)));
    for (const script of inlineScripts(html)) expect(() => new vm.Script(script)).not.toThrow();

    expect(html).toContain('data-lux-field="customLabels.rsvpTitle"');
    expect(data.countdownTarget).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/);
    expect(html).toContain(`const rawTarget = "${data.countdownTarget}"`);
  });
});

describe("cover desktop pada composer personal", () => {
  it("cover desktop klien personal membuat sampul layar penuh", async () => {
    const desktop = "/uploads/invitations/klien/cover-desktop.webp";
    const base = buildDemoInvitation("al-fariz");
    const own = (await composeInvitationData({ ...base, media: [{ mediaSlot: "LANDING_COVER_DESKTOP", localPath: desktop }] })) as Record<string, any>;
    expect(own.landingCoverDesktopUrl).toBe(desktop);
    const html = await renderTemplateFile("builder-preview", own, { eventType: "PERSONAL", templateSource: compileBuilderMaster(defaultBuilderSpec("PERSONAL"), personalBlueprint) });
    expect(html).toContain("FULLSCREEN OVERRIDE");
    expect(html).toContain(desktop);
  });
});
