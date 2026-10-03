import crypto from "crypto";
import { auth } from "@/auth";

const PREVIEW_TOKEN_TTL_MS = 6 * 60 * 60 * 1000;

function previewSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tidak dikonfigurasi; token pratinjau tidak dapat dibuat.");
  return secret;
}

function sign(invitationId: string, expiresAt: number): string {
  return crypto.createHmac("sha256", previewSecret()).update(`preview:${invitationId}:${expiresAt}`).digest("hex");
}

/**
 * Token pratinjau draf yang dapat dipakai lintas host (subdomain/custom domain), karena cookie sesi hanya berlaku
 * pada host tempat login. Terikat ke satu undangan dan kedaluwarsa otomatis.
 */
export function createPreviewToken(invitationId: string, now = Date.now()): string {
  const expiresAt = now + PREVIEW_TOKEN_TTL_MS;
  return `${expiresAt}.${sign(invitationId, expiresAt)}`;
}

export function verifyPreviewToken(invitationId: string, token: string, now = Date.now()): boolean {
  const [expRaw, signature] = token.split(".");
  const expiresAt = Number(expRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < now) return false;
  const expected = sign(invitationId, expiresAt);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * `?preview=` menampilkan draf yang belum terbit, sehingga hanya sah bila:
 * - berisi token pratinjau valid untuk undangan ini, atau
 * - bernilai `true` dan sesi saat ini milik pemilik undangan atau admin (host yang sama dengan login).
 */
export async function canPreviewInvitation(
  invitation: { id: string; userId: string },
  previewParam: string | null
): Promise<boolean> {
  if (!previewParam) return false;
  if (previewParam !== "true") return verifyPreviewToken(invitation.id, previewParam);

  const session = await auth();
  const user = session?.user;
  if (!user) return false;
  return user.id === invitation.userId || user.isAdmin === true;
}
