import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

export async function generateStaticParams() {
  const invitations = await prisma.invitation.findMany({
    where: { status: "PUBLISHED" },
    select: { groomSlug: true, brideSlug: true, invitationSlug: true },
  });
  return invitations.map((inv) => ({
    groom: inv.groomSlug,
    bride: inv.brideSlug,
    invitationSlug: inv.invitationSlug,
  }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groom: string; bride: string; invitationSlug: string }> }
) {
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

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}