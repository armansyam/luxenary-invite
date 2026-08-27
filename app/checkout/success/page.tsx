"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type OrderStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | null;

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order");

  const [orderStatus, setOrderStatus] = useState<OrderStatus>(null);
  const [pollCount, setPollCount] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  // Poll order payment status every 3 seconds (max 20 polls = 60s)
  useEffect(() => {
    if (!orderId) {
      // No orderId — go straight to setup (dev/manual flow)
      const t = setTimeout(() => router.replace("/dashboard/setup"), 3000);
      return () => clearTimeout(t);
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/client/orders/${orderId}/status`, { cache: "no-store" });
        const data = await res.json();
        const status: OrderStatus = data.status;
        setOrderStatus(status);

        if (status === "PAID") {
          // Redirect to setup wizard with orderId
          setTimeout(() => {
            router.replace(`/dashboard/setup?order=${orderId}`);
          }, 1800);
          return; // Stop polling
        }

        if (status === "FAILED" || status === "EXPIRED") {
          return; // Stop polling, show error state
        }

        // Still PENDING — continue polling
        setPollCount((c) => {
          const next = c + 1;
          if (next >= 20) {
            setTimedOut(true);
          } else {
            setTimeout(poll, 3000);
          }
          return next;
        });
      } catch {
        setPollCount((c) => {
          if (c < 20) setTimeout(poll, 3000);
          return c + 1;
        });
      }
    };

    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // ── Paid State ──────────────────────────────────────────────────────────────
  if (orderStatus === "PAID") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md space-y-5">
          <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center">
            <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Pembayaran Dikonfirmasi!</h1>
            <p className="text-stone-400 text-sm">
              Paket undangan Anda telah aktif. Mengarahkan ke form setup nama pasangan...
            </p>
            {orderId && <p className="text-stone-600 text-xs mt-2 font-mono">Order: {orderId}</p>}
          </div>
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-medium">
            <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>Mengarahkan ke Setup Wizard...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Failed / Expired State ──────────────────────────────────────────────────
  if (orderStatus === "FAILED" || orderStatus === "EXPIRED") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 to-rose-950 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md space-y-5">
          <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-400/40 flex items-center justify-center">
            <svg className="w-10 h-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Pembayaran Tidak Berhasil</h1>
            <p className="text-stone-400 text-sm mt-2">
              Status pembayaran: <span className="text-rose-400 font-bold uppercase">{orderStatus}</span>.
              Silakan coba lagi atau hubungi tim Luxenary.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href={`/checkout?plan=PREMIUM`}
              className="block w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition shadow-lg text-center"
            >
              Coba Bayar Ulang
            </a>
            <a href="/dashboard" className="text-stone-500 text-xs hover:text-stone-300 transition text-center">
              Kembali ke Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Timeout State ───────────────────────────────────────────────────────────
  if (timedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md space-y-5">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Menunggu Konfirmasi</h1>
            <p className="text-stone-400 text-sm mt-2 leading-relaxed">
              Pembayaran sedang diproses oleh bank/provider. Biasanya selesai dalam 1–5 menit. Anda dapat menutup halaman ini dan kembali ke dashboard.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="/dashboard"
              className="block w-full py-3.5 rounded-2xl bg-stone-700 hover:bg-stone-600 text-white font-bold text-sm transition shadow-lg text-center"
            >
              Kembali ke Dashboard
            </a>
            <button
              onClick={() => { setPollCount(0); setTimedOut(false); }}
              className="text-amber-400 text-xs hover:text-amber-300 transition cursor-pointer"
            >
              Cek status lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending / Loading State (default) ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        {/* Animated ring */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Memverifikasi Pembayaran...</h1>
          <p className="text-stone-400 text-sm leading-relaxed">
            Sistem sedang menunggu konfirmasi dari gateway pembayaran. Halaman ini akan otomatis diarahkan begitu pembayaran dikonfirmasi.
          </p>
          {orderId && <p className="text-stone-600 text-xs mt-3 font-mono">Ref: {orderId}</p>}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-stone-500 text-xs">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
          <span className="ml-1">Memeriksa status ({pollCount}/20)</span>
        </div>

        <a href="/dashboard" className="text-stone-600 text-xs hover:text-stone-400 transition">
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
