import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: { subdomain },
  });

  if (!invitation) return {};

  const coupleName = `${invitation.groomNickname || "Pria"} & ${invitation.brideNickname || "Wanita"}`;
  return {
    title: `Guest Moment — ${coupleName} | Luxenary Invite`,
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
  const coupleName = `${invitation.groomNickname || "Didan"} & ${invitation.brideNickname || "Nasha"}`;
  
  const coverMedia = invitation.media && invitation.media.length > 0 ? invitation.media[0] : null;
  const coverUrl = coverMedia?.driveViewUrl || undefined;

  return (
    <GuestMomentClient 
      invitationId={invitation.id}
      subdomain={invitation.subdomain!}
      coupleName={coupleName}
      coverUrl={coverUrl}
      memories={memories}
    />
  );
}
