"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export interface PortfolioGalleryItem {
  id: string;
  coupleName: string;
  themeId: string;
  category: "premium" | "traditional" | "modern" | string;
  coverImage: string;
  publicUrl: string;
}

interface PortfolioGalleryProps {
  items: PortfolioGalleryItem[];
}

const INITIAL_LIMIT = 18; // 6 columns x 3 rows = 18 items max on desktop

export function PortfolioGallery({ items }: PortfolioGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_LIMIT);
  const [platformName, setPlatformName] = useState("Platform Undangan");

  useEffect(() => {
    fetch("/api/public/settings").then(r => r.json()).then(d => {
      if (d?.platformName) setPlatformName(d.platformName);
    }).catch(() => {});
  }, []);

  // Filter items by category
  const filteredItems = items.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const displayedItems = filteredItems.slice(0, visibleCount);
  const hasMore = filteredItems.length > visibleCount;

  const handleShowAll = () => {
    setVisibleCount(filteredItems.length);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setVisibleCount(INITIAL_LIMIT);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-[#eadecf] rounded-3xl text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-900 mx-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-serif font-bold text-stone-900">
          Belum Ada Undangan yang Diterbitkan
        </h3>
        <p className="text-xs text-stone-600 leading-relaxed">
          Jadilah pasangan pertama yang menerbitkan mahakarya undangan pernikahan digital eksklusif bersama {platformName}.
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Mulai Buat Undangan Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Category Filter Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => handleCategoryChange("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            selectedCategory === "all"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Semua ({items.length})
        </button>
        <button
          type="button"
          onClick={() => handleCategoryChange("premium")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            selectedCategory === "premium"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Premium
        </button>
        <button
          type="button"
          onClick={() => handleCategoryChange("traditional")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            selectedCategory === "traditional"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Traditional
        </button>
        <button
          type="button"
          onClick={() => handleCategoryChange("modern")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            selectedCategory === "modern"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Modern
        </button>
      </div>

      {/* 6-Columns Responsive Grid Layout (Desktop: 6 cols, Mobile: 2 cols, Tablet: 3-4 cols) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 lg:gap-5">
        {displayedItems.map((item) => (
          <a
            key={item.id}
            href={item.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col bg-white border border-[#eadecf]/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            {/* Visual Cover Photo */}
            <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
              <img
                src={item.coverImage}
                alt={item.coupleName}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-75 group-hover:opacity-85 transition-opacity" />

              {/* Couple Name Overlay */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                <h3 className="text-xs sm:text-sm font-serif font-bold text-white tracking-tight line-clamp-2 leading-snug drop-shadow-xs">
                  {item.coupleName}
                </h3>
              </div>
            </div>

            {/* Direct Clean Action Bar */}
            <div className="p-2.5 bg-white text-center border-t border-stone-100">
              <span className="text-[11px] font-bold text-stone-800 group-hover:text-amber-900 transition flex items-center justify-center gap-1">
                Buka Undangan
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Lazy Loading "Tampilkan Semua Portofolio" Action Button */}
      {hasMore && (
        <div className="text-center pt-6">
          <button
            type="button"
            onClick={handleShowAll}
            className="px-8 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-full transition shadow-xs cursor-pointer hover:shadow-md"
          >
            Tampilkan Semua Portofolio ({filteredItems.length - visibleCount} Lainnya)
          </button>
        </div>
      )}
    </div>
  );
}
