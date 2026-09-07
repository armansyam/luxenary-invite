"use client";

import React, { useState } from "react";

interface AdminDiagnosticsProps {
  adminEmail?: string;
}

export default function AdminDiagnostics({ adminEmail }: AdminDiagnosticsProps) {
  // State Test SMTP
  const [recipientEmail, setRecipientEmail] = useState(adminEmail || "");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{ success: boolean; message: string } | null>(null);

  // State Test Storage
  const [testingStorage, setTestingStorage] = useState(false);
  const [storageResult, setStorageResult] = useState<{
    success: boolean;
    provider?: string;
    bucket?: string;
    latencyMs?: number;
    message: string;
  } | null>(null);

  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      setSmtpResult({ success: false, message: "Masukkan alamat email penerima yang valid." });
      return;
    }

    setTestingSmtp(true);
    setSmtpResult(null);

    try {
      const res = await fetch("/api/admin/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpResult({ success: true, message: data.message });
      } else {
        setSmtpResult({ success: false, message: data.error || "Gagal melakukan handshake SMTP." });
      }
    } catch (err: any) {
      setSmtpResult({ success: false, message: err.message || "Kesalahan jaringan saat menghubungi server." });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestStorage = async () => {
    setTestingStorage(true);
    setStorageResult(null);

    try {
      const res = await fetch("/api/admin/test-storage", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStorageResult({
          success: true,
          provider: data.provider,
          bucket: data.bucket,
          latencyMs: data.latencyMs,
          message: data.message,
        });
      } else {
        setStorageResult({
          success: false,
          message: data.error || "Uji penyimpanan gagal. Cek izin akses bucket.",
        });
      }
    } catch (err: any) {
      setStorageResult({ success: false, message: err.message || "Kesalahan jaringan server." });
    } finally {
      setTestingStorage(false);
    }
  };

  return (
    <div className="space-y-6 pt-4 border-t border-slate-800">
      <div>
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Diagnostik Integrasi Sistem & Infrastruktur
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Uji kelayakan jalur transmisi email transaksi dan media storage cloud secara langsung sebelum aktivasi massal
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* KARTU 1: TEST SMTP LIVE */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Uji Coba Handshake Email (SMTP)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                LIVE TRANSPORT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Mengirimkan 1 email tes langsung ke alamat inbox yang Anda tentukan menggunakan konfigurasi host & kredensial di atas.
            </p>

            <form onSubmit={handleTestSmtp} className="space-y-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Email Penerima Uji Coba</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="admin@luxenary.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={testingSmtp}
                className="w-full mt-2 py-2 px-3 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {testingSmtp ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Menghubungi Server SMTP...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Kirim Email Uji Coba Live
                  </>
                )}
              </button>
            </form>
          </div>

          {smtpResult && (
            <div
              className={`p-3 rounded-xl border text-[11px] leading-relaxed transition ${
                smtpResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${smtpResult.success ? "bg-emerald-400" : "bg-rose-400"}`} />
                {smtpResult.success ? "Sukses Terverifikasi" : "Gagal Terhubung"}
              </div>
              <div>{smtpResult.message}</div>
            </div>
          )}
        </div>

        {/* KARTU 2: TEST CLOUD STORAGE */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                Uji Akses & Latensi Cloud Storage (R2/S3)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                WRITE & READ TEST
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Menguji otorisasi penulisan token sementara ke bucket penyimpanan cloud (Cloudflare R2 atau Disk VPS) dan mengukur latensi round-trip ms.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestStorage}
                disabled={testingStorage}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {testingStorage ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Menghubungi Cloud Storage Provider...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Uji Latensi & Izin Akses Storage
                  </>
                )}
              </button>
            </div>
          </div>

          {storageResult && (
            <div
              className={`p-3 rounded-xl border text-[11px] leading-relaxed transition ${
                storageResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="font-semibold flex items-center justify-between mb-0.5">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${storageResult.success ? "bg-emerald-400" : "bg-rose-400"}`} />
                  {storageResult.success ? `Terkoneksi (${storageResult.provider})` : "Gagal Akses Storage"}
                </span>
                {storageResult.latencyMs !== undefined && (
                  <span className="font-mono text-[10px] bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                    {storageResult.latencyMs} ms
                  </span>
                )}
              </div>
              <div>{storageResult.message}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
