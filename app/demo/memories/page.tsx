"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

interface StackPhoto {
  id: string;
  mediaUrl: string;
  createdAt: string;
  isUserUploaded?: boolean;
}

interface GuestRollStack {
  key: string;
  senderName: string;
  message: string;
  photos: StackPhoto[];
  coverPhoto: string;
  photoCount: number;
  latestCreatedAt: string;
  isUserUploaded?: boolean;
}

const INITIAL_DEMO_STACKS: GuestRollStack[] = [
  {
    key: "budi-santoso",
    senderName: "Budi Santoso & Keluarga",
    message: "Selamat berbahagia untuk Raditya & Alana! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah selamanya 🎉",
    coverPhoto: "/demo/candani/gallery_01.webp",
    photoCount: 3,
    latestCreatedAt: "2026-09-07T19:30:00Z",
    photos: [
      { id: "p-1", mediaUrl: "/demo/candani/gallery_01.webp", createdAt: "2026-09-07T19:30:00Z" },
      { id: "p-2", mediaUrl: "/demo/candani/gallery_02.webp", createdAt: "2026-09-07T19:31:00Z" },
      { id: "p-3", mediaUrl: "/demo/candani/gallery_03.webp", createdAt: "2026-09-07T19:32:00Z" },
    ],
  },
  {
    key: "geng-teknik",
    senderName: "Geng Teknik (Dimas & Tim)",
    message: "Happy wedding brother! Akhirnya berlabuh di pelabuhan terakhir 🥂",
    coverPhoto: "/demo/kalandra/gallery_02.webp",
    photoCount: 4,
    latestCreatedAt: "2026-09-07T19:42:00Z",
    photos: [
      { id: "p-4", mediaUrl: "/demo/kalandra/gallery_02.webp", createdAt: "2026-09-07T19:42:00Z" },
      { id: "p-5", mediaUrl: "/demo/kalandra/gallery_03.webp", createdAt: "2026-09-07T19:43:00Z" },
      { id: "p-6", mediaUrl: "/demo/kalandra/gallery_04.webp", createdAt: "2026-09-07T19:44:00Z" },
      { id: "p-7", mediaUrl: "/demo/kalandra/gallery_05.webp", createdAt: "2026-09-07T19:45:00Z" },
    ],
  },
  {
    key: "rina-sahabat",
    senderName: "Rina & Sahabat SMA",
    message: "Cantik dan ganteng banget berdua malam ini! Terharu liat akad tadi ✨",
    coverPhoto: "/demo/valente/gallery_03.webp",
    photoCount: 2,
    latestCreatedAt: "2026-09-07T20:05:00Z",
    photos: [
      { id: "p-8", mediaUrl: "/demo/valente/gallery_03.webp", createdAt: "2026-09-07T20:05:00Z" },
      { id: "p-9", mediaUrl: "/demo/valente/gallery_04.webp", createdAt: "2026-09-07T20:06:00Z" },
    ],
  },
  {
    key: "tante-maryam",
    senderName: "Keluarga Besar Tante Maryam",
    message: "Barakallahu lakuma wa baraka alaikuma. Doa terbaik untuk kalian berdua.",
    coverPhoto: "/demo/prameswari/gallery_04.webp",
    photoCount: 2,
    latestCreatedAt: "2026-09-07T20:15:00Z",
    photos: [
      { id: "p-10", mediaUrl: "/demo/prameswari/gallery_04.webp", createdAt: "2026-09-07T20:15:00Z" },
      { id: "p-11", mediaUrl: "/demo/prameswari/gallery_05.webp", createdAt: "2026-09-07T20:16:00Z" },
    ],
  },
  {
    key: "bridesmaids",
    senderName: "Bridesmaids Squad",
    message: "To the happiest day of our dearest bride! Love you so much Alana 💕",
    coverPhoto: "/demo/mayang/gallery_05.webp",
    photoCount: 5,
    latestCreatedAt: "2026-09-07T20:28:00Z",
    photos: [
      { id: "p-12", mediaUrl: "/demo/mayang/gallery_05.webp", createdAt: "2026-09-07T20:28:00Z" },
      { id: "p-13", mediaUrl: "/demo/mayang/gallery_06.webp", createdAt: "2026-09-07T20:29:00Z" },
      { id: "p-14", mediaUrl: "/demo/mayang/gallery_07.webp", createdAt: "2026-09-07T20:30:00Z" },
      { id: "p-15", mediaUrl: "/demo/mayang/gallery_08.webp", createdAt: "2026-09-07T20:31:00Z" },
      { id: "p-16", mediaUrl: "/demo/mayang/gallery_01.webp", createdAt: "2026-09-07T20:32:00Z" },
    ],
  },
  {
    key: "rekan-kerja",
    senderName: "Rekan Kerja Kreatif",
    message: "Selamat atas pernikahannya! Semangat libur honeymoon panjangnya ya bos!",
    coverPhoto: "/demo/aurelia/gallery_06.webp",
    photoCount: 3,
    latestCreatedAt: "2026-09-07T20:40:00Z",
    photos: [
      { id: "p-17", mediaUrl: "/demo/aurelia/gallery_06.webp", createdAt: "2026-09-07T20:40:00Z" },
      { id: "p-18", mediaUrl: "/demo/aurelia/gallery_07.webp", createdAt: "2026-09-07T20:41:00Z" },
      { id: "p-19", mediaUrl: "/demo/aurelia/gallery_08.webp", createdAt: "2026-09-07T20:42:00Z" },
    ],
  },
  {
    key: "komunitas-foto",
    senderName: "Komunitas Fotografi",
    message: "Pernikahan yang sangat intim, hangat, dan berkelas. Selamat menempuh hidup baru!",
    coverPhoto: "/demo/artisan/gallery_07.webp",
    photoCount: 3,
    latestCreatedAt: "2026-09-07T20:55:00Z",
    photos: [
      { id: "p-20", mediaUrl: "/demo/artisan/gallery_07.webp", createdAt: "2026-09-07T20:55:00Z" },
      { id: "p-21", mediaUrl: "/demo/artisan/gallery_08.webp", createdAt: "2026-09-07T20:56:00Z" },
      { id: "p-22", mediaUrl: "/demo/artisan/gallery_01.webp", createdAt: "2026-09-07T20:57:00Z" },
    ],
  },
  {
    key: "sarah-kevin",
    senderName: "Sarah & Kevin",
    message: "Definisi pasangan serasi! Bahagia selalu kalian berdua yaa ✨",
    coverPhoto: "/demo/solaria/gallery_02.webp",
    photoCount: 2,
    latestCreatedAt: "2026-09-07T21:20:00Z",
    photos: [
      { id: "p-23", mediaUrl: "/demo/solaria/gallery_02.webp", createdAt: "2026-09-07T21:20:00Z" },
      { id: "p-24", mediaUrl: "/demo/solaria/gallery_03.webp", createdAt: "2026-09-07T21:21:00Z" },
    ],
  },
  {
    key: "nadia-kantor",
    senderName: "Nadia (Teman Kantor)",
    message: "Gaunnya anggun banget Alana! Happy wedding for both of you 🥂",
    coverPhoto: "/demo/papercut/gallery_04.webp",
    photoCount: 2,
    latestCreatedAt: "2026-09-07T21:44:00Z",
    photos: [
      { id: "p-25", mediaUrl: "/demo/papercut/gallery_04.webp", createdAt: "2026-09-07T21:44:00Z" },
      { id: "p-26", mediaUrl: "/demo/papercut/gallery_05.webp", createdAt: "2026-09-07T21:45:00Z" },
    ],
  },
];

