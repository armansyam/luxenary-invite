import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { getPublicPlatformSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  
  return {
    title: settings.platformName || "Luxenary Invite",
    description: settings.heroTagline || "Platform undangan pernikahan digital self-service",
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
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
