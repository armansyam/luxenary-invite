import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isSubdomainExpired, getLatestEventDate, isReservedSubdomain } from "@/lib/domainUtils";

export const dynamic = "force-dynamic";

async function verifyAdminSession() {
  const session = await auth();
  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "SUPER_ADMIN" ||
    (session?.user as any)?.role === "ADMIN";
  return session?.user && isAdmin;
}

export async function GET(req: Request) {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get("search")?.trim().toLowerCase() || "";
    const filterStatus = searchParams.get("status")?.trim().toUpperCase() || "";

    // 1. Dapatkan grace days dari Admin Setting
    const graceSetting = await prisma.adminSetting.findUnique({
      where: { key: "subdomain_grace_days" },
    });
    const graceDays = graceSetting ? parseInt(graceSetting.value, 10) || 7 : 7;

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
      const latestDate = getLatestEventDate(inv.eventData);
      const eventDate = latestDate ? latestDate.toISOString().split("T")[0] : null;
      const isExpired = latestDate ? isSubdomainExpired(latestDate, graceDays) : false;

      let remainingDays: number | null = null;
      if (latestDate) {
        const expiryTime = latestDate.getTime() + graceDays * 24 * 60 * 60 * 1000;
        remainingDays = Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24));
      }

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
        planType: inv.order?.planType || "TRADITIONAL",
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
          message: `Subdomain "${cleanSubdomain}.luxvite.id" masih bebas dan siap digunakan.`,
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
      graceDays,
      kpis: {
        totalActive,
        totalPublished,
        totalDraft,
        totalExpired,
      },
      inspectorResult,
      subdomains: filteredList,
    });
  } catch (err: any) {
    console.error("[Admin-Subdomains-API-Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal memuat data monitoring subdomain" },
      { status: 500 }
    );
  }
}
