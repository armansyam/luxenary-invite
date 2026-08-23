import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Generate a WhatsApp link for sending the invitation
 * to a specific guest.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const guest = await prisma.guest.findUnique({
    where: { id },
    include: { invitation: true },
  });

  if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

  // Build the invitation URL
  const baseUrl = process.env.BASE_URL || `http://localhost:3000`;
  const invitationUrl = guest.invitation.subdomain
    ? `https://${guest.invitation.subdomain}`
    : `${baseUrl}/${guest.invitation.groomSlug}-${guest.invitation.brideSlug}/${guest.invitation.invitationSlug}`;

  const waMessage = encodeURIComponent(
    `Assalamu'alaikum ${guest.name.split(" ")[0]},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: ${invitationUrl}?to=${encodeURIComponent(guest.name)}\n\nHormat kami,\n${guest.invitation.groomName} & ${guest.invitation.brideName}`
  );

  const phoneVal = guest.phone || guest.phoneNumber;
  const waLink = phoneVal
    ? `https://wa.me/${phoneVal.replace(/\D/g, "")}?text=${waMessage}`
    : `https://api.whatsapp.com/send?phone=&text=${waMessage}`;

  return NextResponse.json({ waLink, guest });
}

/**
 * Send WhatsApp invitation to a single guest
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { sendMode = "redirect" } = await req.json(); // redirect | api | bulk

  const guest = await prisma.guest.findUnique({
    where: { id },
    include: { invitation: true },
  });

  if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

  const baseUrl = process.env.BASE_URL || `http://localhost:3000`;
  const invitationUrl = guest.invitation.subdomain
    ? `https://${guest.invitation.subdomain}`
    : `${baseUrl}/${guest.invitation.groomSlug}-${guest.invitation.brideSlug}/${guest.invitation.invitationSlug}`;

  const waMessage = encodeURIComponent(
    `Assalamu'alaikum ${guest.name.split(" ")[0]},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: ${invitationUrl}?to=${encodeURIComponent(guest.name)}\n\nHormat kami,\n${guest.invitation.groomName} & ${guest.invitation.brideName}`
  );

  const targetPhone = guest.phone || guest.phoneNumber;
  const waLink = targetPhone
    ? `https://wa.me/${targetPhone.replace(/\D/g, "")}?text=${waMessage}`
    : `https://api.whatsapp.com/send?phone=&text=${waMessage}`;

  // Update waStatus
  await prisma.guest.update({
    where: { id },
    data: { waStatus: "SENT" },
  });

  if (sendMode === "redirect") {
    return NextResponse.json({ waLink, redirect: true });
  }

  // If using API mode (future integration with WaBridge/360Dialog), we'd POST here
  return NextResponse.json({ waLink, status: "sent" });
}