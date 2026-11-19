"use client";

import React, { useEffect, useState } from "react";
import type { GiftRegistryItem } from "@/lib/giftRegistry";

interface GiftClaimSummary {
  itemId: string;
  claimedQty: number;
  claimers: string[];
}

interface GiftRegistryEditorProps {
  invitationId: string;
  items: GiftRegistryItem[];
  onChange: (next: GiftRegistryItem[]) => void;
}

export function GiftRegistryEditor({ invitationId, items, onChange }: GiftRegistryEditorProps) {
  const [claims, setClaims] = useState<GiftClaimSummary[]>([]);

  useEffect(() => {
    if (!invitationId) return;
    fetch(`/api/public/gift-claim?invitationId=${encodeURIComponent(invitationId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.claims)) {
          setClaims(d.claims);
        }
      })
      .catch(() => {});
  }, [invitationId]);

  const claimOf = (itemId: string) => claims.find((c) => c.itemId === itemId);

  const handleAdd = () => {
    if (items.length >= 30) return;
    const nextId = `gift-${Date.now().toString(36)}-${items.length + 1}`;
    onChange([...items, { id: nextId, name: "", note: "", url: "", qtyNeeded: 1 }]);
  };

  const handleUpdate = (index: number, patch: Partial<GiftRegistryItem>) => {
    const next = items.map((it, idx) => (idx === index ? { ...it, ...patch } : it));
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, idx) => idx !== index));
  };

  return (
    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-stone-900">Daftar Kado Fisik (Gift Registry Anti-Dobel)</h4>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Cantumkan barang yang dibutuhkan beserta jumlahnya. Tamu dapat menandai kado yang akan dikirim agar tidak terbeli ganda.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={items.length >= 30}
          className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-[11px] font-bold transition cursor-pointer shrink-0 self-start sm:self-auto"
        >
          Tambah Item Kado
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-stone-400 italic py-2">
          Belum ada daftar kado fisik yang ditambahkan. Klik &ldquo;Tambah Item Kado&rdquo; untuk membuat wishlist.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const summary = claimOf(item.id);
            const claimedQty = summary?.claimedQty || 0;
            return (
              <div key={item.id || idx} className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-stone-700">Item Kado #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    {claimedQty > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Dipilih: {claimedQty}/{item.qtyNeeded}
                        {summary?.claimers?.length ? ` (${summary.claimers.join(", ")})` : ""}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-1">Nama Barang</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdate(idx, { name: e.target.value })}
                      placeholder="Contoh: Espresso Maker / Set Sprei Katun Jepang"
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 mb-1">Jumlah Kuota</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={item.qtyNeeded}
                      onChange={(e) => handleUpdate(idx, { qtyNeeded: Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)) })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 mb-1">Catatan (Warna / Ukuran Opsional)</label>
                    <input
                      type="text"
                      value={item.note || ""}
                      onChange={(e) => handleUpdate(idx, { note: e.target.value })}
                      placeholder="Warna putih gading / ukuran King 180x200"
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 mb-1">Tautan Produk Opsional (HTTPS)</label>
                    <input
                      type="url"
                      value={item.url || ""}
                      onChange={(e) => handleUpdate(idx, { url: e.target.value })}
                      placeholder="https://tokopedia.com/..."
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
