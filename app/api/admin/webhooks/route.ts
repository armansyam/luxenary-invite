import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin =
      (session?.user as any)?.isAdmin === true ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

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
      whereClause.status = status;
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
  } catch (error: any) {
    console.error("GET /api/admin/webhooks error:", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Gagal memuat log webhook" : error.message },
      { status: 500 }
    );
  }
}
