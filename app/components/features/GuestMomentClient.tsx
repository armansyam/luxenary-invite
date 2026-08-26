"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface GuestMomentClientProps {
  invitationId: string;
  subdomain: string;
  coupleName: string;
  coverUrl?: string;
  memories: any[];
}

export default function GuestMomentClient({ invitationId, subdomain, coupleName, coverUrl, memories }: GuestMomentClientProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(10);
    setErrorMsg("");
    setSuccessMsg("");

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(p => (p < 90 ? p + 10 : p));
    }, 500);

    try {
      const res = await fetch("/api/public/memories/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Momen berhasil dikirim! Silakan lihat layar proyektor.");
        form.reset();
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        setErrorMsg(data.error || "Gagal mengunggah momen.");
      }
    } catch (err) {
      clearInterval(progressInterval);
      setErrorMsg("Terjadi kesalahan sistem.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // 6 latest memories
  const recentMemories = [...memories].slice(0, 6);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans relative flex flex-col items-center overflow-x-hidden selection:bg-amber-500/30">
      
      {/* Background Cover */}
      {coverUrl && (
        <div className="fixed inset-0 w-full h-full z-0">
          <Image 
            src={coverUrl} 
            alt="Cover Background" 
            fill 
            className="object-cover opacity-30 grayscale-[30%] brightness-75"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/60 to-stone-950/95"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col p-6 min-h-screen">
        
        {/* Header */}
        <div className="text-center mt-12 mb-10">
          <span className="text-xs tracking-[0.3em] text-amber-500 font-bold uppercase mb-3 block">Guest Moment</span>
          <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-wide mb-2 drop-shadow-xl">{coupleName}</h1>
          <p className="text-sm text-stone-300 italic font-serif opacity-90 max-w-xs mx-auto">
            "Bagikan foto & video Anda secara langsung ke layar proyektor acara kami."
          </p>
        </div>

        {/* Uploader Card */}
        <div className="bg-stone-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl mb-12">
          {successMsg ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">Berhasil Dikirim!</h3>
              <p className="text-emerald-400/80 text-sm mt-1">{successMsg}</p>
              <button onClick={() => setSuccessMsg("")} className="mt-6 text-xs text-amber-500 font-bold uppercase tracking-widest hover:text-amber-400 transition cursor-pointer">
                Upload Lagi
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <input type="hidden" name="invitationId" value={invitationId} />
              <input type="hidden" name="senderEmail" value="guest@moment.com" />
              
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Nama Anda</label>
                <input
                  type="text"
                  name="senderName"
                  required
                  placeholder="Misal: Keluarga Besar / Sahabat"
                  className="w-full px-4 py-3.5 rounded-xl bg-stone-950/50 border border-stone-700 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Pilih Foto / Video</label>
                <input
                  type="file"
                  name="file"
                  required
                  accept="image/*,video/*"
                  className="w-full text-sm text-stone-300 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-stone-950 hover:file:bg-amber-400 cursor-pointer transition-colors border border-dashed border-stone-600 rounded-2xl p-2 bg-stone-950/30"
                />
              </div>

              {errorMsg && (
                <div className="text-rose-400 text-xs font-bold bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 text-center">
                  {errorMsg}
                </div>
              )}

              {isUploading && (
                <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
              >
                {isUploading ? "Mengirim Momen..." : "Upload Sekarang"}
              </button>
            </form>
          )}
        </div>

        {/* Highlight Gallery */}
        {recentMemories.length > 0 && (
          <div className="mt-auto pb-10 w-full">
            <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em] mb-4 text-center">
              Highlight Terbaru
            </h3>
            <div className="flex gap-3 overflow-x-auto snap-x pb-4 scrollbar-none px-2 -mx-2">
              {recentMemories.map((m) => (
                <div key={m.id} className="w-24 h-24 shrink-0 snap-start rounded-2xl overflow-hidden border border-white/10 relative group">
                  {m.mediaType === "VIDEO" ? (
                    <video src={m.url || m.mediaUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Image src={m.thumbnailUrl || m.mediaUrl || m.url} alt={m.senderName} fill className="object-cover" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                    <p className="text-[9px] text-white font-bold truncate text-center">{m.senderName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-4 left-4 z-20">
         <Link
            href={`/s/${subdomain}`}
            className="w-10 h-10 rounded-full bg-stone-900/80 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-stone-800 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
      </div>

    </div>
  );
}
