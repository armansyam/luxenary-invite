import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

interface PageProps {
  params: Promise<{ groom: string; bride: string; invitationSlug: string }>;
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

  if (!invitation || invitation.status !== "PUBLISHED") {
    notFound();
  }

  const data = await composeTemplateData(invitation.id);
  if (!data) notFound();

  const html = renderTemplateFile("kila", data);

  return (
    <div className="invitation-container">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}