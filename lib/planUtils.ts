/**
 * Single Source of Truth untuk Penamaan Paket Undangan Digital (Plan Display Names)
 * 
 * Memetakan identifier teknis database (TRADITIONAL, MODERN, PREMIUM)
 * ke nama komersial aktif (Serenade, Symphony, Eternity) yang dikonfigurasi di admin_settings.
 */

export const DEFAULT_PLAN_NAMES: Record<string, string> = {
  TRADITIONAL: "Serenade",
  MODERN: "Symphony",
  PREMIUM: "Eternity",
};

export const DEFAULT_PLAN_DESCRIPTIONS: Record<string, string> = {
  TRADITIONAL: "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online",
  MODERN: "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu",
  PREMIUM: "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi & Kuota Maksimal",
};

/**
 * Mengambil nama tampilan paket yang ramah pengguna.
 * Mengutamakan nama dinamis dari settings (jika tersedia), dengan fallback ke default resmi.
 */
export function getPlanDisplayName(
  planType?: string | null,
  packages?: Array<{ id: string; name: string }> | null
): string {
  if (!planType) return "Undangan";
  const upper = planType.toUpperCase().trim();

  if (packages && Array.isArray(packages)) {
    const found = packages.find((p) => p.id?.toUpperCase() === upper);
    if (found?.name && found.name.trim().length > 0) {
      return found.name.trim();
    }
  }

  return DEFAULT_PLAN_NAMES[upper] || planType;
}

/**
 * Mengambil deskripsi ringkas paket untuk sub-header kartu status / dasbor.
 */
export function getPlanDisplayDescription(
  planType?: string | null,
  packages?: Array<{ id: string; desc?: string }> | null
): string {
  if (!planType) return "";
  const upper = planType.toUpperCase().trim();

  if (packages && Array.isArray(packages)) {
    const found = packages.find((p) => p.id?.toUpperCase() === upper);
    if (found?.desc && found.desc.trim().length > 0) {
      return found.desc.trim();
    }
  }

  return DEFAULT_PLAN_DESCRIPTIONS[upper] || "";
}
