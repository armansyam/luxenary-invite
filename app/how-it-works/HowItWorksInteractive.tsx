"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// 10 Komponen Kesiapan Publikasi Faktual (Sinkron dengan app/(client)/dashboard/settings/page.tsx)
const FACTUAL_AUDIT_RULES = [
  { id: "subdomain", title: "Alamat Tautan Subdomain", desc: "Tautan website unik untuk akses publik" },
  { id: "theme", title: "Desain Tema Undangan", desc: "Template visual & tata letak presentasi" },
  { id: "coverVisuals", title: "Visual Sampul & Latar Belakang", desc: "Sampul pop-up, sidebar desktop, fixed background, dan foto penutup (Seksi 2)" },
  { id: "couples", title: "Profil Lengkap Kedua Mempelai", desc: "Nama mempelai pria & wanita" },
  { id: "couplePhotos", title: "Foto Profil Kedua Mempelai", desc: "Foto portrait mempelai pria & wanita (Seksi 3)" },
  { id: "eventDate", title: "Tanggal Acara Utama", desc: "Referensi masa berlaku website & hitung mundur" },
  { id: "location", title: "Waktu & Lokasi Acara", desc: "Alamat venue dan navigasi peta" },
  { id: "pin", title: "PIN Keamanan Meja Tamu", desc: "Sandi petugas resepsionis & check-in QR" },
  { id: "guests", title: "Buku Tamu VIP & Tiket QR", desc: "Daftar tamu dan kode QR check-in personal" },
  { id: "music", title: "Musik Latar Pengiring", desc: "Lagu romantis pengiring pembukaan" },
];

