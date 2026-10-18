import { ExpenseCategory } from "@prisma/client";
import { safeExternalUrl } from "@/lib/safeUrl";

/** Batas kolom Decimal(12,2): nominal di atasnya membuat Prisma gagal dengan 500. */
export const MAX_FINANCE_AMOUNT = 9_999_999_999;

/** Nominal rupiah dari isian admin: bilangan terhingga lebih dari 0 dan di bawah batas kolom; null bila tidak sah. */
export function parseMoney(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_FINANCE_AMOUNT) return null;
  return Math.round(parsed * 100) / 100;
}

/** Kategori pengeluaran sesuai enum; null bila bukan nilai enum (sebelumnya nilai bebas membuat Prisma gagal dengan 500). */
export function parseExpenseCategory(value: unknown): ExpenseCategory | null {
  return typeof value === "string" && (Object.values(ExpenseCategory) as string[]).includes(value) ? (value as ExpenseCategory) : null;
}

/** Teks wajib: dipangkas, 1..max karakter; null bila bukan teks, kosong, atau terlalu panjang. */
export function requiredText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

/** Teks opsional: dipangkas dan dipotong ke `max`; null bila bukan teks atau kosong. */
export function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** URL bukti pembayaran yang akan menjadi tautan di panel admin: kosong diterima, skema selain http/https/path lokal ditolak. */
export function receiptUrlInput(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  const safe = safeExternalUrl(value);
  return safe ? { ok: true, value: safe } : { ok: false };
}
