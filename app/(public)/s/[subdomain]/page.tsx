import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function SubdomainInvitationPage({ params }: PageProps) {
  const { subdomain } = await params;
  if (!subdomain) notFound();

  // Find invitation by unique subdomain
  let invitation = await prisma.invitation.findUnique({
    where: { subdomain },
  });

  // Fallback: check if subdomain matches groom-bride slug combination
  if (!invitation && subdomain.includes("-")) {
    const [groom, bride] = subdomain.split("-");
    if (groom && bride) {
      invitation = await prisma.invitation.findFirst({
        where: { groomSlug: groom, brideSlug: bride },
      });
    }
  }

  if (!invitation) {
    notFound();
  }

  const data = await composeTemplateData(invitation.id);
  if (!data) notFound();

  const html = renderTemplateFile(invitation.themeId || "kila", data);

  return (
    <div className="invitation-container">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
