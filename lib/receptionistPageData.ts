import { prisma } from "@/lib/prisma";
import { getAdminSetting, hasPlanCapability } from "@/lib/settings";
import { participantNames } from "@/lib/participantUtils";

export type ReceptionistPageLoadResult =
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "no_pin" }
  | {
      kind: "ready";
      invitationId: string;
      platformName: string;
      clientInitials: string;
      clientNames: string;
      eventType: string;
    };

export async function loadReceptionistInvitation(query: {
  slug?: string;
  subdomain?: string;
}): Promise<ReceptionistPageLoadResult> {
  const cleanSlug = query.slug?.trim();
  const cleanSubdomain = query.subdomain?.trim().toLowerCase();
  if (!cleanSlug && !cleanSubdomain) return { kind: "not_found" };

  const [invitation, platformName] = await Promise.all([
    prisma.invitation.findFirst({
      where: cleanSlug
        ? {
            OR: [
              { invitationSlug: cleanSlug },
              { subdomain: cleanSlug.toLowerCase() },
            ],
          }
        : { subdomain: cleanSubdomain },
      select: {
        id: true,
        staffPin: true,
        status: true,
        eventType: true,
        participantsJson: true,
        order: { select: { planType: true } },
      },
    }),
    getAdminSetting("platform_name", "Platform Undangan"),
  ]);

  if (!invitation || invitation.status === "TAKEN_DOWN" || invitation.status === "ARCHIVED") {
    return { kind: "not_found" };
  }

  const hasQrCheckin = await hasPlanCapability(invitation.order?.planType, "qr_checkin");
  if (!hasQrCheckin) {
    return { kind: "forbidden" };
  }

  if (!invitation.staffPin) {
    return { kind: "no_pin" };
  }

  const { first: groomFirst, second: brideFirst } = participantNames(
    invitation.eventType,
    invitation.participantsJson,
  );

  let clientInitials = "";
  if (groomFirst && brideFirst) {
    clientInitials = `${groomFirst.charAt(0).toUpperCase()} & ${brideFirst.charAt(0).toUpperCase()}`;
  } else if (groomFirst) {
    clientInitials = groomFirst.charAt(0).toUpperCase();
  } else if (brideFirst) {
    clientInitials = brideFirst.charAt(0).toUpperCase();
  }

  const clientNames =
    groomFirst && brideFirst ? `${groomFirst} & ${brideFirst}` : groomFirst || brideFirst || "";

  return {
    kind: "ready",
    invitationId: invitation.id,
    platformName,
    clientInitials,
    clientNames,
    eventType: invitation.eventType,
  };
}
