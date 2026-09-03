import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/resolve-custom-domain?host=namapasangan.com
 *
 * Digunakan oleh middleware untuk memetakan custom domain klien
 * ke subdomain internal sistem.
 *
 * Respons:
 *   { subdomain: "namapasangan" }     → jika domain ditemukan dan aktif
 *   { error: "..." }                  → jika domain tidak ditemukan / tidak aktif
 */
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host");

  if (!host) {
    return NextResponse.json({ error: "Parameter host wajib disertakan." }, { status: 400 });
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      customDomain: host.toLowerCase().trim(),
      status: { in: ["PUBLISHED", "EVENT_FINISHED"] },
    },
    select: {
      subdomain: true,
      status: true,
      invitationSlug: true,
    },
  });

  if (!invitation || !invitation.subdomain) {
    return NextResponse.json({ error: "Domain tidak terdaftar atau undangan belum aktif." }, { status: 404 });
  }

  return NextResponse.json(
    {
      subdomain: invitation.subdomain,
      status: invitation.status,
      slug: invitation.invitationSlug,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    }
  );
}
