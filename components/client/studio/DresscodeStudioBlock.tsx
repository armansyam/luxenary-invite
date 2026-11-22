"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "./StudioFormControls";
import { THEME_DRESSCODE_MAP, WEDDING_DRESSCODE_PRESETS } from "./studioPresets";

export interface DresscodeStudioProps {
  invitation: any;
  updateField: (field: string, value: any) => void;
  updateFeatureSetting: (key: string, value: any) => void;
  getFeatureSetting: (key: string, defaultVal: any) => any;
  themeSyncSuccess: boolean;
  setThemeSyncSuccess: (val: boolean) => void;
  showManualHex: boolean;
  setShowManualHex: (val: boolean) => void;
}

export function DresscodeStudioBlock({
  invitation,
  updateField,
  updateFeatureSetting,
  getFeatureSetting,
  themeSyncSuccess,
  setThemeSyncSuccess,
  showManualHex,
  setShowManualHex,
}: DresscodeStudioProps) {
  const rawColors = getFeatureSetting("dressCodeColors", "#a67c52, #2b2725, #faf7f2");
  const currentColorList: string[] = typeof rawColors === "string"
    ? rawColors.split(",").map((c: string) => c.trim()).filter((c: string) => c.length > 0)
    : ["#a67c52", "#2b2725", "#faf7f2"];
  const safeColorList = currentColorList.length > 0 ? currentColorList : ["#a67c52", "#2b2725", "#faf7f2"];

  const updateColors = (list: string[]) => {
    updateFeatureSetting("dressCodeColors", list.join(", "));
  };

  const handleSwatchColorChange = (index: number, newHex: string) => {
    const updated = [...safeColorList];
    updated[index] = newHex;
    updateColors(updated);
  };

  const handleRemoveSwatch = (index: number) => {
    if (safeColorList.length <= 1) return;
    const updated = safeColorList.filter((_, i) => i !== index);
    updateColors(updated);
  };

  const handleAddSwatch = () => {
    if (safeColorList.length >= 6) return;
    const updated = [...safeColorList, "#d4af37"];
    updateColors(updated);
  };

  const handleApplyPreset = (preset: { name: string; colors: string[] }) => {
    updateColors(preset.colors);
    if (!invitation.dresscode) {
      updateField("dresscode", preset.name);
    }
  };

  const activeTheme = invitation?.themeId || "solaria";
  const themePreset = THEME_DRESSCODE_MAP[activeTheme] || THEME_DRESSCODE_MAP["solaria"];

  const handleSyncTheme = () => {
    if (themePreset) {
      updateColors(themePreset.colors);
      if (!invitation.dresscode) {
        updateField("dresscode", themePreset.name);
      }
      setThemeSyncSuccess(true);
      setTimeout(() => setThemeSyncSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-5 mt-2">
      <Input
        label="Nuansa / Aturan Dress Code"
        value={invitation.dresscode || ""}
        onChange={(v) => updateField("dresscode", v)}
        placeholder="Contoh: Earthy Terracotta, Formal Batik, Modern Pastel"
      />

      <div className="p-4 sm:p-5 bg-stone-50/80 rounded-2xl border border-stone-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <label className="text-xs font-bold text-stone-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4 5 5 0 0110 0 4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              <span>Palet Warna Busana Tamu (Visual Swatches)</span>
            </label>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Klik bulatan warna untuk memilih warna secara visual. Tanpa perlu menghafal kode heksadesimal.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncTheme}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto ${
              themeSyncSuccess
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                : "bg-white hover:bg-amber-50 text-amber-900 border border-amber-300/80 shadow-xs"
            }`}
            title="Samakan warna dress code dengan palet bawaan tema undangan Anda"
          >
            {themeSyncSuccess ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Tersinkron dengan Tema!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Samakan Tema ({activeTheme.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          {safeColorList.map((hex: string, idx: number) => (
            <ColorSwatchPicker
              key={idx}
              initialColor={hex}
              index={idx}
              totalColors={safeColorList.length}
              onCommit={handleSwatchColorChange}
              onRemove={handleRemoveSwatch}
            />
          ))}

          {safeColorList.length < 6 && (
            <button
              type="button"
              onClick={handleAddSwatch}
              className="w-12 h-12 rounded-full border-2 border-dashed border-stone-300 hover:border-amber-700 text-stone-400 hover:text-amber-800 flex flex-col items-center justify-center transition-all cursor-pointer group bg-white hover:bg-amber-50/40 shadow-2xs"
              title="Tambah bulatan warna baru (Maksimal 6 warna)"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        <div className="space-y-2 pt-3 border-t border-stone-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
              Pilihan Cepat: Palet Tren
            </span>
            <span className="text-[10px] text-stone-400">1-Klik Terapkan</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WEDDING_DRESSCODE_PRESETS.map((p, pIdx) => {
              const isSelected = p.colors.join(", ").toLowerCase() === safeColorList.join(", ").toLowerCase();
              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? "bg-amber-50/80 border-amber-600 ring-2 ring-amber-500/20 shadow-xs"
                      : "bg-white hover:bg-stone-50/80 border-stone-200 hover:border-stone-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {p.colors.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs inline-block"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block truncate">{p.name}</span>
                    <span className="text-[10px] text-stone-400 block truncate">{p.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 bg-gradient-to-br from-stone-50 to-amber-50/30 border border-amber-200/70 rounded-2xl space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest text-amber-900 uppercase flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            <span>Pratinjau Tampilan Tamu (Live Preview)</span>
          </span>
          <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Sesuai Tampilan Website
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold tracking-widest text-stone-400 uppercase block">
              Panduan Busana Undangan
            </span>
            <h4 className="text-sm sm:text-base font-serif font-bold text-stone-900">
              {invitation.dresscode || "Panduan Busana"}
            </h4>
            <p className="text-xs text-stone-500 max-w-md leading-relaxed">
              {getFeatureSetting("dressCodeNote", "") || "Para tamu kehormatan dianjurkan mengenakan busana bernuansa senada."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {safeColorList.map((c: string, i: number) => (
              <span
                key={i}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md inline-block transition-transform hover:scale-110 ring-1 ring-stone-200"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-stone-700 mb-1">Catatan Tambahan Busana (Opsional)</label>
        <textarea
          rows={2}
          value={getFeatureSetting("dressCodeNote", "")}
          onChange={(e) => updateFeatureSetting("dressCodeNote", e.target.value)}
          placeholder="Contoh: Kami memohon agar para tamu menghindari warna putih atau pakaian kasual."
          className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
        />
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowManualHex(!showManualHex)}
          className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 transition flex items-center gap-1 cursor-pointer"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${showManualHex ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span>{showManualHex ? "Sembunyikan Pengaturan Kode Hex Manual" : "Pengaturan Lanjutan: Edit Kode Hex Manual"}</span>
        </button>

        {showManualHex && (
          <div className="mt-2.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200 animate-in fade-in duration-200 space-y-1.5">
            <Input
              label="Palet Warna Hex (Pisahkan dengan koma)"
              value={rawColors}
              onChange={(v) => updateFeatureSetting("dressCodeColors", v)}
              placeholder="#a67c52, #2b2725, #faf7f2"
            />
            <p className="text-[10px] text-stone-400 leading-normal">
              Perubahan pada teks kode hex di atas akan otomatis memperbarui bulatan warna visual di atas secara dua arah (*two-way sync*).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Komponen Swatch Warna Terisolasi (Isolated Visual Update).
 */
export function ColorSwatchPicker({
  initialColor,
  index,
  totalColors,
  onCommit,
  onRemove,
}: {
  initialColor: string;
  index: number;
  totalColors: number;
  onCommit: (index: number, newColor: string) => void;
  onRemove: (index: number) => void;
}) {
  const [color, setColor] = useState(initialColor);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setColor(initialColor);
  }, [initialColor]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleColorChange = (newHex: string) => {
    setColor(newHex);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onCommit(index, newHex);
    }, 200);
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (color !== initialColor) {
      onCommit(index, color);
    }
  };

  return (
    <div className="relative group flex flex-col items-center gap-1.5">
      <div
        className="w-12 h-12 rounded-full border-2 border-white shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg relative overflow-hidden flex items-center justify-center cursor-pointer ring-1 ring-stone-300"
        style={{ backgroundColor: color }}
        title={`Klik untuk ubah warna (${color})`}
      >
        <input
          type="color"
          value={color.startsWith("#") && color.length === 7 ? color : "#a67c52"}
          onInput={(e) => handleColorChange((e.target as HTMLInputElement).value)}
          onChange={(e) => handleColorChange(e.target.value)}
          onBlur={handleBlur}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white rounded-full p-1 pointer-events-none">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>

      <span className="text-[10px] font-mono font-bold text-stone-600 uppercase bg-white border border-stone-200 px-1.5 py-0.5 rounded shadow-2xs tracking-tight">
        {color}
      </span>

      {totalColors > 1 && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-800 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs cursor-pointer shadow-sm"
          title="Hapus warna ini"
        >
          &times;
        </button>
      )}
    </div>
  );
}
