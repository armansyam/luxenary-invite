import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { prisma } from "@/lib/prisma";
import { Prisma, WebhookLogStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("logs");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const source = searchParams.get("source")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const whereClause: Prisma.WebhookLogWhereInput = {};
    if (source && source !== "ALL") {
      whereClause.source = source;
    }
    if (status && status !== "ALL") {
      if (!(Object.values(WebhookLogStatus) as string[]).includes(status)) {
        return NextResponse.json({ error: "Status webhook tidak dikenali." }, { status: 400 });
      }
      whereClause.status = status as WebhookLogStatus;
    }

    const [total, logs] = await Promise.all([
      prisma.webhookLog.count({ where: whereClause }),
      prisma.webhookLog.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
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
    return routeError("AdminWebhooks", error, "Gagal memuat log webhook");
  }
}
