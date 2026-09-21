/**
 * Single Source of Truth untuk daftar slot media undangan yang valid.
 *
 * Gunakan konstanta ini di seluruh route yang memvalidasi atau memproses MediaSlot
 * agar enum DB dan kode selalu sinkron dalam satu tempat.
 *
 * Saat enum `MediaSlot` di prisma/schema.prisma bertambah, cukup update file ini.
 */

/**
 * 9 slot media resmi yang terdaftar di enum `MediaSlot` PostgreSQL.
 * Urutannya mencerminkan urutan logis tampilan undangan dari atas ke bawah.
 */
export const VALID_MEDIA_SLOTS = [
  "LANDING_COVER",
  "LANDING_COVER_DESKTOP",
  "HOME_PHOTO",
  "DESKTOP_SIDEBAR",
  "GLOBAL_FIXED_BG",
  "GROOM_PHOTO",
  "BRIDE_PHOTO",
  "GALLERY",
  "CLOSING_COVER",
] as const;

export type MediaSlotKey = (typeof VALID_MEDIA_SLOTS)[number];

/**
 * Mapping dari MediaSlotKey ke nama file fisik di folder uploads.
 * Digunakan oleh upload/route.ts untuk menentukan nama file tersimpan.
 * Slot non-DB (QRIS, MUSIC, MEMORIES_COVER) dikelola terpisah di upload/route.ts.
 */
export const MEDIA_SLOT_FILE_NAMES: Record<MediaSlotKey, string> = {
  LANDING_COVER: "landing-cover",
  LANDING_COVER_DESKTOP: "landing-cover-desktop",
  HOME_PHOTO: "home-photo",
  DESKTOP_SIDEBAR: "sidebar-desktop",
  GLOBAL_FIXED_BG: "fixed-bg",
  GROOM_PHOTO: "groom-photo",
  BRIDE_PHOTO: "bride-photo",
  GALLERY: "gallery",
  CLOSING_COVER: "closing-cover",
};
