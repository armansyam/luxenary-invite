import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";
import { getAdminSetting, hasPlanCapability } from "@/lib/settings";
import { getMemoriesActiveSchedule } from "@/lib/domainUtils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ test?: string; to?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [invitation, platformName] = await Promise.all([
    prisma.invitation.findUnique({ where: { invitationSlug: slug } }),
    getAdminSetting("platform_name", "Platform Undangan"),
  ]);

  if (!invitation) return {};

  const coupleName = `${invitation.groomNickname || "Pria"} & ${invitation.brideNickname || "Wanita"}`;
  return {
    title: `Kamera Momen — ${coupleName} | ${platformName}`,
    description: `Abadikan momen candid penuh kebahagiaan di pernikahan ${coupleName}.`,
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
      guestMemories: {
        orderBy: { createdAt: "desc" },
      },
      media: {
        where: { mediaSlot: "LANDING_COVER" },
        take: 1,
      },
    },
  });

  if (!invitation) {
    notFound();
  }

  // Cek kapabilitas guest_memories secara dinamis berdasarkan konfigurasi admin
  const canAccessMemories = await hasPlanCapability(invitation.order?.planType, "guest_memories");
  if (!canAccessMemories) {
    redirect(`/${slug}`);
  }

  const memories: any[] = invitation.guestMemories || [];
  const coupleName = `${invitation.groomNickname || "Mempelai Pria"} & ${invitation.brideNickname || "Mempelai Wanita"}`;

  const coverMedia = invitation.media && invitation.media.length > 0 ? invitation.media[0] : null;
  const coverUrl = coverMedia?.localPath || undefined;

  const backUrl = `/${slug}`;
  const galleryUrl = `/${slug}/memories`;

  // Parse featureSettings
  const fs = (() => {
    try {
      return typeof invitation.featureSettings === "object"
        ? invitation.featureSettings
        : JSON.parse(invitation.featureSettings || "{}");
    } catch {
      return {};
    }
  })();

  const distinctContributors = await prisma.guestMemory.findMany({
    where: { invitationId: invitation.id },
    select: { senderEmail: true },
    distinct: ["senderEmail"],
  });
  const currentContributorsCount = distinctContributors.length;

  const filterId: string = fs.memoriesFilter || "aura_90s";
  const dateStampEnabled: boolean = fs.memoriesDateStamp !== false;
  const dateFormat: string = fs.memoriesDateFormat || "DD MM 'YY";
  const shotsQuota: number = typeof fs.memoriesShotsQuota === "number" ? fs.memoriesShotsQuota : 5;
  const maxContributors: number = typeof fs.memoriesMaxContributors === "number" ? fs.memoriesMaxContributors : 100;
  const isContributorLimitReached = maxContributors > 0 && currentContributorsCount >= maxContributors;
  const { startTime, endTime } = getMemoriesActiveSchedule(invitation.featureSettings, invitation.eventData);

  return (
    <GuestMomentClient
      invitationId={invitation.id}
      coupleName={coupleName}
      coverUrl={coverUrl}
      memories={memories}
      galleryUrl={galleryUrl}
      backUrl={backUrl}
      isUploadLocked={invitation.memoriesUploadLocked}
      startTime={startTime ? startTime.toISOString() : null}
      endTime={endTime ? endTime.toISOString() : null}
      filterId={filterId}
      shotsQuota={shotsQuota}
      maxContributors={maxContributors}
      currentContributorsCount={currentContributorsCount}
      isContributorLimitReached={isContributorLimitReached}
      dateStampEnabled={dateStampEnabled}
      dateFormat={dateFormat}
      isTestMode={isTestMode}
    />
  );
}
