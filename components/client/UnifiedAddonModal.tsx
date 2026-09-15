"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface UnifiedAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitationId: string;
  currentPlan: string; // "TRADITIONAL" | "MODERN" | "PREMIUM"
  currentQuota: number; // e.g. 250
  galleryExpiresAt?: string | null;
  pricingSettings?: {
    priceTraditional: number;
    priceModern: number;
    pricePremium: number;
    nameTraditional: string;
    nameModern: string;
    namePremium: string;
    galleryExtensionPricePerMonth: number;
    addonMemoriesTopupPrice: number;
    addonMemoriesTopupPhotos: number;
    addonMemoriesTopupEnabled: boolean;
  };
}

export default function UnifiedAddonModal({
  isOpen,
  onClose,
  invitationId,
  currentPlan = "TRADITIONAL",
  currentQuota = 250,
  galleryExpiresAt,
  pricingSettings,
}: UnifiedAddonModalProps) {
  const router = useRouter();

  // Settings fallbacks
  const prices = useMemo(() => ({
    TRADITIONAL: pricingSettings?.priceTraditional ?? 50000,
    MODERN: pricingSettings?.priceModern ?? 150000,
    PREMIUM: pricingSettings?.pricePremium ?? 250000,
  }), [pricingSettings]);

  const planNames = useMemo(() => ({
    TRADITIONAL: pricingSettings?.nameTraditional || "Serenade",
    MODERN: pricingSettings?.nameModern || "Symphony",
    PREMIUM: pricingSettings?.namePremium || "Eternity",
  }), [pricingSettings]);

  const monthlyExtPrice = pricingSettings?.galleryExtensionPricePerMonth ?? 50000;
  const topupPricePerBatch = pricingSettings?.addonMemoriesTopupPrice ?? 35000;
  const topupPhotosPerBatch = pricingSettings?.addonMemoriesTopupPhotos ?? 100;
  const isTopupEnabled = pricingSettings?.addonMemoriesTopupEnabled !== false;

  // Form State
  const [targetPlan, setTargetPlan] = useState<string>("");
  const [extensionMonths, setExtensionMonths] = useState<number>(0);
  const [topupBatches, setTopupBatches] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (!isOpen) return null;

  // Kalkulasi Harga Upgrade
  const upgradeCost = useMemo(() => {
    if (!targetPlan) return 0;
    const fromP = prices[currentPlan as keyof typeof prices] ?? 0;
    const toP = prices[targetPlan as keyof typeof prices] ?? 0;
    return Math.max(0, toP - fromP);
  }, [targetPlan, currentPlan, prices]);

  // Kalkulasi Harga Ekstensi Galeri
  const extensionCost = useMemo(() => {
    if (extensionMonths === 0) return 0;
    return extensionMonths * monthlyExtPrice;
  }, [extensionMonths, monthlyExtPrice]);

  // Kalkulasi Harga Topup Kuota
  const topupCost = useMemo(() => {
    if (topupBatches === 0) return 0;
    return topupBatches * topupPricePerBatch;
  }, [topupBatches, topupPricePerBatch]);

  // Total Keseluruhan
  const totalAmount = upgradeCost + extensionCost + topupCost;

  // Submit Handler
  const handleCheckout = async () => {
    setErrorMessage("");
    if (totalAmount <= 0) {
      setErrorMessage("Silakan pilih setidaknya satu opsi layanan tambahan atau upgrade.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/client/orders/checkout-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          targetPlan: targetPlan || null,
          extensionMonths,
          topupBatches,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses pesanan.");
      }

      if (data.paymentUrl) {
        router.push(data.paymentUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan koneksi.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-stone-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-stone-900/90 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-base font-bold text-white tracking-wide">Pusat Kapasitas & Layanan Tambahan</h3>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Sesuaikan kapasitas kuota foto, durasi aktif galeri, dan fitur undangan Anda dalam 1 kali pembayaran.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar text-xs">
          
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SEKSI 1: UPGRADE PAKET */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-200 uppercase tracking-wider text-[11px]">
                1. Tingkatan Paket Undangan
              </label>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 border border-amber-500/30 font-semibold">
                Saat ini: {planNames[currentPlan as keyof typeof planNames] || currentPlan}
              </span>
            </div>

            {currentPlan === "PREMIUM" ? (
              <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-200">
                ✨ Anda sudah berada di tingkatan paket tertinggi (<strong>Eternity</strong>). Seluruh fitur sistem dan custom domain telah aktif.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setTargetPlan("")}
                  className={`p-3 rounded-2xl border cursor-pointer transition ${
                    !targetPlan
                      ? "bg-amber-500/10 border-amber-500/50 text-white"
                      : "bg-white/5 border-white/10 hover:border-white/20 text-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Tetap di Paket {planNames[currentPlan as keyof typeof planNames]}</span>
                    <span className="text-[11px] text-stone-400">Rp 0</span>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">Tidak melakukan upgrade tingkatan paket.</p>
                </div>

                {currentPlan === "TRADITIONAL" && (
                  <div
                    onClick={() => setTargetPlan("MODERN")}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      targetPlan === "MODERN"
                        ? "bg-slate-500/20 border-slate-400 text-white"
                        : "bg-white/5 border-white/10 hover:border-white/20 text-stone-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Naik ke {planNames.MODERN}</span>
                      <span className="text-[11px] font-mono font-bold text-slate-300">+Rp {(prices.MODERN - prices.TRADITIONAL).toLocaleString("id-ID")}</span>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">Buka Resepsionis QR & Kamera Tamu (Kuota 250 Foto).</p>
                  </div>
                )}

                <div
                  onClick={() => setTargetPlan("PREMIUM")}
                  className={`p-3 rounded-2xl border cursor-pointer transition ${
                    targetPlan === "PREMIUM"
                      ? "bg-purple-500/20 border-purple-400 text-white"
                      : "bg-white/5 border-white/10 hover:border-white/20 text-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Naik ke {planNames.PREMIUM}</span>
                    <span className="text-[11px] font-mono font-bold text-purple-300">+Rp {(prices.PREMIUM - prices[currentPlan as keyof typeof prices]).toLocaleString("id-ID")}</span>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">All-Inclusive: Kuota 1.000 Foto + Custom Domain Pribadi.</p>
                </div>
              </div>
            )}
          </div>

          {/* SEKSI 2: PERPANJANGAN MASA AKTIF GALERI */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-200 uppercase tracking-wider text-[11px]">
                2. Perpanjang Masa Aktif Galeri Tamu
              </label>
              <span className="text-[10px] text-purple-300">Dihitung pasca acara</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { months: 0, label: "Tidak Tambah", price: 0 },
                { months: 1, label: "+1 Bulan (30 Hari)", price: monthlyExtPrice },
                { months: 2, label: "+2 Bulan (60 Hari)", price: monthlyExtPrice * 2 },
                { months: 3, label: "+3 Bulan (90 Hari)", price: monthlyExtPrice * 3 },
                { months: 6, label: "+6 Bulan (180 Hari)", price: monthlyExtPrice * 6 },
                { months: 12, label: "+1 Tahun (365 Hari)", price: monthlyExtPrice * 12 },
              ].map((opt) => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => setExtensionMonths(opt.months)}
                  className={`p-2.5 rounded-xl border text-left transition relative cursor-pointer ${
                    extensionMonths === opt.months
                      ? "bg-purple-500/20 border-purple-500/60 text-white"
                      : "bg-white/5 border-white/10 hover:border-white/20 text-stone-300"
                  }`}
                >
                  <span className="block font-semibold text-[11px]">{opt.label}</span>
                  <span className="block font-mono text-[10px] text-purple-300 mt-0.5">
                    {opt.price === 0 ? "Rp 0" : `+Rp ${opt.price.toLocaleString("id-ID")}`}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-400">
              * Perpanjangan diakumulasikan ke masa aktif dasar paket setelah acara resepsi selesai, tanpa memotong masa aktif draft saat ini.
            </p>
          </div>

          {/* SEKSI 3: TOP-UP KUOTA FOTO ACARA */}
          {isTopupEnabled && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-200 uppercase tracking-wider text-[11px]">
                  3. Top-Up Kuota Foto Momen Tamu
                </label>
                <span className="text-[10px] text-indigo-300">Fleksibel & Akumulatif</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { batches: 0, photos: 0, label: "Tidak Tambah", price: 0 },
                  { batches: 1, photos: topupPhotosPerBatch * 1, label: `+${topupPhotosPerBatch * 1} Foto`, price: topupPricePerBatch * 1 },
                  { batches: 2, photos: topupPhotosPerBatch * 2, label: `+${topupPhotosPerBatch * 2} Foto`, price: topupPricePerBatch * 2 },
                  { batches: 3, photos: topupPhotosPerBatch * 3, label: `+${topupPhotosPerBatch * 3} Foto`, price: topupPricePerBatch * 3 },
                  { batches: 5, photos: topupPhotosPerBatch * 5, label: `+${topupPhotosPerBatch * 5} Foto`, price: topupPricePerBatch * 5 },
                ].map((opt) => (
                  <button
                    key={opt.batches}
                    type="button"
                    onClick={() => setTopupBatches(opt.batches)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      topupBatches === opt.batches
                        ? "bg-indigo-500/20 border-indigo-500/60 text-white"
                        : "bg-white/5 border-white/10 hover:border-white/20 text-stone-300"
                    }`}
                  >
                    <span className="block font-semibold text-[11px]">{opt.label}</span>
                    <span className="block font-mono text-[10px] text-indigo-300 mt-0.5">
                      {opt.price === 0 ? "Rp 0" : `+Rp ${opt.price.toLocaleString("id-ID")}`}
                    </span>
                  </button>
                ))}
              </div>
              {topupBatches > 0 && (
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-200 text-[11px]">
                  Kapasitas foto acara Anda akan meningkat menjadi:{" "}
                  <strong className="text-white font-mono">
                    {currentQuota + (topupBatches * topupPhotosPerBatch)} Foto
                  </strong>.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer (Live Bill Summary & Checkout Button) */}
        <div className="p-5 bg-stone-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">Total Pembayaran (1 Invoice)</span>
            <span className="text-xl font-mono font-bold text-amber-400">
              Rp {totalAmount.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 bg-white/5 hover:bg-white/10 text-stone-300 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting || totalAmount <= 0}
              onClick={handleCheckout}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                totalAmount > 0 && !isSubmitting
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-lg shadow-amber-500/20"
                  : "bg-white/10 text-stone-500 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Lanjut ke Pembayaran ➔</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