export function HowItWorksInteractive({ activeDomain }: { activeDomain: string }) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [typedTitle, setTypedTitle] = useState("Eka & Putri");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"synced" | "saving">("synced");
  const [selectedPalette, setSelectedPalette] = useState<"gold" | "emerald">("gold");
  const [cursorPos, setCursorPos] = useState({ x: 25, y: 70, clicking: false, visible: true });
  const [selectedTheme, setSelectedTheme] = useState<"dillalucky" | "candani" | "badrika">("dillalucky");
  const [tab1Cursor, setTab1Cursor] = useState({ x: 25, y: 35, clicking: false, visible: true, label: "Melihat Koleksi Seri" });
  const [auditStage, setAuditStage] = useState<"IDLE" | "SCANNING" | "READY_ALL" | "PUBLISHED">("IDLE");
  const [activeScanIndex, setActiveScanIndex] = useState<number>(0);
  const [tab4Cursor, setTab4Cursor] = useState({ x: 45, y: 40, clicking: false, visible: true, label: "Tinjau Kesiapan" });

  // -------------------------------------------------------------
  // Fake Cursor & Typing Simulation Loop (Only runs when activeTab === 0)
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 0) return;

    let isMounted = true;
    const timeouts: NodeJS.Timeout[] = [];

    const schedule = (fn: () => void, delay: number) => {
      const t = setTimeout(() => {
        if (isMounted) fn();
      }, delay);
      timeouts.push(t);
    };

    const runSimulation = () => {
      // Step 1: Initial state
      setCursorPos({ x: 28, y: 75, clicking: false, visible: true });
      setIsEditingTitle(false);
      setTypedTitle("Eka & Putri");
      setSaveStatus("synced");

      // Step 2: Cursor glides towards the couple's title
      schedule(() => {
        setCursorPos({ x: 50, y: 44, clicking: false, visible: true });
      }, 1200);

      // Step 3: Cursor clicks the title
      schedule(() => {
        setCursorPos({ x: 50, y: 44, clicking: true, visible: true });
        setIsEditingTitle(true);
      }, 2400);

      // Step 4: Click release & start typing
      schedule(() => {
        setCursorPos({ x: 50, y: 44, clicking: false, visible: true });
        setSaveStatus("saving");
      }, 2700);

      // Step 5: Typewriter effect adding " & Putri Permata"
      const additions = [" ", "P", "e", "r", "m", "a", "t", "a"];
      additions.forEach((char, i) => {
        schedule(() => {
          setTypedTitle((prev) => prev + char);
        }, 3000 + i * 140);
      });

      // Step 6: Status updates to Synced
      schedule(() => {
        setSaveStatus("synced");
        setIsEditingTitle(false);
      }, 4500);

      // Step 7: Cursor moves down to BUKA button
      schedule(() => {
        setCursorPos({ x: 50, y: 68, clicking: false, visible: true });
      }, 5500);

      // Step 8: Click BUKA button
      schedule(() => {
        setCursorPos({ x: 50, y: 68, clicking: true, visible: true });
      }, 6400);

      schedule(() => {
        setCursorPos({ x: 50, y: 68, clicking: false, visible: true });
      }, 6700);

      // Step 9: Fade cursor out and reset for loop
      schedule(() => {
        setCursorPos((prev) => ({ ...prev, visible: false }));
      }, 8200);

      // Step 10: Repeat loop
      schedule(() => {
        runSimulation();
      }, 9500);
    };

    runSimulation();

    return () => {
      isMounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, [activeTab]);

  // -------------------------------------------------------------
  // Autonomous Fake Cursor Showcase Loop (Runs when activeTab === 1)
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 1) return;

    let isMounted = true;
    const timeouts: NodeJS.Timeout[] = [];

    const schedule = (fn: () => void, delay: number) => {
      const t = setTimeout(() => {
        if (isMounted) fn();
      }, delay);
      timeouts.push(t);
    };

    const runTab1Sim = () => {
      // Step 1: Initial state (Dillalucky & Gold)
      setTab1Cursor({ x: 22, y: 38, clicking: false, visible: true, label: "Melihat Koleksi Desain" });
      setSelectedTheme("dillalucky");
      setSelectedPalette("gold");

      // Step 2: Glides to Candani card
      schedule(() => {
        setTab1Cursor({ x: 50, y: 42, clicking: false, visible: true, label: "Pilih Tema Candani..." });
      }, 1600);

      // Step 3: Clicks Candani
      schedule(() => {
        setTab1Cursor({ x: 50, y: 42, clicking: true, visible: true, label: "Tema Candani Terpilih ✓" });
        setSelectedTheme("candani");
      }, 2800);

      schedule(() => {
        setTab1Cursor((prev) => ({ ...prev, clicking: false }));
      }, 3100);

      // Step 4: Glides down to Emerald Green palette
      schedule(() => {
        setTab1Cursor({ x: 78, y: 88, clicking: false, visible: true, label: "Ganti Nuansa Emerald..." });
      }, 4500);

      // Step 5: Clicks Emerald Green palette
      schedule(() => {
        setTab1Cursor({ x: 78, y: 88, clicking: true, visible: true, label: "Nuansa Emerald Aktif ✓" });
        setSelectedPalette("emerald");
      }, 5700);

      schedule(() => {
        setTab1Cursor((prev) => ({ ...prev, clicking: false }));
      }, 6000);

      // Step 6: Fade out & reset
      schedule(() => {
        setTab1Cursor((prev) => ({ ...prev, visible: false }));
      }, 7600);

      // Step 7: Repeat loop
      schedule(() => {
        runTab1Sim();
      }, 8800);
    };

    runTab1Sim();

    return () => {
      isMounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, [activeTab]);

  // -------------------------------------------------------------
  // Autonomous Pre-Publish Audit & Launch Simulation Loop (Runs when activeTab === 4)
  // Sinkron dengan mesin pemindai dan sliding ticker di app/(client)/dashboard/settings/page.tsx
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 4) return;

    let isMounted = true;
    const timeouts: NodeJS.Timeout[] = [];

    const schedule = (fn: () => void, delay: number) => {
      const t = setTimeout(() => {
        if (isMounted) fn();
      }, delay);
      timeouts.push(t);
    };

    const runTab4Sim = () => {
      // Step 1: Initial state (IDLE / Draft)
      setAuditStage("IDLE");
      setActiveScanIndex(0);
      setTab4Cursor({ x: 45, y: 40, clicking: false, visible: true, label: "Tinjau Kesiapan Peluncuran" });

      // Step 2: Glides to "Mulai Pemeriksaan & Publikasikan" button
      schedule(() => {
        setTab4Cursor({ x: 80, y: 84, clicking: false, visible: true, label: "Mulai Pemeriksaan..." });
      }, 1400);

      // Step 3: Clicks button
      schedule(() => {
        setTab4Cursor({ x: 80, y: 84, clicking: true, visible: true, label: "Menjalankan Radar Pemindai..." });
        setAuditStage("SCANNING");
      }, 2500);

      schedule(() => {
        setTab4Cursor((prev) => ({ ...prev, clicking: false }));
      }, 2800);

      // Sequential scan sliding ticker: 10 items, 420ms per step
      for (let i = 1; i <= 10; i++) {
        schedule(() => {
          setActiveScanIndex(i);
          setTab4Cursor({
            x: 82,
            y: 35,
            clicking: false,
            visible: true,
            label: `Memverifikasi Bagian ${i}/10...`,
          });
        }, 2800 + i * 420);
      }

      // Step 4: Ready state after scan finishes (2800 + 4200 = 7000ms)
      schedule(() => {
        setAuditStage("READY_ALL");
        setTab4Cursor({ x: 80, y: 85, clicking: false, visible: true, label: "10/10 Lolos Uji Kelayakan ✓" });
      }, 7500);

      // Step 5: Clicks "Publikasikan Undangan Sekarang"
      schedule(() => {
        setTab4Cursor({ x: 80, y: 85, clicking: true, visible: true, label: "Menerbitkan Undangan..." });
        setAuditStage("PUBLISHED");
      }, 9000);

      schedule(() => {
        setTab4Cursor({ x: 50, y: 65, clicking: false, visible: true, label: "Resmi Mengudara! 🎉" });
      }, 9400);

      // Step 6: Fade cursor & reset loop
      schedule(() => {
        setTab4Cursor((prev) => ({ ...prev, visible: false }));
      }, 12500);

      schedule(() => {
        runTab4Sim();
      }, 14000);
    };

    runTab4Sim();

    return () => {
      isMounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, [activeTab]);

  return (
    <div className="w-full">
      {/* Container Full-Width Desktop Workspace (Tanpa Kartu Sempit & Tanpa Void Hitam) */}
      <div className="w-full rounded-2xl overflow-hidden border border-stone-800 bg-[#0d0c0b] text-stone-200 shadow-2xl">
        
        {/* macOS / Chrome Window Top Bar */}
        <div className="bg-[#141312] border-b border-stone-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#febc2e]/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#28c840]/80 inline-block"></span>
          </div>

          <div className="flex-1 max-w-xs sm:max-w-md mx-auto bg-stone-900/80 border border-stone-700/60 rounded-lg px-2.5 sm:px-3.5 py-1 text-center text-[11px] sm:text-xs text-stone-400 font-mono flex items-center justify-center gap-1.5 sm:gap-2">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="truncate">studio.{activeDomain}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/30 text-[11px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">SIMULATOR AKTIF</span>
            </span>
          </div>
        </div>

        {/* Factual Dasbor Klien Header */}
        <div className="bg-[#181715] border-b border-stone-800/80 px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-serif text-sm sm:text-base font-bold text-amber-200/90 tracking-wide">
              LK Dasbor Klien
            </span>
            <span className="text-xs text-stone-500 hidden md:inline">|</span>
            <span className="text-xs text-stone-400 hidden md:inline">
              {activeTab === 0 && "1. Edit Langsung di Kanvas"}
              {activeTab === 1 && "2. Pilihan Tema & Nuansa Warna"}
              {activeTab === 2 && "3. Buku Tamu VIP & WhatsApp"}
              {activeTab === 3 && "4. Konfirmasi Tamu & RSVP"}
              {activeTab === 4 && "5. Pengecekan Data & Peluncuran Resmi"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <span className="text-stone-300 font-medium hidden sm:inline">Nama Akun</span>
            <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700 hidden sm:inline text-[11px]">
              Paket: Traditional
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-600/20 text-amber-300 border border-amber-500/30 text-[11px] sm:text-xs font-semibold">
              Simpan
            </span>
          </div>
        </div>

        {/* Workspace Canvas Area (Min Height 520px) */}
        <div className="relative min-h-[480px] sm:min-h-[560px] bg-[#090807] overflow-hidden flex flex-col justify-between">
          
          {/* ============================================================ */}
          {/* TAB 0: LIVE VISUAL CANVAS (CLICK-TO-EDIT + FAKE CURSOR) */}
          {/* ============================================================ */}
          {activeTab === 0 && (
            <div className="relative w-full h-full flex-1 flex flex-col items-center justify-center p-3 sm:p-8">
              {/* Instruction Sub-bar Ramah */}
              <div className="w-full max-w-4xl bg-emerald-950/40 border border-emerald-500/20 rounded-xl px-3.5 py-2 mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span className="text-[11px] sm:text-xs">Sentuh atau klik teks di kanvas untuk mencoba ubah nama.</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px]">
                  <span className={`px-2 py-0.5 rounded transition ${saveStatus === "saving" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
                    {saveStatus === "saving" ? "✦ Menyimpan..." : "✓ Real-Time"}
                  </span>
                </div>
              </div>

              {/* Simulated Phone Canvas Viewport (Responsif Mobile) */}
              <div className="relative w-full max-w-[285px] sm:max-w-[340px] bg-[#141312] border-2 border-stone-700 rounded-[32px] sm:rounded-[36px] shadow-2xl p-5 sm:p-7 text-center overflow-hidden mx-auto">
                {/* Phone Notch Bar */}
                <div className="w-20 sm:w-24 h-3.5 sm:h-4 bg-stone-900 rounded-full mx-auto mb-5 sm:mb-6"></div>

                {/* Cover Date */}
                <div className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-3">
                  20 / 10 · 2026
                </div>

                {/* Eyebrow */}
                <div className="inline-block px-3 py-0.5 rounded-full border border-amber-500/40 text-[10px] uppercase tracking-widest text-amber-300 mb-4">
                  THE WEDDING OF
                </div>

                {/* Animated Couple Title Field */}
                <div 
                  className={`relative py-2 px-3 rounded-lg transition-all duration-300 ${
                    isEditingTitle 
                      ? "bg-amber-950/40 ring-2 ring-amber-400/80 border border-amber-400" 
                      : "hover:bg-stone-800/40 border border-transparent"
                  }`}
                >
                  <h3 className="text-2xl sm:text-3xl font-serif text-white tracking-wide">
                    {typedTitle}
                    {isEditingTitle && (
                      <span className="inline-block w-0.5 h-6 bg-amber-400 ml-1 animate-pulse align-middle"></span>
                    )}
                  </h3>
                  {isEditingTitle && (
                    <span className="absolute -top-3 right-2 bg-amber-500 text-stone-950 text-[9px] font-bold px-1.5 py-0.2 rounded shadow">
                      Klik-untuk-Ubah
                    </span>
                  )}
                </div>

                {/* Quote Box */}
                <div className="mt-5 p-3 rounded-xl bg-stone-900/80 border border-stone-800 text-[11px] text-stone-300 leading-relaxed">
                  <span className="text-[9px] uppercase tracking-wider text-amber-300/80 block mb-1">KEPADA YTH.</span>
                  <strong>Bpk. Ahmad Fauzan &amp; Istri</strong>
                  <p className="text-[10px] text-stone-400 mt-1">Dengan penuh rasa syukur kami mengundang Anda untuk hadir.</p>
                </div>

                {/* Buka Undangan Button */}
                <div className="mt-5">
                  <div className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition shadow ${
                    cursorPos.clicking && cursorPos.y > 60
                      ? "bg-amber-500 text-stone-950 scale-95"
                      : "bg-amber-600/30 text-amber-300 border border-amber-500/50 hover:bg-amber-500/40"
                  }`}>
                    BUKA UNDANGAN
                  </div>
                </div>

                <div className="mt-4 text-[10px] text-stone-500 tracking-wider">
                  QR CHECK-IN RESEPSI →
                </div>
              </div>

              {/* FAKE CURSOR (Animated SVG Pointer) */}
              <div
                className={`pointer-events-none absolute z-50 transition-all duration-700 ease-out ${
                  cursorPos.visible ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  left: `${cursorPos.x}%`,
                  top: `${cursorPos.y}%`,
                  transform: `translate(-50%, -50%) scale(${cursorPos.clicking ? 0.82 : 1})`,
                }}
              >
                <div className="relative">
                  {/* SVG Mouse Pointer */}
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
                  >
                    <path
                      d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                      fill="#ffffff"
                      stroke="#111111"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>

                  {/* Click Ripple Effect */}
                  {cursorPos.clicking && (
                    <span className="absolute -top-2 -left-2 w-8 h-8 rounded-full border-2 border-amber-400 animate-ping"></span>
                  )}

                  {/* Floating User Badge */}
                  <div className="absolute top-5 left-4 bg-amber-400 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                    {isEditingTitle ? "Mengetik Nama Mempelai..." : "Sentuh untuk Mengubah"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 1: PILIHAN SERI DESAIN & PALET WARNA (FAKTUAL DASHBOARD) */}
          {/* ============================================================ */}
          {activeTab === 1 && (
            <div className="w-full flex-1 flex flex-col md:flex-row h-full">
              {/* Mini Sidebar Seksi Form (Desktop Only) */}
              <div className="hidden md:flex md:w-64 bg-[#121110] border-r border-stone-800 p-4 shrink-0 flex-col gap-2">
                <div className="text-[11px] font-bold text-stone-400 tracking-wider mb-2 flex items-center justify-between">
                  <span>DAFTAR SEKSI FORM</span>
                  <span className="px-2 py-0.5 rounded bg-stone-800 text-amber-300 font-mono">1 / 13</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-center justify-between">
                    <span className="font-semibold">1. Tema &amp; Nuansa Warna</span>
                    <span className="text-[10px] text-amber-400">Aktif</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800/80 text-stone-400 flex items-center justify-between">
                    <span>2. Sampul &amp; Musik</span>
                    <span className="text-[10px] text-stone-500">Siap</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800/80 text-stone-400 flex items-center justify-between">
                    <span>3. Profil Kedua Mempelai</span>
                    <span className="text-[10px] text-stone-500">Siap</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800/80 text-stone-400 flex items-center justify-between">
                    <span>4. Rangkaian Acara Sakral</span>
                    <span className="text-[10px] text-stone-500">Siap</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800/80 text-stone-400 flex items-center justify-between">
                    <span>5. Galeri Prewedding &amp; Video</span>
                    <span className="text-[10px] text-stone-500">Siap</span>
                  </div>
                </div>
              </div>

              {/* Main Content: Theme Cards & Palette (Autonomous Showcase - Tanpa Gangguan Klik) */}
              <div className="relative flex-1 p-5 sm:p-8 flex flex-col justify-between overflow-hidden pointer-events-none select-none">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                      <h4 className="text-base sm:text-lg font-serif text-white font-bold">
                        1. Pilihan Seri Desain &amp; Palet Warna
                      </h4>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Pilih tema utama dan nuansa warna undangan pernikahan Anda.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-full bg-stone-800 text-stone-400 text-xs font-semibold">
                        Modern (6)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-amber-600/30 border border-amber-500/50 text-amber-300 text-xs font-semibold">
                        Traditional (6)
                      </span>
                    </div>
                  </div>

                  {/* 3 Theme Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {/* Theme 1: Dillalucky */}
                    <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 bg-stone-900 ${
                      selectedTheme === "dillalucky" 
                        ? "border-2 border-amber-400 shadow-xl scale-[1.02]" 
                        : "border border-stone-800 opacity-80"
                    }`}>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-stone-950/80 text-[10px] font-bold text-amber-300 border border-amber-400/40 z-10">
                        TRADITIONAL
                      </div>
                      {selectedTheme === "dillalucky" && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center z-10">
                          ✓
                        </div>
                      )}
                      <div className="h-36 sm:h-40 overflow-hidden bg-stone-800">
                        <img src="/assets/homepage/studio_theme_dillalucky.webp" alt="Dillalucky" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-serif font-bold text-sm text-white">Dillalucky</div>
                          <div className="text-[11px] text-stone-400">Adat Melayu &amp; Padang</div>
                        </div>
                        <span className={`text-xs font-bold ${selectedTheme === "dillalucky" ? "text-amber-400" : "text-stone-500"}`}>
                          {selectedTheme === "dillalucky" ? "Terpilih" : "Pilih"}
                        </span>
                      </div>
                    </div>

                    {/* Theme 2: Candani */}
                    <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 bg-stone-900 ${
                      selectedTheme === "candani" 
                        ? "border-2 border-amber-400 shadow-xl scale-[1.02]" 
                        : "border border-stone-800 opacity-80"
                    }`}>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-stone-950/80 text-[10px] font-bold text-stone-300 z-10">
                        TRADITIONAL
                      </div>
                      {selectedTheme === "candani" && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center z-10">
                          ✓
                        </div>
                      )}
                      <div className="h-36 sm:h-40 overflow-hidden bg-stone-800">
                        <img src="/assets/homepage/studio_theme_candani.webp" alt="Candani" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-serif font-bold text-sm text-white">Candani</div>
                          <div className="text-[11px] text-stone-400">Tradisi Nusantara Elegan</div>
                        </div>
                        <span className={`text-xs font-bold ${selectedTheme === "candani" ? "text-amber-400" : "text-stone-500"}`}>
                          {selectedTheme === "candani" ? "Terpilih" : "Pilih"}
                        </span>
                      </div>
                    </div>

                    {/* Theme 3: Badrika */}
                    <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 bg-stone-900 ${
                      selectedTheme === "badrika" 
                        ? "border-2 border-amber-400 shadow-xl scale-[1.02]" 
                        : "border border-stone-800 opacity-80"
                    }`}>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-stone-950/80 text-[10px] font-bold text-stone-300 z-10">
                        TRADITIONAL
                      </div>
                      {selectedTheme === "badrika" && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center z-10">
                          ✓
                        </div>
                      )}
                      <div className="h-36 sm:h-40 overflow-hidden bg-stone-800">
                        <img src="/assets/homepage/studio_theme_badrika.webp" alt="Badrika" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-serif font-bold text-sm text-white">Badrika</div>
                          <div className="text-[11px] text-stone-400">Klasik Jawa Ningrat</div>
                        </div>
                        <span className={`text-xs font-bold ${selectedTheme === "badrika" ? "text-amber-400" : "text-stone-500"}`}>
                          {selectedTheme === "badrika" ? "Terpilih" : "Pilih"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color Palette Row */}
                <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-stone-300 uppercase tracking-wider text-[11px]">
                    NUANSA WARNA UTAMA:
                  </span>
                  <div className="flex gap-2">
                    <div
                      className={`px-3 py-1.5 rounded-full flex items-center gap-2 border transition duration-300 ${
                        selectedPalette === "gold"
                          ? "bg-amber-950/60 border-amber-400 text-amber-300 ring-1 ring-amber-400/40"
                          : "border-stone-800 text-stone-400"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-[#d4af37]"></span>
                      <span>Royal Champagne Gold</span>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-full flex items-center gap-2 border transition duration-300 ${
                        selectedPalette === "emerald"
                          ? "bg-emerald-950/60 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/40"
                          : "border-stone-800 text-stone-400"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-[#059669]"></span>
                      <span>Emerald Green &amp; Gold</span>
                    </div>
                  </div>
                </div>

                {/* FAKE CURSOR TAB 1 */}
                <div
                  className={`pointer-events-none absolute z-50 transition-all duration-700 ease-out ${
                    tab1Cursor.visible ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    left: `${tab1Cursor.x}%`,
                    top: `${tab1Cursor.y}%`,
                    transform: `translate(-50%, -50%) scale(${tab1Cursor.clicking ? 0.82 : 1})`,
                  }}
                >
                  <div className="relative">
                    {/* SVG Mouse Pointer */}
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
                    >
                      <path
                        d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                        fill="#ffffff"
                        stroke="#111111"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>

                    {/* Click Ripple Effect */}
                    {tab1Cursor.clicking && (
                      <span className="absolute -top-2 -left-2 w-8 h-8 rounded-full border-2 border-amber-400 animate-ping"></span>
                    )}

                    {/* Floating User Badge */}
                    <div className="absolute top-5 left-4 bg-amber-400 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                      {tab1Cursor.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: MANAJEMEN BUKU TAMU & WHATSAPP */}
          {/* ============================================================ */}
          {activeTab === 2 && (
            <div className="w-full flex-1 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <h4 className="text-base sm:text-lg font-serif text-white font-bold">
                      Daftar Tamu Undangan &amp; Tautan Personal
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Nama tamu otomatis terpasang di cover undangan dan tiket VIP QR. Kirim satu per satu lewat WhatsApp.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3.5 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs font-semibold">
                      300 Tamu Terdaftar
                    </span>
                    <span className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-stone-950 text-xs font-bold shadow">
                      + Tambah Tamu Baru
                    </span>
                  </div>
                </div>

                {/* Table Mockup */}
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-900/40 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                        AF
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">Bpk. Ahmad Fauzan &amp; Istri</div>
                        <div className="text-xs text-stone-400">VIP · Meja 04 · Kuota 2 Tamu</div>
                      </div>
                    </div>
                    <button className="px-3.5 py-1.5 rounded-lg bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow self-start sm:self-auto">
                      <span>Kirim Undangan WA</span>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-800 text-stone-300 font-bold flex items-center justify-center text-xs shrink-0">
                        RP
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">dr. Rina Puspita</div>
                        <div className="text-xs text-stone-400">Sahabat · Kuota 1 Tamu</div>
                      </div>
                    </div>
                    <button className="px-3.5 py-1.5 rounded-lg bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow self-start sm:self-auto">
                      <span>Kirim Undangan WA</span>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-800 text-stone-300 font-bold flex items-center justify-center text-xs shrink-0">
                        HW
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">H. Hendra Wijaya &amp; Keluarga</div>
                        <div className="text-xs text-stone-400">Keluarga Besar · Meja 01 · Kuota 4 Tamu</div>
                      </div>
                    </div>
                    <button className="px-3.5 py-1.5 rounded-lg bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow self-start sm:self-auto">
                      <span>Kirim Undangan WA</span>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-stone-900/60 border border-stone-800/80 text-xs text-stone-400 flex items-center justify-between">
                <span>✦ Tautan personal menjamin nama tamu tidak tertukar dan langsung menyapa saat amplop dibuka.</span>
                <span className="text-amber-300 font-semibold cursor-pointer">Impor File Excel / CSV →</span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: RSVP & DOA RESTU REAL-TIME */}
          {/* ============================================================ */}
          {activeTab === 3 && (
            <div className="w-full flex-1 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <h4 className="text-base sm:text-lg font-serif text-white font-bold">
                      Ikhtisar Konfirmasi Kehadiran &amp; Doa Restu
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Pantau jumlah porsi katering dan sambutan hangat tamu secara seketika.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    ● Real-Time Feed
                  </span>
                </div>

                {/* 3 Metric Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center">
                    <div className="text-2xl font-bold text-white font-mono">248</div>
                    <div className="text-xs text-stone-400 mt-1">Konfirmasi Hadir</div>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center">
                    <div className="text-2xl font-bold text-amber-400 font-mono">18</div>
                    <div className="text-xs text-stone-400 mt-1">Berhalangan Hadir</div>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center">
                    <div className="text-2xl font-bold text-emerald-400 font-mono">142</div>
                    <div className="text-xs text-stone-400 mt-1">Untaian Doa Restu</div>
                  </div>
                </div>

                {/* Live Wishes Stream */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <strong className="text-white">Bpk. Ahmad Fauzan &amp; Istri</strong>
                      <span className="text-[10px] text-emerald-400 font-semibold">✓ Konfirmasi 2 Orang</span>
                    </div>
                    <p className="text-xs text-stone-300 italic">
                      &ldquo;Selamat menempuh hidup baru Eka &amp; Putri, semoga menjadi keluarga sakinah mawaddah warahmah.&rdquo;
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <strong className="text-white">dr. Rina Puspita</strong>
                      <span className="text-[10px] text-emerald-400 font-semibold">✓ Konfirmasi 1 Orang</span>
                    </div>
                    <p className="text-xs text-stone-300 italic">
                      &ldquo;Insya Allah hadir merayakan hari bahagia kalian berdua! Cantik dan gagah sekali.&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-stone-900/60 border border-stone-800/80 text-xs text-stone-400">
                ✦ Data kehadiran dapat diunduh dalam format spreadsheet untuk koordinasi dengan tim katering pernikahan.
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: HERO LAUNCHPAD: STATUS PUBLIKASI & AUDIT SEKUANSIAL */}
          {/* (FAKTUAL SESUAI DENGAN app/(client)/dashboard/settings/page.tsx) */}
          {/* ============================================================ */}
          {activeTab === 4 && (
            <div className="relative w-full flex-1 p-5 sm:p-8 flex flex-col justify-between overflow-hidden pointer-events-none select-none">
              <div>
                {/* Hero Launchpad Container Card with Dynamic Border and Glowing Aura */}
                <div
                  className={`rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    auditStage === "SCANNING"
                      ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-amber-500/40 shadow-[0_0_50px_-10px_rgba(245,158,11,0.25)]"
                      : auditStage === "READY_ALL"
                      ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-emerald-500/40 shadow-[0_0_50px_-10px_rgba(16,185,129,0.25)]"
                      : auditStage === "PUBLISHED"
                      ? "bg-gradient-to-br from-emerald-950/40 via-stone-950 to-stone-900 border border-emerald-500/50 shadow-[0_0_50px_-10px_rgba(16,185,129,0.35)]"
                      : "bg-stone-900/90 border border-stone-800 shadow-xl"
                  }`}
                >
                  {/* Aura Cahaya Reaktif Latar Belakang */}
                  <div
                    className={`absolute top-0 right-0 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ease-out ${
                      auditStage === "SCANNING"
                        ? "w-80 h-80 bg-amber-500/20 translate-x-8 -translate-y-8 animate-pulse"
                        : auditStage === "READY_ALL" || auditStage === "PUBLISHED"
                        ? "w-80 h-80 bg-emerald-500/20 translate-x-8 -translate-y-8 animate-pulse"
                        : "w-72 h-72 bg-amber-600/10"
                    }`}
                  />

                  {/* STAGE 1: IDLE */}
                  {auditStage === "IDLE" && (
                    <div className="relative z-10 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <span>Status: Draft (Penyusunan Konten)</span>
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          {FACTUAL_AUDIT_RULES.length} Komponen Kesiapan Siap Diperiksa
                        </span>
                      </div>

                      <div className="space-y-1">
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
                          <span>Pemeriksaan otomatis mencakup tautan, nama mempelai, tanggal acara, media, dan PIN keamanan.</span>
                        </div>

                        <div className="w-full sm:w-auto px-6 py-3 font-bold rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 shrink-0 bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950">
                          <svg className="w-4 h-4 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Mulai Pemeriksaan &amp; Publikasikan</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 2: SCANNING (FOKUS PENUH DENGAN SLIDING TICKER 3 BARIS SEPERTI ASLINYA) */}
                  {auditStage === "SCANNING" && (
                    <div className="relative z-10 space-y-4">
                      {/* Radar Scanner Visual & Progress Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
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
                              Memverifikasi Bagian {Math.min(activeScanIndex, 10)} dari 10 ({Math.round((Math.min(activeScanIndex, 10) / 10) * 100)}%)
                            </p>
                          </div>
                        </div>

                        <span className="text-xs text-stone-400 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 self-start sm:self-auto">
                          Pemindaian Aktif
                        </span>
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
                            transform: `translateY(-${Math.max(0, activeScanIndex - 1) * 52}px)`,
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

                          {/* Slot 1-10: Item Audit Sekuensial Faktual */}
                          {FACTUAL_AUDIT_RULES.map((rule, idx) => {
                            const isCurrent = activeScanIndex === idx + 1;
                            const isPast = activeScanIndex > idx + 1;

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
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
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
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                      Terverifikasi
                                    </span>
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
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 3: READY_ALL (Lolos Uji & Konfirmasi URL) */}
                  {auditStage === "READY_ALL" && (
                    <div className="relative z-10 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>10/10 Komponen Lolos Uji Kelayakan</span>
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400">100% Siap</span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-stone-100 font-serif">
                          Konfirmasi Instrumen URL Resmi Sebelum Rilis
                        </h3>
                        <p className="text-xs text-stone-400 leading-relaxed max-w-3xl">
                          Seluruh 10 komponen data telah lolos uji kelayakan. Harap tinjau dan konfirmasi instrumen URL resmi berikut sebelum tombol rilis resmi diaktifkan.
                        </p>
                      </div>

                      {/* Tinjauan Kartu URL Subdomain */}
                      <div className="p-3.5 rounded-xl bg-stone-950/80 border border-amber-500/40">
                        <div className="flex items-center justify-between gap-2.5 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              Subdomain Publik
                            </span>
                            <h4 className="text-xs font-bold text-stone-200">Tautan Akses Tamu Undangan</h4>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            SSL 256-Bit Terpasang
                          </span>
                        </div>
                        <div className="my-1.5 p-2 rounded-lg bg-stone-900/90 border border-stone-800/80 flex items-center justify-between">
                          <span className="font-mono text-xs text-emerald-400 break-all select-all font-semibold">
                            eka-putri.luxvite.id
                          </span>
                          <span className="text-[11px] text-stone-500">Tautan Utama</span>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-stone-800/80">
                        <div className="flex items-center gap-2 text-xs text-emerald-400">
                          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Seluruh data valid. Sistem siap melakukan penguncian &amp; penerbitan website.</span>
                        </div>

                        <div className="w-full sm:w-auto px-6 py-2.5 font-bold rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-400 text-stone-950">
                          <span>Publikasikan Undangan Sekarang</span>
                          <span className="text-sm">➔</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 4: PUBLISHED (SUKSES MENGUDARA) */}
                  {auditStage === "PUBLISHED" && (
                    <div className="relative z-10 p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-stone-950 to-stone-900 border border-emerald-500/40 shadow-xl space-y-3.5 text-center">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-xl shadow-inner">
                        🎉
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                          Undangan Pernikahan Resmi Mengudara!
                        </h3>
                        <p className="text-xs text-stone-400 max-w-xl mx-auto leading-relaxed">
                          Website undangan Anda telah aktif, berkecepatan tinggi, dan terenkripsi SSL 256-Bit. Tautan siap dibagikan kepada seluruh tamu kehormatan melalui WhatsApp.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-stone-900/90 border border-emerald-500/40 shadow-inner">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="font-mono text-xs sm:text-sm text-emerald-300 font-bold">
                          eka-putri.luxvite.id
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                          Live
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Security Note */}
              <div className="mt-2 p-3 rounded-xl bg-stone-900/60 border border-stone-800/80 text-xs text-stone-400">
                ✦ Sistem secara otomatis mengunci konfigurasi tema saat dipublikasikan demi menjaga integritas barcode tiket dan cetak fisik undangan Anda.
              </div>

              {/* FAKE CURSOR TAB 4 */}
              <div
                className={`pointer-events-none absolute z-50 transition-all duration-700 ease-out ${
                  tab4Cursor.visible ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  left: `${tab4Cursor.x}%`,
                  top: `${tab4Cursor.y}%`,
                  transform: `translate(-50%, -50%) scale(${tab4Cursor.clicking ? 0.82 : 1})`,
                }}
              >
                <div className="relative">
                  {/* SVG Mouse Pointer */}
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
                  >
                    <path
                      d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                      fill="#ffffff"
                      stroke="#111111"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>

                  {/* Click Ripple Effect */}
                  {tab4Cursor.clicking && (
                    <span className={`absolute -top-2 -left-2 w-8 h-8 rounded-full border-2 animate-ping ${
                      auditStage === "PUBLISHED" || auditStage === "READY_ALL" ? "border-emerald-400" : "border-amber-400"
                    }`}></span>
                  )}

                  {/* Floating User Badge */}
                  <div className={`absolute top-5 left-4 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap ${
                    auditStage === "PUBLISHED" ? "bg-emerald-400" : "bg-amber-400"
                  }`}>
                    {tab4Cursor.label}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* APPLE-STYLE FLOATING LIQUID GLASS DOCK (5 TABS CONTROLLER) */}
          {/* ============================================================ */}
          <div className="w-full flex justify-center pb-6 pt-2 z-20">
            <div 
              className="inline-flex items-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 shadow-2xl"
              role="tablist"
              aria-label="Navigasi Simulasi Studio"
            >
              {/* Tab 0: Editor Canvas */}
              <button
                onClick={() => setActiveTab(0)}
                className={`relative group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-200 ${
                  activeTab === 0
                    ? "bg-amber-500/25 text-amber-300 shadow-inner scale-105"
                    : "text-stone-400 hover:text-white hover:bg-white/10"
                }`}
                role="tab"
                aria-selected={activeTab === 0}
                title="1. Mode Visual Click-to-Edit"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {activeTab === 0 && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400"></span>}
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-stone-900 text-white text-[11px] font-semibold rounded-lg shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition hidden sm:block">
                  Live Canvas
                </span>
              </button>

              {/* Tab 1: Pilihan Tema & Palet */}
              <button
                onClick={() => setActiveTab(1)}
                className={`relative group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-200 ${
                  activeTab === 1
                    ? "bg-amber-500/25 text-amber-300 shadow-inner scale-105"
                    : "text-stone-400 hover:text-white hover:bg-white/10"
                }`}
                role="tab"
                aria-selected={activeTab === 1}
                title="2. Pilihan Tema & Nuansa Warna"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {activeTab === 1 && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400"></span>}
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-stone-900 text-white text-[11px] font-semibold rounded-lg shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition hidden sm:block">
                  Tema &amp; Palet
                </span>
              </button>

              {/* Tab 2: Buku Tamu VIP */}
              <button
                onClick={() => setActiveTab(2)}
                className={`relative group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-200 ${
                  activeTab === 2
                    ? "bg-amber-500/25 text-amber-300 shadow-inner scale-105"
                    : "text-stone-400 hover:text-white hover:bg-white/10"
                }`}
                role="tab"
                aria-selected={activeTab === 2}
                title="3. Manajemen Buku Tamu VIP"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {activeTab === 2 && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400"></span>}
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-stone-900 text-white text-[11px] font-semibold rounded-lg shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition hidden sm:block">
                  Buku Tamu VIP
                </span>
              </button>

              {/* Tab 3: RSVP & Doa Restu */}
              <button
                onClick={() => setActiveTab(3)}
                className={`relative group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-200 ${
                  activeTab === 3
                    ? "bg-amber-500/25 text-amber-300 shadow-inner scale-105"
                    : "text-stone-400 hover:text-white hover:bg-white/10"
                }`}
                role="tab"
                aria-selected={activeTab === 3}
                title="4. Konfirmasi RSVP & Doa Restu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {activeTab === 3 && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400"></span>}
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-stone-900 text-white text-[11px] font-semibold rounded-lg shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition hidden sm:block">
                  RSVP &amp; Doa
                </span>
              </button>

              {/* Tab 4: Audit & Rilis */}
              <button
                onClick={() => setActiveTab(4)}
                className={`relative group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-200 ${
                  activeTab === 4
                    ? "bg-amber-500/25 text-amber-300 shadow-inner scale-105"
                    : "text-stone-400 hover:text-white hover:bg-white/10"
                }`}
                role="tab"
                aria-selected={activeTab === 4}
                title="5. Pengecekan Data & Peluncuran Resmi"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {activeTab === 4 && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400"></span>}
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-stone-900 text-white text-[11px] font-semibold rounded-lg shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition hidden sm:block">
                  Audit &amp; Rilis
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
