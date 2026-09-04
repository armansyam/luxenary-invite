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
    title: settings.platformName || "Sistem Undangan Digital",
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
const AMSDEV_WATERMARK = `
<!--
      _    __  __ ____  ____  _______     __
     / \\  |  \\/  / ___||  _ \\| ____\\ \\   / /
    / _ \\ | |\\/| \\___ \\| | | |  _|  \\ \\ / / 
   / ___ \\| |  | |___) | |_| | |___  \\ V /  
  /_/   \\_\\_|  |_|____/|____/|_____|  \\_/   

  ==============================================================
  STOP! PERHATIAN!
  --------------------------------------------------------------
  Sistem dan desain ini adalah milik eksklusif AMSDEV.
  Dilarang keras menyalin, menduplikasi, atau menjual ulang 
  tanpa izin resmi dari pihak AMSDEV.
  ==============================================================
-->
<script>
  (function() {
    try {
      if (window.console && console.log) {
        console.log("%cSTOP!", "color: #ef4444; font-size: 50px; font-weight: 900; text-shadow: 2px 2px 0 #000; font-family: sans-serif;");
        console.log("%cIni adalah properti eksklusif AMSDEV.", "color: #b5833c; font-size: 20px; font-weight: bold;");
        console.log("%cSegala bentuk pencurian kode, scraping, atau modifikasi ilegal akan direkam.\\nDomain saat ini: " + window.location.hostname, "font-size: 14px; color: #a8a29e;");
      }
    } catch(e) {}
  })();
</script>
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div dangerouslySetInnerHTML={{ __html: AMSDEV_WATERMARK }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
