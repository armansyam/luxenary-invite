"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

interface ThemeItem {
  id: string;
  name: string;
  series: string;
  category: "premium" | "traditional" | "modern" | string;
  desc: string;
}

export default function CatalogGridShowcase() {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"mobile" | "desktop">("mobile");
  const [loading, setLoading] = useState(true);
  const [platformName, setPlatformName] = useState("Platform Undangan");

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
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans pb-24" style={{ colorScheme: "only light", backgroundColor: "#faf8f5", color: "#1c1917" }}>
      {/* Top Navigation & Brand Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40" style={{ colorScheme: "only light", backgroundColor: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <BrandLogo size="sm" lightBg />
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight group-hover:text-amber-900 transition">KATALOG TEMA</h1>
              <p className="text-[11px] text-stone-500 font-medium">Koleksi Desain Undangan Pernikahan Digital</p>
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
        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
          Official Portfolio Catalog
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

        {/* View Mode Toggle (Desktop / Mobile) */}
        <div className="flex items-center justify-center mt-6">
          <div className="bg-stone-100 p-1 rounded-full inline-flex border border-stone-200">
            <button
              onClick={() => setViewMode("mobile")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                viewMode === "mobile" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Mobile View
            </button>
            <button
              onClick={() => setViewMode("desktop")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                viewMode === "desktop" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Desktop View
            </button>
          </div>
        </div>
      </section>

      {/* Grid Showcase */}
      <section className="max-w-[1740px] mx-auto px-4 sm:px-6 mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredThemes.length === 0 ? (
          <div className="text-center py-20 text-stone-500 text-sm">
            Tidak ada tema yang ditemukan pada kategori ini.
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3.5 sm:gap-4 transition-all duration-300">
            {filteredThemes.map((theme) => (
              <div
                key={theme.id}
                className={`bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-300 group flex-grow-0 shrink-0 ${
                  viewMode === "mobile"
                    ? "w-[calc(50%-0.5rem)] sm:w-[185px]"
                    : "w-full sm:w-[calc(50%-1rem)] lg:w-[360px]"
                }`}
              >
                {/* Fake Browser Top Bar (Mac Style - Compact) */}
                <div className="bg-[#181615] px-2.5 py-1.5 border-b border-stone-800 flex items-center justify-between select-none">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#ff5f56] inline-block"></span>
                    <span className="w-2 h-2 rounded-full bg-[#ffbd2e] inline-block"></span>
                    <span className="w-2 h-2 rounded-full bg-[#27c93f] inline-block"></span>
                  </div>
                  <span className="text-[9px] font-mono text-stone-400 truncate max-w-[85px]">
                    {theme.id}
                  </span>
                  <span className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase tracking-wider ${
                    theme.category === "traditional" ? "bg-amber-900/60 text-amber-300 border border-amber-700/50" :
                    theme.category === "modern" ? "bg-cyan-950/70 text-cyan-300 border border-cyan-800/50" :
                    "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}>
                    {theme.category}
                  </span>
                </div>

                {/* Snapshot Theme View Frame (Rasio Presisi: Mobile 390/844 & Desktop 16/9) */}
                <Link
                  href={`/demo/${theme.id}`}
                  target="_blank"
                  className={`relative bg-stone-950 overflow-hidden block cursor-pointer transition-all duration-500 group ${
                    viewMode === "mobile" ? "aspect-[390/844]" : "aspect-[16/9]"
                  }`}
                >
                  <img
                    key={`${theme.id}-${viewMode}`}
                    src={
                      viewMode === "mobile"
                        ? `/demo/${theme.id}/thumbnail_mobile.webp`
                        : `/demo/${theme.id}/thumbnail_desktop.webp`
                    }
                    alt={`${theme.name} Preview`}
                    loading="lazy"
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
                    onError={(e) => {
                      const target = e.currentTarget;
                      // Auto-fallback berjenjang: thumbnail -> cover.webp -> hero.webp
                      if (!target.src.includes("cover.webp") && !target.src.includes("hero.webp")) {
                        target.src = `/demo/${theme.id}/cover.webp`;
                      } else if (target.src.includes("cover.webp")) {
                        target.src = `/demo/${theme.id}/hero.webp`;
                      }
                    }}
                  />

                  {/* Subtle Hover Action Overlay */}
                  <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2 z-10">
                    <span className="px-3 py-1.5 bg-white text-stone-900 font-bold text-[11px] rounded-full shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
                      Buka ↗
                    </span>
                  </div>
                </Link>

                {/* Card Info & Action Button (Compact) */}
                <div className="p-2.5 space-y-2 bg-white">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-bold text-stone-900 text-xs sm:text-sm truncate">{theme.name}</h3>
                      <span className="text-[10px] font-semibold text-stone-500 shrink-0">{theme.series}</span>
                    </div>
                    <p className="text-[10px] text-stone-400 font-medium line-clamp-1 mt-0.5">{theme.desc}</p>
                  </div>

                  {/* Single Clean Action Button */}
                  <div className="pt-0.5">
                    <Link
                      href={`/demo/${theme.id}`}
                      target="_blank"
                      className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg text-[10px] text-center transition block shadow-2xs tracking-wider cursor-pointer"
                    >
                      PREVIEW
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
