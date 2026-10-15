import crypto from "crypto";

export const REMOTE_COOKIE_NAME = "lux_remote_client_id";
export const REMOTE_SESSION_TTL_SECONDS = 60 * 60;

function remoteSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tidak dikonfigurasi; sesi remote tidak dapat ditandatangani.");
  return secret;
}

function sign(clientId: string, adminId: string, expiresAt: number): string {
  return crypto.createHmac("sha256", remoteSecret()).update(`remote:${clientId}:${adminId}:${expiresAt}`).digest("hex");
}

/**
 * Nilai cookie sesi remote: `<clientId>.<expiresAtMs>.<hmac>`, terikat ke admin yang memulainya. Cookie yang ditulis
 * tangan (tanpa tanda tangan) atau milik admin lain tidak pernah membuka akun klien.
 */
export function createRemoteCookieValue(clientId: string, adminId: string, now = Date.now()): string {
  const expiresAt = now + REMOTE_SESSION_TTL_SECONDS * 1000;
  return `${clientId}.${expiresAt}.${sign(clientId, adminId, expiresAt)}`;
}

/** ID klien bila cookie sah untuk admin ini dan belum kedaluwarsa; selain itu null. */
export function readRemoteClientId(value: string | undefined, adminId: string, now = Date.now()): string | null {
  if (!value || !adminId) return null;
  const [clientId, expRaw, signature, ...rest] = value.split(".");
  if (!clientId || !expRaw || !signature || rest.length > 0) return null;
  const expiresAt = Number(expRaw);
  if (!Number.isInteger(expiresAt) || expiresAt <= now) return null;
  const expected = Buffer.from(sign(clientId, adminId, expiresAt), "hex");
  const provided = Buffer.from(signature, "hex");
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;
  return clientId;
}
