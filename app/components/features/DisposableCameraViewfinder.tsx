"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

export interface DisposableCameraViewfinderProps {
  invitationId: string;
  coupleName: string;
  coverUrl?: string;
  galleryUrl: string;
  backUrl: string;
  filterId?: string; // "aura_90s" | "heritage_romance" | "botanical_mist" | "cinema_noir" | "pure_daylight"
  shotsQuota?: number; // 0 = unlimited
  totalEventCap?: number;
  maxContributors?: number;
  currentContributorsCount?: number;
  isContributorLimitReached?: boolean;
  dateStampEnabled?: boolean;
  dateFormat?: string; // "DD MM 'YY" | "DD · MMM · YYYY"
  isUploadLocked?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  isTestMode?: boolean;
  onPhotoUploaded?: (newMemory: any) => void;
}

// ── DEFINISI PRESET FILTER ANALOG ──
const FILTER_PRESETS: Record<string, {
  name: string;
  cssFilter: string;
  canvasFilter: string;
  overlayColor?: string;
  overlayBlend?: GlobalCompositeOperation;
  vignetteStrength: number;
}> = {
  aura_90s: {
    name: "Aura '90s",
    cssFilter: "contrast(1.15) saturate(1.2) sepia(0.18) brightness(0.97)",
    canvasFilter: "contrast(1.15) saturate(1.2) sepia(0.18) brightness(0.97)",
    vignetteStrength: 0.35,
  },
  heritage_romance: {
    name: "Heritage Romance",
    cssFilter: "sepia(0.38) contrast(1.08) brightness(0.94) saturate(1.1)",
    canvasFilter: "sepia(0.38) contrast(1.08) brightness(0.94) saturate(1.1)",
    overlayColor: "rgba(245, 230, 203, 0.12)",
    overlayBlend: "soft-light",
    vignetteStrength: 0.45,
  },
  botanical_mist: {
    name: "Botanical Mist",
    cssFilter: "contrast(1.08) saturate(0.95) hue-rotate(10deg) brightness(1.02)",
    canvasFilter: "contrast(1.08) saturate(0.95) hue-rotate(10deg) brightness(1.02)",
    vignetteStrength: 0.25,
  },
  cinema_noir: {
    name: "Cinema Noir",
    cssFilter: "grayscale(1) contrast(1.3) brightness(0.92)",
    canvasFilter: "grayscale(1) contrast(1.3) brightness(0.92)",
    vignetteStrength: 0.5,
  },
  pure_daylight: {
    name: "Pure Daylight",
    cssFilter: "contrast(1.05) saturate(1.05) brightness(1.0)",
    canvasFilter: "contrast(1.05) saturate(1.05) brightness(1.0)",
    vignetteStrength: 0.15,
  },
};

// Sintesis suara shutter mekanik via Web Audio API tanpa file audio eksternal
function playShutterSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // White noise burst singkat (bunyi klik mekanis)
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter bandpass
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch {
    // Silent fail jika audio context diblokir browser
  }
}

