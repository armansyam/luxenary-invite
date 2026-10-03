import { logger } from "@/lib/logger";

type FeatureSettings = Record<string, any>;

const isPlainObject = (value: unknown): value is FeatureSettings =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Kolom Invitation.featureSettings bertipe String? (JSON) dan dapat NULL.
 * `typeof null === "object"`, sehingga pola `typeof x === "object" ? x : JSON.parse(x)` mengembalikan null
 * dan membuat pembacaan properti berikutnya melempar TypeError. Selalu mengembalikan objek.
 */
export function parseFeatureSettings(raw: unknown): FeatureSettings {
  if (isPlainObject(raw)) return raw;
  if (typeof raw !== "string" || raw.trim() === "") return {};
  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch (err) {
    logger.warn("FeatureSettings", "JSON featureSettings korup, memakai objek kosong", { error: (err as Error).message });
    return {};
  }
}

/**
 * Kunci yang ditulis server saat add-on dibayar atau notifikasi kuota terkirim. Pemilik undangan tidak boleh
 * mengubahnya lewat PUT/PATCH: `extraMemoriesQuota` menentukan kuota foto yang sudah dibeli.
 */
export const SERVER_MANAGED_FEATURE_KEYS = ["extraMemoriesQuota", "extraGalleryDays", "memoriesNotifiedMilestones", "memoriesNotified80"] as const;

/** Menggabungkan featureSettings dari klien ke yang tersimpan; kunci server-managed hanya boleh diubah admin. */
export function mergeClientFeatureSettings(existing: FeatureSettings, incoming: FeatureSettings, isAdmin: boolean): FeatureSettings {
  const merged: FeatureSettings = { ...existing, ...incoming };
  if (isAdmin) return merged;
  for (const key of SERVER_MANAGED_FEATURE_KEYS) {
    if (key in existing) merged[key] = existing[key];
    else delete merged[key];
  }
  return merged;
}

/** Mematikan fitur berbayar yang tidak termasuk kapabilitas paket (tidak bisa dibuka lewat bypass API). */
export async function gateFeaturesByPlan(features: FeatureSettings, planType: string | null | undefined): Promise<FeatureSettings> {
  const { getPublicPlatformSettings } = await import("@/lib/settings");
  const platformSettings = await getPublicPlatformSettings();
  const plan = planType || "TIER_1";
  const packageConfig = platformSettings.packages?.find((p) => p.id === plan);
  const allowedCaps: string[] =
    packageConfig?.capabilities ||
    (plan === "TIER_3"
      ? ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"]
      : plan === "TIER_2"
      ? ["music", "gallery", "qr_checkin"]
      : ["music", "gallery"]);
  const gated: FeatureSettings = { ...features };
  if (gated.showQrCheckin && !allowedCaps.includes("qr_checkin")) gated.showQrCheckin = false;
  if (gated.showGuestMemories && !allowedCaps.includes("guest_memories")) gated.showGuestMemories = false;
  return gated;
}
