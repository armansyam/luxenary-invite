/**
 * Logika murni pemindai resepsionis: memutuskan hasil sebuah scan dan menggabungkan daftar tamu dari server
 * dengan check-in yang belum tersinkron. Dipisah dari komponen agar dapat diuji tanpa browser.
 */
import { buildCheckinPayload, parseCheckinPayload, sanitizeGuestLabel } from "./checkinQr";

export interface ScanGuest {
  id: string;
  name: string;
  category: string | null;
  guestQuota: number;
  tableNumber: string | null;
  qrToken: string | null;
  isTokenRedeemed: boolean;
}

export type ScanResolution<G extends ScanGuest> =
  | { kind: "match"; guest: G }
  /** QR sah untuk acara ini tetapi namanya tidak ada di daftar: tamu umum. */
  | { kind: "walkin"; name: string }
  /** QR milik acara lain. */
  | { kind: "wrong-event" }
  /** Payload QR rusak (tanpa nama). */
  | { kind: "invalid" }
  /** Teks yang diketik cocok dengan lebih dari satu tamu. */
  | { kind: "ambiguous"; names: string[] }
  /** Teks yang diketik tidak ada di daftar; petugas memutuskan apakah dicatat sebagai tamu umum. */
  | { kind: "unknown"; name: string };

function normalizeName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("id-ID").replace(/\s+/g, " ").trim();
}

export function resolveScan<G extends ScanGuest>(rawInput: string, guests: G[], invitationId: string): ScanResolution<G> {
  const input = rawInput.trim();

  const parsed = parseCheckinPayload(input);
  if (parsed) {
    if (parsed.invitationId !== invitationId) return { kind: "wrong-event" };
    if (!parsed.name) return { kind: "invalid" };
    const target = normalizeName(parsed.name);
    const found = guests.find((g) => g.qrToken === input) ?? guests.find((g) => normalizeName(g.name) === target);
    return found ? { kind: "match", guest: found } : { kind: "walkin", name: parsed.name };
  }

  const byToken = guests.find((g) => g.qrToken === input);
  if (byToken) return { kind: "match", guest: byToken };

  const needle = normalizeName(input);
  const exact = guests.find((g) => normalizeName(g.name) === needle);
  if (exact) return { kind: "match", guest: exact };

  const partial = guests.filter((g) => normalizeName(g.name).includes(needle));
  if (partial.length === 1) return { kind: "match", guest: partial[0] };
  if (partial.length > 1) return { kind: "ambiguous", names: partial.slice(0, 5).map((g) => g.name) };

  return { kind: "unknown", name: sanitizeGuestLabel(input) };
}

/** Nama untuk tamu umum yang namanya kembar dengan tamu lain: "Budi (2)", "Budi (3)", dan seterusnya. */
export function nextDuplicateName(originalName: string, guests: ScanGuest[]): string {
  const base = sanitizeGuestLabel(originalName);
  const count = guests.filter((g) => normalizeName(g.name).startsWith(normalizeName(base))).length;
  return `${base} (${count + 1})`;
}

/** Token yang dikirim ke server saat sinkronisasi: token tamu terdaftar, atau payload `LUX|` untuk tamu umum. */
export function syncTokenFor(guest: ScanGuest, invitationId: string): string {
  return guest.qrToken || buildCheckinPayload(invitationId, guest.name);
}

/** Tamu yang dibuat di tempat (belum atau baru saja tersinkron): id lokal atau token tamu langsung. */
export function isWalkInGuest(guest: ScanGuest): boolean {
  return guest.id.startsWith("local-") || Boolean(guest.qrToken?.startsWith("OTS-")) || Boolean(guest.qrToken?.startsWith("LUX|"));
}

/**
 * Menggabungkan daftar dari server dengan keadaan perangkat: status hadir yang belum tersinkron dipertahankan,
 * dan tamu umum buatan perangkat yang masih mengantre ikut dipertahankan, sehingga muat ulang daftar dari
 * server tidak menghilangkan check-in yang belum terkirim.
 */
export function mergeServerGuests<G extends ScanGuest>(server: G[], local: G[], pendingIds: string[]): G[] {
  const redeemedLocally = new Set(local.filter((g) => g.isTokenRedeemed).map((g) => g.id));
  const pending = new Set(pendingIds);
  const serverIds = new Set(server.map((g) => g.id));
  const merged = server.map((g) => (redeemedLocally.has(g.id) && !g.isTokenRedeemed ? { ...g, isTokenRedeemed: true } : g));
  const localOnly = local.filter((g) => !serverIds.has(g.id) && pending.has(g.id));
  return [...localOnly, ...merged];
}
