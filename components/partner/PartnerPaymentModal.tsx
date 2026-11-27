"use client";

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { formatDateTimeWib, formatRupiah, type ActivePaymentModalState, type PartnerPlatformConfig } from "@/components/partner/types";

export interface PartnerPaymentModalContext {
  activePayment: ActivePaymentModalState | null;
  cancellingOrderId: string | null;
  clientName: string;
  discountRateLabel: string;
  email: string;
  handleCancelPartnerOrder: (orderId: string) => Promise<void>;
  handleCopyActivationFromModal: () => Promise<void>;
  handleReorderFromModal: () => Promise<void>;
  handleRetryPartnerPayment: () => Promise<void>;
  handleUploadPartnerProof: (e: FormEvent) => Promise<void>;
  paymentError: string;
  paymentInitLoading: boolean;
  platformConfig: PartnerPlatformConfig | null;
  proofFile: File | null;
  proofSuccessMsg: string;
  reorderingClientId: string | null;
  resendingClientId: string | null;
  setActivePayment: Dispatch<SetStateAction<ActivePaymentModalState | null>>;
  setProofFile: Dispatch<SetStateAction<File | null>>;
  uploadingProof: boolean;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hrs > 0 ? `${String(hrs).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function PartnerPaymentModal({ ctx }: { ctx: PartnerPaymentModalContext }) {
  const {
    activePayment,
    cancellingOrderId,
    discountRateLabel,
    handleCancelPartnerOrder,
    handleCopyActivationFromModal,
    handleReorderFromModal,
    handleRetryPartnerPayment,
    handleUploadPartnerProof,
    paymentError,
    paymentInitLoading,
    platformConfig,
    proofFile,
    proofSuccessMsg,
    reorderingClientId,
    resendingClientId,
    setActivePayment,
    setProofFile,
    uploadingProof,
  } = ctx;

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);

  const activeOrderId = activePayment?.orderId ?? null;
  const activeStatus = activePayment?.status ?? null;
  const expiryTimestamp = activePayment?.expiryTimestamp ?? null;

  useEffect(() => {
    setConfirmCancel(false);
  }, [activeOrderId, activeStatus]);

  useEffect(() => {
    if (!activeOrderId || activeStatus !== "PENDING" || !expiryTimestamp) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeOrderId, activeStatus, expiryTimestamp]);

  const effectiveNow = nowMs + (activePayment?.serverTimeOffsetMs ?? 0);
  const remainingSec =
    expiryTimestamp !== null ? Math.max(0, Math.floor((expiryTimestamp - effectiveNow) / 1000)) : null;
  const isQrisExpired =
    Boolean(activePayment?.isQrisSessionExpired) ||
    (remainingSec !== null && remainingSec <= 0);
  const isCancelling = Boolean(activePayment && cancellingOrderId === activePayment.orderId);
  const isReordering = Boolean(activePayment && reorderingClientId === activePayment.clientId);
  const canCancelOrder =
    Boolean(activePayment) &&
    activePayment?.status === "PENDING" &&
    !activePayment?.hasProof;

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
                      Paket <strong>{activePayment.planType}</strong> sudah aktif untuk <strong>{activePayment.clientName}</strong>. Tautan aktivasi 48 jam telah dikirim otomatis ke <strong>{activePayment.clientEmail}</strong>, dan kuitansi pembayaran dikirim ke email mitra (tanpa menampilkan harga mitra ke pengantin).
                    </p>
                  </div>
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActivePayment(null)}
                      className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                    >
                      Selesai &amp; Tutup
                    </button>
                    <button
                      type="button"
                      disabled={resendingClientId === activePayment.clientId}
                      onClick={() => handleCopyActivationFromModal()}
                      className="w-full py-2 rounded-xl bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-900 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {resendingClientId === activePayment.clientId
                        ? "Menyiapkan Tautan Baru..."
                        : "Terbitkan Tautan Baru & Salin untuk WhatsApp"}
                    </button>
                    <p className="text-[10px] text-emerald-800/75">
                      Catatan: tombol salin WhatsApp menerbitkan tautan baru yang menggantikan tautan pada email sebelumnya.
                    </p>
                  </div>
                </div>
              ) : activePayment.status === "EXPIRED" ? (
                <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 text-center space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-rose-900">Tagihan Kedaluwarsa / Dibatalkan</div>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      Tagihan <strong>{activePayment.invoiceNumber}</strong> sudah tidak berlaku dan QRIS sebelumnya tidak dapat dibayar. Anda dapat membuat tagihan baru untuk klien ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isReordering}
                      onClick={() => handleReorderFromModal()}
                      className="flex-1 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                    >
                      {isReordering ? "Membuat Tagihan..." : "Buat Tagihan Baru"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePayment(null)}
                      className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
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
                    {activePayment.expiredAt && (
                      <div className="pt-1.5 mt-1.5 border-t border-amber-200/80 text-[11px] text-amber-900">
                        Batas pembayaran: <strong>{formatDateTimeWib(activePayment.expiredAt)}</strong>
                      </div>
                    )}
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
                  {isQrisExpired ? (
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-amber-950">Sesi QRIS Telah Berakhir</div>
                        <p className="text-[11px] text-amber-900/80 leading-relaxed">
                          Kode QRIS sebelumnya sudah kedaluwarsa. Klik tombol di bawah untuk menerbitkan kode QRIS baru untuk tagihan ini.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRetryPartnerPayment()}
                        className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Buat QRIS Baru
                      </button>
                    </div>
                  ) : activePayment.qrString ? (
                    <div className="space-y-3">
                      {remainingSec !== null && (
                        <div
                          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
                            remainingSec <= 120
                              ? "bg-rose-50 border-rose-200 text-rose-800"
                              : "bg-amber-50 border-amber-200 text-amber-950"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Selesaikan dalam</span>
                          <span className="font-mono font-bold tracking-wider">{formatCountdown(remainingSec)}</span>
                        </div>
                      )}
                      <div>
                        <div className="p-4 bg-white rounded-2xl border border-stone-200 inline-block shadow-xs">
                          <img
                            src={`/api/public/qr?size=280&data=${encodeURIComponent(activePayment.qrString)}`}
                            alt="QRIS Pembayaran Mitra"
                            className="w-56 h-56 object-contain mx-auto"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-stone-600">
                        Scan QRIS di atas via m-Banking / e-Wallet. Status pembayaran diperbarui otomatis setiap 4 detik.
                      </p>
                      {activePayment.expiredAt && (
                        <p className="text-[11px] text-stone-400">
                          Batas akhir tagihan: {formatDateTimeWib(activePayment.expiredAt)}
                        </p>
                      )}
                    </div>
                  ) : activePayment.checkoutUrl ? (
                    <div className="space-y-3 py-2">
                      {remainingSec !== null && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-950">
                          <span>Batas sesi:</span>
                          <span className="font-mono font-bold">{formatCountdown(remainingSec)}</span>
                        </div>
                      )}
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
                    <div className="py-4 space-y-3">
                      <p className="text-xs text-stone-500">Sesi pembayaran belum dimuat.</p>
                      <button
                        type="button"
                        onClick={() => handleRetryPartnerPayment()}
                        className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold cursor-pointer"
                      >
                        Muat Ulang Sesi Pembayaran
                      </button>
                    </div>
                  )}

                  {!isQrisExpired && (activePayment.qrString || activePayment.checkoutUrl) && (
                    <div className="flex items-center justify-center gap-2 text-[11px] text-amber-800 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                      <span>Menunggu konfirmasi pembayaran otomatis...</span>
                    </div>
                  )}
                </div>
              )}

              {canCancelOrder && !paymentInitLoading && (
                <div className="pt-3 border-t border-stone-100">
                  {!confirmCancel ? (
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => setConfirmCancel(true)}
                      className="w-full py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                    >
                      Batalkan Tagihan Ini
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 space-y-2 text-center">
                      <p className="text-[11px] text-rose-900 font-medium">
                        Yakin ingin membatalkan tagihan <strong>{activePayment.invoiceNumber}</strong>? QRIS akan dinonaktifkan.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={() => handleCancelPartnerOrder(activePayment.orderId)}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer"
                        >
                          {isCancelling ? "Membatalkan..." : "Ya, Batalkan"}
                        </button>
                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={() => setConfirmCancel(false)}
                          className="px-3.5 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
