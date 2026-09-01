import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getInvitationPublicUrl, getPermanentPathUrl } from "@/lib/domainUtils";
import { getPublicPlatformSettings } from "@/lib/settings";

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
    : getPermanentPathUrl(inv.invitationSlug, guest.name);

  const settings = await getPublicPlatformSettings();
  const waTemplate = settings.waTemplateMessage;
  
  const guestName = guest.name.split(" ")[0];
  const groomName = inv.groomName || inv.groomNickname || "Pengantin Pria";
  const brideName = inv.brideName || inv.brideNickname || "Pengantin Wanita";
  
  let displayOrder = "BRIDE_FIRST";
  try {
    if (inv.featureSettings) {
      const fs = JSON.parse(inv.featureSettings as string);
      displayOrder = fs.displayOrder || "BRIDE_FIRST";
    }
  } catch (e) {}
  
  const coupleNames = displayOrder === "GROOM_FIRST" ? `${groomName} & ${brideName}` : `${brideName} & ${groomName}`;
  
  const formattedMessage = waTemplate
    .replace(/\{\{GUEST_NAME\}\}/g, guestName)
    .replace(/\{\{INVITATION_URL\}\}/g, invitationUrl)
    .replace(/\{\{COUPLE_NAMES\}\}/g, coupleNames)
    .replace(/\{\{GROOM_NAME\}\}/g, groomName)
    .replace(/\{\{BRIDE_NAME\}\}/g, brideName);

  const waMessage = encodeURIComponent(formattedMessage);

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
    : getPermanentPathUrl(inv.invitationSlug, guest.name);

  const settings = await getPublicPlatformSettings();
  const waTemplate = settings.waTemplateMessage;
  
  const guestName = guest.name.split(" ")[0];
  const groomName = inv.groomName || inv.groomNickname || "Pengantin Pria";
  const brideName = inv.brideName || inv.brideNickname || "Pengantin Wanita";
  
  let displayOrder = "BRIDE_FIRST";
  try {
    if (inv.featureSettings) {
      const fs = JSON.parse(inv.featureSettings as string);
      displayOrder = fs.displayOrder || "BRIDE_FIRST";
    }
  } catch (e) {}
  
  const coupleNames = displayOrder === "GROOM_FIRST" ? `${groomName} & ${brideName}` : `${brideName} & ${groomName}`;
  
  const formattedMessage = waTemplate
    .replace(/\{\{GUEST_NAME\}\}/g, guestName)
    .replace(/\{\{INVITATION_URL\}\}/g, invitationUrl)
    .replace(/\{\{COUPLE_NAMES\}\}/g, coupleNames)
    .replace(/\{\{GROOM_NAME\}\}/g, groomName)
    .replace(/\{\{BRIDE_NAME\}\}/g, brideName);

  const waMessage = encodeURIComponent(formattedMessage);

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