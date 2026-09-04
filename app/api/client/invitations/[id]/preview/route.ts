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

    if (!invitation.themeId) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tema Belum Dipilih - Luxenary</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-stone-50 flex items-center justify-center min-h-screen p-4 font-sans text-stone-800">
          <div class="max-w-md w-full bg-white rounded-2xl p-8 border border-stone-200 shadow-sm text-center space-y-4">
            <div class="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-800">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-stone-900 font-serif">Tema Belum Dipilih</h2>
            <p class="text-sm text-stone-600 leading-relaxed">
              Undangan ini belum memiliki desain tema. Silakan kembali ke Studio Editor dan pilih salah satu tema yang tersedia di <strong>Seksi 1 (Tema Desain &amp; Palet Warna)</strong> untuk melihat pratinjau.
            </p>
          </div>
        </body>
        </html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, max-age=0, must-revalidate",
          },
        }
      );
    }

    const html = await renderTemplateFile(invitation.themeId, data, { editMode: isEditMode, invitationId: id });

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
