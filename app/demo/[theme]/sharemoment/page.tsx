import { Metadata } from "next";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ theme: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { theme } = await params;
  return {
    title: `Upload Momen (Demo) — Luxenary Invite`,
    description: `Demo fitur bagikan foto candid dan ucapan.`,
  };
}

export default async function DemoGuestMemoriesStandalonePage({ params }: PageProps) {
  const { theme } = await params;

  // Mock data for demo
  const invitationId = "demo";
  const coupleName = "Raditya & Alana";
  
  // Use a nice generic cover or prewedding photo for demo background
  const coverUrl = "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80";

  const backUrl = `/demo/${theme}`;
  const galleryUrl = `/demo/${theme}/memories`;

  // Sample memories for demo
  const memories = [
    {
      id: "demo-1",
      senderName: "Budi Santoso",
      mediaUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80",
      mediaType: "PHOTO",
      message: "Selamat menempuh hidup baru bro! Sakinah mawaddah warahmah.",
    },
    {
      id: "demo-2",
      senderName: "Anya Geraldine",
      mediaUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80",
      mediaType: "PHOTO",
      message: "Happy wedding kalian! Semoga bahagia selalu ya.",
    }
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
