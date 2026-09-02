"use client";

import { useState, useEffect, useRef } from "react";

interface PortfolioTabProps {
  invitations: any[];
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

export function AdminPortfolioTab({ invitations }: PortfolioTabProps) {
  const [portfolios, setPortfolios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [processingSlug, setProcessingSlug] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastId = useRef(0);

  const showToast = (type: Toast["type"], message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  const fetchPortfolios = async () => {
    try {
      const res = await fetch("/api/admin/portfolio");
      const data = await res.json();
      if (res.ok) setPortfolios(data.portfolios || []);
    } catch {
      showToast("error", "Gagal memuat daftar portofolio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPortfolios(); }, []);

  useEffect(() => {
    if (processing) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [processing]);

  const handleAddToPortfolio = async (invitationId: string, slug: string) => {
    if (processing) return;
    setProcessing(invitationId);
    setProcessingSlug(slug);
    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `Berhasil dikurasi ke portofolio: ${data.clientName}`);
        fetchPortfolios();
      } else {
        showToast("error", data.error || "Gagal menambahkan portofolio");
      }
    } catch {
      showToast("error", "Terjadi kesalahan jaringan saat kloning");
    } finally {
      setProcessing(null);
      setProcessingSlug(null);
    }
  };

  const handleRemoveFromPortfolio = async (clientName: string) => {
    if (!window.confirm(`Hapus "${clientName}" dari portofolio?\nIni akan menghapus file HTML dan semua aset fisiknya.`)) return;
    try {
      const res = await fetch(`/api/admin/portfolio?clientName=${encodeURIComponent(clientName)}`, { method: "DELETE" });
      if (res.ok) {
        showToast("success", `Portofolio "${clientName}" berhasil dihapus`);
        fetchPortfolios();
      } else {
        const data = await res.json();
        showToast("error", data.error || "Gagal menghapus portofolio");
      }
    } catch {
      showToast("error", "Terjadi kesalahan jaringan saat menghapus");
    }
  };

  const eligibleInvitations = invitations.filter(
    (inv) => inv.status === "PUBLISHED" && inv.invitationSlug && !portfolios.includes(inv.invitationSlug)
  );
  const filteredEligible = eligibleInvitations.filter(
    (inv) =>
      inv.invitationSlug?.toLowerCase().includes(search.toLowerCase()) ||
      inv.groomName?.toLowerCase().includes(search.toLowerCase()) ||
      inv.brideName?.toLowerCase().includes(search.toLowerCase())
  );

  const STEPS = [
    "Membaca HTML undangan",
    "Menyalin foto & media",
    "Kompres GuestMemory (WebP 65%)",
    "Kompres galeri Drive (WebP 75%)",
    "Menyimpan HTML terisolasi",
  ];

  return (
    <div className="space-y-6 relative">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white max-w-sm pointer-events-auto ${
              t.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {t.type === "success" ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Progress Overlay saat Kloning */}
      {processing && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 mx-auto mb-4">
              <svg className="w-14 h-14 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h4 className="font-bold text-gray-900 text-base mb-1">Mengkloning Portofolio</h4>
            <p className="text-sm text-gray-600 mb-1 font-mono font-semibold">{processingSlug}</p>
            <p className="text-xs text-gray-400 mb-5">Mengunduh & mengompres semua aset media…</p>
            <div className="text-left space-y-2.5 mb-5">
              {STEPS.map((step, i) => {
                const active = Math.min(Math.floor(elapsed / 5), STEPS.length - 1);
                const done = i < active;
                const current = i === active;
                return (
                  <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${done ? "text-emerald-600" : current ? "text-blue-600 font-semibold" : "text-gray-300"}`}>
                    <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">
                      {done ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : current ? (
                        <span className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin inline-block" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-gray-200 inline-block" />
                      )}
                    </span>
                    {step}
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-gray-400">
              Berjalan{" "}
              <span className="font-mono font-semibold text-gray-600">
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
              </span>
              {" "}— jangan tutup halaman
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Portofolio Mandiri</h3>
            <p className="text-sm text-gray-500 mt-1">
              Kurasi undangan klien menjadi salinan HTML statis mandiri di{" "}
              <a href="/portfolio" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">/portfolio</a>.
            </p>
          </div>
          <a
            href="/portfolio"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
          >
            Buka /portfolio
          </a>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* KIRI: Portofolio Aktif */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Portofolio Aktif ({portfolios.length})
            </h4>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
              </div>
            ) : portfolios.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">Belum ada portofolio dikurasi.</p>
                <p className="text-gray-400 text-xs mt-1">Pilih undangan di panel kanan untuk mulai.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {portfolios.map((slug) => (
                  <div key={slug} className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl hover:border-emerald-300 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{slug}</p>
                      <a href={`/portfolio/${slug}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        Lihat portofolio
                      </a>
                    </div>
                    <button
                      onClick={() => handleRemoveFromPortfolio(slug)}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus dari Portofolio"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KANAN: Tambah Portofolio Baru */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Tambahkan Undangan Aktif
            </h4>
            <input
              type="text"
              placeholder="Cari slug atau nama pengantin…"
              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none mb-4 disabled:opacity-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!!processing}
            />
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredEligible.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-500 text-sm">
                    {eligibleInvitations.length === 0
                      ? "Semua undangan PUBLISHED sudah dikurasi."
                      : "Tidak ada yang cocok dengan pencarian."}
                  </p>
                </div>
              ) : (
                filteredEligible.map((inv) => (
                  <div key={inv.id} className="p-3.5 border border-gray-200 rounded-xl flex items-center justify-between hover:border-blue-300 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{inv.invitationSlug}</p>
                      <p className="text-xs text-gray-500">{inv.groomName} & {inv.brideName}</p>
                    </div>
                    <button
                      onClick={() => handleAddToPortfolio(inv.id, inv.invitationSlug)}
                      disabled={!!processing}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Jadikan Portofolio
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-800 font-semibold mb-1">Proses kloning: 10–30 detik</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Sistem mengunduh & mengompres foto klien, GuestMemory thumbnail (WebP 65%), dan galeri Drive (max 15 foto, WebP 75%).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
