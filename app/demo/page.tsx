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
  const [loading, setLoading] = useState(true);

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
              desc: t.tagline || t.desc || "Desain eksklusif Luxenary Invite",
            }))
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredThemes = selectedCategory === "all"
    ? themes
    : themes.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans pb-24">
      {/* Top Navigation & Brand Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40">
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
              href="/register"
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
      </section>

      {/* Grid Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredThemes.length === 0 ? (
          <div className="text-center py-20 text-stone-500 text-sm">
            Tidak ada tema yang ditemukan pada kategori ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredThemes.map((theme) => (
              <div
                key={theme.id}
                className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all duration-300 group"
              >
                {/* Fake Browser Top Bar (Mac Style) */}
                <div className="bg-[#181615] px-3 py-2.5 border-b border-stone-800 flex items-center justify-between select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block"></span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400 truncate max-w-[130px]">
                    {theme.id}.invitation
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    theme.category === "traditional" ? "bg-amber-900/60 text-amber-300 border border-amber-700/50" :
                    theme.category === "modern" ? "bg-cyan-950/70 text-cyan-300 border border-cyan-800/50" :
                    "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}>
                    {theme.category}
                  </span>
                </div>

                {/* Live Scaled HTML Theme View Frame with Auto-scroll Animation */}
                <Link
                  href={`/demo/${theme.id}`}
                  target="_blank"
                  className="relative aspect-[9/14] bg-stone-950 overflow-hidden block cursor-pointer"
                >
                  <iframe
                    src={`/demo/${theme.id}?autoplay=1`}
                    loading="lazy"
                    className="w-[200%] h-[200%] transform scale-50 origin-top-left border-none pointer-events-none select-none"
                    title={theme.name}
                  />
                </Link>

                {/* Card Info & Action Button */}
                <div className="p-4 space-y-3 bg-white">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-stone-900 text-base">{theme.name}</h3>
                      <span className="text-[11px] font-semibold text-stone-600">{theme.series}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1 font-medium line-clamp-1">{theme.desc}</p>
                  </div>

                  {/* Plan Tier Badge */}
                  <div className="text-[10px] font-semibold rounded-lg px-2.5 py-1 flex items-center justify-between bg-stone-50 border border-stone-200">
                    <span className="text-stone-500">Tersedia di:</span>
                    <span className={`font-bold ${
                      theme.category === "traditional" ? "text-amber-800" :
                      theme.category === "modern" ? "text-slate-800" : "text-purple-800"
                    }`}>
                      {theme.category === "traditional" ? "Paket Traditional, Modern, Premium" :
                       theme.category === "modern" ? "Paket Modern & Premium" : "Eksklusif Paket Premium"}
                    </span>
                  </div>

                  {/* Single Clean Action Button */}
                  <div className="pt-1">
                    <Link
                      href={`/demo/${theme.id}`}
                      target="_blank"
                      className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs text-center transition block shadow-sm tracking-wider cursor-pointer"
                    >
                      PREVIEW TEMA
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
