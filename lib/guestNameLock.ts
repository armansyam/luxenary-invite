import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Nama tamu unik per undangan tanpa membedakan huruf besar/kecil (QR, RSVP, dan resepsionis mencocokkan nama).
 * Pemeriksaan nama kembar lalu penulisan dijalankan di bawah kunci per undangan: tanpa kunci, dua permintaan
 * bersamaan (klik ganda "Tambah", impor ganda) sama-sama lolos pemeriksaan dan menyimpan dua baris bernama sama.
 */
export function withGuestNameLock<T>(invitationId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`guest_names:${invitationId}`}))`;
    return fn(tx);
  }, { timeout: 20_000 });
}
