import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublishedHtml, buildAndSavePublishedHtml } from "@/lib/staticPublisher";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { invitationSlug: slug },
  });

  if (!invitation) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 1. Direct Static Serving: Load standalone HTML file if already baked
  let html = await getPublishedHtml(invitation.id);

  // 2. If not baked yet, compile standalone HTML and save for future instant requests
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
    // html = html.replace(/<span id="guest-name">.*?<\/span>/, `<span id="guest-name">${to}</span>`);
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
