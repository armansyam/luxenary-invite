import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("logs");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const action = searchParams.get("action")?.trim() || "";

    const whereClause: Prisma.AdminAuditLogWhereInput = {};
    if (action && action !== "ALL") {
      whereClause.action = action;
    }

    const [total, logs] = await Promise.all([
      prisma.adminAuditLog.count({ where: whereClause }),
      prisma.adminAuditLog.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          admin: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return routeError("AdminAuditLogs", error, "Gagal memuat log audit staf");
  }
}
