"use client";

import { useState } from "react";

interface Props {
  invitationId: string;
  retentionDays: number;
  isUploadLocked?: boolean;
}

type Phase = "idle" | "confirming" | "fetching" | "downloading" | "zipping" | "locking" | "done" | "error";

export function MemoriesDownloadSection({ invitationId, retentionDays, isUploadLocked = false }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadLocked, setUploadLocked] = useState(isUploadLocked);

  const handleDownloadClick = () => {
    if (phase !== "idle" && phase !== "error" && phase !== "done") return;
    // Tampilkan dialog konfirmasi sebelum download
    setPhase("confirming");
  };

  const handleConfirmDownload = async () => {
    setPhase("fetching");
    setProgress(0);
    setErrorMsg("");

    try {
      // Step 1: Ambil daftar URL (hanya JSON — VPS tidak kirim data foto)
      const res = await fetch(`/api/client/memories/download-urls?invitationId=${invitationId}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error === "EMPTY" ? "Belum ada foto momen dari tamu." : (data.error || "Gagal mengambil daftar foto."));
        setPhase("error");
        return;
      }

      const { files, zipName } = data as { files: { url: string; filename: string }[]; zipName: string };
      setTotal(files.length);
      setDone(0);
      setPhase("downloading");

      // Step 2: Import JSZip dinamis
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Step 3: Fetch setiap foto LANGSUNG dari storage (R2/lokal), bukan melalui VPS
      for (let i = 0; i < files.length; i++) {
        const { url, filename } = files[i];
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          zip.file(filename, blob);
        } catch {
          console.warn(`Skip file yang gagal: ${filename}`);
        }
        setDone(i + 1);
        setProgress(Math.round(((i + 1) / files.length) * 85));
      }

      // Step 4: Generate ZIP di browser (level 1, foto sudah terkompresi)
      setPhase("zipping");
      setProgress(90);
      const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 1 } });

      // Step 5: Trigger save ke disk lokal
      setProgress(95);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = zipName || "Momen_Tamu.zip";
      a.click();
      URL.revokeObjectURL(a.href);

      // Step 6: Kunci upload momen di server setelah ZIP berhasil didownload
      setPhase("locking");
      try {
        await fetch(`/api/client/memories/lock?invitationId=${invitationId}`, { method: "POST" });
        setUploadLocked(true);
      } catch {
        // Log saja, jangan gagalkan UX — ZIP sudah di tangan client
        console.warn("[Lock Upload] Gagal mengunci upload momen, coba lagi nanti.");
      }

      setProgress(100);
      setPhase("done");
    } catch (err: any) {
      console.error("[JSZip Download Error]", err);
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
      setPhase("error");
    }
  };

  const handleCancelConfirm = () => {
    setPhase("idle");
  };

  const isProcessing = phase === "fetching" || phase === "downloading" || phase === "zipping" || phase === "locking";

  return (
    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-emerald-950">Backup &amp; Download Foto Tamu</label>
        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
          H+{retentionDays} hari
        </span>
      </div>
      <p className="text-[11px] text-emerald-900/80 leading-relaxed">
        <strong>Penting:</strong> Seluruh momen tamu disimpan di server kami.{" "}
        <strong>Unduh arsip ZIP</strong> dalam kurun waktu maksimal {retentionDays} hari pasca-acara sebelum sistem menghapusnya otomatis.
      </p>

      {/* Status Upload Terkunci */}
      {uploadLocked && (
        <div className="flex items-center gap-2 text-[11px] text-stone-600 font-medium bg-stone-100 border border-stone-200 rounded-xl px-3 py-2">
          <svg className="w-3.5 h-3.5 text-stone-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Upload momen tamu telah ditutup. Tamu hanya bisa melihat galeri.
        </div>
      )}

      {/* Dialog Konfirmasi Sebelum Download */}
      {phase === "confirming" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">Konfirmasi Download</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Setelah Anda mengunduh ZIP ini, <strong>upload momen tamu akan ditutup secara permanen</strong>. 
                Tamu tidak bisa lagi mengirimkan foto baru ke halaman Bagikan Momen.
              </p>
              <p className="text-[10px] text-amber-600 mt-1.5">
                Tamu masih dapat melihat galeri foto yang sudah ada.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmDownload}
              className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
            >
              Ya, Download &amp; Kunci Upload
            </button>
            <button
              type="button"
              onClick={handleCancelConfirm}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-emerald-800 font-semibold">
            <span>
              {phase === "fetching" && "Mengambil daftar foto…"}
              {phase === "downloading" && `Mengunduh foto ${done} / ${total}…`}
              {phase === "zipping" && "Menyiapkan file ZIP…"}
              {phase === "locking" && "Menutup upload momen…"}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[10px] text-emerald-700">Foto diunduh langsung dari penyimpanan — server tidak dibebani.</p>
        </div>
      )}

      {phase === "done" && (
        <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          ZIP berhasil diunduh. Upload momen tamu telah ditutup.
        </div>
      )}

      {phase === "error" && errorMsg && (
        <p className="text-[11px] text-rose-600 font-medium">{errorMsg}</p>
      )}

      {!isProcessing && phase !== "confirming" && (
        <button
          type="button"
          onClick={handleDownloadClick}
          className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {phase === "done" ? "Unduh Lagi" : phase === "error" ? "Coba Lagi" : "Unduh Semua Momen (ZIP)"}
        </button>
      )}
    </div>
  );
}
