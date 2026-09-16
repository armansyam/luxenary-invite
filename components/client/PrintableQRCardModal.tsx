"use client";

import React, { useState, useRef } from "react";
import QRCode from "react-qr-code";

export interface PrintableQRCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: any;
  shareMomentUrl: string;
  onInvitationUpdated?: (updatedInv: any) => void;
}

export type CardSize = "A3" | "A4" | "A5" | "4R";
export type CardLayoutStyle = "warm_editorial" | "modern_minimalist" | "royal_heritage" | "retro_polaroid";

interface SizeConfig {
  id: CardSize;
  name: string;
  dimensions: string;
  description: string;
  canvasWidth: number;
  canvasHeight: number;
  aspectRatio: string;
}

const SIZE_PRESETS: Record<CardSize, SizeConfig> = {
  A3: {
    id: "A3",
    name: "A3 (Standing Banner / Easel)",
    dimensions: "29.7 × 42.0 cm",
    description: "Standing frame/easel kayu di samping resepsionis atau gerbang masuk",
    canvasWidth: 2480,
    canvasHeight: 3508,
    aspectRatio: "1 / 1.414",
  },
  A4: {
    id: "A4",
    name: "A4 (Table Standee)",
    dimensions: "21.0 × 29.7 cm",
    description: "Ukuran standar untuk akrilik di meja buffet, meja kado, atau meja photobooth",
    canvasWidth: 2480,
    canvasHeight: 3508,
    aspectRatio: "1 / 1.414",
  },
  A5: {
    id: "A5",
    name: "A5 (Tent Card Meja Tamu)",
    dimensions: "14.8 × 21.0 cm",
    description: "Kartu lipat segitiga di atas masing-masing meja makan tamu VIP",
    canvasWidth: 1748,
    canvasHeight: 2480,
    aspectRatio: "1 / 1.414",
  },
  "4R": {
    id: "4R",
    name: "4R (Mini Akrilik)",
    dimensions: "10.2 × 15.2 cm",
    description: "Ukuran postcard untuk akrilik minimalis di meja bundar tamu",
    canvasWidth: 1200,
    canvasHeight: 1800,
    aspectRatio: "2 / 3",
  },
};

const CARD_LAYOUTS: { id: CardLayoutStyle; name: string; tag: string; desc: string }[] = [
  {
    id: "warm_editorial",
    name: "Warm Editorial (Morements)",
    tag: "Populer",
    desc: "Nuansa warm ivory, rounded card mewah, dan tipografi bold editorial serif.",
  },
  {
    id: "modern_minimalist",
    name: "Modern Minimalist",
    tag: "Clean",
    desc: "Monokrom studio putih bersih, garis pemisah presisi, dan sans-serif kontemporer.",
  },
  {
    id: "royal_heritage",
    name: "Royal Arch Heritage",
    tag: "Klasik",
    desc: "Bingkai kubah lengkung emas lembut (gold arch) dengan tipografi roman elegan.",
  },
  {
    id: "retro_polaroid",
    name: "Retro Film Polaroid",
    tag: "Vintage",
    desc: "Frame polaroid instan vintage lengkap dengan foto pasangan & stempel tanggal analog.",
  },
];

