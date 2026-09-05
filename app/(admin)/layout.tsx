import type { Metadata } from "next";
import { getPublicPlatformSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  const brand = settings.platformName || "Luxenary";

  return {
    title: {
      default: `${brand} Admin — Control Panel`,
      template: `%s | ${brand} Admin`,
    },
    description: `Control panel administrator platform ${brand}`,
    icons: {
      icon: [
        { url: `/assets/brand/favicon.png?t=${Date.now()}`, type: "image/png" },
        { url: `/favicon.ico?t=${Date.now()}` },
      ],
      shortcut: `/assets/brand/favicon.png?t=${Date.now()}`,
      apple: `/assets/brand/favicon.png?t=${Date.now()}`,
    },
  };
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
