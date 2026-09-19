import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";
import { getAdminSetting, getPlanMemoriesQuota, hasPlanCapability } from "@/lib/settings";
import { getMemoriesActiveSchedule } from "@/lib/domainUtils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subdomain: string }>;
  searchParams?: Promise<{ test?: string; to?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const [invitation, platformName] = await Promise.all([
    prisma.invitation.findUnique({ where: { subdomain } }),
    getAdminSetting("platform_name", "Platform Undangan"),
  ]);

  if (!invitation) return {};

  const coupleName = `${invitation.groomNickname || "Pria"} & ${invitation.brideNickname || "Wanita"}`;
  return {
    title: `Guest Moment — ${coupleName} | ${platformName}`,
    description: `Bagikan foto candid Anda secara real-time di pernikahan ${coupleName}.`,
  };
}

export default async function GuestMemoriesStandalonePage({ params, searchParams }: PageProps) {
  const { subdomain } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isTestMode = sParams.test === "true";

  const invitation = await prisma.invitation.findUnique({
    where: { subdomain },
    include: {
      order: { select: { planType: true } },
      guestMemories: {
        orderBy: { createdAt: "desc" },
      },
      media: {
        where: { mediaSlot: { in: ["LANDING_COVER", "HOME_PHOTO", "GROOM_PHOTO", "BRIDE_PHOTO", "GALLERY"] } },
        take: 5,
      }
    },
  });

  if (!invitation) {
    notFound();
  }

  // Cek kapabilitas guest_memories secara dinamis berdasarkan konfigurasi admin
  const canAccessMemories = await hasPlanCapability(invitation.order?.planType, "guest_memories");
  if (!canAccessMemories) {
    redirect(`/s/${subdomain}`);
  }

  const memories: any[] = invitation.guestMemories || [];
  const coupleName = `${invitation.groomNickname || "Mempelai Pria"} & ${invitation.brideNickname || "Mempelai Wanita"}`;
  
  // Parse featureSettings terlebih dahulu untuk membaca custom memoriesCoverPhoto
  const fs = (() => {
    try {
      return typeof invitation.featureSettings === "object"
        ? invitation.featureSettings
        : JSON.parse(invitation.featureSettings || "{}");
    } catch {
      return {};
    }
  })();

  const coverMedia = invitation.media && invitation.media.length > 0 ? invitation.media[0] : null;
  const coverUrl = fs.memoriesCoverPhoto || coverMedia?.localPath || undefined;

  const backUrl = `/s/${invitation.subdomain!}`;
  const galleryUrl = `/s/${invitation.subdomain!}/memories`;

  const distinctContributors = await prisma.guestMemory.findMany({
    where: { invitationId: invitation.id },
    select: { senderEmail: true },
    distinct: ["senderEmail"],
  });
  const currentContributorsCount = distinctContributors.length;

  const filterId: string = fs.memoriesFilter || "aura_90s";
  const dateStampEnabled: boolean = fs.memoriesDateStamp !== false;
  const dateFormat: string = fs.memoriesDateFormat || "DD MM 'YY";
  const configuredShotsQuota: number = typeof fs.memoriesShotsQuota === "number" ? fs.memoriesShotsQuota : 5;
  const maxContributors: number = typeof fs.memoriesMaxContributors === "number" ? fs.memoriesMaxContributors : 100;

  // Hitung Kuota Total Acara & Sisa Pool Riil
  const planQuota = await getPlanMemoriesQuota(invitation.order?.planType);
  const extraPhotos = typeof fs.extraMemoriesQuota === "number" ? Math.max(0, fs.extraMemoriesQuota) : 0;
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
  const isAllFinished = schedule.isAllFinished || invitation.status === "EVENT_FINISHED" || invitation.status === "ARCHIVED";
  const nextSessionIso = schedule.nextSession ? `${schedule.nextSession.date}T${schedule.nextSession.startTime}:00` : null;

  return (
    <GuestMomentClient 
      invitationId={invitation.id}
      coupleName={coupleName}
      coverUrl={coverUrl}
      memories={memories}
      galleryUrl={galleryUrl}
      backUrl={backUrl}
      isUploadLocked={invitation.memoriesUploadLocked}
      startTime={schedule.startTime ? schedule.startTime.toISOString() : null}
      endTime={schedule.endTime ? schedule.endTime.toISOString() : null}
      filterId={filterId}
      shotsQuota={effectiveShotsQuota}
      maxContributors={maxContributors}
      currentContributorsCount={currentContributorsCount}
      isContributorLimitReached={isContributorLimitReached}
      dateStampEnabled={dateStampEnabled}
      dateFormat={dateFormat}
      isTestMode={isTestMode}
      openingLayout={fs.memoriesOpeningLayout || "editorial_showcase"}
      currentSessionName={schedule.currentSession?.name || null}
      nextSessionName={schedule.nextSession?.name || null}
      nextSessionStartTime={nextSessionIso}
      isSessionActive={schedule.isSessionActive}
      isAllFinished={isAllFinished}
    />
  );
}
