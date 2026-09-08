"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

interface GuestMemoryItem {
  id: string;
  senderName: string;
  message: string;
  mediaUrl: string;
  createdAt: string;
  isUserUploaded?: boolean;
}

const STATIC_DEMO_MEMORIES: GuestMemoryItem[] = [
  {
    id: "mem-1",
    senderName: "Budi Santoso & Keluarga",
    message: "Selamat berbahagia untuk Raditya & Alana! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah selamanya 🎉",
    mediaUrl: "/demo/candani/gallery_01.webp",
    createdAt: "2026-09-07T19:30:00Z",
  },
  {
    id: "mem-2",
    senderName: "Geng Teknik (Dimas & Tim)",
    message: "Happy wedding brother! Akhirnya berlabuh di pelabuhan terakhir 🥂",
    mediaUrl: "/demo/kalandra/gallery_02.webp",
    createdAt: "2026-09-07T19:42:00Z",
  },
  {
    id: "mem-3",
    senderName: "Rina & Sahabat SMA",
    message: "Cantik dan ganteng banget berdua malam ini! Terharu liat akad tadi ✨",
    mediaUrl: "/demo/valente/gallery_03.webp",
    createdAt: "2026-09-07T20:05:00Z",
  },
  {
    id: "mem-4",
    senderName: "Keluarga Besar Tante Maryam",
    message: "Barakallahu lakuma wa baraka alaikuma. Doa terbaik untuk kalian berdua.",
    mediaUrl: "/demo/prameswari/gallery_04.webp",
    createdAt: "2026-09-07T20:15:00Z",
  },
  {
    id: "mem-5",
    senderName: "Bridesmaids Squad",
    message: "To the happiest day of our dearest bride! Love you so much Alana 💕",
    mediaUrl: "/demo/mayang/gallery_05.webp",
    createdAt: "2026-09-07T20:28:00Z",
  },
  {
    id: "mem-6",
    senderName: "Rekan Kerja Kreatif",
    message: "Selamat atas pernikahannya! Semangat libur honeymoon panjangnya ya bos!",
    mediaUrl: "/demo/aurelia/gallery_06.webp",
    createdAt: "2026-09-07T20:40:00Z",
  },
  {
    id: "mem-7",
    senderName: "Komunitas Fotografi",
    message: "Pernikahan yang sangat intim, hangat, dan berkelas. Selamat menempuh hidup baru!",
    mediaUrl: "/demo/artisan/gallery_07.webp",
    createdAt: "2026-09-07T20:55:00Z",
  },
  {
    id: "mem-8",
    senderName: "Andika & Fathir",
    message: "Cheers to love, laughter, and happily ever after! Selamat Radit!",
    mediaUrl: "/demo/wave/gallery_08.webp",
    createdAt: "2026-09-07T21:00:00Z",
  },
  {
    id: "mem-9",
    senderName: "Keluarga Oom Farhan",
    message: "Selamat menempuh bahtera rumah tangga baru, semoga senantiasa diberkahi.",
    mediaUrl: "/demo/badrika/gallery_01.webp",
    createdAt: "2026-09-07T21:12:00Z",
  },
  {
    id: "mem-10",
    senderName: "Sarah & Kevin",
    message: "Definisi pasangan serasi! Bahagia selalu kalian berdua yaa ✨",
    mediaUrl: "/demo/solaria/gallery_02.webp",
    createdAt: "2026-09-07T21:20:00Z",
  },
  {
    id: "mem-11",
    senderName: "dr. Hendra & Istri",
    message: "Selamat atas persatuan dua keluarga besar. Semoga rukun dan bahagia sentosa.",
    mediaUrl: "/demo/lumina/gallery_03.webp",
    createdAt: "2026-09-07T21:35:00Z",
  },
  {
    id: "mem-12",
    senderName: "Nadia (Teman Kantor)",
    message: "Gaunnya anggun banget Alana! Happy wedding for both of you 🥂",
    mediaUrl: "/demo/papercut/gallery_04.webp",
    createdAt: "2026-09-07T21:44:00Z",
  },
  {
    id: "mem-13",
    senderName: "Bagus & Anisa",
    message: "Lancar terus sampai punya momongan yang sholeh dan sholehah!",
    mediaUrl: "/demo/chronicle/gallery_05.webp",
    createdAt: "2026-09-07T21:50:00Z",
  },
  {
    id: "mem-14",
    senderName: "Dilla & Lucky",
    message: "Welcome to the married club! Seru banget resepsinya malam ini 🎉",
    mediaUrl: "/demo/dillalucky/gallery_06.webp",
    createdAt: "2026-09-07T21:58:00Z",
  },
  {
    id: "mem-15",
    senderName: "Keluarga Solo & Jogja",
    message: "Mugi tansah pinaringan berkah, ayem tentrem kasantosan saklawase.",
    mediaUrl: "/demo/ameera/gallery_07.webp",
    createdAt: "2026-09-07T22:05:00Z",
  },
  {
    id: "mem-16",
    senderName: "Groom's Bestmen",
    message: "Proud of you brother! All the best for Raditya & Alana 👏",
    mediaUrl: "/demo/candani/gallery_08.webp",
    createdAt: "2026-09-07T22:15:00Z",
  },
];

