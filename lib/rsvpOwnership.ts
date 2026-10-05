import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const RSVP_COOKIE_PATH = "/api/public/rsvp";
export const RSVP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Satu cookie per (undangan, nama) agar satu perangkat dapat mengirim RSVP untuk beberapa anggota keluarga. */
export function rsvpCookieName(invitationId: string, guestName: string): string {
  return `lux_rsvp_${sha256Hex(`${invitationId}:${guestName.trim().toLowerCase()}`).slice(0, 24)}`;
}

export function createRsvpEditToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: sha256Hex(token) };
}

export function rsvpEditTokenMatches(token: string | undefined, storedHash: string | null): boolean {
  if (!token || !storedHash) return false;
  const candidate = Buffer.from(sha256Hex(token));
  const stored = Buffer.from(storedHash);
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}
