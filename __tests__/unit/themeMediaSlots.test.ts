/**
 * Slot media per tema (19 Nov 2026): pembacaan longgar kolom JSON, validasi ketat masukan admin, dan penyaringan media
 * render. Null = tema belum mendeklarasikan slotnya, semua slot berlaku seperti sebelum fitur ini.
 */
import { describe, it, expect } from "vitest";
import { DECLARABLE_MEDIA_SLOTS, filterDeclaredMedia, isSlotUsed, parseThemeMediaSlots, validateThemeMediaSlots } from "@/lib/themeMediaSlots";

const ART = "/uploads/theme-assets/0123456789abcdef01234567.webp";

describe("deklarasi slot media tema", () => {
  it("galeri tidak bisa dideklarasikan; 10 slot lainnya bisa", () => {
    expect(DECLARABLE_MEDIA_SLOTS).not.toContain("GALLERY");
    expect(DECLARABLE_MEDIA_SLOTS).toHaveLength(10);
    expect(DECLARABLE_MEDIA_SLOTS).toContain("PROFILE_PHOTO");
    expect(DECLARABLE_MEDIA_SLOTS).toContain("EVENT_PHOTO");
  });

  it("slot kanonikal PROFILE_PHOTO dan EVENT_PHOTO berdiri mandiri tanpa alias GROOM_PHOTO", () => {
    const personalSlots = parseThemeMediaSlots({ PROFILE_PHOTO: { places: ["Profil"] } });
    expect(isSlotUsed(personalSlots, "PROFILE_PHOTO")).toBe(true);
    expect(isSlotUsed(personalSlots, "GROOM_PHOTO")).toBe(false);
    expect(isSlotUsed(personalSlots, "HOME_PHOTO")).toBe(false);

    const eventSlots = parseThemeMediaSlots({ EVENT_PHOTO: { places: ["Acara"] } });
    expect(isSlotUsed(eventSlots, "EVENT_PHOTO")).toBe(true);
    expect(isSlotUsed(eventSlots, "GROOM_PHOTO")).toBe(false);
  });

  it("pembacaan kolom: bukan objek = null, entri tidak sah dibuang, thumbnail hanya aset tema", () => {
    expect(parseThemeMediaSlots(null)).toBeNull();
    expect(parseThemeMediaSlots([])).toBeNull();
    expect(parseThemeMediaSlots({})).toEqual({});
    expect(parseThemeMediaSlots({
      LANDING_COVER: { places: ["Sampul", " ", 3] },
      GALLERY: { places: ["Galeri"] },
      HOME_PHOTO: "x",
      GROOM_PHOTO: { places: [], preview: "/demo/kalandra/groom.webp" },
      BRIDE_PHOTO: { preview: ART },
    })).toEqual({
      LANDING_COVER: { places: ["Sampul"] },
      GROOM_PHOTO: { places: [] },
      BRIDE_PHOTO: { places: [], preview: ART },
    });
  });

  it("validasi admin menolak dengan pesan: galeri, tempat kosong/terlalu panjang, thumbnail foto demo", () => {
    expect(validateThemeMediaSlots(null)).toEqual({ ok: true, value: null });
    expect(validateThemeMediaSlots({ GALLERY: { places: [] } })).toMatchObject({ ok: false });
    expect(validateThemeMediaSlots({ LANDING_COVER: { places: [""] } })).toMatchObject({ ok: false });
    expect(validateThemeMediaSlots({ LANDING_COVER: { places: ["x".repeat(41)] } })).toMatchObject({ ok: false });
    expect(validateThemeMediaSlots({ LANDING_COVER: { places: "Sampul" } })).toMatchObject({ ok: false });
    expect(validateThemeMediaSlots({ GROOM_PHOTO: { places: [], preview: "/demo/kalandra/groom.webp" } })).toMatchObject({ ok: false });
    expect(validateThemeMediaSlots([])).toMatchObject({ ok: false });
    expect(validateThemeMediaSlots({ LANDING_COVER: { places: [" Sampul "] }, GROOM_PHOTO: { places: [], preview: ART } })).toEqual({
      ok: true,
      value: { LANDING_COVER: { places: ["Sampul"] }, GROOM_PHOTO: { places: [], preview: ART } },
    });
  });

  it("penyaringan render: slot tak dideklarasikan dibuang, galeri dan tema tanpa deklarasi tidak disaring", () => {
    const media = [
      { mediaSlot: "LANDING_COVER", localPath: "/u/c.webp" },
      { mediaSlot: "HOME_PHOTO", localPath: "/u/h.webp" },
      { mediaSlot: "GALLERY", localPath: "/u/g.webp" },
    ];
    expect(filterDeclaredMedia(media, null)).toBe(media);
    expect(filterDeclaredMedia(media, { LANDING_COVER: { places: [] } }).map((m) => m.mediaSlot)).toEqual(["LANDING_COVER", "GALLERY"]);
    expect(filterDeclaredMedia(media, {}).map((m) => m.mediaSlot)).toEqual(["GALLERY"]);
    expect(isSlotUsed(null, "HOME_PHOTO")).toBe(true);
    expect(isSlotUsed({}, "HOME_PHOTO")).toBe(false);
    expect(isSlotUsed({}, "QRIS")).toBe(true);
  });
});
