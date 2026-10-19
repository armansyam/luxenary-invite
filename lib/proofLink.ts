import crypto from "crypto";

export const PROOF_LINK_TTL_SECONDS = 5 * 60;

function proofLinkSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tidak dikonfigurasi; tautan bukti transfer tidak dapat dibuat.");
  return secret;
}

// Referensi berkas ikut ditandatangani: setelah klien mengganti bukti atau bukti dihapus, tautan lama berhenti berlaku.
function sign(orderId: string, proofRef: string, expiresAt: number): string {
  return crypto.createHmac("sha256", proofLinkSecret()).update(`proof:${orderId}:${proofRef}:${expiresAt}`).digest("hex");
}

/** Path relatif tautan bertanda tangan untuk membuka bukti transfer satu order; kedaluwarsa setelah PROOF_LINK_TTL_SECONDS. */
export function createProofLink(orderId: string, proofRef: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + PROOF_LINK_TTL_SECONDS;
  return `/api/files/proof/${encodeURIComponent(orderId)}?exp=${expiresAt}&sig=${sign(orderId, proofRef, expiresAt)}`;
}

export function verifyProofLink(orderId: string, proofRef: string, exp: string | null, sig: string | null, now = Date.now()): boolean {
  if (!exp || !sig || !/^\d{1,12}$/.test(exp)) return false;
  const expiresAt = Number(exp);
  const nowSeconds = Math.floor(now / 1000);
  // Batas atas menolak tautan berumur panjang bila TTL pernah diperpanjang lalu dikembalikan.
  if (expiresAt < nowSeconds || expiresAt > nowSeconds + PROOF_LINK_TTL_SECONDS) return false;
  const expected = sign(orderId, proofRef, expiresAt);
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
