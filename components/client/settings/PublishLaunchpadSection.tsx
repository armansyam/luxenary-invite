"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";
import type { computeLifecycleDates } from "@/lib/lifecycleDates";

export type LaunchStage =
  | "IDLE"
  | "SCANNING"
  | "HALT_MANDATORY"
  | "REVIEW_OPTIONAL"
  | "READY_ALL"
  | "PUBLISHING"
  | "SUCCESS";

export interface AuditRuleItem {
  id: string;
  title: string;
  desc: string;
  hasToggle: boolean;
  isToggledOn: (inv: any) => boolean;
  hasData: (inv: any, fd: any) => boolean;
  missingMessage?: string;
  getMissingMessage?: (inv: any) => string;
}

export interface ReviewChecklistItem {
  id: string;
  badge: string;
  title: string;
  desc: string;
  url: string;
  previewUrl?: string;
  checkLabel: string;
}

export interface PublishLaunchpadContext {
  AUDIT_RULES: AuditRuleItem[];
  activeScanIndex: number;
  allUrlsReviewed: boolean;
  cancelAudit: () => void;
  copiedOfficialUrl: boolean;
  copiedReviewKey: string | null;
  emptyOptionals: string[];
  evaluateRule: (rule: AuditRuleItem, inv: any, fd: any) => "PASSED" | "DISABLED" | "FAILED";
  eventNounLabel: string;
  executePublish: () => Promise<void>;
  finalReviewChecks: Record<string, boolean>;
  formData: { subdomain: string; staffPin: string; status: string };
  formatLifecycleDate: (date: Date) => string;
  getEventDateFormatted: () => string | null;
  haltReasons: string[];
  handleCopyOfficialUrl: () => Promise<void>;
  handleCopyReviewUrl: (key: string, url: string) => Promise<void>;
  handleShareWa: () => void;
  invitation: any;
  isInitiatingScan: boolean;
  isReturningToIdle: boolean;
  isWeddingEvent: boolean;
  launchStage: LaunchStage;
  lifecycleDates: ReturnType<typeof computeLifecycleDates>;
  normalizedStatus: string;
  officialUrl: string;
  previewQuery: string;
  reviewItems: ReviewChecklistItem[];
  savingSec: string | null;
  setFinalReviewChecks: Dispatch<SetStateAction<Record<string, boolean>>>;
  setLaunchStage: Dispatch<SetStateAction<LaunchStage>>;
  startSequentialAudit: () => void;
}

