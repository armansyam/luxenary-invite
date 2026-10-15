import { Metadata } from "next";
import { notFound } from "next/navigation";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";
import { getAdminSetting } from "@/lib/settings";
import { getDemoThemeData } from "@/lib/demoRegistry";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ theme: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { theme } = await params;
  const cleanId = (theme || "kalandra").toLowerCase().trim();
  const demo = getDemoThemeData(cleanId);
  const platformName = await getAdminSetting("platform_name", "Platform Undangan");
  const coupleName = demo ? (demo.eventType === "BIRTHDAY" ? ((demo as any).personName || "Ulang Tahun") : `${demo.groomName} & ${demo.brideName}`) : "Demo";

  return {
    title: `Upload Momen (${coupleName}) — ${platformName}`,
    description: `Demo fitur bagikan foto candid dan ucapan untuk acara ${coupleName}.`,
  };
}

export default async function DemoGuestMemoriesStandalonePage({ params }: PageProps) {
  const { theme } = await params;
  const cleanId = (theme || "kalandra").toLowerCase().trim();
  const demo = getDemoThemeData(cleanId);

  if (!demo) {
    notFound();
  }

  const coupleName = demo.eventType === "BIRTHDAY" ? ((demo as any).personName || "Ulang Tahun") : `${demo.groomName} & ${demo.brideName}`;
  const invitationId = `demo-${demo.themeId}`;
  
  // Use theme cover photo for demo background
  const coverUrl = `/demo/${demo.themeId}/cover.webp`;

  const backUrl = `/demo/${demo.themeId}`;
  const galleryUrl = `/demo/memories?theme=${demo.themeId}`;

  return (
    <GuestMomentClient
      invitationId={invitationId}
      coupleName={coupleName}
      coverUrl={coverUrl}
      galleryUrl={galleryUrl}
      backUrl={backUrl}
      isTestMode={true}
    />
  );
}
