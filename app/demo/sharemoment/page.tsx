"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export default function DemoShareMomentPage() {
  const router = useRouter();

  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to compressed preview base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedFile(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSimulatedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim()) return;

    setIsProcessing(true);

    // Simulated step 1
    setProcessStep("Mengompresi dan mengoptimasi visual foto...");
    await new Promise((r) => setTimeout(r, 700));

    // Simulated step 2
    setProcessStep("Menyematkan ucapan dan stempel waktu...");
    await new Promise((r) => setTimeout(r, 800));

    // Simulated step 3: Save to sessionStorage so it immediately shows in /demo/memories
    try {
      const savedMoments = JSON.parse(sessionStorage.getItem("demo_guest_moments") || "[]");
      const newMoment = {
        id: `demo-user-${Date.now()}`,
        senderName: senderName.trim(),
        message: message.trim() || "Selamat menempuh hidup baru! Bahagia dan berkah selalu selamanya ✨",
        mediaUrl: selectedFile || "/demo/candani/gallery_01.webp",
        createdAt: new Date().toISOString(),
        isUserUploaded: true,
      };
      savedMoments.unshift(newMoment);
      sessionStorage.setItem("demo_guest_moments", JSON.stringify(savedMoments));
    } catch {
      // Ignore storage error
    }

    setProcessStep("Momen berhasil dikirim ke layar pernikahan!");
    await new Promise((r) => setTimeout(r, 600));

    setIsProcessing(false);
    setUploadSuccess(true);
  };

  const handleReset = () => {
    setSenderName("");
    setMessage("");
    setSelectedFile(null);
    setUploadSuccess(false);
    setProcessStep("");
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-stone-100 font-sans pb-20" style={{ colorScheme: "only dark" }}>
      {/* Top Professional Navbar */}
      <header className="bg-[#121215] border-b border-stone-800 sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/demo" className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
              <BrandLogo size="sm" />
            </Link>
            <div className="border-l border-stone-800 pl-3">
              <span className="text-xs font-bold tracking-tight text-white block">BUKU TAMU FOTO DIGITAL</span>
              <p className="text-[10px] text-stone-400">Simulasi Kamera & Ucapan Tamu</p>
            </div>
          </div>

          <Link
            href="/demo/memories"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Lihat Galeri Tamu</span>
          </Link>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-md mx-auto px-4 pt-8">
        <div className="text-center mb-6">
          <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
            Fitur Interaktif Hari-H
          </span>
          <h1 className="text-2xl font-serif text-white mt-3 mb-1.5">Bagikan Momen Bahagia</h1>
          <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
            Di hari pernikahan, tamu undangan memindai QR code di meja untuk mengunggah foto selfie dan ucapan langsung dari smartphone mereka.
          </p>
        </div>

        {uploadSuccess ? (
          /* Kartu Sukses Simulasi */
          <div className="bg-[#121215] border border-stone-800 rounded-3xl p-6 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Momen Berhasil Dibagikan!</h3>
            <p className="text-xs text-stone-400 mb-6 leading-relaxed">
              Foto dan doa Anda telah disimulasikan dan otomatis diteruskan ke feed galeri pernikahan.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => router.push("/demo/memories")}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <span>Lihat Foto Anda di Galeri Tamu</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <button
                onClick={handleReset}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs rounded-xl transition cursor-pointer border border-stone-800"
              >
                Kirim Momen Lainnya
              </button>
            </div>
          </div>
        ) : (
          /* Form Input */
          <div className="bg-[#121215] border border-stone-800 rounded-3xl p-6 shadow-2xl">
            <form onSubmit={handleSimulatedSubmit} className="space-y-4">
              {/* Slot Foto */}
              <div>
                <label className="text-[11px] font-bold text-stone-300 block mb-2">
                  Foto Selfie / Momen Kebersamaan
                </label>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-700 aspect-video max-h-48 group">
                    <img
                      src={selectedFile}
                      alt="Preview Unggahan"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-lg transition cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-stone-700 hover:border-amber-500/60 rounded-2xl p-6 text-center transition cursor-pointer bg-stone-900/50 hover:bg-stone-900 group"
                  >
                    <div className="w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center mx-auto mb-2 text-stone-400 group-hover:text-amber-400 group-hover:scale-110 transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-stone-300 group-hover:text-amber-300 transition block">
                      Ambil Foto atau Pilih dari Galeri
                    </span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      JPG, PNG, atau WebP (Simulasi tanpa menyimpan ke server)
                    </span>
                  </button>
                )}
              </div>

              {/* Nama Pengirim */}
              <div>
                <label className="text-[11px] font-bold text-stone-300 block mb-1">
                  Nama Anda / Rombongan
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Contoh: Dimas & Clarissa (Sahabat SMA)"
                  className="w-full text-xs px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl focus:border-amber-500 focus:outline-none text-white"
                  required
                />
              </div>

              {/* Ucapan / Doa */}
              <div>
                <label className="text-[11px] font-bold text-stone-300 block mb-1">
                  Pesan Ucapan & Doa Hangat
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tuliskan ucapan selamat dan doa restu untuk kedua mempelai..."
                  className="w-full text-xs px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl focus:border-amber-500 focus:outline-none text-white resize-none"
                ></textarea>
              </div>

              {/* Status Info Box */}
              <div className="bg-stone-900/60 border border-stone-800 p-3 rounded-xl text-left">
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  <strong>Uji Coba Demo:</strong> Fitur ini berjalan langsung di peramban Anda untuk simulasi. Foto tidak disimpan di penyimpanan permanen.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>{processStep}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Kirim Momen Sekarang (Simulasi)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
