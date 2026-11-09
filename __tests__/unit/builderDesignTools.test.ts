/**
 * Theme Builder: latar per seksi, warna tambahan, nilai bebas kartu/tombol, seksi teks bebas, dan CSS kustom (10 Nov
 * 2026). Validasi dan kompilasi dari blueprint saja; tidak butuh database.
 */
import { describe, it, expect } from "vitest";
import { auditBuilderMaster } from "@/lib/themeBuilder/audit";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import { uploadedAssetFiles } from "@/lib/themeBuilder/bundle";
import { contrastRatio, customCssError, defaultBuilderSpec, parseBuilderSpec, storedVariant, type BuilderEventType, type BuilderSpec } from "@/lib/themeBuilder/spec";

const parse = (patch: Record<string, unknown>, eventType: BuilderEventType = "WEDDING") => parseBuilderSpec({ ...defaultBuilderSpec(eventType), ...patch });
const compiled = (spec: BuilderSpec) => compileBuilderMaster(spec, readBuilderBlueprint(spec.eventType));
const okSpec = (patch: Record<string, unknown>, eventType: BuilderEventType = "WEDDING"): BuilderSpec => {
  const r = parse(patch, eventType);
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.spec;
};
const styleBlock = (html: string, id: string) => html.match(new RegExp(`<style id="${id}">([\\s\\S]*?)</style>`))?.[1] ?? "";

describe("spesifikasi lama", () => {
  it("tetap sah dan tidak mendapat kolom baru", () => {
    const spec = okSpec({});
    for (const key of ["sectionStyles", "paletteExtra", "surface", "freeSections", "customCss"]) expect(spec).not.toHaveProperty(key);
    // Tag selalu ada (pratinjau menulis ulang isinya langsung), tetapi kosong untuk spesifikasi tanpa alat desain.
    expect(styleBlock(compiled(spec), "lux-builder-design").trim()).toBe("");
  });
});

describe("latar per seksi", () => {
  it("menyimpan hanya seksi yang diubah dan menolak seksi atau gambar tak dikenal", () => {
    const spec = okSpec({ sectionStyles: { couple: { bg: "dark", gradient: "radial", tone: "light" }, events: { bg: "none", gradient: "solid", tone: "auto" } } });
    expect(spec.sectionStyles).toEqual({ couple: { bg: "dark", gradient: "radial", tone: "light" } });
    expect(parse({ sectionStyles: { cover: { bg: "dark" } } }).ok).toBe(false);
    expect(parse({ sectionStyles: { couple: { bg: "dark", image: "https://evil.example/x.png" } } }).ok).toBe(false);
    expect(parse({ sectionStyles: { story: { bg: "dark" } } }, "BIRTHDAY").ok).toBe(false);
  });

  it("dikompilasi ke token palet dengan nada teks, tanpa warna mati di luar :root", () => {
    const spec = okSpec({
      sectionStyles: {
        couple: { bg: "primary", gradient: "diagonal", tone: "light" },
        events: { bg: "dark", gradient: "solid", tone: "light", image: "/assets/ornaments/background/bg-maroon.webp", imageOpacity: 30 },
        closing: { bg: "light", gradient: "fade-up", tone: "dark" },
      },
    });
    const html = compiled(spec);
    const css = styleBlock(html, "lux-builder-design");
    expect(css).toContain('[data-lux-section="couple"] { background: linear-gradient(135deg, var(--lux-base-primary) 0%');
    expect(css).toContain("--primary: color-mix(in srgb, var(--accent) 55%, var(--on-dark))");
    expect(css).toContain("color-mix(in srgb, var(--bg-dark) 70%, transparent)");
    expect(css).toContain("url('/assets/ornaments/background/bg-maroon.webp')");
    expect(css).toContain('[data-lux-section="closing"].no-closing-photo');
    expect(html).toMatch(/--lux-base-primary: var\(--primary\);/);
    expect(auditBuilderMaster(html, readBuilderBlueprint("WEDDING"))).toEqual([]);
  });
});

