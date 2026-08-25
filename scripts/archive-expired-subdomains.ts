import { prisma } from "../lib/prisma";
import { isSubdomainExpired } from "../lib/domainUtils";

/**
 * Maintenance Script: Auto-release expired subdomains (H+7 days grace period)
 * Run periodically (e.g. daily cron) to keep the subdomain namespace clean and recycled.
 */
export async function archiveExpiredSubdomains() {
  console.log("[Maintenance] Starting Subdomain Archival & Recycling Check...");

  const invitationsWithSubdomain = await prisma.invitation.findMany({
    where: {
      subdomain: { not: null },
    },
    select: {
      id: true,
      subdomain: true,
      groomSlug: true,
      brideSlug: true,
      invitationSlug: true,
      eventData: true,
      createdAt: true,
    },
  });

  let releasedCount = 0;

  for (const inv of invitationsWithSubdomain) {
    if (!inv.subdomain) continue;

    let eventDate: string | null = null;
    try {
      if (inv.eventData) {
        const parsed = JSON.parse(inv.eventData);
        if (Array.isArray(parsed) && parsed[0]?.date) {
          eventDate = parsed[0].date;
        }
      }
    } catch {}

    if (eventDate && isSubdomainExpired(eventDate, 7)) {
      await prisma.invitation.update({
        where: { id: inv.id },
        data: {
          subdomain: null,
        },
      });

      releasedCount++;
      console.log(
        `[Released] Subdomain '${inv.subdomain}' unlinked from ${inv.groomSlug}-${inv.brideSlug}. Permanent link: /${inv.groomSlug}-${inv.brideSlug}/${inv.invitationSlug}`
      );
    }
  }

  console.log(`[Maintenance] Finished. Total subdomains released: ${releasedCount}`);
  return { releasedCount };
}

// Direct execution support via tsx / node
if (require.main === module) {
  archiveExpiredSubdomains()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Maintenance Error]", err);
      process.exit(1);
    });
}
