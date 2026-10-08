/**
 * Kontrak QR check-in tamu. Dibuat di halaman undangan, dibaca pemindai resepsionis, dan dicocokkan oleh
 * `POST /api/receptionist/scan`. Modul murni (tanpa impor server) karena ikut dibundel ke browser.
 *
 * Isi QR: `LUX|<id undangan>|<nama tamu>[|<kategori>]`. Id undangan mencegah QR acara lain lolos; nama tamu
 * dicocokkan dengan daftar tamu, dan nama yang tidak terdaftar dicatat sebagai tamu umum.
 */
import { safeParseParticipants } from "./participantUtils";

export const CHECKIN_PREFIX = "LUX";
export const GUEST_LABEL_MAX = 100;

/** Nama tamu aman untuk payload dan database: tanpa pemisah "|" dan karakter kontrol. */
export function sanitizeGuestLabel(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, GUEST_LABEL_MAX);
}

/**
 * Sumber fungsi yang sama untuk skrip inline di halaman undangan (tidak bisa mengimpor modul ini).
 * Dijaga sama dengan `sanitizeGuestLabel` oleh `checkinQr.test.ts`.
 */
export const SANITIZE_GUEST_LABEL_JS =
  "function(s){return String(s==null?'':s).replace(/[\\u0000-\\u001f\\u007f|]+/g,' ').replace(/\\s+/g,' ').trim().slice(0," +
  GUEST_LABEL_MAX +
  ");}";

export function buildCheckinPayload(invitationId: string, guestName: string, category?: string): string {
  const base = `${CHECKIN_PREFIX}|${invitationId}|${sanitizeGuestLabel(guestName)}`;
  const cleanCategory = category ? sanitizeGuestLabel(category) : "";
  return cleanCategory ? `${base}|${cleanCategory}` : base;
}

export interface ParsedCheckinPayload {
  invitationId: string;
  name: string;
  category: string;
}

export function parseCheckinPayload(token: string): ParsedCheckinPayload | null {
  if (typeof token !== "string" || !token.startsWith(`${CHECKIN_PREFIX}|`)) return null;
  const [, invitationId = "", name = "", category = ""] = token.split("|");
  return { invitationId, name: sanitizeGuestLabel(name), category: sanitizeGuestLabel(category) };
}

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Huruf atau angka pertama, kapital; kosong bila tidak ada. */
export function firstLetter(text: unknown): string {
  const match = String(text ?? "").match(LETTER_OR_DIGIT);
  return match ? match[0].toLocaleUpperCase("id-ID") : "";
}

/** Inisial di tengah QR dibatasi 2 karakter: ruang tengah QR hanya cukup untuk itu tanpa merusak keterbacaan. */
export function normalizeQrMark(raw: unknown): string {
  return Array.from(String(raw ?? "").toLocaleUpperCase("id-ID"))
    .filter((char) => LETTER_OR_DIGIT.test(char))
    .slice(0, 2)
    .join("");
}

interface InitialsSource {
  eventType?: string | null;
  groomName?: string | null;
  groomNickname?: string | null;
  brideName?: string | null;
  brideNickname?: string | null;
  participantsJson?: string | null;
  featureSettings?: string | Record<string, unknown> | null;
}

function parseDisplayOrder(featureSettings: InitialsSource["featureSettings"]): string {
  if (!featureSettings) return "";
  try {
    const parsed = typeof featureSettings === "string" ? JSON.parse(featureSettings) : featureSettings;
    return typeof parsed?.displayOrder === "string" ? parsed.displayOrder : "";
  } catch {
    return "";
  }
}

/**
 * Inisial acara: pernikahan 2 huruf (kedua mempelai, urutan tampil sama dengan undangan), acara tunggal
 * 1 huruf (nama utama; gathering dari judul acara). Kosong bila nama belum diisi.
 */
export function qrInitials(inv: InitialsSource): string {
  const eventType = inv.eventType || "WEDDING";

  if (eventType === "WEDDING") {
    const groom = firstLetter(inv.groomNickname || inv.groomName);
    const bride = firstLetter(inv.brideNickname || inv.brideName);
    const displayOrder = parseDisplayOrder(inv.featureSettings);
    const groomFirst = displayOrder === "GROOM_FIRST" || (!displayOrder && Boolean(inv.groomName));
    return normalizeQrMark(groomFirst ? groom + bride : bride + groom);
  }

  const p = safeParseParticipants(inv.participantsJson);
  switch (eventType) {
    case "BIRTHDAY":
    case "WISUDA":
      return firstLetter(p.person?.nickname || p.person?.name);
    case "KHITAN":
      return firstLetter(p.child?.nickname || p.child?.name);
    case "AQIQAH":
      return firstLetter(p.baby?.nickname || p.baby?.name);
    case "GATHERING":
      return firstLetter(p.event?.title);
    default:
      return "";
  }
}

/** Awalan URL gambar QR check-in; nama tamu (sudah di-encode) ditambahkan di belakangnya oleh halaman undangan. */
export function buildCheckinQrBaseUrl(invitationId: string, mark: string, size = 160): string {
  const markParam = normalizeQrMark(mark);
  return `/api/public/qr?size=${size}${markParam ? `&mark=${encodeURIComponent(markParam)}` : ""}&data=${encodeURIComponent(`${CHECKIN_PREFIX}|${invitationId}|`)}`;
}

export function buildCheckinQrUrl(invitationId: string, guestName: string, mark: string, size = 160): string {
  return buildCheckinQrBaseUrl(invitationId, mark, size) + encodeURIComponent(sanitizeGuestLabel(guestName));
}
