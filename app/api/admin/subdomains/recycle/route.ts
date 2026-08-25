import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isSubdomainExpired } from "@/lib/domainUtils";

export const dynamic = "force-dynamic";

async function verifyAdminSession() {
  const session = await auth();
  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "SUPER_ADMIN" ||
    (session?.user as any)?.role === "ADMIN";
  return session?.user && isAdmin;
}

export async function GET() {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    // Get grace days setting
    const graceSetting = await prisma.adminSetting.findUnique({
      where: { key: "subdomain_grace_days" },
    });
    const graceDays = graceSetting ? parseInt(graceSetting.value, 10) || 7 : 7;

    const invitations = await prisma.invitation.findMany({
      select: {
        id: true,
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
      let eventDate: string | null = null;
      try {
        if (inv.eventData) {
          const parsed = JSON.parse(inv.eventData);
          if (Array.isArray(parsed) && parsed[0]?.date) {
            eventDate = parsed[0].date;
          }
        }
      } catch {}

      const hasSubdomain = Boolean(inv.subdomain);
      const isExpired = eventDate ? isSubdomainExpired(eventDate, graceDays) : false;

      let remainingDays: number | null = null;
      if (eventDate) {
        const parsedDate = new Date(eventDate);
        if (!isNaN(parsedDate.getTime())) {
          const expiryTime = parsedDate.getTime() + graceDays * 24 * 60 * 60 * 1000;
          remainingDays = Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24));
        }
      }

      return {
        id: inv.id,
        coupleName: `${inv.groomNickname || "Pria"} & ${inv.brideNickname || "Wanita"}`,
        subdomain: inv.subdomain,
        canonicalPath: `/${inv.groomSlug}-${inv.brideSlug}/${inv.invitationSlug}`,
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
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const graceSetting = await prisma.adminSetting.findUnique({
      where: { key: "subdomain_grace_days" },
    });
    const graceDays = graceSetting ? parseInt(graceSetting.value, 10) || 7 : 7;

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

      let eventDate: string | null = null;
      try {
        if (inv.eventData) {
          const parsed = JSON.parse(inv.eventData);
          if (Array.isArray(parsed) && parsed[0]?.date) {
            eventDate = parsed[0].date;
          }
        }
      } catch {}

      if (eventDate && isSubdomainExpired(eventDate, graceDays)) {
        await prisma.invitation.update({
          where: { id: inv.id },
          data: { subdomain: null },
        });

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
