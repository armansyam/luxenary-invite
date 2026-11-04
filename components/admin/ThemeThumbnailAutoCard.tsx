"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

type JobState = "idle" | "queued" | "running" | "done" | "failed";
interface JobStatus {
  state: JobState;
  finishedAt?: string;
  error?: string;
}

const POLL_MS = 3000;

/** Demo Studio: memotret thumbnail katalog dari halaman demo di server (lib/themeThumbnailJob.ts). */
export default function ThemeThumbnailAutoCard({ themeId, onFinished }: { themeId: string; onFinished: () => void }) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  // Setiap kenaikan memicu satu pembacaan status; selama antrean berjalan efek menaikkannya lagi setelah POLL_MS.
  const [pollTick, setPollTick] = useState(0);
  const wasBusy = useRef(false);
  const notifyFinished = useEffectEvent(() => onFinished());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const res = await fetch(`/api/admin/themes/${themeId}/thumbnails`, { cache: "no-store" });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error || `Status thumbnail gagal dibaca (HTTP ${res.status}).`);
        return;
      }
      setStatus(data);
      const busy = data.state === "queued" || data.state === "running";
      if (busy) timer = setTimeout(() => setPollTick((t) => t + 1), POLL_MS);
      else if (wasBusy.current && data.state === "done") notifyFinished();
      wasBusy.current = busy;
    })().catch(() => {
      if (!cancelled) setError("Koneksi terputus saat membaca status thumbnail.");
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [themeId, pollTick]);

  const request = async () => {
    setRequesting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/themes/${themeId}/thumbnails`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Thumbnail gagal diminta (HTTP ${res.status}).`);
        return;
      }
      setStatus(data);
      wasBusy.current = true;
      setPollTick((t) => t + 1);
    } catch {
      setError("Koneksi terputus. Thumbnail belum diminta.");
    } finally {
      setRequesting(false);
    }
  };

  const busy = requesting || status?.state === "queued" || status?.state === "running";
  const finishedAt = status?.finishedAt ? new Date(status.finishedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "";
  const line =
    status?.state === "queued" ? "Menunggu giliran pemotretan..." :
    status?.state === "running" ? "Memotret halaman demo (mobile dan desktop), sekitar 15 detik..." :
    status?.state === "done" ? `Terakhir dibuat ${finishedAt}.` :
    status?.state === "failed" ? `Gagal ${finishedAt}: ${status.error || "tanpa keterangan"}` :
    "Belum pernah dibuat otomatis di server ini.";

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="text-xs text-gray-700 leading-relaxed">
        <div className="font-bold text-gray-900">Thumbnail katalog otomatis</div>
        <div>
          Memotret halaman demo tema ini menjadi thumbnail mobile 400 × 800 dan desktop 1280 × 800. Tema builder dipotret ulang
          otomatis setiap disimpan atau diterbitkan. Thumbnail yang diunggah manual di bawah tetap diutamakan; kosongkan slotnya
          untuk memakai hasil otomatis.
        </div>
        <div className={`mt-1 font-medium ${status?.state === "failed" || error ? "text-rose-700" : "text-gray-500"}`}>{error || line}</div>
      </div>
      <button
        type="button"
        onClick={request}
        disabled={busy}
        className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Sedang diproses..." : "Buat Thumbnail Otomatis"}
      </button>
    </div>
  );
}
