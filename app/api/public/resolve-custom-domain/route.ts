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
 *   { slug: "namapasangan-1234" }     → jika domain ditemukan dan aktif
 *   { error: "..." }                  → jika domain tidak ditemukan / tidak aktif
 */
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host") || req.nextUrl.searchParams.get("domain");

  if (!host) {
    return NextResponse.json({ error: "Parameter host atau domain wajib disertakan." }, { status: 400 });
  }

  const cleanHost = host.toLowerCase().trim();
  const hostWithoutWww = cleanHost.replace(/^www\./, "");
  const hostWithWww = cleanHost.startsWith("www.") ? cleanHost : `www.${cleanHost}`;

  const invitation = await prisma.invitation.findFirst({
    where: {
      OR: [
        { customDomain: cleanHost },
        { customDomain: hostWithoutWww },
        { customDomain: hostWithWww },
      ],
      status: { in: ["PUBLISHED", "EVENT_FINISHED"] },
    },
    select: {
      subdomain: true,
      status: true,
      invitationSlug: true,
    },
  });

  if (!invitation || !invitation.invitationSlug) {
    return NextResponse.json({ error: "Domain tidak terdaftar atau undangan belum aktif." }, { status: 404 });
  }

  return NextResponse.json(
    {
      subdomain: invitation.subdomain, // Masih dikirim untuk backward compatibility jika diperlukan
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
