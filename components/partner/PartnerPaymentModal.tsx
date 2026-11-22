"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { formatRupiah, type ActivePaymentModalState, type PartnerPlatformConfig } from "@/components/partner/types";

export interface PartnerPaymentModalContext {
  activePayment: ActivePaymentModalState | null;
  clientName: string;
  discountRateLabel: string;
  email: string;
  handleUploadPartnerProof: (e: FormEvent) => Promise<void>;
  paymentError: string;
  paymentInitLoading: boolean;
  platformConfig: PartnerPlatformConfig | null;
  proofFile: File | null;
  proofSuccessMsg: string;
  setActivePayment: Dispatch<SetStateAction<ActivePaymentModalState | null>>;
  setProofFile: Dispatch<SetStateAction<File | null>>;
  uploadingProof: boolean;
}

export function PartnerPaymentModal({ ctx }: { ctx: PartnerPaymentModalContext }) {
  const {
    activePayment,
    clientName,
    discountRateLabel,
    email,
    handleUploadPartnerProof,
    paymentError,
    paymentInitLoading,
    platformConfig,
    proofFile,
    proofSuccessMsg,
    setActivePayment,
    setProofFile,
    uploadingProof,
  } = ctx;

  return (
    <>
      {/* Modal Pembayaran Paket Klien oleh Mitra WO (QRIS / Snap / Transfer Manual) */}
      {activePayment && (
        <div className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#eadecf] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Pembayaran Harga Mitra ({discountRateLabel})
                </div>
                <h3 className="text-base font-serif font-bold text-stone-900">
                  {activePayment.clientName}
                </h3>
                <p className="text-[11px] font-mono text-stone-500">
                  {activePayment.invoiceNumber} &middot; {activePayment.planType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePayment(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                aria-label="Tutup modal pembayaran"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Ringkasan Tagihan */}
              <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#eadecf] space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Harga Paket (Setelah Potongan Mitra)</span>
                  <span className="font-mono font-semibold text-stone-800">{formatRupiah(activePayment.amount)}</span>
                </div>
                {activePayment.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Hemat Potongan Mitra</span>
                    <span className="font-mono font-bold">- {formatRupiah(activePayment.discountAmount)}</span>
                  </div>
                )}
                {activePayment.chargedAmount && activePayment.chargedAmount > activePayment.amount && (
                  <div className="flex justify-between text-stone-500">
                    <span>Biaya Layanan Gateway</span>
                    <span className="font-mono">{formatRupiah(activePayment.chargedAmount - activePayment.amount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
                  <span className="font-bold text-stone-900">Total Bayar Mitra</span>
                  <span className="text-lg font-extrabold font-mono text-amber-900">
                    {formatRupiah(activePayment.chargedAmount || activePayment.amount)}
                  </span>
                </div>
              </div>

              {paymentError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {paymentError}
                </div>
              )}

              {activePayment.status === "PAID" ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-emerald-900">Pembayaran Lunas!</div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Paket <strong>{activePayment.planType}</strong> sudah aktif untuk <strong>{activePayment.clientName}</strong>. Tautan aktivasi 48 jam telah dikirim ke email pengantin &amp; siap disalin ke WhatsApp di halaman utama portal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePayment(null)}
                    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Tutup &amp; Lihat Link Aktivasi Pengantin
                  </button>
                </div>
              ) : paymentInitLoading ? (
                <div className="py-8 flex flex-col items-center gap-2 text-xs text-stone-500">
                  <div className="w-7 h-7 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
                  <span>Menyiapkan metode pembayaran...</span>
                </div>
              ) : activePayment.paymentMethod === "MANUAL_TRANSFER" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Transfer Bank Resmi Platform
                    </div>
                    <div className="font-bold text-stone-900 text-sm">
                      {activePayment.bank?.bankName || platformConfig?.bank?.bankName || "Bank Resmi"}
                    </div>
                    <div className="font-mono text-base font-extrabold text-amber-950">
                      {activePayment.bank?.bankAccountNumber || platformConfig?.bank?.bankAccountNumber || "-"}
                    </div>
                    <div className="text-stone-600">
                      a.n. <strong>{activePayment.bank?.bankAccountHolder || platformConfig?.bank?.bankAccountHolder || "-"}</strong>
                    </div>
                  </div>

                  {activePayment.rejectReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      <strong>Bukti sebelumnya ditolak:</strong> {activePayment.rejectReason}
                    </div>
                  )}

                  {proofSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                      {proofSuccessMsg}
                    </div>
                  )}

                  {activePayment.hasProof && !proofSuccessMsg && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      Bukti transfer sudah diunggah &amp; sedang menunggu verifikasi Admin. Setelah disetujui, email aktivasi otomatis terkirim ke pengantin.
                    </div>
                  )}

                  <form onSubmit={handleUploadPartnerProof} className="space-y-3">
                    <label className="block text-xs font-bold text-stone-700">
                      {activePayment.hasProof ? "Unggah Ulang Bukti Transfer (JPG/PNG/PDF)" : "Unggah Bukti Transfer (JPG/PNG/PDF)"}
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      required
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={uploadingProof || !proofFile}
                      className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                    >
                      {uploadingProof ? "Mengunggah Bukti..." : "Kirim Bukti Transfer"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  {activePayment.qrString ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-white rounded-2xl border border-stone-200 inline-block shadow-xs">
                        <img
                          src={`/api/public/qr?size=280&data=${encodeURIComponent(activePayment.qrString)}`}
                          alt="QRIS Pembayaran Mitra"
                          className="w-56 h-56 object-contain mx-auto"
                        />
                      </div>
                      <p className="text-xs text-stone-600">
                        Scan QRIS di atas via m-Banking / e-Wallet. Status pembayaran diperbarui otomatis setiap 4 detik.
                      </p>
                    </div>
                  ) : activePayment.checkoutUrl ? (
                    <div className="space-y-3 py-2">
                      <p className="text-xs text-stone-600">
                        Selesaikan pembayaran melalui halaman pembayaran resmi Midtrans di tab baru. Status akan otomatis diperbarui di sini setelah lunas.
                      </p>
                      <a
                        href={activePayment.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition"
                      >
                        Buka Halaman Pembayaran Midtrans &rarr;
                      </a>
                    </div>
                  ) : (
                    <div className="py-4 text-xs text-stone-500">
                      Klik tombol di bawah untuk memuat ulang sesi pembayaran.
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-[11px] text-amber-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                    <span>Menunggu konfirmasi pembayaran otomatis...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
