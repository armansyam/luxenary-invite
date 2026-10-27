/**
 * Theme Builder: urutan tumpukan ornamen, bingkai foto, dan tempat jadwal acara. Semuanya fungsi murni atau kompilasi
 * dari blueprint; tidak butuh database.
 */
import { describe, it, expect } from "vitest";
import { auditBuilderMaster } from "@/lib/themeBuilder/audit";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import {
  BUILDER_BLOCKS,
  defaultBuilderSpec,
  frameCss,
  moveOrnament,
  parseBuilderSpec,
  type BuilderOrnament,
  type BuilderSpec,
} from "@/lib/themeBuilder/spec";

const ORN = "/assets/ornaments/bugis/frame-a.webp";
const blueprint = readBuilderBlueprint("WEDDING");

const orn = (id: string, section: BuilderOrnament["section"] = "opening", layer: BuilderOrnament["layer"] = "back"): BuilderOrnament => ({
  id, section, src: ORN, x: 50, y: 50, anchor: "top", width: 30, rotate: 0, opacity: 1, flipX: false, layer,
});
const ids = (list: BuilderOrnament[]) => list.map((o) => o.id);

describe("urutan tumpukan ornamen", () => {
  const list = [orn("a"), orn("b"), orn("x", "couple"), orn("c"), orn("f", "opening", "front"), orn("d")];

  it("naikkan dan turunkan bertukar hanya dengan ornamen seksi dan lapisan yang sama", () => {
    expect(ids(moveOrnament(list, "a", "forward"))).toEqual(["b", "a", "x", "c", "f", "d"]);
    expect(ids(moveOrnament(list, "c", "backward"))).toEqual(["a", "c", "b", "x", "f", "d"]);
  });

  it("paling depan dan paling belakang melompati semua sejenis tanpa menyentuh yang lain", () => {
    expect(ids(moveOrnament(list, "a", "front"))).toEqual(["b", "x", "c", "f", "d", "a"]);
    expect(ids(moveOrnament(list, "d", "back"))).toEqual(["d", "a", "b", "x", "c", "f"]);
  });

  it("tidak mengubah apa pun di ujung tumpukan, untuk ornamen tunggal, atau id yang tidak ada", () => {
    expect(moveOrnament(list, "d", "forward")).toBe(list);
    expect(moveOrnament(list, "a", "backward")).toBe(list);
    expect(moveOrnament(list, "f", "front")).toBe(list);
    expect(moveOrnament(list, "tidak-ada", "front")).toBe(list);
  });

  it("urutan hasil tampil sebagai urutan DOM di master", () => {
    const spec: BuilderSpec = { ...defaultBuilderSpec(), ornaments: moveOrnament([orn("a"), orn("b"), orn("c")], "a", "front") };
    const html = compileBuilderMaster(spec, blueprint);
    const order = [...html.matchAll(/data-orn-id="([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["b", "c", "a"]);
  });
});

describe("elemen opsional dapat disembunyikan", () => {
  const parse = (blocks: unknown) => parseBuilderSpec({ ...defaultBuilderSpec(), blocks });

  it("semua blok boleh disembunyikan kecuali yang wajib tampil (nama cover, kartu tamu, RSVP, jadwal Home)", () => {
    const parsed = parse({
      "cover-monogram": { hidden: true },
      "opening-quote": { x: 5, hidden: true },
      "couple-name-1": { hidden: true },
      countdown: { x: 3, hidden: true },
      "cover-names": { hidden: true },
      "cover-guest": { hidden: true },
      "rsvp-form": { x: 2, hidden: true },
      "home-schedule": { hidden: true },
    });
    expect(parsed.ok && parsed.spec.blocks).toEqual({
      "cover-monogram": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true },
      "opening-quote": { x: 5, y: 0, scale: 1, rotate: 0, hidden: true },
      "couple-name-1": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true },
      countdown: { x: 3, y: 0, scale: 1, rotate: 0, hidden: true },
      "rsvp-form": { x: 2, y: 0, scale: 1, rotate: 0, hidden: false },
    });
  });

  it("jangkauan geser cukup untuk elemen pendek dan dijepit di batasnya", () => {
    const parsed = parse({ "couple-name-1": { x: 900, y: -99999 } });
    expect(parsed.ok && parsed.spec.blocks["couple-name-1"]).toMatchObject({ x: 900, y: -1500 });
  });

  it("master memuat display:none untuk elemen tersembunyi dan tetap lolos audit", () => {
    const parsed = parse({ "cover-monogram": { hidden: true } });
    if (!parsed.ok) throw new Error(parsed.errors.join(", "));
    const html = compileBuilderMaster(parsed.spec, blueprint);
    expect(html).toContain('[data-lux-block="cover-monogram"]{translate:0% 0%;rotate:0deg;scale:1;display:none;}');
    expect(auditBuilderMaster(html, blueprint)).toEqual([]);
  });
});

