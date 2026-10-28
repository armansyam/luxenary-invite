/**
 * Theme Builder: teks hias bebas dan ornamen yang menempel ke blok. Fungsi murni dan kompilasi dari blueprint;
 * tidak butuh database.
 */
import { describe, it, expect } from "vitest";
import { auditBuilderMaster } from "@/lib/themeBuilder/audit";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import { extractRenderedLabels } from "@/lib/renderTemplate";
import {
  ATTACHABLE_BLOCKS,
  BUILDER_BLOCKS,
  DEFAULT_ORNAMENT_TEXT,
  defaultBuilderSpec,
  moveOrnament,
  ornamentStyle,
  parseBuilderSpec,
  type BuilderOrnament,
  type BuilderSpec,
} from "@/lib/themeBuilder/spec";

const ORN = "/assets/ornaments/flowers/flower-tl.webp";
const blueprint = readBuilderBlueprint("WEDDING");

const orn = (patch: Partial<BuilderOrnament> & { id: string }): BuilderOrnament => ({
  section: "opening", src: ORN, x: 50, y: 50, anchor: "top", width: 30, rotate: 0, opacity: 1, flipX: false, layer: "back", ...patch,
});
const specWith = (ornaments: BuilderOrnament[]): BuilderSpec => ({ ...defaultBuilderSpec(), ornaments });
const parse = (ornaments: unknown[]) => parseBuilderSpec({ ...defaultBuilderSpec(), ornaments });

/** Tag pembuka elemen yang membawa penanda blok tertentu di blueprint. */
const openingTag = (id: string) => blueprint.match(new RegExp(`<[a-zA-Z0-9]+\\b[^>]*\\bdata-lux-block="${id}"[^>]*>`))?.[0] ?? "";

describe("daftar blok tempat menempel", () => {
  it("setiap blok yang bisa ditempeli ada di blueprint dan elemennya tidak berlabel", () => {
    for (const id of ATTACHABLE_BLOCKS) {
      const tag = openingTag(id);
      expect(tag, id).not.toBe("");
      expect(tag, `${id} berlabel`).not.toContain("data-lux-field");
    }
  });

  it("setiap blok berlabel dikecualikan, dan tidak ada blok bernama ganda dalam daftar", () => {
    const labelled = BUILDER_BLOCKS.map((b) => b.id).filter((id) => openingTag(id).includes("data-lux-field"));
    expect(labelled.length).toBeGreaterThan(0);
    for (const id of labelled) expect((ATTACHABLE_BLOCKS as readonly string[]).includes(id), id).toBe(false);
    expect(new Set(ATTACHABLE_BLOCKS).size).toBe(ATTACHABLE_BLOCKS.length);
    for (const id of ATTACHABLE_BLOCKS) expect(BUILDER_BLOCKS.some((b) => b.id === id), id).toBe(true);
  });
});

