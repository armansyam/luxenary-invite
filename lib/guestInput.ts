import { RSVP_NAME_MAX } from "@/lib/rsvpStatus";

/** Batas jatah orang per tamu; angka di atasnya meluap kolom Int database atau tidak masuk akal untuk satu undangan. */
export const GUEST_QUOTA_MAX = 100;

const FIELD_MAX = { phone: 20, category: 50, sessionInfo: 100, tableNumber: 30 } as const;

/** Teks opsional dari isian klien: angka diterima sebagai teks, selain teks/angka menjadi null, dipangkas ke `max`. */
function optionalText(value: unknown, max: number): string | null {
  const raw = typeof value === "number" && Number.isFinite(value) ? String(value) : value;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Jatah orang per tamu: bilangan bulat 1..GUEST_QUOTA_MAX; selain itu memakai `fallback`. */
export function guestQuotaFrom(value: unknown, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, GUEST_QUOTA_MAX);
}

/** Nama tamu: teks 1..RSVP_NAME_MAX karakter setelah dipangkas; null bila tidak sah. */
export function cleanGuestName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= RSVP_NAME_MAX ? trimmed : null;
}

export function cleanGuestTextFields(input: { phone?: unknown; category?: unknown; sessionInfo?: unknown; tableNumber?: unknown }) {
  return {
    phone: optionalText(input.phone, FIELD_MAX.phone),
    category: optionalText(input.category, FIELD_MAX.category),
    sessionInfo: optionalText(input.sessionInfo, FIELD_MAX.sessionInfo),
    tableNumber: optionalText(input.tableNumber, FIELD_MAX.tableNumber),
  };
}