export function PublishLaunchpadSection({ ctx }: { ctx: PublishLaunchpadContext }) {
  const {
    AUDIT_RULES,
    activeScanIndex,
    allUrlsReviewed,
    cancelAudit,
    copiedOfficialUrl,
    copiedReviewKey,
    emptyOptionals,
    evaluateRule,
    eventNounLabel,
    executePublish,
    finalReviewChecks,
    formData,
    formatLifecycleDate,
    getEventDateFormatted,
    haltReasons,
    handleCopyOfficialUrl,
    handleCopyReviewUrl,
    handleShareWa,
    invitation,
    isInitiatingScan,
    isReturningToIdle,
    isWeddingEvent,
    launchStage,
    lifecycleDates,
    normalizedStatus,
    officialUrl,
    previewQuery,
    reviewItems,
    savingSec,
    setFinalReviewChecks,
    setLaunchStage,
    startSequentialAudit,
  } = ctx;

  const isArchivedOrTakenDown = formData.status === "ARCHIVED" || formData.status === "TAKEN_DOWN";
  const isEventFinished = formData.status === "EVENT_FINISHED";
  const isLiveOrFinished = formData.status === "PUBLISHED" || isEventFinished;

  return (
    <>
      {/* ──────── HERO LAUNCHPAD: STATUS PUBLIKASI & AUDIT SEKUANSIAL ──────── */}
      {isArchivedOrTakenDown ? (
        <div className="bg-stone-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl border border-stone-800 relative overflow-hidden space-y-5">
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <span className="px-3 py-1 bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>{formData.status === "ARCHIVED" ? "Status: Diarsipkan (Baca-Saja)" : "Status: Dinonaktifkan Sistem"}</span>
            </span>
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 leading-tight">
                {formData.status === "ARCHIVED"
                  ? `Undangan ${resolveInvitationDisplayName(invitation)} Telah Diarsipkan`
                  : `Undangan ${resolveInvitationDisplayName(invitation)} Sedang Dinonaktifkan`}
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl">
                {formData.status === "ARCHIVED"
                  ? "Masa aktif undangan dan galeri foto tamu telah selesai. Pengaturan publikasi, subdomain, dan PIN panitia dikunci otomatis. Rekap doa & daftar tamu tetap dapat diunduh dari Beranda Arsip."
                  : "Undangan ini sedang dinonaktifkan oleh Administrator sehingga seluruh perubahan pengaturan dikunci sementara."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                href="/dashboard"
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition"
              >
                Kembali ke Beranda Arsip
              </Link>
              {formData.status === "ARCHIVED" && invitation?.invitationSlug && (
                <a
                  href={`/${invitation.invitationSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold rounded-xl text-xs transition"
                >
                  Lihat Tautan Arsip
                </a>
              )}
            </div>
          </div>
        </div>
      ) : isLiveOrFinished ? (
        /* BANNER SELEBRASI RESMI / PASCA-ACARA: KATA SAMBUTAN FORMAL & HUB TAUTAN RESMI */
        <div className="bg-stone-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border border-stone-800 relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4 sm:space-y-5">
            {/* Header Lencana */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2 border ${
                isEventFinished
                  ? "bg-purple-500/15 border-purple-500/30 text-purple-200"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              }`}>
                <span className={`w-2 h-2 rounded-full ${isEventFinished ? "bg-purple-400" : "bg-emerald-400 animate-pulse"}`}></span>
                <span className="sm:hidden">{isEventFinished ? "Acara Selesai" : "Sudah Terbit"}</span>
                <span className="hidden sm:inline">
                  {isEventFinished
                    ? "Acara Selesai · Mode Galeri Kenangan Pasca-Acara"
                    : "Undangan Resmi Telah Mengudara · Terverifikasi Sistem"}
                </span>
              </span>
              <span className="hidden sm:inline text-[11px] text-stone-400 font-mono">
                {invitation?.themeId ? `Tema: ${invitation.themeId}` : ""}
              </span>
            </div>

            {/* Sambutan Formal & Netral Layanan Klien */}
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-100 leading-tight">
                {isEventFinished
                  ? `Rangkaian Acara ${resolveInvitationDisplayName(invitation)} Telah Usai`
                  : (!invitation?.eventType || invitation.eventType === "WEDDING")
                  ? `Selamat Berbahagia untuk ${resolveInvitationDisplayName(invitation)}`
                  : `Selamat & Sukses untuk ${resolveInvitationDisplayName(invitation)}`}
              </h2>
              <p className="hidden sm:block text-sm text-stone-300/90 leading-relaxed max-w-2xl">
                {isEventFinished
                  ? "Undangan kini berada pada masa pasca-acara sebelum diarsipkan otomatis. Anda masih dapat mengunduh galeri momen dan rekap tamu sebelum masa retensi berakhir."
                  : (!invitation?.eventType || invitation.eventType === "WEDDING")
                  ? "Website undangan pernikahan resmi Anda kini telah aktif mengudara dan siap dibagikan kepada keluarga, sahabat, serta seluruh tamu kehormatan."
                  : "Website undangan resmi Anda kini telah aktif mengudara dan siap dibagikan kepada keluarga, sahabat, serta seluruh tamu kehormatan."}
              </p>
            </div>

            {/* Official Launch Box: Tautan Resmi & Akses */}
            <div className="p-4 sm:p-5 bg-stone-950/80 rounded-2xl border border-stone-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="sm:hidden">Tautan Undangan</span>
                  <span className="hidden sm:inline">Tautan Undangan Resmi (Enkripsi SSL Aktif)</span>
                </span>
                <span className="hidden sm:inline text-[10px] font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  Aktif &amp; Terlindungi
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs sm:text-sm font-mono font-bold text-amber-300 hover:text-amber-200 hover:underline break-all"
                >
                  {officialUrl}
                </a>

                <div className="grid grid-cols-[1fr_1fr_auto] sm:flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyOfficialUrl}
                    className="min-h-11 sm:min-h-0 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold whitespace-nowrap transition border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>{copiedOfficialUrl ? "Tersalin!" : "Salin Tautan"}</span>
                  </button>

                  <a
                    href={
                      normalizedStatus === "DRAFT"
                        ? (officialUrl.includes("?") ? `${officialUrl}&${previewQuery}` : `${officialUrl}?${previewQuery}`)
                        : officialUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-11 sm:min-h-0 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-xl text-xs font-semibold whitespace-nowrap transition border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Buka Web</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  <button
                    type="button"
                    onClick={handleShareWa}
                    className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title="Bagikan Tautan ke WhatsApp"
                    aria-label="Bagikan tautan ke WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="hidden sm:inline">Bagikan</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Informasi Detail Masa Aktif & Tanggal Acara */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-stone-800/50 border border-stone-800 text-xs space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Masa Berlaku:</span>
                {lifecycleDates ? (
                  <ul className="text-stone-200 font-medium space-y-1">
                    <li>
                      Subdomain hingga <strong className="text-amber-300">{formatLifecycleDate(lifecycleDates.subdomainReleaseAt)}</strong>
                    </li>
                    <li>
                      Galeri foto tamu hingga <strong className="text-amber-300">{formatLifecycleDate(lifecycleDates.galleryExpiresAt)}</strong>
                    </li>
                    <li>
                      Undangan tersimpan hingga <strong className="text-amber-300">{formatLifecycleDate(lifecycleDates.archiveExpiresAt)}</strong>
                    </li>
                  </ul>
                ) : (
                  <p className="text-stone-200 font-medium">Tanggal acara utama belum diatur.</p>
                )}
                <p className="hidden sm:block text-[10px] text-stone-400 leading-normal">
                  {invitation?.galleryExpiresAt
                    ? "Masa simpan galeri telah diperpanjang melalui paket add-on."
                    : "Dihitung otomatis dari tanggal acara utama sesuai zona waktu acara. Alamat slug tetap menjadi tautan utama setelah subdomain berakhir."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-800/50 border border-stone-800 text-xs space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Tanggal Acara Utama:</span>
                <p className="text-stone-200 font-medium">
                  {getEventDateFormatted() ? (
                    <strong className="text-stone-100">{getEventDateFormatted()}</strong>
                  ) : (
                    <span className="text-stone-400 italic">Belum ditentukan</span>
                  )}
                </p>
                <p className="hidden sm:block text-[10px] text-stone-400 leading-normal">
                  Referensi hitung mundur dan arsip digital {eventNounLabel}.
                </p>
              </div>
            </div>

            {/* Banner Keterhubungan Buku Tamu */}
            <div className="hidden md:flex p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 to-stone-900 border border-amber-500/25 flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-100">Buku Tamu Telah Terhubung Otomatis</h4>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                    Tautan khusus untuk setiap tamu kini telah aktif. Anda dapat langsung membagikan undangan personal dengan nama tamu masing-masing melalui menu Buku Tamu.
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/guests"
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>Buka Buku Tamu</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* HERO LAUNCHPAD: MODE SEBELUM PUBLIKASI & AUDIT RADAR SEKUANSIAL */
        <div
          className={`text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            launchStage === "SCANNING"
              ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-amber-500/40 shadow-[0_0_50px_-10px_rgba(245,158,11,0.25)]"
              : launchStage === "HALT_MANDATORY"
              ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-rose-500/40 shadow-[0_0_50px_-10px_rgba(244,63,94,0.25)]"
              : launchStage === "REVIEW_OPTIONAL"
              ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-amber-500/40 shadow-[0_0_50px_-10px_rgba(245,158,11,0.25)]"
              : launchStage === "READY_ALL"
              ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-emerald-500/40 shadow-[0_0_50px_-10px_rgba(16,185,129,0.25)]"
              : "bg-stone-900 border border-stone-800 shadow-xl"
          }`}
        >
          {/* Keyframes Animasi Khusus Apple / Luxury Lens Dissolve */}
          <style>{`
            @keyframes luxCardMorphIn {
              0% {
                opacity: 0;
                transform: translateY(16px) scale(0.985);
                filter: blur(6px);
              }
              60% {
                filter: blur(0px);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0px);
              }
            }
            .animate-lux-morph {
              animation: luxCardMorphIn 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>

          {/* Aura Cahaya Reaktif Latar Belakang */}
          <div
            className={`absolute top-0 right-0 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ease-out ${
              launchStage === "SCANNING"
                ? "w-96 h-96 bg-amber-500/20 translate-x-8 -translate-y-8 animate-pulse"
                : launchStage === "HALT_MANDATORY"
                ? "w-80 h-80 bg-rose-500/20 translate-x-8 -translate-y-8"
                : launchStage === "REVIEW_OPTIONAL"
                ? "w-80 h-80 bg-amber-500/20 translate-x-8 -translate-y-8"
                : launchStage === "READY_ALL"
                ? "w-96 h-96 bg-emerald-500/20 translate-x-8 -translate-y-8 animate-pulse"
                : "w-80 h-80 bg-amber-600/10"
            }`}
          />

          {/* STAGE 1: IDLE */}
          {launchStage === "IDLE" && (
            <div
              className={`relative z-10 space-y-4 transition-all duration-300 ${
                isInitiatingScan ? "opacity-0 -translate-y-2 filter blur-sm scale-[0.99]" : "animate-lux-morph"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Status: Draft (Penyusunan Konten)</span>
                </span>
                <span className="text-[11px] text-stone-400">
                  {AUDIT_RULES.length} Komponen Kesiapan Siap Diperiksa
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-100">
                  Peluncuran Undangan Resmi
                </h2>
                <p className="text-xs sm:text-sm text-stone-400 max-w-2xl leading-relaxed">
                  Lakukan verifikasi menyeluruh kelayakan data sebelum website resmi diaktifkan. Setelah peluncuran, desain tema dan alamat tautan resmi akan dikunci demi menjaga keutuhan tautan tamu dan cetak fisik.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-stone-800/80">
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Pemeriksaan otomatis mencakup tautan, nama {isWeddingEvent ? "mempelai" : "profil"}, tanggal acara, media, dan PIN keamanan.</span>
                </div>

                <button
                  type="button"
                  onClick={startSequentialAudit}
                  disabled={isInitiatingScan}
                  className={`w-full sm:w-auto px-6 py-3.5 font-bold rounded-xl text-xs transition-all duration-300 shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                    isInitiatingScan
                      ? "bg-amber-500/80 text-stone-900 scale-95 opacity-90"
                      : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 active:scale-95 hover:shadow-amber-500/20"
                  }`}
                >
                  {isInitiatingScan ? (
                    <>
                      <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyiapkan Pemindai...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Mulai Pemeriksaan &amp; Publikasikan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: SCANNING (FOKUS PENUH DENGAN SLIDING TICKER 3 BARIS) */}
          {launchStage === "SCANNING" && (
            <div
              className={`relative z-10 space-y-5 transition-all duration-300 ${
                isReturningToIdle ? "opacity-0 translate-y-2 filter blur-sm" : "animate-lux-morph"
              }`}
            >
              {/* Radar Scanner Visual & Progress Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-xl border border-amber-500/40 animate-ping opacity-30"></div>
                    <svg className="w-5 h-5 text-amber-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-100">Memeriksa Kesiapan Peluncuran...</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Memverifikasi Bagian {Math.min(activeScanIndex + 1, AUDIT_RULES.length)} dari {AUDIT_RULES.length} ({Math.round((Math.min(activeScanIndex + 1, AUDIT_RULES.length) / AUDIT_RULES.length) * 100)}%)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cancelAudit}
                  disabled={isReturningToIdle}
                  className="text-xs text-stone-400 hover:text-white px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 transition cursor-pointer self-start sm:self-auto active:scale-95"
                >
                  {isReturningToIdle ? "Membatalkan..." : "Batalkan"}
                </button>
              </div>

              {/* JENDELA SLIDING TICKER 3 BARIS (Item selesai bergulir naik ke atas) */}
              <div
                className="relative h-[156px] overflow-hidden rounded-2xl bg-stone-950/70 border border-stone-800 p-0 select-none shadow-inner"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                }}
              >
                <div
                  className="transition-transform duration-500 ease-out will-change-transform"
                  style={{
                    transform: `translateY(-${activeScanIndex * 52}px)`,
                  }}
                >
                  {/* Slot 0: Inisialisasi */}
                  <div className="h-[52px] px-4 flex items-center justify-between gap-3 border-b border-stone-800/40 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-stone-300">Inisialisasi Sistem Pemindai Undangan</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">Siap</span>
                  </div>

                  {/* Slot 1-10: Item Audit Sekuensial */}
                  {AUDIT_RULES.map((rule, idx) => {
                    const evalStatus = evaluateRule(rule, invitation, formData);
                    const isCurrent = activeScanIndex === idx;
                    const isPast = activeScanIndex > idx;

                    return (
                      <div
                        key={rule.id}
                        className={`h-[52px] px-4 flex items-center justify-between gap-3 border-b border-stone-800/40 transition-all duration-300 ${
                          isCurrent
                            ? "bg-amber-500/15 border border-amber-500/30 text-white font-bold scale-[1.01]"
                            : isPast
                            ? "opacity-80 text-stone-300"
                            : "opacity-35 text-stone-500"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isPast ? (
                            evalStatus === "PASSED" ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : evalStatus === "DISABLED" ? (
                              <div className="w-6 h-6 rounded-full bg-stone-800/50 border border-stone-700 flex items-center justify-center shrink-0">
                                <span className="w-2 h-0.5 bg-stone-400 rounded-full"></span>
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                                <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </div>
                            )
                          ) : isCurrent ? (
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-stone-800/40 flex items-center justify-center shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-600"></span>
                            </div>
                          )}

                          <div className="truncate">
                            <span className={`text-xs block truncate ${isCurrent ? "text-amber-200 font-bold" : ""}`}>
                              {rule.title}
                            </span>
                            <span className="text-[10px] text-stone-400 block truncate">{rule.desc}</span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isPast ? (
                            evalStatus === "PASSED" ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                Terverifikasi
                              </span>
                            ) : evalStatus === "DISABLED" ? (
                              <span className="text-[10px] font-bold text-stone-400 bg-stone-800/60 px-2 py-0.5 rounded-md border border-stone-700">
                                Nonaktif (Dilewati)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                                Wajib Diisi
                              </span>
                            )
                          ) : isCurrent ? (
                            <span className="text-[10px] font-bold text-amber-300 animate-pulse">
                              Memindai...
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-stone-600">
                              Antrean
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Slot 11: Penyelesaian */}
                  <div className="h-[52px] px-4 flex items-center justify-between gap-3 border-b border-stone-800/40 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                      </div>
                      <span className="text-xs font-medium text-stone-300">Menyelesaikan Evaluasi Kelayakan...</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400">Finalisasi</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: HALT MANDATORY (DATA WAJIB BELUM LENGKAP - ELEGAN & POLITE) */}
          {launchStage === "HALT_MANDATORY" && (
            <div
              className={`relative z-10 space-y-5 transition-all duration-300 ${
                isReturningToIdle ? "opacity-0 translate-y-2 filter blur-sm" : "animate-lux-morph"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <span className="px-3 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                  <span>Verifikasi Terhenti Sementara</span>
                </span>
                <span className="text-[11px] text-rose-400/90 font-medium">
                  Syarat Wajib Memerlukan Perhatian
                </span>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-stone-900 to-stone-900 border border-rose-500/30 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-rose-200">
                    {haltReasons.length} Data Wajib Belum Lengkap
                  </h4>
                  <ol className="list-decimal pl-4 space-y-1.5 text-xs text-rose-300/90 leading-relaxed">
                    {haltReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ol>
                  <p className="text-[11px] text-stone-400 pt-1">
                    Silakan tekan tombol di bawah untuk melengkapi data yang diperlukan. Seluruh form pengaturan akan kembali terbuka secara otomatis.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={cancelAudit}
                  disabled={isReturningToIdle}
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 font-semibold rounded-xl text-xs transition border border-stone-700 cursor-pointer"
                >
                  {isReturningToIdle ? "Membuka Pengaturan..." : "Kembali ke Pengaturan"}
                </button>

                {invitation?.id && (
                  <Link
                    href={`/dashboard/invitation/${invitation.id}`}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Buka Edit Undangan</span>
                    <svg className="w-3.5 h-3.5 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* STAGE 4: REVIEW OPTIONAL (DATA WAJIB LENGKAP, DATA OPSIONAL KOSONG) */}
          {launchStage === "REVIEW_OPTIONAL" && (
            <div
              className={`relative z-10 space-y-5 transition-all duration-300 ${
                isReturningToIdle ? "opacity-0 translate-y-2 filter blur-sm" : "animate-lux-morph"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <h3 className="text-base font-bold text-stone-100">Seluruh Syarat Wajib Terpenuhi</h3>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed max-w-2xl">
                  Data utama Anda telah lengkap dan siap mengudara. Kami mencatat beberapa bagian opsional berikut belum Anda isi:
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {emptyOptionals.map((item, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-stone-800/80 border border-stone-700 text-amber-300 text-[11px] font-medium flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={cancelAudit}
                    disabled={isReturningToIdle}
                    className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 rounded-xl text-xs font-semibold transition border border-stone-700 cursor-pointer"
                  >
                    {isReturningToIdle ? "Memulihkan..." : "Kembali & Lengkapi Data"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLaunchStage("READY_ALL")}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Tetap Lanjutkan ke Tinjauan Akhir</span>
                    <svg className="w-3.5 h-3.5 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>

                {/* Catatan Diskret Santun (Bukan Popup Mengganggu) */}
                <p className="text-[11px] text-stone-500 text-right leading-relaxed">
                  Catatan: Setelah proses publikasi, pemilihan tema dan alamat URL resmi akan dikunci demi menjaga keutuhan tautan para tamu serta cetak fisik.
                </p>
              </div>
            </div>
          )}

          {/* STAGE 5: READY ALL / FINAL PRE-FLIGHT REVIEW CHECKLIST */}
          {launchStage === "READY_ALL" && (
            <div
              className={`relative z-10 space-y-5 transition-all duration-300 ${
                isReturningToIdle ? "opacity-0 translate-y-2 filter blur-sm" : "animate-lux-morph"
              }`}
            >
              {/* Header Status & Progress Tinjauan */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Verifikasi Data Lengkap · Tinjauan Akhir Instrumen URL</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {reviewItems.filter((i) => !!finalReviewChecks[i.id]).length} / {reviewItems.length}
                  </span>
                  <span className="text-[11px] text-stone-400">URL Dikonfirmasi</span>
                </div>
              </div>

              {/* Deskripsi Edukasi Pre-Flight */}
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-100">
                  Konfirmasi Instrumen URL Resmi Sebelum Rilis
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed max-w-3xl">
                  Seluruh {AUDIT_RULES.length} komponen data telah lolos uji kelayakan. Harap tinjau dan centang konfirmasi pada setiap instrumen URL berikut untuk memastikan Anda memahami fungsinya sebelum tombol rilis resmi diaktifkan.
                </p>
              </div>

              {/* Daftar Kartu URL Interaktif & Checkbox Gatekeeper */}
              <div className="space-y-3">
                {reviewItems.map((item) => {
                  const isChecked = !!finalReviewChecks[item.id];
                  const isCopied = copiedReviewKey === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl transition-all duration-200 border ${
                        isChecked
                          ? "bg-stone-950/80 border-amber-500/40 shadow-xs"
                          : "bg-stone-950/50 border-stone-800 hover:border-stone-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/25">
                            {item.badge}
                          </span>
                          <h4 className="text-xs font-bold text-stone-200">{item.title}</h4>
                        </div>

                        {/* Tombol Aksi Tautan (Buka Tab Baru & Salin) */}
                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          {item.url && (
                            <>
                              <a
                                href={
                                  normalizedStatus === "DRAFT" && (item.id === "canonical" || item.id === "subdomain" || item.id === "guest")
                                    ? (item.url.includes("?") ? `${item.url}&${previewQuery}` : `${item.url}?${previewQuery}`)
                                    : item.url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-[11px] font-medium transition flex items-center gap-1.5"
                                title="Buka tautan di tab baru"
                              >
                                <span>Buka Web</span>
                                <svg className="w-3 h-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleCopyReviewUrl(item.url, item.id)}
                                className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer"
                                title="Salin tautan"
                              >
                                <span>{isCopied ? "Tersalin!" : "Salin"}</span>
                                <svg className="w-3 h-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-400 leading-relaxed">{item.desc}</p>

                      {/* Box Teks URL */}
                      <div className="my-2 p-2 rounded-xl bg-stone-900/90 border border-stone-800/80 flex items-center overflow-hidden">
                        <span className="font-mono text-xs text-amber-200/90 break-all select-all">
                          {item.url || "Belum dikonfigurasi"}
                        </span>
                      </div>

                      {/* Checkbox Konfirmasi Klien */}
                      <div className="pt-1">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setFinalReviewChecks((prev) => ({
                                ...prev,
                                [item.id]: e.target.checked,
                              }))
                            }
                            className="mt-0.5 w-4 h-4 rounded border-stone-700 bg-stone-900 text-amber-500 focus:ring-amber-500/30 focus:ring-2 cursor-pointer accent-amber-500 shrink-0"
                          />
                          <span
                            className={`text-xs transition ${
                              isChecked ? "text-stone-200 font-semibold" : "text-stone-400 group-hover:text-stone-300"
                            }`}
                          >
                            {item.checkLabel}
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Baris Tombol Aksi Bawah */}
              <div className="pt-3 border-t border-stone-800/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={cancelAudit}
                    disabled={isReturningToIdle}
                    className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 rounded-xl text-xs font-semibold transition border border-stone-700 cursor-pointer"
                  >
                    {isReturningToIdle ? "Memulihkan..." : "Kembali ke Pengaturan"}
                  </button>

                  {invitation?.isFreeDraft ? (
                    <Link
                      href="/packages"
                      className="w-full sm:w-auto px-6 py-3 font-bold rounded-xl text-xs transition-all duration-300 shadow-md flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950"
                    >
                      <span>Aktifkan Paket untuk Publikasi</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={executePublish}
                      disabled={!allUrlsReviewed || savingSec === "status"}
                      className={`w-full sm:w-auto px-6 py-3 font-bold rounded-xl text-xs transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
                        allUrlsReviewed && savingSec !== "status"
                          ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-stone-950 shadow-amber-500/25 cursor-pointer"
                          : "bg-stone-800 text-stone-500 border border-stone-700/60 cursor-not-allowed opacity-75"
                      }`}
                    >
                      {savingSec === "status" ? (
                        <>
                          <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>
                          <span>Memproses Rilis...</span>
                        </>
                      ) : (
                        <>
                          <span>Rilis Undangan Resmi</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Helper & Catatan Penguncian */}
                <div className="space-y-1 text-right">
                  {!allUrlsReviewed && (
                    <p className="text-[11px] text-amber-400/90 leading-relaxed flex items-center justify-end gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        Harap centang seluruh {reviewItems.length} verifikasi instrumen URL di atas untuk mengaktifkan tombol rilis resmi.
                      </span>
                    </p>
                  )}
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Catatan: Setelah proses rilis resmi, pemilihan tema dan alamat URL akan dikunci demi menjaga keutuhan tautan para tamu serta cetak fisik.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 6: PUBLISHING (PROSES PENGUNCIAN & RENDERING) */}
          {launchStage === "PUBLISHING" && (
            <div className="relative z-10 py-6 text-center space-y-3 animate-lux-morph">
              <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h4 className="text-sm font-bold text-stone-100">Menerbitkan Website Undangan Resmi...</h4>
              <p className="text-xs text-stone-400">
                Memanggang file HTML mandiri dan sinkronisasi CDN global (Zero-Flicker)...
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
