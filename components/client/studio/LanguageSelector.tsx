"use client";

import React from "react";

interface LanguageSelectorProps {
  value: "id" | "en";
  onChange: (next: "id" | "en") => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const current = value === "en" ? "en" : "id";

  return (
    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-stone-900">Bahasa Teks Bawaan Undangan (ID / EN)</h4>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Mengatur format tanggal, label keluarga, hitung mundur, kalender, formulir RSVP, dan kartu kado. Label yang Anda sunting manual di bawah tetap diprioritaskan.
          </p>
        </div>
        <div className="inline-flex p-1 rounded-xl bg-white border border-stone-200 shrink-0 self-start sm:self-auto">
          {([
            { id: "id", label: "Indonesia" },
            { id: "en", label: "English" },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                current === opt.id
                  ? "bg-stone-900 text-white shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