export default function DemoGuestMemoriesPage() {
  const [memories, setMemories] = useState<GuestMemoryItem[]>(STATIC_DEMO_MEMORIES);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showZipModal, setShowZipModal] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const selectedPhoto = selectedIndex !== null && memories[selectedIndex] ? memories[selectedIndex] : null;

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + memories.length) % memories.length : null));
  }, [memories.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % memories.length : null));
  }, [memories.length]);

  // Keyboard navigation untuk desktop (ArrowLeft / ArrowRight / Escape)
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, memories.length, handleNext, handlePrev]);

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

    // Pastikan swipe horizontal lebih dominan daripada vertikal
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNext(); // Swipe ke kiri -> Foto berikutnya
      } else {
        handlePrev(); // Swipe ke kanan -> Foto sebelumnya
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Proteksi anti-save image & klik kanan pada seluruh media foto
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "IMG" || target.closest("img") || target.closest(".memory-img-guard"))) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", handleGlobalContextMenu);
    return () => document.removeEventListener("contextmenu", handleGlobalContextMenu);
  }, []);

  // Load moments from sessionStorage if user uploaded any in /demo/sharemoment
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("demo_guest_moments");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMemories([...parsed, ...STATIC_DEMO_MEMORIES]);
        }
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  const handleSimulateZipDownload = () => {
    setIsZipping(true);
    setTimeout(() => {
      setIsZipping(false);
      setShowZipModal(true);
    }, 1200);
  };

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
            <Link href="/demo" className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
              <BrandLogo size="sm" />
            </Link>
            <div className="hidden sm:block border-l border-stone-800 pl-3">
              <span className="text-xs font-bold tracking-tight text-white block">GALERI KENANGAN TAMU</span>
              <p className="text-[10px] text-stone-400">Live Photo Stream & Guestbook</p>
            </div>
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
              href="/demo/sharemoment"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold rounded-lg transition cursor-pointer shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Kirim Momen</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header Ringkas */}
      <section className="max-w-2xl mx-auto px-4 pt-8 pb-4 text-center">
        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
          Live Guest Memories Feed
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-white mt-3 mb-2">
          Kenangan Hangat Para Tamu
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 max-w-lg mx-auto leading-relaxed">
          Koleksi foto spontan dan ucapan doa yang dikirimkan langsung oleh para tamu dari meja acara ke layar proyektor pernikahan.
        </p>

        <div className="flex items-center justify-center gap-3 mt-4 text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{memories.length} Momen Terkumpul</span>
          </span>
          <span>•</span>
          <span>Resolusi Asli Terjaga</span>
        </div>
      </section>

      {/* ── Story Circles Highlights (Instagram Style - Identik Galeri Live) ── */}
      <section className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-1 pb-6">
        <div className="flex items-center justify-center gap-2 mb-3 text-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-stone-400 font-mono">
            Sorotan Cerita Tamu ({memories.length})
          </span>
        </div>
        <div className="flex items-center justify-start sm:justify-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
          {memories.slice(0, 12).map((item) => (
            <div
              key={`story-${item.id}`}
              onClick={() => {
                const foundIdx = memories.findIndex((m) => m.id === item.id);
                setSelectedIndex(foundIdx !== -1 ? foundIdx : 0);
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer group"
            >
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-amber-300 to-yellow-500 group-hover:scale-105 transition-transform duration-200 shadow-md shadow-amber-500/10 select-none memory-img-guard"
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-900 border-2 border-stone-950 pointer-events-none select-none">
                  <img
                    src={item.mediaUrl}
                    alt={item.senderName}
                    className="w-full h-full object-cover pointer-events-none select-none"
                    loading="lazy"
                    draggable={false}
                    style={{ WebkitTouchCallout: "none", userSelect: "none" }}
                  />
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] text-stone-300 group-hover:text-white font-medium truncate max-w-[64px] sm:max-w-[70px] text-center select-none">
                {item.senderName.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Grid Galeri Kenangan Fluid Full-Width */}
      <main className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-7 gap-3 sm:gap-3.5 space-y-3 sm:space-y-3.5">
          {memories.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setSelectedIndex(idx)}
              className={`break-inside-avoid bg-[#121215] rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] cursor-pointer group shadow-lg ${
                item.isUserUploaded
                  ? "border-amber-500/70 ring-2 ring-amber-500/30"
                  : "border-stone-800/80 hover:border-amber-500/50"
              }`}
            >
              {/* Badge Jika Hasil Simulasi User */}
              {item.isUserUploaded && (
                <div className="bg-amber-600 text-stone-950 text-[10px] font-bold px-2.5 py-1 flex items-center justify-between select-none">
                  <span>Momen Baru Diunggah</span>
                  <span className="text-[9px] uppercase tracking-wider bg-stone-950/20 px-1 rounded">
                    Anda
                  </span>
                </div>
              )}

              {/* Foto Item */}
              <div
                className="relative overflow-hidden bg-stone-900 select-none memory-img-guard"
                onContextMenu={(e) => e.preventDefault()}
              >
                <img
                  src={item.mediaUrl}
                  alt={item.senderName}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-all duration-500 pointer-events-none select-none"
                  loading="lazy"
                  draggable={false}
                  style={{ WebkitTouchCallout: "none", userSelect: "none" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 pointer-events-none">
                  <span className="text-[10px] sm:text-[11px] text-white font-medium flex items-center gap-1 select-none">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Perbesar</span>
                  </span>
                </div>
              </div>

              {/* Konten Ucapan Ringkas & Rapi */}
              <div className="p-3 space-y-1.5 bg-stone-900/90 select-none">
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="font-bold text-amber-400 truncate max-w-[130px] sm:max-w-[150px]">
                    {item.senderName}
                  </span>
                  <span className="text-stone-500 text-[10px] font-mono shrink-0">
                    {new Date(item.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {item.message && (
                  <p className="text-[11px] sm:text-xs text-stone-300 leading-relaxed font-sans line-clamp-2 italic">
                    &ldquo;{item.message}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Foto Fullscreen Bebas Ikon Panah (Touch Swipe & Keyboard Arrow) */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 select-none memory-img-guard"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            className="bg-[#121215] border border-stone-800 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-150 select-none"
          >
            {/* Tombol Tutup Minimalis */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/70 hover:bg-black text-white rounded-full transition cursor-pointer border border-white/10"
              aria-label="Tutup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Foto Besar */}
            <div
              className="bg-black max-h-[65vh] flex items-center justify-center overflow-hidden relative select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={selectedPhoto.mediaUrl}
                alt={selectedPhoto.senderName}
                className="max-h-[65vh] w-auto object-contain transition-all duration-300 pointer-events-none select-none"
                draggable={false}
                style={{ WebkitTouchCallout: "none", userSelect: "none" }}
              />
            </div>

            {/* Detail Pesan */}
            <div className="p-5 sm:p-6 bg-[#121215]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedPhoto.senderName}</h3>
                  {selectedIndex !== null && (
                    <span className="text-[10px] font-mono text-amber-400 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-full">
                      {selectedIndex + 1} / {memories.length}
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-500 font-mono">
                  {new Date(selectedPhoto.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {selectedPhoto.message && (
                <p className="text-sm text-stone-300 leading-relaxed font-serif italic">
                  &ldquo;{selectedPhoto.message}&rdquo;
                </p>
              )}
              <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                <span className="hidden sm:inline">Navigasi: Tombol panah keyboard ← / →</span>
                <span className="sm:hidden">Geser (swipe) kiri/kanan untuk foto lain</span>
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
              Pada paket asli, kedua mempelai dapat mengunduh seluruh {memories.length} foto kenangan tamu dalam 1 file arsip ZIP beresolusi tinggi (Full HD / Original Quality).
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
    </div>
  );
}
