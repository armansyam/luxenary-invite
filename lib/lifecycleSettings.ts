import { getAdminSetting } from "./settings";
import { parseLifecycleSettings, type LifecycleSettings } from "./lifecycleDates";

const LIFECYCLE_SETTING_KEYS = [
  "subdomain_grace_days",
  "retention_cleanup_days",
  "nas_archive_retention_days",
  "retention_custom_domain_days",
  "subdomain_auto_recycle",
] as const;

/** Pengaturan siklus hidup dari Admin Setting (server saja); parsing dan bawaan ada di lifecycleDates. */
export async function getLifecycleSettings(): Promise<LifecycleSettings> {
  const entries = await Promise.all(
    LIFECYCLE_SETTING_KEYS.map(async (key) => [key, await getAdminSetting(key, "")] as const)
  );
  const map: Record<string, string | undefined> = Object.fromEntries(entries);
  if (!map["nas_archive_retention_days"]) {
    map["nas_archive_retention_days"] = process.env.NAS_ARCHIVE_RETENTION_DAYS;
  }
  return parseLifecycleSettings(map);
}
