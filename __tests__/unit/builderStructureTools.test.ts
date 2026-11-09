/**
 * Theme Builder: penumpangan seksi, seksi bebas berkutipan/bergaleri/berpeta, preset animasi tambahan, template awal,
 * dan isian Studio untuk teks seksi bebas (10 Nov 2026). Validasi dan kompilasi dari blueprint saja.
 */
import { describe, it, expect } from "vitest";
import { auditBuilderMaster } from "@/lib/themeBuilder/audit";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import { designCss } from "@/lib/themeBuilder/designCss";
import { BUILDER_TEMPLATES, applyBuilderTemplate } from "@/lib/themeBuilder/templates";
import { freeSectionTextsOf } from "@/lib/themeBuilder/texts";
import { reconcileLabelsOnThemeChange } from "@/lib/themeLabels";
import { BUILDER_EVENT_TYPES, defaultBuilderSpec, isFreeSectionLabelKey, paletteChecks, parseBuilderSpec, type BuilderEventType, type BuilderSpec } from "@/lib/themeBuilder/spec";

const parse = (patch: Record<string, unknown>, eventType: BuilderEventType = "WEDDING") => parseBuilderSpec({ ...defaultBuilderSpec(eventType), ...patch });
const okSpec = (patch: Record<string, unknown>, eventType: BuilderEventType = "WEDDING"): BuilderSpec => {
  const r = parse(patch, eventType);
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.spec;
};
const compiled = (spec: BuilderSpec) => compileBuilderMaster(spec, readBuilderBlueprint(spec.eventType));
const audit = (spec: BuilderSpec) => auditBuilderMaster(compiled(spec), readBuilderBlueprint(spec.eventType));
const free = (patch: Record<string, unknown> = {}) => ({ id: "free1", after: "couple", eyebrow: "", title: "Judul", body: "", align: "center", ...patch });

/** Rentang <section> seimbang untuk memeriksa letak bersarang di HTML hasil kompilasi. */
function sectionSpan(html: string, marker: string): [number, number] {
  const start = html.indexOf(marker);
  const tags = /<section\b|<\/section>/g;
  tags.lastIndex = html.lastIndexOf("<section", start);
  let depth = 0;
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    depth += m[0] === "</section>" ? -1 : 1;
    if (depth === 0) return [start, m.index];
  }
  throw new Error(`Seksi ${marker} tidak seimbang`);
}

