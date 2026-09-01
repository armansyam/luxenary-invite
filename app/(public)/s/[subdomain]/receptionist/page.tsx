import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReceptionistScannerClient from "@/app/components/features/ReceptionistScannerClient";
import StaffLockScreen from "@/app/components/features/StaffLockScreen";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function ReceptionistPage({ params }: PageProps) {
  const { subdomain } = await params;
  if (!subdomain) notFound();

  const invitation = await prisma.invitation.findUnique({
    where: { subdomain },
    select: { id: true, staffPin: true }
  });

  if (!invitation) notFound();

  const pin = invitation.staffPin || "123456";

  return (
    <StaffLockScreen invitationId={invitation.id}>
      <ReceptionistScannerClient invitationId={invitation.id} />
    </StaffLockScreen>
  );
}
