"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { BrandLogo } from "@/components/BrandLogo";

export default function PackageSelectionPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.packages)) {
          setPackages(data.packages);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-stone-500 font-medium">Memuat daftar paket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans flex flex-col">
      <header className="border-b border-[#eadecf]/70 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <BrandLogo size="sm" showName />
          <div className="text-xs font-semibold text-stone-500">Pilih Paket</div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1e1c1a]">Selamat Datang!</h1>
          <p className="text-sm text-stone-500 mt-2 max-w-lg mx-auto">
            Akun Anda telah berhasil terdaftar. Silakan pilih paket undangan digital yang paling sesuai dengan kebutuhan pernikahan Anda untuk melanjutkan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 relative ${
                pkg.isFeatured
                  ? "bg-[#fffdfa] border-2 border-amber-800/40 shadow-lg scale-[1.02]"
                  : "bg-white border border-[#eadecf] shadow-sm hover:shadow-md"
              }`}
            >
              {pkg.badge && (
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-700 to-amber-900 text-white text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  {pkg.badge}
                </div>
              )}

              <div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
                  pkg.isFeatured ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-700"
                }`}>
                  {pkg.name}
                </span>

                <h3 className="text-xl font-serif font-bold text-[#1e1c1a] mt-4">{pkg.name}</h3>
                <p className="text-xs text-[#6e685f] mt-1 line-clamp-2">{pkg.desc}</p>

                <div className="my-5">
                  <span className="text-3xl font-bold text-[#1e1c1a]">
                    Rp {pkg.price.toLocaleString("id-ID")}
                  </span>
                  <span className="text-[#6e685f] text-xs"> / undangan</span>
                </div>

                <ul className="space-y-2.5 text-xs text-[#524d45] mb-8">
                  {pkg.features?.map((f: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/checkout?plan=${pkg.id}`}
                className={`w-full py-3 font-bold rounded-full text-center transition text-sm shadow-xs ${
                  pkg.isFeatured
                    ? "bg-amber-800 hover:bg-amber-900 text-white"
                    : "bg-stone-900 hover:bg-stone-800 text-white"
                }`}
              >
                Pilih Paket Ini
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-stone-400 hover:text-stone-700 text-xs transition cursor-pointer"
          >
            Bukan akun Anda? <span className="underline">Ganti Akun / Keluar</span>
          </button>
        </div>
      </main>
    </div>
  );
}
