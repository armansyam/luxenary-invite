"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStaffAuth } from "./StaffLockScreen";
import { BrandLogo } from "@/components/BrandLogo";

interface CheckinArrival {
  guestId: string;
  invitationId: string;
  name: string;
  category: string;
  tableNumber: string | null;
  sessionInfo: string | null;
  souvenirClaimed: boolean;
  checkedInAt: string;
  alreadyRedeemed?: boolean;
}

function tableLabel(tableNumber?: string | null): string {
  const value = tableNumber?.trim();
  if (!value) return "Bebas / Tanpa Meja";
  return /^meja\b/i.test(value) ? value : `Meja ${value}`;
}

export default function WelcomeScreenClient({
  invitationId,
  platformName,
  clientInitials,
  clientNames,
  onLock,
}: {
  invitationId: string;
  platformName?: string;
  clientInitials?: string;
  clientNames?: string;
  onLock?: () => void;
}) {
  const staffAuth = useStaffAuth();
  const [connStatus, setConnStatus] = useState<"CONNECTING" | "LIVE" | "RECONNECTING">("CONNECTING");
  const [activeGuest, setActiveGuest] = useState<CheckinArrival | null>(null);
  const [recentArrivals, setRecentArrivals] = useState<CheckinArrival[]>([]);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [totalGuestsCount, setTotalGuestsCount] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  const spotlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenGuestIdsRef = useRef<Set<string>>(new Set());
  const onLockRef = useRef(onLock || staffAuth?.lock);
  useEffect(() => {
    onLockRef.current = onLock || staffAuth?.lock;
  }, [onLock, staffAuth?.lock]);

  const playWelcomeChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);
        gain.gain.setValueAtTime(0.08, now + idx * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.36);
      });
    } catch {
      // Abaikan jika browser membatasi audio autoplay sebelum interaksi user
    }
  }, []);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    updateClock();
    const t = setInterval(updateClock, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handleFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem(`staff_auth_token_${invitationId}`) || "";
    if (!token) {
      onLockRef.current?.();
      return;
    }

    fetch(`/api/receptionist/guests?invitationId=${encodeURIComponent(invitationId)}`, {
      headers: { "x-receptionist-token": token },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          onLockRef.current?.();
          return;
        }
        const data = await res.json();
        if (data.success && Array.isArray(data.guests)) {
          setTotalGuestsCount(data.guests.length);
          const present = data.guests.filter((g: { isTokenRedeemed?: boolean; id: string }) => g.isTokenRedeemed);
          seenGuestIdsRef.current = new Set(present.map((g: { id: string }) => g.id));
          setCheckedInCount(present.length);
        }
      })
      .catch(() => {});

    const sseUrl = `/api/sse/checkin?invitationId=${encodeURIComponent(invitationId)}&token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);

    es.onopen = () => {
      if (active) setConnStatus("LIVE");
    };

    es.onmessage = (event) => {
      if (!active || !event.data) return;
      try {
        const parsed = JSON.parse(event.data) as CheckinArrival;
        if (!parsed?.guestId || parsed.alreadyRedeemed) return;

        if (!seenGuestIdsRef.current.has(parsed.guestId)) {
          seenGuestIdsRef.current.add(parsed.guestId);
          setCheckedInCount((prev) => prev + 1);
        }

        setActiveGuest(parsed);
        setRecentArrivals((prev) => {
          const filtered = prev.filter((item) => item.guestId !== parsed.guestId);
          return [parsed, ...filtered].slice(0, 5);
        });

        if (soundEnabled) playWelcomeChime();

        if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
        spotlightTimerRef.current = setTimeout(() => {
          if (active) setActiveGuest(null);
        }, 8000);
      } catch {
        // Payload non-JSON / heartbeat diabaikan
      }
    };

    es.onerror = () => {
      if (active) setConnStatus("RECONNECTING");
    };

    return () => {
      active = false;
      es.close();
      if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
    };
  }, [invitationId, soundEnabled, playWelcomeChime]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Abaikan jika browser menolak fullscreen
    }
  };

  return (
    <div
      className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between relative overflow-hidden select-none"
      style={{ colorScheme: "dark" }}
    >
      {/* Ambient Radial Highlights */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-1/4 w-[520px] h-[520px] rounded-full bg-amber-700/10 blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 sm:px-10 py-5 border-b border-stone-800/80 flex items-center justify-between bg-stone-950/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showName brandName={platformName || "Layar Sapa"} />
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-amber-300/90 font-semibold">
          <span>Layar Sapa Kehadiran</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900 border border-stone-800 text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                connStatus === "LIVE"
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]"
                  : connStatus === "CONNECTING"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-rose-400 animate-pulse"
              }`}
            />
            <span className="text-stone-300">
              {connStatus === "LIVE" ? "Live Sync" : connStatus === "CONNECTING" ? "Menghubungkan..." : "Menyambung Ulang"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? "Matikan Nada Sapa" : "Aktifkan Nada Sapa"}
            aria-label={soundEnabled ? "Matikan Nada Sapa" : "Aktifkan Nada Sapa"}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
              soundEnabled
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {soundEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              )}
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh TV"}
            aria-label={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh TV"}
            className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onLockRef.current?.()}
            title="Kunci Layar Sapa"
            aria-label="Kunci Layar Sapa"
            className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 hover:bg-stone-800 flex items-center justify-center transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Center Stage */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10">
        {activeGuest ? (
          <div className="w-full max-w-4xl rounded-3xl bg-gradient-to-b from-stone-900/95 to-stone-900/75 border border-amber-500/40 shadow-[0_0_80px_rgba(245,158,11,0.12)] px-8 py-12 sm:p-16 text-center transition-all duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
              <span>Selamat Datang</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-tight mb-6">
              {activeGuest.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <span className="px-4 py-1.5 rounded-full bg-stone-800 border border-stone-700 text-amber-200 text-xs font-bold uppercase tracking-widest">
                {activeGuest.category || "TAMU"}
              </span>
              {activeGuest.sessionInfo && (
                <span className="px-4 py-1.5 rounded-full bg-stone-800 border border-stone-700 text-stone-300 text-xs font-medium">
                  {activeGuest.sessionInfo}
                </span>
              )}
            </div>

            <div className="inline-flex flex-col items-center px-8 py-4 rounded-2xl bg-stone-950/80 border border-stone-800">
              <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400 font-semibold mb-1">
                Lokasi Tempat Duduk
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-amber-300">
                {tableLabel(activeGuest.tableNumber)}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl text-center space-y-6">
            {clientInitials && (
              <div className="w-24 h-24 rounded-full bg-stone-900 border border-amber-500/30 flex items-center justify-center mx-auto font-serif text-3xl text-amber-300 shadow-lg">
                {clientInitials}
              </div>
            )}
            <p className="text-xs uppercase tracking-[0.3em] text-amber-400/80 font-semibold">
              Selamat Datang di Acara
            </p>
            <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white tracking-tight leading-tight">
              {clientNames || "Tamu Undangan"}
            </h1>
            <p className="text-sm sm:text-base text-stone-400 max-w-lg mx-auto">
              Silakan pindai QR Code pada meja penerima tamu untuk konfirmasi kehadiran dan lokasi tempat duduk Anda.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <div className="px-6 py-4 rounded-2xl bg-stone-900/90 border border-stone-800 min-w-[160px]">
                <div className="text-3xl font-bold text-white">{checkedInCount}</div>
                <div className="text-[11px] uppercase tracking-wider text-stone-400 mt-1">
                  Tamu Hadir {totalGuestsCount > 0 ? `/ ${totalGuestsCount}` : ""}
                </div>
              </div>
              <div className="px-6 py-4 rounded-2xl bg-stone-900/90 border border-stone-800 min-w-[160px]">
                <div className="text-3xl font-mono font-bold text-amber-300">{currentTime || "--:--:--"}</div>
                <div className="text-[11px] uppercase tracking-wider text-stone-400 mt-1">Waktu Lokal</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Recent Arrivals Ticker */}
      <footer className="relative z-10 px-6 sm:px-10 py-4 border-t border-stone-800/80 bg-stone-950/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-x-auto max-w-full">
          <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold shrink-0">
            Kehadiran Terbaru:
          </span>
          {recentArrivals.length === 0 ? (
            <span className="text-xs text-stone-500">Menunggu tamu pertama check-in...</span>
          ) : (
            recentArrivals.map((guest) => (
              <span
                key={guest.guestId}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-xs text-stone-200 shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-semibold">{guest.name}</span>
                {guest.tableNumber && (
                  <span className="text-stone-400 text-[11px]">({tableLabel(guest.tableNumber)})</span>
                )}
              </span>
            ))
          )}
        </div>

        <div className="text-xs text-stone-500 shrink-0">
          {checkedInCount} hadir &bull; {clientNames || platformName || "Acara Spesial"}
        </div>
      </footer>
    </div>
  );
}
