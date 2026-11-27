import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";
import { hasPlanCapability, getPlanMemoriesQuota } from "@/lib/settings";
import { invitationHomePath } from "@/lib/serverDomainUtils";
import { getMemoriesActiveSchedule } from "@/lib/domainUtils";
import { getEventTimezoneOffset, resolveEventTimezone } from "@/lib/lifecycleDates";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";
import { parseFeatureSettings } from "@/lib/featureSettings";
import { canPreviewInvitation } from "@/lib/previewAccess";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ test?: string; to?: string; preview?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const invitation = await prisma.invitation.findUnique({ where: { invitationSlug: slug } });

  if (!invitation || invitation.status === "TAKEN_DOWN" || invitation.status === "ARCHIVED" || invitation.status === "DRAFT") return {};

  const displayName = resolveInvitationDisplayName(invitation);
  const isWedding = !invitation.eventType || invitation.eventType === "WEDDING";
  // Nama platform ditambahkan templat judul di app/layout.tsx.
  return {
    title: `Kamera Momen — ${displayName}`,
    description: isWedding
      ? `Abadikan momen candid penuh kebahagiaan di pernikahan ${displayName}.`
      : `Abadikan momen candid penuh kebahagiaan di acara ${displayName}.`,
  };
}

export default async function FreeGuestMemoriesStandalonePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isTestMode = sParams.test === "true";

  const invitation = await prisma.invitation.findUnique({
    where: { invitationSlug: slug },
    include: {
      order: { select: { planType: true } },
      media: {
        where: { mediaSlot: { in: ["LANDING_COVER", "HOME_PHOTO", "PROFILE_PHOTO", "EVENT_PHOTO", "GROOM_PHOTO", "BRIDE_PHOTO", "GALLERY"] } },
        take: 5,
      },
    },
  });

  if (!invitation || invitation.status === "TAKEN_DOWN" || invitation.status === "ARCHIVED") {
    notFound();
  }

  // DRAFT hanya dapat dibuka oleh pemilik undangan/admin (mis. pratinjau studio ?test=true atau token ?preview=).
  if (invitation.status === "DRAFT") {
    const canPreview = await canPreviewInvitation(invitation, sParams.preview || "true");
    if (!canPreview) notFound();
  }

  const homePath = await invitationHomePath(invitation);

  // Cek kapabilitas guest_memories secara dinamis berdasarkan konfigurasi admin
  const canAccessMemories = await hasPlanCapability(invitation.order?.planType, "guest_memories");
  if (!canAccessMemories) {
    redirect(homePath);
  }

  const coupleName = resolveInvitationDisplayName(invitation);

  // Parse featureSettings terlebih dahulu untuk membaca custom memoriesCoverPhoto
  const fs = parseFeatureSettings(invitation.featureSettings);

  const coverMedia = invitation.media && invitation.media.length > 0 ? invitation.media[0] : null;
  const coverUrl = fs.memoriesCoverPhoto || coverMedia?.localPath || undefined;

  const backUrl = homePath;
  const galleryUrl = homePath === "/" ? "/memories" : `/${slug}/memories`;

  const distinctContributors = await prisma.guestMemory.findMany({
    where: { invitationId: invitation.id },
    select: { senderEmail: true },
    distinct: ["senderEmail"],
  });
  const currentContributorsCount = distinctContributors.length;

  const filterId: string = fs.memoriesFilter || "aura_90s";
  const dateStampEnabled: boolean = fs.memoriesDateStamp !== false;
  const dateFormat: string = fs.memoriesDateFormat || "DD MM 'YY";
  // Bawaan mengikuti paket, sama seperti rute unggah dan dasbor klien; angka berbeda membuat kamera tamu berhenti lebih awal.
  const planQuota = await getPlanMemoriesQuota(invitation.order?.planType);
  const configuredShotsQuota: number = typeof fs.memoriesShotsQuota === "number" ? fs.memoriesShotsQuota : planQuota.shotsQuota;
  const maxContributors: number = typeof fs.memoriesMaxContributors === "number" ? fs.memoriesMaxContributors : planQuota.maxContributors;

  // Hitung Kuota Total Acara & Sisa Pool Riil
  const extraPhotos = invitation.extraMemoriesQuota;
  const baseTotalPhotos = planQuota.totalQuota > 0 ? planQuota.totalQuota : (maxContributors * configuredShotsQuota);
  const maxTotalPhotos = baseTotalPhotos + extraPhotos;

  const totalUploaded = await prisma.guestMemory.count({
    where: { invitationId: invitation.id },
  });
  const remainingPool = Math.max(0, maxTotalPhotos - totalUploaded);
  const isPoolExhausted = maxTotalPhotos > 0 && remainingPool <= 0;
  const isContributorLimitReached = (maxContributors > 0 && currentContributorsCount >= maxContributors) || isPoolExhausted;

  // Jatah efektif tamu: tidak boleh melampaui sisa pool yang tersedia
  const effectiveShotsQuota = remainingPool > 0 ? Math.min(configuredShotsQuota, remainingPool) : configuredShotsQuota;
  const schedule = getMemoriesActiveSchedule(invitation.featureSettings, invitation.eventData);
  const isAllFinished = schedule.isAllFinished || invitation.status === "EVENT_FINISHED";
  const nextSessionIso = schedule.nextSession
    ? `${schedule.nextSession.date.includes("T") ? schedule.nextSession.date.split("T")[0] : schedule.nextSession.date}T${schedule.nextSession.startTime.slice(0, 5)}:00${getEventTimezoneOffset(resolveEventTimezone(schedule.nextSession))}`
    : null;
  const eventDateLabel = schedule.currentSession?.date || schedule.nextSession?.date || schedule.sessions[0]?.date || null;

  return (
    <GuestMomentClient
      invitationId={invitation.id}
      coupleName={coupleName}
      coverUrl={coverUrl}
      galleryUrl={galleryUrl}
      backUrl={backUrl}
      isUploadLocked={invitation.memoriesUploadLocked}
      startTime={schedule.startTime ? schedule.startTime.toISOString() : null}
      endTime={schedule.endTime ? schedule.endTime.toISOString() : null}
      filterId={filterId}
      shotsQuota={effectiveShotsQuota}
      isContributorLimitReached={isContributorLimitReached}
      dateStampEnabled={dateStampEnabled}
      dateFormat={dateFormat}
      isTestMode={isTestMode}
      openingLayout={fs.memoriesOpeningLayout || "editorial_showcase"}
      currentSessionName={schedule.currentSession?.name || null}
      nextSessionName={schedule.nextSession?.name || null}
      nextSessionStartTime={nextSessionIso}
      eventDateLabel={eventDateLabel}
      isSessionActive={schedule.isSessionActive}
      isAllFinished={isAllFinished}
      canSaveToDevice={!fs.memoriesDelayedReveal}
    />
  );
}
