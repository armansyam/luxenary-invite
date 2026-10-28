import { logger } from "@/lib/logger";
import { normalizeFeatureUrls, safeMediaUrl } from "@/lib/safeUrl";
import { EDITABLE_TEXT_KEYS } from "@/lib/themeBuilder/spec";

type FeatureSettings = Record<string, any>;

const isPlainObject = (value: unknown): value is FeatureSettings =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Kolom Invitation.featureSettings (jsonb) dapat NULL, dan body permintaan dapat mengirim string JSON.
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

/** Filter kamera tamu yang dikenali DisposableCameraViewfinder. */
export const MEMORIES_FILTER_IDS = ["aura_90s", "heritage_romance", "botanical_mist", "cinema_noir", "pure_daylight"] as const;

export const isValidMemoriesFilter = (value: unknown): boolean =>
  typeof value === "string" && (MEMORIES_FILTER_IDS as readonly string[]).includes(value);

/** Jatah foto per tamu: bilangan bulat 1-30. */
export const isValidShotsQuota = (value: unknown): boolean =>
  (typeof value === "number" || typeof value === "string") && Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 30;

/**
 * Nilai kamera dari klien yang tidak sah diganti nilai tersimpan sebelumnya (atau dibuang bila tidak ada),
 * sehingga PUT/PATCH featureSettings tidak dapat menembus validasi rute Momen.
 */
export function keepValidMemoriesSettings(merged: FeatureSettings, existing: FeatureSettings): FeatureSettings {
  const result: FeatureSettings = { ...merged };
  if (result.memoriesFilter !== undefined && !isValidMemoriesFilter(result.memoriesFilter)) {
    if (isValidMemoriesFilter(existing.memoriesFilter)) result.memoriesFilter = existing.memoriesFilter;
    else delete result.memoriesFilter;
  }
  if (result.memoriesShotsQuota !== undefined) {
    if (isValidShotsQuota(result.memoriesShotsQuota)) result.memoriesShotsQuota = Number(result.memoriesShotsQuota);
    else if (isValidShotsQuota(existing.memoriesShotsQuota)) result.memoriesShotsQuota = Number(existing.memoriesShotsQuota);
    else delete result.memoriesShotsQuota;
  }
  return result;
}

/** Kunci label yang dapat disunting Studio (`customLabels.<kunci>`, sama dengan pola di lib/liveEditFields.ts). */
export const CUSTOM_LABEL_KEY_RE = /^[A-Za-z0-9_]{1,60}$/;
export const MAX_CUSTOM_LABEL_LENGTH = 1000;
/** Teks hias (hias1-hias3) berada di kotak berukuran tetap di atas desain; teks panjang menutupi isi undangan. */
export const MAX_DECORATIVE_LABEL_LENGTH = 120;
export const MAX_CUSTOM_LABELS = 100;

/**
 * Label khusus dari klien: kunci sesuai pola Studio, nilai string maksimal 1000 karakter (teks hias 120), paling banyak
 * 100 kunci. Pelanggaran dijawab dengan galat yang ditampilkan Studio, bukan dibuang diam-diam, supaya klien tahu
 * teksnya tidak tersimpan. Nilai yang sama dengan yang sudah tersimpan selalu lolos supaya undangan lama dengan label
 * panjang tetap dapat disimpan.
 */
export function validateCustomLabels(merged: FeatureSettings, existing: FeatureSettings): { ok: true } | { ok: false; error: string } {
  if (merged.customLabels === undefined) return { ok: true };
  if (!isPlainObject(merged.customLabels)) return { ok: false, error: "Label undangan harus berupa objek." };
  const stored = isPlainObject(existing.customLabels) ? existing.customLabels : {};
  const entries = Object.entries(merged.customLabels);
  if (entries.length > MAX_CUSTOM_LABELS && entries.length > Object.keys(stored).length) {
    return { ok: false, error: `Label undangan paling banyak ${MAX_CUSTOM_LABELS}.` };
  }
  for (const [key, value] of entries) {
    if (value === stored[key]) continue;
    if (!CUSTOM_LABEL_KEY_RE.test(key)) return { ok: false, error: `Kunci label "${key.slice(0, 40)}" tidak dikenali.` };
    if (typeof value !== "string") return { ok: false, error: `Isi label ${key} harus berupa teks.` };
    const decorative = (EDITABLE_TEXT_KEYS as readonly string[]).includes(key);
    const max = decorative ? MAX_DECORATIVE_LABEL_LENGTH : MAX_CUSTOM_LABEL_LENGTH;
    if (value.length > max) {
      return { ok: false, error: decorative ? `Teks hias maksimal ${max} karakter (sekarang ${value.length}).` : `Label ${key} maksimal ${max} karakter (sekarang ${value.length}).` };
    }
  }
  return { ok: true };
}

/**
 * Menggabungkan featureSettings dari body PUT/PATCH (objek atau string JSON) ke yang tersimpan: URL disanitasi, fitur
 * berbayar di luar paket dimatikan untuk non-admin, dan pengaturan kamera yang tidak sah diganti nilai tersimpan.
 */
export async function mergeFeatureSettingsInput(
  stored: unknown,
  incoming: unknown,
  planType: string | null | undefined,
  isAdmin: boolean,
): Promise<{ ok: true; value: FeatureSettings } | { ok: false; error: string }> {
  let incomingObj: unknown = incoming;
  if (typeof incoming === "string") {
    try {
      incomingObj = JSON.parse(incoming || "{}");
    } catch {
      return { ok: false, error: "featureSettings bukan JSON yang valid." };
    }
  }
  if (!isPlainObject(incomingObj)) return { ok: false, error: "featureSettings harus berupa objek." };

  const existing = parseFeatureSettings(stored);
  let merged = normalizeFeatureUrls({ ...existing, ...incomingObj });
  // Studio mengirim seluruh objek label tetapi hanya pernah menulis kunci (tidak pernah menghapusnya). Digabung per kunci
  // supaya tab Studio yang basi tidak menghapus label yang baru diubah dari tab lain; kunci di input menang atas yang tersimpan.
  if (isPlainObject(incomingObj.customLabels) && isPlainObject(existing.customLabels)) {
    merged = { ...merged, customLabels: { ...existing.customLabels, ...incomingObj.customLabels } };
  }
  // Aturan yang sama dengan PATCH rute Momen; modal layar pembuka menyimpan sampul lewat rute ini.
  for (const key of ["memoriesCoverPhoto", "openingCoverPhoto"]) {
    if (typeof merged[key] === "string") merged[key] = safeMediaUrl(merged[key]);
  }
  const labels = validateCustomLabels(merged, existing);
  if (!labels.ok) return labels;
  if (!isAdmin) merged = await gateFeaturesByPlan(merged, planType);
  return { ok: true, value: keepValidMemoriesSettings(merged, existing) };
}

/** Mematikan fitur berbayar yang tidak termasuk kapabilitas paket (tidak bisa dibuka lewat bypass API). */
async function gateFeaturesByPlan(features: FeatureSettings, planType: string | null | undefined): Promise<FeatureSettings> {
  const { hasPlanCapability } = await import("@/lib/settings");
  const gated: FeatureSettings = { ...features };
  if (gated.showQrCheckin && !(await hasPlanCapability(planType || "TIER_1", "qr_checkin"))) gated.showQrCheckin = false;
  if (gated.showGuestMemories && !(await hasPlanCapability(planType || "TIER_1", "guest_memories"))) gated.showGuestMemories = false;
  return gated;
}
