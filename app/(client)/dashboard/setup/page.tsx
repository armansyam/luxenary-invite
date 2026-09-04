"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandLogo } from "@/components/BrandLogo";

function SetupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const queryPlan = searchParams.get("plan");
  const queryOrder = searchParams.get("order");

  const [currentPlan, setCurrentPlan] = useState<string>(queryPlan?.toUpperCase() || "");
  const [planNames, setPlanNames] = useState<Record<string, string>>({
    TRADITIONAL: "Traditional",
    MODERN: "Modern",
    PREMIUM: "Premium",
  });
  const [platformName, setPlatformName] = useState("");
  const [themesList, setThemesList] = useState<any[]>([]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State: Murni kosong tanpa default palsu
  const [groomNickname, setGroomNickname] = useState("");
  const [brideNickname, setBrideNickname] = useState("");
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [city, setCity] = useState("");
  const [timeZone, setTimeZone] = useState("WIB");
  const [akadTime, setAkadTime] = useState("");
  const [resepsiTime, setResepsiTime] = useState("");
  const [themeId, setThemeId] = useState("");

  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Load Draft from localStorage on mount
  useEffect(() => {
    try {
      // Auto detect user browser timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes("Makassar") || tz.includes("Bali") || tz.includes("Pontianak") || tz.includes("Manado") || tz.includes("Ujung_Pandang")) {
        setTimeZone("WITA");
      } else if (tz.includes("Jayapura") || tz.includes("Ambon")) {
        setTimeZone("WIT");
      } else {
        setTimeZone("WIB");
      }

      const saved = localStorage.getItem("luxenary_setup_draft");
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.groomNickname) setGroomNickname(draft.groomNickname);
        if (draft.brideNickname) setBrideNickname(draft.brideNickname);
        if (draft.groomName) setGroomName(draft.groomName);
        if (draft.brideName) setBrideName(draft.brideName);
        if (draft.weddingDate) setWeddingDate(draft.weddingDate);
        if (draft.city) setCity(draft.city);
        if (draft.timeZone) setTimeZone(draft.timeZone);
        if (draft.akadTime) setAkadTime(draft.akadTime);
        if (draft.resepsiTime) setResepsiTime(draft.resepsiTime);
        if (draft.themeId) setThemeId(draft.themeId);
        if (draft.step) setStep(draft.step);
      }
    } catch {}
    setIsDraftLoaded(true);
  }, []);

  // Save Draft to localStorage on change
  useEffect(() => {
    if (!isDraftLoaded) return;
    const draft = { groomNickname, brideNickname, groomName, brideName, weddingDate, city, timeZone, akadTime, resepsiTime, themeId, step };
    localStorage.setItem("luxenary_setup_draft", JSON.stringify(draft));
  }, [groomNickname, brideNickname, groomName, brideName, weddingDate, city, timeZone, akadTime, resepsiTime, themeId, step, isDraftLoaded]);

  // Resolve dynamic host, settings, and themes on mount
  useEffect(() => {
    

    // Fetch dynamic themes list
    fetch("/api/public/themes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setThemesList(data);
        }
      })
      .catch(() => {});

    // Fetch custom package names from public settings (Single Source of Truth)
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.packages)) {
          const names: Record<string, string> = {};
          data.packages.forEach((pkg: any) => {
            names[pkg.id] = pkg.name;
          });
          setPlanNames((prev) => ({ ...prev, ...names }));
        }
        if (data.platformName) {
          setPlatformName(data.platformName);
        }
      })
      .catch(() => {});

    // Resolve order planType if order ID provided in URL
    if (queryOrder) {
      fetch(`/api/client/orders/${queryOrder}/status`)
        .then((r) => r.json())
        .then((order) => {
          if (order.planType) {
            setCurrentPlan(order.planType.toUpperCase());
          }
        })
        .catch(() => {});
    } else if (!queryPlan) {
      // Jika tidak ada query param, ambil paket aktif dari onboarding-state klien
      fetch("/api/client/onboarding-state")
        .then((r) => r.json())
        .then((state) => {
          if (state.planType) {
            setCurrentPlan(state.planType.toUpperCase());
          } else if (state.redirectUrl) {
            try {
              const parsedUrl = new URL(state.redirectUrl, window.location.origin);
              const p = parsedUrl.searchParams.get("plan");
              if (p) setCurrentPlan(p.toUpperCase());
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [queryOrder, queryPlan]);

  // Filter themes based on the user's purchased package tier (Waterfall / All-Access Mapping)
  const filteredThemes = themesList.filter((t) => {
    const cat = (t.category || "").toUpperCase();
    const plan = currentPlan.toUpperCase();
    
    if (plan === "PREMIUM") return true; // Premium gets everything
    if (plan === "MODERN") return cat === "MODERN" || cat === "TRADITIONAL"; // Modern gets Modern + Traditional
    if (plan === "TRADITIONAL") return cat === "TRADITIONAL"; // Traditional gets only Traditional
    
    return true;
  });
  const availableThemes = filteredThemes.length > 0 ? filteredThemes : themesList;

  // Reset themeId jika tema yang sebelumnya dipilih tidak tersedia pada tier ini
  useEffect(() => {
    if (themeId && availableThemes.length > 0) {
      const currentSelectedExists = availableThemes.some((t) => t.id === themeId);
      if (!currentSelectedExists) {
        setThemeId("");
      }
    }
  }, [currentPlan, availableThemes, themeId]);



  const handleCompleteSetup = async () => {
    if (!groomNickname.trim() || !brideNickname.trim()) {
      setError("Nama panggilan kedua mempelai wajib diisi.");
      setStep(1);
      return;
    }

    if (!themeId) {
      setError("Silakan pilih salah satu desain tema terlebih dahulu.");
      setStep(3);
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
          timeZone,
          akadTime: akadTime.trim(),
          resepsiTime: resepsiTime.trim(),
          themeId,
          planType: currentPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat undangan.");
      }

      // Success Redirect directly to the invitation editor
      localStorage.removeItem("luxenary_setup_draft");
      router.push(`/dashboard/invitation/${data.invitationId}`);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const handleSkipSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/client/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groomNickname: "",
          brideNickname: "",
          groomName: "",
          brideName: "",
          subdomain: "",
          weddingDate: "",
          city: "",
          themeId: "", // Murni kosong tanpa tema default
          planType: currentPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal melewati penyiapan.");
      }

      localStorage.removeItem("luxenary_setup_draft");
      router.push(`/dashboard/invitation/${data.invitationId}`);
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
            <BrandLogo size="sm" lightBg />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">Wedding Studio</span>
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
                    placeholder="Masukkan nama panggilan mempelai pria"
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
                    placeholder="Masukkan nama panggilan mempelai wanita"
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
                    placeholder="Masukkan nama lengkap mempelai pria"
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
                    placeholder="Masukkan nama lengkap mempelai wanita"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>


            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSkipSetup}
                disabled={loading}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Lewati Setup (Atur Nanti)"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (!groomNickname.trim() || !brideNickname.trim()) {
                    setError("Harap isi nama panggilan kedua mempelai.");
                    return;
                  }

                  setError(null);
                  setStep(2);
                }}
                className="px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <span>Lanjut ke Tanggal Acara</span>
                
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
                  placeholder="Contoh: Jakarta, Surabaya, Makassar, Medan, Bandung, dll."
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              {/* Zona Waktu Acara Dinamis */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Zona Waktu Acara
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "WIB", label: "WIB (Barat)" },
                    { id: "WITA", label: "WITA (Tengah)" },
                    { id: "WIT", label: "WIT (Timur)" },
                  ].map((tz) => (
                    <button
                      key={tz.id}
                      type="button"
                      onClick={() => setTimeZone(tz.id)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        timeZone === tz.id
                          ? "border-amber-800 bg-amber-50 text-amber-950 ring-2 ring-amber-800/20 shadow-xs"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-white"
                      }`}
                    >
                      <span>{tz.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Waktu Opsional */}
              <div className="pt-2 border-t border-stone-100">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  Perkiraan Jam Acara <span className="text-stone-400 font-normal lowercase">(opsional — dapat disesuaikan nanti di editor)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Waktu Akad / Pemberkatan
                    </label>
                    <input
                      type="text"
                      value={akadTime}
                      onChange={(e) => setAkadTime(e.target.value)}
                      placeholder={`Contoh: 08:00 - 10:00 ${timeZone}`}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Waktu Resepsi
                    </label>
                    <input
                      type="text"
                      value={resepsiTime}
                      onChange={(e) => setResepsiTime(e.target.value)}
                      placeholder={`Contoh: 11:00 - 14:00 ${timeZone}`}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 leading-relaxed">
                Detail lengkap seperti nama gedung, alamat lengkap, peta lokasi, dan multi-sesi adat (Mappacci, Siraman, Pengajian, dll.) dapat Anda tambahkan dengan leluasa di Studio Editor.
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
                  if (!weddingDate) {
                    setError("Harap tentukan tanggal pernikahan utama.");
                    return;
                  }
                  if (!city.trim()) {
                    setError("Harap isi kota atau wilayah pelaksanaan acara.");
                    return;
                  }
                  setError(null);
                  setStep(3);
                }}
                className="px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>Pilih Desain Tema</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Pilihan Tema Sesuai Kategori Paket */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold mb-1">
                <span>Paket Anda:</span>
                <span className="font-extrabold">{planNames[currentPlan] || currentPlan}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Pilih Desain Tema Perdana</h1>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                Berikut adalah koleksi tema yang tersedia untuk {planNames[currentPlan] || currentPlan}. Pilih tema awal yang Anda sukai.
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
                <span className={`px-3 py-1 rounded-full text-xs font-mono ${themeId ? "bg-white/10 text-stone-300" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                  Tema: {themesList.find((t: any) => t.id === themeId)?.name || (themeId ? themeId : "Belum Memilih Tema")}
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
                    
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-stone-400 border-t border-stone-200">
        <span>{platformName} &copy; {new Date().getFullYear()} — Self-Service Invitation Builder</span>
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
