"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

interface ServiceStatus {
  mode: "OPEN" | "CLOSED_ORDER" | "MAINTENANCE" | "COMING_SOON";
  isOpen: boolean;
  title: string;
  message: string;
  reopenDate?: string;
  contactWa?: string;
}

function LoginForm({ platformName, serviceStatus }: { platformName: string; serviceStatus: ServiceStatus | null }) {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/onboarding";
  const authError = searchParams.get("error");
  const isRegistrationClosedError = authError === "RegistrationClosed";

  const handleGoogleLogin = () => {
    setLoading(true);
    signIn("google", { callbackUrl });
  };

  const isClosed = serviceStatus && !serviceStatus.isOpen;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-700/8 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full bg-white border border-amber-900/10 rounded-3xl p-8 sm:p-10 shadow-xl relative z-10 text-stone-900 space-y-6">
        {/* Brand Header — Klik untuk kembali ke beranda */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            title="Kembali ke Beranda"
            className="inline-flex flex-col items-center group cursor-pointer transition select-none"
          >
            <div className="flex justify-center group-hover:scale-105 transition-transform duration-200">
              <BrandLogo size="lg" lightBg brandName={platformName} />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700 block mt-2 group-hover:text-amber-800 transition-colors">
              {platformName}
            </span>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Masuk Akun</h1>
          <p className="text-xs text-stone-400 leading-relaxed">
            Kelola undangan, buku tamu, galeri foto, dan pengiriman via WhatsApp dari satu tempat.
          </p>
        </div>

        {/* Dynamic Service Status Notice (When not OPEN) */}
        {isClosed && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            serviceStatus.mode === "CLOSED_ORDER"
              ? "bg-amber-50/80 border-amber-200/80 text-amber-950"
              : serviceStatus.mode === "MAINTENANCE"
              ? "bg-rose-50/80 border-rose-200/80 text-rose-950"
              : "bg-stone-50 border-stone-200 text-stone-900"
          }`}>
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                serviceStatus.mode === "CLOSED_ORDER" ? "bg-amber-600" :
                serviceStatus.mode === "MAINTENANCE" ? "bg-rose-600" : "bg-stone-700"
              }`} />
              <span>{serviceStatus.title}</span>
            </div>
            <p className="text-stone-600 leading-relaxed font-normal">
              {serviceStatus.message}
            </p>
            {serviceStatus.reopenDate && (
              <p className="text-[11px] font-medium text-amber-900/80">
                Estimasi dibuka kembali: <span className="font-bold">{serviceStatus.reopenDate}</span>
              </p>
            )}
            <div className="pt-1.5 border-t border-amber-900/10 text-[11px] text-stone-500 flex items-center justify-between">
              <span>Akun terdaftar tetap bisa login.</span>
              {serviceStatus.contactWa && (
                <a
                  href={`https://wa.me/${serviceStatus.contactWa.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-amber-800 hover:underline"
                >
                  Hubungi Admin →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Rejection Alert for New Users attempting to sign up while closed */}
        {isRegistrationClosedError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Pendaftaran Akun Baru Ditutup</span>
            </div>
            <p className="text-rose-800 leading-relaxed text-[11px]">
              Email Google yang Anda gunakan belum terdaftar di sistem kami. Saat ini pendaftaran akun baru sedang ditutup sementara. Pastikan Anda masuk menggunakan akun Google yang telah didaftarkan sebelumnya.
            </p>
          </div>
        )}

        {/* Google OAuth — Primary & Only Method */}
        <div className="space-y-3">
          <button
            id="btn-google-login"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl flex items-center justify-center gap-3 text-sm font-bold transition shadow-lg shadow-stone-950/20 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>{loading ? "Menghubungkan..." : "Masuk dengan Akun Google"}</span>
          </button>

          <p className="text-center text-[11px] text-stone-400">
            Akun Anda otomatis terhubung ke undangan digital Anda.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-100 pt-4 space-y-2">
          <p className="text-center text-xs text-stone-500">
            Akses aman dan mudah, cukup gunakan akun Google Anda.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 pt-4">
          <Link href="/" className="hover:text-stone-700 transition">
            ← Beranda
          </Link>
          <Link href="/demo" className="hover:text-stone-700 transition">
            Lihat Demo Tema →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ClientLoginPage() {
  const [platformName, setPlatformName] = useState("");
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  
  useEffect(() => {
    fetch("/api/public/settings", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        const name = data.platformName || "Luxenary";
        setPlatformName(name);
        if (data.serviceStatus) {
          setServiceStatus(data.serviceStatus);
        }
        document.title = `Masuk Akun | ${name}`;
      })
      .catch(() => {});
  }, []);

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf7f2] flex items-center justify-center"><div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div></div>}>
      <LoginForm platformName={platformName} serviceStatus={serviceStatus} />
    </Suspense>
  );
}