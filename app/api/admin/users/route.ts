import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { removeIfExists } from "@/lib/fsSafe";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

/** Data klien hanya dikelola dari sesi admin asli, bukan dari sesi remote yang sedang memakai akun klien. */
async function requireClientModule() {
  const guard = await requireAdminModule("users");
  if (guard.ok && guard.session.user.isRemote === true) {
    return { ok: false as const, response: NextResponse.json({ error: "Kelola klien tidak tersedia dari sesi remote." }, { status: 403 }) };
  }
  return guard;
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireClientModule();
    if (!guard.ok) return guard.response;

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
              galleryExpiresAt: true,
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
  } catch (error) {
    return routeError("AdminUsers", error, "Gagal memuat data klien");
  }
}

export async function DELETE(req: Request) {
  try {
    // Penghapusan permanen: wajib izin modul "users" dan bukan dari sesi remote, sama dengan GET.
    const guard = await requireClientModule();
    if (!guard.ok) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "ID Klien wajib disertakan." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        invitations: {
          include: {
            guestMemories: true,
            media: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });
    }

    if (targetUser.role === "ADMIN") {
      return NextResponse.json({ error: "Tidak dapat menghapus akun Admin melalui endpoint klien." }, { status: 403 });
    }

    // Baris DB dan catatan audit dihapus/ditulis lebih dulu dalam satu transaksi; berkas fisik baru dibersihkan
    // setelahnya. Urutan sebaliknya bisa meninggalkan klien yang masih ada tanpa media bila penghapusan DB gagal.
    await prisma.$transaction([
      prisma.user.delete({ where: { id: userId } }),
      prisma.adminAuditLog.create({
        data: {
          adminId: adminActorId(session),
          action: "DELETE_CLIENT",
          details: `Menghapus permanen klien ${targetUser.email || targetUser.id} beserta ${targetUser.invitations.length} undangan`,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        },
      }),
    ]);

    if (targetUser.invitations && targetUser.invitations.length > 0) {
      const path = await import("path");
      const { deletePublishedHtml } = await import("@/lib/staticPublisher");
      const { deleteFile } = await import("@/lib/storage");

      for (const inv of targetUser.invitations) {
        // 1. Hapus published HTML (public/published/ids/<id>.html)
        await deletePublishedHtml(inv.id);

        // 2. Hapus draft HTML (data/drafts/<id>.html) jika ada
        await removeIfExists(path.join(process.cwd(), "data", "drafts", `${inv.id}.html`));

        // 3. Hapus file media & guest memories dari R2/Local
        if (inv.media && inv.media.length > 0) {
          await Promise.all(inv.media.map(m => m.localPath ? deleteFile(m.localPath) : Promise.resolve()))
            .catch((e) => logger.warn("AdminDeleteClient", "Sebagian berkas media gagal dihapus", { invitationId: inv.id, error: e instanceof Error ? e.message : String(e) }));
        }
        if (inv.guestMemories && inv.guestMemories.length > 0) {
          await Promise.all(inv.guestMemories.map(mem => mem.mediaUrl ? deleteFile(mem.mediaUrl) : Promise.resolve()))
            .catch((e) => logger.warn("AdminDeleteClient", "Sebagian berkas kenangan tamu gagal dihapus", { invitationId: inv.id, error: e instanceof Error ? e.message : String(e) }));
        }

        // 4. Hapus folder uploads fisik invitation & guest-memories lokal
        // Portfolio sudah menyalin aset ke folder tersendiri (public/portfolio/assets/ atau R2),
        // sehingga menghapus uploads asli tidak merusak portfolio yang sudah dipublish.
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id);
        const guestMemoriesDir = path.join(process.cwd(), "public", "uploads", "guest-memories", inv.id);
        await removeIfExists(uploadsDir, { recursive: true });
        await removeIfExists(guestMemoriesDir, { recursive: true });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Akun klien beserta semua data undangan, media, dan transaksinya berhasil dihapus permanen.",
    });
  } catch (err) {
    return routeError("AdminDeleteClient", err, "Gagal menghapus klien.");
  }
}
