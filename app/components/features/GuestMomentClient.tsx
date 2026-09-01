"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface GuestMomentClientProps {
  invitationId: string;
  coupleName: string;
  coverUrl?: string;
  memories: any[];
  galleryUrl: string;
  backUrl: string;
}

export default function GuestMomentClient({ invitationId, coupleName, coverUrl, memories, galleryUrl, backUrl }: GuestMomentClientProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          
          // Max dimensions (e.g. 1080p width max)
          const MAX_WIDTH = 1080;
          const MAX_HEIGHT = 1080;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality (targets ~100-200KB usually)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(10);
    setErrorMsg("");
    setSuccessMsg("");

    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput.files?.[0];
    const senderName = (form.querySelector('input[name="senderName"]') as HTMLInputElement).value;
    
    if (!file) {
      setErrorMsg("Pilih foto terlebih dahulu.");
      setIsUploading(false);
      return;
    }

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(p => (p < 80 ? p + 10 : p));
    }, 300);

    try {
      // 1. Compress Image via Canvas
      const base64File = await compressImage(file);
      setUploadProgress(85);

      // 2. Send JSON payload
      const payload = {
        invitationId,
        senderName,
        senderEmail: "guest@moment.com",
        base64File,
        mimeType: "image/jpeg",
        fileName: file.name.replace(/\.[^/.]+$/, "") + ".jpg"
      };

      const res = await fetch("/api/public/memories/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Momen berhasil dikirim! Silakan lihat layar.");
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
            &ldquo;Bagikan foto momen terbaik Anda secara langsung ke buku tamu digital kami.&rdquo;
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
              
              <div className="flex flex-col items-center gap-3 mt-8">
                <Link 
                  href={galleryUrl}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-900/30 transition-all text-center block"
                >
                  Lihat Galeri Foto Tamu
                </Link>
                <button onClick={() => setSuccessMsg("")} className="text-xs text-stone-400 font-bold uppercase tracking-widest hover:text-white transition cursor-pointer mt-2">
                  Atau Upload Foto Lain
                </button>
              </div>
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
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Pilih Foto</label>
                <input
                  type="file"
                  name="file"
                  required
                  accept="image/*"
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
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Mengirim Momen...</span>
                  </>
                ) : (
                  "Upload Sekarang"
                )}
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
                  <Image src={m.thumbnailUrl || m.mediaUrl || m.url} alt={m.senderName} fill className="object-cover" />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                    <p className="text-[9px] text-white font-bold truncate text-center">{m.senderName}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-center">
               <Link href={galleryUrl} className="text-xs text-stone-400 hover:text-white font-bold tracking-wider underline underline-offset-4 decoration-stone-600">
                 Buka Galeri Foto Keseluruhan
               </Link>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-4 left-4 z-20">
         <Link
            href={backUrl}
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
