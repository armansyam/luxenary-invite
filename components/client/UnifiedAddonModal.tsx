"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizePlanType } from "@/lib/planUtils";

interface UnifiedAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitationId: string;
  currentPlan: string;
  currentQuota: number;
  galleryExpiresAt?: string | null;
  pricingSettings?: {
    priceTier1?: number;
    priceTier2?: number;
    priceTier3?: number;
    nameTier1?: string;
    nameTier2?: string;
    nameTier3?: string;
    galleryExtensionPricePerMonth: number;
    addonMemoriesTopupPrice: number;
    addonMemoriesTopupPhotos: number;
    addonMemoriesTopupEnabled: boolean;
  };
  hasExtended?: boolean;
  daysRemaining?: number | null;
}

export default function UnifiedAddonModal({
  isOpen,
  onClose,
  invitationId,
  currentPlan: rawCurrentPlan = "TIER_1",
  currentQuota = 250,
  galleryExpiresAt,
  pricingSettings,
  hasExtended = false,
  daysRemaining = null,
}: UnifiedAddonModalProps) {
  const router = useRouter();
  const currentPlan = normalizePlanType(rawCurrentPlan);

  // Settings fallbacks
  const prices = useMemo(() => ({
    TIER_1: pricingSettings?.priceTier1 ?? 99000,
    TIER_2: pricingSettings?.priceTier2 ?? 150000,
    TIER_3: pricingSettings?.priceTier3 ?? 200000,
  }), [pricingSettings]);

  const planNames = useMemo(() => ({
    TIER_1: pricingSettings?.nameTier1 || "Serenade",
    TIER_2: pricingSettings?.nameTier2 || "Symphony",
    TIER_3: pricingSettings?.nameTier3 || "Eternity",
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

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTargetPlan("");
      setExtensionMonths(0);
      setTopupBatches(0);
      setErrorMessage("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/45 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white border border-stone-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/90 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              <h3 className="text-base font-bold text-stone-900 tracking-wide">Pusat Kapasitas & Layanan Tambahan</h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Sesuaikan kapasitas kuota foto, durasi aktif galeri, dan fitur undangan Anda dalam 1 kali pembayaran.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition cursor-pointer text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar text-xs bg-white">
          
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SEKSI 1: UPGRADE PAKET */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                1. Tingkatan Paket Undangan
              </label>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 font-bold">
                Saat ini: {planNames[currentPlan as keyof typeof planNames] || currentPlan}
              </span>
            </div>

            {currentPlan === "TIER_3" ? (
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-amber-950 leading-relaxed font-medium">
                ✨ Anda sudah berada di tingkatan paket tertinggi (<strong>{planNames.TIER_3}</strong>). Seluruh fitur sistem dan custom domain telah aktif.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setTargetPlan("")}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    !targetPlan
                      ? "bg-amber-50/70 border-2 border-amber-700 text-stone-900 shadow-xs ring-1 ring-amber-700/20"
                      : "bg-stone-50/50 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Tetap di Paket {planNames[currentPlan as keyof typeof planNames]}</span>
                    <span className="text-[11px] text-stone-500">Rp 0</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">Tidak melakukan upgrade tingkatan paket.</p>
                </div>

                {currentPlan === "TIER_1" && (
                  <div
                    onClick={() => setTargetPlan("TIER_2")}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                      targetPlan === "TIER_2"
                        ? "bg-amber-50/70 border-2 border-amber-700 text-stone-900 shadow-xs ring-1 ring-amber-700/20"
                        : "bg-stone-50/50 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Naik ke {planNames.TIER_2}</span>
                      <span className="text-[11px] font-mono font-bold text-amber-900">+Rp {(prices.TIER_2 - prices.TIER_1).toLocaleString("id-ID")}</span>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">Buka Resepsionis QR & Kamera Tamu (Kuota 200 Foto).</p>
                  </div>
                )}

                <div
                  onClick={() => setTargetPlan("TIER_3")}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    targetPlan === "TIER_3"
                      ? "bg-amber-50/70 border-2 border-amber-700 text-stone-900 shadow-xs ring-1 ring-amber-700/20"
                      : "bg-stone-50/50 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Naik ke {planNames.TIER_3}</span>
                    <span className="text-[11px] font-mono font-bold text-amber-900">+Rp {(prices.TIER_3 - prices[currentPlan as keyof typeof prices]).toLocaleString("id-ID")}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">All-Inclusive: Kuota 500 Foto + Custom Domain Pribadi.</p>
                </div>
              </div>
            )}
          </div>

          {/* SEKSI 2: PERPANJANGAN MASA AKTIF UNDANGAN & GALERI */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                2. Perpanjangan Masa Aktif (Undangan & Galeri)
              </label>
              <span className="text-[10px] text-amber-800 font-medium">Dihitung pasca acara</span>
            </div>

            {hasExtended ? (
              <div className="p-3.5 bg-stone-100 border border-stone-200 rounded-2xl text-stone-600 text-xs flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-stone-400 mt-1.5 shrink-0" />
                <div>
                  <strong className="block font-semibold text-stone-800">Perpanjangan Maksimal Telah Digunakan</strong>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                    Masa aktif telah diperpanjang maksimal (+30 hari). Tidak dapat ditambah lagi guna mencegah penumpukan data permanen di server. Pastikan Anda mengunduh seluruh foto kenangan (ZIP) sebelum masa aktif berakhir.
                  </p>
                </div>
              </div>
            ) : daysRemaining !== null && daysRemaining > 7 ? (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-emerald-900 text-xs flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <strong className="block font-semibold text-emerald-800">Masa Aktif Masih Aman ({daysRemaining} Hari Tersisa)</strong>
                  <p className="text-[11px] text-emerald-700/90 mt-0.5 leading-relaxed">
                    Opsi perpanjangan +30 hari (Rp {monthlyExtPrice.toLocaleString("id-ID")}) akan terbuka otomatis pada H-7 sebelum masa aktif berakhir agar waktu simpan efektif dan tepat sasaran.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExtensionMonths(0)}
                    className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                      extensionMonths === 0
                        ? "bg-amber-50/80 border-2 border-amber-700 text-amber-950 font-bold shadow-xs"
                        : "bg-stone-50/50 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <span className="block font-semibold text-[11px]">Tidak Tambah</span>
                    <span className="block font-mono text-[10px] text-stone-500 mt-0.5">Rp 0</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtensionMonths(1)}
                    className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                      extensionMonths === 1
                        ? "bg-amber-50/80 border-2 border-amber-700 text-amber-950 font-bold shadow-xs"
                        : "bg-stone-50/50 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block font-semibold text-[11px]">+30 Hari</span>
                      <span className="px-1.5 py-0.2 bg-amber-200/80 text-amber-950 text-[9px] font-bold rounded font-mono">Maks. 1x</span>
                    </div>
                    <span className="block font-mono text-[10px] text-amber-900 font-bold mt-0.5">
                      +Rp {monthlyExtPrice.toLocaleString("id-ID")}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-stone-500">
                  * Perpanjangan masa aktif hanya dapat dilakukan 1 kali (+30 hari) pasca acara resepsi selesai.
                </p>
              </>
            )}
          </div>

          {/* SEKSI 3: TOP-UP KUOTA FOTO ACARA */}
          {isTopupEnabled && (
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                  3. Top-Up Kuota Foto Momen Tamu
                </label>
                <span className="text-[10px] text-amber-800 font-medium">Fleksibel & Akumulatif</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      topupBatches === opt.batches
                        ? "bg-amber-50/80 border-2 border-amber-700 text-amber-950 font-bold shadow-xs"
                        : "bg-stone-50/50 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <span className="block font-semibold text-[11px]">{opt.label}</span>
                    <span className="block font-mono text-[10px] text-amber-900 font-bold mt-0.5">
                      {opt.price === 0 ? "Rp 0" : `+Rp ${opt.price.toLocaleString("id-ID")}`}
                    </span>
                  </button>
                ))}
              </div>
              {topupBatches > 0 && (
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-amber-950 text-[11px]">
                  Kapasitas foto acara Anda akan meningkat menjadi:{" "}
                  <strong className="text-amber-900 font-mono font-bold">
                    {currentQuota + (topupBatches * topupPhotosPerBatch)} Foto
                  </strong>.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer (Live Bill Summary & Checkout Button) */}
        <div className="p-5 bg-stone-50/90 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">Total Pembayaran (1 Invoice)</span>
            <span className="text-xl font-mono font-bold text-amber-900">
              Rp {totalAmount.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-semibold rounded-xl text-xs transition cursor-pointer shadow-2xs"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting || totalAmount <= 0}
              onClick={handleCheckout}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                totalAmount > 0 && !isSubmitting
                  ? "bg-amber-800 hover:bg-amber-900 text-white shadow-xs"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
