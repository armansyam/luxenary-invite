import { WEDDING_PARTICIPANT_FIELDS } from "@/lib/participantUtils";

/**
 * Kunci `data-lux-field` yang punya tempat simpan di Studio. Editor pratinjau hanya membuat elemen dengan kunci ini
 * dapat disunting; kunci lain (nilai turunan seperti tanggal terformat atau nama orang tua gabungan) dulu dapat diketik
 * tetapi hilang saat disimpan.
 */
export const LIVE_EDIT_FIELD_PATTERN = `^(${[
  "customLabels\\.[A-Za-z0-9_]+",
  "events\\.\\d+\\.(title|time|location|address)",
  "stories\\.\\d+\\.(title|content)",
  "bankAccounts\\.\\d+\\.[A-Za-z]+",
  "openingQuote",
  "openingQuoteRef",
  "weddingTagline",
  ...Object.keys(WEDDING_PARTICIPANT_FIELDS),
].join("|")})$`;

const LIVE_EDIT_FIELD_RE = new RegExp(LIVE_EDIT_FIELD_PATTERN);

export function isLiveEditField(field: string): boolean {
  return LIVE_EDIT_FIELD_RE.test(field);
}

/** Kunci live edit yang disimpan di `featureSettings`, bukan kolom undangan. */
export const FEATURE_SETTING_LIVE_FIELDS = new Set(["weddingTagline"]);
