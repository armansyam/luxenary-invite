"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Plan = {
  id: "TRADITIONAL" | "PREMIUM" | "MODERN";
  name: string;
  price: number;
  desc: string;
  features: string[];
  themes: string[];
  badge?: string;
  color: string;
};

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([
    {
      id: "TRADITIONAL",
      name: "Traditional",
      price: 299000,
      desc: "Tema Traditional — Sakral, Megah & Bernuansa Tradisional",
      themes: ["Prameswari (Royal Keraton)"],
      features: ["Hingga 200 tamu undangan", "Manajemen RSVP online", "Galeri foto", "Musik latar", "Live streaming", "Photobooth QR"],
      color: "amber",
    },
    {
      id: "PREMIUM",
      name: "Premium",
      price: 499000,
      desc: "Tema Premium — Full-Text Editorial, Minimalis, Sinematik & Vintage",
      themes: ["Kalandra", "Valente", "Aurelia", "Artisan"],
      features: ["Tamu tak terbatas", "Manajemen RSVP online", "Galeri video & foto", "Musik latar", "Live streaming", "Photobooth QR", "Subdomain custom", "Amplop digital QRIS"],
      badge: "Terpopuler",
      color: "purple",
    },
  ]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load pricing from admin settings
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.grouped?.pricing) {
          const p = data.grouped.pricing;
          setPlans((prev) =>
            prev.map((plan) => ({
              ...plan,
              price: (plan.id === "PREMIUM" || plan.id === "MODERN")
                ? Number(p.price_modern || plan.price)
                : Number(p.price_traditional || plan.price),
              desc: (plan.id === "PREMIUM" || plan.id === "MODERN")
                ? (p.desc_modern || plan.desc)
                : (p.desc_traditional || plan.desc),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleChoosePlan = async (planId: string) => {
    setSelectedPlan(planId);
    if (!session?.user) {
      // Simpan pilihan plan di sessionStorage lalu redirect ke login
      sessionStorage.setItem("selectedPlan", planId);
      await signIn("google", { callbackUrl: `/checkout?plan=${planId}` });
      return;
    }
    setLoading(true);
    router.push(`/checkout?plan=${planId}`);
  };

  // Jika sudah login, redirect ke checkout dengan plan dari sessionStorage
  useEffect(() => {
    if (status === "authenticated") {
      const storedPlan = sessionStorage.getItem("selectedPlan");
      if (storedPlan) {
        sessionStorage.removeItem("selectedPlan");
        router.push(`/checkout?plan=${storedPlan}`);
      }
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-white font-bold text-sm shadow">
            L
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Luxenary Invite</span>
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
          Buat undangan pernikahan digital mewah dalam hitungan menit. Pilih paket yang sesuai kebutuhan Anda.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl border transition-all duration-300 overflow-hidden ${
                selectedPlan === plan.id
                  ? "border-amber-400 shadow-2xl shadow-amber-900/40 scale-[1.02]"
                  : "border-white/10 hover:border-white/20 hover:scale-[1.01]"
              } ${plan.id === "MODERN" ? "bg-gradient-to-br from-stone-800 to-rose-950/40" : "bg-gradient-to-br from-stone-800 to-stone-900/80"}`}
            >
              {plan.badge && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold rounded-full shadow">
                  {plan.badge}
                </div>
              )}

              <div className="p-7">
                <div className="mb-5">
                  <h2 className="text-2xl font-bold text-white mb-1">{plan.name}</h2>
                  <p className="text-stone-400 text-sm">{plan.desc}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    Rp {plan.price.toLocaleString("id-ID")}
                  </span>
                  <span className="text-stone-400 text-sm ml-1">/ sekali bayar</span>
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
                <ul className="space-y-2.5 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-stone-300">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleChoosePlan(plan.id)}
                  disabled={loading && selectedPlan === plan.id}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition cursor-pointer disabled:opacity-60 ${
                    plan.id === "MODERN"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-900/40"
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
