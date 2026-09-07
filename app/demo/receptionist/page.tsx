"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "react-qr-code";
import { BrandLogo } from "@/components/BrandLogo";

interface DemoGuest {
  id: string;
  name: string;
  category: "VIP" | "KELUARGA" | "REGULER";
  guestQuota: number;
  tableNumber: string;
  qrToken: string;
  isTokenRedeemed: boolean;
}

const INITIAL_DEMO_GUESTS: DemoGuest[] = [
  {
    id: "guest-1",
    name: "Bpk. Bambang Sutrisno & Ibu",
    category: "VIP",
    guestQuota: 2,
    tableNumber: "VIP 01",
    qrToken: "LUX-DEMO-VIP-001",
    isTokenRedeemed: false,
  },
  {
    id: "guest-2",
    name: "Keluarga Besar H. Maryam",
    category: "KELUARGA",
    guestQuota: 4,
    tableNumber: "02",
    qrToken: "LUX-DEMO-FAM-002",
    isTokenRedeemed: false,
  },
  {
    id: "guest-3",
    name: "Dimas Pratama & Partner",
    category: "REGULER",
    guestQuota: 2,
    tableNumber: "08",
    qrToken: "LUX-DEMO-REG-003",
    isTokenRedeemed: false,
  },
  {
    id: "guest-4",
    name: "Rekan Tim Desain Arsitektur",
    category: "REGULER",
    guestQuota: 3,
    tableNumber: "12",
    qrToken: "LUX-DEMO-REG-004",
    isTokenRedeemed: false,
  },
];

