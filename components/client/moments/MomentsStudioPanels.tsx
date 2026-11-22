"use client";

import { MomentCoverImage } from "@/app/components/features/GuestMomentOpening";
import { FILTER_PRESETS_LIST, OPENING_LAYOUTS } from "@/components/client/moments/presets";

export interface MomentsSessionItem {
  id?: string;
  name?: string;
  label?: string;
  date: string;
  startTime: string;
  endTime: string;
  allocatedQuota?: number;
  quota?: number;
}

export interface MomentsPhotoItem {
  id: string;
  senderName: string;
  message?: string | null;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
}

export function MomentsStudioPanels({ ctx }: { ctx: {
  activeFilterId: string;
  activeOpeningName: string;
  activeSchedule: any;
  coupleTitle: string;
  coverPhoto: string;
  downloadPhase: string;
  downloadProgress: number;
  events: any[];
  fetchGuestMemories: (invId: string) => Promise<void>;
  getFeatureSetting: (key: string, fallback?: any) => any;
  getRetroDateStamp: () => string;
  guestMemoriesList: MomentsPhotoItem[];
  handleAddSession: () => void;
  handleAutoBalanceQuota: () => void;
  handleAutoSyncSessions: () => void;
  handleBlurSession: () => void;
  handleDeletePhoto: (id: string) => Promise<void>;
  handleRemoveSession: (idx: number) => void;
  handleStartDownloadZip: () => Promise<void>;
  handleUpdateSession: (idx: number, field: string, value: any) => void;
  instructionText: string;
  invitation: any;
  isReadyForDownload: boolean;
  loadingMemories: boolean;
  openingLayoutId: string;
  sessionSaveStatus: string;
  sessions: MomentsSessionItem[];
  setIsOpeningModalOpen: (v: boolean) => void;
  setIsPrintQrModalOpen: (v: boolean) => void;
  totalAllocated: number;
  totalEventQuota: number;
  updateSettingFast: (key: string, value: any) => Promise<void>;
  updatingSetting: boolean;
  zipDownloadHint: string;
} }) {
  const {
    activeFilterId,
    activeOpeningName,
    activeSchedule,
    coupleTitle,
    coverPhoto,
    downloadPhase,
    downloadProgress,
    events,
    fetchGuestMemories,
    getFeatureSetting,
    getRetroDateStamp,
    guestMemoriesList,
    handleAddSession,
    handleAutoBalanceQuota,
    handleAutoSyncSessions,
    handleBlurSession,
    handleDeletePhoto,
    handleRemoveSession,
    handleStartDownloadZip,
    handleUpdateSession,
    instructionText,
    invitation,
    isReadyForDownload,
    loadingMemories,
    openingLayoutId,
    sessionSaveStatus,
    sessions,
    setIsOpeningModalOpen,
    setIsPrintQrModalOpen,
    totalAllocated,
    totalEventQuota,
    updateSettingFast,
    updatingSetting,
    zipDownloadHint,
  } = ctx;

  return (
    <>
      {/* Pratinjau Layar Pembuka Smartphone Tamu (Live Phone Mockup & 3 Layout Selector) */}
      <div className="bg-white p-4 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:pb-4 sm:border-b border-stone-100">
          <div>
            <div className="hidden sm:flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Live Smartphone Preview
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">Layar Pembuka Tamu (/sharemoment)</span>
            </div>
            <h2 className="text-sm sm:text-lg font-bold text-stone-900">
              <span className="sm:hidden">Gaya Layar Pembuka Tamu</span>
              <span className="hidden sm:inline">Pratinjau &amp; Pilihan Gaya Layar Pembuka Tamu</span>
            </h2>
            <p className="hidden sm:block text-xs text-stone-500 mt-0.5">
              Pilih salah satu dari 3 desain layar pembuka di bawah ini. Tamu yang memindai QR Code di meja akan disambut dengan tampilan ini di smartphone mereka.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsOpeningModalOpen(true)}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Sesuaikan Teks &amp; Foto</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* KOLOM KIRI: Mobile Phone Mockup Langsung (Murni Tanpa Card Wrapper) */}
          <div className="hidden sm:flex lg:col-span-5 flex-col items-center justify-center py-4 select-none">
            {/* 1. MOCKUP SMARTPHONE IPHONE 16 PRO */}
            <div
              className="w-[268px] h-[536px] bg-[#0d0c0b] rounded-[42px] p-2.5 relative flex flex-col justify-between shadow-[0_25px_60px_-15px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.06),0_0_0_5px_#1c1917,0_0_0_6.5px_rgba(201,162,39,0.35)] shrink-0"
            >
              {/* Dynamic Island & Real Status Bar */}
              <div className={`absolute top-2.5 inset-x-5 flex items-center justify-between z-30 pointer-events-none text-[10px] font-semibold ${openingLayoutId === "cinematic_hero" ? "text-white" : "text-stone-800"}`}>
                <span className="font-sans pl-1">9:41</span>
                {/* Dynamic Island */}
                <div className="w-[74px] h-[19px] bg-black rounded-full flex items-center justify-end pr-2 shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-[#11131a] ring-1 ring-blue-900/40 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-blue-500/30" />
                  </div>
                </div>
                {/* Status Icons: Sinyal, Wifi, Baterai */}
                <div className="flex items-center gap-1.5 pr-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/></svg>
                  <div className={`w-4 h-2 border ${openingLayoutId === "cinematic_hero" ? "border-white" : "border-stone-800"} rounded-xs p-0.5 flex items-center`}>
                    <div className={`w-full h-full ${openingLayoutId === "cinematic_hero" ? "bg-white" : "bg-stone-800"} rounded-2xs`} />
                  </div>
                </div>
              </div>

              {/* Specular Glare Sheen Reflection */}
              <div className="pointer-events-none absolute inset-0 rounded-[38px] z-25 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12]" />

              {/* Layar Smartphone Pure Edge-to-Edge */}
              <div className="rounded-[34px] overflow-hidden w-full h-full relative text-left text-xs z-10 shadow-inner bg-[#faf8f5]">
                {/* ──────────────── LAYOUT 1: EDITORIAL SHOWCASE ──────────────── */}
                {openingLayoutId === "editorial_showcase" && (
                  <div className="absolute inset-0 bg-[#faf8f5] flex flex-col justify-between pt-9 pb-3 px-3.5">
                    {/* Foto Mempelai / Acara (4:5) */}
                    <div className="w-full aspect-[4/5] rounded-[22px] overflow-hidden shadow-sm border border-stone-200/60 relative shrink-0">
                      <MomentCoverImage src={coverPhoto} alt={coupleTitle} className="w-full h-full object-cover object-center" />
                    </div>

                    {/* Tipografi Acara & Tanggal */}
                    <div className="text-center space-y-1 my-auto py-1">
                      <h4 className="text-sm font-serif font-bold text-[#23211f] leading-snug tracking-tight">
                        {coupleTitle}
                      </h4>
                      <div className="text-[9.5px] font-mono font-bold text-stone-600 tracking-[0.25em]">
                        {getRetroDateStamp()}
                      </div>
                    </div>

                    {/* Tombol Kapsul Espresso & Footer */}
                    <div className="space-y-2">
                      <div className="w-full py-2.5 bg-[#2b2724] text-white font-medium text-[11px] rounded-full text-center shadow-sm flex items-center justify-center gap-1.5">
                        <span>Mulai motret</span>
                      </div>
                      <div className="text-center font-serif font-bold text-[10px] tracking-widest text-stone-400">
                        {coupleTitle ? coupleTitle.toUpperCase() : "GUEST MOMENTS"}
                      </div>
                      <div className="w-20 h-1 bg-stone-300 rounded-full mx-auto mt-1" />
                    </div>
                  </div>
                )}

                {/* ──────────────── LAYOUT 2: CINEMATIC HERO (100% Fullscreen, Tanpa Garis Putih) ──────────────── */}
                {openingLayoutId === "cinematic_hero" && (
                  <div className="absolute inset-0 flex flex-col justify-between pt-9 pb-3 px-3.5 text-white overflow-hidden">
                    {/* Fullscreen Photo & Cinematic Vignette */}
                    <div className="absolute inset-0 z-0">
                      <MomentCoverImage
                        src={coverPhoto}
                        alt={coupleTitle}
                        className="w-full h-full object-cover filter brightness-[0.70]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-stone-950/70" />
                    </div>

                    {/* Floating Info */}
                    <div className="relative z-10 my-auto text-center space-y-1 py-1">
                      <span className="text-[7.5px] font-mono tracking-[0.25em] uppercase text-amber-300 font-bold block">
                        CINEMATIC MOMENTS
                      </span>
                      <h4 className="text-base font-serif font-bold text-white drop-shadow-md">
                        {coupleTitle}
                      </h4>
                      <p className="text-[8px] font-mono tracking-widest text-stone-300">
                        {getRetroDateStamp()}
                      </p>
                    </div>

                    {/* Action Button & Safe Footer */}
                    <div className="relative z-10 space-y-1.5 pb-1">
                      <div className="w-full py-2 bg-white text-stone-950 font-bold text-[10.5px] rounded-full text-center shadow-xl flex items-center justify-center gap-1">
                        <span>Mulai Abadikan Momen</span>
                      </div>
                      <p className="text-[7.5px] text-stone-300 text-center leading-tight line-clamp-1">
                        {instructionText}
                      </p>
                      <div className="w-20 h-1 bg-white/40 rounded-full mx-auto mt-1" />
                    </div>
                  </div>
                )}

                {/* ──────────────── LAYOUT 3: POLAROID NOSTALGIA ──────────────── */}
                {openingLayoutId === "polaroid_nostalgia" && (
                  <div className="absolute inset-0 bg-[#ede8df] flex flex-col justify-between pt-9 pb-3 px-3.5 text-stone-900">
                    {/* Polaroid Frame Card */}
                    <div className="my-auto bg-white p-2 pb-2.5 rounded-xl shadow-xl border border-stone-300/80 -rotate-1 text-center space-y-1">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-stone-100 shadow-inner">
                        <MomentCoverImage
                          src={coverPhoto}
                          alt={coupleTitle}
                          className="w-full h-full object-cover filter sepia-[0.15]"
                        />
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded font-mono text-[7px] font-bold text-amber-400">
                          {getRetroDateStamp()}
                        </div>
                      </div>
                      <h4 className="text-xs font-serif font-bold text-stone-900 truncate">
                        {coupleTitle}
                      </h4>
                      <p className="text-[6.5px] font-mono tracking-widest text-stone-500 uppercase">
                        DISPOSABLE CAM ARCHIVE
                      </p>
                    </div>

                    {/* Action Button & Safe Footer */}
                    <div className="space-y-1 pb-1">
                      <div className="w-full py-2 bg-stone-900 text-white font-bold text-[10px] rounded-full text-center shadow-md flex items-center justify-center gap-1">
                        <span>Buka Kamera Retro</span>
                      </div>
                      <p className="text-[7px] text-stone-500 text-center leading-tight line-clamp-1">
                        {instructionText}
                      </p>
                      <div className="w-20 h-1 bg-stone-400/40 rounded-full mx-auto mt-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <span className="text-xs font-medium text-stone-500 mt-4 block text-center">
              Pratinjau: <strong className="text-stone-800">{activeOpeningName}</strong>
            </span>
          </div>

          {/* KOLOM KANAN: 3 Layout Selector Cards */}
          <div className="lg:col-span-7 space-y-3.5">
            <span className="hidden sm:block text-xs font-bold text-stone-800">
              Pilih Gaya Tampilan Layar Pembuka:
            </span>

            <div className="space-y-2.5">
              {OPENING_LAYOUTS.map((op) => {
                const isSelected = openingLayoutId === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => updateSettingFast("memoriesOpeningLayout", op.id)}
                    disabled={updatingSetting}
                    className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left transition flex items-start justify-between cursor-pointer ${
                      isSelected
                        ? "bg-amber-50/90 border-amber-700 ring-2 ring-amber-700 shadow-xs"
                        : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/60"
                    }`}
                  >
                    <div className="pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-stone-900">{op.name}</span>
                        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 uppercase">
                          {op.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        {op.desc}
                      </p>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                        isSelected
                          ? "border-amber-800 bg-amber-800 text-white"
                          : "border-stone-300 bg-white"
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex-row items-center justify-between gap-3 text-xs">
              <div>
                <strong className="block font-bold text-stone-800">Ubah Foto Cover &amp; Teks Sapaan</strong>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Anda dapat mengganti foto utama pembuka atau mengubah kalimat panduan untuk tamu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpeningModalOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
              >
                Atur Teks &amp; Foto
              </button>
            </div>

            <div className="hidden sm:flex p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex-row items-center justify-between gap-3 text-xs">
              <div>
                <strong className="block font-bold text-stone-800">Cetak Standing Banner &amp; Kartu QR</strong>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Unduh template siap cetak akrilik 300 DPI untuk diletakkan di meja tamu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintQrModalOpen(true)}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
              >
                Cetak QR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 5 Pilihan Filter Analog Acara */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              <span className="sm:hidden">Filter Kamera</span>
              <span className="hidden sm:inline">Pilih Preset Filter Analog Acara:</span>
            </h2>
            <p className="hidden sm:block text-xs text-stone-500">Filter ini seragam diterapkan ke kamera virtual seluruh tamu undangan Anda.</p>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 self-auto">
            1-Click Live Update
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {FILTER_PRESETS_LIST.map((flt) => {
            const isSelected = activeFilterId === flt.id;
            return (
              <button
                key={flt.id}
                type="button"
                onClick={() => updateSettingFast("memoriesFilter", flt.id)}
                disabled={updatingSetting}
                className={`p-2.5 sm:p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-amber-50/90 border-amber-700 ring-2 ring-amber-700 shadow-xs"
                    : "bg-white border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className={`h-12 sm:h-16 w-full rounded-xl bg-gradient-to-tr ${flt.previewBg} mb-2 sm:mb-2.5 relative overflow-hidden flex items-end p-2 shadow-inner`}>
                  <span className="text-[8px] font-mono text-amber-300 font-bold bg-stone-950/70 px-1.5 py-0.5 rounded">
                    15 09 &apos;26
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-xs font-bold truncate ${isSelected ? "text-amber-950" : "text-stone-900"}`}>
                      {flt.name}
                    </span>
                  </div>
                  <p className="hidden sm:block text-[10px] text-stone-500 leading-snug line-clamp-2">
                    {flt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stempel Tanggal LED & Foto Layar Pembuka */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-xs space-y-3">
          <div>
            <h3 className="text-xs font-bold text-stone-900">Stempel Tanggal<span className="hidden sm:inline"> Retro (LED Date Stamp)</span></h3>
            <p className="text-[11px] text-stone-500">Cetak cap tanggal retro menyala di sudut kanan bawah foto tamu.</p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-100">
            <select
              value={getFeatureSetting("memoriesDateFormat", "DD MM 'YY")}
              onChange={(e) => updateSettingFast("memoriesDateFormat", e.target.value)}
              disabled={!getFeatureSetting("memoriesDateStamp", true)}
              className="min-w-0 flex-1 sm:flex-none p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs font-mono text-stone-800 disabled:opacity-40"
            >
              <option value="DD MM 'YY">Format: 15 09 &apos;26</option>
              <option value="DD · MMM · YYYY">Format: 15 · SEP · 2026</option>
            </select>
            <button
              type="button"
              onClick={() => updateSettingFast("memoriesDateStamp", !getFeatureSetting("memoriesDateStamp", true))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                getFeatureSetting("memoriesDateStamp", true) ? "bg-amber-800" : "bg-stone-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                getFeatureSetting("memoriesDateStamp", true) ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-xs space-y-3">
          <div>
            <h3 className="text-xs font-bold text-stone-900">Delayed Reveal<span className="hidden sm:inline"> (Kamar Gelap Bersama)</span></h3>
            <p className="text-[11px] text-stone-500">Foto dicuci rahasia dan baru dirilis serentak saat seluruh acara selesai.</p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-600 font-medium">
              {getFeatureSetting("memoriesDelayedReveal", false) ? "Aktif — Hasil dirilis serentak" : "Nonaktif — Langsung tampil di feed"}
            </span>
            <button
              type="button"
              onClick={() => updateSettingFast("memoriesDelayedReveal", !getFeatureSetting("memoriesDelayedReveal", false))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                getFeatureSetting("memoriesDelayedReveal", false) ? "bg-amber-800" : "bg-stone-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                getFeatureSetting("memoriesDelayedReveal", false) ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── JADWAL WAKTU MULTI-SESI & ALOKASI KUOTA FOTO ── */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-100">
          <div>
            <div className="hidden sm:flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Jadwal &amp; Kuota Sesi
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">Multi-Session Schedule</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900">
              <span className="sm:hidden">Jadwal Sesi &amp; Kuota</span>
              <span className="hidden sm:inline">Jadwal Sesi Kamera &amp; Alokasi Kuota Foto</span>
            </h2>
            <p className="hidden sm:block text-xs text-stone-500 mt-0.5">
              Atur sesi acara (misal: Akad &amp; Resepsi) serta alokasikan kuota foto per sesi agar tidak habis di sesi awal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {sessionSaveStatus === "saving" && (
              <span className="text-[11px] text-amber-700 flex items-center gap-1 font-medium bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/70">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Menyimpan...
              </span>
            )}
            {sessionSaveStatus === "saved" && (
              <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200/70">
                <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tersimpan otomatis
              </span>
            )}
            {/* Tombol Tarik Sesi dari Undangan (Selalu Tampil) */}
            <button
              type="button"
              onClick={handleAutoSyncSessions}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Tarik data nama, tanggal, dan jam sesi dari susunan acara di Studio Undangan (Seksi 5)"
            >
              <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Tarik Sesi dari Undangan</span>
            </button>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleAutoBalanceQuota}
                className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Bagi rata total kuota acara ke seluruh sesi yang ada"
              >
                <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Bagi Rata Kuota</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleAddSession}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <span>+ Sesi Baru</span>
            </button>
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((sess, idx) => (
              <div
                key={sess.id || idx}
                className="p-3.5 bg-stone-50/60 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={sess.name || ""}
                      onChange={(e) => handleUpdateSession(idx, "name", e.target.value)}
                      onBlur={handleBlurSession}
                      placeholder="Nama Sesi (misal: Akad Nikah)"
                      className="p-1.5 px-2.5 bg-white border border-stone-200 rounded-lg text-base sm:text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40 w-full sm:max-w-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSession(idx)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Hapus sesi ini"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Tanggal:</label>
                    <input
                      type="date"
                      value={sess.date || ""}
                      onChange={(e) => handleUpdateSession(idx, "date", e.target.value)}
                      onBlur={handleBlurSession}
                      className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-base sm:text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Jam Buka:</label>
                    <input
                      type="time"
                      value={sess.startTime || "08:00"}
                      onChange={(e) => handleUpdateSession(idx, "startTime", e.target.value)}
                      onBlur={handleBlurSession}
                      className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-base sm:text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Jam Tutup:</label>
                    <input
                      type="time"
                      value={sess.endTime || "22:00"}
                      onChange={(e) => handleUpdateSession(idx, "endTime", e.target.value)}
                      onBlur={handleBlurSession}
                      className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-base sm:text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-bold text-stone-500">Alokasi Kuota Foto:</label>
                      {(() => {
                        const otherAllocated = sessions.reduce((sum, s, i) => i === idx ? sum : sum + (Number(s.allocatedQuota) || 0), 0);
                        const maxForThis = Math.max(0, totalEventQuota - otherAllocated);
                        if (maxForThis > (sess.allocatedQuota || 0)) {
                          return (
                            <button
                              type="button"
                              onClick={() => handleUpdateSession(idx, "allocatedQuota", maxForThis)}
                              className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                              title={`Isi otomatis dengan sisa kuota yang tersedia (${maxForThis} foto)`}
                            >
                              Pakai Sisa ({maxForThis})
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={totalEventQuota}
                        value={sess.allocatedQuota || 0}
                        onChange={(e) => handleUpdateSession(idx, "allocatedQuota", e.target.value)}
                        onBlur={handleBlurSession}
                        className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-base sm:text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40"
                      />
                      <span className="text-[10px] text-stone-400 font-medium shrink-0">Foto</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="p-3 bg-stone-100/80 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-stone-700">
                Distribusi Kuota Acara: <strong>{totalAllocated}</strong> / {totalEventQuota} Foto
              </span>
              {totalAllocated === totalEventQuota ? (
                <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Kuota Pas Terbagi
                </span>
              ) : totalAllocated > totalEventQuota ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-rose-600 font-bold text-[11px]">
                    Alokasi melebihi total kuota (+{totalAllocated - totalEventQuota} foto)
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoBalanceQuota}
                    className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300/80 rounded font-bold text-[10px] transition cursor-pointer"
                  >
                    Perbaiki &amp; Bagi Rata
                  </button>
                </div>
              ) : (
                <span className="text-amber-700 font-medium text-[11px]">
                  Sisa belum teralokasi: {totalEventQuota - totalAllocated} foto
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center border border-dashed border-stone-200 rounded-xl">
            <p className="text-xs font-semibold text-stone-600">Belum ada sesi kamera aktif yang diatur</p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Klik &quot;Tarik Sesi dari Undangan&quot; untuk menyelaraskan dengan susunan acara atau &quot;+ Sesi Baru&quot; untuk menambah manual.
            </p>
          </div>
        )}
      </div>

      {/* Real-time Submissions Gallery & Moderasi Foto */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              <span className="sm:hidden">Foto Tamu ({guestMemoriesList.length})</span>
              <span className="hidden sm:inline">Feed Foto Candid Terkumpul ({guestMemoriesList.length} Foto)</span>
            </h2>
            <p className="hidden sm:block text-xs text-stone-500">Pantau foto candid yang diunggah para tamu, hapus foto yang tidak layak.</p>
            {/* Layar sentuh tidak menampilkan tooltip title, jadi alasan tombol nonaktif ditulis langsung di HP. */}
            {!isReadyForDownload && guestMemoriesList.length > 0 && (
              <p className="sm:hidden mt-1 text-[11px] text-amber-800">{zipDownloadHint}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Tombol Unduh ZIP Dinamis Terikat Jadwal */}
            <button
              type="button"
              onClick={() => {
                if (!isReadyForDownload) return;
                handleStartDownloadZip();
              }}
              disabled={!isReadyForDownload || downloadPhase === "fetching" || downloadPhase === "downloading" || downloadPhase === "zipping"}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                guestMemoriesList.length === 0
                  ? "bg-stone-100 text-stone-400 border border-stone-200/70 cursor-not-allowed"
                  : !isReadyForDownload
                  ? "bg-amber-50/80 text-amber-900/70 border border-amber-200/80 cursor-not-allowed"
                  : downloadPhase === "done"
                  ? "bg-emerald-600 text-white shadow-2xs cursor-pointer"
                  : downloadPhase === "error"
                  ? "bg-rose-600 text-white shadow-2xs cursor-pointer"
                  : downloadPhase !== "idle"
                  ? "bg-stone-800 text-white cursor-wait"
                  : "bg-stone-900 hover:bg-stone-800 text-white shadow-2xs cursor-pointer"
              }`}
              title={zipDownloadHint}
            >
              {downloadPhase === "fetching" || downloadPhase === "downloading" || downloadPhase === "zipping" ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>
                    {downloadPhase === "fetching" && "Menyiapkan..."}
                    {downloadPhase === "downloading" && `Mengunduh (${downloadProgress}%)`}
                    {downloadPhase === "zipping" && "Mengompresi..."}
                  </span>
                </>
              ) : downloadPhase === "done" ? (
                <>
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>ZIP Terunduh</span>
                </>
              ) : downloadPhase === "error" ? (
                <span>Gagal (Coba Lagi)</span>
              ) : guestMemoriesList.length === 0 ? (
                <>
                  <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Unduh ZIP (0 Foto)</span>
                </>
              ) : !isReadyForDownload ? (
                <>
                  <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Unduh ZIP ({activeSchedule.isSessionActive ? "Sesi Berjalan" : "Terkunci · Acara Berlangsung"})</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Unduh ZIP ({guestMemoriesList.length} Foto)</span>
                </>
              )}
            </button>

            {/* Tombol Segarkan */}
            <button
              type="button"
              onClick={() => fetchGuestMemories(invitation.id)}
              disabled={loadingMemories}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className={`w-3.5 h-3.5 ${loadingMemories ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {guestMemoriesList.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-stone-200 rounded-2xl">
            <svg className="w-10 h-10 text-stone-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs font-semibold text-stone-600">Belum ada foto yang diunggah tamu</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Foto yang dijepret tamu di hari-H akan otomatis muncul di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-3">
            {guestMemoriesList.map((photo) => (
              <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-square shadow-2xs">
                <img
                  src={photo.mediaUrl}
                  alt={photo.senderName || "Foto Tamu"}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 sm:p-2 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="p-2 sm:p-1 bg-stone-950/55 sm:bg-red-600/90 text-white rounded-md hover:bg-red-700 transition cursor-pointer"
                      title="Hapus foto ini"
                      aria-label="Hapus foto ini"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-white">
                    <span className="block text-[11px] font-bold truncate">{photo.senderName || "Tamu Undangan"}</span>
                    <span className="block text-[9px] text-stone-300 font-mono">
                      {photo.createdAt ? new Date(photo.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