describe("bingkai foto", () => {
  const spec = (frames: unknown) => parseBuilderSpec({ ...defaultBuilderSpec(), frames });

  it("spesifikasi lama tanpa frames tetap sah dan bingkai bawaan dibuang", () => {
    const { frames: _omit, ...legacy } = defaultBuilderSpec();
    const old = parseBuilderSpec(legacy);
    expect(old.ok && old.spec.frames).toEqual({});
    const parsed = spec({ "opening-photo": { shape: "default", ornament: "", spread: 14 } });
    expect(parsed.ok && parsed.spec.frames).toEqual({});
  });

  it("menerima bentuk, ornamen pustaka, dan menjepit jarak", () => {
    const parsed = spec({ "opening-photo": { shape: "arch", ornament: ORN, spread: 999, hideRing: true }, "couple-photo-1": { shape: "circle" } });
    expect(parsed.ok && parsed.spec.frames).toEqual({
      "opening-photo": { shape: "arch", ornament: ORN, spread: 60, hideRing: true, fit: null },
      "couple-photo-1": { shape: "circle", ornament: "", spread: 14, hideRing: false, fit: null },
    });
    // Hanya menyembunyikan cincin bawaan juga dihitung sebagai bingkai yang diatur.
    const ringOnly = spec({ "couple-photo-2": { hideRing: true } });
    expect(ringOnly.ok && ringOnly.spec.frames).toEqual({ "couple-photo-2": { shape: "default", ornament: "", spread: 14, hideRing: true, fit: null } });
  });

  it("menolak bentuk tak dikenal, ornamen di luar pustaka, dan nilai bukan objek; id tak dikenal diabaikan", () => {
    expect(spec({ "opening-photo": { shape: "bintang" } }).ok).toBe(false);
    for (const bad of ["https://evil.example/a.png", "/uploads/invitations/x/a.webp", "/assets/ornaments/background/a.webp", "/assets/ornaments/bugis/../../secret.png", "x';}body{display:none"]) {
      expect(spec({ "opening-photo": { shape: "rect", ornament: bad } }).ok, bad).toBe(false);
    }
    expect(spec({ "opening-photo": "x" }).ok).toBe(false);
    const unknown = spec({ "foto-lain": { shape: "arch" } });
    expect(unknown.ok && unknown.spec.frames).toEqual({});
  });

  it("CSS bingkai: pembungkus tidak memotong, gambar dipotong sesuai bentuk, bingkai menempel di ::after", () => {
    const css = frameCss({ "opening-photo": { shape: "circle", ornament: ORN, spread: 20, hideRing: false, fit: null } });
    expect(css).toContain('[data-lux-block="opening-photo"]{position:relative;overflow:visible;border-radius:50%;aspect-ratio:1/1;}');
    expect(frameCss({ "opening-photo": { shape: "circle", ornament: ORN, spread: 20, hideRing: true, fit: null } })).toContain("aspect-ratio:1/1;border:0;padding:0;box-shadow:none;}");
    expect(css).toContain('[data-lux-block="opening-photo"] img{width:100%;height:100%;object-fit:cover;border-radius:50%;}');
    expect(css).toContain(`[data-lux-block="opening-photo"]::after{content:"";position:absolute;inset:-20%;background:url('${ORN}') center/contain no-repeat;`);
    expect(frameCss({})).toBe("");
    expect(frameCss({ "opening-photo": { shape: "arch", ornament: "", spread: 14, hideRing: false, fit: null } })).not.toContain("::after");
  });

  it("bingkai berjendela: pembungkus = jendela (rasio), bingkai digambar agar jendelanya menimpa pembungkus", () => {
    // Jendela 25%-75% lebar dan 20%-80% tinggi, rasio 0.556: bingkai = 2x lebar dan 1.667x tinggi pembungkus.
    const css = frameCss({ "couple-photo-1": { shape: "arch", ornament: ORN, spread: 14, hideRing: false, fit: { l: 0.25, t: 0.2, r: 0.75, b: 0.8, aspect: 0.556 } } });
    // Luapan atas = 0.2/0.6/0.556 = 0.6 lebar; luapan bawah = 0.2/0.6/0.556 = 0.6 lebar (ditambah jarak bawah bawaan).
    expect(css).toContain('[data-lux-block="couple-photo-1"]{position:relative;overflow:visible;width:min(140px,100%);height:auto;aspect-ratio:0.556;margin-top:calc(min(140px,100%) * 0.6);margin-bottom:calc(min(140px,100%) * 0.6 + 16px);border:0;padding:0;border-radius:0;box-shadow:none;}');
    expect(css).toContain('[data-lux-block="couple-photo-1"]::after{content:"";position:absolute;left:-50%;top:-33.333%;width:200%;height:166.667%;');
    expect(css).toContain(`background:url('${ORN}') 0 0/100% 100% no-repeat;`);
    // Bentuk pilihan diabaikan: bentuk datang dari alpha bingkai.
    expect(css).not.toContain("999px");
  });

  it("jendela bingkai divalidasi: nilai di luar batas atau tanpa ornamen dibuang atau ditolak", () => {
    const fit = { l: 0.2, t: 0.2, r: 0.8, b: 0.8, aspect: 0.7 };
    const ok = spec({ "opening-photo": { ornament: ORN, fit } });
    expect(ok.ok && ok.spec.frames["opening-photo"]?.fit).toEqual(fit);
    expect(spec({ "opening-photo": { ornament: ORN, fit: { ...fit, r: 1.4 } } }).ok).toBe(false);
    expect(spec({ "opening-photo": { ornament: ORN, fit: { ...fit, aspect: 40 } } }).ok).toBe(false);
    expect(spec({ "opening-photo": { ornament: ORN, fit: { ...fit, l: 0.79 } } }).ok).toBe(false);
    expect(spec({ "opening-photo": { ornament: ORN, fit: "x" } }).ok).toBe(false);
    // Tanpa ornamen, jendela tidak berarti dan tidak disimpan.
    const noOrn = spec({ "opening-photo": { shape: "arch", fit } });
    expect(noOrn.ok && noOrn.spec.frames["opening-photo"]?.fit).toBeNull();
  });

  it("master hasil kompilasi memuat gaya bingkai dan tetap lolos audit", () => {
    const parsed = spec({ "couple-photo-2": { shape: "oval", ornament: ORN, spread: 10 } });
    if (!parsed.ok) throw new Error(parsed.errors.join(", "));
    const html = compileBuilderMaster(parsed.spec, blueprint);
    expect(html).toContain('<style id="lux-builder-frames">');
    expect(html).toContain('[data-lux-block="couple-photo-2"]::after');
    expect(auditBuilderMaster(html, blueprint)).toEqual([]);
    expect(compileBuilderMaster(defaultBuilderSpec(), blueprint)).not.toContain("lux-builder-frames");
  });
});

