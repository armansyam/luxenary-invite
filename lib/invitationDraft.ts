import type { EventType } from "@prisma/client";
import { prisma } from "./prisma";

export interface InvitationDraftRow {
  themeId: string;
  eventType: EventType;
  html: string;
}

export function normalizeDraftEventType(value: string | null | undefined): EventType {
  const upper = String(value || "").trim().toUpperCase();
  if (upper === "PERSONAL" || upper === "EVENT") return upper;
  return "WEDDING";
}

export async function readInvitationDraft(invitationId: string): Promise<InvitationDraftRow | null> {
  return prisma.invitationDraft.findUnique({ where: { invitationId }, select: { themeId: true, eventType: true, html: true } });
}

/**
 * Menyimpan piring hanya bila undangan belum punya piring, lalu mengembalikan piring yang tersimpan. Dua server yang
 * merender undangan yang sama bersamaan akhirnya memakai piring yang sama, bukan saling menimpa.
 */
export async function createInvitationDraft(
  invitationId: string,
  draft: { themeId: string; eventType: string; html: string },
): Promise<InvitationDraftRow> {
  const eventType = normalizeDraftEventType(draft.eventType);
  await prisma.invitationDraft.createMany({ data: [{ invitationId, themeId: draft.themeId, eventType, html: draft.html }], skipDuplicates: true });
  return prisma.invitationDraft.findUniqueOrThrow({ where: { invitationId }, select: { themeId: true, eventType: true, html: true } });
}

/** Menghapus piring hanya bila masih untuk tema dan jenis acara itu, agar piring baru buatan server lain tidak ikut terhapus. */
export async function deleteStaleInvitationDraft(invitationId: string, stale: { themeId: string; eventType: string }): Promise<void> {
  const eventType = normalizeDraftEventType(stale.eventType);
  await prisma.invitationDraft.deleteMany({ where: { invitationId, themeId: stale.themeId, eventType } });
}

export async function deleteInvitationDraft(invitationId: string): Promise<void> {
  await prisma.invitationDraft.deleteMany({ where: { invitationId } });
}
