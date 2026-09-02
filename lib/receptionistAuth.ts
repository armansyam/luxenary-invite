import crypto from "crypto";

export function generateReceptionistToken(invitationId: string): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "default_fallback_secret_for_dev";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`receptionist:${invitationId}`);
  const hash = hmac.digest("hex");
  return `rcpt_${invitationId}_${hash}`;
}

export function verifyReceptionistToken(token: string, invitationId: string): boolean {
  if (!token || !token.startsWith("rcpt_")) return false;
  
  const expectedToken = generateReceptionistToken(invitationId);
  // Gunakan timingSafeEqual untuk mencegah timing attack, meski dalam konteks ini kurang kritikal
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch (e) {
    return token === expectedToken;
  }
}
