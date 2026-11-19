import { BoundedMemoryCache } from "@/lib/cache";

const RSVP_LIST_TTL_MS = 15_000;

export const rsvpListCache = new BoundedMemoryCache<{ success: true; rsvps: unknown[] }>(
  2000,
  RSVP_LIST_TTL_MS,
);

/** Hapus cache daftar ucapan publik saat tamu mengirim RSVP baru atau klien memoderasi/membalas ucapan. */
export function invalidateRsvpListCache(invitationId?: string | null): void {
  if (!invitationId) return;
  rsvpListCache.delete(invitationId);
}
