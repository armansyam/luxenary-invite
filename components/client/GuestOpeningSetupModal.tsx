"use client";

import React, { useState, useRef } from "react";
import QRCode from "react-qr-code";

export interface GuestOpeningSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: any;
  shareMomentUrl: string;
  onInvitationUpdated?: (updatedInv: any) => void;
}

export type OpeningLayoutStyle = "editorial_showcase" | "cinematic_hero" | "polaroid_nostalgia";

const OPENING_LAYOUTS: { id: OpeningLayoutStyle; name: string; tag: string; desc: string }[] = [
  {
    id: "editorial_showcase",
    name: "Editorial Showcase",
    tag: "Default",
    desc: "Layar bersih dengan foto potret lengkung 4:5, tipografi serif anggun, dan tombol kapsul gelap.",
  },
  {
    id: "cinematic_hero",
    name: "Cinematic Hero",
    tag: "Mewah",
    desc: "Foto pasangan fullscreen dengan gradient dramatis sinematik dan floating glassmorphism card.",
  },
  {
    id: "polaroid_nostalgia",
    name: "Polaroid Nostalgia",
    tag: "Analog",
    desc: "Frame kartu foto polaroid instan vintage miring dengan stempel tanggal oranye retro analog.",
  },
];

export default function GuestOpeningSetupModal({
  isOpen,
  onClose,
  invitation,
  shareMomentUrl,
  onInvitationUpdated,
}: GuestOpeningSetupModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Feature Settings
  const initialFs = (() => {
    try {
      return typeof invitation?.featureSettings === "object"
        ? invitation.featureSettings
        : JSON.parse(invitation?.featureSettings || "{}");
    } catch {
      return {};
    }
  })();

  const [selectedOpeningLayout, setSelectedOpeningLayout] = useState<OpeningLayoutStyle>(
    initialFs?.memoriesOpeningLayout || "editorial_showcase"
  );
  const [instructionText, setInstructionText] = useState(
    initialFs?.memoriesCardInstruction || "Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda."
  );
  const [coverPhoto, setCoverPhoto] = useState<string>(
    initialFs?.memoriesCoverPhoto || invitation?.media?.find((m: any) => m.mediaSlot === "LANDING_COVER")?.localPath || ""
  );

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const coupleTitle = `${invitation?.groomNickname || "Mempelai Pria"} & ${invitation?.brideNickname || "Mempelai Wanita"}`;

  // Format Tanggal Acara
  const eventDateFormatted = (() => {
    try {
      if (invitation?.eventData) {
        const parsed = typeof invitation.eventData === "string" ? JSON.parse(invitation.eventData) : invitation.eventData;
        const list = Array.isArray(parsed) ? parsed : parsed?.events;
        if (Array.isArray(list) && list[0]?.date) {
          const d = new Date(list[0].date);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).toUpperCase();
          }
        }
      }
    } catch {}
    return "HARI BAHAGIA KAMI";
  })();

  // Format Retro Date Stamp: "02  09  '26"
  const getRetroDateStamp = () => {
    try {
      if (invitation?.eventData) {
        const parsed = typeof invitation.eventData === "string" ? JSON.parse(invitation.eventData) : invitation.eventData;
        const list = Array.isArray(parsed) ? parsed : parsed?.events;
        if (Array.isArray(list) && list[0]?.date) {
          const d = new Date(list[0].date);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, "0");
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const yearShort = String(d.getFullYear()).slice(-2);
            return `${day}  ${month}  '${yearShort}`;
          }
        }
      }
    } catch {}
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}  ${String(now.getMonth() + 1).padStart(2, "0")}  '${String(now.getFullYear()).slice(-2)}`;
  };

  const defaultCoverFallback = "/demo/candani/gallery_01.webp";
  const activeCover = coverPhoto || defaultCoverFallback;

  // Simpan Perubahan Pengaturan ke Database
  const persistFeatureSettings = async (overrides: Record<string, any>) => {
    if (!invitation?.id) return;
    setIsSavingSettings(true);
    try {
      const nextFs = {
        ...initialFs,
        memoriesOpeningLayout: selectedOpeningLayout,
        memoriesCardInstruction: instructionText,
        memoriesCoverPhoto: coverPhoto,
        ...overrides,
      };

      const res = await fetch(`/api/client/invitations/${invitation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureSettings: nextFs }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.invitation || data;
        if (onInvitationUpdated && updated) {
          onInvitationUpdated(updated);
        }
      }
    } catch (err) {
      console.error("Gagal menyimpan feature settings:", err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Upload Foto Khusus Opening
  const handleUploadCoverPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !invitation?.id) return;

    setIsUploadingPhoto(true);
    setStatusNotice(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("invitationId", invitation.id);
      formData.append("slot", "MEMORIES_COVER");

      const uploadRes = await fetch("/api/client/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Gagal mengunggah foto cover." }));
        throw new Error(err.error || "Gagal mengunggah foto cover.");
      }

      const uploadData = await uploadRes.json();
      const newPhotoUrl = uploadData.url || uploadData.localPath;

      if (!newPhotoUrl) {
        throw new Error("Tautan foto tidak ditemukan pada respons server.");
      }

      setCoverPhoto(newPhotoUrl);
      await persistFeatureSettings({ memoriesCoverPhoto: newPhotoUrl });
      setStatusNotice("Foto pembuka berhasil diperbarui!");
    } catch (err: any) {
      alert(err.message || "Gagal mengunggah foto.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Pilih Model Layar Opening
  const handleSelectOpeningLayout = (layoutId: OpeningLayoutStyle) => {
    setSelectedOpeningLayout(layoutId);
    persistFeatureSettings({ memoriesOpeningLayout: layoutId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border border-stone-200 flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <header className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
                  Pengaturan Layar Pembuka Tamu (/sharemoment)
                </h2>
                {isSavingSettings && (
                  <span className="text-[10px] text-amber-700 font-mono animate-pulse">Menyimpan...</span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Pratinjau langsung di smartphone dan sesuaikan gaya visual penyambut tamu sebelum kamera dibuka.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Status Notice */}
        {statusNotice && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5 text-xs text-emerald-800 font-medium flex items-center justify-between">
            <span>✓ {statusNotice}</span>
            <button type="button" onClick={() => setStatusNotice(null)} className="text-emerald-600 hover:text-emerald-900 text-xs cursor-pointer">✕</button>
          </div>
        )}

        {/* Modal Body: Two Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SISI KIRI: MOCKUP SMARTPHONE HP TAMU (Tanpa Card Wrapper) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center py-2 select-none">
            {/* 1. MOCKUP SMARTPHONE IPHONE 16 PRO */}
            <div
              className="w-[260px] h-[516px] bg-[#0d0c0b] rounded-[42px] p-2.5 relative flex flex-col justify-between shadow-[0_30px_70px_-15px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.08),0_0_0_5px_#1c1917,0_0_0_6.5px_rgba(201,162,39,0.35)] shrink-0"
            >
              {/* Dynamic Island & Real Status Bar */}
              <div className={`absolute top-2.5 inset-x-5 flex items-center justify-between z-30 pointer-events-none text-[10px] font-semibold ${selectedOpeningLayout === "cinematic_hero" ? "text-white" : "text-stone-800"}`}>
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
                  <div className={`w-4 h-2 border ${selectedOpeningLayout === "cinematic_hero" ? "border-white" : "border-stone-800"} rounded-xs p-0.5 flex items-center`}>
                    <div className={`w-full h-full ${selectedOpeningLayout === "cinematic_hero" ? "bg-white" : "bg-stone-800"} rounded-2xs`} />
                  </div>
                </div>
              </div>

              {/* Specular Glare Sheen Reflection */}
              <div className="pointer-events-none absolute inset-0 rounded-[38px] z-25 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12]" />

              {/* Layar Smartphone (Warm Light Canvas #faf8f5) */}
              <div className="rounded-[34px] overflow-hidden w-full h-full relative text-left text-xs z-10 shadow-inner bg-[#faf8f5]">
                {/* ──────────────── LAYOUT 1: EDITORIAL SHOWCASE (Sesuai Referensi) ──────────────── */}
                {selectedOpeningLayout === "editorial_showcase" && (
                  <div className="absolute inset-0 bg-[#faf8f5] flex flex-col justify-between pt-9 pb-3 px-3.5">
                    {/* Foto Mempelai / Acara (Rounded Corners 4:5 Sesuai Referensi) */}
                    <div className="w-full aspect-[4/5] rounded-[22px] overflow-hidden shadow-sm border border-stone-200/60 relative shrink-0">
                      <img src={activeCover} alt={coupleTitle} className="w-full h-full object-cover object-center" />
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
                        <span>→</span>
                      </div>
                      <div className="text-center font-serif font-bold text-[10px] tracking-widest text-stone-400">
                        LUXENARY
                      </div>
                      <div className="w-20 h-1 bg-stone-300 rounded-full mx-auto mt-1" />
                    </div>
                  </div>
                )}

                {/* ──────────────── LAYOUT 2: CINEMATIC HERO (100% Fullscreen, Tanpa Garis Putih) ──────────────── */}
                {selectedOpeningLayout === "cinematic_hero" && (
                  <div className="absolute inset-0 flex flex-col justify-between pt-9 pb-3 px-3.5 text-white overflow-hidden">
                    {/* Background Fullscreen Image with Overlay */}
                    <div className="absolute inset-0 z-0">
                      <img
                        src={activeCover}
                        alt={coupleTitle}
                        className="w-full h-full object-cover filter brightness-[0.70]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-stone-950/70" />
                    </div>

                    {/* Center Floating Card */}
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

                    {/* Action Button */}
                    <div className="relative z-10 space-y-1.5 pb-1">
                      <div className="w-full py-2 bg-white text-stone-950 font-bold text-[10.5px] rounded-full text-center shadow-xl flex items-center justify-center gap-1">
                        <span>Mulai Abadikan Momen</span>
                        <span>→</span>
                      </div>
                      <p className="text-[7.5px] text-stone-300 text-center leading-tight line-clamp-1">
                        {instructionText}
                      </p>
                      <div className="w-20 h-1 bg-white/40 rounded-full mx-auto mt-1" />
                    </div>
                  </div>
                )}

                {/* ──────────────── LAYOUT 3: POLAROID NOSTALGIA ──────────────── */}
                {selectedOpeningLayout === "polaroid_nostalgia" && (
                  <div className="absolute inset-0 bg-[#ede8df] flex flex-col justify-between pt-9 pb-3 px-3.5 text-stone-900">
                    {/* Polaroid Frame Card */}
                    <div className="my-auto bg-white p-2 pb-2.5 rounded-xl shadow-xl border border-stone-300/80 -rotate-1 text-center space-y-1">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-stone-100 shadow-inner">
                        <img
                          src={activeCover}
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

                    {/* Action Button */}
                    <div className="space-y-1 pb-1">
                      <div className="w-full py-2 bg-stone-900 text-white font-bold text-[10px] rounded-full text-center shadow-md flex items-center justify-center gap-1">
                        <span>Buka Kamera Retro</span>
                        <span>→</span>
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

          </div>

          {/* SISI KANAN: SATU HALAMAN KONTROL LENGKAP (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Pilih Gaya Layar Pembuka */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800 block">
                1. Pilih Gaya Visual Layar Pembuka:
              </label>
              <div className="space-y-2">
                {OPENING_LAYOUTS.map((op) => {
                  const isSelected = selectedOpeningLayout === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => handleSelectOpeningLayout(op.id)}
                      className={`w-full p-3 rounded-xl border text-left transition flex items-start justify-between cursor-pointer ${
                        isSelected
                          ? "border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs"
                          : "border-stone-200 hover:border-stone-300 bg-white"
                      }`}
                    >
                      <div className="pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">{op.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
                            {op.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                          {op.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="text-amber-700 font-bold text-xs shrink-0 mt-0.5">✓ Terpilih</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Foto Khusus Layar Opening (Langsung di bawah gaya layar) */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-800 block">
                    2. Foto Khusus Layar Pembuka:
                  </span>
                  <span className="text-[10px] text-stone-500">
                    Foto potret vertikal mempelai yang tampil di layar HP tamu
                  </span>
                </div>
                {isUploadingPhoto && (
                  <span className="text-[10px] text-amber-700 font-mono animate-pulse">Mengunggah...</span>
                )}
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-16 h-20 rounded-xl overflow-hidden border border-stone-300 bg-stone-200 shrink-0 shadow-inner relative">
                  <img
                    src={activeCover}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCoverPhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{isUploadingPhoto ? "Mengunggah..." : "Unggah Foto Baru"}</span>
                  </button>
                  <p className="text-[10px] text-stone-400">
                    Format JPG, PNG, WEBP (Maksimal 5MB). Foto langsung tampak di Mockup HP.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Teks Petunjuk Tamu */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                3. Kalimat Petunjuk untuk Tamu:
              </label>
              <input
                type="text"
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                onBlur={() => persistFeatureSettings({ memoriesCardInstruction: instructionText })}
                placeholder="Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda."
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 bg-white"
              />
              <p className="text-[10px] text-stone-400">
                Teks ini ditampilkan tepat di bawah tombol buka kamera pada layar HP tamu.
              </p>
            </div>

            {/* 4. Tombol Aksi Simulasi */}
            <div className="pt-2 border-t border-stone-100">
              <a
                href={`${shareMomentUrl}?test=true`}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold text-center rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>Pratinjau Layar Opening Tamu (Mode Simulasi HP)</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
