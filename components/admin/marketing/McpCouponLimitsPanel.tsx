"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MCP_COUPON_LIMITS } from "@/lib/mcpCouponLimits";

const LIMIT_DEFS = Object.values(MCP_COUPON_LIMITS);

/** Batas kupon yang boleh dibuat tim pemasaran AI lewat MCP (`marketing:write`); disimpan sebagai AdminSetting dan ditegakkan server. */
export default function McpCouponLimitsPanel() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const map: Record<string, string> = {};
      for (const s of data.settings || []) map[s.key] = s.value;
      const next = Object.fromEntries(LIMIT_DEFS.map((d) => [d.key, map[d.key] ?? String(d.defaultValue)]));
      setValues(next);
      setSaved(next);
    } catch (err) {
      setFeedback({ type: "error", message: `Gagal memuat batas kupon tim AI: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = LIMIT_DEFS.some((d) => values[d.key] !== saved[d.key]);

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(LIMIT_DEFS.map((d) => ({ key: d.key, value: values[d.key], group: "marketing" }))),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSaved(values);
      setFeedback({ type: "success", message: "Batas kupon tim AI tersimpan dan langsung berlaku untuk tool MCP." });
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Batas Kupon Tim Pemasaran AI (MCP)</h3>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Kunci MCP dengan scope <code className="font-mono">marketing:write</code> hanya bisa membuat kupon persen dalam batas ini. Server menolak kupon yang
            melewati batas atau membuat margin bersih paket mana pun (setelah potongan, fee gateway, dan PPh 0,5%) di bawah margin minimum. Kupon tim AI
            bertanda <span className="font-mono">[MCP]</span> di daftar kupon.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || loading}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-500 text-white text-xs font-semibold shrink-0"
        >
          {saving ? "Menyimpan…" : "Simpan Batas"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LIMIT_DEFS.map((d) => (
          <label key={d.key} className="block">
            <span className="text-xs font-medium text-gray-700">{d.label}</span>
            <input
              type="number"
              min={d.min}
              max={d.max}
              step={d.step}
              value={values[d.key] ?? ""}
              disabled={loading}
              onChange={(e) => setValues((v) => ({ ...v, [d.key]: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <span className="text-[11px] text-gray-400">
              Rentang {d.min}–{d.max}
            </span>
          </label>
        ))}
      </div>

      {feedback && (
        <div
          className={`text-xs rounded-xl px-3 py-2 ${
            feedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
