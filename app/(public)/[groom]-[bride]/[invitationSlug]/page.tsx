import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateInvitationMetadata } from "@/lib/metadataHelper";
import { getPublishedHtml, buildAndSavePublishedHtml } from "@/lib/staticPublisher";

interface PageProps {
  params: Promise<{ groom: string; bride: string; invitationSlug: string }>;
  searchParams: Promise<{ to?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { groom, bride, invitationSlug } = await params;
  const { to } = await searchParams;

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

  return generateInvitationMetadata(invitation.id, to);
}

export default async function PublicInvitationPage({ params }: PageProps) {
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

  if (!invitation) {
    notFound();
  }

  // 1. Direct Static Serving: Load standalone HTML file if already baked
  let html = await getPublishedHtml(invitation.id);

  // 2. If not baked yet, compile standalone HTML and save for future instant requests
  if (!html) {
    html = await buildAndSavePublishedHtml(invitation.id);
  }

  if (!html) {
    notFound();
  }

  return (
    <div className="invitation-container">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}