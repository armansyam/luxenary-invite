import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#faf8f5",
  colorScheme: "light",
};
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  const brandName = settings.platformName || "Luxenary";
  const tagline = settings.heroTagline || "Undangan Pernikahan Digital Elegan, Hangat & Berkelas";
  const desc = settings.heroSubtitle || "Platform undangan pernikahan digital self-service dengan desain estetika mewah dan eksklusif.";
  const siteUrl = "https://luxvite.id";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: brandName,
      template: `%s | ${brandName}`,
    },
    description: tagline,
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: siteUrl,
      siteName: brandName,
      title: `${brandName} — ${tagline}`,
      description: desc,
      images: [
        {
          url: "/assets/brand/og-banner.png",
          width: 1200,
          height: 630,
          alt: `${brandName} Preview`,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${brandName} — ${tagline}`,
      description: desc,
      images: ["/assets/brand/og-banner.png"],
    },
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
const LUXENARY_WATERMARK = `
<!--
 _      _   _  __  __  _____   _   _      _     ____   __   __
| |    | | | | \\ \\/ / | ____| | \\ | |    / \\   |  _ \\  \\ \\ / /
| |    | | | |  \\  /  |  _|   |  \\| |   / _ \\  | |_) |  \\ V / 
| |___ | |_| |  /  \\  | |___  | |\\  |  / ___ \\ |  _ <    | |  
|_____| \\___/  /_/\\_\\ |_____| |_| \\_| /_/   \\_\\|_| \\_\\   |_|  

  ==============================================================
  STOP! PERHATIAN!
  --------------------------------------------------------------
  Sistem dan desain ini adalah milik eksklusif Luxenary.
  Dilarang keras menyalin, menduplikasi, atau menjual ulang 
  tanpa izin resmi dari pihak Luxenary (luxenary.id).
  
  Hak cipta dilindungi undang-undang.
  ==============================================================
-->
<script>
  (function() {
    try {
      if (window.console && console.log) {
        console.log("%cSTOP!", "color: #ef4444; font-size: 50px; font-weight: 900; text-shadow: 2px 2px 0 #000; font-family: sans-serif;");
        console.log("%cIni adalah properti eksklusif Luxenary.", "color: #b5833c; font-size: 20px; font-weight: bold;");
        console.log("%cSegala bentuk pencurian kode, scraping, atau modifikasi ilegal akan direkam.\\nDomain saat ini: " + window.location.hostname, "font-size: 14px; color: #a8a29e;");
      }
    } catch(e) {}
  })();
</script>
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body
        className="min-h-full flex flex-col bg-[#faf8f5] text-[#2d2c2a]"
        style={{ colorScheme: "light", backgroundColor: "#faf8f5", color: "#2d2c2a" }}
      >
        <div dangerouslySetInnerHTML={{ __html: LUXENARY_WATERMARK }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
