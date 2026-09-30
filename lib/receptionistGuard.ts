import { prisma } from "@/lib/prisma";
import { verifyReceptionistToken } from "@/lib/receptionistAuth";

export const RECEPTIONIST_TOKEN_HEADER = "x-receptionist-token";

/** Token dikirim lewat header khusus atau `Authorization: Bearer <token>`. */
export function readReceptionistToken(headers: Headers): string {
  const direct = headers.get(RECEPTIONIST_TOKEN_HEADER);
  if (direct) return direct.trim();
  const bearer = headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) return bearer.slice(7).trim();
  return "";
}

/**
 * Memverifikasi token sesi resepsionis terhadap PIN undangan yang tersimpan saat ini.
 * Mengembalikan false untuk undangan yang tidak ada, PIN belum diatur, token salah, atau kedaluwarsa.
 */
export async function isReceptionistAuthorized(
  invitationId: string,
  token: string
): Promise<boolean> {
  if (!invitationId || !token) return false;
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { staffPin: true },
  });
  return verifyReceptionistToken(token, invitationId, invitation?.staffPin);
}
