/**
 * BrandLogo — Komponen logo terpusat.
 * Membaca dari /assets/brand/logo.webp jika ada,
 * fallback ke monogram huruf "L" jika belum diupload.
 *
 * Penggunaan:
 *   <BrandLogo />                  → default (size md, dark bg)
 *   <BrandLogo size="sm" />        → kecil
 *   <BrandLogo lightBg />          → untuk latar terang (teks gelap)
 *   <BrandLogo showName />         → tampilkan nama platform di samping logo
 *   <BrandLogo showName lightBg /> → logo + nama, latar terang
 */

"use client";

import { useState } from "react";

type BrandLogoSize = "xs" | "sm" | "md" | "lg";

interface BrandLogoProps {
  size?: BrandLogoSize;
  lightBg?: boolean;   // true = latar terang (teks gelap), false = latar gelap (teks putih)
  showName?: boolean;  // tampilkan teks nama platform di samping logo
  brandName?: string;  // nama platform kustom / dinamis
  className?: string;
}

const sizeMap: Record<BrandLogoSize, { container: string; img: string; monogram: string }> = {
  xs: { container: "w-6 h-6 rounded-md",   img: "w-6 h-6",   monogram: "text-xs" },
  sm: { container: "w-8 h-8 rounded-lg",   img: "w-8 h-8",   monogram: "text-sm" },
  md: { container: "w-10 h-10 rounded-xl", img: "w-10 h-10", monogram: "text-xl" },
  lg: { container: "w-14 h-14 rounded-2xl",img: "w-14 h-14", monogram: "text-3xl" },
};

const LOGO_URL = "/assets/brand/logo.webp";

export function BrandLogo({ size = "md", lightBg = false, showName = false, brandName, className = "" }: BrandLogoProps) {
  const [imgError, setImgError] = useState(false);
  const s = sizeMap[size];

  const hasLogo = !imgError; // akan false setelah img onError
  const displayName = brandName || "Luxenary Invite";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo image atau monogram fallback */}
      <div
        className={`${s.container} flex items-center justify-center overflow-hidden shrink-0 ${
          hasLogo ? "" : lightBg
            ? "bg-amber-800"
            : "bg-gradient-to-tr from-amber-700 to-amber-500"
        } shadow-sm`}
      >
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={LOGO_URL}
            alt="Logo"
            className={`${s.img} object-contain`}
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={`font-bold font-serif text-white ${s.monogram}`}>
            {displayName.charAt(0).toUpperCase() || "L"}
          </span>
        )}
      </div>

      {/* Nama platform opsional */}
      {showName && (
        <span
          className={`font-bold tracking-wider font-serif ${
            size === "xs" || size === "sm" ? "text-sm" : "text-xl"
          } ${lightBg ? "text-amber-900" : "text-white"}`}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}
