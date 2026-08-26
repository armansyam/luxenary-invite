import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized. Silakan login terlebih dahulu.", { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return new NextResponse("ID Undangan tidak valid.", { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return new NextResponse("Undangan tidak ditemukan.", { status: 404 });
    }

    const isOwner = invitation.userId === session.user.id;
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return new NextResponse("Forbidden. Anda tidak memiliki akses ke preview ini.", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isEditMode = searchParams.get("mode") === "edit";

    const data = await composeTemplateData(invitation.id);
    if (!data) {
      return new NextResponse("Gagal memuat data template undangan.", { status: 500 });
    }

    const html = await renderTemplateFile(invitation.themeId || "kalandra", data, { editMode: isEditMode });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error rendering preview: ${err?.message || "Internal server error"}`, { status: 500 });
  }
}
