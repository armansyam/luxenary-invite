import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import { buildAndSavePublishedHtml } from "@/lib/staticPublisher";

export const dynamic = "force-dynamic";

async function verifyClientAccess(invitationId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      order: { select: { planType: true } },
    },
  });

  if (!invitation) return null;

  const isOwner = invitation.userId === session.user.id;
  const isAdmin =
    (session.user as any)?.isAdmin === true ||
    (session.user as any)?.role === "SUPER_ADMIN" ||
    (session.user as any)?.role === "ADMIN";

  if (!isOwner && !isAdmin) return null;

  return { invitation, userId: session.user.id };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const access = await verifyClientAccess(id);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized / Not Found" }, { status: 403 });
    }

    const { invitation, userId } = access;

    // 1. Ambil daftar foto
    const memories = await prisma.guestMemory.findMany({
      where: { invitationId: id },
      orderBy: { createdAt: "desc" },
    });

    // 2. Cek apakah ada pesanan perpanjangan galeri PENDING untuk undangan ini
    const now = new Date();
    const pendingOrder = await prisma.order.findFirst({
      where: {
        userId,
        linkedOrderId: id,
        orderType: { in: ["GALLERY_EXTENSION", "UPGRADE", "CUSTOM_DOMAIN_ADDON"] },
        status: "PENDING",
      },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        status: true,
        proofImageUrl: true,
        expiredAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let activePendingOrder: any = null;
    if (pendingOrder) {
      // Auto-expire jika batas waktu sudah lewat dan belum ada bukti transfer
      if (pendingOrder.expiredAt && now > pendingOrder.expiredAt && !pendingOrder.proofImageUrl) {
        await prisma.order.update({
          where: { id: pendingOrder.id },
          data: { status: "EXPIRED", rejectReason: "Batas waktu pembayaran habis" },
        });
      } else {
        activePendingOrder = {
          id: pendingOrder.id,
          invoiceNumber: pendingOrder.invoiceNumber,
          amount: Number(pendingOrder.amount),
          status: pendingOrder.status,
          hasProof: Boolean(pendingOrder.proofImageUrl),
          expiredAt: pendingOrder.expiredAt ? pendingOrder.expiredAt.toISOString() : null,
        };
      }
    }

    // 3. Kalkulasi kuota dinamis sesuai paket & featureSettings (Zero Hardcode)
    const { getPlanMemoriesQuota } = await import("@/lib/settings");
    const planQuota = await getPlanMemoriesQuota(invitation.order?.planType);

    const fs = (() => {
      try {
        return typeof invitation.featureSettings === "object"
          ? invitation.featureSettings
          : JSON.parse((invitation.featureSettings as string) || "{}");
      } catch {
        return {};
      }
    })();

    const maxContributors = typeof fs.memoriesMaxContributors === "number" ? fs.memoriesMaxContributors : planQuota.maxContributors;
    const shotsQuota = typeof fs.memoriesShotsQuota === "number" ? fs.memoriesShotsQuota : planQuota.shotsQuota;
    const extraPhotos = typeof fs.extraMemoriesQuota === "number" ? Math.max(0, fs.extraMemoriesQuota) : 0;
    const baseTotalPhotos = planQuota.totalQuota > 0 ? planQuota.totalQuota : (maxContributors * shotsQuota);
    const maxTotalPhotos = baseTotalPhotos + extraPhotos;

    const distinctContributors = await prisma.guestMemory.findMany({
      where: { invitationId: id },
      select: { senderEmail: true },
      distinct: ["senderEmail"],
    });

    const usedPhotos = memories.length;
    const usedContributors = distinctContributors.length;
    const remainingPhotos = Math.max(0, maxTotalPhotos - usedPhotos);

    return NextResponse.json({
      success: true,
      total: memories.length,
      memories,
      pendingOrder: activePendingOrder,
      quota: {
        planType: invitation.order?.planType || "MODERN",
        maxContributors,
        shotsQuota,
        baseTotalPhotos,
        extraMemoriesQuota: extraPhotos,
        maxTotalPhotos,
        usedPhotos,
        remainingPhotos,
        usedContributors,
        hasAccess: planQuota.hasAccess,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const access = await verifyClientAccess(id);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized / Not Found" }, { status: 403 });
    }
    const { invitation } = access;

    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get("memoryId");

    if (!memoryId) {
      return NextResponse.json({ error: "Memory ID wajib disertakan." }, { status: 400 });
    }

    const memory = await prisma.guestMemory.findUnique({
      where: { id: memoryId },
    });

    if (!memory || memory.invitationId !== id) {
      return NextResponse.json({ error: "Data memori tidak ditemukan." }, { status: 404 });
    }

    // Attempt to delete physical file / R2 file
    if (memory.mediaUrl) {
      try {
        const { deleteFile } = await import("@/lib/storage");
        await deleteFile(memory.mediaUrl);
      } catch (fileErr) {
        console.error("Failed to delete memory file:", fileErr);
      }
    }

    await prisma.guestMemory.delete({
      where: { id: memoryId },
    });

    // Auto-rebake if published
    if (invitation.status === "PUBLISHED") {
      try {
        await buildAndSavePublishedHtml(invitation.id);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Foto/video kenangan berhasil dihapus.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal menghapus memori." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const access = await verifyClientAccess(id);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized / Not Found" }, { status: 403 });
    }
    const { invitation } = access;

    const body = await req.json().catch(() => ({}));
    const rawQuota = body.shotsQuota ?? body.memoriesShotsQuota;
    const shotsQuota = Number(rawQuota);

    if (isNaN(shotsQuota) || shotsQuota < 1 || shotsQuota > 30) {
      return NextResponse.json(
        { error: "Jatah roll per tamu harus berupa angka antara 1 sampai 30." },
        { status: 400 }
      );
    }

    const currentFs = (() => {
      try {
        return typeof invitation.featureSettings === "object"
          ? (invitation.featureSettings || {})
          : JSON.parse((invitation.featureSettings as string) || "{}");
      } catch {
        return {};
      }
    })();

    const updatedFs = {
      ...currentFs,
      memoriesShotsQuota: shotsQuota,
    };

    await prisma.invitation.update({
      where: { id },
      data: {
        featureSettings: JSON.stringify(updatedFs),
      },
    });

    return NextResponse.json({
      success: true,
      shotsQuota,
      message: `Jatah roll kamera berhasil diatur menjadi ${shotsQuota} foto per tamu.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memperbarui jatah roll." }, { status: 500 });
  }
}
