import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ groom: string; bride: string; invitationSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groom, bride, invitationSlug } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: {
      groomSlug_brideSlug_invitationSlug: {
        groomSlug: groom,
        brideSlug: bride,
        invitationSlug: invitationSlug,
      },
    },
  });

  if (!invitation) return {};

  const coupleName = `${invitation.groomNickname || "Pria"} & ${invitation.brideNickname || "Wanita"}`;
  return {
    title: `Upload Momen — ${coupleName} | Luxenary Invite`,
    description: `Bagikan foto candid dan ucapan Anda secara real-time di pernikahan ${coupleName}.`,
  };
}

export default async function FreeGuestMemoriesStandalonePage({ params }: PageProps) {
  const { groom, bride, invitationSlug } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: {
      groomSlug_brideSlug_invitationSlug: {
        groomSlug: groom,
        brideSlug: bride,
        invitationSlug: invitationSlug,
      },
    },
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

  const backUrl = `/${groom}-${bride}/${invitationSlug}`;
  const galleryUrl = `/${groom}-${bride}/${invitationSlug}/memories`;

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
