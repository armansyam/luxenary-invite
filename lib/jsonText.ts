export type JsonText = { ok: true; value: string | null } | { ok: false };

/**
 * Menyiapkan nilai untuk kolom teks yang berisi JSON (participantsJson, loveStory, bankAccounts).
 * Objek diserialisasi, nilai kosong menjadi NULL, dan string yang bukan JSON ditolak; CHECK di database
 * menolak hal yang sama, jadi penolakan di sini mengubah galat 500 menjadi 400.
 */
export function normalizeJsonText(value: unknown): JsonText {
  if (value === null || value === undefined || value === "") return { ok: true, value: null };
  if (typeof value !== "string") return { ok: true, value: JSON.stringify(value) };
  try {
    JSON.parse(value);
  } catch {
    return { ok: false };
  }
  return { ok: true, value };
}
