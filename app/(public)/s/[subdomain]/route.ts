import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSubdomainExpired } from "@/lib/domainUtils";
import { getPublishedHtml, buildAndSavePublishedHtml } from "@/lib/staticPublisher";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { invitationLookupCache, invalidateInvitationLookup } from "@/lib/cache";
import { hasPlanCapability } from "@/lib/settings";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { getDynamicServerApexUrl } from "@/lib/serverDomainUtils";
import { canPreviewInvitation } from "@/lib/previewAccess";

export async function GET(req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  
  if (!subdomain) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const previewParam = req.nextUrl.searchParams.get("preview");

  // L1 Memory Cache: Hilangkan query basis data redundant pada routing subdomain
  const cacheKey = `subdomain:${subdomain}`;
  let invitation = !previewParam ? invitationLookupCache.get(cacheKey) : null;

  if (!invitation) {
    // Strict lookup by active unique subdomain
    invitation = await prisma.invitation.findUnique({
      where: { subdomain },
      include: {
        order: { select: { planType: true } },
      },
    });

    if (invitation && !previewParam && (invitation.status === "PUBLISHED" || invitation.status === "EVENT_FINISHED")) {
      invitationLookupCache.set(cacheKey, invitation, 60_000);
    }
  }

  if (!invitation) {
    // If subdomain is vacant / released, redirect to homepage with info
    const rootUrl = await getDynamicServerApexUrl(subdomain);
    return NextResponse.redirect(`${rootUrl}/?notice=subdomain-available`, 307);
  }

  const isPreview = await canPreviewInvitation(invitation, previewParam);

  if (invitation.status === "TAKEN_DOWN" && !isPreview) {
    return new NextResponse("Undangan ini telah diturunkan.", { status: 410 });
  }


  // Jika undangan masih berstatus DRAFT (belum dipublikasikan)
  if (invitation.status === "DRAFT") {
    if (!isPreview) {
      const unreleasedHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Undangan Belum Dipublikasikan</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: radial-gradient(circle at top, #1c1917 0%, #0c0a09 100%);
      color: #fafaf9;
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: rgba(28, 25, 23, 0.85);
      border: 1px solid rgba(217, 119, 6, 0.25);
      border-radius: 1.5rem;
      padding: 2.5rem 2rem;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      background: rgba(217, 119, 6, 0.15);
      border: 1px solid rgba(217, 119, 6, 0.3);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #f59e0b;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; color: #fff; }
    p { font-size: 0.875rem; color: #a8a29e; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Belum Dipublikasikan</span>
    <h1>Undangan Sedang Disiapkan</h1>
    <p>Halaman undangan pernikahan ini masih dalam tahap penyusunan dan belum dipublikasikan secara resmi oleh penyelenggara.</p>
  </div>
</body>
</html>`;

      return new NextResponse(unreleasedHtml, {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  // Jika undangan berstatus EVENT_FINISHED (Mode Galeri Kenangan Pasca-Acara Aktif)
  if (invitation.status === "EVENT_FINISHED" && !isPreview) {
    const viewInvitation = req.nextUrl.searchParams.get("view") === "invitation";
    if (!viewInvitation) {
      const canAccessMemories = await hasPlanCapability(invitation.order?.planType, "guest_memories");
      if (canAccessMemories) {
        const search = req.nextUrl.search;
        const redirectUrl = new URL(`/memories${search}`, req.url);
        return NextResponse.redirect(redirectUrl, 307);
      }
    }
  }

  // Setelah masa tenggang subdomain (subdomain_grace_days dari acara utama) atau saat ARCHIVED, subdomain
  // tidak lagi melayani; slug menjadi gerbang utama (portofolio/arsip/beranda diputuskan oleh rute slug).
  const lifecycleSettings = await getLifecycleSettings();
  const isPastGrace = isSubdomainExpired(invitation.eventData, lifecycleSettings.subdomainGraceDays);

  if (!isPreview && (invitation.status === "ARCHIVED" || (lifecycleSettings.autoRecycleSubdomain && isPastGrace))) {
    if (lifecycleSettings.autoRecycleSubdomain && isPastGrace) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { subdomain: null },
      });
      invalidateInvitationLookup(invitation.invitationSlug, invitation.subdomain);
    }
    const rootUrl = await getDynamicServerApexUrl(subdomain);
    return NextResponse.redirect(`${rootUrl}/${invitation.invitationSlug}`, 307);
  }

  let html: string | null = null;
  if (invitation.status === "DRAFT" || isPreview) {
    // Mode DRAFT / Preview: Selalu render data mutakhir langsung dari DB (Dynamic Live Preview)
    const data = await composeTemplateData(invitation.id);
    if (data && invitation.themeId) {
      html = await renderTemplateFile(invitation.themeId, data, { editMode: false, invitationId: invitation.id });
    }
  } else {
    // Mode PUBLISHED: Gunakan file statis yang telah dibake (Zero Overhead)
    html = await getPublishedHtml(invitation.id);
    if (!html) {
      html = await buildAndSavePublishedHtml(invitation.id);
    }
  }

  if (!html) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Handle guest parameter dynamically if present
  const searchParams = req.nextUrl.searchParams;
  const to = searchParams.get('to') || searchParams.get('v');
  
  if (to) {
    // If the template engine uses a specific placeholder for the guest name, we can inject it here.
    // For now, the client-side JS typically reads the URL params, but if needed, we can replace it.
  }

  const responseHeaders: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
  };

  if (invitation.status === "PUBLISHED" && !isPreview) {
    // Edge Cache Cloudflare: s-maxage 7 hari, browser cache 60 detik, revalidasi di background
    responseHeaders["Cache-Control"] = "public, max-age=60, s-maxage=604800, stale-while-revalidate=86400";
  } else {
    // Mode Draft/Preview live editing: jangan di-cache agar instan terlihat saat edit
    responseHeaders["Cache-Control"] = "no-store, no-cache, must-revalidate";
  }

  return new NextResponse(html, {
    headers: responseHeaders,
  });
}
