import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { uploadFile, deleteFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_PROOF_BYTES = 10 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sessionUserId = (session.user as any).id;
    const sessionEmail = session.user.email || "";

    const isAdmin = hasAdminPermission(session.user, "orders");

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Verify ownership via userId OR user email
    const isOwner =
      order.userId === sessionUserId ||
      (sessionEmail && order.user?.email?.toLowerCase() === sessionEmail.toLowerCase());

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Akses ditolak. Order ini bukan milik akun Anda." }, { status: 403 });
    }

    if (order.status === "PAID") {
      return NextResponse.json({ error: "Pesanan ini sudah dibayar dan aktif." }, { status: 400 });
    }

    const platformMode = (await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } }))?.value;
    if (platformMode !== "MANUAL" && order.paymentMethod !== "MANUAL_TRANSFER" && !order.proofImageUrl) {
      return NextResponse.json(
        { error: "Transfer manual tidak aktif. Selesaikan pembayaran lewat payment gateway." },
        { status: 409 }
      );
    }

    // Tolak jika order ini sudah digantikan oleh invoice baru yang aktif (superseded)
    const newerActiveOrder = await prisma.order.findFirst({
      where: {
        userId: order.userId,
        id: { not: order.id },
        createdAt: { gt: order.createdAt },
        status: { in: ["PENDING", "PAID"] },
      },
    });

    if (newerActiveOrder) {
      return NextResponse.json(
        { error: "Tagihan ini sudah tidak berlaku karena Anda memiliki tagihan baru yang sedang aktif." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File bukti pembayaran tidak ditemukan" }, { status: 400 });
    }

    // Generate clean chronological file name: YYYY-MM-DD-HHmmss-username.webp
    const rawEmail = sessionEmail || order.user?.email || "client";
    const cleanEmailUser = rawEmail.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const datePrefix = `${yyyy}-${mm}-${dd}-${hh}${min}${ss}`;

    // Komponen acak membuat URL tidak dapat ditebak dari tanggal dan nama pengguna: bukti transfer memuat rekening dan nominal.
    const proofBaseName = `${datePrefix}-${cleanEmailUser}-${randomBytes(12).toString("hex")}`;
    const fileName = `${proofBaseName}.webp`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type.toLowerCase();

    if (buffer.length === 0 || buffer.length > MAX_PROOF_BYTES) {
      return NextResponse.json({ error: "Ukuran file bukti transfer harus antara 1 byte dan 10 MB." }, { status: 400 });
    }

    // Pembersihan hanya dijalankan setelah bukti baru tersimpan, agar kegagalan unggah tidak menghilangkan bukti lama.
    const cleanupSuperseded = async (newProofUrl: string) => {
      if (order.proofImageUrl && order.proofImageUrl !== newProofUrl) {
        try {
          await deleteFile(order.proofImageUrl);
        } catch (err) {
          console.error("Gagal menghapus bukti pembayaran lama:", err);
        }
      }

      // Bersihkan order usang lainnya milik user ini (status PENDING / FAILED non-PAID) beserta file struknya di storage
      try {
        const obsoleteOrders = await prisma.order.findMany({
          where: {
            userId: order.userId,
            id: { not: order.id },
            status: { in: ["PENDING", "FAILED"] },
            orderType: "NEW",
          },
          select: { id: true, proofImageUrl: true },
        });

        for (const obs of obsoleteOrders) {
          if (obs.proofImageUrl) {
            try {
              await deleteFile(obs.proofImageUrl);
            } catch (e) {
              console.error("Gagal menghapus file bukti order usang:", e);
            }
          }
        }

        if (obsoleteOrders.length > 0) {
          await prisma.order.deleteMany({
            where: {
              id: { in: obsoleteOrders.map((o) => o.id) },
            },
          });
        }
      } catch (cleanupErr) {
        console.error("Gagal membersihkan order usang user:", cleanupErr);
      }
    };

    let publicUrl: string;
    if (mime.includes("pdf")) {
      if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
        return NextResponse.json({ error: "File PDF tidak valid." }, { status: 400 });
      }
      publicUrl = await uploadFile(buffer, `proofs/${proofBaseName}.pdf`, mime);
    } else {
      // High-Resolution Sharp Compression for Images:
      // Max width 1400px (crystal sharp text legibility for receipts, file size ~100KB-200KB)
      let compressedWebp: Buffer;
      try {
        compressedWebp = await sharp(buffer)
          .rotate() // Auto-orient based on EXIF
          .resize({
            width: 1400,
            height: 2000,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({
            quality: 82, // Optimal balance: razor-sharp text & lightweight file size
            effort: 4,
          })
          .toBuffer();
      } catch {
        return NextResponse.json(
          { error: "File bukan gambar atau PDF yang valid. Unggah foto bukti transfer (JPG, PNG, WebP) atau PDF." },
          { status: 400 }
        );
      }
      publicUrl = await uploadFile(compressedWebp, `proofs/${fileName}`, "image/webp");
    }

    // Update bersyarat: order yang baru saja lunas (webhook / persetujuan admin) tidak boleh dikembalikan ke PENDING
    const saved = await prisma.order.updateMany({
      where: { id: order.id, status: { in: ["PENDING", "FAILED"] } },
      data: {
        paymentMethod: "MANUAL_TRANSFER",
        proofImageUrl: publicUrl,
        proofUploadedAt: new Date(),
        status: "PENDING",
        paidAt: null,
        rejectReason: null,
      },
    });
    if (saved.count === 0) {
      await deleteFile(publicUrl);
      return NextResponse.json({ error: "Pesanan sudah diproses dan tidak dapat menerima bukti baru. Muat ulang halaman." }, { status: 409 });
    }

    await cleanupSuperseded(publicUrl);

    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    return NextResponse.json({
      success: true,
      message: "Bukti transfer berhasil dikirim. Tim admin akan segera memverifikasi pembayaran Anda.",
      proofImageUrl: publicUrl,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentMethod: updatedOrder.paymentMethod,
        proofImageUrl: updatedOrder.proofImageUrl,
        proofUploadedAt: updatedOrder.proofUploadedAt,
      },
    });
  } catch (error: any) {
    console.error("[Upload-Proof-Error]:", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal mengunggah bukti transfer" : (error.message || "Gagal mengunggah bukti transfer") }, { status: 500 });
  }
}