export default function PrintableQRCardModal({
  isOpen,
  onClose,
  invitation,
  shareMomentUrl,
  onInvitationUpdated,
}: PrintableQRCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Parse Feature Settings
  const initialFs = (() => {
    try {
      return typeof invitation?.featureSettings === "object"
        ? invitation.featureSettings
        : JSON.parse(invitation?.featureSettings || "{}");
    } catch {
      return {};
    }
  })();

  const [selectedSize, setSelectedSize] = useState<CardSize>("A4");
  const [selectedCardLayout, setSelectedCardLayout] = useState<CardLayoutStyle>(
    initialFs?.memoriesCardLayout || "warm_editorial"
  );

  const [eyebrowText, setEyebrowText] = useState(initialFs?.memoriesCardEyebrow || "KAMERA KENANGAN TAMU");
  const [instructionText, setInstructionText] = useState(
    initialFs?.memoriesCardInstruction || "Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda."
  );

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasValidDomain = !!(invitation?.subdomain?.trim() || invitation?.customDomain?.trim());
  const isPublished = invitation?.status === "PUBLISHED";
  const canGenerateQr = hasValidDomain && isPublished && Boolean(shareMomentUrl && shareMomentUrl.trim());

  const coupleTitle = `${invitation?.groomNickname || "Mempelai Pria"} & ${invitation?.brideNickname || "Mempelai Wanita"}`;

  // Format Tanggal Acara
  const eventDateFormatted = (() => {
    try {
      if (invitation?.eventData) {
        const parsed = typeof invitation.eventData === "string" ? JSON.parse(invitation.eventData) : invitation.eventData;
        const list = Array.isArray(parsed) ? parsed : parsed?.events;
        if (Array.isArray(list) && list[0]?.date) {
          const d = new Date(list[0].date);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).toUpperCase();
          }
        }
      }
    } catch {}
    return "HARI BAHAGIA KAMI";
  })();

  // Simpan Perubahan Pengaturan ke Database
  const persistFeatureSettings = async (overrides: Record<string, any>) => {
    if (!invitation?.id) return;
    setIsSavingSettings(true);
    try {
      const nextFs = {
        ...initialFs,
        memoriesCardLayout: selectedCardLayout,
        memoriesCardEyebrow: eyebrowText,
        memoriesCardInstruction: instructionText,
        ...overrides,
      };

      const res = await fetch(`/api/client/invitations/${invitation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureSettings: nextFs }),
      });

      if (res.ok) {
        const updated = await res.json();
        if (onInvitationUpdated) onInvitationUpdated(updated);
        setStatusNotice("Pengaturan kartu berhasil disimpan!");
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch {
      alert("Gagal menyimpan pengaturan kartu.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Pilih Model Kartu Cetak
  const handleSelectCardLayout = (layoutId: CardLayoutStyle) => {
    setSelectedCardLayout(layoutId);
    persistFeatureSettings({ memoriesCardLayout: layoutId });
  };

  // Ekspor Resolusi Tinggi 300 DPI Canvas
  const handleDownloadHighResPng = async () => {
    if (!canGenerateQr) return;
    setIsGeneratingPng(true);
    try {
      const preset = SIZE_PRESETS[selectedSize];
      const canvas = document.createElement("canvas");
      canvas.width = preset.canvasWidth;
      canvas.height = preset.canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak didukung.");

      // 1. Background Sesuai Model Layout
      if (selectedCardLayout === "warm_editorial") {
        ctx.fillStyle = "#f5f2eb";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (selectedCardLayout === "modern_minimalist") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Border hairline
        ctx.strokeStyle = "#e5e5e5";
        ctx.lineWidth = canvas.width * 0.004;
        ctx.strokeRect(canvas.width * 0.04, canvas.height * 0.03, canvas.width * 0.92, canvas.height * 0.94);
      } else if (selectedCardLayout === "royal_heritage") {
        ctx.fillStyle = "#fdfbf7";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Gold Border Arch
        ctx.strokeStyle = "#c5a880";
        ctx.lineWidth = canvas.width * 0.006;
        ctx.strokeRect(canvas.width * 0.04, canvas.height * 0.03, canvas.width * 0.92, canvas.height * 0.94);
      } else {
        // retro_polaroid
        ctx.fillStyle = "#f3eee5";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const margin = canvas.width * 0.06;
      const innerW = canvas.width - margin * 2;

      // 2. White Container for QR
      const qrBoxSize = innerW * 0.70;
      const qrBoxX = (canvas.width - qrBoxSize) / 2;
      const qrBoxY = margin + canvas.height * 0.05;
      const qrBoxRadius = selectedCardLayout === "royal_heritage" ? canvas.width * 0.12 : canvas.width * 0.04;

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
      ctx.shadowBlur = canvas.width * 0.02;
      ctx.shadowOffsetY = canvas.height * 0.01;

      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
      ctx.fill();
      ctx.restore();

      // Draw QR Code from SVG
      if (cardRef.current) {
        const svg = cardRef.current.querySelector("svg");
        if (svg) {
          const svgData = new XMLSerializer().serializeToString(svg);
          const qrImg = new Image();
          await new Promise((resolve, reject) => {
            qrImg.onload = () => {
              const qrPadding = qrBoxSize * 0.09;
              ctx.drawImage(
                qrImg,
                qrBoxX + qrPadding,
                qrBoxY + qrPadding,
                qrBoxSize - qrPadding * 2,
                qrBoxSize - qrPadding * 2
              );
              resolve(true);
            };
            qrImg.onerror = reject;
            qrImg.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
          });
        }
      }

      // 3. Eyebrow Header
      const contentStartY = qrBoxY + qrBoxSize + canvas.height * 0.06;
      ctx.fillStyle = selectedCardLayout === "royal_heritage" ? "#9b784e" : "#6b625b";
      ctx.font = `700 ${canvas.width * 0.028}px sans-serif`;
      ctx.textAlign = "center";
      ctx.letterSpacing = "6px";
      ctx.fillText(eyebrowText.toUpperCase(), canvas.width / 2, contentStartY);

      // 4. Headline / Couple Name
      ctx.fillStyle = "#26211d";
      ctx.font = selectedCardLayout === "modern_minimalist"
        ? `bold ${canvas.width * 0.052}px sans-serif`
        : `bold ${canvas.width * 0.056}px serif`;
      ctx.letterSpacing = selectedCardLayout === "modern_minimalist" ? "2px" : "1px";
      ctx.fillText(`${coupleTitle.toUpperCase()}`, canvas.width / 2, contentStartY + canvas.height * 0.045);

      // 5. Date Subtitle
      ctx.fillStyle = selectedCardLayout === "royal_heritage" ? "#a3825a" : "#7c7269";
      ctx.font = `600 ${canvas.width * 0.024}px sans-serif`;
      ctx.letterSpacing = "3px";
      ctx.fillText(eventDateFormatted, canvas.width / 2, contentStartY + canvas.height * 0.08);

      // 6. Descriptive Instructions
      ctx.fillStyle = "#4a423d";
      ctx.font = `normal ${canvas.width * 0.028}px sans-serif`;
      ctx.letterSpacing = "0px";
      ctx.fillText(instructionText, canvas.width / 2, contentStartY + canvas.height * 0.125);

      // 7. Footer Watermark Branding
      ctx.fillStyle = "#8a8077";
      ctx.font = `bold ${canvas.width * 0.022}px serif`;
      ctx.letterSpacing = "4px";
      ctx.fillText("LUXENARY · MOMENTS", canvas.width / 2, canvas.height - margin - canvas.height * 0.02);

      // Instant Download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.download = `Kartu-Meja-QR-${selectedSize}-${selectedCardLayout}-${invitation?.groomSlug || "wedding"}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err: any) {
      alert("Gagal mengunduh kartu cetak: " + err.message);
    } finally {
      setIsGeneratingPng(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <header className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
                Studio Desain Kartu Cetak & Standing Banner QR
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Pilihan model kartu cetak barcode (A3, A4, A5, 4R) siap cetak 300 DPI untuk standing easel dan kartu tamu.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Status Notice */}
        {statusNotice && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5 text-xs text-emerald-800 font-medium flex items-center justify-between">
            <span>✓ {statusNotice}</span>
          </div>
        )}

        {/* Modal Body: Two Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Card Mockup & Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-stone-100/70 p-4 sm:p-6 rounded-2xl border border-stone-200/80">
            {/* Dynamic Card Frame based on Selected Card Layout */}
            <div
              ref={cardRef}
              className={`w-full max-w-[320px] sm:max-w-[340px] rounded-[24px] p-6 shadow-xl flex flex-col items-center justify-between text-center select-none transition-all duration-300 relative ${
                selectedCardLayout === "warm_editorial"
                  ? "bg-[#f5f2eb] border border-stone-300/60"
                  : selectedCardLayout === "modern_minimalist"
                  ? "bg-white border-2 border-stone-200"
                  : selectedCardLayout === "royal_heritage"
                  ? "bg-[#fdfbf7] border-2 border-[#c5a880]/60 ring-4 ring-[#c5a880]/10"
                  : "bg-[#f3eee5] border-2 border-stone-300 shadow-md"
              }`}
              style={{
                aspectRatio: SIZE_PRESETS[selectedSize].aspectRatio,
              }}
            >
              {/* Badge Ukuran & Model */}
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <span className="bg-stone-900/80 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                  {selectedSize}
                </span>
              </div>

              {/* QR Container in Card */}
              <div className="w-full pt-4 flex flex-col items-center">
                <div
                  className={`p-4 rounded-2xl shadow-sm max-w-[190px] w-full aspect-square flex flex-col items-center justify-center text-center ${
                    selectedCardLayout === "royal_heritage"
                      ? "bg-white border-2 border-[#c5a880]/40 rounded-t-[50px]"
                      : "bg-white border border-stone-200/80"
                  }`}
                >
                  {canGenerateQr ? (
                    <QRCode
                      value={shareMomentUrl}
                      size={160}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox="0 0 160 160"
                      fgColor="#26211d"
                    />
                  ) : (
                    <div className="w-full h-full border-2 border-dashed border-stone-300 rounded-xl p-3 flex flex-col items-center justify-center bg-stone-50/60 select-none">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-1.5 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" />
                        </svg>
                      </div>
                      <span className="font-mono text-[9px] font-bold text-stone-700 tracking-wider uppercase block">
                        {!hasValidDomain ? "SUBDOMAIN KOSONG" : "QR BELUM TERBIT"}
                      </span>
                      <span className="text-[8px] text-stone-500 leading-tight mt-1">
                        {!hasValidDomain
                          ? "Atur subdomain di Pengaturan"
                          : "Otomatis terbit setelah undangan dipublikasikan"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Typography Content */}
              <div className="space-y-2 my-auto py-3">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.25em] ${
                    selectedCardLayout === "royal_heritage" ? "text-[#9b784e]" : "text-[#6b625b]"
                  }`}
                >
                  {eyebrowText}
                </p>
                <h3
                  className={`text-lg sm:text-xl font-bold leading-snug text-[#26211d] ${
                    selectedCardLayout === "modern_minimalist" ? "font-sans tracking-tight" : "font-serif"
                  }`}
                >
                  {coupleTitle}
                </h3>
                <p className="text-[9px] font-sans font-semibold uppercase tracking-[0.2em] text-[#7c7269]">
                  {eventDateFormatted}
                </p>
                <p className="text-[10px] text-[#4a423d] leading-relaxed max-w-[240px] mx-auto pt-1 font-sans">
                  {instructionText}
                </p>
              </div>

              {/* Footer Watermark */}
              <div className="pt-2 text-[9px] font-serif font-bold tracking-[0.2em] text-[#8a8077] uppercase">
                LUXENARY · MOMENTS
              </div>
            </div>

            <p className="text-[11px] text-stone-400 mt-3 text-center">
              Pratinjau fisik: Model{" "}
              <span className="font-semibold text-stone-700">
                {CARD_LAYOUTS.find((l) => l.id === selectedCardLayout)?.name}
              </span>{" "}
              · Ukuran <span className="font-semibold text-stone-700">{selectedSize}</span>
            </p>
          </div>

          {/* Right Column: Single Focused Print Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. Model Layout Kartu */}
            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1.5">
                1. Pilih Desain / Model Layout Kartu:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CARD_LAYOUTS.map((layout) => {
                  const isSelected = selectedCardLayout === layout.id;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() => handleSelectCardLayout(layout.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs"
                          : "border-stone-200 hover:border-stone-300 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-stone-900 leading-tight">
                            {layout.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 leading-snug line-clamp-2">
                          {layout.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-amber-700 mt-1">✓ Terpilih</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Ukuran Kertas */}
            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1.5">
                2. Pilih Ukuran Format Cetak:
              </label>
              <div className="space-y-1.5">
                {(Object.keys(SIZE_PRESETS) as CardSize[]).map((sizeKey) => {
                  const preset = SIZE_PRESETS[sizeKey];
                  const isSelected = selectedSize === sizeKey;
                  return (
                    <button
                      key={sizeKey}
                      type="button"
                      onClick={() => setSelectedSize(sizeKey)}
                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20"
                          : "border-stone-200 hover:border-stone-300 bg-white"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-stone-900">{preset.name}</span>
                        <span className="text-[10px] font-mono text-stone-500 ml-1.5">
                          {preset.dimensions}
                        </span>
                      </div>
                      {isSelected && <span className="text-amber-600 text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Teks Kartu & Standing Banner Kustom */}
            <div className="space-y-2 pt-1 border-t border-stone-100">
              <label className="text-xs font-bold text-stone-800 block">
                3. Kustomisasi Teks Kartu &amp; Standing Banner:
              </label>
              <div>
                <span className="text-[10px] font-bold text-stone-600 block mb-0.5">Teks Header / Eyebrow:</span>
                <input
                  type="text"
                  value={eyebrowText}
                  onChange={(e) => setEyebrowText(e.target.value)}
                  onBlur={() => persistFeatureSettings({ memoriesCardEyebrow: eyebrowText })}
                  placeholder="KAMERA KENANGAN TAMU"
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-bold text-stone-900 uppercase focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-600 block mb-0.5">Kalimat Petunjuk Tamu:</span>
                <input
                  type="text"
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  onBlur={() => persistFeatureSettings({ memoriesCardInstruction: instructionText })}
                  placeholder="Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda."
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {/* 4. Tombol Export */}
            <div className="pt-2 space-y-2.5">
              {!canGenerateQr && (
                <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="text-[11px] text-amber-900 leading-snug">
                    {!hasValidDomain ? (
                      <>
                        <strong>Subdomain Belum Ditentukan:</strong> Harap tentukan subdomain undangan Anda terlebih dahulu di menu <em>Pengaturan</em> agar barcode resmi dapat diterbitkan.
                      </>
                    ) : (
                      <>
                        <strong>Undangan Masih DRAFT:</strong> Barcode resmi siap cetak otomatis diterbitkan setelah Anda mempublikasikan undangan di Studio Editor.
                      </>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleDownloadHighResPng}
                disabled={isGeneratingPng || !canGenerateQr}
                className={`w-full py-3 font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 ${
                  canGenerateQr && !isGeneratingPng
                    ? "bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white cursor-pointer"
                    : "bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300/60 shadow-none"
                }`}
              >
                {isGeneratingPng ? (
                  <span>Menyiapkan Berkas 300 DPI...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Unduh Desain Siap Cetak (300 DPI)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => canGenerateQr && window.print()}
                disabled={!canGenerateQr}
                className={`w-full py-2 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 ${
                  canGenerateQr
                    ? "bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                    : "bg-stone-100 text-stone-400 cursor-not-allowed"
                }`}
              >
                <span>Cetak via Print Dialog Browser</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
