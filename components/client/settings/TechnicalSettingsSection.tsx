"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getApexRootDomain, getInvitationPublicUrl } from "@/lib/domainUtils";
import type { useFeedback } from "@/components/ui/Feedback";
import type { LaunchStage } from "@/components/client/settings/PublishLaunchpadSection";

export interface TechnicalSettingsContext {
  canUseCustomDomain: boolean;
  cnameTarget: string;
  copiedKey: string | null;
  copiedOfficialUrl: boolean;
  customDomain: string;
  customDomainError: string | null;
  customDomainSuccess: boolean;
  editMode: Record<string, boolean>;
  eventNounLabel: string;
  feedback: ReturnType<typeof useFeedback>;
  formData: { subdomain: string; staffPin: string; status: string };
  handleCopyDns: (val: string, key: string) => Promise<void>;
  handleCopyOfficialUrl: () => Promise<void>;
  handleSaveSection: (secKey: string) => Promise<void>;
  hasQrCheckin: boolean;
  invitation: any;
  isCustomDomainEnabled: boolean;
  isDomainOwned: boolean;
  isInitiatingScan: boolean;
  isStaffPinValid: boolean;
  isWeddingEvent: boolean;
  launchStage: LaunchStage;
  platformName: string;
  router: AppRouterInstance;
  saveSuccess: Record<string, boolean>;
  savingCustomDomain: boolean;
  savingSec: string | null;
  serverPublicIp: string;
  setCustomDomain: Dispatch<SetStateAction<string>>;
  setCustomDomainError: Dispatch<SetStateAction<string | null>>;
  setCustomDomainSuccess: Dispatch<SetStateAction<boolean>>;
  setFormData: Dispatch<SetStateAction<{ subdomain: string; staffPin: string; status: string }>>;
  setInvitation: Dispatch<SetStateAction<any>>;
  setIsDomainOwned: Dispatch<SetStateAction<boolean>>;
  setSavingCustomDomain: Dispatch<SetStateAction<boolean>>;
  setShowDnsGuide: Dispatch<SetStateAction<boolean>>;
  showDnsGuide: boolean;
  subdomainStatus: {
    state: "idle" | "checking" | "available" | "unavailable" | "error";
    message: string;
  };
  tier3Name: string;
  toggleEdit: (sec: string) => void;
}

