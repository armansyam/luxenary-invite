"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export type OpeningLayoutType = "editorial_showcase" | "cinematic_hero" | "polaroid_nostalgia";

export interface GuestMomentOpeningProps {
  coupleName: string;
  coverUrl?: string;
  startTime?: string | null;
  endTime?: string | null;
  isTestMode?: boolean;
  isUploadLocked?: boolean;
  layoutId?: OpeningLayoutType;
  backUrl: string;
  galleryUrl: string;
  onStartCamera: () => void;
  currentSessionName?: string | null;
  nextSessionName?: string | null;
  nextSessionStartTime?: string | null;
  isSessionActive?: boolean;
  isAllFinished?: boolean;
}

export default function GuestMomentOpening({
  coupleName,
  coverUrl,
  startTime,
  endTime,
  isTestMode = false,
  isUploadLocked = false,
  layoutId = "editorial_showcase",
  backUrl,
  galleryUrl,
  onStartCamera,
  currentSessionName = null,
  nextSessionName = null,
  nextSessionStartTime = null,
  isSessionActive = true,
  isAllFinished = false,
}: GuestMomentOpeningProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  } | null>(null);

  const parsedStartTime = startTime ? new Date(startTime) : null;
  const parsedEndTime = endTime ? new Date(endTime) : null;
  const targetCountdownIso = nextSessionStartTime || startTime;
  const parsedTargetTime = targetCountdownIso ? new Date(targetCountdownIso) : null;

  // Real-time countdown timer untuk jadwal pembukaan / sesi berikutnya
  useEffect(() => {
    if (!targetCountdownIso) {
      setTimeLeft(null);
      return;
    }
    const targetDate = new Date(targetCountdownIso);
    if (isNaN(targetDate.getTime())) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const nowMs = new Date().getTime();
      const targetMs = targetDate.getTime();
      const diff = targetMs - nowMs;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isPast: false });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetCountdownIso]);

  const now = new Date();
  const isFinished = Boolean(isUploadLocked || isAllFinished || (!isTestMode && parsedEndTime && now > new Date(parsedEndTime.getTime() + 15 * 60 * 1000) && !nextSessionStartTime));
  const isActive = Boolean(!isFinished && (isSessionActive || isTestMode));
  const isPending = Boolean(!isFinished && !isActive && (nextSessionStartTime || (parsedStartTime && now < parsedStartTime)));

  // Format Retro Date Stamp: "02  09  '26"
  const getRetroDateStamp = () => {
    const targetDate = parsedStartTime && !isNaN(parsedStartTime.getTime()) ? parsedStartTime : new Date();
    const day = String(targetDate.getDate()).padStart(2, "0");
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const yearShort = String(targetDate.getFullYear()).slice(-2);
    return `${day}  ${month}  '${yearShort}`;
  };

  const defaultCoverFallback = "/demo/candani/gallery_01.webp";
  const activeCover = coverUrl || defaultCoverFallback;

  // ─────────────────────────────────────────────────────────────
  // MODEL 2: CINEMATIC HERO (Full Bleed Background & Glassmorphism)
  // ─────────────────────────────────────────────────────────────
  if (layoutId === "cinematic_hero") {
    return (
      <div className="relative min-h-screen flex flex-col justify-between items-center px-4 sm:px-6 py-6 sm:py-10 select-none overflow-x-hidden text-white">
        {/* Background Fullscreen Image with Overlay */}
        <div className="fixed inset-0 z-0">
          <img
            src={activeCover}
            alt={coupleName}
            className="w-full h-full object-cover object-center filter brightness-[0.75]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultCoverFallback;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-stone-950/70" />
        </div>

        {/* Top Bar Minimalis */}
        <header className="relative z-10 w-full max-w-sm flex items-center justify-between py-2 text-stone-300 text-xs">
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-stone-200 border border-white/10 font-medium transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Undangan</span>
          </Link>

          <Link
            href={galleryUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-stone-200 border border-white/10 font-medium transition cursor-pointer"
          >
            <span>Galeri Tamu</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </header>

        {/* Main Center Floating Card */}
        <main className="relative z-10 w-full max-w-sm my-auto py-6 flex flex-col items-center text-center space-y-4">

          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-300 font-bold">
              CINEMATIC GUEST MOMENT
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white drop-shadow-md">
              {coupleName}
            </h1>
            <p className="text-xs font-mono tracking-[0.25em] text-stone-300 pt-1">
              {getRetroDateStamp()}
            </p>
          </div>

          {/* Action Box */}
          <div className="w-full pt-4">
            {isFinished && (
              <div className="bg-stone-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-5 text-center space-y-3 shadow-2xl">
                <span className="text-xs font-bold text-stone-300 block uppercase tracking-wider">
                  Sesi Foto Tamu Telah Berakhir
                </span>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Seluruh momen kebersamaan telah terkumpul di galeri kenangan digital.
                </p>
                <Link
                  href={galleryUrl}
                  className="block w-full py-3 bg-white hover:bg-stone-100 text-stone-950 font-bold text-xs rounded-full shadow-lg transition"
                >
                  Lihat Semua Foto di Galeri →
                </Link>
              </div>
            )}

            {isPending && (
              <div className="w-full bg-stone-900/90 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2.5 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 truncate">
                      {nextSessionName ? `Sesi ${nextSessionName}` : "Kamera Belum Dibuka"}
                    </p>
                    {timeLeft && !timeLeft.isPast && (
                      <p className="text-xs font-mono font-bold text-white tracking-wider">
                        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
                        {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                </div>
                {isTestMode ? (
                  <button
                    type="button"
                    onClick={onStartCamera}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-bold text-[11px] rounded-full transition shrink-0 cursor-pointer shadow"
                  >
                    Simulasi →
                  </button>
                ) : (
                  <Link
                    href={backUrl}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-stone-200 font-medium text-[11px] rounded-full transition shrink-0"
                  >
                    Undangan
                  </Link>
                )}
              </div>
            )}

            {isActive && (
              <div className="space-y-3">
                {currentSessionName && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sesi Aktif: {currentSessionName}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onStartCamera}
                  className="w-full py-4 bg-white hover:bg-stone-100 text-stone-950 font-bold text-sm rounded-full shadow-2xl transition-transform active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Mulai Abadikan Momen</span>
                  <span className="transition-transform group-hover:translate-x-1 duration-200">→</span>
                </button>
                <p className="text-[11px] text-stone-300">
                  Abadikan momen kebersamaan dengan kamera tamu retro.
                </p>
              </div>
            )}
          </div>
        </main>

        <footer className="relative z-10 w-full max-w-sm text-center py-2">
          <span className="text-[10px] font-serif tracking-widest text-stone-400 uppercase">
            CINEMATIC MOMENTS
          </span>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODEL 3: POLAROID NOSTALGIA (Vintage Film Frame)
  // ─────────────────────────────────────────────────────────────
  if (layoutId === "polaroid_nostalgia") {
    return (
      <div className="min-h-screen bg-[#ede8df] text-stone-900 flex flex-col justify-between items-center px-4 sm:px-6 py-6 sm:py-10 select-none overflow-x-hidden">
        {/* Top Bar Minimalis */}
        <header className="w-full max-w-sm flex items-center justify-between py-2 text-stone-600 text-xs">
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-300/60 hover:bg-stone-300 text-stone-800 font-medium transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Undangan</span>
          </Link>

          <Link
            href={galleryUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-300/60 hover:bg-stone-300 text-stone-800 font-medium transition cursor-pointer"
          >
            <span>Galeri Tamu</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </header>

        {/* Polaroid Card */}
        <main className="w-full max-w-sm my-auto py-4 flex flex-col items-center">
          <div className="w-full bg-white p-4 pb-6 rounded-2xl shadow-2xl border border-stone-300/80 -rotate-1 hover:rotate-0 transition-transform duration-300">
            {/* Foto Polaroid */}
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-stone-100 shadow-inner">
              <img
                src={activeCover}
                alt={coupleName}
                className="w-full h-full object-cover object-center filter sepia-[0.15] contrast-[1.05]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = defaultCoverFallback;
                }}
              />
              {/* Retro Film Date Stamp di sudut foto */}
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded font-mono text-[9px] font-bold text-amber-400 tracking-wider">
                {getRetroDateStamp()}
              </div>
            </div>

            {/* Label Polaroid Tulisan Bawah */}
            <div className="pt-4 text-center space-y-1">
              <h2 className="text-xl font-serif font-bold text-stone-900 tracking-wide">
                {coupleName}
              </h2>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-500">
                DISPOSABLE CAM ARCHIVE
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="w-full pt-6">
            {isFinished && (
              <div className="bg-stone-200/80 border border-stone-300 rounded-2xl p-4 text-center space-y-2">
                <span className="text-xs font-bold text-stone-800 block">Sesi Foto Tamu Telah Berakhir</span>
                <p className="text-[11px] text-stone-600">
                  Seluruh momen kebersamaan telah terkumpul di galeri kenangan digital.
                </p>
                <Link
                  href={galleryUrl}
                  className="inline-block w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-full shadow transition"
                >
                  Lihat Semua Foto di Galeri →
                </Link>
              </div>
            )}

            {isPending && (
              <div className="w-full bg-stone-900/90 backdrop-blur-md text-white rounded-full px-4 py-2.5 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 truncate">
                      {nextSessionName ? `Sesi ${nextSessionName}` : "Kamera Belum Dibuka"}
                    </p>
                    {timeLeft && !timeLeft.isPast && (
                      <p className="text-xs font-mono font-bold text-white tracking-wider">
                        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
                        {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                </div>
                {isTestMode ? (
                  <button
                    type="button"
                    onClick={onStartCamera}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-bold text-[11px] rounded-full transition shrink-0 cursor-pointer shadow"
                  >
                    Simulasi →
                  </button>
                ) : (
                  <Link
                    href={backUrl}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-stone-200 font-medium text-[11px] rounded-full transition shrink-0"
                  >
                    Undangan
                  </Link>
                )}
              </div>
            )}

            {isActive && (
              <div className="space-y-2">
                {currentSessionName && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-300/80 border border-stone-400/50 text-stone-800 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Sesi Aktif: {currentSessionName}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onStartCamera}
                  className="w-full py-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white font-bold text-sm rounded-full shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Buka Kamera Retro</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            )}
          </div>
        </main>

        <footer className="w-full max-w-sm text-center py-2">
          <span className="text-[10px] font-mono tracking-widest text-stone-500 uppercase">
            ANALOG POLAROID
          </span>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODEL 1: EDITORIAL SHOWCASE (Default / Mockup Morements)
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col justify-between items-center px-4 sm:px-6 py-6 sm:py-10 select-none overflow-x-hidden"
      style={{
        backgroundColor: "var(--bg-canvas, #fbf9f5)",
        color: "var(--text-primary, #2d2824)",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      }}
    >
      {/* Top Bar Minimalis */}
      <header className="w-full max-w-sm flex items-center justify-between py-1 text-stone-400 text-xs">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-900 transition text-xs font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Undangan</span>
        </Link>

        <Link
          href={galleryUrl}
          className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-900 transition text-xs font-medium"
        >
          <span>Galeri Tamu</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </header>

      {/* Main Content Showcase */}
      <main className="w-full max-w-sm flex flex-col items-center my-auto py-2 space-y-5">
        {/* Foto Mempelai Murni (Tanpa Frame Card / Tanpa Border Putih) */}
        <div className="relative w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-md">
          <img
            src={activeCover}
            alt={coupleName}
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultCoverFallback;
            }}
          />
        </div>

        {/* Typographic Header & Retro Date */}
        <div className="text-center space-y-1.5 px-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-stone-900 leading-tight">
            {coupleName}
            <span className="block text-base sm:text-lg font-normal font-sans text-stone-600 mt-0.5">
              Guest Moments Showcase
            </span>
          </h1>

          {/* Retro Analog Date Stamp */}
          <div className="pt-1.5 flex items-center justify-center gap-2">
            <span className="inline-block px-3 py-1 bg-stone-200/70 rounded-md font-mono text-xs font-bold text-stone-700 tracking-[0.25em]">
              {getRetroDateStamp()}
            </span>
          </div>
        </div>

        {/* Interactive Action Area */}
        <div className="w-full pt-2 flex flex-col items-center space-y-3">
          {/* Kondisi 1: Acara Selesai / Dikunci */}
          {isFinished && (
            <div className="w-full bg-stone-100 border border-stone-200 rounded-2xl p-4 text-center space-y-2">
              <span className="text-xs font-bold text-stone-800 block">Sesi Foto Tamu Telah Berakhir</span>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Seluruh momen kebersamaan telah terkumpul di galeri kenangan digital.
              </p>
              <Link
                href={galleryUrl}
                className="inline-block w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-full shadow transition"
              >
                Lihat Semua Foto di Galeri →
              </Link>
            </div>
          )}

          {/* Kondisi 2: Sebelum Acara / Jeda Antar-Sesi */}
          {isPending && (
            <div className="w-full bg-stone-900 text-white rounded-full px-4 py-2.5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 truncate">
                    {nextSessionName ? `Sesi ${nextSessionName}` : "Kamera Belum Dibuka"}
                  </p>
                  {timeLeft && !timeLeft.isPast && (
                    <p className="text-xs font-mono font-bold text-stone-200 tracking-wider">
                      {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
                      {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                    </p>
                  )}
                </div>
              </div>
              {isTestMode ? (
                <button
                  type="button"
                  onClick={onStartCamera}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-bold text-[11px] rounded-full transition shrink-0 cursor-pointer shadow"
                >
                  Simulasi →
                </button>
              ) : (
                <Link
                  href={backUrl}
                  className="px-3 py-1 bg-white/15 hover:bg-white/25 text-stone-200 font-medium text-[11px] rounded-full transition shrink-0"
                >
                  Undangan
                </Link>
              )}
            </div>
          )}

          {/* Kondisi 3: Acara Aktif & Siap Motret (Hari H) */}
          {isActive && (
            <>
              {currentSessionName && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-200 border border-stone-300 text-stone-800 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Sesi Aktif: {currentSessionName}
                </div>
              )}
              <button
                type="button"
                onClick={onStartCamera}
                className="w-full py-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white font-bold text-sm rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Mulai Abadikan Momen</span>
                <span className="transition-transform group-hover:translate-x-1 duration-200">→</span>
              </button>

              <p className="text-[11px] text-stone-400 text-center">
                Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda.
              </p>
            </>
          )}
        </div>
      </main>

      {/* Footer Minimalist Branding */}
      <footer className="w-full max-w-sm text-center py-2">
        <div className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 transition text-xs font-serif tracking-widest uppercase">
          <span className="font-bold text-stone-600">GUEST</span>
          <span className="text-[9px] tracking-normal font-sans font-medium text-stone-400">· Moments</span>
        </div>
      </footer>
    </div>
  );
}