export default function DemoReceptionistPage() {
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Guest State
  const [guests, setGuests] = useState<DemoGuest[]>(INITIAL_DEMO_GUESTS);
  const [scannerMode, setScannerMode] = useState<"PHYSICAL" | "CAMERA">("CAMERA");
  const [showQrModal, setShowQrModal] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [showManualList, setShowManualList] = useState(false);

  // Scanner UI States
  const [scanResult, setScanResult] = useState<{
    type: "success" | "error";
    message: string;
    guest?: DemoGuest;
    showDuplicatePrompt?: boolean;
    scannedName?: string;
  } | null>(null);

  const [cameraList, setCameraList] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ambient Screensaver State (Standby Mode)
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Generator Tiket QR
  const [genName, setGenName] = useState("Bpk. Ir. Hendra Gunawan");
  const [genCategory, setGenCategory] = useState<"VIP" | "KELUARGA" | "REGULER">("VIP");
  const [genQuota, setGenQuota] = useState(2);
  const [genTable, setGenTable] = useState("VIP 02");
  const [generatedTicket, setGeneratedTicket] = useState<DemoGuest>(INITIAL_DEMO_GUESTS[0]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qrSvgRef = useRef<HTMLDivElement>(null);
  const guestsRef = useRef(guests);
  const scanResultRef = useRef(scanResult);
  const scanCooldownRef = useRef(scanCooldown);
  const isScreensaverActiveRef = useRef(isScreensaverActive);
  const handleScanOrSearchRef = useRef<(rawInput: string) => void>(() => {});

  useEffect(() => {
    guestsRef.current = guests;
  }, [guests]);

  useEffect(() => {
    scanResultRef.current = scanResult;
  }, [scanResult]);

  useEffect(() => {
    scanCooldownRef.current = scanCooldown;
  }, [scanCooldown]);

  useEffect(() => {
    isScreensaverActiveRef.current = isScreensaverActive;
  }, [isScreensaverActive]);

  // Auto-Dismiss Notifikasi Hasil Scan (15 Detik Kembali ke "Siaga Menerima Tamu")
  useEffect(() => {
    if (!scanResult) return;

    const autoDismissTimer = setTimeout(() => {
      setScanResult(null);
    }, 15000);

    return () => clearTimeout(autoDismissTimer);
  }, [scanResult]);

  // Real-time Clock for Screensaver
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Idle Timer Detector untuk Ambient Screensaver (120 Detik / 2 Menit)
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsScreensaverActive(true);
      }, 120000);
    };

    let lastActivity = Date.now();
    const handleUserActivity = (e: Event) => {
      const now = Date.now();
      if (now - lastActivity > 1000) {
        lastActivity = now;
        resetIdleTimer();
      }
      // Jika screensaver sedang aktif dan terdeteksi interaksi, bangunkan layar seketika
      if (isScreensaverActiveRef.current && (e.type === "keydown" || e.type === "mousedown" || e.type === "touchstart")) {
        setIsScreensaverActive(false);
      }
    };

    window.addEventListener("mousemove", handleUserActivity, { passive: true });
    window.addEventListener("mousedown", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });
    window.addEventListener("touchstart", handleUserActivity, { passive: true });

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("mousedown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
    };
  }, []);

  // Audio Beep Feedback via Web Audio API (Identik sistem asli)
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      // Audio blocked without gesture
    }
  }, []);

  // Fullscreen Change Tracker
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  // Safe stop scanner helper (Menghentikan MediaStream hardware webcam & instance Html5Qrcode secara tuntas)
  const safeStopScanner = useCallback(async () => {
    // 1. Matikan langsung semua hardware video track di DOM secara paksa agar lampu webcam seketika padam
    try {
      const qrReaderEl = document.getElementById("qr-reader");
      if (qrReaderEl) {
        const videoElements = qrReaderEl.querySelectorAll("video");
        videoElements.forEach((video) => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch {}
            });
            video.srcObject = null;
          }
          try {
            video.pause();
            video.removeAttribute("src");
            video.load();
          } catch {}
        });
      }
    } catch (domErr) {
      console.warn("DOM video track cleanup notice:", domErr);
    }

    // 2. Hentikan instance Html5Qrcode jika sedang aktif
    const scanner = html5QrCodeRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        try {
          await scanner.clear();
        } catch {}
      } catch (err) {
        console.warn("Non-fatal scanner stop notice:", err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }

    // 3. Bersihkan elemen DOM
    try {
      const qrReaderEl = document.getElementById("qr-reader");
      if (qrReaderEl) {
        qrReaderEl.innerHTML = "";
      }
    } catch {}
  }, []);

  // Handle Check-in Logic
  const handleCheckIn = useCallback((targetGuest: DemoGuest) => {
    setIsScreensaverActive(false);
    if (targetGuest.isTokenRedeemed) {
      setScanResult({
        type: "error",
        message: `Tamu ${targetGuest.name} sudah melakukan Check-in sebelumnya!`,
        guest: targetGuest,
        showDuplicatePrompt: true,
        scannedName: targetGuest.name,
      });
      return;
    }

    playBeep();
    setGuests((prev) =>
      prev.map((g) => (g.id === targetGuest.id ? { ...g, isTokenRedeemed: true } : g))
    );

    setScanResult({
      type: "success",
      message: "Check-in Berhasil!",
      guest: { ...targetGuest, isTokenRedeemed: true },
    });
  }, [playBeep]);

  // Handle Scan / Search
  const handleScanOrSearch = useCallback((rawInput: string) => {
    setIsScreensaverActive(false);
    if (!rawInput || scanCooldown) return;
    const clean = rawInput.trim();

    // 1. Cari via qrToken
    let matched = guestsRef.current.find((g) => g.qrToken.toLowerCase() === clean.toLowerCase());

    // 2. Jika payload JSON
    if (!matched && clean.startsWith("{")) {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.qrToken) {
          matched = guestsRef.current.find((g) => g.qrToken === parsed.qrToken);
        }
        if (!matched && parsed.name) {
          const newG: DemoGuest = {
            id: `guest-${Date.now()}`,
            name: parsed.name,
            category: parsed.category || "REGULER",
            guestQuota: Number(parsed.quota || 1),
            tableNumber: parsed.table || "-",
            qrToken: parsed.qrToken || `LUX-${Date.now()}`,
            isTokenRedeemed: false,
          };
          setGuests((prev) => [newG, ...prev]);
          matched = newG;
        }
      } catch {}
    }

    // 3. Cari via Nama
    if (!matched) {
      matched = guestsRef.current.find((g) => g.name.toLowerCase() === clean.toLowerCase());
    }

    if (matched) {
      setScanCooldown(true);
      handleCheckIn(matched);
      setTimeout(() => setScanCooldown(false), 2500);
    } else {
      setScanCooldown(true);
      setScanResult({
        type: "error",
        message: `QR Token "${clean}" tidak ditemukan dalam daftar tamu undangan.`,
        showDuplicatePrompt: false,
      });
      setTimeout(() => setScanCooldown(false), 2500);
    }

    setSearchInput("");
  }, [scanCooldown, handleCheckIn]);

  useEffect(() => {
    handleScanOrSearchRef.current = handleScanOrSearch;
  }, [handleScanOrSearch]);

  // Scanner Camera Lifecycle (Terisolasi penuh, mati otomatis saat screensaver standby untuk hemat baterai & privasi)
  useEffect(() => {
    if (scannerMode !== "CAMERA" || isLocked || isScreensaverActive) {
      safeStopScanner();
      return;
    }

    let isCancelled = false;

    const startScanner = async () => {
      await safeStopScanner();
      if (isCancelled) return;

      setIsCameraLoading(true);
      setCameraError(null);

      try {
        const qrScanner = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = qrScanner;

        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setCameraError("Tidak ada perangkat kamera yang terdeteksi.");
          setIsCameraLoading(false);
          return;
        }

        setCameraList(
          devices.map((d, i) => ({
            id: d.id,
            label: d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("belakang")
              ? "Kamera Belakang"
              : d.label.toLowerCase().includes("front") || d.label.toLowerCase().includes("depan")
              ? "Kamera Depan"
              : d.label || `Kamera ${i + 1}`,
          }))
        );

        const currentCamId = devices[selectedCameraIndex]?.id || devices[0].id;

        await qrScanner.start(
          currentCamId,
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Jeda pemindaian jika kartu notifikasi / hasil scan sedang aktif atau sedang cooldown
            if (scanResultRef.current !== null || scanCooldownRef.current) {
              return;
            }
            handleScanOrSearchRef.current(decodedText);
          },
          () => {}
        );

        setIsCameraLoading(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setIsCameraLoading(false);
        setCameraError(
          msg.includes("Permission") || msg.includes("NotAllowed")
            ? "Izin akses kamera belum diberikan. Klik 'Izinkan' di browser Anda."
            : "Kamera tidak dapat dimulai. Pastikan kamera tidak sedang dipakai aplikasi lain."
        );
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      safeStopScanner();
    };
  }, [scannerMode, selectedCameraIndex, isLocked, isScreensaverActive, safeStopScanner]);

  const handleSwitchCamera = () => {
    if (cameraList.length <= 1) return;
    const nextIdx = (selectedCameraIndex + 1) % cameraList.length;
    setSelectedCameraIndex(nextIdx);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScanOrSearch(searchInput);
  };

  // Generate QR Custom
  const handleGenerateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genName.trim()) return;

    const token = `LUX-${Date.now().toString(36).toUpperCase()}`;
    const newGuest: DemoGuest = {
      id: `gen-${Date.now()}`,
      name: genName.trim(),
      category: genCategory,
      guestQuota: genQuota,
      tableNumber: genTable.trim() || "-",
      qrToken: token,
      isTokenRedeemed: false,
    };

    setGuests((prev) => [newGuest, ...prev]);
    setGeneratedTicket(newGuest);
  };

  const isCurrentTicketRedeemed = guests.find(
    (g) => g.id === generatedTicket.id || g.qrToken === generatedTicket.qrToken
  )?.isTokenRedeemed;

  const handleResetTicketStatus = (ticket: DemoGuest) => {
    setGuests((prev) =>
      prev.map((g) =>
        g.id === ticket.id || g.qrToken === ticket.qrToken
          ? { ...g, isTokenRedeemed: false }
          : g
      )
    );
    if (scanResult?.guest?.id === ticket.id || scanResult?.guest?.qrToken === ticket.qrToken) {
      setScanResult(null);
    }
  };

  const scrollToGenerator = () => {
    const el = document.getElementById("qr-generator-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const nameInput = document.getElementById("gen-guest-name");
      nameInput?.focus();
    }
  };

  // Download QR PNG
  const handleDownloadQrPng = () => {
    if (!qrSvgRef.current) return;
    const svgElement = qrSvgRef.current.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 20, 20, 360, 360);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `QR-Tiket-${generatedTicket.name.replace(/\s+/g, "_")}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  // Lock Screen Handler
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === "1234") {
      setIsLocked(false);
      setPinError(false);
      setPinInput("");
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  // 1. Tampilan Terkunci (Sesuai StaffLockScreen Asli)
  if (isLocked) {
    return (
      <div 
        className="min-h-screen bg-stone-100 flex items-center justify-center p-6 text-stone-900 font-sans"
        style={{ colorScheme: "only light" }}
      >
        <div className="max-w-sm w-full bg-white rounded-2xl border border-stone-200 shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-stone-100 border border-stone-200 rounded-full flex items-center justify-center mx-auto text-stone-700">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-stone-900">Layar Scanner Dikunci</h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Sesi panitia sedang dikunci. Masukkan PIN untuk kembali ke pemindai.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4 pt-2">
            <div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="1234"
                className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 px-4 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 font-bold"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-600 mt-2 font-medium">
                  PIN salah. Masukkan PIN Demo: <strong>1234</strong>
                </p>
              )}
            </div>

            <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-xl text-left">
              <p className="text-[11px] text-stone-600">
                PIN Demo Panitia: <strong>1234</strong>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
            >
              Buka Layar Scanner
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Tampilan Utama Persis 100% dengan ReceptionistScannerClient (Full Screen Zero-Scroll Kiosk)
  return (
    <div 
      className="h-screen overflow-hidden bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-amber-500 selection:text-white"
      style={{ colorScheme: "only light" }}
    >
      {/* Header Asli: bg-stone-900 dengan judul RECEPTIONIST SYSTEM di tengah */}
      <header className="flex-shrink-0 relative bg-stone-900 text-white px-6 py-3.5 shadow-md flex justify-between items-center z-30">
        {/* Left: Brand Logo & Platform Name */}
        <div className="flex items-center gap-3 z-10">
          <Link href="/demo" className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
            <BrandLogo size="sm" showName brandName="Luxenary" />
          </Link>
        </div>

        {/* Center: RECEPTIONIST SYSTEM (Perfect Center) */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-center">
          <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-widest uppercase text-stone-100 font-sans whitespace-nowrap">
            RECEPTIONIST SYSTEM
          </h1>
        </div>

        {/* Right: Actions & Status (Bersih Sesuai Kiosk Asli) */}
        <div className="flex items-center justify-end gap-2.5 z-10">
          {/* Online Indicator Asli */}
          <div 
            className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center"
            title="Online & Ready — Terhubung ke sistem"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
          </div>

          {/* Standby Screensaver Button */}
          <button
            type="button"
            onClick={() => setIsScreensaverActive(true)}
            title="Mode Standby (Screensaver)"
            aria-label="Mode Standby"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition duration-150 shadow-sm cursor-pointer border bg-stone-800/90 hover:bg-stone-700 active:bg-stone-600 text-stone-300 hover:text-white border-stone-700/80"
          >
            <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>

          {/* Fullscreen Kiosk Mode Button Asli */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (Kiosk Mode)"}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition duration-150 shadow-sm cursor-pointer border ${
              isFullscreen 
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30" 
                : "bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white border-stone-700/80"
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

          {/* Lock Session Button Asli */}
          <button
            type="button"
            onClick={() => setIsLocked(true)}
            title="Kunci Layar Scanner"
            className="w-9 h-9 bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700/80 rounded-xl flex items-center justify-center transition duration-150 shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        
        <div className="md:col-span-5 h-full flex flex-col min-h-0">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 h-full flex flex-col justify-center overflow-y-auto custom-scrollbar">
            {!scanResult ? (
              <div className="text-center text-stone-400 flex flex-col items-center justify-center my-auto">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-stone-600 mb-1">Siap Menerima Tamu</h3>
                <p className="text-sm">Silakan lakukan scan QR atau cari nama tamu.</p>
              </div>
            ) : (
              <div className={`p-6 sm:p-8 rounded-2xl border w-full text-center shadow-inner my-auto ${
                scanResult.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}>
                {scanResult.type === "success" ? (
                  <>
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-green-500/30">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    
                    <h3 className="text-3xl md:text-4xl font-black text-green-950 mb-3 tracking-tight">
                      {scanResult.guest?.name}
                    </h3>
                    
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
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-red-900 mb-2">{scanResult.guest?.name || "Akses Ditolak"}</h3>
                    <p className="text-red-700 font-medium text-base mb-3">{scanResult.message}</p>
                  </>
                )}

                <div className="mt-5 pt-4 border-t border-stone-200/60 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setScanResult(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold border border-stone-200 transition cursor-pointer shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Kembali ke Siaga Scan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Scanner Card Asli (Kamera Live vs Mode Scan) */}
        <div className="md:col-span-7 h-full flex flex-col min-h-0">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 h-full flex flex-col overflow-hidden">
            {/* Header Scanner Asli dengan Single Switch Button */}
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  scannerMode === "PHYSICAL" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                }`}>
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
                    <span className={`w-1.5 h-1.5 rounded-full ${scannerMode === "PHYSICAL" ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`}></span>
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    {scannerMode === "PHYSICAL" 
                      ? "Gunakan barcode scanner tembak atau ketik nama tamu" 
                      : "Arahkan QR Code tamu langsung ke kamera"}
                  </p>
                </div>
              </div>

              {/* Single Switch Tab Button Asli */}
              <button
                type="button"
                onClick={() => setScannerMode((prev) => (prev === "PHYSICAL" ? "CAMERA" : "PHYSICAL"))}
                className="group px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-900 border border-stone-200 hover:border-stone-300 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
                title={scannerMode === "PHYSICAL" ? "Beralih ke Kamera Live" : "Beralih ke Mode Scan"}
              >
                {scannerMode === "PHYSICAL" ? (
                  <>
                    <svg className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
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

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {/* Mode Scanner Fisik Asli */}
              <div className={scannerMode === "PHYSICAL" ? "block" : "hidden"}>
                <p className="text-xs text-stone-500 mb-4 text-center">
                  Gunakan barcode scanner tembak (Bluetooth/USB) atau ketik nama tamu.
                </p>
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
                  <button type="submit" className="px-8 py-4 bg-stone-900 text-white rounded-xl font-bold tracking-widest hover:bg-stone-800 transition cursor-pointer">
                    CARI
                  </button>
                </form>

                {/* Tombol Cepat Simulasi Tamu (Demo Helper) */}
                <div className="mt-4 p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                      Simulasi 1-Klik Tamu Undangan:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                    >
                      + Buat Tamu Baru
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {guests.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleCheckIn(g)}
                        className="px-3 py-1.5 bg-white hover:bg-amber-100/60 border border-amber-200 text-stone-800 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>{g.name}</span>
                        <span className="text-[10px] text-amber-700">({g.tableNumber})</span>
                        {g.isTokenRedeemed && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sembunyikan/Buka Daftar Tamu Asli */}
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
                    <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${showManualList ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showManualList && (
                    <div className="w-full mt-3 border border-stone-200 rounded-xl overflow-y-auto p-2 max-h-[240px] bg-stone-50/50">
                      {guests.filter((g) => (searchInput ? g.name.toLowerCase().includes(searchInput.toLowerCase()) : true)).map((g) => (
                        <div key={g.id} className="flex justify-between items-center p-2.5 hover:bg-white border-b border-stone-100 last:border-0 rounded-lg transition">
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{g.name}</p>
                            <p className="text-xs text-stone-500">{g.category || "Umum"} &bull; Meja {g.tableNumber || "-"}</p>
                          </div>
                          <div>
                            {g.isTokenRedeemed ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Hadir</span>
                            ) : (
                              <button onClick={() => handleCheckIn(g)} className="px-3 py-1.5 bg-stone-200/70 hover:bg-stone-300 text-stone-800 text-[10px] font-bold rounded uppercase tracking-wider transition cursor-pointer">
                                Check-in
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Mode Kamera Live Asli */}
              <div className={scannerMode === "CAMERA" ? "flex flex-col gap-3" : "hidden"}>
                {/* Camera Controls & Status Bar Asli */}
                <div className="flex items-center justify-between px-1 py-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isCameraLoading ? "bg-amber-400 animate-ping" : cameraError ? "bg-red-500" : scanResult ? "bg-amber-400" : "bg-emerald-500 animate-pulse"}`} />
                    <span className="text-xs font-semibold text-stone-600">
                      {isCameraLoading ? "Menyiapkan Kamera..." : cameraError ? "Kamera Terkendala" : scanResult ? "Pemindaian Dijeda (Hasil Tampil)" : "Kamera Siap Scan"}
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
                          className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1.5 transition border border-stone-300 shadow-sm cursor-pointer"
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

                {/* Camera Viewport Asli */}
                <div className="relative rounded-xl overflow-hidden border-2 border-stone-200 bg-stone-950 flex flex-col items-center justify-center min-h-[260px]">
                  {cameraError ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-white">{cameraError}</p>
                      <p className="text-xs text-stone-400 max-w-sm">
                        Pastikan izin akses kamera telah diizinkan di browser Anda, atau gunakan mode <strong>SCAN</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCameraError(null);
                          setIsCameraLoading(true);
                          setSelectedCameraIndex((prev) => prev);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition mt-2 cursor-pointer"
                      >
                        Coba Hubungkan Ulang
                      </button>
                    </div>
                  ) : (
                    <>
                      <div id="qr-reader" className="w-full"></div>

                      {/* Visual scanning laser beam Asli */}
                      {!scanCooldown && !isCameraLoading && !scanResult && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="w-52 h-52 sm:w-60 sm:h-60 relative">
                            <div 
                              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)]" 
                              style={{ animation: "scanline 2.2s ease-in-out infinite" }} 
                            />
                          </div>
                        </div>
                      )}

                      {/* Cooldown & Success Flash Overlay Asli */}
                      {scanCooldown && (
                        <div className="absolute inset-0 bg-emerald-600/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-20 transition-all">
                          <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg mb-2 animate-bounce">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
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

                {/* Tombol Buat Data Simulasi QR (Tepat di Bawah Layar View Kamera) */}
                <div className="pt-2 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer border border-stone-800"
                  >
                    <svg className="w-3.5 h-3.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Buat Data Simulasi QR</span>
                  </button>

                  <p className="text-[11px] text-stone-500 text-center">
                    Arahkan QR Code tamu ke dalam kotak kamera. Di tablet/smartphone, gunakan tombol <strong>Balik Kamera</strong> untuk beralih antara kamera depan dan belakang.
                  </p>
                </div>

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
                    max-height: 380px;
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
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #d6d3d1;
                    border-radius: 9999px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #a8a29e;
                  }
                `}</style>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Popup Generator & Penguji QR Tiket Tamu */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Tombol Tutup X */}
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition cursor-pointer"
              title="Tutup Popup"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header Modal */}
            <div className="flex items-center gap-3 mb-5 pr-10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-stone-900 uppercase tracking-wider">
                    Uji Coba QR Tiket Tamu
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                    Live Generator
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Ketik data tamu untuk membuat barcode QR, unduh gambar atau uji scan langsung.
                </p>
              </div>
            </div>

            {/* Body Modal (Grid 2 Kolom Persis Desain Kartu) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Kolom Kiri: Form Input Data Tamu */}
              <form onSubmit={handleGenerateTicket} className="md:col-span-7 space-y-3.5">
                <div>
                  <label htmlFor="gen-guest-name" className="text-xs font-bold text-stone-700 block mb-1">
                    Nama Tamu Undangan
                  </label>
                  <input
                    id="gen-guest-name"
                    type="text"
                    value={genName}
                    onChange={(e) => setGenName(e.target.value)}
                    placeholder="Contoh: Bpk. Dr. H. Hendra Gunawan"
                    className="w-full text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 focus:bg-white focus:outline-none text-stone-900 font-semibold transition"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Kategori</label>
                    <select
                      value={genCategory}
                      onChange={(e) => setGenCategory(e.target.value as "VIP" | "KELUARGA" | "REGULER")}
                      className="w-full text-xs px-2.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 focus:bg-white focus:outline-none text-stone-900 font-medium"
                    >
                      <option value="VIP">VIP</option>
                      <option value="KELUARGA">Keluarga</option>
                      <option value="REGULER">Reguler</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Pax (Orang)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={genQuota}
                      onChange={(e) => setGenQuota(Number(e.target.value))}
                      className="w-full text-xs px-2.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 focus:bg-white focus:outline-none text-stone-900 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">No. Meja</label>
                    <input
                      type="text"
                      value={genTable}
                      onChange={(e) => setGenTable(e.target.value)}
                      placeholder="VIP 01 / 05"
                      className="w-full text-xs px-2.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-600 focus:bg-white focus:outline-none text-stone-900 text-center font-bold"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>+ Buat / Perbarui Barcode Tiket</span>
                  </button>
                </div>

                {/* Preset Contoh Tamu Cepat */}
                <div className="pt-2 border-t border-stone-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                    CONTOH TAMU SIAP PAKAI:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {INITIAL_DEMO_GUESTS.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => {
                          setGenName(sample.name);
                          setGenCategory(sample.category);
                          setGenQuota(sample.guestQuota);
                          setGenTable(sample.tableNumber);
                          const existing = guests.find((g) => g.id === sample.id) || sample;
                          setGeneratedTicket(existing);
                        }}
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition cursor-pointer font-medium ${
                          generatedTicket.id === sample.id
                            ? "bg-amber-500 text-white border-amber-500 shadow-2xs font-bold"
                            : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                        }`}
                      >
                        {sample.name.split("&")[0].trim()} ({sample.tableNumber})
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {/* Kolom Kanan: Box Preview Barcode & Actions */}
              <div className="md:col-span-5 bg-stone-50/90 border border-stone-200 rounded-2xl p-4 flex flex-col items-center text-center">
                <div
                  ref={qrSvgRef}
                  className="bg-white p-3 rounded-xl border border-stone-200/90 shadow-sm inline-block mb-2"
                >
                  <QRCode
                    value={generatedTicket.qrToken}
                    size={135}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox="0 0 135 135"
                    fgColor="#1c1917"
                  />
                </div>

                <p className="text-xs font-bold text-stone-900 line-clamp-1">{generatedTicket.name}</p>
                <p className="text-[11px] text-stone-500 font-medium">
                  {generatedTicket.category} &bull; {generatedTicket.guestQuota} Pax &bull; Meja {generatedTicket.tableNumber}
                </p>
                <p className="text-[10px] font-mono text-stone-400 mt-0.5 tracking-wider">
                  {generatedTicket.qrToken}
                </p>

                {/* Status Kehadiran Tamu Ini */}
                <div className="mt-2 flex items-center gap-1.5">
                  {isCurrentTicketRedeemed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Sudah Hadir
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Siap Scan
                    </span>
                  )}

                  {isCurrentTicketRedeemed && (
                    <button
                      type="button"
                      onClick={() => handleResetTicketStatus(generatedTicket)}
                      className="text-[10px] font-bold text-stone-500 hover:text-stone-800 underline transition cursor-pointer"
                      title="Reset status check-in agar bisa di-scan ulang"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Tombol Aksi */}
                <div className="w-full grid grid-cols-2 gap-2 mt-3.5">
                  <button
                    type="button"
                    onClick={handleDownloadQrPng}
                    className="py-2.5 px-2 bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-stone-300 shadow-2xs"
                    title="Unduh QR Code sebagai gambar PNG"
                  >
                    <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Unduh PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleCheckIn(generatedTicket);
                      setShowQrModal(false);
                    }}
                    className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    title="Uji scan langsung dan lihat kartu hasil check-in"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Uji Scan</span>
                  </button>
                </div>

                <p className="text-[10px] text-stone-400 mt-2.5 leading-tight">
                  Tip: Unduh gambar lalu buka di smartphone untuk diarahkan ke kamera live di atas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ambient Standby Screensaver Overlay (Watermark Logo Platform) */}
      {isScreensaverActive && (
        <div
          onClick={() => setIsScreensaverActive(false)}
          className="fixed inset-0 z-50 bg-stone-950 flex flex-col justify-between items-center p-6 sm:p-10 select-none cursor-pointer animate-in fade-in duration-500 overflow-hidden"
          style={{
            backgroundImage: "radial-gradient(circle at center, rgba(38, 33, 28, 0.96) 0%, rgba(12, 10, 9, 0.99) 70%)",
          }}
        >
          {/* Top Bar Screensaver: Jam Digital & Status Mini */}
          <div className="w-full flex justify-between items-center text-stone-500 text-xs font-mono tracking-widest uppercase">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400/80"></span>
              <span className="text-stone-400 font-semibold tracking-wider text-[11px]">Mode Standby &bull; Hemat Daya</span>
            </div>
            <div className="text-stone-300 font-bold tracking-widest text-sm sm:text-base">
              {currentTime}
            </div>
            <div className="text-stone-500 text-[11px] hidden sm:block">
              Luxenary Invite System
            </div>
          </div>

          {/* Center: Watermark Logo Platform Keren Agak Besar di Tengah */}
          <div className="my-auto flex flex-col items-center justify-center text-center relative px-4">
            {/* Watermark Glow Ambient */}
            <div className="absolute w-80 h-80 sm:w-[450px] sm:h-[450px] rounded-full bg-amber-500/5 blur-3xl pointer-events-none -z-10 animate-pulse"></div>

            {/* Logo Platform Watermark Besar */}
            <div className="mb-4 opacity-40 hover:opacity-60 transition-opacity transform hover:scale-105 duration-500">
              <BrandLogo size="lg" showName={false} />
            </div>

            {/* Tipografi Watermark Platform Mega */}
            <div className="font-sans text-3xl sm:text-5xl md:text-6xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-b from-stone-100/40 via-stone-300/15 to-transparent drop-shadow-2xl leading-tight uppercase">
              LUXENARY INVITE
            </div>

            {/* Garis Aksen Emas Halus */}
            <div className="w-28 sm:w-44 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent my-4"></div>

            <h2 className="text-xs sm:text-sm md:text-base font-medium tracking-[0.35em] uppercase text-stone-400/80 font-sans">
              RECEPTIONIST &bull; EVENT CHECK-IN
            </h2>

            <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-stone-600 mt-2 font-mono">
              Zero-Database Client Simulator &bull; Single-Screen Kiosk
            </p>
          </div>

          {/* Bottom Hint Bar */}
          <div className="text-center flex flex-col items-center gap-2 pb-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900/70 border border-stone-800 text-stone-400 text-xs font-medium backdrop-blur-xs">
              <svg className="w-4 h-4 text-amber-400/80 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Sentuh layar untuk mulai scan</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
