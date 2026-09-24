"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandLogo } from "@/components/BrandLogo";
import { DEFAULT_PLAN_NAMES } from "@/lib/planUtils";


// Daftar kota/kabupaten Indonesia dengan zona waktu \u2014 sumber tunggal untuk autocomplete
const INDONESIAN_CITIES: { name: string; tz: "WIB" | "WITA" | "WIT" }[] = [
  // WIB \u2014 Sumatera & Jawa
  { name: "Jakarta", tz: "WIB" }, { name: "Surabaya", tz: "WIB" },
  { name: "Bandung", tz: "WIB" }, { name: "Medan", tz: "WIB" },
  { name: "Semarang", tz: "WIB" }, { name: "Palembang", tz: "WIB" },
  { name: "Tangerang", tz: "WIB" }, { name: "Depok", tz: "WIB" },
  { name: "Bekasi", tz: "WIB" }, { name: "Bogor", tz: "WIB" },
  { name: "Yogyakarta", tz: "WIB" }, { name: "Malang", tz: "WIB" },
  { name: "Pekanbaru", tz: "WIB" }, { name: "Batam", tz: "WIB" },
  { name: "Padang", tz: "WIB" }, { name: "Bandar Lampung", tz: "WIB" },
  { name: "Jambi", tz: "WIB" }, { name: "Bengkulu", tz: "WIB" },
  { name: "Banda Aceh", tz: "WIB" }, { name: "Lhokseumawe", tz: "WIB" },
  { name: "Langsa", tz: "WIB" }, { name: "Sabang", tz: "WIB" },
  { name: "Sibolga", tz: "WIB" }, { name: "Padang Sidempuan", tz: "WIB" },
  { name: "Binjai", tz: "WIB" }, { name: "Pematangsiantar", tz: "WIB" },
  { name: "Tanjungpinang", tz: "WIB" }, { name: "Pangkal Pinang", tz: "WIB" },
  { name: "Serang", tz: "WIB" }, { name: "Cilegon", tz: "WIB" },
  { name: "Cirebon", tz: "WIB" }, { name: "Sukabumi", tz: "WIB" },
  { name: "Tasikmalaya", tz: "WIB" }, { name: "Banjar", tz: "WIB" },
  { name: "Magelang", tz: "WIB" }, { name: "Solo", tz: "WIB" },
  { name: "Surakarta", tz: "WIB" }, { name: "Salatiga", tz: "WIB" },
  { name: "Pekalongan", tz: "WIB" }, { name: "Tegal", tz: "WIB" },
  { name: "Purwokerto", tz: "WIB" }, { name: "Cilacap", tz: "WIB" },
  { name: "Kediri", tz: "WIB" }, { name: "Madiun", tz: "WIB" },
  { name: "Mojokerto", tz: "WIB" }, { name: "Pasuruan", tz: "WIB" },
  { name: "Probolinggo", tz: "WIB" }, { name: "Blitar", tz: "WIB" },
  { name: "Jember", tz: "WIB" }, { name: "Banyuwangi", tz: "WIB" },
  { name: "Pontianak", tz: "WIB" }, { name: "Singkawang", tz: "WIB" },
  // WITA \u2014 Kalimantan Tengah-Selatan-Timur, Sulawesi, Bali, NTT, NTB
  { name: "Makassar", tz: "WITA" }, { name: "Denpasar", tz: "WITA" },
  { name: "Balikpapan", tz: "WITA" }, { name: "Samarinda", tz: "WITA" },
  { name: "Banjarmasin", tz: "WITA" }, { name: "Palangka Raya", tz: "WITA" },
  { name: "Mataram", tz: "WITA" }, { name: "Kupang", tz: "WITA" },
  { name: "Bima", tz: "WITA" }, { name: "Palu", tz: "WITA" },
  { name: "Kendari", tz: "WITA" }, { name: "Manado", tz: "WITA" },
  { name: "Gorontalo", tz: "WITA" }, { name: "Mamuju", tz: "WITA" },
  { name: "Kotabaru", tz: "WITA" }, { name: "Bontang", tz: "WITA" },
  { name: "Tarakan", tz: "WITA" }, { name: "Nunukan", tz: "WITA" },
  { name: "Tanjung Selor", tz: "WITA" }, { name: "Parepare", tz: "WITA" },
  { name: "Palopo", tz: "WITA" }, { name: "Bulukumba", tz: "WITA" },
  { name: "Sinjai", tz: "WITA" }, { name: "Enrekang", tz: "WITA" },
  // WIT \u2014 Maluku & Papua
  { name: "Ambon", tz: "WIT" }, { name: "Jayapura", tz: "WIT" },
  { name: "Sorong", tz: "WIT" }, { name: "Manokwari", tz: "WIT" },
  { name: "Fakfak", tz: "WIT" }, { name: "Ternate", tz: "WIT" },
  { name: "Tidore", tz: "WIT" }, { name: "Tual", tz: "WIT" },
  { name: "Merauke", tz: "WIT" }, { name: "Timika", tz: "WIT" },
];

