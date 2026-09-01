import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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
