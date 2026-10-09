import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestMemoriesGalleryPage, { generateMetadata as generateSlugMetadata } from "@/app/(public)/[slug]/memories/page";

export const dynamic = "force-dynamic";

interface SubdomainMemoriesProps {
  params: Promise<{ subdomain: string }>;
}

// Judul pratinjau tautan (mis. saat dibagikan ke WhatsApp) sama dengan galeri di rute slug.
export async function generateMetadata({ params }: SubdomainMemoriesProps): Promise<Metadata> {
  const { subdomain } = await params;
  const invitation = await prisma.invitation.findFirst({
    where: { subdomain: subdomain.toLowerCase() },
    select: { invitationSlug: true },
  });
  if (!invitation?.invitationSlug) return {};
  return generateSlugMetadata({ params: Promise.resolve({ slug: invitation.invitationSlug }) });
}

export default async function SubdomainMemoriesPage({ params }: SubdomainMemoriesProps) {
  const { subdomain } = await params;

  const invitation = await prisma.invitation.findFirst({
    where: {
      subdomain: subdomain.toLowerCase(),
    },
    select: {
      invitationSlug: true,
    },
  });

  if (!invitation || !invitation.invitationSlug) {
    notFound();
  }

  // Render memories gallery directly on the subdomain
  return GuestMemoriesGalleryPage({
    params: Promise.resolve({ slug: invitation.invitationSlug }),
  });
}
