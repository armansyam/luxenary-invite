"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import UnifiedAddonModal from "@/components/client/UnifiedAddonModal";
import PrintableQRCardModal from "@/components/client/PrintableQRCardModal";
import GuestOpeningSetupModal from "@/components/client/GuestOpeningSetupModal";

export function MomentsModals({ ctx }: { ctx: {
  daysRemaining: number | null;
  fetchGuestMemories: (invId: string) => Promise<void>;
  handleSaveRollQuota: () => Promise<void>;
  hasExtended: boolean;
  invitation: any;
  isAddonModalOpen: boolean;
  isOpeningModalOpen: boolean;
  isPrintQrModalOpen: boolean;
  isRollModalOpen: boolean;
  isSavingRoll: boolean;
  isSyncHelpModalOpen: boolean;
  memoriesQuota: any;
  planType: string;
  platformSettings: any;
  rollModalInput: number;
  rollModalMsg: { type: "success" | "error"; text: string } | null;
  setInvitation: Dispatch<SetStateAction<any>>;
  setIsAddonModalOpen: (v: boolean) => void;
  setIsOpeningModalOpen: (v: boolean) => void;
  setIsPrintQrModalOpen: (v: boolean) => void;
  setIsRollModalOpen: (v: boolean) => void;
  setIsSyncHelpModalOpen: (v: boolean) => void;
  setRollModalInput: (v: number) => void;
  setStatusToast: Dispatch<SetStateAction<string | null>>;
  sharemomentUrl: string;
  testCameraUrl: string;
} }) {
  const {
    daysRemaining,
    fetchGuestMemories,
    handleSaveRollQuota,
    hasExtended,
    invitation,
    isAddonModalOpen,
    isOpeningModalOpen,
    isPrintQrModalOpen,
    isRollModalOpen,
    isSavingRoll,
    isSyncHelpModalOpen,
    memoriesQuota,
    planType,
    platformSettings,
    rollModalInput,
    rollModalMsg,
    setInvitation,
    setIsAddonModalOpen,
    setIsOpeningModalOpen,
    setIsPrintQrModalOpen,
    setIsRollModalOpen,
    setIsSyncHelpModalOpen,
    setRollModalInput,
    setStatusToast,
    sharemomentUrl,
    testCameraUrl,
  } = ctx;

  return (
    <>
      {/* ── MODALS ── */}
      {/* 1. Modal Studio Desain Kartu Cetak QR */}
      {invitation && (
        <PrintableQRCardModal
          isOpen={isPrintQrModalOpen}
          onClose={() => setIsPrintQrModalOpen(false)}
          invitation={invitation}
          shareMomentUrl={sharemomentUrl}
        />
      )}

      {/* 2. Modal Pengaturan Layar Pembuka Tamu */}
      {invitation && (
        <GuestOpeningSetupModal
          isOpen={isOpeningModalOpen}
          onClose={() => setIsOpeningModalOpen(false)}
          invitation={invitation}
          shareMomentUrl={testCameraUrl}
          onInvitationUpdated={async (updatedInv) => {
            if (updatedInv) {
              setInvitation(updatedInv);
            }
            await fetchGuestMemories(invitation.id);
            setStatusToast("Layar pembuka tamu berhasil diperbarui.");
            setTimeout(() => setStatusToast(null), 2500);
          }}
        />
      )}

      {/* 3. Modal Atur Jatah Roll per Tamu */}
      {isRollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Atur Roll Limit per User Tamu</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">Jatah jepretan foto untuk setiap perangkat tamu</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRollModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {rollModalMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  rollModalMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {rollModalMsg.text}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-800">
                  Jumlah Foto per Tamu (Roll Limit):
                </label>
                <div className="flex items-center gap-2">
                  {[3, 5, 8, 10, 15].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setRollModalInput(count)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        rollModalInput === count
                          ? "bg-amber-900 text-white border-amber-900 shadow-xs"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRollModalOpen(false)}
                  disabled={isSavingRoll}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveRollQuota}
                  disabled={isSavingRoll}
                  className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {isSavingRoll ? "Menyimpan..." : "Simpan Roll Limit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Unified Addon Modal (Tambah Kuota Foto / Masa Simpan) */}
      {invitation && (
        <UnifiedAddonModal
          isOpen={isAddonModalOpen}
          onClose={() => setIsAddonModalOpen(false)}
          invitationId={invitation.id}
          currentPlan={planType}
          currentQuota={memoriesQuota?.maxTotalPhotos || (planType === "TIER_3" ? 1000 : 250)}
          pricingSettings={platformSettings}
          hasExtended={hasExtended}
          daysRemaining={daysRemaining}
        />
      )}

      {/* 5. Modal Panduan Sinkronisasi Susunan Acara */}
      {isSyncHelpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Rangkaian Acara Belum Diisi</h3>
                  <p className="text-[11px] text-stone-500">Studio Undangan (Seksi 5)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncHelpModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-stone-600 leading-relaxed">
              <p>
                Data susunan acara di <strong>Studio Undangan (Seksi 5: Rangkaian Acara)</strong> saat ini masih kosong.
              </p>
              <p className="text-[11px] text-stone-500">
                Silakan isi agenda acara (seperti Akad Nikah, Resepsi, Mappacci, dll.) di Studio terlebih dahulu agar sesi kamera dapat ditarik otomatis, atau Anda tetap bisa menambahkan sesi kamera kustom langsung dengan tombol <strong>&quot;+ Sesi Baru&quot;</strong>.
              </p>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSyncHelpModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Tutup
                </button>
                {invitation?.id && (
                  <Link
                    href={`/dashboard/invitation/${invitation.id}`}
                    className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Buka Studio Undangan</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
