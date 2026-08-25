import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateInvitationMetadata } from "@/lib/metadataHelper";
import { isSubdomainExpired } from "@/lib/domainUtils";
import { getPublishedHtml, buildAndSavePublishedHtml } from "@/lib/staticPublisher";

interface PageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ to?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const { to } = await searchParams;
  if (!subdomain) return {};

  const invitation = await prisma.invitation.findUnique({
    where: { subdomain },
  });

  if (!invitation) return {};

  return generateInvitationMetadata(invitation.id, to);
}

export default async function SubdomainInvitationPage({ params, searchParams }: PageProps) {
  const { subdomain } = await params;
  const resolvedSearchParams = await searchParams;
  const to = resolvedSearchParams?.to;

  if (!subdomain) notFound();

  // Strict lookup by active unique subdomain
  const invitation = await prisma.invitation.findUnique({
    where: { subdomain },
  });

  if (!invitation) {
    // If subdomain is vacant / released, redirect to homepage with info
    redirect("/?notice=subdomain-available");
  }

  // Check if subdomain has expired (> 7 days post event)
  let eventDateToTest: string | null = null;
  try {
    if (invitation.eventData) {
      const parsed = JSON.parse(invitation.eventData);
      if (Array.isArray(parsed) && parsed[0]?.date) {
        eventDateToTest = parsed[0].date;
      }
    }
  } catch {}

  if (isSubdomainExpired(eventDateToTest, 7)) {
    // Auto-release subdomain back to pool (invitation remains published on canonical path)
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { subdomain: null },
    });

    // Seamlessly redirect to the permanent canonical path
    const query = to ? `?to=${encodeURIComponent(to)}` : "";
    redirect(`/${invitation.groomSlug}-${invitation.brideSlug}/${invitation.invitationSlug}${query}`);
  }

  // 1. Direct Static Serving: Load standalone HTML file if already baked
  let html = getPublishedHtml(invitation.id);

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