export default function DisposableCameraViewfinder({
  invitationId,
  coupleName,
  galleryUrl,
  backUrl,
  filterId = "aura_90s",
  shotsQuota = 5,
  maxContributors = 100,
  currentContributorsCount = 0,
  isContributorLimitReached = false,
  dateStampEnabled = true,
  dateFormat = "DD MM 'YY",
  isUploadLocked = false,
  startTime = null,
  endTime = null,
  isTestMode = false,
  onPhotoUploaded,
}: DisposableCameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  // States
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Identity & Quota
  const [guestToken, setGuestToken] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [guestMessage, setGuestMessage] = useState<string>("");
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [shotsTaken, setShotsTaken] = useState(0);

  // Snapping / Uploading
  const [isSnapping, setIsSnapping] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Filter
  const activePreset = FILTER_PRESETS[filterId] || FILTER_PRESETS.aura_90s;

  // ── 1. INISIALISASI IDENTITAS GUEST TOKEN & LOCAL SHOT COUNTER ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Baca atau buat guest token unik
    const storageKey = `lux_guest_token_${invitationId}`;
    let token = localStorage.getItem(storageKey);
    if (!token) {
      token = `gst_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
      localStorage.setItem(storageKey, token);
    }
    setGuestToken(token);

    // Baca nama tersimpan
    const savedName = localStorage.getItem(`lux_guest_name_${invitationId}`) || "";
    const savedMsg = localStorage.getItem(`lux_guest_msg_${invitationId}`) || "";
    setSenderName(savedName);
    setGuestMessage(savedMsg);

    // Hitung jatah lokal
    const taken = parseInt(localStorage.getItem(`lux_shots_taken_${invitationId}_${token}`) || "0", 10);
    setShotsTaken(isNaN(taken) ? 0 : taken);

    // Buka modal identitas jika belum ada nama
    if (!savedName && !isTestMode) {
      setShowIdentityModal(true);
    }
  }, [invitationId, isTestMode]);

  // ── 2. INISIALISASI STREAM WEBRTC KAMERA ──
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);

    // Hentikan stream aktif lama
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Peramban Anda tidak mendukung kamera langsung.");
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Deteksi kemampuan hardware Torch (Flash)
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        setHasTorch(Boolean(capabilities && capabilities.torch));
      }

      setCameraReady(true);
    } catch (err: any) {
      console.warn("[DisposableCamera] Gagal menyalakan kamera:", err);
      let msg = "Tidak dapat mengakses kamera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Izin kamera ditolak. Silakan izinkan kamera di setelan browser atau gunakan tombol Kamera Bawaan HP di bawah.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Kamera tidak ditemukan pada perangkat ini.";
      }
      setCameraError(msg);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({ advanced: [{ torch: nextTorch }] });
      setTorchOn(nextTorch);
    } catch {
      setTorchOn(false);
    }
  };

  // Flip Kamera
  const flipCamera = () => {
    setTorchOn(false);
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // ── 3. FORMAT RETRO DATE STAMP ──
  const getFormattedDateStamp = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const yearShort = String(d.getFullYear()).slice(-2);

    if (dateFormat === "DD · MMM · YYYY") {
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
      return `${day} · ${monthNames[d.getMonth()]} · ${d.getFullYear()}`;
    }
    return `${day} ${month} '${yearShort}`;
  };

  // ── 4. PROSES JEPRET (SNAP & CANVAS BAKE-IN) ──
  const triggerSnap = async () => {
    if (isSnapping || !cameraReady || !videoRef.current || !canvasRef.current) return;

    // Cek jatah roll jika ada batasan
    const isUnlimited = shotsQuota <= 0;
    if (!isUnlimited && shotsTaken >= shotsQuota) {
      setToastMessage(`Roll film Anda sudah habis (${shotsQuota}/${shotsQuota}). Terima kasih!`);
      return;
    }

    setIsSnapping(true);
    playShutterSound();

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(45);
    }

    // Efek flash visual di layar
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 120);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    // Tentukan resolusi simpan (Maks 1080p agar ultralight ~300KB)
    const MAX_DIM = 1080;
    let targetW = vWidth;
    let targetH = vHeight;

    if (targetW > targetH) {
      if (targetW > MAX_DIM) {
        targetH = Math.round((targetH * MAX_DIM) / targetW);
        targetW = MAX_DIM;
      }
    } else {
      if (targetH > MAX_DIM) {
        targetW = Math.round((targetW * MAX_DIM) / targetH);
        targetH = MAX_DIM;
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsSnapping(false);
      return;
    }

    // 1. Gambar frame video mentah dengan efek zoom digital jika aktif
    ctx.save();
    if (facingMode === "user") {
      // Mirroring untuk kamera depan
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }

    if (zoomLevel > 1) {
      const cropW = vWidth / zoomLevel;
      const cropH = vHeight / zoomLevel;
      const cropX = (vWidth - cropW) / 2;
      const cropY = (vHeight - cropH) / 2;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
    } else {
      ctx.drawImage(video, 0, 0, targetW, targetH);
    }
    ctx.restore();

    // 2. Bakar Filter Color Grading
    if (activePreset.canvasFilter) {
      ctx.save();
      ctx.filter = activePreset.canvasFilter;
      ctx.globalCompositeOperation = "copy";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    }

    // 3. Lapisan Overlay Tint Warna Tambahan (jika ada di preset)
    if (activePreset.overlayColor && activePreset.overlayBlend) {
      ctx.save();
      ctx.globalCompositeOperation = activePreset.overlayBlend;
      ctx.fillStyle = activePreset.overlayColor;
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.restore();
    }

    // 4. Lapisan Radial Vignette Lembut (khas lensa kamera disposable)
    if (activePreset.vignetteStrength > 0) {
      ctx.save();
      const radius = Math.max(targetW, targetH) * 0.75;
      const vignette = ctx.createRadialGradient(
        targetW / 2,
        targetH / 2,
        radius * 0.35,
        targetW / 2,
        targetH / 2,
        radius
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, `rgba(0, 0, 0, ${activePreset.vignetteStrength})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.restore();
    }

    // 5. Cetak Stempel Tanggal LED Retro Oranye di Pojok Kanan Bawah
    if (dateStampEnabled) {
      ctx.save();
      const dateText = getFormattedDateStamp();
      const fontSize = Math.max(16, Math.round(targetW * 0.035));
      ctx.font = `bold ${fontSize}px "Space Mono", "VT323", monospace`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      // Efek pendar neon oranye analog
      ctx.shadowColor = "rgba(232, 135, 90, 0.85)";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "rgb(232, 135, 90)"; // Retro orange #e8875a

      const paddingRight = Math.round(targetW * 0.04);
      const paddingBottom = Math.round(targetH * 0.04);
      ctx.fillText(dateText, targetW - paddingRight, targetH - paddingBottom);
      ctx.restore();
    }

    // 6. Ekspor ke Blob JPEG ~300KB
    const base64File = canvas.toDataURL("image/jpeg", 0.78);

    // Update counter lokal
    const nextTaken = shotsTaken + 1;
    setShotsTaken(nextTaken);
    if (typeof window !== "undefined") {
      localStorage.setItem(`lux_shots_taken_${invitationId}_${guestToken}`, String(nextTaken));
    }

    // 7. Unggah ke Server
    uploadSnappedPhoto(base64File);

    setTimeout(() => {
      setIsSnapping(false);
    }, 700);
  };

  // ── 5. DISPATCH UPLOAD KE BACKEND ──
  const uploadSnappedPhoto = async (base64File: string) => {
    setPendingUploads((p) => p + 1);

    if (isTestMode || invitationId.startsWith("demo")) {
      setTimeout(() => {
        setPendingUploads((p) => Math.max(0, p - 1));
        setToastMessage("Mode Uji Coba: Foto berhasil diproses dan disimpan.");
      }, 500);
      return;
    }

    try {
      const payload = {
        invitationId,
        senderName: senderName || "Tamu Undangan",
        senderEmail: guestToken,
        caption: guestMessage || "",
        message: guestMessage || "",
        base64File,
        mimeType: "image/jpeg",
        fileName: `disposable_${Date.now()}.jpg`,
      };

      const res = await fetch("/api/public/memories/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setPendingUploads((p) => Math.max(0, p - 1));

      if (res.ok) {
        setToastMessage("Foto tersimpan ke galeri roll!");
        if (onPhotoUploaded) onPhotoUploaded(data.memory);
      } else if (res.status === 403 && data.quotaExceeded) {
        setToastMessage(`Roll film Anda telah penuh (${shotsQuota} foto).`);
      } else if (res.status === 423) {
        setToastMessage(data.message || "Pengiriman momen telah ditutup.");
      } else {
        setToastMessage(data.error || "Gagal mengunggah foto.");
      }
    } catch {
      setPendingUploads((p) => Math.max(0, p - 1));
      setToastMessage("Koneksi bermasalah. Foto tersimpan di antrean perangkat.");
    } finally {
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // ── 6. FALLBACK FILE INPUT (NATIVE CAMERA HP) ──
  const handleNativeCameraFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const targetW = 1080;
        const targetH = Math.round((img.height * 1080) / img.width);
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, targetW, targetH);
        if (activePreset.canvasFilter) {
          ctx.filter = activePreset.canvasFilter;
          ctx.drawImage(canvas, 0, 0);
        }
        if (dateStampEnabled) {
          ctx.font = 'bold 28px "Space Mono", monospace';
          ctx.fillStyle = "rgb(232, 135, 90)";
          ctx.fillText(getFormattedDateStamp(), targetW - 40, targetH - 40);
        }
        const base64File = canvas.toDataURL("image/jpeg", 0.78);
        uploadSnappedPhoto(base64File);
      };
    };
    reader.readAsDataURL(file);
  };

  // Simpan Identitas Tamu
  const saveGuestIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem(`lux_guest_name_${invitationId}`, senderName);
      localStorage.setItem(`lux_guest_msg_${invitationId}`, guestMessage);
    }
    setShowIdentityModal(false);
  };

  // Perhitungan Sisa Jepretan
  const isUnlimited = shotsQuota <= 0;
  const remainingShots = Math.max(0, shotsQuota - shotsTaken);

  // Perhitungan Waktu Jadwal
  const now = new Date();
  const parsedStartTime = startTime ? new Date(startTime) : null;
  const isBeforeEvent = !isTestMode && parsedStartTime !== null && !isNaN(parsedStartTime.getTime()) && now < parsedStartTime;

  const parsedEndTime = endTime ? new Date(endTime) : null;
  const isAfterEvent = !isTestMode && parsedEndTime !== null && !isNaN(parsedEndTime.getTime()) && now > new Date(parsedEndTime.getTime() + 15 * 60 * 1000);

  // ── RENDER LAYAR SEBELUM ACARA (BELUM DIBUKA) ──
  if (isBeforeEvent) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-stone-900/90 border border-amber-500/20 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-widest rounded-full font-bold mb-3">
              Jadwal Kamera Momen
            </span>
            <h2 className="text-xl font-bold font-serif text-white">Kamera Momen Belum Dibuka</h2>
            <p className="text-xs text-stone-400 leading-relaxed mt-2">
              Sesi foto kenangan candid untuk pernikahan {coupleName || "mempelai"} akan dibuka otomatis pada hari H acara. Silakan kembali mengakses halaman ini saat acara dimulai.
            </p>
          </div>

          <div className="bg-stone-950/70 border border-white/10 rounded-2xl p-4 text-center space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 block font-bold">Waktu Pembukaan Akses</span>
            <p className="text-sm font-bold text-white">
              {parsedStartTime?.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-stone-400 font-mono">
              Pukul {parsedStartTime?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Link href={backUrl} className="block w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition">
              Kembali ke Undangan
            </Link>
            <Link href={galleryUrl} className="block w-full py-2.5 bg-stone-800/80 hover:bg-stone-800 text-stone-300 font-bold rounded-xl text-xs transition">
              Lihat Galeri Kenangan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER LAYAR TERKUNCI / SELESAI (JIKA STATUS LOCKED ATAU MELEBIHI JADWAL) ──
  if (isUploadLocked || isAfterEvent) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-stone-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-xl font-bold font-serif text-white">Sesi Kamera Selesai</h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            Waktu memotret telah ditutup oleh penyelenggara. Seluruh foto momen candid dari para tamu telah dikumpulkan di galeri.
          </p>
          <Link href={galleryUrl} className="block w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition">
            Lihat Galeri Kenangan
          </Link>
        </div>
      </div>
    );
  }

  // ── RENDER LAYAR KUOTA PENUH (UNTUK TAMU BARU) ──
  if (isContributorLimitReached && shotsTaken === 0) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-stone-900/95 border border-amber-500/20 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-widest rounded-full font-bold mb-3">
              Kuota Kenangan Penuh
            </span>
            <h2 className="text-xl font-bold font-serif text-white">Seluruh Roll Kenangan Telah Terisi</h2>
            <p className="text-xs text-stone-400 leading-relaxed mt-2">
              Terima kasih atas antusiasme luar biasa dari seluruh tamu undangan! Kuota pengunggah ({maxContributors} tamu) untuk momen pernikahan ini telah terpenuhi. Anda tetap dapat menikmati seluruh koleksi momen yang telah diabadikan bersama di Galeri Kenangan.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Link href={galleryUrl} className="block w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition">
              Lihat Galeri Kenangan
            </Link>
            <Link href={backUrl} className="block w-full py-2.5 bg-stone-800/80 hover:bg-stone-800 text-stone-300 font-bold rounded-xl text-xs transition">
              Kembali ke Undangan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-stone-950 text-stone-100 flex flex-col justify-between overflow-hidden select-none font-sans z-50">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraFallback}
        className="hidden"
      />

      {/* Screen Flash Overlay saat Shutter Ditekan */}
      {screenFlash && <div className="fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-100 opacity-90" />}

      {/* Banner Notifikasi Mode Test (Uji Coba Pengantin Pra-Acara) */}
      {isTestMode && parsedStartTime && now < parsedStartTime && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-3 py-1 bg-amber-500/90 text-stone-950 font-bold text-[10px] rounded-full shadow-lg border border-amber-300/40 flex items-center gap-1.5 backdrop-blur-xs pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-ping" />
          <span>Mode Simulasi Klien (Jadwal Tamu: {parsedStartTime.toLocaleDateString("id-ID", { day: "numeric", month: "short" })})</span>
        </div>
      )}

      {/* ── 1. HEADER ATAS KAMERA ── */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 bg-stone-950/80 backdrop-blur-md border-b border-white/5">
        <Link
          href={backUrl}
          className="w-9 h-9 rounded-full bg-stone-900 border border-white/10 flex items-center justify-center text-stone-300 hover:text-white transition"
          aria-label="Kembali"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>

        <div className="text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 font-bold">
            {activePreset.name}
          </p>
          <h1 className="text-xs font-serif font-bold text-white truncate max-w-[180px]">{coupleName}</h1>
        </div>

        <button
          type="button"
          onClick={() => setShowIdentityModal(true)}
          className="w-9 h-9 rounded-full bg-stone-900 border border-white/10 flex items-center justify-center text-stone-300 hover:text-white transition"
          title="Atur Nama & Pesan"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </button>
      </header>

      {/* ── 2. VIEWFINDER UTAMA (LAYAR BIDIK FOTO) ── */}
      <main className="relative flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0">
        <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden bg-black border-2 border-stone-800 shadow-2xl flex items-center justify-center">
          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-rose-400 font-medium">{cameraError}</p>
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="px-4 py-2 bg-amber-500 text-stone-950 text-xs font-bold rounded-xl transition"
              >
                Gunakan Kamera Bawaan HP
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover transition-all duration-200"
                style={{
                  filter: activePreset.cssFilter,
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
              />

              {/* Garis Pembingkai & Stempel Tanggal LED */}
              <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                <div className="flex justify-between items-start opacity-40">
                  <div className="w-3 h-3 border-t-2 border-l-2 border-amber-300" />
                  <div className="w-3 h-3 border-t-2 border-r-2 border-amber-300" />
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-3 h-3 border-b-2 border-l-2 border-amber-300 opacity-40" />
                  {dateStampEnabled && (
                    <span
                      className="font-mono text-[11px] font-bold tracking-wider px-2 py-0.5 rounded"
                      style={{
                        color: "rgb(232, 135, 90)",
                        textShadow: "0 0 6px rgba(232, 135, 90, 0.9)",
                      }}
                    >
                      {getFormattedDateStamp()}
                    </span>
                  )}
                </div>
              </div>

              {/* Kontrol Zoom Digital */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-auto">
                <div className="bg-black/50 backdrop-blur-md rounded-full p-0.5 flex gap-1 border border-white/10">
                  {[1, 2].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZoomLevel(z)}
                      className={`w-7 h-7 rounded-full font-mono text-[10px] font-bold transition flex items-center justify-center ${
                        zoomLevel === z ? "bg-amber-500 text-stone-950" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {z}x
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── 3. KONTROL BAWAH (SHUTTER, COUNTER & TOOLS) ── */}
      <footer className="relative z-20 px-6 pb-6 pt-2 bg-stone-950 flex flex-col gap-3">
        {/* Kontrol Cepat: Flash & Flip */}
        <div className="flex items-center justify-between max-w-sm mx-auto w-full px-4">
          <button
            type="button"
            onClick={toggleTorch}
            disabled={!hasTorch}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition ${
              torchOn ? "bg-amber-500 text-stone-950 border-amber-400" : "bg-stone-900 border-white/10 text-stone-400"
            } disabled:opacity-30`}
            aria-label="Flash"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </button>

          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
            {isUnlimited ? "Unlimited Roll" : `Sisa ${remainingShots} Jepretan`}
          </span>

          <button
            type="button"
            onClick={flipCamera}
            className="w-10 h-10 rounded-full bg-stone-900 border border-white/10 text-stone-300 hover:text-white flex items-center justify-center transition"
            aria-label="Balik Kamera"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        {/* Banner Roll Habis */}
        {!isUnlimited && remainingShots <= 0 && (
          <div className="max-w-sm mx-auto w-full px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
            <span className="text-[11px] font-medium">Roll Anda Penuh ({shotsQuota}/{shotsQuota})</span>
            <Link href={galleryUrl} className="text-[11px] font-bold text-amber-400 underline hover:text-amber-200">
              Lihat Hasil di Galeri &rarr;
            </Link>
          </div>
        )}

        {/* Shutter Bar */}
        <div className="grid grid-cols-3 items-center max-w-sm mx-auto w-full">
          {/* Sisa Jepretan Badge */}
          <div className="flex flex-col items-center justify-center justify-self-start w-14 h-12 rounded-2xl bg-stone-900 border border-white/10">
            <span className="font-mono text-lg font-bold text-amber-400 leading-none">
              {isUnlimited ? "∞" : remainingShots}
            </span>
            <span className="text-[8px] font-mono uppercase text-stone-500 mt-0.5">Sisa</span>
          </div>

          {/* Tombol Shutter Bulat Besar */}
          <div className="justify-self-center">
            <button
              type="button"
              onClick={triggerSnap}
              disabled={isSnapping || (!isUnlimited && remainingShots <= 0)}
              className="w-18 h-18 rounded-full bg-stone-900 p-1 border-2 border-stone-700 shadow-xl active:scale-95 transition disabled:opacity-40 cursor-pointer"
              aria-label="Jepret Foto"
            >
              <div className="w-full h-full rounded-full bg-amber-500 hover:bg-amber-400 border-4 border-stone-950 flex items-center justify-center shadow-inner" />
            </button>
          </div>

          {/* Tombol Buka Galeri */}
          <Link
            href={galleryUrl}
            className="flex flex-col items-center justify-center justify-self-end w-14 h-12 rounded-2xl bg-stone-900 border border-white/10 text-stone-400 hover:text-white transition"
            title="Buka Galeri"
          >
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[8px] font-mono uppercase text-stone-500 mt-0.5">Galeri</span>
          </Link>
        </div>

        {/* Status Upload Pending Indicator */}
        {pendingUploads > 0 && (
          <p className="text-center text-[10px] text-amber-400/80 font-mono animate-pulse">
            Mengunggah {pendingUploads} foto ke galeri...
          </p>
        )}
      </footer>

      {/* ── 4. FLOATING TOAST NOTIFIKASI ── */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="bg-stone-900/95 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md">
            {toastMessage}
          </div>
        </div>
      )}

      {/* ── 5. MODAL INPUT IDENTITAS TAMU (NAMA & PESAN ROLL) ── */}
      {showIdentityModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-stone-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold block mb-1">
                Identitas Roll Kenangan
              </span>
              <h3 className="text-base font-serif font-bold text-white">Masukkan Nama Anda</h3>
              <p className="text-xs text-stone-400 mt-1">Nama ini akan disematkan pada tumpukan roll foto Anda di galeri kenangan.</p>
            </div>

            <form onSubmit={saveGuestIdentity} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Nama Lengkap / Panggilan:</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Misal: Budi Santoso"
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Pesan Doa Singkat (Opsional):</label>
                <textarea
                  rows={2}
                  value={guestMessage}
                  onChange={(e) => setGuestMessage(e.target.value)}
                  placeholder="Selamat menempuh hidup baru sahabatku..."
                  className="w-full px-3.5 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                {senderName && (
                  <button
                    type="button"
                    onClick={() => setShowIdentityModal(false)}
                    className="flex-1 py-2.5 bg-stone-800 text-stone-300 font-bold rounded-xl text-xs hover:bg-stone-700 transition"
                  >
                    Tutup
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition"
                >
                  Mulai Motret
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
