import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSubdomainExpired } from "@/lib/domainUtils";
import { getPublishedHtml, buildAndSavePublishedHtml } from "@/lib/staticPublisher";

export async function GET(req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  
  if (!subdomain) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Strict lookup by active unique subdomain
  const invitation = await prisma.invitation.findUnique({
    where: { subdomain },
  });

  if (!invitation) {
    // If subdomain is vacant / released, redirect to homepage with info
    return NextResponse.redirect(new URL("/?notice=subdomain-available", req.url));
  }

  // Jika acara sudah selesai, alihkan otomatis ke Galeri Momen
  if (invitation.status === "EVENT_FINISHED") {
    const memoriesUrl = new URL(`/s/${subdomain}/memories`, req.url);
    memoriesUrl.search = req.nextUrl.search;
    return NextResponse.redirect(memoriesUrl);
  }

  // Jika undangan masih berstatus DRAFT (belum dipublikasikan)
  if (invitation.status === "DRAFT") {
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

  // Check if subdomain has expired (> 7 days post event)
  let eventDateToTest: string | null = null;
  try {
    if (invitation.eventData) {
      const parsed = JSON.parse(invitation.eventData);
      if (Array.isArray(parsed) && parsed[0]?.date) {
        eventDateToTest = parsed[0].date;
      }
    }
  } catch {}

  if (isSubdomainExpired(eventDateToTest, 7)) {
    // Auto-release subdomain back to pool (invitation remains published on canonical path)
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { subdomain: null },
    });
    
    return NextResponse.redirect(new URL("/?notice=subdomain-expired", req.url));
  }

  // 1. Direct Static Serving
  let html = await getPublishedHtml(invitation.id);

  // 2. Fallback compilation
  if (!html) {
    html = await buildAndSavePublishedHtml(invitation.id);
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

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
