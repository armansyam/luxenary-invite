"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function CheckoutContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");

  const [planData, setPlanData] = useState<{ name: string; price: number; desc: string } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect ke register jika tidak ada plan
  useEffect(() => {
    if (!planParam) {
      router.replace("/register");
    }
  }, [planParam, router]);

  // Redirect ke login jika belum login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=/checkout?plan=${planParam}`);
    }
  }, [status, planParam, router]);

  useEffect(() => {
    if (status !== "authenticated" || !planParam || !(session as any)?.user?.id) return;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        // Ambil harga dari admin settings
        const settingsRes = await fetch("/api/admin/settings");
        const settings = await settingsRes.json();
        const pricing = settings.grouped?.pricing || {};

        let name = "Traditional Series";
        let price = Number(pricing.price_traditional || 299000);
        let desc = pricing.desc_traditional || "Tema Traditional — Sakral, Megah & Bernuansa Tradisional";

        if (planParam === "PREMIUM") {
          name = "Premium Series";
          price = Number(pricing.price_premium || 699000);
          desc = pricing.desc_premium || "Tema Premium — Editorial, Full-Text & Luxury Visual Motion";
        } else if (planParam === "MODERN") {
          name = "Modern Series";
          price = Number(pricing.price_modern || 499000);
          desc = pricing.desc_modern || "Tema Modern — Minimalis, Kontemporer & Sinematik";
        }

        setPlanData({
          name,
          price,
          desc,
        });

        // Buat order di database
        const orderRes = await fetch("/api/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: (session as any).user.id,
            planType: planParam,
            buyerName: session.user?.name || "",
            buyerEmail: session.user?.email || "",
          }),
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error || "Gagal membuat order");

        setOrderId(orderData.orderId);
        setInvoiceNumber(orderData.invoiceNumber);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [status, planParam, session]);

  const handlePay = async () => {
    if (!orderId) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, gateway: "ipaymu" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai pembayaran");
      // Redirect ke halaman pembayaran iPaymu
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setPaying(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-white font-bold text-sm">L</div>
          <span className="text-white font-bold text-lg tracking-tight">Luxenary Invite</span>
        </a>
        <a href="/register" className="text-stone-400 text-sm hover:text-white transition">← Ubah Paket</a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Konfirmasi Pembelian</h1>
            <p className="text-stone-400 text-sm">Periksa detail pesanan Anda sebelum melanjutkan pembayaran</p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-900/40 border border-red-500/40 rounded-2xl text-red-300 text-sm">
              ⚠ {error}
            </div>
          )}

          {planData && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-5 space-y-4">
              {/* Buyer info */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                {session?.user?.image && (
                  <img src={session.user.image} alt="" className="w-10 h-10 rounded-full ring-2 ring-amber-500/30" />
                )}
                <div>
                  <p className="text-white font-semibold text-sm">{session?.user?.name}</p>
                  <p className="text-stone-400 text-xs">{session?.user?.email}</p>
                </div>
              </div>

              {/* Plan detail */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400 text-sm">Paket</span>
                  <span className="text-white font-bold">Luxenary {planData.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400 text-sm">No. Invoice</span>
                  <span className="text-amber-300 font-mono text-xs">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400 text-sm">Berlaku</span>
                  <span className="text-white text-sm">Seumur Hidup</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-white font-semibold">Total Pembayaran</span>
                <span className="text-2xl font-bold text-amber-400">
                  Rp {planData.price.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handlePay}
            disabled={!orderId || paying}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-base hover:from-amber-600 hover:to-amber-700 transition shadow-lg shadow-amber-900/40 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            {paying ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Mengarahkan ke Pembayaran...
              </>
            ) : (
              "Bayar Sekarang →"
            )}
          </button>

          <p className="text-center text-stone-500 text-xs mt-4">
            Pembayaran aman diproses oleh iPaymu. Mendukung Transfer Bank, QRIS, dan kartu kredit/debit.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
