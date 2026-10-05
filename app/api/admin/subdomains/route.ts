import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { isReservedSubdomain } from "@/lib/domainUtils";
import { DAY_MS, computeLifecycleDates, getPrimaryEventDateString } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";

export const dynamic = "force-dynamic";

async function denyUnlessAdmin() {
  const guard = await requireAdminModule("invitations");
  return guard.ok ? null : guard.response;
}

export async function GET(req: Request) {
  try {
    const denied = await denyUnlessAdmin();
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get("search")?.trim().toLowerCase() || "";
    const filterStatus = searchParams.get("status")?.trim().toUpperCase() || "";

    // 1. Masa tenggang subdomain dari Admin Setting (subdomain_grace_days)
    const lifecycleSettings = await getLifecycleSettings();

    // 2. Ambil seluruh undangan yang memiliki subdomain
    const allActiveInvitations = await prisma.invitation.findMany({
      where: {
        subdomain: { not: null },
      },
      select: {
        id: true,
        subdomain: true,
        groomName: true,
        brideName: true,
        groomNickname: true,
        brideNickname: true,
        groomSlug: true,
        brideSlug: true,
        invitationSlug: true,
        status: true,
        themeId: true,
        customDomain: true,
        eventData: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        order: {
          select: {
            planType: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Hitung KPI Real-time
    let totalActive = allActiveInvitations.length;
    let totalPublished = 0;
    let totalDraft = 0;
    let totalExpired = 0;

    const mappedItems = allActiveInvitations.map((inv) => {
      const dates = computeLifecycleDates({ eventData: inv.eventData }, lifecycleSettings);
      const eventDate = getPrimaryEventDateString(inv.eventData);
      const isExpired = dates ? Date.now() > dates.subdomainReleaseAt.getTime() : false;
      const remainingDays = dates ? Math.ceil((dates.subdomainReleaseAt.getTime() - Date.now()) / DAY_MS) : null;

      if (inv.status === "PUBLISHED") totalPublished++;
      if (inv.status === "DRAFT") totalDraft++;
      if (isExpired) totalExpired++;

      const coupleName = `${inv.groomNickname || inv.groomName || "Pria"} & ${inv.brideNickname || inv.brideName || "Wanita"}`;

      return {
        id: inv.id,
        subdomain: inv.subdomain!,
        coupleName,
        clientName: inv.user?.name || "Klien",
        clientEmail: inv.user?.email || "-",
        clientPhone: inv.user?.phoneNumber || "-",
        status: inv.status,
        themeId: inv.themeId || "Default",
        planType: inv.order?.planType || "TIER_1",
        customDomain: inv.customDomain || null,
        invitationSlug: inv.invitationSlug,
        eventDate,
        isExpired,
        remainingDays,
        createdAt: inv.createdAt.toISOString(),
      };
    });

    // 4. Fitur Live Subdomain Inspector jika query search diberikan
    let inspectorResult: any = null;
    if (searchQuery) {
      const cleanSubdomain = searchQuery.replace(/[^a-z0-9-]+/g, "").replace(/^-+|-+$/g, "");
      const isReserved = isReservedSubdomain(cleanSubdomain);
      const exactMatch = mappedItems.find((item) => item.subdomain.toLowerCase() === cleanSubdomain);

      if (isReserved) {
        inspectorResult = {
          subdomain: cleanSubdomain,
          status: "RESERVED",
          available: false,
          badge: "Dilindungi Sistem",
          message: `Subdomain "${cleanSubdomain}" dilindungi oleh sistem (seperti CDN/System/Auth) dan tidak dapat digunakan.`,
        };
      } else if (exactMatch) {
        inspectorResult = {
          subdomain: cleanSubdomain,
          status: "OCCUPIED",
          available: false,
          badge: "Sedang Digunakan",
          message: `Subdomain "${cleanSubdomain}" saat ini aktif digunakan oleh ${exactMatch.clientName}.`,
          owner: exactMatch,
        };
      } else {
        inspectorResult = {
          subdomain: cleanSubdomain,
          status: "AVAILABLE",
          available: true,
          badge: "Tersedia",
          message: `Subdomain "${cleanSubdomain}" masih bebas dan siap digunakan.`,
        };
      }
    }

    // 5. Filter daftar untuk tabel (berdasarkan status atau search)
    let filteredList = mappedItems;
    if (filterStatus) {
      filteredList = filteredList.filter((item) => item.status === filterStatus);
    }
    if (searchQuery) {
      filteredList = filteredList.filter(
        (item) =>
          item.subdomain.toLowerCase().includes(searchQuery) ||
          item.clientName.toLowerCase().includes(searchQuery) ||
          item.clientEmail.toLowerCase().includes(searchQuery) ||
          item.coupleName.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      graceDays: lifecycleSettings.subdomainGraceDays,
      kpis: {
        totalActive,
        totalPublished,
        totalDraft,
        totalExpired,
      },
      inspectorResult,
      subdomains: filteredList,
    });
  } catch (err) {
    return routeError("AdminSubdomains", err, "Gagal memuat data monitoring subdomain");
  }
}
