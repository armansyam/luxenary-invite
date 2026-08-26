"use client";

import { useState } from "react";
import Link from "next/link";

export default function LiveShowRemoteClient({ invitationId }: { invitationId: string }) {
  const [activeMode, setActiveMode] = useState<"slideshow" | "masonry" | "custom_scene">("slideshow");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "GUEST" | "BOOTH">("ALL");
  const [customSceneUrl, setCustomSceneUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [uploadQueue, setUploadQueue] = useState({ current: 0, total: 0 });

  const handleBulkUpload = async (files: File[]) => {
    setUploadQueue({ current: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("invitationId", invitationId);
      formData.append("senderName", "Photobooth Vendor");
      formData.append("senderEmail", "booth@system"); // Magic label
      formData.append("message", "Auto-sync dari Bulk Uploader");
      formData.append("mediaType", file.type.startsWith("video/") ? "VIDEO" : "PHOTO");
      formData.append("file", file);

      try {
        await fetch("/api/public/memories/upload", {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        console.error("Gagal mengunggah file:", file.name, err);
      }

      setUploadQueue(prev => ({ ...prev, current: prev.current + 1 }));
    }
  };

  const handleSceneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("invitationId", invitationId);
      formData.append("senderName", "SYSTEM_SCENE");
      formData.append("senderEmail", "scene@system"); 
      formData.append("message", "Custom Scene Injection");
      formData.append("mediaType", "PHOTO");
      formData.append("file", file);

      const res = await fetch("/api/public/memories/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.mediaUrl) {
        setCustomSceneUrl(data.mediaUrl);
        // Automatically send command to switch to this scene
        await sendCommand("SHOW_SCENE", data.mediaUrl);
      }
    } catch (err) {
      console.error("Gagal mengunggah custom scene", err);
      alert("Gagal mengunggah gambar scene.");
    } finally {
      setIsSending(false);
    }
  };

  const sendCommand = async (command: string, value: string) => {
    setIsSending(true);
    try {
      await fetch("/api/liveshow/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: invitationId,
          command,
          value
        })
      });

      if (command === "CHANGE_MODE") setActiveMode(value as any);
      if (command === "CHANGE_FILTER") setActiveFilter(value as any);
      if (command === "SHOW_SCENE") setActiveMode("custom_scene");
    } catch (err) {
      console.error("Failed to send command", err);
      alert("Gagal mengirim perintah ke proyektor.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white font-sans p-6 sm:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-500 tracking-wide flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse block"></span>
              LiveShow Remote
            </h1>
            <p className="text-sm text-stone-400 mt-1">Pusat Kendali Proyektor (Master Node)</p>
          </div>
          <Link href="/dashboard" className="text-xs font-bold text-stone-500 hover:text-white transition">
            &larr; Kembali
          </Link>
        </div>

        {/* Status Box */}
        <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-5 flex items-start gap-4">
          <div className="mt-0.5 text-emerald-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-emerald-400 text-sm mb-1">Koneksi Remote Aktif</h3>
            <p className="text-xs text-emerald-600/80 leading-relaxed">
              Setiap tombol yang Anda tekan di sini akan langsung merubah tampilan layar proyektor (Laptop A) secara real-time tanpa perlu refresh halaman.
            </p>
          </div>
        </div>

        {/* Controls - Mode */}
        <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl space-y-4">
          <h2 className="text-[11px] uppercase tracking-widest text-stone-500 font-bold mb-4">1. Ubah Tipe Layout</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              disabled={isSending}
              onClick={() => sendCommand("CHANGE_MODE", "slideshow")}
              className={`p-4 rounded-2xl border text-left transition flex flex-col gap-2 ${
                activeMode === "slideshow" 
                  ? "bg-amber-500/10 border-amber-500/50" 
                  : "bg-stone-950 border-stone-800 hover:border-stone-600"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeMode === "slideshow" ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-400"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className={`font-bold text-sm ${activeMode === "slideshow" ? "text-amber-400" : "text-stone-300"}`}>Slideshow (Auto-play)</div>
                <div className="text-[10px] text-stone-500 mt-0.5">Memutar 1 foto/video penuh setiap 5 detik.</div>
              </div>
            </button>
            
            <button
              disabled={isSending}
              onClick={() => sendCommand("CHANGE_MODE", "masonry")}
              className={`p-4 rounded-2xl border text-left transition flex flex-col gap-2 ${
                activeMode === "masonry" 
                  ? "bg-amber-500/10 border-amber-500/50" 
                  : "bg-stone-950 border-stone-800 hover:border-stone-600"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeMode === "masonry" ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-400"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <div className={`font-bold text-sm ${activeMode === "masonry" ? "text-amber-400" : "text-stone-300"}`}>Masonry Grid</div>
                <div className="text-[10px] text-stone-500 mt-0.5">Kolase gaya Pinterest statis untuk estetik.</div>
              </div>
            </button>
          </div>
        </div>

        {/* Controls - Filter */}
        <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl space-y-4">
          <h2 className="text-[11px] uppercase tracking-widest text-stone-500 font-bold mb-4">2. Filter Konten Tayang</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              disabled={isSending}
              onClick={() => sendCommand("CHANGE_FILTER", "ALL")}
              className={`p-3 rounded-xl border text-center transition ${
                activeFilter === "ALL" 
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                  : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-600"
              }`}
            >
              <div className="font-bold text-xs mb-0.5">Semua Media</div>
              <div className="text-[10px] opacity-60">Campur Total</div>
            </button>

            <button
              disabled={isSending}
              onClick={() => sendCommand("CHANGE_FILTER", "GUEST")}
              className={`p-3 rounded-xl border text-center transition ${
                activeFilter === "GUEST" 
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                  : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-600"
              }`}
            >
              <div className="font-bold text-xs mb-0.5">Kamera Tamu</div>
              <div className="text-[10px] opacity-60">Hanya dari HP Tamu</div>
            </button>

            <button
              disabled={isSending}
              onClick={() => sendCommand("CHANGE_FILTER", "BOOTH")}
              className={`p-3 rounded-xl border text-center transition ${
                activeFilter === "BOOTH" 
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                  : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-600"
              }`}
            >
              <div className="font-bold text-xs mb-0.5">iPad Booth</div>
              <div className="text-[10px] opacity-60">Hanya Photobooth</div>
            </button>
          </div>
        </div>

        {/* 3. Scene Director (Custom Scene) */}
        <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl space-y-4">
          <h2 className="text-[11px] uppercase tracking-widest text-stone-500 font-bold mb-4 flex items-center gap-2">
            3. Scene Director <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full text-[9px]">FULL-SCREEN BAJAKAN</span>
          </h2>
          <p className="text-xs text-stone-400 leading-relaxed mb-4">
            Upload logo WO, QR Code Amplop, atau jadwal acara di sini. Saat gambar terpilih, proyektor akan langsung dibajak dan hanya menampilkan gambar ini secara <i>full-screen</i>.
          </p>

          <div className="relative">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleSceneUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isSending}
            />
            <div className={`p-6 rounded-2xl border-2 border-dashed flex items-center justify-between transition ${isSending ? 'bg-stone-950 border-stone-800 opacity-50' : 'bg-rose-500/5 border-rose-500/30 hover:bg-rose-500/10'}`}>
              <div className="flex items-center gap-4">
                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-bold text-sm text-rose-300">Pilih Scene / Banner Khusus</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Langsung menimpa tayangan proyektor saat dipilih</div>
                </div>
              </div>
            </div>
          </div>
          
          {activeMode === "custom_scene" && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs text-rose-400 font-bold">Proyektor sedang dibajak (Custom Scene Aktif)</span>
            </div>
          )}
        </div>

        {/* 4. Bulk Upload Photobooth */}
        <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] uppercase tracking-widest text-stone-500 font-bold">4. Upload Massal Data Booth</h2>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">Anti-Ngehang</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed mb-4">
            Masukkan Flashdisk/AirDrop dari vendor Booth. Klik tombol di bawah ini lalu pilih/sorot puluhan foto sekaligus. Sistem akan mengantrekannya ke proyektor tanpa membebani laptop Anda.
          </p>

          <div className="relative">
            <input 
              type="file" 
              multiple 
              accept="image/*,video/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleBulkUpload(Array.from(e.target.files));
                  e.target.value = ""; // reset
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={uploadQueue.total > 0 && uploadQueue.current < uploadQueue.total}
            />
            <div className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition ${uploadQueue.total > 0 && uploadQueue.current < uploadQueue.total ? 'bg-stone-950 border-stone-800' : 'bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10'}`}>
              <svg className="w-8 h-8 text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="font-bold text-sm text-blue-300">Pilih / Drag Ratusan Foto Booth</div>
              <div className="text-[10px] text-stone-500 mt-1">Format: JPG, PNG, MP4. (Maks 25MB per file)</div>
            </div>
          </div>

          {/* Progress Bar */}
          {uploadQueue.total > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-stone-950 border border-stone-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-stone-300">Memproses Antrean Upload...</span>
                <span className="text-xs font-mono text-emerald-400">{uploadQueue.current} / {uploadQueue.total}</span>
              </div>
              <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                <div 
                  className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${(uploadQueue.current / uploadQueue.total) * 100}%` }}
                ></div>
              </div>
              {uploadQueue.current === uploadQueue.total && (
                <div className="mt-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Semua file berhasil dikirim ke Proyektor & GDrive!
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
