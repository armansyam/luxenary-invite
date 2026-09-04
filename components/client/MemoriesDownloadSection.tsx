"use client";

import { useState, useEffect } from "react";

interface Props {
  invitationId: string;
  retentionDays: number;
  isUploadLocked?: boolean;
  galleryExpiresAt?: string | null;
  extensionPrice?: number;
  invitationStatus?: string;
  guestMemoriesCount?: number;
}

type Phase = "idle" | "confirming" | "fetching" | "downloading" | "zipping" | "locking" | "done" | "error";

export function MemoriesDownloadSection({
  invitationId,
  retentionDays,
  isUploadLocked = false,
  galleryExpiresAt,
  extensionPrice = 50000,
  invitationStatus = "PUBLISHED",
  guestMemoriesCount = 0,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadLocked, setUploadLocked] = useState(isUploadLocked);
  const [extending, setExtending] = useState(false);

  // Sinkronisasi state internal jika prop isUploadLocked dari server berubah
  useEffect(() => {
    setUploadLocked(isUploadLocked);
  }, [isUploadLocked]);

  const normalizedStatus = (invitationStatus || "").toUpperCase();

  const handleExtendGallery = async () => {
    try {
      setExtending(true);
      const res = await fetch("/api/client/memories/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json();
      if (data.success && data.orderId) {
        window.location.href = `/checkout?order=${data.orderId}`;
      } else {
        alert(data.error || "Gagal membuat pesanan perpanjangan");
      }
    } catch (e: any) {
      alert("Terjadi kesalahan: " + e.message);
    } finally {
      setExtending(false);
    }
  };

  const handleDownloadClick = () => {
    if (phase !== "idle" && phase !== "error" && phase !== "done") return;
    if (normalizedStatus === "DRAFT" || guestMemoriesCount === 0) return;

    // Jika upload belum terkunci dan acara masih berlangsung, wajib konfirmasi peringatan dini
    if (!uploadLocked && normalizedStatus !== "EVENT_FINISHED") {
      setPhase("confirming");
    } else {
      // Jika upload sudah terkunci atau acara telah selesai, langsung unduh secara aman
      handleConfirmDownload();
    }
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

      {/* Kondisi Status Undangan & Upload */}
      {normalizedStatus === "DRAFT" ? (
        <div className="flex items-center gap-2 text-[11px] text-amber-900 font-medium bg-amber-100/70 border border-amber-200 rounded-xl px-3.5 py-2.5">
          <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Undangan masih berstatus <strong>Draft</strong>. Formulir upload tamu dan unduh ZIP akan aktif otomatis setelah undangan dipublikasikan.</span>
        </div>
      ) : uploadLocked || normalizedStatus === "EVENT_FINISHED" ? (
        <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-medium bg-emerald-100/70 border border-emerald-200 rounded-xl px-3.5 py-2.5">
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Upload momen tamu telah ditutup (Aman diunduh). Tamu hanya dapat melihat galeri foto kenangan.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-stone-700 font-medium bg-stone-100 border border-stone-200 rounded-xl px-3.5 py-2.5">
          <svg className="w-4 h-4 text-stone-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Acara sedang berlangsung. Tamu masih dapat mengirim foto. Mengunduh arsip ZIP sekarang akan <strong>menutup formulir upload secara permanen</strong>.</span>
        </div>
      )}

      {/* Dialog Konfirmasi Sebelum Download (Peringatan Khusus Jika Acara Masih Berlangsung) */}
      {phase === "confirming" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 space-y-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-amber-900 mb-1">Peringatan: Unduh Lebih Awal &amp; Kunci Upload Tamu</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Undangan Anda saat ini masih aktif (`Published`). Jika Anda mengunduh file ZIP sekarang, <strong>formulir upload momen tamu akan langsung ditutup secara permanen</strong> agar tidak ada foto baru yang tercecer saat atau setelah proses pengunduhan.
              </p>
              <p className="text-[11px] text-amber-700 mt-1.5 leading-relaxed">
                Jika ingin tamu tetap bisa mengirimkan foto hingga akhir acara, silakan unduh nanti saat acara telah selesai (sistem otomatis menutup upload pada masa transisi galeri).
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={handleConfirmDownload}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              Ya, Kunci Upload &amp; Download ZIP Sekarang
            </button>
            <button
              type="button"
              onClick={handleCancelConfirm}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Batal (Biarkan Tamu Masih Mengunggah)
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

      {/* Status Masa Simpan & Perpanjangan QRIS */}
      <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-stone-700 block">Status Masa Simpan Foto Galeri Tamu:</span>
          <p className="text-xs text-stone-600 mt-0.5">
            {galleryExpiresAt ? (
              <>Aktif hingga: <strong className="text-purple-700 font-semibold">{new Date(galleryExpiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong></>
            ) : (
              <>Standar retensi: <strong>{retentionDays} hari</strong> pasca acara pernikahan</>
            )}
          </p>
        </div>
        
        <button
          type="button"
          onClick={handleExtendGallery}
          disabled={extending}
          className="inline-flex items-center justify-center px-3.5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer shrink-0"
          title="Perpanjang penyimpanan foto momen para tamu di server selama +30 hari via QRIS"
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {extending ? "Menyiapkan QRIS..." : `+30 Hari Galeri (Rp ${Number(extensionPrice).toLocaleString("id-ID")})`}
        </button>
      </div>

      {!isProcessing && phase !== "confirming" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadClick}
            disabled={normalizedStatus === "DRAFT" || guestMemoriesCount === 0}
            className={`inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-xl transition ${
              normalizedStatus === "DRAFT" || guestMemoriesCount === 0
                ? "bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300"
                : uploadLocked || normalizedStatus === "EVENT_FINISHED"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                : "bg-amber-700 hover:bg-amber-800 text-white shadow-xs cursor-pointer"
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {normalizedStatus === "DRAFT"
              ? "Undangan Masih Draft"
              : guestMemoriesCount === 0
              ? "Belum Ada Foto untuk Diunduh"
              : phase === "done"
              ? "Unduh Lagi (ZIP)"
              : phase === "error"
              ? "Coba Lagi"
              : uploadLocked || normalizedStatus === "EVENT_FINISHED"
              ? `Unduh Semua Momen Tamu (ZIP) — ${guestMemoriesCount} Foto`
              : `Unduh ZIP & Kunci Upload Lebih Awal (${guestMemoriesCount} Foto)`}
          </button>
          {guestMemoriesCount === 0 && normalizedStatus !== "DRAFT" && (
            <span className="text-[11px] text-stone-500">Tamu belum mengunggah foto ke halaman Bagikan Momen.</span>
          )}
        </div>
      )}
    </div>
  );
}
