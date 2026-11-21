"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export interface PortfolioGalleryItem {
  id: string;
  coupleName: string;
  themeId: string;
  themeName?: string;
  eventType?: string;
  canUseTheme?: boolean;
  hasMultipleEvents?: boolean;
  category: "minimalist" | "traditional" | "modern" | string;
  coverImage: string;
  publicUrl: string;
}

interface PortfolioGalleryProps {
  items: PortfolioGalleryItem[];
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Pernikahan",
  PERSONAL: "Personal & Keluarga",
  EVENT: "Acara & Event Umum",
};

const EVENT_FILTER_ORDER = ["WEDDING", "PERSONAL", "EVENT"] as const;

function normalizePortfolioEventType(raw?: string | null): "WEDDING" | "PERSONAL" | "EVENT" {
  const upper = (raw || "WEDDING").trim().toUpperCase();
  if (upper === "EVENT") return "EVENT";
  if (upper === "PERSONAL") return "PERSONAL";
  return "WEDDING";
}

const INITIAL_LIMIT = 18; // 6 columns x 3 rows = 18 items max on desktop

export function PortfolioGallery({ items }: PortfolioGalleryProps) {
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_LIMIT);
  const [platformName, setPlatformName] = useState("Platform Undangan");

  useEffect(() => {
    fetch("/api/public/settings").then(r => r.json()).then(d => {
      if (d?.platformName) setPlatformName(d.platformName);
    }).catch(() => {});
  }, []);

  const availableEventTypes = EVENT_FILTER_ORDER.filter((ev) =>
    items.some((item) => normalizePortfolioEventType(item.eventType) === ev),
  );

  // Filter items by eventType first, then by category
  const eventFilteredItems = items.filter((item) => {
    const itemEvent = normalizePortfolioEventType(item.eventType);
    return selectedEvent === "all" || itemEvent === selectedEvent.toUpperCase();
  });

  const filteredItems = eventFilteredItems.filter((item) => {
    return selectedCategory === "all" || item.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const displayedItems = filteredItems.slice(0, visibleCount);
  const hasMore = filteredItems.length > visibleCount;

  const handleShowAll = () => {
    setVisibleCount(filteredItems.length);
  };

  const handleEventChange = (ev: string) => {
    setSelectedEvent(ev);
    setVisibleCount(INITIAL_LIMIT);
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
          Jadilah yang pertama menerbitkan mahakarya undangan digital eksklusif bersama {platformName}.
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
      <div className="space-y-2.5">
        {/* Level 1: Event Type Filter Pills (tampil bila ada lebih dari 1 jenis acara di portofolio) */}
        {availableEventTypes.length > 1 && (
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none px-4 -mx-4 sm:mx-0 sm:px-0 justify-start sm:justify-center-safe flex-nowrap py-1">
            <button
              type="button"
              onClick={() => handleEventChange("all")}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                selectedEvent === "all"
                  ? "bg-amber-900 text-white shadow-xs"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
              }`}
            >
              Semua Acara ({items.length})
            </button>
            {availableEventTypes.map((ev) => (
              <button
                key={ev}
                type="button"
                onClick={() => handleEventChange(ev)}
                className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedEvent === ev
                    ? "bg-amber-900 text-white shadow-xs"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                }`}
              >
                {EVENT_TYPE_LABELS[ev] || ev}
              </button>
            ))}
          </div>
        )}

        {/* Level 2: Category Filter Pills — Horizontal Swipe Rail on Mobile, Centered on Desktop */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-4 -mx-4 sm:mx-0 sm:px-0 justify-start sm:justify-center-safe flex-nowrap py-1">
          <button
            type="button"
            onClick={() => handleCategoryChange("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              selectedCategory === "all"
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            Semua Gaya ({eventFilteredItems.length})
          </button>
          <button
            type="button"
            onClick={() => handleCategoryChange("minimalist")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              selectedCategory === "minimalist"
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            Minimalis
          </button>
          <button
            type="button"
            onClick={() => handleCategoryChange("traditional")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
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
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              selectedCategory === "modern"
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            Modern
          </button>
        </div>
      </div>

      {/* 6-Columns Responsive Grid Layout (Desktop: 6 cols, Mobile: 2 cols, Tablet: 3-4 cols) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 lg:gap-5">
        {displayedItems.map((item) => {
          const eventKey = normalizePortfolioEventType(item.eventType);
          const eventLabel = EVENT_TYPE_LABELS[eventKey] || eventKey;
          const displayThemeName = item.themeName || item.themeId;

          return (
            <div
              key={item.id}
              className="group flex flex-col justify-between bg-white border border-[#eadecf]/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              {/* cover.webp hanya foto sampul (bukan tangkapan layar), jadi bingkai HP meniru layar pembuka undangan: sampul penuh + nama. */}
              <a
                href={item.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="flex justify-center bg-stone-100/70 px-[14%] pt-4 pb-3.5 sm:pt-5 sm:pb-4 relative">
                  <div className="relative w-full aspect-[9/18.5] rounded-[20px] bg-stone-900 p-[4px] shadow-lg shadow-stone-900/25 ring-1 ring-stone-900/10">
                    <div className="relative h-full w-full overflow-hidden rounded-[16px] bg-stone-800">
                      <img
                        src={item.coverImage}
                        alt={item.coupleName}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80" />
                      <span className="absolute top-1.5 left-1/2 -translate-x-1/2 h-[6px] w-[32%] rounded-full bg-stone-900" />

                      <div className="absolute bottom-3 left-2 right-2 text-center text-white">
                        <h3 className="text-[11px] sm:text-xs font-serif font-bold text-white tracking-tight line-clamp-3 leading-snug drop-shadow-xs">
                          {item.coupleName}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              </a>

              {/* Meta & Action Bar */}
              <div className="p-2.5 bg-white border-t border-stone-100 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-1 px-0.5">
                  <span className="text-[10px] font-semibold text-stone-500 truncate" title={displayThemeName ? `Tema ${displayThemeName}` : undefined}>
                    {displayThemeName ? `Tema ${displayThemeName}` : "Portofolio"}
                  </span>
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/70">
                    {eventLabel}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <a
                    href={item.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-[11px] font-bold text-stone-800 transition flex items-center justify-center gap-1"
                  >
                    <span>Buka Undangan</span>
                  </a>

                  {item.canUseTheme && item.themeId && (
                    <Link
                      href={`/packages?theme=${encodeURIComponent(item.themeId)}&event=${encodeURIComponent(eventKey)}`}
                      className="w-full py-1.5 px-2 rounded-lg bg-stone-900 hover:bg-amber-900 text-white text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <span>Gunakan Tema Ini</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
