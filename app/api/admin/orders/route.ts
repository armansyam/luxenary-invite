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
      role === "ADMIN" ||
      role === "FINANCE";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "SEMUA";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isExport = searchParams.get("export") === "csv";

    // Bangun filter kondisi Prisma Where
    const whereClause: Prisma.OrderWhereInput = {};

    // 1. Filter Status
    if (status === "PENDING") {
      whereClause.status = "PENDING";
    } else if (status === "PAID") {
      whereClause.status = "PAID";
    } else if (status === "FAILED") {
      whereClause.status = { in: ["FAILED", "EXPIRED"] };
    }

    // 2. Filter Search (Invoice Number, Nama Klien, Email, Telepon)
    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { phoneNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    // 3. Filter Rentang Tanggal (createdAt)
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        // Jika hanya YYYY-MM-DD, set ke akhir hari
        if (endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        whereClause.createdAt.lte = end;
      }
    }

    // Jika ekspor CSV diminta, ambil seluruh record yang cocok tanpa paginasi (maks 2000 untuk keamanan)
    if (isExport) {
      const exportOrders = await prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 2000,
        include: {
          user: {
            select: { name: true, email: true, phoneNumber: true },
          },
        },
      });

      const csvRows = [
        ["No Invoice", "Tanggal Transaksi", "Nama Klien", "Email Klien", "No WhatsApp", "Paket / Item", "Metode Pembayaran", "Nominal (IDR)", "Status", "Waktu Lunas"].join(","),
      ];

      for (const ord of exportOrders) {
        const row = [
          `"${ord.invoiceNumber || ""}"`,
          `"${new Date(ord.createdAt).toLocaleString("id-ID")}"`,
          `"${(ord.user?.name || "").replace(/"/g, '""')}"`,
          `"${ord.user?.email || ""}"`,
          `"${ord.user?.phoneNumber || ""}"`,
          `"${ord.planType || ""}"`,
          `"${ord.paymentMethod === "MANUAL_TRANSFER" ? "Transfer Bank" : "QRIS / Gateway"}"`,
          Number(ord.amount || 0),
          `"${ord.status}"`,
          `"${ord.paidAt ? new Date(ord.paidAt).toLocaleString("id-ID") : "-"}"`,
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\n");
      const dateStr = new Date().toISOString().slice(0, 10);

      return new Response("\uFEFF" + csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="transaksi_luxenary_${dateStr}.csv"`,
        },
      });
    }

    // Query paginasi standar
    const [total, orders, paidSummary] = await Promise.all([
      prisma.order.count({ where: whereClause }),
      prisma.order.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true, phoneNumber: true },
          },
        },
      }),
      // Hitung ringkasan omset untuk filter saat ini
      prisma.order.aggregate({
        where: { ...whereClause, status: "PAID" },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      orders,
      summary: {
        totalFilteredRevenue: Number(paidSummary._sum.amount || 0),
        totalFilteredPaidOrders: paidSummary._count.id || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Gagal memuat data transaksi" : error.message },
      { status: 500 }
    );
  }
}
