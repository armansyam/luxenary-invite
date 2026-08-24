"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order");

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(orderId ? `/dashboard/setup?order=${orderId}` : "/dashboard/setup");
    }, 4000);
    return () => clearTimeout(timer);
  }, [router, orderId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center">
          <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Pembayaran Berhasil!</h1>
        <p className="text-stone-400 text-base mb-2">
          Selamat! Paket undangan Anda telah aktif. Masukkan data nama pasangan Anda untuk memulai.
        </p>
        {orderId && (
          <p className="text-stone-500 text-xs mb-8 font-mono">Order: {orderId}</p>
        )}

        <div className="space-y-3">
          <a
            href={orderId ? `/dashboard/setup?order=${orderId}` : "/dashboard/setup"}
            className="block w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm hover:from-emerald-600 hover:to-emerald-700 transition shadow-lg"
          >
            Lanjut ke Setup Nama Pasangan →
          </a>
          <p className="text-stone-600 text-xs">Mengarahkan otomatis ke form setup dalam 4 detik...</p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>}>
      <SuccessContent />
    </Suspense>
  );
}
