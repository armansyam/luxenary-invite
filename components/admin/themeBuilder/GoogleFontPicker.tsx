"use client";

import { useEffect, useRef, useState } from "react";

interface CatalogFont {
  id: string;
  family: string;
  category: string;
  installed: boolean;
}

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: "", label: "Semua" },
  { id: "Serif", label: "Serif" },
  { id: "Sans Serif", label: "Sans" },
  { id: "Display", label: "Hias" },
  { id: "Handwriting", label: "Tulisan tangan" },
];

/** Pencari font Google. Memilih satu font memerintahkan server mengunduhnya lebih dulu, baru id-nya dipasang ke tema. */
export function GoogleFontPicker({ onPick }: { onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [fonts, setFonts] = useState<CatalogFont[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/theme-builder/fonts?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`);
        const data = await res.json();
        if (seq !== requestSeq.current) return;
        if (!res.ok) throw new Error(data.error ?? "Katalog font tidak dapat dimuat.");
        setFonts(data.fonts);
        setError("");
      } catch (e) {
        if (seq === requestSeq.current) setError(e instanceof Error ? e.message : "Katalog font tidak dapat dimuat.");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, category]);

  async function pick(font: CatalogFont) {
    setBusy(font.family);
    setError("");
    try {
      const res = await fetch("/api/admin/theme-builder/fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family: font.family }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Font gagal diunduh.");
      onPick(data.font.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Font gagal diunduh.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Font Google</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari nama font, mis. Italiana"
        className="mb-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px] text-stone-800 outline-none focus:border-amber-500"
      />
      <div className="mb-2 flex flex-wrap gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] cursor-pointer transition ${category === c.id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error && <p className="mb-2 text-[11.5px] text-red-600">{error}</p>}
      <div className="max-h-56 overflow-y-auto rounded-lg border border-stone-100">
        {fonts === null && !error && <p className="px-3 py-3 text-[12px] text-stone-400">Memuat katalog…</p>}
        {fonts?.length === 0 && <p className="px-3 py-3 text-[12px] text-stone-400">Tidak ada font yang cocok.</p>}
        {fonts?.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => pick(f)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-stone-800 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <span>{f.family}</span>
            <span className="text-[10.5px] text-stone-400">{busy === f.family ? "Mengunduh…" : f.installed ? `${f.category} · tersimpan` : f.category}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
