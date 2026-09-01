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
  });

  if (!invitation) return null;

  const isOwner = invitation.userId === session.user.id;
  const isAdmin =
    (session.user as any)?.isAdmin === true ||
    (session.user as any)?.role === "SUPER_ADMIN" ||
    (session.user as any)?.role === "ADMIN";

  if (!isOwner && !isAdmin) return null;

  return invitation;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const invitation = await verifyClientAccess(id);
    if (!invitation) {
      return NextResponse.json({ error: "Unauthorized / Not Found" }, { status: 403 });
    }

    const memories = await prisma.guestMemory.findMany({
      where: { invitationId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      total: memories.length,
      memories,
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

    const invitation = await verifyClientAccess(id);
    if (!invitation) {
      return NextResponse.json({ error: "Unauthorized / Not Found" }, { status: 403 });
    }

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
