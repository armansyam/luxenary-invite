import { redirect } from "next/navigation";
import { getDemoThemeData } from "@/lib/demoRegistry";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ theme: string }>;
}

export default async function DemoGuestMemoriesGalleryPage({ params }: PageProps) {
  const { theme } = await params;
  const cleanId = (theme || "kalandra").toLowerCase().trim();
  const demo = getDemoThemeData(cleanId);
  const targetTheme = demo ? demo.themeId : "kalandra";

  redirect(`/demo/memories?theme=${targetTheme}`);
}

