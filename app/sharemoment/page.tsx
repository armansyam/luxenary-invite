import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveEffectiveInvitationUrl } from "@/lib/domainUtils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RootSharemomentRedirectPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/sharemoment");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      invitations: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          subdomain: true,
          customDomain: true,
          invitationSlug: true,
          groomSlug: true,
          brideSlug: true,
          status: true,
        },
      },
    },
  });

  if (!user || user.invitations.length === 0) {
    redirect("/dashboard");
  }

  const inv = user.invitations[0];
  const resolved = resolveEffectiveInvitationUrl({
    customDomain: inv.customDomain,
    subdomain: inv.subdomain,
    groomSlug: inv.groomSlug,
    brideSlug: inv.brideSlug,
    invitationSlug: inv.invitationSlug,
  });

  if (resolved.url) {
    const cleanBase = resolved.url.replace(/\/$/, "");
    redirect(`${cleanBase}/sharemoment`);
  }

  if (inv.invitationSlug) {
    redirect(`/${inv.invitationSlug}/sharemoment`);
  }

  redirect("/dashboard");
}
