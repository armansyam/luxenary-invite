import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> | { invitationId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const invitationId = resolvedParams.invitationId;

    if (!invitationId) {
      return NextResponse.json({ error: "Missing invitationId" }, { status: 400 });
    }

    // Galeri hanya untuk undangan yang sudah terbit: draf dan undangan yang diturunkan tidak boleh membocorkan fotonya.
    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId }, select: { status: true } });
    if (!invitation || invitation.status === "DRAFT" || invitation.status === "TAKEN_DOWN") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const memories = await prisma.guestMemory.findMany({
      where: { invitationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        senderName: true,
        mediaType: true,
        mediaUrl: true,
        thumbnailUrl: true,
      },
    });

    const mappedMemories = memories.map((m) => ({
      ...m,
      source: "GUEST",
    }));

    // Cache di Cloudflare 30 detik — absorb spike tanpa data terlalu stale
    // Upload baru tamu tetap tampil dalam ≤30 detik
    return NextResponse.json(mappedMemories, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err: any) {
    console.error("Public Memories Fetch Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
