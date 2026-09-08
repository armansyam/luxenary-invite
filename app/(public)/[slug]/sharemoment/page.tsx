import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";
import { getAdminSetting, hasPlanCapability } from "@/lib/settings";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
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
    title: `Upload Momen — ${coupleName} | ${platformName}`,
    description: `Bagikan foto candid dan ucapan Anda secara real-time di pernikahan ${coupleName}.`,
  };
}

export default async function FreeGuestMemoriesStandalonePage({ params }: PageProps) {
  const { slug } = await params;

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

  return (
    <GuestMomentClient
      invitationId={invitation.id}
      coupleName={coupleName}
      coverUrl={coverUrl}
      memories={memories}
      galleryUrl={galleryUrl}
      backUrl={backUrl}
      isUploadLocked={invitation.memoriesUploadLocked}
    />
  );
}
