import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isRemote = (session?.user as any)?.isRemote === true;
    // Jika Admin sedang dalam mode remote (isRemote), identitasnya sudah di-override ke CLIENT
    // Jangan izinkan akses endpoint admin dalam kondisi remote — harus keluar dari remote terlebih dahulu
    const isAdmin =
      !isRemote &&
      ((session?.user as any)?.isAdmin === true ||
       role === "SUPER_ADMIN" ||
       role === "ADMIN" ||
       role === "SUPPORT" ||
       role === "FINANCE");

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const filter = searchParams.get("filter")?.trim() || "all";

    const andConditions: Prisma.UserWhereInput[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (filter === "active") {
      andConditions.push({
        OR: [
          { orders: { some: { status: "PAID" } } },
          { invitations: { some: {} } },
        ],
      });
    } else if (filter === "leads") {
      andConditions.push({
        orders: { none: { status: "PAID" } },
        invitations: { none: {} },
      });
    }

    const whereClause: Prisma.UserWhereInput = {
      role: "CLIENT",
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    const [total, rawUsers, countAll, countActive, countLeads] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phoneNumber: true,
          avatarUrl: true,
          createdAt: true,
          orders: {
            where: { status: "PAID" },
            select: { planType: true, amount: true, paidAt: true, invoiceNumber: true },
            orderBy: { createdAt: "desc" },
          },
          invitations: {
            select: {
              id: true,
              subdomain: true,
              invitationSlug: true,
              status: true,
              themeId: true,
              eventData: true,
              groomName: true,
              brideName: true,
            },
            take: 3,
          },
          _count: {
            select: {
              orders: true,
              invitations: true,
            },
          },
        },
      }),
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.user.count({
        where: {
          role: "CLIENT",
          OR: [{ orders: { some: { status: "PAID" } } }, { invitations: { some: {} } }],
        },
      }),
      prisma.user.count({
        where: {
          role: "CLIENT",
          orders: { none: { status: "PAID" } },
          invitations: { none: {} },
        },
      }),
    ]);

    const users = rawUsers.map((u) => {
      const totalSpent = u.orders.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const latestOrder = u.orders[0] || null;
      return {
        ...u,
        totalSpent,
        latestOrder,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      users,
      counts: {
        all: countAll,
        active: countActive,
        leads: countLeads,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Gagal memuat data klien" : error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "ID Klien wajib disertakan." }, { status: 400 });
    }

    // Check if user exists and prevent deleting other admins
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        invitations: true,
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });
    }

    if (targetUser.role === "ADMIN") {
      return NextResponse.json({ error: "Tidak dapat menghapus akun Admin melalui endpoint klien." }, { status: 403 });
    }

    // Clean up published HTMLs before deleting invitations
    // WE DELIBERATELY DO NOT PASS `true` to deletePublishedHtml so the portfolio is preserved.
    // WE DELIBERATELY DO NOT CLEAN UP R2 ASSETS so the portfolio can still load them.
    if (targetUser.invitations && targetUser.invitations.length > 0) {
      const { deletePublishedHtml } = await import("@/lib/staticPublisher");
      for (const inv of targetUser.invitations) {
        await deletePublishedHtml(inv.id);
      }
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ success: true, message: "Akun klien beserta semua data undangan dan transaksinya berhasil dihapus permanen." });
  } catch (err: any) {
    console.error("Delete client error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus klien." }, { status: 500 });
  }
}
