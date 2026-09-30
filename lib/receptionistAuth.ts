import crypto from "crypto";

const TOKEN_PREFIX = "rcpt_";
export const RECEPTIONIST_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET atau NEXTAUTH_SECRET wajib diset untuk menandatangani token resepsionis.");
  }
  return secret;
}

/** Sidik jari PIN tersimpan: token lama otomatis tidak valid ketika PIN diganti. */
function pinFingerprint(storedPin: string): string {
  return crypto.createHash("sha256").update(storedPin).digest("hex").slice(0, 16);
}

function sign(invitationId: string, expiresAt: number, storedPin: string): string {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(`receptionist:${invitationId}:${expiresAt}:${pinFingerprint(storedPin)}`)
    .digest("hex");
}

/**
 * Format: rcpt_<invitationId>_<expiresAtMs>_<hmacHex>
 * `storedPin` adalah nilai `Invitation.staffPin` (terenkripsi) saat ini.
 */
export function generateReceptionistToken(
  invitationId: string,
  storedPin: string,
  now: number = Date.now()
): string {
  const expiresAt = now + RECEPTIONIST_TOKEN_TTL_MS;
  return `${TOKEN_PREFIX}${invitationId}_${expiresAt}_${sign(invitationId, expiresAt, storedPin)}`;
}

export function verifyReceptionistToken(
  token: string,
  invitationId: string,
  storedPin: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!token || !invitationId || !storedPin) return false;
  const prefix = `${TOKEN_PREFIX}${invitationId}_`;
  if (!token.startsWith(prefix)) return false;

  const [expiresRaw, signature, ...rest] = token.slice(prefix.length).split("_");
  if (rest.length > 0 || !expiresRaw || !signature) return false;

  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt) || expiresAt <= now) return false;

  const expected = Buffer.from(sign(invitationId, expiresAt, storedPin), "hex");
  const provided = Buffer.from(signature, "hex");
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}
