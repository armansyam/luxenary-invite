/**
 * Theme Builder: teks hias bebas dan ornamen yang menempel ke blok. Fungsi murni dan kompilasi dari blueprint;
 * tidak butuh database.
 */
import { describe, it, expect } from "vitest";
import { auditBuilderMaster } from "@/lib/themeBuilder/audit";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import { extractRenderedLabels } from "@/lib/renderTemplate";
import { exportBundle, readBundle } from "@/lib/themeBuilder/bundle";
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

describe("ornamen sebaris sebelum blok", () => {
  const compile = (ornaments: BuilderOrnament[]) => compileBuilderMaster(specWith(ornaments), blueprint);

  it("validasi: seksi mengikuti blok, posisi tetap, lebar dijepit 100, tidak bersama attach", () => {
    const r = parse([orn({ id: "flw00001", before: "couple-title", section: "cover", x: 3, y: 77, width: 130, layer: "front", anchor: "bottom", gap: 500 } as never)]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.ornaments[0]).toMatchObject({ section: "couple", before: "couple-title", x: 50, y: 50, anchor: "top", layer: "back", width: 100, gap: 96 });
    expect(parse([orn({ id: "flw00002", before: "tidak-ada" } as never)]).ok).toBe(false);
    expect(parse([orn({ id: "flw00003", before: "couple-title", attach: "rsvp-form" } as never)]).ok).toBe(false);
    // Tanda & berada di baris menyamping varian Berdampingan; ornamen sebaris di sana menimbulkan luapan horizontal di HP.
    expect(parse([orn({ id: "flw00007", before: "couple-amp", section: "couple" } as never)]).ok).toBe(false);
    expect(parse([orn({ id: "flw00008", attach: "couple-amp", section: "couple" } as never)]).ok).toBe(true);
  });

  it("dipasang sebagai saudara tepat sebelum blok, juga untuk blok berlabel, dan tidak mengubah label", () => {
    const html = compile([orn({ id: "flw00004", before: "couple-title", section: "couple", width: 40 })]);
    const tag = openingTag("couple-title");
    const at = html.indexOf(tag);
    expect(at).toBeGreaterThan(0);
    const before = html.slice(Math.max(0, at - 400), at);
    expect(before).toMatch(/<div class="lux-flow" data-orn-id="flw00004" style="display:block;width:40%;margin:16px auto;/);
    expect(before.trimEnd().endsWith("</div>")).toBe(true);
    expect(html).toContain('style="display:block;width:100%;height:auto;"');
    expect(auditBuilderMaster(html, blueprint)).toEqual([]);
    expect(extractRenderedLabels(html)).toEqual(extractRenderedLabels(compile([])));
    expect(html.match(/data-orn-id="flw00004"/g)).toHaveLength(1);
  });

  it("teks sebaris di-escape dan memakai token palet", () => {
    const html = compile([orn({ id: "flw00005", src: "", before: "countdown-title", section: "countdown", text: { ...DEFAULT_ORNAMENT_TEXT, value: "A & B" } })]);
    expect(html).toContain('<div class="lux-flow lux-orn-text" data-orn-id="flw00005"');
    expect(html).toContain("A &amp; B");
    expect(html).toContain("font-family:var(--font-script)");
  });

  it("blok yang hilang dari blueprint adalah galat dan tumpukan dipisah per blok", () => {
    const stripped = blueprint.replace(/data-lux-block="couple-title"/, 'data-x="y"');
    expect(() => compileBuilderMaster(specWith([orn({ id: "flw00006", before: "couple-title", section: "couple" })]), stripped)).toThrow(/couple-title/);
    const list = [orn({ id: "a", before: "couple-title", section: "couple" }), orn({ id: "b", before: "events-title", section: "events" }), orn({ id: "c", before: "couple-title", section: "couple" })];
    expect(moveOrnament(list, "a", "front").map((o) => o.id)).toEqual(["b", "c", "a"]);
    expect(moveOrnament(list, "b", "front")).toBe(list);
  });
});

describe("roundtrip spesifikasi dengan ornamen baru", () => {
  const mixed = (): BuilderOrnament[] => [
    orn({ id: "rt000001", section: "cover" }),
    orn({ id: "rt000002", src: "", section: "cover", layer: "front", text: { ...DEFAULT_ORNAMENT_TEXT, value: "A & B", spacing: 0.12 } }),
    orn({ id: "rt000003", attach: "cover-names", section: "cover", x: 140, y: -300, width: 22 }),
    orn({ id: "rt000004", attach: "rsvp-form", section: "rsvp", src: "", text: { ...DEFAULT_ORNAMENT_TEXT, color: "accent", font: "heading" } }),
    orn({ id: "rt000005", before: "couple-title", section: "couple", gap: 30, width: 55 }),
    orn({ id: "rt000006", before: "events-title", section: "events", src: "", text: { ...DEFAULT_ORNAMENT_TEXT, value: "Bersama", font: "body" } }),
  ];

  it("parse ulang hasil parse tidak mengubah apa pun dan lolos JSON", () => {
    const first = parse(mixed());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = parseBuilderSpec(JSON.parse(JSON.stringify(first.spec)));
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.spec).toEqual(first.spec);
    expect(first.spec.ornaments).toHaveLength(6);
  });

  it("ekspor lalu impor mengembalikan spesifikasi yang sama", async () => {
    const first = parse(mixed());
    if (!first.ok) throw new Error("spesifikasi uji tidak valid");
    const { bundle } = exportBundle({ name: "Uji", category: "modern", description: "", defaultMusicUrl: "" }, first.spec);
    const read = await readBundle(JSON.parse(JSON.stringify(bundle)));
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.spec).toEqual(first.spec);
  });

  it("kompilasi master dari spesifikasi campuran lolos audit dan menampilkan semua ornamen", () => {
    const first = parse(mixed());
    if (!first.ok) throw new Error("spesifikasi uji tidak valid");
    const html = compileBuilderMaster(first.spec, blueprint);
    expect(auditBuilderMaster(html, blueprint)).toEqual([]);
    expect((html.match(/data-orn-id="rt00000\d"/g) ?? []).length).toBe(6);
  });
});

