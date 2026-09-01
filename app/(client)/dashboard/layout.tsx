"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const navItems = [
  {
    href: "/dashboard",
    label: "Beranda",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/invitation",
    label: "Edit Undangan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/guests",
    label: "Buku Tamu",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/rsvp",
    label: "RSVP & Doa",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Pengaturan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function ClientDashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [waContact, setWaContact] = useState("");
  const [platformName, setPlatformName] = useState("");

  useEffect(() => {
    fetch("/api/public/settings")
      .then(res => res.json())
      .then(data => {
        if (data?.supportWhatsapp) setWaContact(data.supportWhatsapp);
        if (data?.platformName) setPlatformName(data.platformName);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // --- Strict Protection: ONLY PAID USERS ALLOWED ---
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Periksa secara asinkron status pembayaran pengguna
      fetch("/api/client/onboarding-state", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          // Jika tidak ada data atau order belum lunas, tendang ke onboarding
          if (!data || !data.hasPaidOrder) {
            router.replace("/onboarding");
          }
        })
        .catch(() => {
          // Abaikan error jaringan
        });
    }
  }, [status, session, router]);

  if (
    status === "unauthenticated" ||
    (status === "authenticated" && !session?.user)
  ) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans flex flex-col selection:bg-amber-100 selection:text-amber-900">
      
      {/* Top Header (Desktop & Mobile) */}
      <header className="bg-white border-b border-stone-200/80 sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <BrandLogo size="sm" lightBg showName />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === "/dashboard/invitation" && pathname.startsWith("/dashboard/invitation"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    isActive
                      ? "bg-amber-50 text-amber-900 border border-amber-200/80 font-bold shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
                  }`}
                >
                  <span className={isActive ? "text-amber-800" : "text-stone-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile, Contact Admin & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-semibold text-stone-700 hidden sm:block">
              {session?.user?.name || "Mempelai"}
            </span>
            <a 
              href={`https://wa.me/${waContact}?text=${encodeURIComponent('Halo Admin ' + (platformName || 'Platform') + ', saya butuh bantuan.')}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              <span className="hidden sm:inline">Hubungi CS</span>
              <span className="sm:hidden">CS</span>
            </a>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition border border-stone-200 hover:border-rose-200 cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-24 md:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Sticky Navigation (Super Ergonomic for Smartphones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-stone-200/80 px-2 py-1.5 shadow-lg">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === "/dashboard/invitation" && pathname.startsWith("/dashboard/invitation"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition ${
                  isActive
                    ? "text-amber-800 font-bold"
                    : "text-stone-400 hover:text-stone-700"
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? "bg-amber-50 text-amber-800" : ""}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-0.5">
                  {item.label === "Edit Undangan" ? "Editor" : item.label === "Buku Tamu" ? "Tamu" : item.label === "RSVP & Doa" ? "RSVP" : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}