export function TechnicalSettingsSection({ ctx }: { ctx: TechnicalSettingsContext }) {
  const {
    canUseCustomDomain,
    cnameTarget,
    copiedKey,
    copiedOfficialUrl,
    customDomain,
    customDomainError,
    customDomainSuccess,
    editMode,
    eventNounLabel,
    feedback,
    formData,
    handleCopyDns,
    handleCopyOfficialUrl,
    handleSaveSection,
    hasQrCheckin,
    invitation,
    isCustomDomainEnabled,
    isDomainOwned,
    isInitiatingScan,
    isStaffPinValid,
    isWeddingEvent,
    launchStage,
    platformName,
    router,
    saveSuccess,
    savingCustomDomain,
    savingSec,
    serverPublicIp,
    setCustomDomain,
    setCustomDomainError,
    setCustomDomainSuccess,
    setFormData,
    setInvitation,
    setIsDomainOwned,
    setSavingCustomDomain,
    setShowDnsGuide,
    showDnsGuide,
    subdomainStatus,
    tier3Name,
    toggleEdit,
  } = ctx;

  const isArchivedOrTakenDown = formData.status === "ARCHIVED" || formData.status === "TAKEN_DOWN";
  const isSubdomainLocked =
    formData.status === "PUBLISHED" ||
    formData.status === "EVENT_FINISHED" ||
    isArchivedOrTakenDown;
  const activeSubdomain = formData.subdomain || invitation?.subdomain || "";

  return (
    <>
      {/* ──────── PENGATURAN TEKNIS LAINNYA (SLIDE ATAS / GULIR MENGHILANG SECARA ELEGAN SAAT INSPEKSI) ──────── */}
      <div
        className={`space-y-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform will-change-transform ${
          (launchStage !== "IDLE" && launchStage !== "SUCCESS") || isInitiatingScan
            ? "opacity-0 -translate-y-12 max-h-0 pointer-events-none overflow-hidden scale-[0.985] mt-0 invisible"
            : "opacity-100 translate-y-0 max-h-[5000px] pointer-events-auto overflow-visible scale-100 mt-6 visible"
        }`}
        style={{
          transitionProperty: "opacity, transform, max-height, margin, visibility, filter",
        }}
      >
        {/* CARD 1: SUBDOMAIN — setelah terbit, tautan yang sama sudah tampil di hero, jadi kartu ini disembunyikan di HP */}
        <div className={`${isSubdomainLocked ? "hidden sm:block" : ""} bg-white p-4 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4`}>
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Alamat Tautan Subdomain</h3>
              <p className="text-xs text-stone-500">Tentukan alamat URL eksklusif undangan {eventNounLabel} Anda</p>
            </div>
            {!isSubdomainLocked && (
              <button
                type="button"
                onClick={() => toggleEdit("subdomain")}
                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                {editMode.subdomain ? "Tutup" : "Edit"}
              </button>
            )}
          </div>

          {isSubdomainLocked ? (
            /* Mode Rincian Terkunci Pasca Publikasi / Selesai / Arsip */
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tautan Subdomain:</span>
                  <span className="px-2 py-0.5 bg-stone-200 text-stone-700 text-[10px] font-semibold rounded-md flex items-center gap-1">
                    <svg className="w-3 h-3 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>{isArchivedOrTakenDown ? "Terkunci (Arsip)" : "Terkunci Pasca Publikasi"}</span>
                  </span>
                </div>
                {activeSubdomain ? (
                  <a
                    href={getInvitationPublicUrl(activeSubdomain)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs sm:text-sm font-mono font-bold text-amber-900 hover:underline break-all"
                  >
                    {getInvitationPublicUrl(activeSubdomain)}
                  </a>
                ) : (
                  <span className="text-xs font-mono text-stone-500 italic">
                    {isArchivedOrTakenDown
                      ? "Subdomain telah dilepas sesuai masa retensi (tautan kanonikal tetap berlaku)."
                      : "Tidak menggunakan subdomain"}
                  </span>
                )}
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                  {isArchivedOrTakenDown
                    ? "Undangan telah diarsipkan atau dinonaktifkan sehingga pengaturan subdomain tidak dapat diubah."
                    : "Tautan ini telah terkunci secara otomatis demi melindungi keterhubungan QR Code di cetakan fisik Anda."}
                </p>
              </div>

              {activeSubdomain && (
                <button
                  type="button"
                  onClick={handleCopyOfficialUrl}
                  className="px-3.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
                >
                  {copiedOfficialUrl ? "Tersalin!" : "Salin Tautan"}
                </button>
              )}
            </div>
          ) : !editMode.subdomain ? (
            /* Summary Mode Saat Draft */
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Tautan Subdomain:</span>
                {formData.subdomain ? (
                  <a
                    href={getInvitationPublicUrl(formData.subdomain)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs sm:text-sm font-mono font-bold text-amber-900 hover:underline break-all"
                  >
                    {getInvitationPublicUrl(formData.subdomain)}
                  </a>
                ) : (
                  <span className="text-xs sm:text-sm font-mono text-stone-400 italic">
                    Belum dikonfigurasi
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleEdit("subdomain")}
                className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
              >
                Ubah Tautan
              </button>
            </div>
          ) : (
            /* Form Edit Mode Saat Draft */
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-stone-700">Nama Subdomain</label>
                  {subdomainStatus.state === "checking" && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                      <span>Memeriksa...</span>
                    </span>
                  )}
                  {subdomainStatus.state === "available" && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <span>Tersedia</span>
                    </span>
                  )}
                  {subdomainStatus.state === "unavailable" && (
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                      <span>Sudah dipakai</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 overflow-hidden focus-within:border-amber-700 focus-within:ring-2 focus-within:ring-amber-700/20">
                  <span className="pl-3.5 pr-1 text-xs text-stone-400 font-mono select-none">
                    {typeof window !== "undefined" && window.location.protocol === "http:" ? "http://" : "https://"}
                  </span>
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setFormData({ ...formData, subdomain: val });
                    }}
                    placeholder={isWeddingEvent ? "mempelai-wanita-pria" : "nama-acara"}
                    className="flex-1 py-3 px-1 text-xs text-stone-900 font-mono font-bold bg-transparent focus:outline-none"
                  />
                  <span className="pr-3.5 pl-1 text-xs text-stone-400 font-mono select-none">.{getApexRootDomain()}</span>
                </div>

                {subdomainStatus.message && (
                  <p
                    className={`text-[10px] mt-1.5 ${
                      subdomainStatus.state === "available"
                        ? "text-emerald-700"
                        : subdomainStatus.state === "unavailable"
                        ? "text-rose-600"
                        : "text-stone-500"
                    }`}
                  >
                    {subdomainStatus.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-stone-100">
                {invitation?.isFreeDraft ? (
                  <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span className="text-[11px] text-amber-900">
                      Anda dapat mengecek ketersediaan nama subdomain di atas. Klaim subdomain aktif setelah paket diaktifkan.
                    </span>
                    <Link
                      href="/packages"
                      className="shrink-0 px-4 py-2 font-bold rounded-xl text-xs bg-amber-900 hover:bg-amber-950 text-white transition text-center"
                    >
                      Aktifkan Paket untuk Klaim
                    </Link>
                  </div>
                ) : (
                  <>
                    {saveSuccess.subdomain && (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        Tersimpan
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSaveSection("subdomain")}
                      disabled={
                        savingSec === "subdomain" ||
                        subdomainStatus.state === "unavailable" ||
                        subdomainStatus.state === "checking"
                      }
                      className={`px-5 py-2 font-bold rounded-xl text-xs transition flex items-center gap-1.5 ${
                        subdomainStatus.state === "unavailable" || subdomainStatus.state === "checking"
                          ? "bg-stone-200 text-stone-400 border border-stone-300 cursor-not-allowed"
                          : "bg-stone-900 hover:bg-stone-800 text-white cursor-pointer"
                      }`}
                    >
                      {savingSec === "subdomain" ? "Menyimpan..." : "Simpan Subdomain"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

      {/* CARD 3: SECURITY PIN (Hanya tampil untuk paket dengan fitur Resepsionis / QR Check-in) */}
      {hasQrCheckin && (
        <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">PIN Keamanan Panitia</h3>
              <p className="text-xs text-stone-500">Sandi rahasia (4–10 huruf/angka) untuk mengakses Resepsionis, Booth, dan Proyektor</p>
            </div>
            {!isArchivedOrTakenDown ? (
              <button
                type="button"
                onClick={() => toggleEdit("staffPin")}
                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                {editMode.staffPin ? "Tutup" : "Edit"}
              </button>
            ) : (
              <span className="px-2.5 py-1 bg-stone-100 text-stone-500 border border-stone-200 font-semibold rounded-lg text-[10px]">
                Terkunci
              </span>
            )}
          </div>

          {!editMode.staffPin || isArchivedOrTakenDown ? (
            /* Summary Mode */
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">PIN Saat Ini:</span>
                <span className="inline-block mt-1 text-lg font-mono font-black tracking-widest text-amber-900">
                  {formData.staffPin || "—"}
                </span>
              </div>
              {!isArchivedOrTakenDown && (
                <button
                  type="button"
                  onClick={() => toggleEdit("staffPin")}
                  className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
                >
                  Ubah PIN
                </button>
              )}
            </div>
          ) : (
            /* Form Edit Mode */
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Masukkan PIN Baru</label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.staffPin}
                  onChange={(e) => setFormData({ ...formData, staffPin: e.target.value })}
                  placeholder="Contoh: 123456"
                  className="w-full py-3 px-4 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm font-mono font-bold focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 transition"
                />
                <p className={`text-[11px] mt-1.5 ${isStaffPinValid ? "text-stone-500" : "text-rose-600"}`}>
                  4–10 karakter, huruf atau angka saja. Akan diminta saat membuka link fitur operasional.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                {saveSuccess.staffPin && (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    Tersimpan
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveSection("staffPin")}
                  disabled={savingSec === "staffPin" || !isStaffPinValid}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingSec === "staffPin" ? "Menyimpan..." : "Simpan PIN"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────── CUSTOM DOMAIN ──────── */}
      {(isCustomDomainEnabled || Boolean(invitation?.customDomain)) && (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900 leading-tight">Domain Sendiri</h2>
            <p className="text-[11px] text-stone-400 mt-0.5">Gunakan domain pribadi Anda (mis. undangan-kami.com) sebagai pengganti subdomain {platformName || "platform kami"}.</p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            !invitation?.customDomain && !isCustomDomainEnabled
              ? "bg-amber-100/70 text-amber-900 border-amber-300"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            {!invitation?.customDomain && !isCustomDomainEnabled ? "Segera Hadir" : (canUseCustomDomain ? "Tersedia" : "Terkunci")}
          </span>
        </div>

        {isArchivedOrTakenDown && !invitation?.customDomain ? (
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-500">
            Undangan ini telah diarsipkan atau dinonaktifkan sehingga tidak dapat menautkan domain kustom baru.
          </div>
        ) : !canUseCustomDomain && !invitation?.customDomain ? (
          /* Mode Terkunci: Memerlukan kapabilitas Custom Domain */
          <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">Fitur Custom Domain Belum Aktif</h4>
                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed max-w-xl">
                  Layanan integrasi nama domain pribadi (.com / .id) belum aktif untuk paket Anda. Hubungi administrator atau tingkatkan paket Anda untuk menikmati fitur ini.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Link
                href={invitation?.isFreeDraft ? "/packages" : "/dashboard?upgrade=true"}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                <span>{invitation?.isFreeDraft ? `Aktifkan Paket ${tier3Name}` : `Upgrade ke Paket ${tier3Name}`}</span>
              </Link>
            </div>
          </div>
        ) : !invitation?.customDomain && !isCustomDomainEnabled ? (
          /* Mode Segera Hadir / Belum Tersedia */
          <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50/80 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">Layanan Integrasi Domain Pribadi Segera Hadir</h4>
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed max-w-xl">
                  Fitur integrasi nama domain pribadi (.com / .id / lainnya) sedang dalam tahap finalisasi dan belum dibuka untuk umum. Undangan Anda tetap dapat diakses eksklusif melalui tautan subdomain yang sudah aktif.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="inline-block px-3.5 py-2 bg-stone-200 text-stone-500 text-xs font-bold rounded-xl cursor-not-allowed select-none">
                Belum Tersedia
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Panduan DNS */}
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDnsGuide((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition cursor-pointer"
          >
            <span className="text-xs font-bold text-stone-700">Cara setup — 3 langkah mudah</span>
            <svg
              className={`w-4 h-4 text-stone-400 transition-transform ${showDnsGuide ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDnsGuide && (
            <div className="px-4 pb-4 space-y-3 border-t border-stone-100 pt-3 bg-stone-50/50">
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Setelah membeli domain di registrar (Niagahoster, Namecheap, Domainesia, dll), ikuti langkah berikut:
              </p>

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-xs font-bold text-stone-800">Login ke panel DNS domain Anda</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Buka bagian DNS Management / DNS Zone di registrar tempat Anda membeli domain.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">2</div>
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="text-xs font-bold text-stone-800">Tambahkan 2 DNS Record berikut di registrar domain Anda:</p>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Sesuai standar registrar, pasang <strong>Record A</strong> untuk domain utama (apex) dan <strong>Record CNAME</strong> untuk awalan www.
                    </p>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-stone-200 text-[11px] shadow-xs">
                    <div className="grid grid-cols-12 bg-stone-100 px-3 py-2 text-[10px] font-bold text-stone-600 uppercase tracking-wider border-b border-stone-200">
                      <span className="col-span-2">Tipe</span>
                      <span className="col-span-3">Host / Name</span>
                      <span className="col-span-5">Value / Target</span>
                      <span className="col-span-2 text-right">Aksi</span>
                    </div>

                    {/* Baris 1: Record A untuk Root Domain Apex */}
                    <div className="grid grid-cols-12 px-3 py-2.5 bg-white items-center border-b border-stone-100 text-stone-800 font-mono">
                      <span className="col-span-2 font-bold text-emerald-700 font-sans text-xs">A</span>
                      <div className="col-span-3">
                        <span className="font-bold">@</span>
                        <span className="text-[10px] text-stone-400 block font-sans font-normal">(Root Apex)</span>
                      </div>
                      <div className="col-span-5">
                        <span className="font-bold text-stone-900 break-all">{serverPublicIp || "IP Server Belum Diatur"}</span>
                        <span className="text-[10px] text-stone-400 block font-sans font-normal">IP Publik Server VPS</span>
                      </div>
                      <div className="col-span-2 text-right font-sans">
                        {serverPublicIp ? (
                          <button
                            type="button"
                            onClick={() => handleCopyDns(serverPublicIp, "ip")}
                            className="px-2 py-1 text-[10px] font-bold rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 transition cursor-pointer"
                          >
                            {copiedKey === "ip" ? "Disalin!" : "Salin"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">N/A</span>
                        )}
                      </div>
                    </div>

                    {/* Baris 2: Record CNAME untuk www */}
                    <div className="grid grid-cols-12 px-3 py-2.5 bg-stone-50/50 items-center text-stone-800 font-mono">
                      <span className="col-span-2 font-bold text-amber-700 font-sans text-xs">CNAME</span>
                      <div className="col-span-3">
                        <span className="font-bold">www</span>
                        <span className="text-[10px] text-stone-400 block font-sans font-normal">(Subdomain)</span>
                      </div>
                      <div className="col-span-5">
                        <span className="font-bold text-stone-900 break-all">{cnameTarget || "Target CNAME Belum Diatur"}</span>
                        <span className="text-[10px] text-stone-400 block font-sans font-normal">Host Target CNAME</span>
                      </div>
                      <div className="col-span-2 text-right font-sans">
                        {cnameTarget ? (
                          <button
                            type="button"
                            onClick={() => handleCopyDns(cnameTarget, "cname")}
                            className="px-2 py-1 text-[10px] font-bold rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 transition cursor-pointer"
                          >
                            {copiedKey === "cname" ? "Disalin!" : "Salin"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">N/A</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-stone-100/70 border border-stone-200 text-[10px] text-stone-600 leading-relaxed">
                    <strong>Catatan Subdomain Khusus:</strong> Jika Anda ingin menggunakan subdomain tertentu (contoh: <code>wedding.namakamu.com</code>), cukup tambahkan 1 record <strong>CNAME</strong> dengan Host <code>wedding</code> mengarah ke <code>{cnameTarget || "target CNAME"}</code>.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-xs font-bold text-stone-800">Daftarkan domain di bawah ini & hubungi Admin</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Setelah DNS propagasi (biasanya 5–30 menit), isi field domain di bawah dan simpan. Lalu kirim pesan ke Admin agar SSL-nya diaktifkan.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  <strong>Propagasi DNS</strong> bisa memakan waktu hingga 48 jam tergantung registrar, namun biasanya selesai dalam 5–30 menit.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input domain */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-stone-700">Domain Anda</label>
          <div className="space-y-3">
            {canUseCustomDomain ? (
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/70">
                  <h5 className="text-amber-950 font-bold text-xs mb-1 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>Fitur Termasuk Bebas Biaya (Gratis)</span>
                  </h5>
                  <p className="text-amber-900/80 text-[11px] leading-relaxed">
                    Sistem akan menyambungkan nama domain yang <b>SUDAH ANDA BELI SENDIRI</b> dari registrar (Niagahoster, Cloudflare, Rumahweb, dll) ke server undangan ini tanpa biaya integrasi tambahan.
                  </p>
                </div>
                
                <label className="block text-[11px] font-bold text-stone-700">Masukkan Nama Domain Anda (Contoh: budi-ani.com)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => {
                      setCustomDomain(e.target.value.toLowerCase().replace(/\s/g, ""));
                      setCustomDomainError(null);
                      setCustomDomainSuccess(false);
                    }}
                    placeholder="contoh: budi-ani.com"
                    className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 bg-white text-sm font-mono focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 transition text-stone-900"
                  />
                </div>
                
                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-stone-200">
                  <input 
                    type="checkbox" 
                    id="confirm-domain" 
                    className="mt-0.5 rounded text-amber-700 focus:ring-amber-700 cursor-pointer"
                    checked={isDomainOwned}
                    onChange={(e) => setIsDomainOwned(e.target.checked)}
                  />
                  <label htmlFor="confirm-domain" className="text-[11px] text-stone-600 leading-snug cursor-pointer select-none">
                    Saya menyatakan bahwa saya <b>TELAH MEMBELI &amp; MEMILIKI</b> nama domain di atas secara sah serta telah mengatur DNS sesuai tabel di atas.
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {invitation?.customDomain ? (
                    <button
                      type="button"
                      disabled={savingCustomDomain}
                      onClick={async () => {
                        const confirmed = await feedback.confirm({
                          title: "Lepaskan domain kustom",
                          message: "Apakah Anda yakin ingin melepaskan domain kustom dari undangan ini?",
                          confirmLabel: "Lepaskan",
                          danger: true,
                        });
                        if (!confirmed) return;
                        setSavingCustomDomain(true);
                        setCustomDomainError(null);
                        try {
                          const res = await fetch("/api/client/custom-domain", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ invitationId: invitation.id, customDomain: "" }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setCustomDomain("");
                            setInvitation((prev: any) => prev ? { ...prev, customDomain: null } : null);
                            setCustomDomainSuccess(true);
                          } else {
                            setCustomDomainError(data.error || "Gagal melepaskan domain");
                          }
                        } catch (e: any) {
                          setCustomDomainError(e.message || "Gagal melepaskan domain");
                        } finally {
                          setSavingCustomDomain(false);
                        }
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
                    >
                      Lepaskan Domain
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    disabled={savingCustomDomain || !customDomain || !invitation?.id || (!invitation?.customDomain && !isDomainOwned)}
                    onClick={async () => {
                      if (!isDomainOwned && !invitation?.customDomain) {
                        setCustomDomainError("Anda harus mencentang persetujuan kepemilikan domain.");
                        return;
                      }
                      setSavingCustomDomain(true);
                      setCustomDomainError(null);
                      setCustomDomainSuccess(false);
                      try {
                        const response = await fetch("/api/client/custom-domain", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            invitationId: invitation.id,
                            customDomain: customDomain,
                          }),
                        });
                        const resData = await response.json();
                        if (response.ok) {
                          setCustomDomainSuccess(true);
                          setInvitation((prev: any) => prev ? { ...prev, customDomain: resData.customDomain } : null);
                        } else {
                          setCustomDomainError(resData.error || "Gagal menyimpan domain");
                        }
                      } catch (err: any) {
                        setCustomDomainError(err.message || "Terjadi kesalahan jaringan");
                      }
                      setSavingCustomDomain(false);
                    }}
                    className={`px-4 py-2 bg-amber-800 text-white font-bold rounded-xl text-xs whitespace-nowrap transition flex items-center justify-center min-w-[120px] ${(!customDomain || (!invitation?.customDomain && !isDomainOwned)) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-900 cursor-pointer'}`}
                  >
                    {savingCustomDomain ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Menyimpan...</span>
                      </span>
                    ) : (
                      "Simpan Domain"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-purple-950">Fitur Custom Domain (.com / .id)</h4>
                  <p className="text-[11px] text-purple-800/80 mt-1">Gunakan domain Anda sendiri untuk alamat website undangan. Fitur ini tersedia eksklusif pada Paket {tier3Name} (bebas biaya jasa integrasi).</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(invitation?.isFreeDraft ? "/packages" : "/dashboard?upgrade=true")}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition whitespace-nowrap shadow-xs cursor-pointer"
                >
                  {invitation?.isFreeDraft ? `Aktifkan Paket ${tier3Name}` : `Upgrade ke Paket ${tier3Name}`}
                </button>
              </div>
            )}
          </div>

          {customDomainError && (
            <p className="text-[11px] text-red-600 font-medium">{customDomainError}</p>
          )}
          {customDomainSuccess && (
            <p className="text-[11px] text-emerald-600 font-semibold">Domain berhasil disimpan. Hubungi Admin untuk aktivasi SSL.</p>
          )}
          {invitation?.customDomain && !customDomainSuccess && (
            <p className="text-[11px] text-stone-400">
              Domain aktif saat ini: <span className="font-mono font-bold text-stone-700">{invitation.customDomain}</span>
            </p>
          )}
        </div>
      </>
    )}
  </div>
      )}
      </div>
    </>
  );
}
