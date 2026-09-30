import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { invalidateInvitationLookup } from "@/lib/cache";
import { DAY_MS, computeLifecycleDates, getPrimaryEventDateString } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { buildCanonicalPath, resolveInvitationDisplayName } from "@/lib/invitationUtils";

export const dynamic = "force-dynamic";

async function denyUnlessAdmin() {
  const guard = await requireAdminModule("invitations");
  return guard.ok ? null : guard.response;
}

export async function GET() {
  try {
    const denied = await denyUnlessAdmin();
    if (denied) return denied;

    const settings = await getLifecycleSettings();
    const graceDays = settings.subdomainGraceDays;

    const invitations = await prisma.invitation.findMany({
      select: {
        id: true,
        eventType: true,
        participantsJson: true,
        groomNickname: true,
        brideNickname: true,
        groomSlug: true,
        brideSlug: true,
        invitationSlug: true,
        subdomain: true,
        eventData: true,
        status: true,
        createdAt: true,
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = invitations.map((inv) => {
      const dates = computeLifecycleDates({ eventData: inv.eventData }, settings);
      const eventDate = getPrimaryEventDateString(inv.eventData);

      const hasSubdomain = Boolean(inv.subdomain);
      const isExpired = dates ? Date.now() > dates.subdomainReleaseAt.getTime() : false;
      const remainingDays = dates ? Math.ceil((dates.subdomainReleaseAt.getTime() - Date.now()) / DAY_MS) : null;

      return {
        id: inv.id,
        coupleName: resolveInvitationDisplayName(inv),
        subdomain: inv.subdomain,
        canonicalPath: buildCanonicalPath(inv),
        eventDate,
        hasSubdomain,
        isExpired,
        remainingDays,
        status: inv.status,
        clientName: inv.user?.name || inv.user?.email || "-",
      };
    });

    return NextResponse.json({
      success: true,
      graceDays,
      total: items.length,
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memuat status subdomain" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const denied = await denyUnlessAdmin();
    if (denied) return denied;

    const settings = await getLifecycleSettings();
    const graceDays = settings.subdomainGraceDays;

    const invitations = await prisma.invitation.findMany({
      where: { subdomain: { not: null } },
      select: {
        id: true,
        subdomain: true,
        groomSlug: true,
        brideSlug: true,
        invitationSlug: true,
        eventData: true,
      },
    });

    let releasedCount = 0;
    const releasedList: string[] = [];

    for (const inv of invitations) {
      if (!inv.subdomain) continue;

      const dates = computeLifecycleDates({ eventData: inv.eventData }, settings);

      if (dates && Date.now() > dates.subdomainReleaseAt.getTime()) {
        await prisma.invitation.update({
          where: { id: inv.id },
          data: { subdomain: null },
        });
        invalidateInvitationLookup(inv.invitationSlug, inv.subdomain);

        releasedCount++;
        releasedList.push(inv.subdomain);
      }
    }

    return NextResponse.json({
      success: true,
      graceDays,
      releasedCount,
      releasedList,
      message: `${releasedCount} subdomain kedaluwarsa berhasil dilepas kembali ke pool namespace.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal mengeksekusi daur ulang subdomain" }, { status: 500 });
  }
}
