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
