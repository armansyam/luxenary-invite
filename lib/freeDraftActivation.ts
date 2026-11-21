import { prisma } from "@/lib/prisma";
import { deleteInvitationDraft } from "@/lib/invitationDraft";
import { getMonthYearSlug, isReservedSlug, isReservedSubdomain } from "@/lib/domainUtils";
import { getPrimaryEventDateString, normalizeEventDateInput } from "@/lib/lifecycleDates";
import { participantNames } from "@/lib/participantUtils";
import { resolveSubEventMeta } from "@/lib/invitationUtils";
import { invalidateInvitationLookup } from "@/lib/cache";
import { logger } from "@/lib/logger";

const FREE_DRAFT_SLUG_RE = /^draf-[0-9a-f]{8}$/i;

function slugifySegment(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isPlaceholderFreeDraftSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && FREE_DRAFT_SLUG_RE.test(slug.trim()));
}

/**
 * Membangun invitationSlug kanonikal permanen dari nama peserta & tanggal acara utama jika draf masih memakai
 * slug sementara `draf-xxxxxxxx` dan nama peserta sudah diisi. Mengembalikan null jika nama peserta masih kosong.
 */
export async function buildCanonicalSlugForActivatedDraft(input: {
  invitationId: string;
  eventType: string;
  subEvent?: string | null;
  participantsJson: unknown;
  eventData: unknown;
}): Promise<string | null> {
  const { first, second } = participantNames(input.eventType, input.participantsJson);
  const firstSlug = slugifySegment(first);
  const secondSlug = slugifySegment(second);

  if (input.eventType === "WEDDING" && !firstSlug && !secondSlug) return null;
  if (input.eventType !== "WEDDING" && !firstSlug) return null;

  const rawPrimaryDate = getPrimaryEventDateString(input.eventData);
  const effectiveDate = rawPrimaryDate ? normalizeEventDateInput(rawPrimaryDate) : "";
  let dateSegment = "";
  if (effectiveDate) {
    const d = new Date(effectiveDate);
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      dateSegment = `${dd}${mm}${yy}`;
    } else {
      dateSegment = getMonthYearSlug(effectiveDate);
    }
  }

  const withDate = (base: string) => `${base}${dateSegment ? `-${dateSegment}` : ""}`;
  let candidateBase = "";
  if (input.eventType === "WEDDING") {
    candidateBase = withDate(`${firstSlug || "mempelai"}-${secondSlug || "mempelai"}`);
  } else if (input.eventType === "EVENT") {
    candidateBase = withDate(firstSlug || "acara");
  } else {
    const suffix = resolveSubEventMeta("PERSONAL", input.subEvent).slugSuffix || "acara";
    candidateBase = withDate(`${firstSlug}-${suffix}`);
  }

  const randomSuffix = Date.now().toString(36).slice(-4);
  const baseSlug = isReservedSlug(candidateBase) ? `${candidateBase}-${randomSuffix}` : candidateBase;
  const existing = await prisma.invitation.findUnique({
    where: { invitationSlug: baseSlug },
    select: { id: true },
  });
  if (!existing || existing.id === input.invitationId) {
    return baseSlug;
  }
  return `${baseSlug}-${randomSuffix}`;
}

export async function deriveInitialWeddingSubdomain(
  invitationId: string,
  participantsJson: unknown,
): Promise<string | null> {
  const { first, second } = participantNames("WEDDING", participantsJson);
  const groomPart = first.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bridePart = second.toLowerCase().replace(/[^a-z0-9]/g, "");
  const derived = groomPart && bridePart ? `${groomPart}-${bridePart}` : "";
  if (!derived || derived.length < 3 || isReservedSubdomain(derived)) return null;
  const holder = await prisma.invitation.findUnique({
    where: { subdomain: derived },
    select: { id: true },
  });
  return holder && holder.id !== invitationId
    ? `${derived}-${Date.now().toString(36).slice(-4)}`
    : derived;
}

/**
 * Mengaktifkan draf gratis milik pengguna menjadi undangan berbayar ketika order paket dasar (NEW) lunas.
 * Berjalan idempoten dan aman dari race condition: hanya draf dengan `isFreeDraft: true` dan `orderId: null`
 * yang dikaitkan ke order lunas, lalu slug sementara `draf-xxxxxxxx` & subdomain awal diselaraskan bila nama peserta
 * sudah diisi selama masa uji coba.
 */
export async function activateFreeDraftForOrder(
  orderId: string,
  userId: string,
): Promise<string | null> {
  if (!orderId || !userId) return null;

  const freeDraft = await prisma.invitation.findFirst({
    where: {
      userId,
      isFreeDraft: true,
      orderId: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      eventType: true,
      subEvent: true,
      participantsJson: true,
      eventData: true,
      invitationSlug: true,
      subdomain: true,
    },
  });

  if (!freeDraft) return null;

  const upgradedSlug = isPlaceholderFreeDraftSlug(freeDraft.invitationSlug)
    ? await buildCanonicalSlugForActivatedDraft({
        invitationId: freeDraft.id,
        eventType: freeDraft.eventType,
        subEvent: freeDraft.subEvent,
        participantsJson: freeDraft.participantsJson,
        eventData: freeDraft.eventData,
      })
    : null;

  const derivedSubdomain =
    !freeDraft.subdomain && freeDraft.eventType === "WEDDING"
      ? await deriveInitialWeddingSubdomain(freeDraft.id, freeDraft.participantsJson)
      : null;

  const claimed = await prisma.invitation.updateMany({
    where: {
      id: freeDraft.id,
      userId,
      isFreeDraft: true,
      orderId: null,
    },
    data: {
      isFreeDraft: false,
      orderId,
      ...(upgradedSlug ? { invitationSlug: upgradedSlug } : {}),
      ...(derivedSubdomain ? { subdomain: derivedSubdomain } : {}),
    },
  });

  if (claimed.count === 0) return null;

  invalidateInvitationLookup(freeDraft.invitationSlug, freeDraft.subdomain, freeDraft.id);
  if (upgradedSlug || derivedSubdomain) {
    invalidateInvitationLookup(upgradedSlug ?? freeDraft.invitationSlug, derivedSubdomain ?? freeDraft.subdomain, freeDraft.id);
  }

  await deleteInvitationDraft(freeDraft.id).catch((err) => {
    logger.warn("FreeDraftActivation", "Gagal menghapus cache HTML draf setelah aktivasi", {
      invitationId: freeDraft.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return freeDraft.id;
}
