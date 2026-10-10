import { Prisma } from "@prisma/client";

export type JsonInput = { ok: true; value: Prisma.InputJsonValue | typeof Prisma.DbNull } | { ok: false };

/**
 * Menyiapkan nilai kolom jsonb dari body permintaan. Body boleh membawa objek/array atau string JSON (editor studio
 * mengirim keduanya). Nilai kosong menjadi NULL, dan bentuk selain `shape` ditolak; CHECK di database menolak hal
 * yang sama, jadi penolakan di sini mengubah galat 500 menjadi 400.
 */
export function normalizeJsonInput(value: unknown, shape: "object" | "array"): JsonInput {
  if (value === null || value === undefined || value === "") return { ok: true, value: Prisma.DbNull };
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { ok: false };
    }
  }
  const matches = shape === "array" ? Array.isArray(parsed) : typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  return matches ? { ok: true, value: parsed as Prisma.InputJsonValue } : { ok: false };
}
