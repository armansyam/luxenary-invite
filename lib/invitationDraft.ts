import { prisma } from "./prisma";

export interface InvitationDraftRow {
  themeId: string;
  eventType: string;
  html: string;
}

export async function readInvitationDraft(invitationId: string): Promise<InvitationDraftRow | null> {
  return prisma.invitationDraft.findUnique({ where: { invitationId }, select: { themeId: true, eventType: true, html: true } });
}

/**
 * Menyimpan piring hanya bila undangan belum punya piring, lalu mengembalikan piring yang tersimpan. Dua server yang
 * merender undangan yang sama bersamaan akhirnya memakai piring yang sama, bukan saling menimpa.
 */
export async function createInvitationDraft(invitationId: string, draft: InvitationDraftRow): Promise<InvitationDraftRow> {
  await prisma.invitationDraft.createMany({ data: [{ invitationId, ...draft }], skipDuplicates: true });
  return prisma.invitationDraft.findUniqueOrThrow({ where: { invitationId }, select: { themeId: true, eventType: true, html: true } });
}

/** Menghapus piring hanya bila masih untuk tema dan jenis acara itu, agar piring baru buatan server lain tidak ikut terhapus. */
export async function deleteStaleInvitationDraft(invitationId: string, stale: { themeId: string; eventType: string }): Promise<void> {
  await prisma.invitationDraft.deleteMany({ where: { invitationId, themeId: stale.themeId, eventType: stale.eventType } });
}

export async function deleteInvitationDraft(invitationId: string): Promise<void> {
  await prisma.invitationDraft.deleteMany({ where: { invitationId } });
}