describe("warna tambahan", () => {
  it("menyimpan hex di :root dan memakainya lewat variabel", () => {
    const spec = okSpec({ paletteExtra: { eyebrow: "#8B2636", card: "#fffaf2", heading: "" } });
    expect(spec.paletteExtra).toEqual({ eyebrow: "#8b2636", card: "#fffaf2" });
    const html = compiled(spec);
    expect(html).toMatch(/--lux-eyebrow: #8b2636;/);
    expect(html).toMatch(/--card-bg: #fffaf2;/);
    expect(styleBlock(html, "lux-builder-design")).toContain(".sec-eyebrow { color: var(--lux-eyebrow); }");
    const toned = styleBlock(compiled(okSpec({ paletteExtra: { eyebrow: "#8b2636" }, sectionStyles: { events: { bg: "dark", gradient: "solid", tone: "light" } } })), "lux-builder-design");
    expect(toned).toMatch(/\[data-lux-section="events"\] \{[^}]*--lux-eyebrow: var\(--primary\);/);
    expect(auditBuilderMaster(html, readBuilderBlueprint("WEDDING"))).toEqual([]);
    expect(parse({ paletteExtra: { line: "red" } }).ok).toBe(false);
  });
});

describe("nilai bebas kartu dan tombol", () => {
  it("menjepit angka dan menimpa varian dengan !important", () => {
    const spec = okSpec({ surface: { cardBorder: 9, cardRadius: -5, cardShadow: "deep", buttonRadius: 12, buttonPill: true } });
    expect(spec.surface).toEqual({ cardBorder: 4, cardRadius: 0, cardShadow: "deep", buttonRadius: 12, buttonPill: true });
    const css = styleBlock(compiled(spec), "lux-builder-design");
    expect(css).toContain("border: 4px solid color-mix(in srgb, var(--primary) 38%, transparent) !important;");
    expect(css).toContain("box-shadow: var(--shadow-elevated) !important;");
    expect(css).toContain(".btn-copy { border-radius: var(--radius-full) !important; }");
    expect(parse({ surface: { cardShadow: "huge" } }).ok).toBe(false);
  });
});

describe("seksi teks bebas", () => {
  const free = (patch: Record<string, unknown> = {}) => ({ id: "free1", after: "couple", eyebrow: "Doa", title: "Kutipan", body: "Baris satu\nBaris dua", align: "left", ...patch });

  it("disisipkan sesudah seksi tuannya dan urut bila tuannya sama", () => {
    const spec = okSpec({ freeSections: [free(), free({ id: "free2", title: "Kedua", eyebrow: "" })] });
    const html = compiled(spec);
    const at = (s: string) => html.indexOf(s);
    expect(at('data-lux-section="couple"')).toBeLessThan(at('id="free1"'));
    expect(at('id="free1"')).toBeLessThan(at('id="free2"'));
    expect(at('id="free2"')).toBeLessThan(at('data-lux-section="countdown"'));
    expect(html).toContain('data-lux-field="customLabels.free1Title" data-lux-anim="1">Kutipan</h2>');
    expect(html).toContain('data-lux-field="customLabels.free2Eyebrow" data-lux-anim="1"></span>');
    expect(auditBuilderMaster(html, readBuilderBlueprint("WEDDING"))).toEqual([]);
  });

  it("mengikuti urutan seksi kustom dan juga berlaku untuk tema satu nama", () => {
    const wedding = compiled(okSpec({ sectionOrder: ["events", "opening", "couple", "countdown", "story", "gallery", "rsvp", "closing"], freeSections: [free({ after: "events" })] }));
    expect(wedding.indexOf('id="free1"')).toBeLessThan(wedding.indexOf('data-lux-section="opening"'));
    const single = compiled(okSpec({ freeSections: [free({ after: "rsvp" })] }, "BIRTHDAY"));
    expect(single.indexOf('data-lux-section="rsvp"')).toBeLessThan(single.indexOf('id="free1"'));
    expect(single.indexOf('id="free1"')).toBeLessThan(single.indexOf('data-lux-section="closing"'));
  });

  it("menolak letak sesudah penutup, id ganda, isi kosong, dan markup", () => {
    expect(parse({ freeSections: [free({ after: "closing" })] }).ok).toBe(false);
    expect(parse({ freeSections: [free(), free()] }).ok).toBe(false);
    expect(parse({ freeSections: [free({ title: "", body: "" })] }).ok).toBe(false);
    expect(parse({ freeSections: [free({ title: "<script>" })] }).ok).toBe(false);
    expect(parse({ freeSections: [free({ body: "{{guestName}}" })] }).ok).toBe(false);
    expect(parse({ freeSections: [free(), free({ id: "free2" }), free({ id: "free3" }), free({ id: "free1" })] }).ok).toBe(false);
  });

  it("teks berisi pola pengganti $& tetap utuh", () => {
    expect(compiled(okSpec({ freeSections: [free({ title: "Rp $& 100" })] }))).toContain("Rp $&amp; 100");
  });
});

describe("CSS kustom", () => {
  it("menerima CSS bertoken, termasuk @media bersarang, dan dipasang paling akhir", () => {
    const css = "@media (min-width: 900px){.sec-main-title{letter-spacing:.1em}}\n#couple .couple-name { color: color-mix(in srgb, var(--primary) 80%, var(--accent)); }";
    const html = compiled(okSpec({ customCss: css }));
    expect(styleBlock(html, "lux-builder-custom").trim()).toBe(css);
    expect(html.indexOf('id="lux-builder-custom"')).toBeGreaterThan(html.indexOf('id="lux-builder-variants"'));
    expect(auditBuilderMaster(html, readBuilderBlueprint("WEDDING"))).toEqual([]);
  });

  it.each([
    ["a{color:#fff}"],
    ["a{color:rgba(0,0,0,.5)}"],
    ["</style><script>alert(1)</script>"],
    ["@import 'x.css';"],
    ["a{background:url(/x.png)}"],
    ["a{ { x } }"],
    ["a{width:expression(alert(1))}"],
    ["a{color:red"],
    ["a{color:red}}"],
  ])("menolak %s", (css) => {
    expect(customCssError(css)).not.toBeNull();
    expect(parse({ customCss: css }).ok).toBe(false);
  });
});

describe("hitung mundur menumpang", () => {
  it.each([["events", 'data-lux-block="events-list"', 'data-lux-section="events"'], ["opening", 'class="home-schedule"', 'data-lux-section="opening"']] as const)(
    "%s: dipindah, bukan digandakan, dan tetap berpenanda seksi",
    (placement, anchor, host) => {
      for (const eventType of ["WEDDING", "KHITAN"] as const) {
        const html = compiled(okSpec({ countdownPlacement: placement }, eventType));
        expect(html.match(/id="countdownTimer"/g)).toHaveLength(1);
        const at = html.indexOf('data-lux-section="countdown"');
        expect(html.indexOf(host)).toBeLessThan(at);
        expect(at).toBeLessThan(html.indexOf(anchor));
        expect(html).toContain("lux-nested-countdown");
        expect(auditBuilderMaster(html, readBuilderBlueprint(eventType))).toEqual([]);
      }
    },
  );

  it("bawaan tidak menyimpan kolom dan bentrok dengan jadwal di Home ditolak", () => {
    expect(okSpec({ countdownPlacement: "section" })).not.toHaveProperty("countdownPlacement");
    expect(parse({ countdownPlacement: "events", eventsPlacement: "home" }).ok).toBe(false);
    expect(parse({ countdownPlacement: "opening", eventsPlacement: "home" }).ok).toBe(true);
  });
});

describe("seksi bebas dengan foto dan kartu", () => {
  const base = { id: "free1", after: "couple", eyebrow: "", title: "", body: "", align: "center" };
  it("foto slot klien memakai token engine bersyarat dan kartu berlabel klien", () => {
    const html = compiled(okSpec({ freeSections: [{ ...base, photo: { source: "slot", slot: "HOME_PHOTO", shape: "arch", position: "bottom" }, cards: [{ title: "Protokol", body: "Bermasker" }, { title: "", body: "Isi saja" }] }] }));
    expect(html).toContain('{{#if hasCustomHomePhoto}}<figure class="lux-free-photo is-arch is-bottom"');
    expect(html).toContain('data-lux-field="customLabels.free1Card1Title">Protokol</h3>');
    expect(html).toContain('data-lux-field="customLabels.free1Card2Body">Isi saja</p>');
    expect(auditBuilderMaster(html, readBuilderBlueprint("WEDDING"))).toEqual([]);
  });

  it("foto pustaka diterima, URL luar dan kartu berlebih ditolak", () => {
    expect(compiled(okSpec({ freeSections: [{ ...base, photo: { source: "asset", src: "/assets/ornaments/background/bg-maroon.webp", shape: "wide", position: "top" } }] }))).toContain('<img src="/assets/ornaments/background/bg-maroon.webp"');
    expect(parse({ freeSections: [{ ...base, photo: { source: "asset", src: "https://x.test/a.png" } }] }).ok).toBe(false);
    expect(parse({ freeSections: [{ ...base, title: "x", cards: Array.from({ length: 5 }, () => ({ title: "a", body: "" })) }] }).ok).toBe(false);
    expect(parse({ freeSections: [{ ...base, photo: { source: "slot", slot: "BRIDE_PHOTO" } }] }, "AQIQAH").ok).toBe(false);
  });

  it("seksi bebas tidak boleh menumpang pada hitung mundur yang sudah menumpang", () => {
    expect(parse({ countdownPlacement: "events", freeSections: [{ ...base, title: "x", after: "countdown" }] }).ok).toBe(false);
  });
});

describe("tata letak desktop", () => {
  it.each([["split-left", "margin-left: 0px !important"], ["wide", "width: 600px !important"], ["centered", ".sidebar-desktop { display: none !important; }"]] as const)("%s", (layout, needle) => {
    const css = styleBlock(compiled(okSpec({ desktopLayout: layout })), "lux-builder-design");
    expect(css).toContain("@media (min-width: 900px)");
    expect(css).toContain(needle);
  });

  it("sampul layar penuh dan navigasi laci tidak dipaksa ke lebar kolom", () => {
    const css = styleBlock(compiled(okSpec({ desktopLayout: "wide", variants: { ...defaultBuilderSpec().variants, cover: "fullscreen", nav: "drawer" } })), "lux-builder-design");
    expect(css).not.toContain(".cover-overlay { width: 600px");
    expect(css).not.toContain(".bottom-dock { left:");
    expect(css).toContain("right: calc(100% - calc(100% - 600px) - 600px + 20px) !important;");
  });
});

describe("animasi per seksi", () => {
  it("menimpa preset per seksi dan kecepatan; preset sama dengan global tidak disimpan", () => {
    const spec = okSpec({ animation: "rise", animationSpeed: "fast", sectionAnimations: { couple: "zoom", events: "rise" } });
    expect(spec.sectionAnimations).toEqual({ couple: "zoom" });
    const html = compiled(spec);
    const css = styleBlock(html, "lux-builder-design");
    expect(css).toContain('html.lux-anim-ready [data-lux-section="couple"] [data-lux-anim]:not(.lux-in) { opacity: 0; transform: scale(0.94); filter: none; }');
    expect(css).toContain("transition-duration: 0.5s");
    expect(html).toContain('data-lux-anim-preset="rise"');
  });

  it("global tanpa animasi tetapi ada seksi beranimasi: skrip dinyalakan dan sisanya tetap tampil", () => {
    const html = compiled(okSpec({ animation: "none", sectionAnimations: { couple: "blur" } }));
    expect(html).toContain('data-lux-anim-preset="fade"');
    expect(styleBlock(html, "lux-builder-design")).toContain("html.lux-anim-ready [data-lux-anim]:not(.lux-in) { opacity: 1; transform: none; filter: none; }");
  });
});

describe("clone master lebih setia", () => {
  it("Valente: hitung mundur di Acara, judul kapital, dan warna eyebrow/judul/garis dari :root", async () => {
    const fs = await import("fs");
    const { seedSpecFromMaster } = await import("@/lib/themeBuilder/legacySeed");
    const seed = seedSpecFromMaster(fs.readFileSync("themes/wedding/minimalist/valente.html", "utf-8"), "WEDDING");
    expect(seed.spec.countdownPlacement).toBe("events");
    expect(seed.spec.blocks["countdown-title"]?.hidden).toBe(true);
    expect(seed.spec.blocks["events-title"]?.transform).toBe("uppercase");
    expect(seed.spec.canvasMode).toBe("dark");
    expect(seed.spec.variants.countdown).toBe("minimal");
    expect(Object.keys(seed.spec.paletteExtra ?? {}).sort()).toEqual(["eyebrow", "heading", "line"]);
    // Warna tambahan hasil clone wajib terbaca di kanvas clone.
    expect(contrastRatio(seed.spec.paletteExtra!.heading!, seed.spec.palette.bgDark)).toBeGreaterThanOrEqual(4.5);
    const parsed = parseBuilderSpec(seed.spec);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(auditBuilderMaster(compiled(parsed.spec), readBuilderBlueprint("WEDDING"))).toEqual([]);
  });
});

describe("pendukung", () => {
  it("ekspor ikut membawa gambar latar seksi unggahan", () => {
    const up = "/uploads/theme-assets/0123456789abcdef01234567.webp";
    const spec = okSpec({ sectionStyles: { couple: { bg: "dark", gradient: "solid", tone: "light", image: up } } });
    expect(uploadedAssetFiles(spec)).toContain("0123456789abcdef01234567.webp");
  });

  it("storedVariant hanya menerima id katalog", () => {
    expect(storedVariant({ variants: { gallery: "carousel" } }, "gallery")).toBe("carousel");
    expect(storedVariant({ variants: { gallery: 'x" onload="alert(1)' } }, "gallery")).toBe("grid");
    expect(storedVariant(null, "gallery")).toBe("grid");
  });
});
