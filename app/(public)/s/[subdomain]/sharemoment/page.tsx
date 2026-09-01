import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";
import { getAdminSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subdomain: string }>;
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
    description: `Bagikan foto candid dan video ucapan Anda secara real-time di pernikahan ${coupleName}.`,
  };
}

export default async function GuestMemoriesStandalonePage({ params }: PageProps) {
  const { subdomain } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { subdomain },
    include: {
      guestMemories: {
        orderBy: { createdAt: "desc" },
      },
      media: {
        where: { mediaSlot: "LANDING_COVER" },
        take: 1
      }
    },
  });

  if (!invitation) {
    notFound();
  }

  let memories: any[] = invitation.guestMemories || [];
  const coupleName = `${invitation.groomNickname || "Mempelai Pria"} & ${invitation.brideNickname || "Mempelai Wanita"}`;
  
  const coverMedia = invitation.media && invitation.media.length > 0 ? invitation.media[0] : null;
  const coverUrl = coverMedia?.localPath || undefined;

  const backUrl = `/s/${invitation.subdomain!}`;
  const galleryUrl = `/s/${invitation.subdomain!}/memories`;

  return (
    <GuestMomentClient 
      invitationId={invitation.id}
      coupleName={coupleName}
      coverUrl={coverUrl}
      memories={memories}
      galleryUrl={galleryUrl}
      backUrl={backUrl}
    />
  );
}
