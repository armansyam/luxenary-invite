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

export const metadata: Metadata = {
  title: "Luxenary Invite",
  description: "Platform undangan pernikahan digital self-service",
  icons: {
    icon: [
      { url: "/assets/brand/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/assets/brand/favicon.png",
    apple: "/assets/brand/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
