import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { EventType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("invitations");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const eventType = searchParams.get("eventType") || "ALL";

    const whereClause: Prisma.InvitationWhereInput = {};

    if (eventType !== "ALL") {
      if (!(Object.values(EventType) as string[]).includes(eventType)) {
        return NextResponse.json({ error: "Jenis acara tidak dikenal." }, { status: 400 });
      }
      whereClause.eventType = eventType as EventType;
    }

    // 1. Status Filter
    if (status === "DRAFT") {
      whereClause.status = "DRAFT";
    } else if (status === "PUBLISHED") {
      whereClause.status = "PUBLISHED";
    } else if (status === "EVENT_FINISHED") {
      whereClause.status = "EVENT_FINISHED";
    } else if (status === "ARCHIVED") {
      whereClause.status = { in: ["ARCHIVED", "TAKEN_DOWN"] };
    }

    // 2. Search Filter
    if (search) {
      // Nama peserta tersimpan di jsonb ({peran: {name, nickname}} atau {event: {title}}); hanya nilai dari kunci nama yang
      // dicocokkan agar pencarian "groom" tidak mengembalikan semua undangan pernikahan.
      const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      const nameMatches = await prisma.$queryRaw<{ id: string }[]>`
        SELECT i.id FROM invitations i
        CROSS JOIN LATERAL jsonb_each(
          CASE WHEN jsonb_typeof(i."participantsJson") = 'object' THEN i."participantsJson" ELSE '{}'::jsonb END
        ) AS role(key, val)
        CROSS JOIN LATERAL jsonb_each_text(
          CASE WHEN jsonb_typeof(role.val) = 'object' THEN role.val ELSE '{}'::jsonb END
        ) AS field(key, val)
        WHERE field.key IN ('name', 'nickname', 'title') AND field.val ILIKE ${pattern}
      `;
      whereClause.OR = [
        { id: { in: nameMatches.map((row) => row.id) } },
        { subdomain: { contains: search, mode: "insensitive" } },
        { invitationSlug: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Ambil data terpaginasi serta counter per kategori status
    const [
      total,
      invitations,
      draftCount,
      publishedCount,
      eventFinishedCount,
      archivedCount,
      allCount,
    ] = await Promise.all([
      prisma.invitation.count({ where: whereClause }),
      prisma.invitation.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          eventType: true,
          participantsJson: true,
          invitationSlug: true,
          themeId: true,
          status: true,
          subdomain: true,
          customDomain: true,
          eventData: true,
          galleryExpiresAt: true,
          adminUnlockedUntil: true,
          isLockedPermanently: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      }),
      prisma.invitation.count({ where: { status: "DRAFT" } }),
      prisma.invitation.count({ where: { status: "PUBLISHED" } }),
      prisma.invitation.count({ where: { status: "EVENT_FINISHED" } }),
      prisma.invitation.count({ where: { status: { in: ["ARCHIVED", "TAKEN_DOWN"] } } }),
      prisma.invitation.count(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      invitations,
      counts: {
        ALL: allCount,
        DRAFT: draftCount,
        PUBLISHED: publishedCount,
        EVENT_FINISHED: eventFinishedCount,
        ARCHIVED: archivedCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return routeError("AdminInvitations", error, "Gagal memuat daftar undangan");
  }
}
