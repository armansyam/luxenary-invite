"use client";

import { useState } from "react";
import Link from "next/link";

interface ThemeItem {
  id: string;
  name: string;
  series: string;
  category: "premium" | "traditional" | "modern";
  desc: string;
}

const THEMES: ThemeItem[] = [
  {
    id: "kalandra",
    name: "Kalandra",
    series: "Premium Series",
    category: "premium",
    desc: "Modern, Elegan & Minimalis",
  },
  {
    id: "valente",
    name: "Valente",
    series: "Premium Series",
    category: "premium",
    desc: "High-Fashion, Editorial & Mewah",
  },
  {
    id: "aurelia",
    name: "Aurelia",
    series: "Premium Series",
    category: "premium",
    desc: "Romantis, Sinematik & Anggun",
  },
  {
    id: "artisan",
    name: "Artisan",
    series: "Premium Series",
    category: "premium",
    desc: "Artistik, Hangat & Vintage",
  },
  {
    id: "prameswari",
    name: "Prameswari",
    series: "Traditional Series",
    category: "traditional",
    desc: "Sakral, Megah & Royal Keraton",
  },
  {
    id: "wave",
    name: "Wave",
    series: "Modern Series",
    category: "modern",
    desc: "Dark, Moody & Dramatic — Gelombang Elegan",
  },
];

export default function CatalogGridShowcase() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredThemes = selectedCategory === "all"
    ? THEMES
    : THEMES.filter((t) => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans pb-24">
      {/* Top Navigation & Brand Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <span className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-serif font-bold text-base group-hover:bg-amber-800 transition">
              L
            </span>
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight group-hover:text-amber-900 transition">LUXENARY INVITATION</h1>
              <p className="text-[11px] text-stone-500 font-medium">Katalog Koleksi Undangan Pernikahan Digital</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/register"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-full transition shadow-sm"
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
          Setiap tema dibangun dengan struktur visual unik, berkecepatan tinggi, dan dapat disesuaikan penuh dengan foto dan busana pernikahan Anda.
        </p>

        {/* Category Filter Tabs */}
        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
          {[
            { id: "all", label: "Semua Tema" },
            { id: "premium", label: "Premium Series" },
            { id: "modern", label: "Modern Series" },
            { id: "traditional", label: "Traditional Series" },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredThemes.map((theme) => (
            <div
              key={theme.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
            >
              {/* Browser Mockup Window Header */}
              <div className="bg-[#1e1c1a] p-3 border-b border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></span>
                </div>
                <span className="text-[10px] font-mono text-stone-400 truncate max-w-[140px]">
                  {theme.id}.luxenary.id
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  theme.category === "traditional" ? "bg-amber-800/80 text-amber-200" :
                  theme.category === "modern" ? "bg-slate-700/80 text-slate-200" :
                  "bg-purple-900/80 text-purple-200"
                }`}>
                  {theme.category === "traditional" ? "Traditional" : theme.category === "modern" ? "Modern" : "Premium"}
                </span>
              </div>

              {/* Live Scaled Preview Frame */}
              <div className="relative aspect-[9/14] bg-stone-900 overflow-hidden group">
                <iframe
                  src={`/demo/${theme.id}`}
                  className="w-[200%] h-[200%] transform scale-50 origin-top-left border-none pointer-events-none"
                  title={theme.name}
                  loading="lazy"
                />
              </div>

              {/* Info & Actions */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-stone-900 text-base">{theme.name}</h3>
                    <span className="text-[11px] font-medium text-stone-500">{theme.series}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 font-medium">{theme.desc}</p>
                </div>

                {/* Single Clean Action Button */}
                <div className="pt-2 border-t border-stone-100">
                  <Link
                    href={`/demo/${theme.id}`}
                    target="_blank"
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs text-center transition block shadow-xs tracking-wider"
                  >
                    PREVIEW
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
