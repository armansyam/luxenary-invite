import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { Prisma } from "@prisma/client";

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
      whereClause.eventType = eventType as any;
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
      whereClause.OR = [
        { groomName: { contains: search, mode: "insensitive" } },
        { brideName: { contains: search, mode: "insensitive" } },
        { groomNickname: { contains: search, mode: "insensitive" } },
        { brideNickname: { contains: search, mode: "insensitive" } },
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
          groomSlug: true,
          brideSlug: true,
          invitationSlug: true,
          groomName: true,
          brideName: true,
          groomNickname: true,
          brideNickname: true,
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
