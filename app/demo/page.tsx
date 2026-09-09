"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import "./demo.css";

interface ThemeItem {
  id: string;
  name: string;
  series: string;
  category: "premium" | "traditional" | "modern" | string;
  desc: string;
  thumbnailMobile?: string;
  thumbnailDesktop?: string;
}

export default function CatalogGridShowcase() {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [platformName, setPlatformName] = useState("Platform Undangan");
  const [siteHost, setSiteHost] = useState("");

  const [mainTab, setMainTab] = useState<"themes" | "features">("themes");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "features") {
        setMainTab("features");
      }
      setSiteHost(window.location.hostname);
    }
  }, []);

  useEffect(() => {
    fetch("/api/public/settings").then(r => r.json()).then(d => {
      if (d?.platformName) setPlatformName(d.platformName);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/public/themes", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setThemes(
            data.map((t: any) => ({
              id: t.id,
              name: t.name,
              series: t.series || (t.category === "PREMIUM" ? "Premium" : t.category === "TRADITIONAL" ? "Traditional" : "Modern"),
              category: (t.category || "modern").toLowerCase(),
              desc: t.tagline || t.desc || `Desain eksklusif ${platformName}`,
              thumbnailMobile: t.thumbnailMobile || `/demo/${t.id}/thumbnail_mobile.webp`,
              thumbnailDesktop: t.thumbnailDesktop || `/demo/${t.id}/thumbnail_desktop.webp`,
            }))
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [platformName]);

  const filteredThemes = selectedCategory === "all"
    ? themes
    : themes.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="demo-catalog-root min-h-screen bg-[#faf8f5] text-stone-900 font-sans pb-24" style={{ colorScheme: "only light", backgroundColor: "#faf8f5", color: "#1c1917" }}>
      {/* Top Navigation & Brand Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40" style={{ colorScheme: "only light", backgroundColor: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <BrandLogo size="sm" lightBg />
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight group-hover:text-amber-900 transition">KATALOG TEMA</h1>
              <p className="text-[11px] text-stone-500 font-medium">Koleksi Desain & Ekosistem Teknologi Undangan</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/portfolio"
              className="text-xs font-bold text-stone-600 hover:text-amber-900 transition mr-2"
            >
              Portofolio
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-full transition shadow-sm cursor-pointer"
            >
              Pilih Paket Undangan
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
        {/* Main Tab Switcher: Tema vs Fitur */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-stone-200/80 p-1 rounded-full inline-flex border border-stone-300/60 shadow-2xs">
            <button
              onClick={() => setMainTab("themes")}
              className={`px-5 sm:px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                mainTab === "themes"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Koleksi Desain Tema
            </button>
            <button
              onClick={() => setMainTab("features")}
              className={`px-5 sm:px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mainTab === "features"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>Sistem & Fitur Acara</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            </button>
          </div>
        </div>

        {mainTab === "themes" ? (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Official Design Catalog
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-stone-900 mt-3 mb-2">
              Pilih Desain Tema Eksklusif Anda
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-2xl mx-auto">
              Setiap tema dibangun dengan struktur visual unik, tata letak asli, dan dapat disesuaikan penuh dengan foto dan konsep pernikahan Anda.
            </p>

            {/* Category Filter Tabs */}
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              {[
                { id: "all", label: "Semua Tema" },
                { id: "premium", label: "Premium" },
                { id: "modern", label: "Modern" },
                { id: "traditional", label: "Traditional" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-stone-900 text-white shadow-sm"
                      : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Device pair indicator */}
            <div className="flex items-center justify-center mt-5 gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="1.75"/><line x1="2" y1="9" x2="22" y2="9" strokeWidth="1.75"/></svg>
                Desktop
              </span>
              <span className="w-1 h-1 rounded-full bg-stone-300"></span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
                <svg className="w-2.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" strokeWidth="1.75"/><line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5" strokeLinecap="round"/></svg>
                Mobile
              </span>

            </div>
          </div>
        ) : (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Day-of-Event Ecosystem Tech
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-stone-900 mt-3 mb-2">
              Sistem Operasional Hari-H Pernikahan
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-2xl mx-auto">
              Lebih dari sekadar kartu undangan, nikmati ekosistem teknologi cerdas untuk meja resepsionis, buku tamu interaktif, dan galeri kenangan tamu real-time.
            </p>
          </div>
        )}
      </section>

      {/* Main Content Area */}
      {mainTab === "themes" ? (
        /* Grid Showcase Tema */
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredThemes.length === 0 ? (
            <div className="text-center py-20 text-stone-500 text-sm">
              Tidak ada tema yang ditemukan pada kategori ini.
            </div>
          ) : (
            <div className="catalog-grid">
              {filteredThemes.map((theme) => (
                <div key={theme.id} className="catalog-item">

                  {/* ── Device Pair Scene ── */}
                  <div className="device-pair-scene">
                    {/* Tablet frame */}
                    <div className="dm-tablet">
                      <div className="dm-tablet-topbar">
                        <div className="dm-tablet-traffic">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <div className="dm-tablet-url">
                          {siteHost}/{theme.id}
                        </div>
                        <div style={{ width: "24px" }}></div>
                      </div>
                      <div className="dm-tablet-screen">
                        <img
                          src={theme.thumbnailDesktop || `/demo/${theme.id}/thumbnail_desktop.webp`}
                          alt={`${theme.name} Desktop`}
                          onError={(e) => {
                            const t = e.currentTarget;
                            if (!t.src.includes("hero.webp") && !t.src.includes("cover.webp")) {
                              t.src = `/demo/${theme.id}/hero.webp`;
                            } else if (t.src.includes("hero.webp")) {
                              t.src = `/demo/${theme.id}/cover.webp`;
                            }
                          }}
                        />
                        <div className="dm-glare"></div>
                      </div>

                      {/* Hover overlay — inside dm-tablet, covers tablet only */}
                      <Link
                        href={`/demo/${theme.id}`}
                        target="_blank"
                        className="dm-overlay"
                        aria-label={`Preview ${theme.name}`}
                      >
                        <span className="dm-overlay-btn">BUKA PREVIEW</span>
                      </Link>
                    </div>

                    {/* Phone frame — overlap bottom-left */}
                    <div className="dm-phone">
                      <div className="dm-phone-notch"></div>
                      <div className="dm-phone-screen">
                        <img
                          src={theme.thumbnailMobile || `/demo/${theme.id}/thumbnail_mobile.webp`}
                          alt={`${theme.name} Mobile`}
                          onError={(e) => {
                            const t = e.currentTarget;
                            if (!t.src.includes("cover.webp") && !t.src.includes("hero.webp")) {
                              t.src = `/demo/${theme.id}/cover.webp`;
                            } else if (t.src.includes("cover.webp")) {
                              t.src = `/demo/${theme.id}/hero.webp`;
                            }
                          }}
                        />
                        <div className="dm-glare"></div>
                      </div>
                    </div>
                  </div>

                  {/* ── Theme Info ── */}
                  <div className="catalog-info">
                    <div className="catalog-info-meta">
                      <p className="catalog-series">{theme.series}</p>
                      <h3 className="catalog-name">{theme.name}</h3>
                      <p className="catalog-desc">{theme.desc}</p>
                    </div>
                    <span className={`catalog-badge ${theme.category}`}>
                      {theme.category}
                    </span>
                  </div>

                  {/* ── CTA ── */}
                  <div className="catalog-action">
                    <Link
                      href={`/demo/${theme.id}`}
                      target="_blank"
                      className="catalog-btn-demo"
                    >
                      Lihat Demo
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Showcase Fitur & Sistem Hari-H */
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Meja Resepsionis & QR Scanner */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-xl hover:border-amber-400/50 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Day-of-Event Tech
                  </span>
                  <span className="text-xs text-stone-400 font-medium">Kamera / Scanner</span>
                </div>

                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-800 mb-4 border border-amber-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>

                <h3 className="text-lg font-bold text-stone-900 mb-2">Meja Resepsionis & QR Scanner</h3>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">
                  Sistem pemindai QR E-ticket tamu untuk panitia penerima tamu di venue, dilengkapi pencatatan kehadiran, alokasi nomor meja, dan proteksi scan ganda.
                </p>

                <ul className="space-y-2 mb-6 text-xs text-stone-600 border-t border-stone-100 pt-4">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Generator Tiket QR Kustom & Unduh PNG</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Deteksi Kamera Laptop & iPad Stand</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Audio Beep Chime & Info Meja Otomatis</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/demo/receptionist"
                target="_blank"
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl text-center transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <span>Coba Demo Resepsionis</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Card 2: Buku Tamu Foto Digital (Share Moment) */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-xl hover:border-amber-400/50 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Guest Interaction
                  </span>
                  <span className="text-xs text-stone-400 font-medium">Mobile Camera</span>
                </div>

                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-800 mb-4 border border-amber-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                <h3 className="text-lg font-bold text-stone-900 mb-2">Buku Tamu Foto Digital</h3>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">
                  Portal kamera mandiri bagi tamu di venue untuk mengambil foto selfie dan mengirimkan ucapan doa secara langsung dari smartphone mereka tanpa download aplikasi.
                </p>

                <ul className="space-y-2 mb-6 text-xs text-stone-600 border-t border-stone-100 pt-4">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Simulasi Upload Momen Instan & Cepat</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Terhubung Otomatis ke Galeri Kenangan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Dukungan Kamera Ponsel & Galeri Gambar</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/demo/sharemoment"
                target="_blank"
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl text-center transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <span>Coba Kamera Tamu</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Card 3: Galeri Kenangan Tamu (Memories Live Feed) */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-xl hover:border-amber-400/50 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Display & Archive
                  </span>
                  <span className="text-xs text-stone-400 font-medium">Live Feed</span>
                </div>

                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-800 mb-4 border border-amber-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <h3 className="text-lg font-bold text-stone-900 mb-2">Galeri Kenangan Tamu</h3>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">
                  Feed foto kebersamaan tamu yang mengalir secara live, siap diproyeksikan pada layar proyektor atau TV LED panggung ballroom pernikahan.
                </p>

                <ul className="space-y-2 mb-6 text-xs text-stone-600 border-t border-stone-100 pt-4">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Tampilan Masonry Card Elegan & Responsif</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Simulasi Unduh Arsip ZIP Resolusi Tinggi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Sinkronisasi Instan dari Sesi Kamera Tamu</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/demo/memories"
                target="_blank"
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl text-center transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <span>Lihat Galeri Kenangan</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
