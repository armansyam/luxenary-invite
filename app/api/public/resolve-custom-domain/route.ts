import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeLifecycleDates } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";

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
      status: { in: ["DRAFT", "PUBLISHED", "EVENT_FINISHED", "ARCHIVED"] },
    },
    select: {
      subdomain: true,
      status: true,
      invitationSlug: true,
      eventData: true,
    },
  });

  if (!invitation || !invitation.invitationSlug) {
    return NextResponse.json({ error: "Domain tidak terdaftar atau undangan belum aktif." }, { status: 404 });
  }

  // Custom domain mengikuti gerbang slug selama retention_custom_domain_days sejak acara utama
  const lifecycle = computeLifecycleDates({ eventData: invitation.eventData }, await getLifecycleSettings());
  if (lifecycle && Date.now() > lifecycle.customDomainExpiresAt.getTime()) {
    return NextResponse.json({ error: "Masa aktif custom domain telah berakhir." }, { status: 404 });
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