describe("validasi teks hias dan penempelan", () => {
  const text = { ...DEFAULT_ORNAMENT_TEXT, value: "Save the Date" };

  it("menerima teks hias, mengosongkan src, dan menjepit ukuran", () => {
    const r = parse([{ ...orn({ id: "txt00001" }), src: "ngawur", text: { ...text, size: 9999, spacing: -4 } }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.ornaments[0]).toMatchObject({ src: "", text: { value: "Save the Date", size: 96, spacing: 0 } });
  });

  it("menolak teks kosong, terlalu panjang, bertanda kurung sudut atau token, huruf dan warna di luar katalog", () => {
    const bad = [
      { ...text, value: "   " },
      { ...text, value: "x".repeat(81) },
      { ...text, value: "<b>x</b>" },
      { ...text, value: "{{firstName}}" },
      { ...text, font: "comic" },
      { ...text, color: "#ff0000" },
    ];
    for (const t of bad) expect(parse([{ ...orn({ id: "txt00002" }), text: t }]).ok, JSON.stringify(t)).toBe(false);
  });

  it("menolak blok tempat menempel yang tidak dikenal atau berlabel", () => {
    for (const attach of ["tidak-ada", "couple-name-1", "events-title", "x\"><script>"]) {
      expect(parse([orn({ id: "att00001", attach } as never)]).ok, attach).toBe(false);
    }
  });

  it("menempel memaksa seksi mengikuti blok dan menyimpan penanda attach", () => {
    const r = parse([orn({ id: "att00002", section: "closing", attach: "rsvp-form" })]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.ornaments[0]).toMatchObject({ section: "rsvp", attach: "rsvp-form" });
  });

  it("jangkauan posisi ornamen menempel lebih lebar daripada ornamen seksi", () => {
    const free = parse([orn({ id: "lim00001", x: 900, y: -900 })]);
    const attached = parse([orn({ id: "lim00002", attach: "cover-date", section: "cover", x: 900, y: -900 })]);
    const inRange = parse([orn({ id: "lim00003", attach: "cover-date", section: "cover", x: 200, y: -300 })]);
    expect(free.ok && free.spec.ornaments[0]).toMatchObject({ x: 120, y: -20 });
    expect(attached.ok && attached.spec.ornaments[0]).toMatchObject({ x: 250, y: -400 });
    expect(inRange.ok && inRange.spec.ornaments[0]).toMatchObject({ x: 200, y: -300 });
  });

  it("ornamen gambar tanpa sumber sah tetap ditolak", () => {
    expect(parse([orn({ id: "img00001", src: "https://evil.example/a.png" })]).ok).toBe(false);
  });
});

describe("gaya teks hias", () => {
  it("memakai token palet dan peran huruf, bukan nilai mati", () => {
    const style = ornamentStyle({ ...orn({ id: "a" }), text: { value: "x", font: "script", size: 40, color: "accent", spacing: 0.1 } });
    expect(style).toContain("font-family:var(--font-script)");
    expect(style).toContain("color:var(--accent)");
    expect(style).toContain("font-size:40px");
    expect(style).toContain("line-height:1.25");
    expect(style).not.toMatch(/#[0-9a-f]{3,8}|rgb/i);
  });

  it("cermin tidak membalik tulisan", () => {
    const style = ornamentStyle({ ...orn({ id: "a", flipX: true }), text: DEFAULT_ORNAMENT_TEXT });
    expect(style).toContain("scaleX(1)");
    expect(ornamentStyle(orn({ id: "b", flipX: true }))).toContain("scaleX(-1)");
  });
});

describe("kompilasi ornamen menempel", () => {
  const compile = (ornaments: BuilderOrnament[]) => compileBuilderMaster(specWith(ornaments), blueprint);

  it("memasang ornamen sebagai anak pertama elemen blok berupa span dan membiarkan penanda seksi", () => {
    const html = compile([orn({ id: "att00003", attach: "opening-names", section: "opening", x: 10, y: 20 })]);
    const tag = openingTag("opening-names");
    const at = html.indexOf(tag);
    expect(at).toBeGreaterThan(-1);
    expect(html.slice(at + tag.length, at + tag.length + 40)).toContain('<span class="lux-orn is-attached"');
    expect(html).toContain("<!-- lux-ornaments:opening -->");
    expect(html.match(/data-orn-id="att00003"/g)).toHaveLength(1);
    expect(html).toContain('<style id="lux-builder-attach">');
    expect(html).toContain('[data-lux-block="opening-names"]{position:relative;isolation:isolate;}');
  });

  it("ornamen seksi biasa tidak ikut ke blok dan sebaliknya", () => {
    const html = compile([orn({ id: "sec00001", section: "opening" }), orn({ id: "att00004", attach: "opening-names" })]);
    const markerAt = html.indexOf("<!-- lux-ornaments:opening -->");
    expect(html.indexOf('data-orn-id="sec00001"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-orn-id="sec00001"')).toBeLessThan(html.indexOf(openingTag("opening-names")));
    expect(markerAt).toBe(-1);
    expect(html.match(/data-orn-id="att00004"/g)).toHaveLength(1);
  });

  it("foto yang ditempeli dibuka dari pemotongan dan gambarnya mewarisi sudut", () => {
    const html = compile([orn({ id: "att00005", attach: "opening-photo" })]);
    expect(html).toContain('[data-lux-block="opening-photo"]{overflow:visible;}');
    expect(html).toContain('[data-lux-block="opening-photo"] > img{border-radius:inherit;}');
    expect(compile([orn({ id: "att00006", attach: "rsvp-form" })])).not.toContain("overflow:visible");
  });

  it("teks hias di-escape dan tidak memuat token mesin", () => {
    const html = compile([orn({ id: "txt00003", src: "", attach: "cover-names", section: "cover", text: { ...DEFAULT_ORNAMENT_TEXT, value: 'A & "B"' } })]);
    expect(html).toContain("A &amp; &quot;B&quot;");
    expect(html).toContain("lux-orn-text");
    expect(html).not.toContain('"B"</span>');
  });

  it("lolos audit, dan tidak mengubah teks label yang dibekukan dari master", () => {
    const every = ATTACHABLE_BLOCKS.flatMap((attach, i) => [
      orn({ id: `img${String(i).padStart(5, "0")}`, attach, section: BUILDER_BLOCKS.find((b) => b.id === attach)!.section }),
      orn({ id: `txt${String(i).padStart(5, "0")}`, src: "", attach, section: BUILDER_BLOCKS.find((b) => b.id === attach)!.section, text: { ...DEFAULT_ORNAMENT_TEXT, value: `Hias ${attach}` } }),
    ]);
    const html = compile(every);
    expect(auditBuilderMaster(html, blueprint)).toEqual([]);
    expect(extractRenderedLabels(html)).toEqual(extractRenderedLabels(compile([])));
    expect((html.match(/data-orn-id="/g) ?? []).length).toBe(every.length);
  });

  it("audit menandai ornamen yang masuk ke elemen berlabel", () => {
    const polluted = compile([]).replace(/(data-lux-field="customLabels\.coupleTitle"[^>]*>)/, '$1<span class="lux-orn" data-orn-id="x">Bocor</span>');
    expect(auditBuilderMaster(polluted, blueprint).map((i) => i.code)).toContain("ornament");
  });

  it("blok yang tidak ada di blueprint adalah galat, bukan ornamen yang hilang diam-diam", () => {
    const stripped = blueprint.replace(/data-lux-block="opening-names"/, 'data-x="y"');
    expect(() => compileBuilderMaster(specWith([orn({ id: "att00007", attach: "opening-names" })]), stripped)).toThrow(/opening-names/);
  });
});

describe("tumpukan ornamen menempel", () => {
  it("hanya bertukar dengan ornamen di blok yang sama", () => {
    const list = [orn({ id: "a", attach: "rsvp-form" }), orn({ id: "b", attach: "closing-content" }), orn({ id: "c", attach: "rsvp-form" }), orn({ id: "d" })];
    expect(moveOrnament(list, "a", "front").map((o) => o.id)).toEqual(["b", "c", "a", "d"]);
    expect(moveOrnament(list, "b", "front")).toBe(list);
    expect(moveOrnament(list, "d", "back")).toBe(list);
  });
});
