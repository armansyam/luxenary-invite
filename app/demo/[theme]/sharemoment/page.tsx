import { Metadata } from "next";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
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
  const coupleName = demo ? `${demo.groomName} & ${demo.brideName}` : "Demo";

  return {
    title: `Upload Momen (${coupleName}) — ${platformName}`,
    description: `Demo fitur bagikan foto candid dan ucapan untuk pernikahan ${coupleName}.`,
  };
}

export default async function DemoGuestMemoriesStandalonePage({ params }: PageProps) {
  const { theme } = await params;
  const cleanId = (theme || "kalandra").toLowerCase().trim();
  const demo = getDemoThemeData(cleanId);

  if (!demo) {
    notFound();
  }

  const coupleName = `${demo.groomName} & ${demo.brideName}`;
  const invitationId = `demo-${demo.themeId}`;
  
  // Use theme cover photo for demo background
  const coverUrl = `/demo/${demo.themeId}/cover.webp`;

  const backUrl = `/demo/${demo.themeId}`;
  const galleryUrl = `/demo/${demo.themeId}/memories`;

  // Local theme highlight resolution (use memory_0X if exists, otherwise fallback to gallery_0X)
  const demoDir = path.join(process.cwd(), "public", "demo", demo.themeId);
  const getMediaUrl = (num: string) => {
    if (fs.existsSync(path.join(demoDir, `memory_${num}.webp`))) {
      return `/demo/${demo.themeId}/memory_${num}.webp`;
    }
    return `/demo/${demo.themeId}/gallery_${num}.webp`;
  };

  // Sample memories for demo using 100% self-hosted local theme photos
  const memories = [
    {
      id: "demo-1",
      senderName: "Budi Santoso",
      mediaUrl: getMediaUrl("01"),
      mediaType: "PHOTO",
      message: `Selamat berbahagia untuk ${coupleName}! Sakinah mawaddah warahmah 🎉`,
    },
    {
      id: "demo-2",
      senderName: "Sahabat SMA (Dimas)",
      mediaUrl: getMediaUrl("02"),
      mediaType: "PHOTO",
      message: "Happy wedding bro! Langgeng dan bahagia selalu sampai akhir hayat 🥂",
    },
    {
      id: "demo-3",
      senderName: "Rina & Teman Kuliah",
      mediaUrl: getMediaUrl("03"),
      mediaType: "PHOTO",
      message: "Cantik dan gagah banget hari ini! Semoga selalu dalam lindungan-Nya ✨",
    },
    {
      id: "demo-4",
      senderName: "Keluarga Besar Tante Maya",
      mediaUrl: getMediaUrl("04"),
      mediaType: "PHOTO",
      message: "Selamat menempuh hidup baru! Semoga rukun dan berkah pernikahannya.",
    },
  ];

  return (
    <GuestMomentClient 
      invitationId={invitationId}
      coupleName={coupleName}
      coverUrl={coverUrl}
      memories={memories}
      galleryUrl={galleryUrl}
      backUrl={backUrl}
    />
  );
}
