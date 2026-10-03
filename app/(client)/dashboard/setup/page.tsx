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

  const [eventType, setEventType] = useState<string>("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBypassing, setIsBypassing] = useState(false);

  // Form State: Wedding
  const [groomNickname, setGroomNickname] = useState("");
  const [brideNickname, setBrideNickname] = useState("");
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");

  // Form State: Non-Wedding Persona
  const [personName, setPersonName] = useState("");
  const [personNickname, setPersonNickname] = useState("");
  const [personAge, setPersonAge] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [degree, setDegree] = useState("");
  const [major, setMajor] = useState("");
  const [institution, setInstitution] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventSubtitle, setEventSubtitle] = useState("");
  const [organizer, setOrganizer] = useState("");

  // Common Event States
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
        if (draft.eventType) setEventType(draft.eventType);
        if (draft.groomNickname) setGroomNickname(draft.groomNickname);
        if (draft.brideNickname) setBrideNickname(draft.brideNickname);
        if (draft.groomName) setGroomName(draft.groomName);
        if (draft.brideName) setBrideName(draft.brideName);
        if (draft.personName) setPersonName(draft.personName);
        if (draft.personNickname) setPersonNickname(draft.personNickname);
        if (draft.personAge) setPersonAge(draft.personAge);
        if (draft.fatherName) setFatherName(draft.fatherName);
        if (draft.motherName) setMotherName(draft.motherName);
        if (draft.degree) setDegree(draft.degree);
        if (draft.major) setMajor(draft.major);
        if (draft.institution) setInstitution(draft.institution);
        if (draft.eventTitle) setEventTitle(draft.eventTitle);
        if (draft.eventSubtitle) setEventSubtitle(draft.eventSubtitle);
        if (draft.organizer) setOrganizer(draft.organizer);
        if (draft.weddingDate) setWeddingDate(draft.weddingDate);
        if (draft.city) setCity(draft.city);
        if (draft.timeZone) setTimeZone(draft.timeZone);
        if (draft.akadStart) setAkadStart(draft.akadStart);
        if (draft.akadEnd) setAkadEnd(draft.akadEnd);
        if (draft.resepsiStart) setResepsiStart(draft.resepsiStart);
        if (draft.resepsiEnd) setResepsiEnd(draft.resepsiEnd);
        if (draft.themeId) setThemeId(draft.themeId);
        if (draft.eventType && typeof draft.step === "number" && draft.step >= 0 && draft.step <= 3) setStep(draft.step);
      }
    } catch {}
    setIsDraftLoaded(true);
  }, []);

  // Save Draft to localStorage on change
  useEffect(() => {
    if (!isDraftLoaded) return;
    const draft = {
      eventType,
      groomNickname, brideNickname, groomName, brideName,
      personName, personNickname, personAge, fatherName, motherName,
      degree, major, institution, eventTitle, eventSubtitle, organizer,
      weddingDate, city, timeZone,
      akadStart, akadEnd, resepsiStart, resepsiEnd, themeId, step,
    };
    localStorage.setItem("app_setup_draft", JSON.stringify(draft));
  }, [
    eventType,
    groomNickname, brideNickname, groomName, brideName,
    personName, personNickname, personAge, fatherName, motherName,
    degree, major, institution, eventTitle, eventSubtitle, organizer,
    weddingDate, city, timeZone,
    akadStart, akadEnd, resepsiStart, resepsiEnd, themeId, step, isDraftLoaded,
  ]);

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
    if (!eventType) {
      setError("Pilih jenis momen terlebih dahulu.");
      setStep(0);
      return;
    }

    setLoading(true);
    setError(null);

    let participantsJson: string | null = null;
    if (eventType === "BIRTHDAY") {
      participantsJson = JSON.stringify({
        person: {
          name: personName.trim() || personNickname.trim(),
          nickname: personNickname.trim() || personName.trim(),
          age: personAge.trim() ? parseInt(personAge.trim(), 10) : undefined,
          fatherName: fatherName.trim() || undefined,
          motherName: motherName.trim() || undefined,
        },
      });
    } else if (eventType === "KHITAN") {
      participantsJson = JSON.stringify({
        child: {
          name: personName.trim() || personNickname.trim(),
          nickname: personNickname.trim() || personName.trim(),
          age: personAge.trim() ? parseInt(personAge.trim(), 10) : undefined,
        },
        parents: {
          father: fatherName.trim() || undefined,
          mother: motherName.trim() || undefined,
        },
      });
    } else if (eventType === "AQIQAH") {
      participantsJson = JSON.stringify({
        baby: {
          name: personName.trim() || personNickname.trim(),
          nickname: personNickname.trim() || personName.trim(),
        },
        parents: {
          father: fatherName.trim() || undefined,
          mother: motherName.trim() || undefined,
        },
      });
    } else if (eventType === "WISUDA") {
      participantsJson = JSON.stringify({
        person: {
          name: personName.trim() || personNickname.trim(),
          nickname: personNickname.trim() || personName.trim(),
          degree: degree.trim() || undefined,
          major: major.trim() || undefined,
          institution: institution.trim() || undefined,
        },
      });
    } else if (eventType === "GATHERING") {
      participantsJson = JSON.stringify({
        event: {
          title: eventTitle.trim(),
          subtitle: eventSubtitle.trim() || undefined,
          organizer: organizer.trim() || undefined,
        },
      });
    }

    try {
      const res = await fetch("/api/client/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          participantsJson,
          groomNickname: groomNickname.trim(),
          brideNickname: brideNickname.trim(),
          groomName: groomName.trim() || groomNickname.trim(),
          brideName: brideName.trim() || brideNickname.trim(),
          invitationName: eventTitle.trim() || undefined,
          weddingDate,
          eventDate: weddingDate,
          city: city.trim(),
          timeZone,
          // Format terstruktur: "HH:MM – HH:MM TZ" — dijamin konsisten dari time picker
          akadTime: akadStart ? `${akadStart}${akadEnd ? ` – ${akadEnd}` : ""} ${timeZone}`.trim() : "",
          resepsiTime: resepsiStart ? `${resepsiStart}${resepsiEnd ? ` – ${resepsiEnd}` : ""} ${timeZone}`.trim() : "",
          eventTime: resepsiStart ? `${resepsiStart}${resepsiEnd ? ` – ${resepsiEnd}` : ""} ${timeZone}`.trim() : "",
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
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
                {eventType === "WEDDING" ? "Wedding Studio" : `${eventType.charAt(0) + eventType.slice(1).toLowerCase()} Studio`}
              </span>
              <span className="text-[11px] text-stone-500">Panduan Penyiapan Undangan Klien</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Langkah {step + 1} dari 4</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((s) => (
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

        {/* STEP 0: Pilih Jenis Acara (Card Selector Visual) */}
        {step === 0 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 1</span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Pilih Jenis Momen Spesial</h1>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                Tentukan momen bahagia yang ingin Anda buatkan undangan digital eksklusif.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  id: "WEDDING",
                  title: "Pernikahan",
                  subtitle: "Akad, pemberkatan & resepsi sakral",
                  icon: (
                    <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  ),
                },
                {
                  id: "BIRTHDAY",
                  title: "Ulang Tahun",
                  subtitle: "Sweet seventeen, milad & perayaan pesta",
                  icon: (
                    <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  ),
                },
                {
                  id: "KHITAN",
                  title: "Khitanan",
                  subtitle: "Tasyakuran & walimatul khitan putra",
                  icon: (
                    <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ),
                },
                {
                  id: "AQIQAH",
                  title: "Aqiqah",
                  subtitle: "Tasyakuran kelahiran & doa buah hati",
                  icon: (
                    <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  ),
                },
                {
                  id: "WISUDA",
                  title: "Wisuda & Kelulusan",
                  subtitle: "Syukuran wisuda & gelar akademik",
                  icon: (
                    <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  ),
                },
                {
                  id: "GATHERING",
                  title: "Gathering & Reuni",
                  subtitle: "Temu kangen, seminar & acara komunitas",
                  icon: (
                    <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                },
              ].map((item) => {
                const isSelected = eventType === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setEventType(item.id);
                      setThemeId("");
                    }}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? "border-amber-800 bg-amber-50/40 ring-2 ring-amber-800/20 shadow-sm"
                        : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100/60 flex items-center justify-center">
                        {item.icon}
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-serif font-bold text-stone-900">{item.title}</h3>
                      <p className="text-xs text-stone-500 mt-1 leading-snug">{item.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                disabled={loading || !eventType}
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
                className="px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <span>Lanjut ke Data Acara &rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Profil / Data Peserta Acara */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            {/* WEDDING */}
            {eventType === "WEDDING" && (
              <>
                <div className="text-center space-y-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 2</span>
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
                        placeholder="Contoh: Ryan"
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
                        placeholder="Contoh: Sarah"
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
                        placeholder="Contoh: Ryan Pratama, S.T."
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
                        placeholder="Contoh: Sarah Amelia, M.Psi."
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* BIRTHDAY */}
            {eventType === "BIRTHDAY" && (
              <>
                <div className="text-center space-y-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 2</span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Data Yang Berulang Tahun</h1>
                  <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                    Masukkan nama yang berulang tahun dan detail perayaan untuk tajuk utama undangan.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Nama Panggilan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={personNickname}
                        onChange={(e) => setPersonNickname(e.target.value)}
                        placeholder="Contoh: Aurel"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Ulang Tahun Ke- <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={personAge}
                        onChange={(e) => setPersonAge(e.target.value)}
                        placeholder="Contoh: 17"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">
                      Nama Lengkap <span className="text-stone-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Contoh: Aurelia Putri Sanjaya"
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Nama Ayah <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        placeholder="Nama Ayah / Wali"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Nama Ibu <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        placeholder="Nama Ibu"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* KHITAN */}
            {eventType === "KHITAN" && (
              <>
                <div className="text-center space-y-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 2</span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Data Anak &amp; Orang Tua</h1>
                  <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                    Masukkan nama putra yang dikhitan serta nama kedua orang tua.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Nama Panggilan Anak <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={personNickname}
                        onChange={(e) => setPersonNickname(e.target.value)}
                        placeholder="Contoh: Bilal"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Usia Anak <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="25"
                        value={personAge}
                        onChange={(e) => setPersonAge(e.target.value)}
                        placeholder="Contoh: 10"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">
                      Nama Lengkap Anak <span className="text-stone-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Contoh: Bilal Al-Farisi"
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Nama Ayah <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        placeholder="Nama Ayah"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Nama Ibu <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        placeholder="Nama Ibu"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* AQIQAH */}
            {eventType === "AQIQAH" && (
              <>
                <div className="text-center space-y-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 2</span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Data Buah Hati &amp; Orang Tua</h1>
                  <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                    Masukkan nama buah hati yang diaqiqahkan beserta nama orang tua.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Nama Panggilan Bayi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personNickname}
                      onChange={(e) => setPersonNickname(e.target.value)}
                      placeholder="Contoh: Rayyan"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">
                      Nama Lengkap Bayi <span className="text-stone-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Contoh: Muhammad Rayyan Al-Ghazi"
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Nama Ayah <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        placeholder="Nama Ayah"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Nama Ibu <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        placeholder="Nama Ibu"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* WISUDA */}
            {eventType === "WISUDA" && (
              <>
                <div className="text-center space-y-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 2</span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Data Wisudawan / Wisudawati</h1>
                  <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                    Masukkan nama wisudawan, gelar akademik, dan institusi pendidikan.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Nama Panggilan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={personNickname}
                        onChange={(e) => setPersonNickname(e.target.value)}
                        placeholder="Contoh: Dimas"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Gelar Akademik <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                        placeholder="Contoh: S.Kom., M.T."
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">
                      Nama Lengkap <span className="text-stone-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Contoh: Dimas Aditya Pratama, S.Kom."
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Jurusan / Program Studi <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        placeholder="Contoh: Teknik Informatika"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Universitas / Institut <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="Contoh: Universitas Hasanuddin"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* GATHERING */}
            {eventType === "GATHERING" && (
              <>
                <div className="text-center space-y-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 2</span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Data Acara &amp; Penyelenggara</h1>
                  <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                    Masukkan judul acara, tema pertemuan, dan pihak penyelenggara.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Judul / Nama Acara <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Contoh: Reuni Akbar Angkatan 2012"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Tema / Subtitle Acara <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={eventSubtitle}
                        onChange={(e) => setEventSubtitle(e.target.value)}
                        placeholder="Contoh: Merajut Kenangan, Menjalin Silaturahmi"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Penyelenggara / Komunitas <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={organizer}
                        onChange={(e) => setOrganizer(e.target.value)}
                        placeholder="Contoh: Ikatan Alumni SMAN 1"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 leading-relaxed">
              Langkah ini hanya mengisi data awal. Nama dapat dikosongkan dan dilengkapi kapan saja di Studio Editor.
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                &larr; Pilih Jenis Acara
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <span>Lanjut ke Tanggal Acara &rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Tanggal & Lokasi Utama */}
        {step === 2 && (() => {
          const DATE_LABELS: Record<string, string> = {
            WEDDING: "Tanggal Pernikahan Utama",
            BIRTHDAY: "Tanggal Ulang Tahun / Perayaan",
            KHITAN: "Tanggal Syukuran Khitanan",
            AQIQAH: "Tanggal Tasyakuran Aqiqah",
            WISUDA: "Tanggal Wisuda / Syukuran",
            GATHERING: "Tanggal Pelaksanaan Acara",
          };

          return (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 3</span>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                  {DATE_LABELS[eventType] || "Hari Bahagia & Lokasi"}
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                  Tentukan perkiraan tanggal pelaksanaan acara dan kota utama.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {DATE_LABELS[eventType] || "Tanggal Acara Utama"} <span className="text-rose-500">*</span>
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

                {/* Zona Waktu Acara */}
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

                  {eventType === "WEDDING" ? (
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
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Waktu Pelaksanaan Acara</label>
                      <div className="flex items-center gap-2 max-w-sm">
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
                  )}
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 leading-relaxed">
                  Tanggal dan kota boleh dikosongkan. Detail lengkap seperti nama gedung, alamat lengkap, peta lokasi, dan multi-sesi acara dapat Anda lengkapi dengan leluasa di Studio Editor.
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  &larr; Kembali
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(3);
                  }}
                  className="px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span>Pilih Desain Tema &rarr;</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* STEP 3: Pilihan Tema dengan Kategori & Thumbnail Preview */}
        {step === 3 && (() => {
          // Filter themes by eventType
          const eventThemes = availableThemes.filter((t: any) => {
            const tEvent = (t.eventType || "WEDDING").toUpperCase();
            return tEvent === eventType;
          });
          const themesForDisplay = eventThemes.length > 0 ? eventThemes : availableThemes;

          // Dapatkan daftar kategori yang benar-benar ada pada eventThemes
          const availableCats = new Set<string>(themesForDisplay.map((t: any) => t.category?.toLowerCase() || ""));
          const categories: Array<{ id: "all" | "minimalist" | "modern" | "traditional"; label: string }> = [
            { id: "all", label: "Semua" },
            ...(availableCats.has("minimalist") ? [{ id: "minimalist" as const, label: "Minimalis" }] : []),
            ...(availableCats.has("modern") ? [{ id: "modern" as const, label: "Modern" }] : []),
            ...(availableCats.has("traditional") ? [{ id: "traditional" as const, label: "Tradisional" }] : []),
          ];

          const isCategoryValid = activeCategory === "all" || availableCats.has(activeCategory);
          const effectiveCategory = isCategoryValid ? activeCategory : "all";

          const filteredThemes = effectiveCategory === "all"
            ? themesForDisplay
            : themesForDisplay.filter((t: any) => t.category?.toLowerCase() === effectiveCategory);

          // Dynamic display title for summary box
          const displayTitle = eventType === "WEDDING"
            ? `${groomNickname || "Mempelai Pria"} & ${brideNickname || "Mempelai Wanita"}`
            : eventType === "BIRTHDAY"
            ? `Ulang Tahun: ${personNickname || personName || "Spesial"}`
            : eventType === "KHITAN"
            ? `Khitanan: ${personNickname || personName || "Anak"}`
            : eventType === "AQIQAH"
            ? `Aqiqah: ${personNickname || personName || "Buah Hati"}`
            : eventType === "WISUDA"
            ? `Wisuda: ${personNickname || personName || "Sarjana"}`
            : (eventTitle || "Acara Gathering");

          return (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold mb-1">
                  <span>Paket Anda:</span>
                  <span className="font-extrabold">{planNames[currentPlan] || currentPlan}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Pilih Desain Tema Perdana</h1>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                  Pilih tema awal yang Anda sukai untuk momen ini. Dapat diganti kapan saja di Studio Editor.
                </p>
              </div>

              {/* Category Tabs (Hanya tampil jika ada > 1 gaya desain yang tersedia) */}
              {availableCats.size > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        effectiveCategory === cat.id
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      {cat.label}
                      {cat.id !== "all" && (
                        <span className="ml-1.5 opacity-60">
                          {themesForDisplay.filter((t: any) => t.category?.toLowerCase() === cat.id).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

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
                          Lihat Demo &rarr;
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
                      {displayTitle}
                    </h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-mono ${themeId ? "bg-white/10 text-stone-300" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                    Tema: {themesList.find((t: any) => t.id === themeId)?.name || (themeId ? themeId : "Tema bawaan jenis acara")}
                  </span>
                </div>
                <p className="text-xs text-stone-400">
                  Setelah ini Anda akan langsung masuk ke Studio Editor untuk melengkapi susunan acara, galeri foto, dan daftar tamu.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  &larr; Kembali
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