describe("teks hias yang bisa diedit klien", () => {
  const editable = (id: string, labelKey: string, value = "Save the Date", patch: Partial<BuilderOrnament> = {}) =>
    orn({ id, src: "", section: "cover", layer: "front", text: { ...DEFAULT_ORNAMENT_TEXT, value, labelKey } as never, ...patch });

  it("validasi: kunci hanya hias1 sampai hias3 dan tiap kunci dipakai satu teks", () => {
    expect(parse([editable("edt00001", "hias1")]).ok).toBe(true);
    for (const bad of ["hias0", "hias4", "coverBadge", "customLabels.hias1", "<x>"]) expect(parse([editable("edt00002", bad)]).ok, bad).toBe(false);
    expect(parse([editable("edt00003", "hias1"), editable("edt00004", "hias1")]).ok).toBe(false);
    expect(parse([editable("edt00005", "hias1"), editable("edt00006", "hias2"), editable("edt00007", "hias3")]).ok).toBe(true);
  });

  it("kompilasi: teks hias menjadi label customLabels dengan teks awal dari admin", () => {
    const html = compileBuilderMaster(specWith([editable("edt00008", "hias2", 'Kami & "Kita"', { attach: "cover-names" })]), blueprint);
    expect(html).toMatch(/<span class="lux-orn is-front is-attached lux-orn-text" data-orn-id="edt00008" data-lux-field="customLabels\.hias2" style=/);
    expect(html).not.toMatch(/data-orn-id="edt00008"[^>]*aria-hidden/);
    expect(extractRenderedLabels(html).hias2).toBe('Kami & "Kita"');
    expect(html).toContain('<style id="lux-builder-editable">');
    expect(html).toContain('.lux-orn.lux-orn-text[data-lux-field] { position: absolute; }');
    expect(auditBuilderMaster(html, blueprint)).toEqual([]);
  });

  it("tanpa teks editable tidak ada gaya sunting dan teks tetap aria-hidden", () => {
    const html = compileBuilderMaster(specWith([orn({ id: "edt00009", src: "", text: { ...DEFAULT_ORNAMENT_TEXT } })]), blueprint);
    expect(html).not.toContain("lux-builder-editable");
    expect(html).toMatch(/data-orn-id="edt00009" style="[^"]*" aria-hidden="true"/);
    expect(extractRenderedLabels(html).hias1).toBeUndefined();
  });

  it("label tidak mengubah teks label lain yang dibaca dari master", () => {
    const withEditable = extractRenderedLabels(compileBuilderMaster(specWith([editable("edt00010", "hias1")]), blueprint));
    const without = extractRenderedLabels(compileBuilderMaster(specWith([]), blueprint));
    const { hias1, ...rest } = withEditable;
    expect(hias1).toBe("Save the Date");
    expect(rest).toEqual(without);
  });
});
