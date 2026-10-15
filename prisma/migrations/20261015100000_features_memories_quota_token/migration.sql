-- Teks fitur paket menuliskan kapasitas kamera tamu sebagai angka mati (250 / 1.000) yang berbeda dari kuota yang
-- ditegakkan (memories_total_quota_tier*). Angka diganti token yang dirender dari kuota berlaku (lib/settings.ts).
UPDATE "admin_settings"
SET "value" = regexp_replace("value", 'Kapasitas Total [0-9.]+ Foto', 'Kapasitas Total {{memoriesQuota}} Foto', 'g')
WHERE "key" IN ('features_tier1', 'features_tier2', 'features_tier3');
