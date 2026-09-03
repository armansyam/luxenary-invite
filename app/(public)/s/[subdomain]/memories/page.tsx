import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface SubdomainMemoriesProps {
  params: Promise<{ subdomain: string }>;
}

export default async function SubdomainMemoriesRedirect({ params }: SubdomainMemoriesProps) {
  const { subdomain } = await params;

  const invitation = await prisma.invitation.findFirst({
    where: {
      subdomain: subdomain.toLowerCase(),
    },
    select: {
      groomSlug: true,
      brideSlug: true,
      invitationSlug: true,
    },
  });

  if (!invitation) {
    notFound();
  }

  // Redirect to canonical permanent album link
  redirect(`/${invitation.invitationSlug}/memories`);
}
