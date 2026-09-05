"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

import { useStaffAuth } from "./StaffLockScreen";
import { BrandLogo } from "@/components/BrandLogo";

interface Guest {
  id: string;
  name: string;
  category: string | null;
  guestQuota: number;
  tableNumber: string | null;
  qrToken: string | null;
  isTokenRedeemed: boolean;
}

function getCleanCameraLabel(label: string, index: number): string {
  const lower = label.toLowerCase();
  if (lower.includes("back") || lower.includes("rear") || lower.includes("belakang") || lower.includes("environment")) {
    return "Kamera Belakang";
  }
  if (lower.includes("front") || lower.includes("user") || lower.includes("depan") || lower.includes("selfie") || lower.includes("facetime")) {
    return "Kamera Depan";
  }
  return label || `Kamera ${index + 1}`;
}

export default function ReceptionistScannerClient({ 
  invitationId,
  platformName,
  onLock
}: { 
  invitationId: string;
  platformName?: string;
  onLock?: () => void;
}) {
  const staffAuth = useStaffAuth();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  const [status, setStatus] = useState<"LOADING" | "READY" | "OFFLINE" | "SYNCING">("LOADING");
  const [searchInput, setSearchInput] = useState("");
  const [scanResult, setScanResult] = useState<{ type: "success" | "error"; message: string; guest?: Guest; showDuplicatePrompt?: boolean; scannedName?: string; } | null>(null);
  const [scannerMode, setScannerMode] = useState<"PHYSICAL" | "CAMERA">("PHYSICAL");
  const [showManualList, setShowManualList] = useState(false);

  // Multi-Camera & Viewfinder States (Laptop Webcam & Tablet Support)
  const [cameraList, setCameraList] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningLockedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const guestsRef = useRef(guests);

  useEffect(() => {
    guestsRef.current = guests;
  }, [guests]);

  // Fullscreen Change Event Tracker
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFull);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle notice:", err);
    }
  };

  const safeStopScanner = useCallback(async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;

    if (isTransitioningRef.current) return;

    try {
      isTransitioningRef.current = true;
      if (scanner.isScanning) {
        await scanner.stop();
      }
      try {
        await scanner.clear();
      } catch {}
    } catch (err) {
      console.warn("Non-fatal scanner stop notice:", err);
    } finally {
      isTransitioningRef.current = false;
      html5QrCodeRef.current = null;
    }
  }, []);

  // Audio Beep Feedback via Web Audio API (Offline, zero dependency)
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not allowed or muted
    }
  }, []);

  // 1. Initial Load & Offline Cache
  useEffect(() => {
    const loadData = async () => {
      const cached = localStorage.getItem(`guests_${invitationId}`);
      const cachedQueue = localStorage.getItem(`offline_queue_${invitationId}`);
      
      if (cached) setGuests(JSON.parse(cached));
      if (cachedQueue) setOfflineQueue(JSON.parse(cachedQueue));

      try {
        const res = await fetch(`/api/receptionist/guests?invitationId=${invitationId}`);
        const data = await res.json();
        if (data.success) {
          setGuests(data.guests);
          localStorage.setItem(`guests_${invitationId}`, JSON.stringify(data.guests));
          setStatus("READY");
        } else {
          setStatus("OFFLINE");
        }
      } catch (err) {
        setStatus("OFFLINE");
      }
    };
    loadData();
  }, [invitationId]);

  // 2. Handle Sync (Manual)
  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !navigator.onLine) return;
    
    setStatus("SYNCING");
    const newQueue = [...offlineQueue];
    
    for (const guestId of offlineQueue) {
      const guest = guests.find(g => g.id === guestId);
      if (!guest || !guest.qrToken) continue;

      try {
        const staffAuthToken = localStorage.getItem(`staff_auth_token_${invitationId}`);
        const res = await fetch("/api/receptionist/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: guest.qrToken, invitationId, isCheckIn: true, token: staffAuthToken }),
        });
        const data = await res.json();
        if (data.success) {
          const index = newQueue.indexOf(guestId);
          if (index > -1) newQueue.splice(index, 1);
        }
      } catch (e) {
        console.error("Sync failed for", guest?.name);
      }
    }

    setOfflineQueue(newQueue);
    localStorage.setItem(`offline_queue_${invitationId}`, JSON.stringify(newQueue));
    setStatus("READY");
  };

  // 2b. Background Polling (15 menit) untuk refresh data tamu jika ada tamu baru dari dashboard
  useEffect(() => {
    const fetchLatestGuests = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetch(`/api/receptionist/guests?invitationId=${invitationId}`);
        const data = await res.json();
        if (data.success && data.guests) {
          // Hanya update jika ada penambahan tamu atau perubahan signifikan,
          // tapi tetap pertahankan status isTokenRedeemed lokal untuk yang sudah check-in offline.
          setGuests(prevGuests => {
            const localRedeemed = new Set(prevGuests.filter(g => g.isTokenRedeemed).map(g => g.id));
            const updated = data.guests.map((serverGuest: Guest) => ({
              ...serverGuest,
              isTokenRedeemed: serverGuest.isTokenRedeemed || localRedeemed.has(serverGuest.id)
            }));
            localStorage.setItem(`guests_${invitationId}`, JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.warn("Background guest sync failed", err);
      }
    };

    const pollingInterval = setInterval(fetchLatestGuests, 15 * 60 * 1000); // 15 menit
    return () => clearInterval(pollingInterval);
  }, [invitationId]);

  // 3. Handle Scan / Search
  const handleCheckIn = (guest: Guest) => {
    if (guest.isTokenRedeemed) {
      setScanResult({ 
        type: "error", 
        message: `Tamu ${guest.name} sudah melakukan Check-in sebelumnya!`, 
        guest,
        showDuplicatePrompt: true,
        scannedName: guest.name
      });
      return;
    }

    const updatedGuests = guests.map(g => g.id === guest.id ? { ...g, isTokenRedeemed: true } : g);
    setGuests(updatedGuests);
    localStorage.setItem(`guests_${invitationId}`, JSON.stringify(updatedGuests));

    const newQueue = [...offlineQueue, guest.id];
    setOfflineQueue(newQueue);
    localStorage.setItem(`offline_queue_${invitationId}`, JSON.stringify(newQueue));

    setScanResult({ type: "success", message: `Berhasil Check-in!`, guest });
    setSearchInput("");
    if (inputRef.current) inputRef.current.focus();
  };

  const handleDuplicateGuestArrival = (originalName: string) => {
    // Cari angka terakhir untuk nama yang sama
    const count = guests.filter(g => g.name.toLowerCase().startsWith(originalName.toLowerCase())).length;
    const newName = `${originalName} (${count + 1})`;
    
    const newGuest: Guest = {
      id: `local-${Date.now()}`,
      name: newName,
      category: "UMUM",
      guestQuota: 1,
      tableNumber: null,
      qrToken: null,
      isTokenRedeemed: true
    };
    
    const updatedGuests = [newGuest, ...guests];
    setGuests(updatedGuests);
    localStorage.setItem(`guests_${invitationId}`, JSON.stringify(updatedGuests));
    
    const newQueue = [...offlineQueue, newGuest.id];
    setOfflineQueue(newQueue);
    localStorage.setItem(`offline_queue_${invitationId}`, JSON.stringify(newQueue));
    
    setScanResult({ type: "success", message: `Berhasil Check-in sebagai Tamu Umum Tambahan!`, guest: newGuest });
    setSearchInput("");
  };

  const processScanToken = (token: string) => {
    if (!token) return;
    let targetName = token;
    let targetCategory = "Umum";
    let isLuxToken = false;
    
    if (token.startsWith('LUX|')) {
      const parts = token.split('|');
      const targetInvId = parts[1];
      
      if (targetInvId !== invitationId) {
        setScanResult({ type: "error", message: "QR Code salah! Ini adalah QR dari acara pernikahan lain." });
        return;
      }
      
      targetName = parts[2] || token;
      targetCategory = parts[3] || "Umum";
      isLuxToken = true;
    }

    let foundGuest = guestsRef.current.find(g => g.qrToken === token || g.name.toLowerCase() === targetName.toLowerCase() || (!isLuxToken && g.name.toLowerCase().includes(token.toLowerCase())));
    
    if (foundGuest) {
      handleCheckIn(foundGuest);
    } else if (isLuxToken) {
      const newGuest: Guest = {
        id: `local-${Date.now()}`,
        name: targetName,
        category: targetCategory,
        guestQuota: 1,
        tableNumber: null,
        qrToken: token,
        isTokenRedeemed: false
      };
      
      const updatedGuests = [...guests, newGuest];
      setGuests(updatedGuests);
      localStorage.setItem(`guests_${invitationId}`, JSON.stringify(updatedGuests));
      
      setTimeout(() => handleCheckIn(newGuest), 0);
    } else {
      setScanResult({ type: "error", message: "Data tamu tidak ditemukan di sistem." });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScanToken(searchInput.trim());
  };

  // 4. Camera Scanner Effect (Dukungan Penuh Laptop Webcam & Tablet Dual Camera)
  useEffect(() => {
    let isCancelled = false;

    if (scannerMode !== "CAMERA") {
      safeStopScanner();
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 80);
      return () => clearTimeout(timer);
    }

    setIsCameraLoading(true);
    setCameraError(null);

    const startScanner = async () => {
      // Tunggu hingga transisi sebelumnya selesai jika masih berlangsung
      while (isTransitioningRef.current) {
        await new Promise((r) => setTimeout(r, 60));
      }

      if (isCancelled) return;

      try {
        isTransitioningRef.current = true;

        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
            await html5QrCodeRef.current.clear();
          } catch {}
          html5QrCodeRef.current = null;
        }

        if (isCancelled) {
          isTransitioningRef.current = false;
          return;
        }

        const qrCodeInstance = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = qrCodeInstance;

        const devices = await Html5Qrcode.getCameras();
        if (isCancelled) {
          isTransitioningRef.current = false;
          try { await qrCodeInstance.clear(); } catch {}
          html5QrCodeRef.current = null;
          return;
        }

        if (!devices || devices.length === 0) {
          setCameraError("Tidak ditemukan kamera pada perangkat ini.");
          setIsCameraLoading(false);
          isTransitioningRef.current = false;
          return;
        }

        setCameraList(devices.map((d, i) => ({ id: d.id, label: getCleanCameraLabel(d.label, i) })));

        const targetDeviceId = devices[selectedCameraIndex]?.id || devices[0].id;

        await qrCodeInstance.start(
          targetDeviceId,
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edge = Math.max(180, Math.floor(minEdge * 0.75));
              return { width: edge, height: edge };
            },
          },
          (decodedText) => {
            if (isScanningLockedRef.current) return;
            isScanningLockedRef.current = true;
            playBeep();
            setScanCooldown(true);
            processScanToken(decodedText);

            setTimeout(() => {
              isScanningLockedRef.current = false;
              setScanCooldown(false);
            }, 3000);
          },
          () => {} // silent frame error
        );

        isTransitioningRef.current = false;

        if (isCancelled) {
          safeStopScanner();
          return;
        }

        setIsCameraLoading(false);
      } catch (err: any) {
        isTransitioningRef.current = false;
        if (isCancelled) return;
        console.error("Camera start error:", err);
        setIsCameraLoading(false);
        setCameraError(
          err.name === "NotAllowedError" || err.message?.includes("Permission")
            ? "Izin akses kamera belum diberikan. Klik tombol 'Izinkan' di browser Anda."
            : "Kamera tidak dapat dimulai. Pastikan kamera tidak sedang dipakai aplikasi lain."
        );
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      safeStopScanner();
    };
  }, [scannerMode, selectedCameraIndex, playBeep, invitationId, safeStopScanner]);

  const handleSwitchCamera = () => {
    if (cameraList.length <= 1) return;
    const nextIdx = (selectedCameraIndex + 1) % cameraList.length;
    setSelectedCameraIndex(nextIdx);
  };

  const handleLockSession = () => {
    if (offlineQueue.length > 0) {
      const confirmLock = window.confirm(
        `Perhatian: Terdapat ${offlineQueue.length} data check-in offline yang belum tersinkronisasi ke server.\n\nData antrean offline tetap aman tersimpan di perangkat ini. Lanjutkan mengunci layar scanner?`
      );
      if (!confirmLock) return;
    }

    localStorage.removeItem(`staff_auth_token_${invitationId}`);
    if (onLock) {
      onLock();
    } else if (staffAuth?.lock) {
      staffAuth.lock();
    } else {
      window.location.reload();
    }
  };

  return (
    <div 
      className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-amber-500 selection:text-white"
      style={{ colorScheme: 'light' }}
    >
      {/* Header */}
      <header className="relative bg-stone-900 text-white px-6 py-3.5 shadow-md flex justify-between items-center">
        {/* Left: Brand Logo & Platform Name */}
        <div className="flex items-center gap-3 z-10">
          <BrandLogo size="sm" showName brandName={platformName || "Platform Undangan"} />
        </div>

        {/* Center: RECEPTIONIST SYSTEM */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-center">
          <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-widest uppercase text-stone-100 font-sans whitespace-nowrap">
            RECEPTIONIST SYSTEM
          </h1>
        </div>

        {/* Right: Actions & Status (Icon SVG only & green online indicator) */}
        <div className="flex items-center justify-end gap-2.5 z-10">
          {status === "LOADING" && (
            <div 
              className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center"
              title="Memuat data tamu..."
            >
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          )}

          {status === "READY" && offlineQueue.length === 0 && (
            <div 
              className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center"
              title="Online & Ready — Terhubung ke server"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
            </div>
          )}

          {status === "READY" && offlineQueue.length > 0 && (
            <button 
              type="button"
              onClick={syncOfflineQueue} 
              className="px-2.5 py-1.5 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title={`Menunggu Sync (${offlineQueue.length} tamu) — Klik untuk sinkronkan`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{offlineQueue.length}</span>
            </button>
          )}

          {status === "SYNCING" && (
            <div 
              className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center"
              title="Sedang Sinkronisasi ke server..."
            >
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
          )}

          {status === "OFFLINE" && (
            <div 
              className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center justify-center"
              title="Mode Offline — Data tersimpan lokal di perangkat"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            </div>
          )}

          <div className="h-4 w-px bg-stone-700/80 mx-0.5"></div>

          {/* Fullscreen Kiosk Mode Button (Icon SVG only) */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (Kiosk Mode)"}
            aria-label={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition duration-150 shadow-sm cursor-pointer border ${
              isFullscreen 
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30" 
                : "bg-stone-800/90 hover:bg-stone-700 active:bg-stone-600 text-stone-300 hover:text-white border-stone-700/80"
            }`}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>

          {/* Lock Session Button (Icon SVG only) */}
          <button
            type="button"
            onClick={handleLockSession}
            title="Kunci Layar Scanner"
            aria-label="Kunci Layar Scanner"
            className="w-9 h-9 bg-stone-800/90 hover:bg-stone-700 active:bg-stone-600 text-stone-300 hover:text-white border border-stone-700/80 rounded-xl flex items-center justify-center transition duration-150 shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Col: Result Card (Big Display) */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex-1 flex flex-col justify-center min-h-[400px]">
            {!scanResult ? (
              <div className="text-center text-stone-400 flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="font-bold text-lg text-stone-600 mb-1">Siap Menerima Tamu</h3>
                <p className="text-sm">Silakan lakukan scan QR atau cari nama tamu.</p>
              </div>
            ) : (
              <div className={`p-8 rounded-2xl border w-full text-center shadow-inner ${scanResult.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {scanResult.type === 'success' ? (
                  <>
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-green-500/30">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    
                    <h3 className="text-3xl md:text-4xl font-black text-green-950 mb-3 tracking-tight">{scanResult.guest?.name}</h3>
                    
                    {/* Badge Kategori & Kuota */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                      {scanResult.guest?.category && (
                        <span className="inline-flex items-center px-4 py-1.5 bg-green-200/80 text-green-900 rounded-full text-xs font-bold uppercase tracking-wider border border-green-300 shadow-sm">
                          {scanResult.guest.category}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 text-stone-700 rounded-full text-xs font-bold uppercase tracking-wider border border-stone-200 shadow-sm">
                        <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {scanResult.guest?.guestQuota ? `${scanResult.guest.guestQuota} Pax` : "1 Pax"}
                      </span>
                    </div>

                    {/* Informasi Nomor Meja (Focal Card) */}
                    <div className="my-4 p-4 bg-white/95 border border-green-200/90 rounded-2xl shadow-sm flex items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Lokasi Meja / Tempat Duduk</p>
                        <p className="text-2xl font-black text-stone-900">
                          {scanResult.guest?.tableNumber ? `Meja ${scanResult.guest.tableNumber}` : "Bebas / Tanpa Meja"}
                        </p>
                      </div>
                    </div>

                    <p className="text-green-700 font-bold mt-2 text-base">{scanResult.message}</p>
                  </>
                ) : (
                   <>
                     <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-red-500/30">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-red-900 mb-2">{scanResult.guest?.name || "Akses Ditolak"}</h3>
                    <p className="text-red-700 font-medium text-base mb-3">{scanResult.message}</p>
                    
                    {scanResult.guest && (
                      <div className="my-3 p-3.5 bg-white/95 border border-red-200 rounded-xl shadow-sm inline-flex items-center gap-3">
                        <span className="text-xs font-bold text-stone-500 uppercase">Lokasi Duduk:</span>
                        <span className="text-base font-extrabold text-stone-900">
                          {scanResult.guest.tableNumber ? `Meja ${scanResult.guest.tableNumber}` : "Bebas / Tanpa Meja"}
                        </span>
                        <span className="text-xs text-stone-400">&bull;</span>
                        <span className="text-xs font-bold text-stone-700">{scanResult.guest.guestQuota || 1} Pax</span>
                      </div>
                    )}

                    {scanResult.showDuplicatePrompt && scanResult.scannedName && (
                      <div className="mt-6 pt-6 border-t border-red-200">
                        <p className="text-sm text-red-800 mb-3">Apakah ini tamu umum baru yang namanya kebetulan sama?</p>
                        <button
                          onClick={() => handleDuplicateGuestArrival(scanResult.scannedName!)}
                          className="w-full py-3 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl transition"
                        >
                          Tandai sebagai Orang Berbeda
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Scanner Input & Guest List */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${scannerMode === 'PHYSICAL' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                  {scannerMode === "PHYSICAL" ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    {scannerMode === "PHYSICAL" ? "SCAN" : "KAMERA LIVE"}
                    <span className={`w-1.5 h-1.5 rounded-full ${scannerMode === 'PHYSICAL' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    {scannerMode === "PHYSICAL" 
                      ? "Gunakan barcode scanner tembak atau ketik nama tamu" 
                      : "Arahkan QR Code tamu langsung ke kamera"}
                  </p>
                </div>
              </div>

              {/* Single Switch Tab Button */}
              <button
                type="button"
                onClick={() => setScannerMode(prev => prev === "PHYSICAL" ? "CAMERA" : "PHYSICAL")}
                className="group px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-900 border border-stone-200 hover:border-stone-300 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
                title={scannerMode === "PHYSICAL" ? "Beralih ke Kamera Live" : "Beralih ke Mode Scan"}
              >
                {scannerMode === "PHYSICAL" ? (
                  <>
                    <svg className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Buka Kamera</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span>Mode Scan</span>
                  </>
                )}
                <svg className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Mode Scanner Fisik */}
              <div className={scannerMode === "PHYSICAL" ? "block" : "hidden"}>
                <p className="text-xs text-stone-500 mb-4 text-center">Gunakan alat scanner barcode tembak (Bluetooth/USB) atau ketik nama tamu.</p>
                <form onSubmit={handleFormSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    autoFocus
                    className="flex-1 px-4 py-4 bg-stone-50 border border-stone-300 rounded-xl text-lg font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                    placeholder="Scan QR / Ketik Nama..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <button type="submit" className="px-8 py-4 bg-stone-900 text-white rounded-xl font-bold tracking-widest hover:bg-stone-800 transition">
                    CARI
                  </button>
                </form>

                {/* Sembunyikan/Buka Daftar Tamu (Tombol Kecil Minimalis Tanpa Count) */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setShowManualList(!showManualList)}
                    className="text-xs text-stone-500 hover:text-stone-800 font-medium flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>{showManualList ? "Sembunyikan Daftar Tamu" : "Daftar Tamu"}</span>
                    <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${showManualList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showManualList && (
                    <div className="w-full mt-3 border border-stone-200 rounded-xl overflow-y-auto p-2 max-h-[260px] bg-stone-50/50">
                      {guests.filter(g => searchInput ? g.name.toLowerCase().includes(searchInput.toLowerCase()) : true).map((g) => (
                        <div key={g.id} className="flex justify-between items-center p-2.5 hover:bg-white border-b border-stone-100 last:border-0 rounded-lg transition">
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{g.name}</p>
                            <p className="text-xs text-stone-500">{g.category || "Umum"} &bull; Meja {g.tableNumber || "-"}</p>
                          </div>
                          <div>
                            {g.isTokenRedeemed ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Hadir</span>
                            ) : (
                              <button onClick={() => handleCheckIn(g)} className="px-3 py-1.5 bg-stone-200/70 hover:bg-stone-300 text-stone-800 text-[10px] font-bold rounded uppercase tracking-wider transition">
                                Check-in
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {guests.length === 0 && (
                        <div className="p-6 text-center text-stone-400 text-xs">Belum ada data tamu termuat.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mode Kamera Live */}
              <div className={scannerMode === "CAMERA" ? "flex flex-col gap-3" : "hidden"}>
                  {/* Camera Controls & Status Bar */}
                  <div className="flex items-center justify-between px-1 py-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isCameraLoading ? 'bg-amber-400 animate-ping' : cameraError ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                      <span className="text-xs font-semibold text-stone-600">
                        {isCameraLoading ? "Menyiapkan Kamera..." : cameraError ? "Kamera Terkendala" : "Kamera Siap Scan"}
                      </span>
                      {!isCameraLoading && !cameraError && cameraList[selectedCameraIndex]?.label && (
                        <span className="hidden sm:inline-block text-[11px] text-stone-400">
                          ({cameraList[selectedCameraIndex].label})
                        </span>
                      )}
                    </div>

                    {cameraList.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        {cameraList.length === 2 ? (
                          <button
                            type="button"
                            onClick={handleSwitchCamera}
                            className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1.5 transition border border-stone-300 shadow-sm"
                            title="Balik antara Kamera Depan dan Belakang"
                          >
                            <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Balik Kamera
                          </button>
                        ) : (
                          <select
                            value={selectedCameraIndex}
                            onChange={(e) => setSelectedCameraIndex(Number(e.target.value))}
                            className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500"
                          >
                            {cameraList.map((cam, idx) => (
                              <option key={cam.id} value={idx}>
                                {cam.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Camera Viewport */}
                  <div className="relative rounded-xl overflow-hidden border-2 border-stone-200 bg-stone-950 flex flex-col items-center justify-center min-h-[300px]">
                    {cameraError ? (
                      <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <p className="text-sm font-semibold text-white">{cameraError}</p>
                        <p className="text-xs text-stone-400 max-w-sm">Pastikan izin akses kamera telah diizinkan di browser Anda, atau gunakan mode <strong>Scanner Fisik</strong>.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCameraError(null);
                            setIsCameraLoading(true);
                            setSelectedCameraIndex((prev) => prev);
                          }}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition mt-2"
                        >
                          Coba Hubungkan Ulang
                        </button>
                      </div>
                    ) : (
                      <>
                        <div id="qr-reader" className="w-full"></div>

                        {/* Visual scanning laser beam */}
                        {!scanCooldown && !isCameraLoading && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="w-52 h-52 sm:w-64 sm:h-64 relative">
                              <div 
                                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)]" 
                                style={{ animation: 'scanline 2.2s ease-in-out infinite' }} 
                              />
                            </div>
                          </div>
                        )}

                        {/* Cooldown & Success Flash Overlay */}
                        {scanCooldown && (
                          <div className="absolute inset-0 bg-emerald-600/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-20 transition-all">
                            <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg mb-2 animate-bounce">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <span className="text-sm font-bold bg-stone-900/90 px-4 py-1.5 rounded-full border border-emerald-400 shadow-md">
                              QR Terbaca!
                            </span>
                            <span className="text-[11px] text-emerald-100 mt-1.5 font-medium">
                              Siap untuk scan berikutnya...
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-500 text-center">
                    Arahkan QR Code tamu ke dalam kotak kamera. Di tablet/smartphone, gunakan tombol <strong>Balik Kamera</strong> untuk beralih antara kamera depan dan belakang.
                  </p>

                  <style>{`
                    @keyframes scanline {
                      0% { top: 10%; opacity: 0.2; }
                      50% { top: 90%; opacity: 1; }
                      100% { top: 10%; opacity: 0.2; }
                    }
                    #qr-reader {
                      border: none !important;
                    }
                    #qr-reader video {
                      border-radius: 0.75rem;
                      width: 100% !important;
                      max-height: 440px;
                      object-fit: cover;
                    }
                    #qr-reader__scan_region {
                      display: flex;
                      justify-content: center;
                      align-items: center;
                    }
                    #qr-reader__dashboard {
                      display: none !important;
                    }
                  `}</style>
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