export default function DemoGuestMemoriesPage() {
  const [rollStacks, setRollStacks] = useState<GuestRollStack[]>(INITIAL_DEMO_STACKS);
  const [selectedStack, setSelectedStack] = useState<GuestRollStack | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [showZipModal, setShowZipModal] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [themeParam, setThemeParam] = useState<string>("");

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const th = sp.get("theme");
      if (th) setThemeParam(th.toLowerCase().trim());
    } catch {}
  }, []);

  // Total count
  const totalPhotosCount = rollStacks.reduce((acc, curr) => acc + curr.photoCount, 0);

  // Load moments from sessionStorage and group by user
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("demo_guest_moments");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userStack: GuestRollStack = {
            key: "user-session-roll",
            senderName: parsed[0]?.senderName || "Tamu Undangan (Anda)",
            message: parsed[0]?.message || "Selamat menempuh hidup baru! Bahagia dan berkah selalu ✨",
            coverPhoto: parsed[0]?.mediaUrl || "/demo/candani/gallery_01.webp",
            photoCount: parsed.length,
            latestCreatedAt: parsed[0]?.createdAt || new Date().toISOString(),
            isUserUploaded: true,
            photos: parsed.map((p: any, i: number) => ({
              id: p.id || `user-p-${i}`,
              mediaUrl: p.mediaUrl,
              createdAt: p.createdAt || new Date().toISOString(),
              isUserUploaded: true,
            })),
          };

          setRollStacks([userStack, ...INITIAL_DEMO_STACKS]);
        }
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  const openStackModal = (stack: GuestRollStack, initialPhotoIdx = 0) => {
    setSelectedStack(stack);
    setActivePhotoIdx(initialPhotoIdx);
  };

  const handlePrevPhoto = useCallback(() => {
    if (!selectedStack) return;
    setActivePhotoIdx((prev) => (prev - 1 + selectedStack.photos.length) % selectedStack.photos.length);
  }, [selectedStack]);

  const handleNextPhoto = useCallback(() => {
    if (!selectedStack) return;
    setActivePhotoIdx((prev) => (prev + 1) % selectedStack.photos.length);
  }, [selectedStack]);

  // Keyboard navigation untuk desktop
  useEffect(() => {
    if (!selectedStack) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextPhoto();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevPhoto();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedStack(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStack, handleNextPhoto, handlePrevPhoto]);

  // Touch swipe gestures untuk mobile
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartYRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - (touchStartYRef.current || 0);

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNextPhoto();
      } else {
        handlePrevPhoto();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleSimulateZipDownload = () => {
    setIsZipping(true);
    setTimeout(() => {
      setIsZipping(false);
      setShowZipModal(true);
    }, 1200);
  };

  const activePhoto = selectedStack ? selectedStack.photos[activePhotoIdx] : null;

  return (
    <div
      className="min-h-screen bg-[#09090b] text-stone-100 font-sans pb-24 select-none"
      style={{ colorScheme: "only dark", WebkitTouchCallout: "none" }}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "IMG" || target.closest(".memory-img-guard"))) {
          e.preventDefault();
        }
      }}
    >
      {/* Top Professional Navbar */}
      <header className="bg-[#121215] border-b border-stone-800 sticky top-0 z-40 px-3 sm:px-6 py-3">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={themeParam ? `/demo/${themeParam}` : "/demo"}
              className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer"
            >
              <BrandLogo size="sm" />
            </Link>
            <div className="hidden sm:block border-l border-stone-800 pl-3">
              <span className="text-xs font-bold tracking-tight text-white block">GALERI KENANGAN TAMU</span>
              <p className="text-[10px] text-stone-400">Roll Stack Mode: 1 Card per Tamu</p>
            </div>
            {themeParam && (
              <Link
                href={`/demo/${themeParam}`}
                className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"
              >
                <span>&larr;</span>
                <span className="capitalize">Undangan Demo ({themeParam})</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateZipDownload}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              {isZipping ? (
                <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span className="hidden sm:inline">Simulasi Unduh ZIP</span>
            </button>

            <Link
              href={themeParam ? `/demo/sharemoment?theme=${themeParam}` : "/demo/sharemoment"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold rounded-lg transition cursor-pointer shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Buka Kamera</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header Ringkas */}
      <section className="max-w-2xl mx-auto px-4 pt-8 pb-4 text-center">
        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
          Roll Stack Live Gallery
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-white mt-3 mb-2">
          Kenangan Hangat Para Tamu
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 max-w-lg mx-auto leading-relaxed">
          Setiap tamu memiliki 1 kartu tumpuk (*roll stack*) eksklusif berisi jepretan kamera analog dan ucapan doa hangat tanpa duplikasi kartu.
        </p>

        <div className="flex items-center justify-center gap-3 mt-4 text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{rollStacks.length} Roll Tamu</span>
          </span>
          <span>•</span>
          <span className="text-amber-400 font-semibold">{totalPhotosCount} Total Foto</span>
          <span>•</span>
          <span>Resolusi Asli Terjaga</span>
        </div>
      </section>

      {/* ── Story Circles Highlights (1 Lingkaran per Tamu Roll) ── */}
      <section className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-1 pb-6">
        <div className="flex items-center justify-center gap-2 mb-3 text-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-stone-400 font-mono">
            Sorotan Cerita Tamu ({rollStacks.length})
          </span>
        </div>
        <div className="flex items-center justify-start sm:justify-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
          {rollStacks.slice(0, 10).map((stack) => (
            <div
              key={`story-${stack.key}`}
              onClick={() => openStackModal(stack, 0)}
              className="flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer group"
            >
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-amber-300 to-yellow-500 group-hover:scale-105 transition-transform duration-200 shadow-md shadow-amber-500/10 select-none memory-img-guard"
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-900 border-2 border-stone-950 pointer-events-none select-none">
                  <img
                    src={stack.coverPhoto}
                    alt={stack.senderName}
                    className="w-full h-full object-cover pointer-events-none select-none"
                    loading="lazy"
                    draggable={false}
                    style={{ WebkitTouchCallout: "none", userSelect: "none" }}
                  />
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] text-stone-300 group-hover:text-white font-medium truncate max-w-[64px] sm:max-w-[70px] text-center select-none">
                {stack.senderName.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Grid Galeri Kenangan: 1 Card per Tamu (Roll Stack) */}
      <main className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-7 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
          {rollStacks.map((stack) => (
            <div
              key={stack.key}
              onClick={() => openStackModal(stack, 0)}
              className={`break-inside-avoid relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group shadow-lg ${
                stack.isUserUploaded
                  ? "bg-[#15130f] border border-amber-500/80 ring-2 ring-amber-500/30 shadow-amber-500/10"
                  : "bg-[#121215] border border-stone-800/80 hover:border-amber-500/50"
              }`}
            >
              {/* Efek Visual Tumpukan Lapisan Fisik di Belakang */}
              {stack.photoCount > 1 && (
                <div className="absolute -top-1 -right-1 inset-x-1 h-full bg-stone-800/80 rounded-2xl -z-10 border border-white/5 pointer-events-none" />
              )}
              {stack.photoCount > 2 && (
                <div className="absolute -top-2 -right-2 inset-x-2 h-full bg-stone-800/50 rounded-2xl -z-20 border border-white/5 pointer-events-none" />
              )}

              {/* Badge Jika Hasil Simulasi User */}
              {stack.isUserUploaded && (
                <div className="bg-amber-600 text-stone-950 text-[10px] font-bold px-2.5 py-1 flex items-center justify-between select-none">
                  <span>Roll Baru Diunggah</span>
                  <span className="text-[9px] uppercase tracking-wider bg-stone-950/20 px-1 rounded">
                    Anda
                  </span>
                </div>
              )}

              {/* Foto Sampul Roll & Floating Count Badge */}
              <div
                className="relative overflow-hidden bg-stone-900 select-none memory-img-guard"
              >
                <img
                  src={stack.coverPhoto}
                  alt={stack.senderName}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-all duration-500 pointer-events-none select-none"
                  loading="lazy"
                  draggable={false}
                  style={{ WebkitTouchCallout: "none", userSelect: "none" }}
                />

                {/* Floating Pill: Jumlah Foto Roll Tamu */}
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/75 backdrop-blur-md border border-white/15 rounded-full flex items-center gap-1.5 shadow-md">
                  <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[10px] font-mono font-bold text-amber-300">
                    {stack.photoCount} Foto
                  </span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 pointer-events-none">
                  <span className="text-[10px] sm:text-[11px] text-white font-medium flex items-center gap-1 select-none">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Buka Roll ({stack.photoCount} Foto)</span>
                  </span>
                </div>
              </div>

              {/* Konten Tamu & Pesan Tunggal */}
              <div className="p-3 space-y-1.5 bg-stone-900/95 border-t border-white/5 select-none">
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="font-bold text-amber-400 truncate max-w-[130px] sm:max-w-[150px]">
                    {stack.senderName}
                  </span>
                  <span className="text-stone-500 text-[10px] font-mono shrink-0">
                    {new Date(stack.latestCreatedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                {stack.message && (
                  <p className="text-[11px] sm:text-xs text-stone-300 leading-relaxed font-sans line-clamp-2 italic">
                    &ldquo;{stack.message}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Roll Stack Lightbox Modal (Bisa Geser / Pindah Antar Foto dalam Roll Tamu) */}
      {selectedStack && activePhoto && (
        <div
          onClick={() => setSelectedStack(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none memory-img-guard"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121215] border border-stone-800 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-150 select-none flex flex-col"
          >
            {/* Tombol Tutup Minimalis */}
            <button
              onClick={() => setSelectedStack(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/70 hover:bg-black text-white rounded-full transition cursor-pointer border border-white/10"
              aria-label="Tutup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Foto Besar dengan Tombol Panah Kiri/Kanan */}
            <div className="bg-black max-h-[60vh] sm:max-h-[65vh] flex items-center justify-center overflow-hidden relative select-none">
              <img
                src={activePhoto.mediaUrl}
                alt={selectedStack.senderName}
                className="max-h-[60vh] sm:max-h-[65vh] w-auto object-contain transition-all duration-300 pointer-events-none select-none"
                draggable={false}
                style={{ WebkitTouchCallout: "none", userSelect: "none" }}
              />

              {/* Tombol Panah Sebelumnya */}
              {selectedStack.photoCount > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevPhoto();
                    }}
                    className="absolute left-3 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition border border-white/10 cursor-pointer"
                    aria-label="Foto Sebelumnya"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextPhoto();
                    }}
                    className="absolute right-3 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition border border-white/10 cursor-pointer"
                    aria-label="Foto Berikutnya"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Detail Pesan & Indikator Roll */}
            <div className="p-5 sm:p-6 bg-[#121215] border-t border-stone-800/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedStack.senderName}</h3>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-stone-900 border border-stone-800 px-2.5 py-0.5 rounded-full">
                    Foto {activePhotoIdx + 1} dari {selectedStack.photoCount}
                  </span>
                </div>
                <span className="text-xs text-stone-500 font-mono">
                  {new Date(activePhoto.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {selectedStack.message && (
                <p className="text-sm text-stone-300 leading-relaxed font-serif italic">
                  &ldquo;{selectedStack.message}&rdquo;
                </p>
              )}

              {/* Thumbnails Mini Roll Tamu */}
              {selectedStack.photoCount > 1 && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-800/60 overflow-x-auto pb-1 scrollbar-none">
                  {selectedStack.photos.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                        idx === activePhotoIdx
                          ? "border-amber-400 scale-105"
                          : "border-stone-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={p.mediaUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-[11px] text-stone-400">
                <span className="hidden sm:inline">Navigasi: Tombol keyboard ← / →</span>
                <span className="sm:hidden">Swipe layar untuk foto dalam roll ini</span>
                <span className="text-stone-500 font-mono">Esc / Klik luar untuk tutup</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Simulasi Download ZIP */}
      {showZipModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-stone-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>

            <h3 className="text-base font-bold text-white mb-2">Simulasi Unduh Arsip ZIP</h3>
            <p className="text-xs text-stone-400 mb-6 leading-relaxed">
              Pada paket premium asli, kedua mempelai dapat mengunduh seluruh {totalPhotosCount} foto kenangan tamu dalam 1 file arsip ZIP beresolusi tinggi (Original Quality).
            </p>

            <button
              onClick={() => setShowZipModal(false)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Mengerti & Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button: Buka Kamera Tamu */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          href={themeParam ? `/demo/sharemoment?theme=${themeParam}` : "/demo/sharemoment"}
          className="flex items-center gap-2.5 px-4 sm:px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs sm:text-sm rounded-full shadow-2xl hover:shadow-amber-500/25 transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer border border-amber-400/40 select-none"
        >
          <svg className="w-4 h-4 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Buka Kamera Tamu</span>
        </Link>
      </div>
    </div>
  );
}

