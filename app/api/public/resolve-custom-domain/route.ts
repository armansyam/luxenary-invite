import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/resolve-custom-domain?host=arman-siti.com
 *
 * Digunakan oleh middleware untuk memetakan custom domain klien
 * ke subdomain internal sistem.
 *
 * Respons:
 *   { subdomain: "arman-siti" }     → jika domain ditemukan dan aktif
 *   { error: "..." }                → jika domain tidak ditemukan / tidak aktif
 */
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host");

  if (!host) {
    return NextResponse.json({ error: "Parameter host wajib disertakan." }, { status: 400 });
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      customDomain: host.toLowerCase().trim(),
      status: "PUBLISHED",
    },
    select: {
      subdomain: true,
    },
  });

  if (!invitation || !invitation.subdomain) {
    return NextResponse.json({ error: "Domain tidak terdaftar atau undangan belum aktif." }, { status: 404 });
  }

  return NextResponse.json(
    { subdomain: invitation.subdomain },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    }
  );
}