function SetupWizardContent() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const queryPlan = searchParams.get("plan");
  const queryOrder = searchParams.get("order");

  const [currentPlan, setCurrentPlan] = useState<string>(queryPlan?.toUpperCase() || "");
  const [planNames, setPlanNames] = useState<Record<string, string>>({
    ...DEFAULT_PLAN_NAMES,
  });
  const [platformName, setPlatformName] = useState("");
  const [themesList, setThemesList] = useState<any[]>([]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBypassing, setIsBypassing] = useState(false);

  // Form State: Murni kosong tanpa default palsu
  const [groomNickname, setGroomNickname] = useState("");
  const [brideNickname, setBrideNickname] = useState("");
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [city, setCity] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [timeZone, setTimeZone] = useState("WIB");
  // Structured time state — bukan free-text agar format terjamin
  const [akadStart, setAkadStart] = useState("");
  const [akadEnd, setAkadEnd] = useState("");
  const [resepsiStart, setResepsiStart] = useState("");
  const [resepsiEnd, setResepsiEnd] = useState("");
  const [themeId, setThemeId] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "minimalist" | "modern" | "traditional">("all");

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

      const saved = localStorage.getItem("app_setup_draft") || localStorage.getItem("luxenary_setup_draft");
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.groomNickname) setGroomNickname(draft.groomNickname);
        if (draft.brideNickname) setBrideNickname(draft.brideNickname);
        if (draft.groomName) setGroomName(draft.groomName);
        if (draft.brideName) setBrideName(draft.brideName);
        if (draft.weddingDate) setWeddingDate(draft.weddingDate);
        if (draft.city) setCity(draft.city);
        if (draft.timeZone) setTimeZone(draft.timeZone);
        if (draft.akadStart) setAkadStart(draft.akadStart);
        if (draft.akadEnd) setAkadEnd(draft.akadEnd);
        if (draft.resepsiStart) setResepsiStart(draft.resepsiStart);
        if (draft.resepsiEnd) setResepsiEnd(draft.resepsiEnd);
        if (draft.themeId) setThemeId(draft.themeId);
        if (draft.step) setStep(draft.step);
      }
    } catch {}
    setIsDraftLoaded(true);
  }, []);

  // Save Draft to localStorage on change
  useEffect(() => {
    if (!isDraftLoaded) return;
    const draft = { groomNickname, brideNickname, groomName, brideName, weddingDate, city, timeZone, akadStart, akadEnd, resepsiStart, resepsiEnd, themeId, step };
    localStorage.setItem("app_setup_draft", JSON.stringify(draft));
  }, [groomNickname, brideNickname, groomName, brideName, weddingDate, city, timeZone, akadStart, akadEnd, resepsiStart, resepsiEnd, themeId, step, isDraftLoaded]);

  // Resolve dynamic host, settings, themes, and detect existing draft on mount
  useEffect(() => {
    // 1. Cek apakah user sudah memiliki undangan di database (Auto-Bypass jika sudah punya draft)
    fetch("/api/client/onboarding-state", { cache: "no-store" })
      .then((r) => r.json())
      .then((state) => {
        if (state.step === "COMPLETED" && state.invitation?.id) {
          setIsBypassing(true);
          router.push(`/dashboard/invitation/${state.invitation.id}`);
          return;
        }
        if (state.hasPaidOrder === false && state.redirectUrl) {
          router.replace(state.redirectUrl);
          return;
        }
        if (state.planType) {
          setCurrentPlan(state.planType.toUpperCase());
        }
      })
      .catch(() => {});

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
    }
  }, [queryOrder, router]);

  // Seluruh tema desain bebas dipilih di semua paket (All-Access Themes)
  const availableThemes = themesList;



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
          // Format terstruktur: "HH:MM – HH:MM TZ" — dijamin konsisten dari time picker
          akadTime: akadStart ? `${akadStart}${akadEnd ? ` – ${akadEnd}` : ""} ${timeZone}`.trim() : "",
          resepsiTime: resepsiStart ? `${resepsiStart}${resepsiEnd ? ` – ${resepsiEnd}` : ""} ${timeZone}`.trim() : "",
          themeId,
          planType: currentPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat undangan.");
      }

      // Success Redirect directly to the invitation editor
      localStorage.removeItem("app_setup_draft");
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

      localStorage.removeItem("app_setup_draft");
      localStorage.removeItem("luxenary_setup_draft");
      router.push(`/dashboard/invitation/${data.invitationId}`);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  if (isBypassing) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-600 font-medium">Menyiapkan Studio Undangan Anda...</p>
        </div>
      </div>
    );
  }

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
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-2">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="p-1 text-rose-500 hover:text-rose-800 rounded-lg hover:bg-rose-100/50 transition cursor-pointer ml-3 shrink-0"
                title="Tutup pesan"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
              <span className="text-[11px] text-rose-700">Sudah memiliki draf atau pernah membuat undangan?</span>
              <button
                type="button"
                onClick={() => { router.push("/dashboard"); }}
                className="text-[11px] font-bold text-rose-900 underline hover:text-black cursor-pointer"
              >
                Masuk Langsung ke Studio Undangan &rarr;
              </button>
            </div>
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

              <div className="relative">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Kota / Wilayah Utama Acara <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={cityQuery || city}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCityQuery(v);
                    setCity(v);
                    setShowCitySuggestions(v.length >= 1);
                  }}
                  onFocus={() => setShowCitySuggestions((cityQuery || city).length >= 1)}
                  onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
                  placeholder="Ketik nama kota atau kabupaten..."
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
                {showCitySuggestions && (() => {
                  const q = (cityQuery || city).toLowerCase().trim();
                  const filtered = INDONESIAN_CITIES.filter(c =>
                    c.name.toLowerCase().includes(q) ||
                    c.name.toLowerCase().startsWith(q)
                  ).slice(0, 8);
                  return filtered.length > 0 ? (
                    <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                      {filtered.map((c) => (
                        <li
                          key={c.name}
                          onMouseDown={() => {
                            setCity(c.name);
                            setCityQuery(c.name);
                            setShowCitySuggestions(false);
                            // Auto-isi zona waktu berdasarkan wilayah kota
                            if (c.tz) setTimeZone(c.tz);
                          }}
                          className="px-4 py-2.5 text-sm text-stone-800 hover:bg-amber-50 hover:text-amber-900 cursor-pointer flex items-center justify-between"
                        >
                          <span className="font-semibold">{c.name}</span>
                          <span className="text-[10px] text-stone-400 font-normal">{c.tz}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null;
                })()}
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

              {/* Input Waktu Terstruktur */}
              <div className="pt-2 border-t border-stone-100">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  Perkiraan Jam Acara <span className="text-stone-400 font-normal lowercase">(opsional — dapat disesuaikan nanti di editor)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Waktu Akad */}
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">Waktu Akad / Pemberkatan</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={akadStart}
                        onChange={(e) => setAkadStart(e.target.value)}
                        className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                      />
                      <span className="text-stone-400 text-xs font-medium shrink-0">–</span>
                      <input
                        type="time"
                        value={akadEnd}
                        onChange={(e) => setAkadEnd(e.target.value)}
                        className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                      />
                    </div>
                    {akadStart && (
                      <p className="mt-1 text-[10px] text-amber-700 font-medium">
                        {akadStart}{akadEnd ? ` – ${akadEnd}` : ""} {timeZone}
                      </p>
                    )}
                  </div>
                  {/* Waktu Resepsi */}
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">Waktu Resepsi</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={resepsiStart}
                        onChange={(e) => setResepsiStart(e.target.value)}
                        className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                      />
                      <span className="text-stone-400 text-xs font-medium shrink-0">–</span>
                      <input
                        type="time"
                        value={resepsiEnd}
                        onChange={(e) => setResepsiEnd(e.target.value)}
                        className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                      />
                    </div>
                    {resepsiStart && (
                      <p className="mt-1 text-[10px] text-amber-700 font-medium">
                        {resepsiStart}{resepsiEnd ? ` – ${resepsiEnd}` : ""} {timeZone}
                      </p>
                    )}
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

        {/* STEP 3: Pilihan Tema dengan Kategori & Thumbnail Preview */}
        {step === 3 && (() => {
          const categories = [
            { id: "all", label: "Semua" },
            { id: "minimalist", label: "Minimalis" },
            { id: "modern", label: "Modern" },
            { id: "traditional", label: "Tradisional" },
          ] as const;

          const filteredThemes = activeCategory === "all"
            ? availableThemes
            : availableThemes.filter((t: any) => t.category?.toLowerCase() === activeCategory);

          return (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold mb-1">
                  <span>Paket Anda:</span>
                  <span className="font-extrabold">{planNames[currentPlan] || currentPlan}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Pilih Desain Tema Perdana</h1>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                  Pilih tema awal yang Anda sukai. Dapat diganti kapan saja di Studio Editor.
                </p>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activeCategory === cat.id
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {cat.label}
                    {cat.id !== "all" && (
                      <span className="ml-1.5 opacity-60">
                        {availableThemes.filter((t: any) => t.category?.toLowerCase() === cat.id).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Theme Grid — Device Pair Mockup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredThemes.map((theme: any) => {
                  const isSelected = themeId === theme.id;
                  const thumbMobile = theme.thumbnailMobile || `/demo/${theme.id}/thumbnail_mobile.webp`;
                  const thumbDesktop = theme.thumbnailDesktop || `/demo/${theme.id}/thumbnail_desktop.webp`;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setThemeId(theme.id)}
                      className={`stp-card rounded-2xl p-3 border cursor-pointer transition-all ${
                        isSelected
                          ? "is-selected border-amber-800 bg-amber-50/20 ring-2 ring-amber-800/15 shadow-md"
                          : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm"
                      }`}
                    >
                      {/* Device Pair Scene */}
                      <div className="stp-scene">
                        {/* Tablet frame */}
                        <div className="stp-tablet">
                          <div className="stp-tablet-bar">
                            <div className="stp-tablet-dots"><span/><span/><span/></div>
                            <div className="stp-tablet-url">luxenary.id/{theme.id}</div>
                            <div style={{ width: "18px" }}/>
                          </div>
                          <div className="stp-tablet-screen">
                            <img
                              src={thumbDesktop}
                              alt={`${theme.name} desktop`}
                              loading="lazy"
                              onError={(e) => {
                                const el = e.currentTarget;
                                if (!el.src.includes("hero.webp") && !el.src.includes("cover.webp")) {
                                  el.src = `/demo/${theme.id}/hero.webp`;
                                } else if (el.src.includes("hero.webp")) {
                                  el.src = `/demo/${theme.id}/cover.webp`;
                                }
                              }}
                            />
                            <div className="stp-glare"/>
                          </div>
                        </div>

                        {/* Phone frame — overlapping bottom-left */}
                        <div className="stp-phone">
                          <div className="stp-phone-notch"/>
                          <div className="stp-phone-screen">
                            <img
                              src={thumbMobile}
                              alt={`${theme.name} mobile`}
                              loading="lazy"
                              onError={(e) => {
                                const el = e.currentTarget;
                                if (!el.src.includes("cover.webp")) el.src = `/demo/${theme.id}/cover.webp`;
                              }}
                            />
                            <div className="stp-glare"/>
                          </div>
                        </div>

                        {/* Selected badge */}
                        {isSelected && (
                          <span className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold shadow-md">
                            ✓
                          </span>
                        )}

                        {/* Premium badge */}
                        {theme.isPremium && (
                          <span className="absolute top-2 left-2 z-20 px-1.5 py-0.5 bg-amber-800 text-white text-[9px] font-bold rounded-full uppercase tracking-wide">
                            Premium
                          </span>
                        )}
                      </div>

                      {/* Info + Preview link */}
                      <div className="space-y-0.5 mt-0.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">{theme.series}</p>
                        <h3 className="text-sm font-serif font-bold text-stone-900 leading-tight">{theme.name}</h3>
                        <p className="text-[10px] text-stone-400 line-clamp-2 leading-snug">{theme.description}</p>
                        <a
                          href={`/demo/${theme.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-block text-[10px] font-bold text-amber-800 hover:underline pt-0.5"
                        >
                          Lihat Demo →
                        </a>
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
                    <span>Selesai &amp; Masuk ke Studio Undangan</span>
                  )}
                </button>
              </div>
            </div>
          );
        })()}



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