describe("penumpangan seksi", () => {
  it.each([["story", "couple"], ["rsvp", "closing"], ["gallery", "events"], ["couple", "opening"]] as const)("%s di dalam %s", (guest, host) => {
    const spec = okSpec({ sectionNesting: { [guest]: host } });
    const html = compiled(spec);
    const guestAt = guest === "gallery" ? html.indexOf("{{gallerySectionHtml}}") : html.indexOf(`data-lux-section="${guest}"`);
    if (host === "closing") {
      const start = html.indexOf('data-lux-section="closing"');
      expect(guestAt).toBeGreaterThan(start);
      expect(guestAt).toBeLessThan(html.indexOf("</footer>", start));
    } else {
      const [start, end] = sectionSpan(html, `data-lux-section="${host}"`);
      expect(guestAt).toBeGreaterThan(start);
      expect(guestAt).toBeLessThan(end);
    }
    expect(audit(spec)).toEqual([]);
  });

  it("kisah membawa pembungkus {{#if showStory}} sehingga syarat engine tetap berpasangan", () => {
    const html = compiled(okSpec({ sectionNesting: { story: "couple" } }));
    expect((html.match(/\{\{#if showStory\}\}/g) ?? []).length).toBe((html.match(/\{\{\/if\}\}/g) ?? []).length - (html.match(/\{\{#if (?!showStory)[\w.]+\}\}/g) ?? []).length);
    const [start, end] = sectionSpan(html, 'data-lux-section="couple"');
    expect(html.slice(start, end)).toContain("{{#if showStory}}");
  });

  it("menolak diri sendiri, rantai, tuan galeri, tamu pembuka, dan Acara saat jadwal di Home", () => {
    expect(parse({ sectionNesting: { couple: "couple" } }).ok).toBe(false);
    expect(parse({ sectionNesting: { story: "couple", couple: "events" } }).ok).toBe(false);
    expect(parse({ sectionNesting: { rsvp: "gallery" } }).ok).toBe(false);
    expect(parse({ sectionNesting: { opening: "couple" } }).ok).toBe(false);
    expect(parse({ sectionNesting: { story: "events" }, eventsPlacement: "home" }).ok).toBe(false);
    expect(parse({ sectionNesting: { story: "couple" } }, "BIRTHDAY").ok).toBe(false);
  });

  it("seksi bebas tidak boleh sesudah seksi yang menumpang", () => {
    expect(parse({ sectionNesting: { story: "couple" }, freeSections: [free({ after: "story" })] }).ok).toBe(false);
  });

  it("regresi: seksi bebas sesudah Acara yang berisi hitung mundur tetap di luar Acara", () => {
    const html = compiled(okSpec({ countdownPlacement: "events", freeSections: [free({ after: "events" })] }));
    const [, eventsEnd] = sectionSpan(html, 'data-lux-section="events"');
    expect(html.indexOf('id="free1"')).toBeGreaterThan(eventsEnd);
  });
});

describe("seksi bebas: kutipan, galeri mini, tombol peta", () => {
  it("markup berlabel klien dan token engine bersyarat per foto", () => {
    const spec = okSpec({ freeSections: [free({ quote: { text: "Kutipan", source: "QS" }, gallery: { count: 4 }, mapButton: { label: "" } })] });
    const html = compiled(spec);
    expect(html).toContain('data-lux-field="customLabels.free1Quote">Kutipan</p>');
    expect(html).toContain('data-lux-field="customLabels.free1QuoteSource">QS</cite>');
    expect((html.match(/\{\{#if luxGalleryPhoto\d\}\}/g) ?? []).length).toBe(4);
    expect(html).not.toContain("luxGalleryPhoto5");
    expect(html).toContain('{{#if luxPrimaryMapUrl}}<a class="btn-map-outline lux-free-map" href="{{luxPrimaryMapUrl}}"');
    expect(html).toContain("Buka Peta Lokasi");
    expect(audit(spec)).toEqual([]);
  });

  it("menjepit jumlah galeri dan menolak kutipan kosong atau bermarkup", () => {
    expect(okSpec({ freeSections: [free({ gallery: { count: 99 } })] }).freeSections?.[0].gallery).toEqual({ count: 6 });
    expect(parse({ freeSections: [free({ quote: { text: "", source: "" } })] }).ok).toBe(false);
    expect(parse({ freeSections: [free({ quote: { text: "<b>x</b>", source: "" } })] }).ok).toBe(false);
  });
});

describe("preset animasi tambahan", () => {
  it.each(["drop", "grow", "flip", "swing", "slide-right"] as const)("%s global memasang aturannya sendiri", (preset) => {
    const spec = okSpec({ animation: preset });
    const html = compiled(spec);
    expect(html).toContain(`data-lux-anim-preset="${preset}"`);
    expect(designCss(spec)).toContain(`html.lux-anim-ready[data-lux-anim-preset="${preset}"] [data-lux-anim]:not(.lux-in) { opacity: 0;`);
  });

  it("preset bawaan blueprint tidak digandakan", () => {
    expect(designCss(okSpec({ animation: "rise" }))).not.toContain('data-lux-anim-preset="rise"');
  });
});

describe("template awal", () => {
  it.each(BUILDER_TEMPLATES.map((t) => [t.id, t] as const))("%s: sah, lolos audit, dan kontras cukup di semua jenis acara", (_id, template) => {
    for (const eventType of BUILDER_EVENT_TYPES) {
      const parsed = parseBuilderSpec(template.build(eventType));
      expect(parsed.ok ? [] : parsed.errors).toEqual([]);
      if (!parsed.ok) continue;
      expect(audit(parsed.spec)).toEqual([]);
      expect(paletteChecks(parsed.spec).filter((c) => !c.ok)).toEqual([]);
    }
  });

  it("memasang template mempertahankan teks, media bawaan, dan jenis acara", () => {
    const current = { ...defaultBuilderSpec("KHITAN"), texts: { coverSubtitle: "Halo" }, defaultMedia: { LANDING_COVER: "/assets/ornaments/background/bg-maroon.webp" } } as BuilderSpec;
    const next = applyBuilderTemplate(BUILDER_TEMPLATES[0], current);
    expect(next.eventType).toBe("KHITAN");
    expect(next.texts).toEqual({ coverSubtitle: "Halo" });
    expect(next.defaultMedia).toEqual(current.defaultMedia);
  });

  it("snapshot CSS desain template (perubahan tampilan yang tidak disengaja terlihat di sini)", () => {
    const css = Object.fromEntries(BUILDER_TEMPLATES.map((t) => [t.id, designCss(t.build("WEDDING"))]));
    expect(css).toMatchSnapshot();
  });
});

describe("isian Studio teks seksi bebas", () => {
  it("mengurutkan judul, isi, kutipan, kartu, dan label peta dengan nilai awal admin", () => {
    const spec = okSpec({ freeSections: [free({ title: "Protokol", body: "Isi", quote: { text: "Q", source: "S" }, cards: [{ title: "A", body: "B" }], mapButton: { label: "Peta" } })] });
    const texts = freeSectionTextsOf(spec);
    expect(texts.map((t) => t.key)).toEqual(["free1Eyebrow", "free1Title", "free1Body", "free1Quote", "free1QuoteSource", "free1Card1Title", "free1Card1Body", "free1MapBtn"]);
    expect(texts.find((t) => t.key === "free1Body")).toMatchObject({ value: "Isi", multiline: true, group: "Protokol" });
    expect(freeSectionTextsOf(null)).toEqual([]);
    expect(freeSectionTextsOf({ nonsense: true })).toEqual([]);
  });

  it("label seksi bebas tidak dibawa saat tema berganti", () => {
    expect(isFreeSectionLabelKey("free2Card4Body")).toBe(true);
    expect(isFreeSectionLabelKey("free4Title")).toBe(false);
    const { customLabels } = reconcileLabelsOnThemeChange({ free1Title: "Tulisan klien", coverSubtitle: "Diedit" }, {}, {});
    expect(customLabels).toEqual({ coverSubtitle: "Diedit" });
  });
});
