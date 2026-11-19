/**
 * Theme Builder fase 5 slot media (19 Nov 2026): gambar tema yang diganti foto klien (`replaceSlot` ornamen dan foto
 * bebas `replaceable`), penanda unggahan klien di engine, dan `Theme.mediaSlots` yang dihitung dari spesifikasi.
 * Bagian render memakai data demo dari database `luxenary_test`.
 */
import { describe, it, expect, afterAll } from "vitest";
import { pool, prisma } from "@/lib/prisma";
import { clientPhotoFlags } from "@/lib/themeEngine";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import { builderMediaSlots, builderSlotReuse } from "@/lib/themeBuilder/mediaSlots";
import { renderBuilderPreview } from "@/lib/themeBuilder/server";
import { defaultBuilderSpec, parseBuilderSpec, type BuilderOrnament, type BuilderSpec, type FreeSection } from "@/lib/themeBuilder/spec";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const ART = "/assets/ornaments/flowers/flower-tl.webp";
const SIM_HOME = "/uploads/builder-sim/0123456789abcdef01234567.webp";

const orn = (patch: Partial<BuilderOrnament> & { id: string }): BuilderOrnament => ({
  section: "story", src: ART, x: 50, y: 50, anchor: "top", width: 30, rotate: 0, opacity: 1, flipX: false, layer: "back", ...patch,
});
const spec = (patch: Partial<BuilderSpec> = {}, eventType: BuilderSpec["eventType"] = "WEDDING"): BuilderSpec => ({ ...defaultBuilderSpec(eventType), ...patch });
const freeSection = (photo: FreeSection["photo"]): FreeSection => ({ id: "free1", after: "story", eyebrow: "", title: "Doa Keluarga", body: "", align: "center", photo });

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

describe("validasi gambar pengganti", () => {
  it("ornamen gambar boleh diganti foto klien; bingkai berslot dan teks hias tidak", () => {
    expect(parseBuilderSpec(spec({ ornaments: [orn({ id: "rep00001", replaceSlot: "HOME_PHOTO" })] })).ok).toBe(true);
    expect(parseBuilderSpec(spec({ ornaments: [orn({ id: "rep00002", replaceSlot: "HOME_PHOTO", slot: "GROOM_PHOTO" })] })).ok).toBe(false);
    expect(parseBuilderSpec(spec({ ornaments: [orn({ id: "rep00003", replaceSlot: "NOPE" as never })] })).ok).toBe(false);
    expect(parseBuilderSpec(spec({ ornaments: [orn({ id: "rep00004", replaceSlot: "BRIDE_PHOTO" })] }, "BIRTHDAY")).ok).toBe(false);
  });

  it("foto seksi bebas: sumber replaceable butuh gambar pustaka dan slot sah", () => {
    expect(parseBuilderSpec(spec({ freeSections: [freeSection({ source: "replaceable", src: ART, slot: "GROOM_PHOTO", shape: "arch", position: "top" })] })).ok).toBe(true);
    expect(parseBuilderSpec(spec({ freeSections: [freeSection({ source: "replaceable", src: "https://x.test/a.webp", slot: "GROOM_PHOTO", shape: "arch", position: "top" })] })).ok).toBe(false);
    expect(parseBuilderSpec(spec({ freeSections: [freeSection({ source: "replaceable", src: ART, slot: "GLOBAL_FIXED_BG" as never, shape: "arch", position: "top" })] })).ok).toBe(false);
  });
});

