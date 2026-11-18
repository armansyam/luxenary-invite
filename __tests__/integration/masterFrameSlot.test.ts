/**
 * Editor Master: "Isi bingkai dengan slot media" (18 Nov 2026). Ornamen master boleh membawa slot media; foto slot
 * dipaskan ke jendela transparan bingkai yang diukur server, dengan token engine yang sama dengan ornamen berslot
 * Theme Builder. Sekaligus menguji batas `{{#if}}` per halaman yang sebelumnya 25.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { applyMasterLayoutHtml, masterLayoutCss, parseMasterLayout, type MasterOrnament } from "@/lib/masterLayout";
import { fitMasterOrnaments } from "@/lib/themeBuilder/frameWindow";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { applyMasterOverridesTo } from "@/lib/themeVariantCss";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { composeInvitationData } from "@/lib/themeEngine";
import { pool } from "@/lib/prisma";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const MASTER = fs.readFileSync("themes/wedding/traditional/wajo.html", "utf8");
const FRAME = "/assets/ornaments/uji-frame-slot/bingkai.png";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "lux-mframe-"));

afterAll(async () => {
  fs.rmSync(root, { recursive: true, force: true });
  await pool.end();
});

const orn = (extra: Record<string, unknown> = {}) => ({ id: "ornone1", anchor: "home", src: "/assets/ornaments/flowers/flower-tl.webp", x: 50, y: 50, width: 60, rotate: 0, opacity: 1, layer: "front", ...extra });

describe("ornamen master berslot", () => {
  it("parser menerima slot yang dikenal, membuang slot asing, dan tidak menerima jendela dari klien", () => {
    const errors: string[] = [];
    const out = parseMasterLayout({ ornaments: [orn({ slot: "GROOM_PHOTO", fit: { l: 0, t: 0, r: 1, b: 1 } }), orn({ id: "orntwo2", slot: "PASPOR" })] }, MASTER, errors);
    expect(errors).toEqual([]);
    expect(out.ornaments![0].slot).toBe("GROOM_PHOTO");
    expect(out.ornaments![0].fit).toBeUndefined();
    expect(out.ornaments![1].slot).toBeUndefined();
  });

  it("HTML berslot memuat foto bertoken di dalam bingkai, ornamen biasa tetap <img>", () => {
    const ornaments = [orn({ slot: "GROOM_PHOTO", fit: { l: 0.25, t: 0.2, r: 0.75, b: 0.8, aspect: 0.55 } }), orn({ id: "orntwo2" })] as MasterOrnament[];
    const html = applyMasterLayoutHtml(MASTER, { ornaments });
    expect(html).toContain('<div class="lux-mo lux-mo-slot" data-lux-mo="ornone1"');
    expect(html).toContain('{{#if firstPhotoUrl}}<img class="lux-mo-photo" src="{{firstPhotoUrl}}" alt="" style="left:25%;top:20%;width:50%;height:60%;">{{/if}}');
    expect(html).toContain("{{#if mainPhotoUrl}}");
    expect(html).toMatch(/<img class="lux-mo" data-lux-mo="orntwo2" src="\/assets\/ornaments\/flowers\/flower-tl\.webp"/);
    expect(masterLayoutCss({ ornaments })).toContain(".lux-mo-slot .lux-mo-photo");
  });

  it("jendela bingkai diukur server hanya untuk ornamen berslot", async () => {
    const dir = path.join(root, "assets", "ornaments", "uji-frame-slot");
    fs.mkdirSync(dir, { recursive: true });
    const solid = await sharp({ create: { width: 400, height: 600, channels: 4, background: { r: 120, g: 80, b: 30, alpha: 1 } } }).png().toBuffer();
    const hole = await sharp({ create: { width: 200, height: 360, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
    fs.writeFileSync(path.join(dir, "bingkai.png"), await sharp(solid).composite([{ input: hole, left: 100, top: 120, blend: "dest-out" }]).png().toBuffer());
    const [withSlot, plain] = await fitMasterOrnaments([orn({ src: FRAME, slot: "HOME_PHOTO" }), orn({ id: "orntwo2", src: FRAME, fit: { l: 0, t: 0, r: 1, b: 1, aspect: 1 } })] as MasterOrnament[], root);
    expect(withSlot.fit!.l).toBeCloseTo(0.25, 1);
    expect(withSlot.fit!.b).toBeCloseTo(0.8, 1);
    expect("fit" in plain).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB)("render master dengan bingkai berslot", () => {
  it("foto mempelai pertama masuk bingkai, tanpa token mentah, walau halaman memuat lebih dari 25 blok {{#if}}", async () => {
    const ornaments = Array.from({ length: 20 }, (_, i) => orn({ id: `ornbulk${i}`, slot: "GROOM_PHOTO" }));
    const tpl = applyMasterOverridesTo(MASTER, { colors: {}, fonts: {}, ornaments } as never);
    const data = (await composeInvitationData(buildDemoInvitation("wajo", undefined, "WEDDING"))) as Record<string, any>;
    const html = await renderTemplateFile("wajo", data, { eventType: "WEDDING", templateSource: tpl });
    expect(html).not.toMatch(/\{\{\s*#if/);
    expect(html).not.toContain("{{firstPhotoUrl}}");
    const photos = [...html.matchAll(/<img class="lux-mo-photo" src="([^"]*)"/g)].map((m) => m[1]);
    expect(photos).toHaveLength(20);
    // Atribut src menyandikan tanda petik (%27); placeholder SVG yang sama dibandingkan setelah didekode.
    expect(new Set(photos.map(decodeURIComponent))).toEqual(new Set([decodeURIComponent(data.firstPhotoUrl)]));
  });
});
