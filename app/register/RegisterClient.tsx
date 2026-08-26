"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PricingPackageItem } from "@/lib/settings";

interface RegisterClientProps {
  packages: PricingPackageItem[];
  rootDomain: string;
}

export default function RegisterClient({ packages, rootDomain }: RegisterClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";

  const handleChoosePlan = async (planId: string) => {
    setSelectedPlan(planId);
    if (isAdmin) {
      alert("Anda sedang login sebagai Administrator. Silakan logout terlebih dahulu atau buka jendela penyamaran (incognito) untuk mendaftar sebagai Klien.");
      return;
    }
    if (!session?.user) {
      // Simpan pilihan plan di sessionStorage lalu redirect ke Google OAuth login
      sessionStorage.setItem("selectedPlan", planId);
      await signIn("google", { callbackUrl: `/checkout?plan=${planId}` });
      return;
    }
    setLoading(true);
    router.push(`/checkout?plan=${planId}`);
  };

  // Jika sudah login Klien, redirect ke checkout dengan plan dari sessionStorage
  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      const storedPlan = sessionStorage.getItem("selectedPlan");
      if (storedPlan) {
        sessionStorage.removeItem("selectedPlan");
        router.push(`/checkout?plan=${storedPlan}`);
      }
    }
  }, [status, isAdmin, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col">
      {isAdmin && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-center text-xs text-amber-300 flex items-center justify-center gap-3">
          <span>⚠️ Anda sedang login sebagai <strong>Administrator ({session?.user?.email})</strong>.</span>
          <a href="/admin" className="underline font-bold hover:text-white">Buka Dashboard Admin →</a>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <BrandLogo size="sm" showName />
        </a>
        <a href="/login" className="text-stone-300 text-sm hover:text-white transition font-medium">
          Sudah punya akun? Login →
        </a>
      </header>

      {/* Hero */}
      <div className="text-center pt-12 pb-8 px-4">
        <span className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-full mb-4 tracking-wider uppercase">
          Undangan Digital Premium
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
          Pilih Paket<br />
          <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
            Undangan Anda
          </span>
        </h1>
        <p className="text-stone-400 text-base max-w-md mx-auto">
          Buat undangan pernikahan digital mewah dalam hitungan menit. Pilih kategori paket yang sesuai kebutuhan Anda.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
          {packages.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                selectedPlan === plan.id
                  ? "border-amber-400 shadow-2xl shadow-amber-900/40 scale-[1.02]"
                  : "border-white/10 hover:border-white/20 hover:scale-[1.01]"
              } ${
                plan.id === "PREMIUM"
                  ? "bg-gradient-to-br from-purple-950/40 via-stone-900 to-stone-950 border-purple-500/30"
                  : plan.id === "MODERN"
                  ? "bg-gradient-to-br from-slate-900 via-stone-900 to-stone-950"
                  : "bg-gradient-to-br from-amber-950/30 via-stone-900 to-stone-950"
              }`}
            >
              {plan.badge && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-purple-500 to-amber-500 text-white text-xs font-bold rounded-full shadow">
                  {plan.badge}
                </div>
              )}

              <div className="p-7 flex-1 flex flex-col justify-between">
                <div>
                  <div className="mb-5">
                    <h2 className="text-2xl font-bold text-white mb-1">{plan.name}</h2>
                    <p className="text-stone-400 text-xs leading-relaxed">{plan.desc}</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-3xl lg:text-4xl font-bold text-white">
                      Rp {plan.price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-stone-400 text-xs ml-1">/ sekali bayar</span>
                  </div>

                  {/* Themes */}
                  <div className="mb-5">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Tema Tersedia:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.themes.map((t) => (
                        <span key={t} className="px-2.5 py-1 bg-white/10 text-white text-xs rounded-full font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-7">
                    {plan.features.map((f, idx) => (
                      <li key={f} className="flex items-start gap-2.5 text-xs text-stone-300">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <div className="flex-1">
                          <span className="leading-snug">{f}</span>
                          {idx === 0 && (
                            <div className="mt-1.5 font-mono text-[11px] text-amber-300/95 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md inline-flex items-center">
                              nama-pasangan.{rootDomain}/tamu
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleChoosePlan(plan.id)}
                  disabled={loading && selectedPlan === plan.id}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition cursor-pointer disabled:opacity-60 mt-4 ${
                    plan.id === "PREMIUM"
                      ? "bg-gradient-to-r from-amber-500 via-amber-600 to-purple-600 text-white hover:opacity-95 shadow-lg shadow-amber-900/40"
                      : plan.id === "MODERN"
                      ? "bg-white text-stone-900 hover:bg-stone-100 shadow-md"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Memproses...
                    </span>
                  ) : (
                    `Pilih Paket ${plan.name} →`
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center pb-8 text-stone-500 text-xs px-4">
        Pembayaran aman melalui iPaymu. Akses undangan seumur hidup setelah pembayaran berhasil.
      </div>
    </div>
  );
}
