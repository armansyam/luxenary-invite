import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";
import { hasPlanCapability } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * POST /api/client/custom-domain/buy
 * Membuat order untuk pembelian Add-on Custom Domain (Jasa Integrasi)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { invitationId, requestedDomain } = body;

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId wajib disertakan." }, { status: 400 });
    }

    if (!requestedDomain || typeof requestedDomain !== "string") {
      return NextResponse.json({ error: "Domain yang diminta (requestedDomain) wajib disertakan." }, { status: 400 });
    }

    const cleanDomain = requestedDomain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/\s/g, "").trim();

    if (!cleanDomain.includes(".") || cleanDomain.length < 4) {
      return NextResponse.json({ error: "Format domain tidak valid." }, { status: 400 });
    }

    // Proteksi domain sistem
    const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").trim().toLowerCase();
    const reservedPlatformHosts = [rootDomain, "localhost", "127.0.0.1"].filter(Boolean);
    if (reservedPlatformHosts.some((h) => cleanDomain === h || cleanDomain.endsWith(`.${h}`))) {
      return NextResponse.json({ error: "Domain tersebut merupakan domain platform sistem dan tidak dapat digunakan." }, { status: 400 });
    }

    // 1. Verifikasi kepemilikan undangan
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        order: { select: { planType: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    const isOwner = invitation.userId === session.user.id;
    const isAdmin = (session.user as any)?.isAdmin === true || (session.user as any)?.role === "SUPER_ADMIN" || (session.user as any)?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    // Cek apakah domain sudah dipakai undangan lain
    const existingDomain = await prisma.invitation.findFirst({
      where: {
        customDomain: cleanDomain,
        id: { not: invitationId },
      },
      select: { id: true },
    });
    if (existingDomain) {
      return NextResponse.json({ error: "Domain tersebut sudah digunakan oleh undangan lain di sistem." }, { status: 400 });
    }

    // 2. Cek status aktivasi fitur Custom Domain
    const enabledSetting = await prisma.adminSetting.findUnique({
      where: { key: "custom_domain_enabled" },
    });
    const isCustomDomainEnabled = enabledSetting ? enabledSetting.value !== "false" : true;
    if (!isCustomDomainEnabled) {
      return NextResponse.json(
        { error: "Layanan integrasi custom domain saat ini sedang dinonaktifkan atau belum tersedia (Coming Soon)." },
        { status: 403 }
      );
    }

    // Simpan domain langsung ke undangan (Gratis / Included dalam paket)
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { customDomain: cleanDomain },
    });

    return NextResponse.json({
      success: true,
      customDomain: cleanDomain,
      message: "Custom domain berhasil disimpan dan ditautkan ke undangan Anda.",
    });
  } catch (error: any) {
    console.error("[Custom Domain Order Error]", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message },
      { status: 500 }
    );
  }
}
