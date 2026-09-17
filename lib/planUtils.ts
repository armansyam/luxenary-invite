/**
 * Single Source of Truth untuk Penamaan Paket Undangan Digital (Plan Display Names & Tiers)
 * 
 * Memetakan identifier teknis database (TIER_1, TIER_2, TIER_3)
 * ke nama komersial aktif (Serenade, Symphony, Eternity) yang dikonfigurasi di admin_settings.
 */

export const DEFAULT_PLAN_NAMES: Record<"TIER_1" | "TIER_2" | "TIER_3", string> = {
  TIER_1: "Serenade",
  TIER_2: "Symphony",
  TIER_3: "Eternity",
};

export const DEFAULT_PLAN_DESCRIPTIONS: Record<"TIER_1" | "TIER_2" | "TIER_3", string> = {
  TIER_1: "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online",
  TIER_2: "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu",
  TIER_3: "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi (.com/.id) & Kuota Maksimal",
};

/**
 * Normalisasi string plan type input apa pun ke kanonikal TIER_1, TIER_2, TIER_3
 */
export function normalizePlanType(val?: string | null): "TIER_1" | "TIER_2" | "TIER_3" {
  if (!val) return "TIER_1";
  const upper = val.toUpperCase().trim();
  if (upper === "TIER_3" || upper === "ETERNITY") return "TIER_3";
  if (upper === "TIER_2" || upper === "SYMPHONY") return "TIER_2";
  return "TIER_1";
}

/**
 * Mengambil nama tampilan paket yang ramah pengguna.
 * Mengutamakan nama dinamis dari settings (jika tersedia), dengan fallback ke default resmi.
 */
export function getPlanDisplayName(
  planType?: string | null,
  packagesOrSettings?: Array<{ id: string; name: string }> | Record<string, any> | null
): string {
  if (!planType) return "Undangan";
  const canonical = normalizePlanType(planType);

  if (packagesOrSettings) {
    if (Array.isArray(packagesOrSettings)) {
      const found = packagesOrSettings.find((p) => normalizePlanType(p.id) === canonical);
      if (found?.name && found.name.trim().length > 0) {
        return found.name.trim();
      }
    } else if (typeof packagesOrSettings === "object") {
      const keyMap: Record<"TIER_1" | "TIER_2" | "TIER_3", string> = {
        TIER_1: "name_tier1",
        TIER_2: "name_tier2",
        TIER_3: "name_tier3",
      };
      const customName = packagesOrSettings[keyMap[canonical]];
      if (customName && typeof customName === "string" && customName.trim().length > 0) {
        return customName.trim();
      }
    }
  }

  return DEFAULT_PLAN_NAMES[canonical] || "Serenade";
}

/**
 * Mengambil deskripsi ringkas paket untuk sub-header kartu status / dasbor.
 */
export function getPlanDisplayDescription(
  planType?: string | null,
  packages?: Array<{ id: string; desc?: string }> | null
): string {
  if (!planType) return "";
  const canonical = normalizePlanType(planType);

  if (packages && Array.isArray(packages)) {
    const found = packages.find((p) => normalizePlanType(p.id) === canonical);
    if (found?.desc && found.desc.trim().length > 0) {
      return found.desc.trim();
    }
  }

  return DEFAULT_PLAN_DESCRIPTIONS[canonical] || "";
}
