"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { BrandLogo } from "@/components/BrandLogo";

export default function PackageSelectionPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformName, setPlatformName] = useState("");
  const [serviceStatus, setServiceStatus] = useState<any>(null);

  useEffect(() => {
    // 1. Cek status: HANYA redirect jika user SUDAH MEMILIKI UNDANGAN atau SUDAH BAYAR LUNAS (PAID)
    // Klien dengan order PENDING tetap bebas mengakses halaman ini untuk melihat dan mengubah pilihan paket
    if (status === "authenticated") {
      fetch("/api/client/onboarding-state", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data && (data.step === "COMPLETED" || data.step === "PAID_NEED_SETUP")) {
            router.replace(data.redirectUrl || "/dashboard");
          }
        })
        .catch(() => {});
    }

    // 2. Muat konfigurasi paket & status layanan
    fetch("/api/public/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (Array.isArray(data.packages)) {
            setPackages(data.packages);
          }
          if (data.platformName) {
            setPlatformName(data.platformName);
          }
          if (data.serviceStatus) {
            setServiceStatus(data.serviceStatus);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, router]);

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

  const isClosed = serviceStatus && !serviceStatus.isOpen;

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
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1e1c1a]">
            Selamat Datang{session?.user?.name ? `, ${session.user.name}` : session?.user?.email ? `, ${session.user.email.split("@")[0]}` : ""}!
          </h1>
          <p className="text-sm text-stone-500 mt-2 max-w-lg mx-auto">
            Akun Anda telah berhasil terdaftar. Silakan pilih paket undangan digital yang paling sesuai dengan kebutuhan pernikahan Anda untuk melanjutkan.
          </p>
        </div>

        {/* Dynamic Service Status Notice */}
        {isClosed && (
          <div className={`mb-8 p-6 rounded-3xl border text-sm max-w-3xl mx-auto ${
            serviceStatus.mode === "CLOSED_ORDER"
              ? "bg-amber-50/90 border-amber-300/80 text-amber-950"
              : serviceStatus.mode === "MAINTENANCE"
              ? "bg-rose-50/90 border-rose-300/80 text-rose-950"
              : "bg-stone-50 border-stone-200 text-stone-900"
          }`}>
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs mb-1">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                serviceStatus.mode === "CLOSED_ORDER" ? "bg-amber-600" :
                serviceStatus.mode === "MAINTENANCE" ? "bg-rose-600" : "bg-stone-700"
              }`} />
              <span>{serviceStatus.title}</span>
            </div>
            <p className="text-stone-700 leading-relaxed text-xs">
              {serviceStatus.message}
            </p>
            {serviceStatus.reopenDate && (
              <p className="text-xs font-semibold text-amber-900 mt-2">
                Estimasi dibuka kembali: <span className="underline">{serviceStatus.reopenDate}</span>
              </p>
            )}
            {serviceStatus.contactWa && (
              <div className="mt-3 pt-3 border-t border-amber-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-stone-500">Ingin konsultasi atau antrean pemesanan berikutnya?</span>
                <a
                  href={`https://wa.me/${serviceStatus.contactWa.replace(/\D/g, "")}?text=${encodeURIComponent("Halo Admin, saya ingin reservasi/antrean paket undangan digital.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-800 text-white rounded-full text-xs font-bold hover:bg-amber-900 transition shrink-0"
                >
                  Tanya Kuota via WhatsApp →
                </a>
              </div>
            )}
          </div>
        )}

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

              {isClosed ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 font-bold rounded-full text-center text-sm bg-stone-200 text-stone-500 cursor-not-allowed opacity-80"
                >
                  Pemesanan Ditutup
                </button>
              ) : (
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
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center max-w-2xl mx-auto px-4">
          <p className="text-xs text-stone-500 mb-6 leading-relaxed">
            Dengan memilih paket dan melanjutkan proses ke gerbang pembayaran, Anda setuju bahwa Anda telah membaca dan menerima seluruh{' '}
            <Link href="/terms" className="text-amber-700 hover:underline">Syarat & Ketentuan</Link> serta{' '}
            <Link href="/privacy" className="text-amber-700 hover:underline">Kebijakan Privasi</Link> layanan {platformName}, termasuk kebijakan{' '}
            <Link href="/refund" className="text-amber-700 hover:underline font-medium">TIDAK ADA PENGEMBALIAN DANA (No Refund)</Link>{' '}
            untuk produk digital yang telah dibeli.
          </p>
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
