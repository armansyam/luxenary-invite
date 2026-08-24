"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

const THEMES = [
  {
    id: "kalandra",
    name: "Kalandra",
    series: "Premium Series",
    category: "PREMIUM",
    tagline: "Monochrome Editorial & Magazine Aesthetic",
    accent: "#8c7355",
  },
  {
    id: "valente",
    name: "Valente",
    series: "Premium Series",
    category: "PREMIUM",
    tagline: "Warm Terracotta & Romantic Cinema",
    accent: "#a85d42",
  },
  {
    id: "aurelia",
    name: "Aurelia",
    series: "Premium Series",
    category: "PREMIUM",
    tagline: "Classic Gold Monogram & High-End Luxury",
    accent: "#bfa15f",
  },
  {
    id: "artisan",
    name: "Artisan",
    series: "Premium Series",
    category: "PREMIUM",
    tagline: "Minimalist Typographic Layout & Warm Grain",
    accent: "#736b5e",
  },
  {
    id: "wave",
    name: "Wave",
    series: "Modern Series",
    category: "MODERN",
    tagline: "Moody & Dramatic Liquid Wave Curves",
    accent: "#2c3e50",
  },
  {
    id: "papercut",
    name: "Papercut",
    series: "Modern Series",
    category: "MODERN",
    tagline: "Craft Scrapbook & Polaroid Cutout Aesthetic",
    accent: "#6e5849",
  },
  {
    id: "ameera",
    name: "Ameera",
    series: "Modern Series",
    category: "MODERN",
    tagline: "Contemporary Heritage & Modern Contrast",
    accent: "#3d342d",
  },
  {
    id: "prameswari",
    name: "Prameswari",
    series: "Traditional Series",
    category: "TRADITIONAL",
    tagline: "Sakral, Megah & Royal Keraton Nusantara",
    accent: "#8b6f38",
  },
  {
    id: "dillalucky",
    name: "Dilla Lucky",
    series: "Traditional Series",
    category: "TRADITIONAL",
    tagline: "Islami Sakral, Batik Ornament & Penuh Doa",
    accent: "#4a5d4e",
  },
];

function SetupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const planParam = searchParams.get("plan") || "PREMIUM";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [groomNickname, setGroomNickname] = useState("");
  const [brideNickname, setBrideNickname] = useState("");
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");
  const [weddingDate, setWeddingDate] = useState("2026-10-05");
  const [city, setCity] = useState("Makassar");
  const [themeId, setThemeId] = useState("kalandra");

  // Slugify for preview
  const groomSlug = groomNickname.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") || "pria";
  const brideSlug = brideNickname.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") || "wanita";
  const subdomainPreview = `${groomSlug}-${brideSlug}.luxenary.id`;

  // Filter themes based on plan or show all
  const availableThemes = THEMES;

  const handleCompleteSetup = async () => {
    if (!groomNickname.trim() || !brideNickname.trim()) {
      setError("Nama panggilan kedua mempelai wajib diisi.");
      setStep(1);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/client/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groomNickname: groomNickname.trim(),
          brideNickname: brideNickname.trim(),
          groomName: groomName.trim() || groomNickname.trim(),
          brideName: brideName.trim() || brideNickname.trim(),
          weddingDate,
          city: city.trim(),
          themeId,
          planType: planParam,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat undangan.");
      }

      // Success -> Redirect to Dashboard Studio
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-serif font-bold text-sm">
              L
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">Luxenary Studio</span>
              <span className="text-[11px] text-stone-500">Panduan Penyiapan Undangan Klien</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Langkah {step} dari 3</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`w-6 h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? "bg-amber-800" : s < step ? "bg-emerald-600" : "bg-stone-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 flex-1">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold ml-3">✕</button>
          </div>
        )}

        {/* STEP 1: Profil Pasangan */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 1</span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Nama Pasangan Mempelai</h1>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                Masukkan nama panggilan Anda dan pasangan untuk tautan web dan tajuk utama undangan.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Nama Panggilan Pria <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={groomNickname}
                    onChange={(e) => setGroomNickname(e.target.value)}
                    placeholder="Contoh: Yus"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Nama Panggilan Wanita <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={brideNickname}
                    onChange={(e) => setBrideNickname(e.target.value)}
                    placeholder="Contoh: Ulfa"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Nama Lengkap &amp; Gelar Pria <span className="text-stone-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={groomName}
                    onChange={(e) => setGroomName(e.target.value)}
                    placeholder="Contoh: Muhammad Yusran, S.T."
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Nama Lengkap &amp; Gelar Wanita <span className="text-stone-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={brideName}
                    onChange={(e) => setBrideName(e.target.value)}
                    placeholder="Contoh: Ulfah Mawaddah, S.Ked."
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Subdomain Preview Pill */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">Tautan Undangan Anda:</span>
                  <span className="text-xs font-mono font-bold text-amber-800 mt-0.5 inline-block">
                    https://{subdomainPreview}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-amber-100/80 text-amber-900 rounded-full text-[10px] font-bold">
                  Auto-Generated
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!groomNickname.trim() || !brideNickname.trim()) {
                    setError("Harap isi nama panggilan kedua mempelai.");
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className="px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>Lanjut ke Tanggal Acara</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Tanggal & Lokasi Utama */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 2</span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Hari Bahagia &amp; Lokasi</h1>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                Tentukan tanggal perkiraan pernikahan dan kota pelaksanaan acara utama.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Tanggal Pernikahan Utama <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
                <p className="text-[11px] text-stone-400 mt-1">Tanggal ini akan digunakan sebagai hitung mundur (countdown) awal.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Kota / Wilayah Utama Acara <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Contoh: Makassar, Jakarta, Surabaya, dll."
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 leading-relaxed">
                Detail lengkap seperti gedung, alamat lengkap, jam acara, dan multi-sesi adat (Mappacci, Mapparola, dll.) dapat Anda atur dengan mudah di dalam Studio Editor setelah wizard ini.
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ← Kembali
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(3);
                }}
                className="px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>Pilih Desain Tema</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Pilihan Tema Awal */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 3</span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Pilih Desain Tema Perdana</h1>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                Pilih gaya tata letak awal yang Anda sukai. Anda tetap bebas mengganti tema kapan saja nanti di studio.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableThemes.map((theme) => {
                const isSelected = themeId === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => setThemeId(theme.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                      isSelected
                        ? "bg-white border-amber-800 shadow-md ring-2 ring-amber-800/20"
                        : "bg-white/70 border-stone-200 hover:bg-white hover:border-stone-300"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          {theme.series}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-800 text-white text-[10px] font-bold">
                            Terpilih
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-serif font-bold text-stone-900">{theme.name}</h3>
                      <p className="text-xs text-stone-500 leading-relaxed">{theme.tagline}</p>
                    </div>

                    <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                      <span className="font-mono">{theme.id}.html</span>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Box */}
            <div className="p-5 rounded-3xl bg-stone-900 text-white shadow-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Undangan Siap Dibuat</span>
                  <h4 className="text-lg font-serif font-bold text-white">
                    {groomNickname} &amp; {brideNickname}
                  </h4>
                </div>
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono text-stone-300">
                  Tema: {THEMES.find((t) => t.id === themeId)?.name || themeId}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Setelah ini Anda akan langsung masuk ke Studio Editor untuk melengkapi susunan acara, foto pre-wedding, dan daftar tamu.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                ← Kembali
              </button>

              <button
                type="button"
                onClick={handleCompleteSetup}
                disabled={loading}
                className="px-8 py-3.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-amber-950/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Menyiapkan Studio Undangan...</span>
                  </>
                ) : (
                  <>
                    <span>Selesai &amp; Masuk ke Studio Undangan</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-stone-400 border-t border-stone-200">
        <span>Luxenary Wedding Studio &copy; 2026 — Self-Service Invitation Builder</span>
      </footer>
    </div>
  );
}

export default function SetupWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <SetupWizardContent />
    </Suspense>
  );
}
