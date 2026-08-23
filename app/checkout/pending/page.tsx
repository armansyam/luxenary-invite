"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PendingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [statusChecks, setStatusChecks] = useState(0);
  const [orderStatus, setOrderStatus] = useState<string>("PENDING");

  // Poll status setiap 10 detik
  useEffect(() => {
    if (!orderId || orderStatus === "PAID") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/client/orders/${orderId}/status`);
        if (res.ok) {
          const data = await res.json();
          setOrderStatus(data.status);
          setStatusChecks((c) => c + 1);
          if (data.status === "PAID") {
            window.location.replace(`/checkout/success?order=${orderId}`);
          }
        }
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [orderId, orderStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Pending Icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center">
          <svg className="w-12 h-12 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Menunggu Pembayaran</h1>
        <p className="text-stone-400 text-sm mb-2">
          Selesaikan pembayaran Anda melalui metode yang telah dipilih. Halaman ini akan otomatis diperbarui setelah pembayaran diterima.
        </p>
        {orderId && (
          <p className="text-stone-500 text-xs mb-8 font-mono">Order: {orderId}</p>
        )}

        {/* Status indicator */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-sm text-stone-400">
          <div className="flex items-center justify-between mb-2">
            <span>Status Pembayaran</span>
            <span className={`font-bold ${orderStatus === "PAID" ? "text-emerald-400" : "text-amber-400"}`}>
              {orderStatus === "PAID" ? "✓ LUNAS" : "⏳ MENUNGGU"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pengecekan otomatis</span>
            <span className="text-stone-500 text-xs">{statusChecks}x (setiap 10 detik)</span>
          </div>
        </div>

        <div className="space-y-3">
          <a
            href="/dashboard"
            className="block w-full py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition"
          >
            Cek Dashboard Nanti
          </a>
          <a
            href="/register"
            className="block text-stone-500 text-xs hover:text-stone-400 transition"
          >
            Kembali ke halaman paket
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>}>
      <PendingContent />
    </Suspense>
  );
}
