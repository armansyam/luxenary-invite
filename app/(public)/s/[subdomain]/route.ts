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
