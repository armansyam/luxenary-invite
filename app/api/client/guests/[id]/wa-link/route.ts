import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getInvitationPublicUrl, getPermanentPathUrl } from "@/lib/domainUtils";

/**
 * Generate a WhatsApp link for sending the invitation
 * to a specific guest.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const guest = await prisma.guest.findUnique({
    where: { id },
    include: { invitation: true },
  });

  if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

  const inv = guest.invitation;
  const invitationUrl = inv.subdomain
    ? getInvitationPublicUrl(inv.subdomain, guest.name)
    : getPermanentPathUrl(inv.groomSlug, inv.brideSlug, inv.invitationSlug, guest.name);

  const waMessage = encodeURIComponent(
    `Assalamu'alaikum ${guest.name.split(" ")[0]},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: ${invitationUrl}\n\nHormat kami,\n${inv.groomName || inv.groomNickname || "Pengantin Pria"} & ${inv.brideName || inv.brideNickname || "Pengantin Wanita"}`
  );

  const phoneVal = guest.phone || guest.phoneNumber;
  const waLink = phoneVal
    ? `https://wa.me/${phoneVal.replace(/\D/g, "")}?text=${waMessage}`
    : `https://api.whatsapp.com/send?phone=&text=${waMessage}`;

  return NextResponse.json({ waLink, guest, invitationUrl });
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

  const inv = guest.invitation;
  const invitationUrl = inv.subdomain
    ? getInvitationPublicUrl(inv.subdomain, guest.name)
    : getPermanentPathUrl(inv.groomSlug, inv.brideSlug, inv.invitationSlug, guest.name);

  const waMessage = encodeURIComponent(
    `Assalamu'alaikum ${guest.name.split(" ")[0]},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: ${invitationUrl}\n\nHormat kami,\n${inv.groomName || inv.groomNickname || "Pengantin Pria"} & ${inv.brideName || inv.brideNickname || "Pengantin Wanita"}`
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
    return NextResponse.json({ waLink, redirect: true, invitationUrl });
  }

  return NextResponse.json({ waLink, status: "sent", invitationUrl });
}