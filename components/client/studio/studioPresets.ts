import { getMediaSlotLabel } from "@/lib/invitationUtils";
import { parseThemeMediaSlots } from "@/lib/themeMediaSlots";

export const WEDDING_DRESSCODE_PRESETS = [
  {
    name: "Earthy Terracotta",
    category: "Rustic & Warm",
    colors: ["#8b4513", "#c86d51", "#dfc9b8", "#fbf7f4"],
  },
  {
    name: "Sage & Champagne",
    category: "Botanical Nature",
    colors: ["#4a5d4e", "#8f9779", "#d4af37", "#fbf9f5"],
  },
  {
    name: "Dusty Rose & Blush",
    category: "Romantic Pastel",
    colors: ["#a36367", "#d9a5b3", "#ead8cd", "#ffffff"],
  },
  {
    name: "Royal Navy & Gold",
    category: "Grand & Classic",
    colors: ["#1b2a4a", "#415a77", "#d4af37", "#f0ebd8"],
  },
  {
    name: "Emerald Luxury",
    category: "Royal Heritage",
    colors: ["#0f4336", "#2d6a4f", "#c5a059", "#f7f5f0"],
  },
  {
    name: "Modern Monochrome",
    category: "Minimalist Chic",
    colors: ["#1a1a1a", "#4a4a4a", "#b0b0b0", "#ffffff"],
  },
  {
    name: "Sogan Batik Nusantara",
    category: "Traditional Heritage",
    colors: ["#4a2c11", "#8c5827", "#c99700", "#f5efe6"],
  },
  {
    name: "Sunset Lilac & Peach",
    category: "Contemporary Sweet",
    colors: ["#795578", "#a77b96", "#e8b4b8", "#fbf5f3"],
  },
];

export const THEME_DRESSCODE_MAP: Record<string, { name: string; colors: string[] }> = {
  candani: { name: "Pesona Emas & Cokelat Jawa", colors: ["#8b6f38", "#2a2012", "#f5ebd9"] },
  solaria: { name: "Romantic Sunset Terracotta", colors: ["#a85d42", "#dfc9b8", "#fbf7f4"] },
  artisan: { name: "Editorial Noir & Earthy Bronze", colors: ["#1a1a1a", "#8c7355", "#f5f0ea"] },
  kalandra: { name: "Warm Amber, Sand & Cream", colors: ["#a85d42", "#d4a373", "#fefae0"] },
  aurelia: { name: "Royal Gold & Classic Black", colors: ["#bfa15f", "#1a1a1a", "#ffffff"] },
  valente: { name: "Classic Navy & Slate Blue", colors: ["#2c3e50", "#7f8c8d", "#ecf0f1"] },
  badrika: { name: "Saoraja Muted Earth Brown", colors: ["#6e5849", "#b08968", "#ede0d4"] },
  mayang: { name: "Heritage Bronze & Ivory", colors: ["#3d342d", "#8d7b68", "#f5efe6"] },
  prameswari: { name: "Keraton Green & Heritage Gold", colors: ["#4a5d4e", "#d4af37", "#fdfbf7"] },
  lagaligo: { name: "Bugis Emerald & Royal Gold", colors: ["#003f30", "#f9e7bc", "#059669"] },
  dillalucky: { name: "Emerald Islamic Batik & Gold", colors: ["#0f2b23", "#c5a059", "#fbfaf7"] },
  lumina: { name: "Golden Glass & Modern Bronze", colors: ["#b5833c", "#261b11", "#faf6f0"] },
  chronicle: { name: "Vogue High-Fashion Monochrome", colors: ["#09090b", "#e5e7eb", "#ffffff"] },
  papercut: { name: "Kraft Paper Clay & Terracotta", colors: ["#a8583c", "#d97736", "#fbf7f4"] },
  wave: { name: "Dramatic Obsidian & Silver", colors: ["#0d0d0f", "#d8cebe", "#f4eee6"] },
  ameera: { name: "Heritage Dark Modern Gray", colors: ["#736b5e", "#c2b69d", "#faf8f5"] },
};

export const EVENT_PRESETS_BY_TYPE: Record<string, string[]> = {
  WEDDING: [
    "Akad Nikah",
    "Resepsi Pernikahan",
    "Mappacci / Korontigi",
    "Mapparola",
    "Mappasili",
    "Pemberkatan Nikah",
    "Syukuran & Pengajian",
    "Custom Sesi Khusus",
  ],
  PERSONAL: [
    "Pesta Ulang Tahun",
    "Tiup Lilin & Potong Kue",
    "Walimatul Khitan",
    "Tasyakuran Aqiqah",
    "Syukuran Kelulusan / Wisuda",
    "Khataman Al-Qur'an & Doa Bersama",
    "Ramah Tamah & Makan Bersama",
  ],
  EVENT: [
    "Registrasi & Welcome Drink",
    "Opening Ceremony",
    "Seminar & Talkshow",
    "Main Activity & Networking",
    "Gala Dinner & Hiburan",
  ],
};

export function formatIndonesianDatePreview(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = clean.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      }
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    return dateStr;
  } catch {
    return dateStr || "";
  }
}

export const STUDIO_SLOT_LABELS: Record<string, string> = {
  LANDING_COVER: "Cover Pembuka Mobile",
  LANDING_COVER_DESKTOP: "Cover Pembuka Desktop",
  HOME_PHOTO: "Latar Home",
  DESKTOP_SIDEBAR: "Hero Kiri Desktop",
  GLOBAL_FIXED_BG: "Latar Belakang Global",
  CLOSING_COVER: "Penutup / Footer",
};

export function studioSlotLabel(slot: string, eventType?: string | null): string {
  return STUDIO_SLOT_LABELS[slot] ?? getMediaSlotLabel(slot, eventType);
}

/**
 * Media bawaan tema untuk satu slot (salinan di undangan), lalu pratinjau ilustrasi master berilustrasi
 * (`themeArtPreview`, hanya tampilan); kosong bila tema tidak menyediakan keduanya.
 */
export function themeDefaultOf(invitation: any, slot: string): string {
  const declared = parseThemeMediaSlots(invitation?.themeMediaSlots) as Record<string, { preview?: string }> | null;
  for (const source of [invitation?.themeDefaultMedia, declared && { [slot]: declared[slot]?.preview }, invitation?.themeArtPreview]) {
    const url = source && typeof source === "object" ? source[slot] : "";
    if (typeof url === "string" && url) return url;
  }
  return "";
}
