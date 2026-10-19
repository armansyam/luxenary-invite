import { NextResponse } from "next/server";
import type { InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { requireAdminModule } from "@/lib/adminAuth";
import { releaseInvitationSubdomain } from "@/lib/subdomainRelease";
import { DAY_MS, computeLifecycleDates, getPrimaryEventDateString } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";

export const dynamic = "force-dynamic";

// Sama dengan sapuan cron (lifecycleCleanup): undangan PUBLISHED yang tanggalnya diundur klien atau DRAFT tidak boleh
// kehilangan subdomainnya hanya karena tanggal lamanya sudah lewat.
const RECYCLABLE_STATUSES: InvitationStatus[] = ["EVENT_FINISHED", "ARCHIVED", "TAKEN_DOWN"];

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
      const isExpired = RECYCLABLE_STATUSES.includes(inv.status) && dates ? Date.now() > dates.subdomainReleaseAt.getTime() : false;
      const remainingDays = dates ? Math.ceil((dates.subdomainReleaseAt.getTime() - Date.now()) / DAY_MS) : null;

      return {
        id: inv.id,
        coupleName: resolveInvitationDisplayName(inv),
        subdomain: inv.subdomain,
        canonicalPath: `/${inv.invitationSlug}`,
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
  } catch (err) {
    return routeError("SubdomainRecycle", err, "Gagal memuat status subdomain");
  }
}

export async function POST() {
  try {
    const denied = await denyUnlessAdmin();
    if (denied) return denied;

    const settings = await getLifecycleSettings();
    const graceDays = settings.subdomainGraceDays;

    const invitations = await prisma.invitation.findMany({
      where: { subdomain: { not: null }, status: { in: RECYCLABLE_STATUSES } },
      select: {
        id: true,
        status: true,
        subdomain: true,
        invitationSlug: true,
        customDomain: true,
        eventData: true,
      },
    });

    let releasedCount = 0;
    const releasedList: string[] = [];

    for (const inv of invitations) {
      if (!inv.subdomain) continue;

      const dates = computeLifecycleDates({ eventData: inv.eventData }, settings);

      if (dates && Date.now() > dates.subdomainReleaseAt.getTime()) {
        await releaseInvitationSubdomain(inv);

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
  } catch (err) {
    return routeError("SubdomainRecycle", err, "Gagal mengeksekusi daur ulang subdomain");
  }
}
