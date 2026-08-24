"use client";

import { BrandLogo } from "@/components/BrandLogo";

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
        const settingsRes = await fetch("/api/admin/settings", { cache: "no-store" });
        const settings = await settingsRes.json();
        const pricing = settings.grouped?.pricing || {};

        let name = pricing.name_traditional || "Traditional Series";
        let price = Number(pricing.price_traditional || 50000);
        let desc = pricing.desc_traditional || "Tema Traditional — Sakral, Megah & Bernuansa Tradisional";

        if (planParam === "PREMIUM") {
          name = pricing.name_premium || "Premium Series";
          price = Number(pricing.price_premium || 699000);
          desc = pricing.desc_premium || "Tema Premium — Editorial, Full-Text & Luxury Visual Motion";
        } else if (planParam === "MODERN") {
          name = pricing.name_modern || "Modern Series";
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
          <BrandLogo size="sm" showName />
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
              {error}
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

          <div className="space-y-3">
            <button
              id="btn-pay-now"
              type="button"
              onClick={handlePay}
              disabled={!orderId || paying}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-base hover:from-amber-600 hover:to-amber-700 transition shadow-lg shadow-amber-900/40 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Mengarahkan ke Halaman Pembayaran...</span>
                </>
              ) : (
                <span>Bayar Sekarang →</span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mt-5">
            <div className="flex items-center gap-1.5 text-stone-500">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span className="text-[11px]">Terenkripsi SSL</span>
            </div>
            <div className="w-px h-3 bg-stone-700" />
            <span className="text-[11px] text-stone-500">QRIS · Transfer Bank · E-Wallet</span>
          </div>
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