describe("kompilasi gambar pengganti", () => {
  const blueprint = readBuilderBlueprint("WEDDING");

  it("ornamen: gambar tema selalu ada (ukuran kotak), disembunyikan dan ditutup foto klien saat klien mengunggah", () => {
    const html = compileBuilderMaster(spec({ ornaments: [orn({ id: "rep00010", replaceSlot: "HOME_PHOTO", flipX: true })] }), blueprint);
    expect(html).toContain("{{#if clientHomePhoto}}<img class=\"lux-orn-photo\" src=\"{{homePhotoUrl}}\"");
    expect(html).toContain(`class="lux-orn-art" src="${ART}"`);
    expect(html).toContain("{{#if clientHomePhoto}}visibility:hidden;{{/if}}");
    // Ornamen tercermin: foto klien dibalik lagi agar tidak tampil tercermin.
    expect(html).toMatch(/lux-orn-photo"[^>]*transform:scaleX\(-1\);/);
  });

  it("foto bebas: #if foto klien, #unless gambar tema", () => {
    const html = compileBuilderMaster(spec({ freeSections: [freeSection({ source: "replaceable", src: ART, slot: "GROOM_PHOTO", shape: "rect", position: "top" })] }), blueprint);
    expect(html).toContain(`{{#if clientFirstPhoto}}<img src="{{firstPhotoUrl}}"`);
    expect(html).toContain(`{{#unless clientFirstPhoto}}<img src="${ART}"`);
  });

  it("ilustrasi pengganti Home di seksi pembuka menyembunyikan blok foto pembuka bawaan", () => {
    const html = compileBuilderMaster(spec({ ornaments: [orn({ id: "rep00011", section: "opening", replaceSlot: "HOME_PHOTO" })] }), blueprint);
    expect(html).toMatch(/\[data-lux-block="opening-photo"\]\{[^}]*display:\s*none/);
  });
});

describe("penanda unggahan klien di engine", () => {
  it("bawaan tema dan monogram SVG bukan unggahan klien", () => {
    const own = "/uploads/invitations/a/home.webp";
    const flags = clientPhotoFlags(
      { homePhotoUrl: own, landingCoverUrl: "/uploads/theme-assets/c.webp", firstPhotoUrl: "data:image/svg+xml;utf8,x", closingPhotoUrl: "" },
      [
        { mediaSlot: "HOME_PHOTO", localPath: own },
        { mediaSlot: "LANDING_COVER", localPath: "/uploads/theme-assets/c.webp", isThemeDefault: true },
      ],
    );
    expect(flags).toMatchObject({ clientHomePhoto: true, clientCoverPhoto: false, clientFirstPhoto: false, clientClosingPhoto: false });
  });

  it("regresi fallback lintas slot dan displayOrder BRIDE_FIRST", () => {
    const bg = "/uploads/invitations/a/bg.webp";
    const cover = "/uploads/invitations/a/cover.webp";
    const groom = "/uploads/invitations/a/groom.webp";

    // Klien hanya mengunggah GLOBAL_FIXED_BG (landingCoverUrl jatuh ke bg): clientCoverPhoto harus tetap false.
    const bgOnly = clientPhotoFlags(
      { landingCoverUrl: bg },
      [{ mediaSlot: "GLOBAL_FIXED_BG", localPath: bg }],
      { eventType: "WEDDING" },
    );
    expect(bgOnly.clientCoverPhoto).toBe(false);

    // Birthday: klien hanya mengunggah LANDING_COVER (mainPhotoUrl jatuh ke cover): clientMainPhoto harus tetap false.
    const bdayCoverOnly = clientPhotoFlags(
      { landingCoverUrl: cover, mainPhotoUrl: cover, firstPhotoUrl: cover },
      [{ mediaSlot: "LANDING_COVER", localPath: cover }],
      { eventType: "BIRTHDAY" },
    );
    expect(bdayCoverOnly.clientCoverPhoto).toBe(true);
    expect(bdayCoverOnly.clientMainPhoto).toBe(false);
    expect(bdayCoverOnly.clientFirstPhoto).toBe(false);

    // Wedding displayOrder BRIDE_FIRST: hanya GROOM_PHOTO diunggah -> secondPhotoUrl milik groom, bukan firstPhotoUrl.
    const brideFirst = clientPhotoFlags(
      { firstPhotoUrl: "data:image/svg+xml;utf8,bride", secondPhotoUrl: groom },
      [{ mediaSlot: "GROOM_PHOTO", localPath: groom }],
      { eventType: "WEDDING", displayOrder: "BRIDE_FIRST" },
    );
    expect(brideFirst.clientFirstPhoto).toBe(false);
    expect(brideFirst.clientSecondPhoto).toBe(true);
  });
});

describe("slot foto klien tema builder", () => {
  it("tema bawaan memakai ke-8 slot; tata letak tengah tanpa panel foto; blok foto tersembunyi", () => {
    expect(Object.keys(builderMediaSlots(spec())).length).toBe(8);
    expect(builderMediaSlots(spec({ desktopLayout: "centered" })).DESKTOP_SIDEBAR).toBeUndefined();
    const hidden = builderMediaSlots(spec({ blocks: { "opening-photo": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true }, "couple-photo-1": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true }, "couple-photo-2": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true } } }));
    expect(hidden.HOME_PHOTO).toBeUndefined();
    expect(hidden.GROOM_PHOTO).toBeUndefined();
    expect(hidden.BRIDE_PHOTO).toBeUndefined();
  });

  it("ornamen dan foto bebas menambah tempat & preview; satu nama tanpa foto mempelai kedua; peringatan foto berulang", () => {
    const ART_FREE = "/assets/ornaments/flowers/flower-br.webp";
    const s = spec({
      blocks: { "opening-photo": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true } },
      ornaments: [orn({ id: "rep00020", replaceSlot: "HOME_PHOTO" })],
      freeSections: [freeSection({ source: "replaceable", src: ART_FREE, slot: "GROOM_PHOTO", shape: "rect", position: "top" })],
    });
    const slots = builderMediaSlots(s);
    expect(slots.HOME_PHOTO).toEqual({ places: ["Ilustrasi di Kisah"], preview: ART });
    expect(slots.GROOM_PHOTO).toEqual({ places: ["Profil mempelai", "Seksi Doa Keluarga"], preview: ART_FREE });
    expect(builderSlotReuse(s).map((r) => r.slot)).toEqual(["GROOM_PHOTO"]);
    const single = builderMediaSlots(spec({}, "BIRTHDAY"));
    expect(single.BRIDE_PHOTO).toBeUndefined();
    expect(single.GROOM_PHOTO?.places).toEqual(["Foto profil"]);
  });

  it("ornamen di blok tersembunyi dan events tersembunyi diabaikan; dua ilustrasi di seksi sama memicu peringatan", () => {
    const s = spec({
      eventsPlacement: "home",
      blocks: { "couple-photo-1": { x: 0, y: 0, scale: 1, rotate: 0, hidden: true } },
      ornaments: [
        orn({ id: "hid00001", section: "events", replaceSlot: "CLOSING_COVER" }),
        orn({ id: "hid00002", section: "couple", attach: "couple-photo-1", replaceSlot: "HOME_PHOTO" }),
        orn({ id: "hid00003", section: "opening", attach: "opening-photo", replaceSlot: "HOME_PHOTO" }),
        orn({ id: "dup00001", section: "story", replaceSlot: "LANDING_COVER" }),
        orn({ id: "dup00002", section: "story", replaceSlot: "LANDING_COVER" }),
      ],
    });
    const slots = builderMediaSlots(s);
    // Ornamen yang attach ke opening-photo tidak menyembunyikan blok opening-photo.
    expect(slots.HOME_PHOTO?.places).toEqual(["Foto pembuka", "Ilustrasi di Pembuka"]);
    // Ornamen di #events saat eventsPlacement="home" dan di blok couple-photo-1 yang hidden diabaikan.
    expect(slots.CLOSING_COVER?.places).toEqual(["Penutup"]);
    const reuse = builderSlotReuse(s);
    expect(reuse.find((r) => r.slot === "LANDING_COVER")?.places).toContain("Ilustrasi di Kisah (2×)");
  });
});

describe.skipIf(!IS_TEST_DB)("render pratinjau builder", () => {
  const s = spec({ ornaments: [orn({ id: "rep00030", replaceSlot: "HOME_PHOTO" })] });

  it("klien baru melihat gambar tema; foto uji Home menggantikannya", async () => {
    const fresh = await renderBuilderPreview(s, undefined, "client");
    expect(fresh.html).toContain(`class="lux-orn-art" src="${ART}"`);
    expect(fresh.html).not.toContain('class="lux-orn-photo"');
    expect(fresh.html).not.toMatch(/lux-orn-art"[^>]*visibility:hidden/);

    const sim = await renderBuilderPreview(s, undefined, "sim", { slots: { HOME_PHOTO: SIM_HOME }, gallery: [] });
    expect(sim.html).toContain(`class="lux-orn-photo" src="${SIM_HOME}"`);
    expect(sim.html).toMatch(/lux-orn-art"[^>]*visibility:hidden/);
    expect(sim.html.match(/\{\{[^}]*\}\}/g) ?? []).toEqual([]);
  });
});