describe("tempat jadwal acara", () => {
  const count = (html: string, needle: string) => html.split(needle).length - 1;
  const home = (): BuilderSpec => ({ ...defaultBuilderSpec(), eventsPlacement: "home" });

  it("bawaan di seksi Acara dan spesifikasi lama tetap sah", () => {
    const { eventsPlacement: _omit, ...legacy } = defaultBuilderSpec();
    const old = parseBuilderSpec(legacy);
    expect(old.ok && old.spec.eventsPlacement).toBe("section");
    expect(parseBuilderSpec({ ...defaultBuilderSpec(), eventsPlacement: "lantai-dua" }).ok).toBe(false);
  });

  it("mode seksi: token tepat satu kali di seksi Acara, wadah Home tetap kosong dan tersembunyi", () => {
    const html = compileBuilderMaster(defaultBuilderSpec(), blueprint);
    expect(count(html, "{{eventDataHtml}}")).toBe(1);
    expect(html).toContain("<!-- lux-home-schedule -->");
    expect(html).not.toContain("lux-builder-events");
  });

  it("mode Home: token dipindahkan, bukan digandakan, dan seksi Acara serta tautannya disembunyikan", () => {
    const html = compileBuilderMaster(home(), blueprint);
    expect(count(html, "{{eventDataHtml}}")).toBe(1);
    const homeStart = html.indexOf('class="home-schedule"');
    const eventsStart = html.indexOf('data-lux-section="events"');
    const tokenAt = html.indexOf("{{eventDataHtml}}");
    expect(homeStart).toBeGreaterThan(-1);
    expect(tokenAt).toBeGreaterThan(homeStart);
    expect(tokenAt).toBeLessThan(eventsStart);
    expect(html).toContain('<style id="lux-builder-events">');
    expect(html).toContain("#events { display: none; }");
    expect(html).toContain('a[href="#events"] { display: none !important; }');
    expect(auditBuilderMaster(html, blueprint)).toEqual([]);
  });

  it("blok jadwal di Home terdaftar dan ada di blueprint", () => {
    expect(BUILDER_BLOCKS.some((b) => b.id === "home-schedule" && b.section === "opening")).toBe(true);
    expect(blueprint).toContain('data-lux-block="home-schedule"');
  });
});
