"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

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
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans flex flex-col selection:bg-amber-100 selection:text-amber-900">
      
      {/* Top Header (Desktop & Mobile) */}
      <header className="bg-white border-b border-stone-200/80 sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-amber-800 flex items-center justify-center font-serif text-white font-bold text-sm shadow-sm group-hover:bg-amber-900 transition">
              L
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800 block -mb-0.5">Luxenary</span>
              <span className="text-xs sm:text-sm font-bold text-stone-900 tracking-tight">Wedding Studio</span>
            </div>
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

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-stone-700 hidden sm:block">
              {session?.user?.name || "Mempelai"}
            </span>
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