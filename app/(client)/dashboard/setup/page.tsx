"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandLogo } from "@/components/BrandLogo";
import { DEFAULT_PLAN_NAMES } from "@/lib/planUtils";
import {
  EVENT_TYPE_LABELS,
  PERSONAL_SUB_EVENT_PRESETS,
  EVENT_SUB_EVENT_PRESETS,
  extractSubEventOptions,
  isThemeInMode,
  resolveSubEventMeta,
  sanitizeSubEvent,
  selectableEventTypes,
  sortThemesForEvent,
} from "@/lib/invitationUtils";
import { getApexRootDomain } from "@/lib/domainUtils";

// Di HP baris tombol menempel di bawah layar: langkah tema bisa setinggi belasan layar, dan tombol selesai
// tidak boleh tersembunyi di dasar daftar. Di layar lebar baris mengalir biasa.
const WIZARD_ACTION_BAR =
  "flex items-center gap-2 sticky bottom-3 z-20 rounded-2xl border border-stone-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:static sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2 sm:shadow-none sm:backdrop-blur-none";

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
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryPlan = searchParams.get("plan");
  const queryOrder = searchParams.get("order");
  const queryTheme = searchParams.get("theme")?.trim().toLowerCase() || "";
  const queryEvent = searchParams.get("event")?.trim().toUpperCase() || "";
  const querySubEvent = searchParams.get("subEvent")?.trim() || "";

  const [currentPlan, setCurrentPlan] = useState<string>(queryPlan?.toUpperCase() || "");
  const [planNames, setPlanNames] = useState<Record<string, string>>({
    ...DEFAULT_PLAN_NAMES,
  });
  const [platformName, setPlatformName] = useState("");
  const [themesList, setThemesList] = useState<any[]>([]);
  const [themesLoaded, setThemesLoaded] = useState(false);
  const [enabledEventTypes, setEnabledEventTypes] = useState<string[] | null>(null);
  const [eventOptionsFailed, setEventOptionsFailed] = useState(false);

  const [eventType, setEventType] = useState<string>("");
  const [subEvent, setSubEvent] = useState<string>("");
  const [customSubEventMode, setCustomSubEventMode] = useState<boolean>(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBypassing, setIsBypassing] = useState(false);

  // Form State: Wedding
  const [groomNickname, setGroomNickname] = useState("");
  const [brideNickname, setBrideNickname] = useState("");
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");

  // Form State: Personal & Event Persona
  const [personName, setPersonName] = useState("");
  const [personNickname, setPersonNickname] = useState("");
  const [personDetail, setPersonDetail] = useState("");
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
  const [subEventFilter, setSubEventFilter] = useState<string>("all");

  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const queryThemeAppliedRef = useRef(false);

  // Draf disimpan per akun: peramban bersama (warnet, perangkat keluarga) tidak boleh menampilkan draf akun lain.
  const draftKey = `app_setup_draft:${session?.user?.id ?? ""}`;

  // Load Draft from localStorage on mount
  useEffect(() => {
    if (sessionStatus === "loading") return;
    try {
      // Kunci lama tanpa akun dibuang: isinya bisa milik pengguna sebelumnya.
      localStorage.removeItem("app_setup_draft");
      localStorage.removeItem("luxenary_setup_draft");

      // Auto detect user browser timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes("Makassar") || tz.includes("Bali") || tz.includes("Pontianak") || tz.includes("Manado") || tz.includes("Ujung_Pandang")) {
        setTimeZone("WITA");
      } else if (tz.includes("Jayapura") || tz.includes("Ambon")) {
        setTimeZone("WIT");
      } else {
        setTimeZone("WIB");
      }

      const saved = session?.user?.id ? localStorage.getItem(draftKey) : null;
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.eventType) {
          const rawEv = String(draft.eventType).toUpperCase();
          if (rawEv === "EVENT") {
            setEventType("EVENT");
            if (draft.subEvent) setSubEvent(draft.subEvent);
          } else if (rawEv === "PERSONAL") {
            setEventType("PERSONAL");
            if (draft.subEvent) setSubEvent(draft.subEvent);
          } else {
            setEventType("WEDDING");
          }
        }
        if (draft.groomNickname) setGroomNickname(draft.groomNickname);
        if (draft.brideNickname) setBrideNickname(draft.brideNickname);
        if (draft.groomName) setGroomName(draft.groomName);
        if (draft.brideName) setBrideName(draft.brideName);
        if (draft.personName) setPersonName(draft.personName);
        if (draft.personNickname) setPersonNickname(draft.personNickname);
        if (draft.personDetail) setPersonDetail(draft.personDetail);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, session?.user?.id]);

  // Save Draft to localStorage on change
  useEffect(() => {
    if (!isDraftLoaded || !session?.user?.id) return;
    const draft = {
      eventType, subEvent,
      groomNickname, brideNickname, groomName, brideName,
      personName, personNickname, personDetail, personAge, fatherName, motherName,
      degree, major, institution, eventTitle, eventSubtitle, organizer,
      weddingDate, city, timeZone,
      akadStart, akadEnd, resepsiStart, resepsiEnd, themeId, step,
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [
    draftKey,
    session?.user?.id,
    eventType, subEvent,
    groomNickname, brideNickname, groomName, brideName,
    personName, personNickname, personDetail, personAge, fatherName, motherName,
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
        setThemesLoaded(true);
      })
      .catch(() => setEventOptionsFailed(true));

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
        if (Array.isArray(data.enabledEventTypes)) {
          setEnabledEventTypes(data.enabledEventTypes);
        } else {
          setEventOptionsFailed(true);
        }
      })
      .catch(() => setEventOptionsFailed(true));

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

  // Jenis acara yang ditawarkan: diaktifkan admin dan punya tema aktif yang cocok. API pembuatan undangan menegakkan aturan
  // yang sama, jadi daftar ini hanya penyaring tampilan.
  const eventOptionsReady = enabledEventTypes !== null && themesLoaded;
  const selectableEvents = eventOptionsReady ? selectableEventTypes(enabledEventTypes, themesList.map((t: any) => t.eventType)) : [];
  const selectableKey = selectableEvents.join(",");

  useEffect(() => {
    if (!eventOptionsReady || !isDraftLoaded) return;
    // Draf lokal bisa menyimpan jenis acara yang kini ditutup: kembali ke langkah pertama alih-alih gagal saat disimpan.
    if (eventType && !selectableEvents.includes(eventType)) {
      setEventType("");
      setThemeId("");
      setStep(0);
      return;
    }
    if (!queryThemeAppliedRef.current) {
      let effectiveQueryTheme = queryTheme;
      let effectiveQueryEvent = queryEvent;
      let effectiveQuerySubEvent = querySubEvent;
      if (!effectiveQueryTheme) {
        try {
          const pendingRaw = sessionStorage.getItem("lux_pending_setup_theme");
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw);
            if (typeof pending?.themeId === "string") effectiveQueryTheme = pending.themeId.trim().toLowerCase();
            if (typeof pending?.eventType === "string") effectiveQueryEvent = pending.eventType.trim().toUpperCase();
            if (typeof pending?.subEvent === "string" && !effectiveQuerySubEvent) effectiveQuerySubEvent = pending.subEvent.trim();
            sessionStorage.removeItem("lux_pending_setup_theme");
          }
        } catch {}
      }
      if (effectiveQueryTheme) {
        queryThemeAppliedRef.current = true;
        const matchedTheme = themesList.find((t: any) => String(t.id || "").toLowerCase() === effectiveQueryTheme);
        if (matchedTheme) {
          const compatibleEvents = selectableEvents.filter((ev) => isThemeInMode(matchedTheme.eventType, ev));
          if (compatibleEvents.length > 0) {
            const targetEv =
              effectiveQueryEvent && compatibleEvents.includes(effectiveQueryEvent)
                ? effectiveQueryEvent
                : eventType && compatibleEvents.includes(eventType)
                ? eventType
                : compatibleEvents.includes(String(matchedTheme.eventType || "").toUpperCase())
                ? String(matchedTheme.eventType).toUpperCase()
                : compatibleEvents[0];
            setEventType(targetEv);
            if (targetEv !== "WEDDING") {
              setSubEvent(
                effectiveQuerySubEvent ||
                  matchedTheme.subEvent ||
                  (targetEv === "PERSONAL" ? PERSONAL_SUB_EVENT_PRESETS[0].id : EVENT_SUB_EVENT_PRESETS[0].id),
              );
            } else {
              setSubEvent("");
            }
            setThemeId(matchedTheme.id);
            return;
          }
        }
      }
    }
    if (!eventType && selectableEvents.length === 1) {
      const singleEv = selectableEvents[0];
      setEventType(singleEv);
      if (singleEv === "PERSONAL") setSubEvent(PERSONAL_SUB_EVENT_PRESETS[0].id);
      else if (singleEv === "EVENT") setSubEvent(EVENT_SUB_EVENT_PRESETS[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventOptionsReady, isDraftLoaded, eventType, selectableKey, queryTheme, queryEvent, querySubEvent]);

  const handleCompleteSetup = async () => {
    if (!eventType) {
      setError("Pilih jenis momen terlebih dahulu.");
      setStep(0);
      return;
    }

    setLoading(true);
    setError(null);

    let participantsJson: string | null = null;
    if (eventType === "WEDDING") {
      participantsJson = JSON.stringify({
        groom: {
          name: groomName.trim() || groomNickname.trim(),
          nickname: groomNickname.trim() || groomName.trim(),
        },
        bride: {
          name: brideName.trim() || brideNickname.trim(),
          nickname: brideNickname.trim() || brideName.trim(),
        },
      });
    } else if (eventType === "PERSONAL") {
      const detailLine =
        personDetail.trim() ||
        [degree.trim(), major.trim(), institution.trim()].filter(Boolean).join(" · ") ||
        (personAge.trim() ? `${personAge.trim()} Tahun` : "");
      participantsJson = JSON.stringify({
        person: {
          name: personName.trim() || personNickname.trim(),
          nickname: personNickname.trim() || personName.trim(),
          detail: detailLine || undefined,
          age: personAge.trim() && /^\d+$/.test(personAge.trim()) ? parseInt(personAge.trim(), 10) : undefined,
          fatherName: fatherName.trim() || undefined,
          motherName: motherName.trim() || undefined,
        },
        ...(fatherName.trim() || motherName.trim()
          ? {
              parents: {
                father: fatherName.trim() || undefined,
                mother: motherName.trim() || undefined,
              },
            }
          : {}),
      });
    } else if (eventType === "EVENT") {
      participantsJson = JSON.stringify({
        event: {
          title: eventTitle.trim(),
          subtitle: eventSubtitle.trim() || undefined,
          organizer: organizer.trim() || undefined,
        },
      });
    }

    const cleanSubEvent = eventType === "WEDDING" ? null : sanitizeSubEvent(subEvent);

    try {
      const res = await fetch("/api/client/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          ...(cleanSubEvent ? { subEvent: cleanSubEvent } : {}),
          participantsJson,
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
      localStorage.removeItem(draftKey);
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
                Masuk Langsung ke Studio Undangan
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

            {!eventOptionsReady && (
              <p className="text-center text-xs text-stone-500">
                {eventOptionsFailed ? "Pilihan jenis acara gagal dimuat. Muat ulang halaman ini." : "Memuat pilihan jenis acara…"}
              </p>
            )}
            {eventOptionsReady && selectableEvents.length === 0 && (
              <p className="text-center text-xs text-stone-500">
                Belum ada jenis acara yang menerima undangan baru. Silakan hubungi admin.
              </p>
            )}

            {(() => {
              const allowWedding = selectableEvents.includes("WEDDING");
              const allowPersonal = selectableEvents.includes("PERSONAL");
              const allowEvent = selectableEvents.includes("EVENT");
              const visibleCategoryCount = [allowWedding, allowPersonal, allowEvent].filter(Boolean).length;
              const activePresets = eventType === "PERSONAL" ? PERSONAL_SUB_EVENT_PRESETS : EVENT_SUB_EVENT_PRESETS;
              const activeMeta = eventType === "PERSONAL" || eventType === "EVENT" ? resolveSubEventMeta(eventType, subEvent) : null;

              return (
                <div className="space-y-4">
                  <div className={`grid gap-4 ${visibleCategoryCount === 1 ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-1 sm:grid-cols-3"}`}>
                    {allowWedding && (
                      <div
                        onClick={() => {
                          if (eventType !== "WEDDING") setThemeId("");
                          setEventType("WEDDING");
                          setSubEvent("");
                          setCustomSubEventMode(false);
                        }}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          eventType === "WEDDING"
                            ? "border-amber-800 bg-amber-50/40 ring-2 ring-amber-800/20 shadow-sm"
                            : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100/60 flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </div>
                          {eventType === "WEDDING" && (
                            <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">2 Profil Mempelai</span>
                          <h3 className="text-base font-serif font-bold text-stone-900">Pernikahan</h3>
                          <p className="text-xs text-stone-500 mt-1 leading-snug">Akad, pemberkatan, resepsi, &amp; ngunduh mantu</p>
                        </div>
                      </div>
                    )}

                    {allowPersonal && (
                      <div
                        onClick={() => {
                          if (eventType !== "PERSONAL") {
                            setThemeId("");
                            setEventType("PERSONAL");
                            setSubEvent(PERSONAL_SUB_EVENT_PRESETS[0].id);
                            setCustomSubEventMode(false);
                          }
                        }}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          eventType === "PERSONAL"
                            ? "border-amber-800 bg-amber-50/40 ring-2 ring-amber-800/20 shadow-sm"
                            : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100/60 flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          {eventType === "PERSONAL" && (
                            <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">1 Profil Tokoh</span>
                          <h3 className="text-base font-serif font-bold text-stone-900">Personal &amp; Keluarga</h3>
                          <p className="text-xs text-stone-500 mt-1 leading-snug">Ulang Tahun, Khitanan, Aqiqah, Wisuda, Tamatan Ngaji, &amp; acara personal lainnya</p>
                        </div>
                      </div>
                    )}

                    {allowEvent && (
                      <div
                        onClick={() => {
                          if (eventType !== "EVENT") {
                            setThemeId("");
                            setEventType("EVENT");
                            setSubEvent(EVENT_SUB_EVENT_PRESETS[0].id);
                            setCustomSubEventMode(false);
                          }
                        }}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          eventType === "EVENT"
                            ? "border-amber-800 bg-amber-50/40 ring-2 ring-amber-800/20 shadow-sm"
                            : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100/60 flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          {eventType === "EVENT" && (
                            <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">Non-Personal</span>
                          <h3 className="text-base font-serif font-bold text-stone-900">Acara &amp; Event Umum</h3>
                          <p className="text-xs text-stone-500 mt-1 leading-snug">Corporate, Grand Opening, seminar, workshop, gathering, reuni, &amp; syukuran</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pilihan sub-acara dinamis (Preset + Tulis Sendiri) untuk PERSONAL maupun EVENT */}
                  {(eventType === "PERSONAL" || eventType === "EVENT") && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <p className="text-xs font-bold text-amber-950">
                            {eventType === "PERSONAL"
                              ? "Pilih Sub-Acara Personal & Keluarga (atau Tulis Sendiri)"
                              : "Pilih Sub-Acara Event Umum (atau Tulis Sendiri)"}
                          </p>
                          <p className="text-[11px] text-stone-600">
                            {activeMeta?.hint || "Menyesuaikan formulir & teks undangan; dapat diganti kapan saja di Studio selama status Draf."}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-900 bg-white border border-amber-200 px-2.5 py-0.5 rounded-full w-fit">
                          Bisa diganti saat Draf
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activePresets.map((preset) => {
                          const activeSub = !customSubEventMode && subEvent.toLowerCase() === preset.id.toLowerCase();
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setCustomSubEventMode(false);
                                setSubEvent(preset.id);
                              }}
                              className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                                activeSub
                                  ? "bg-amber-900 text-white shadow-xs"
                                  : "bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSubEventMode(true);
                            if (activePresets.some((p) => p.id.toLowerCase() === subEvent.toLowerCase())) {
                              setSubEvent("");
                            }
                          }}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                            customSubEventMode
                              ? "bg-amber-900 text-white shadow-xs"
                              : "bg-white text-amber-900 border border-dashed border-amber-400 hover:bg-amber-50"
                          }`}
                        >
                          + Lainnya (Tulis Sendiri)
                        </button>
                      </div>
                      {customSubEventMode && (
                        <div>
                          <input
                            type="text"
                            value={subEvent}
                            onChange={(e) => setSubEvent(e.target.value)}
                            maxLength={50}
                            placeholder={
                              eventType === "PERSONAL"
                                ? "Contoh: Tamatan Ngaji, Tedak Siten, Tasyakuran Haji..."
                                : "Contoh: Rapat Kerja Nasional, Malam Keakraban, Awarding Night..."
                            }
                            className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className={`${WIZARD_ACTION_BAR} justify-end`}>
              <button
                type="button"
                disabled={loading || !eventType}
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
                className="px-6 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                <span>Lanjut ke Data Acara</span>
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
                        Nama Panggilan Pria
                      </label>
                      <input
                        type="text"
                        value={groomNickname}
                        onChange={(e) => setGroomNickname(e.target.value)}
                        placeholder="Contoh: Ryan"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Nama Panggilan Wanita
                      </label>
                      <input
                        type="text"
                        value={brideNickname}
                        onChange={(e) => setBrideNickname(e.target.value)}
                        placeholder="Contoh: Sarah"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
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
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none"
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
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* PERSONAL (Unified 1-Profile Form + Dynamic Sub-Event Meta) */}
            {eventType === "PERSONAL" && (() => {
              const personalMeta = resolveSubEventMeta("PERSONAL", subEvent);
              return (
                <>
                  <div className="text-center space-y-2">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                      Langkah 2 {subEvent ? `· ${subEvent}` : ""}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                      Profil Tokoh &amp; Keluarga
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                      Masukkan nama tokoh utama dan keterangan acara untuk tajuk utama undangan.
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          Nama Panggilan
                        </label>
                        <input
                          type="text"
                          value={personNickname}
                          onChange={(e) => setPersonNickname(e.target.value)}
                          placeholder={personalMeta.personNicknamePlaceholder}
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          {personalMeta.detailLabel} <span className="text-stone-400 font-normal">(opsional)</span>
                        </label>
                        <input
                          type="text"
                          value={personDetail}
                          onChange={(e) => setPersonDetail(e.target.value)}
                          placeholder={personalMeta.detailPlaceholder}
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        {personalMeta.personNameLabel} <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        placeholder={personalMeta.personNamePlaceholder}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none"
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
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none"
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
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* EVENT (Non-Personal — Strictly Zero Parents) */}
            {eventType === "EVENT" && (
              <>
                <div className="text-center space-y-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                    Langkah 2 {subEvent ? `· ${subEvent}` : ""}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Data Acara &amp; Penyelenggara</h1>
                  <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                    Masukkan judul acara, tema pertemuan, dan pihak penyelenggara.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Judul / Nama Acara
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Contoh: Reuni Akbar Angkatan 2012 / Grand Opening Cabang Baru"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
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
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Penyelenggara / Instansi <span className="text-stone-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={organizer}
                        onChange={(e) => setOrganizer(e.target.value)}
                        placeholder="Contoh: PT Nusantara Mandiri / Ikatan Alumni"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 leading-relaxed">
              Langkah ini hanya mengisi data awal. Nama dapat dikosongkan dan dilengkapi kapan saja di Studio Editor.
            </div>

            <div className={`${WIZARD_ACTION_BAR} justify-between`}>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="shrink-0 whitespace-nowrap px-4 sm:px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Kembali
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="flex-1 sm:flex-none justify-center px-5 sm:px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                <span>Lanjut ke Tanggal Acara</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Tanggal & Lokasi Utama */}
        {step === 2 && (() => {
          const dateHeadingLabel =
            eventType === "WEDDING"
              ? "Tanggal Pernikahan Utama"
              : eventType === "PERSONAL"
              ? `Tanggal ${subEvent || "Acara Personal"}`
              : `Tanggal ${subEvent || "Pelaksanaan Acara"}`;

          return (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Langkah 3</span>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                  {dateHeadingLabel}
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                  Tentukan perkiraan tanggal pelaksanaan acara dan kota utama.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {dateHeadingLabel}
                  </label>
                  <input
                    type="date"
                    min={new Date().toLocaleDateString("en-CA")}
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    {eventType === "WEDDING"
                      ? "Isi tanggal tamu datang (resepsi). Tanggal ini menjadi Jadwal Terima Tamu: patokan hitung mundur dan masa aktif undangan. Sesi adat lain bisa ditambah di editor."
                      : "Isi tanggal tamu datang. Tanggal ini menjadi patokan hitung mundur dan masa aktif undangan."}
                  </p>
                </div>

                <div className="relative">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Kota / Wilayah Utama Acara
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
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
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
                            className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                          />
                          <span className="text-stone-400 text-xs font-medium shrink-0">–</span>
                          <input
                            type="time"
                            value={akadEnd}
                            onChange={(e) => setAkadEnd(e.target.value)}
                            className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
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
                            className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                          />
                          <span className="text-stone-400 text-xs font-medium shrink-0">–</span>
                          <input
                            type="time"
                            value={resepsiEnd}
                            onChange={(e) => setResepsiEnd(e.target.value)}
                            className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
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
                          className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                        />
                        <span className="text-stone-400 text-xs font-medium shrink-0">–</span>
                        <input
                          type="time"
                          value={resepsiEnd}
                          onChange={(e) => setResepsiEnd(e.target.value)}
                          className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
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

              <div className={`${WIZARD_ACTION_BAR} justify-between`}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="shrink-0 whitespace-nowrap px-4 sm:px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Kembali
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(3);
                  }}
                  className="flex-1 sm:flex-none justify-center px-5 sm:px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Pilih Desain Tema</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* STEP 3: Pilihan Tema Eksklusif sesuai Mode Terpilih (Isolasi Tegas 3 Mode) */}
        {step === 3 && (() => {
          const modeThemes = sortThemesForEvent(
            availableThemes.filter((t: any) => isThemeInMode(t.eventType, eventType)),
            eventType,
            subEvent,
          );
          const dynamicSubOptions =
            eventType === "PERSONAL" || eventType === "EVENT"
              ? extractSubEventOptions(modeThemes, eventType)
              : [];
          const effectiveSubFilter =
            subEventFilter !== "all" &&
            !dynamicSubOptions.some((s) => s.toLowerCase() === subEventFilter.toLowerCase())
              ? "all"
              : subEventFilter;
          const subFiltered =
            (eventType === "PERSONAL" || eventType === "EVENT") && effectiveSubFilter !== "all"
              ? modeThemes.filter((t: any) => (t.subEvent || "").toLowerCase() === effectiveSubFilter.toLowerCase())
              : modeThemes;

          // Dapatkan daftar gaya yang benar-benar ada pada tema yang ditampilkan
          const availableCats = new Set<string>(subFiltered.map((t: any) => t.category?.toLowerCase() || ""));
          const categories: Array<{ id: "all" | "minimalist" | "modern" | "traditional"; label: string }> = [
            { id: "all", label: "Semua" },
            ...(availableCats.has("minimalist") ? [{ id: "minimalist" as const, label: "Minimalis" }] : []),
            ...(availableCats.has("modern") ? [{ id: "modern" as const, label: "Modern" }] : []),
            ...(availableCats.has("traditional") ? [{ id: "traditional" as const, label: "Tradisional" }] : []),
          ];

          const isCategoryValid = activeCategory === "all" || availableCats.has(activeCategory);
          const effectiveCategory = isCategoryValid ? activeCategory : "all";

          const filteredThemes =
            effectiveCategory === "all"
              ? subFiltered
              : subFiltered.filter((t: any) => t.category?.toLowerCase() === effectiveCategory);

          // Dynamic display title for summary box
          const displayTitle =
            eventType === "WEDDING"
              ? `${groomNickname || "Mempelai Pria"} & ${brideNickname || "Mempelai Wanita"}`
              : eventType === "PERSONAL"
              ? `${subEvent || EVENT_TYPE_LABELS.PERSONAL}: ${personNickname || personName || "Tokoh Utama"}`
              : eventTitle || subEvent || EVENT_TYPE_LABELS.EVENT;

          const renderSetupThemeCard = (theme: any) => {
            const isSelected = themeId === theme.id;
            const thumbMobile: string | null = theme.thumbnailMobile || null;
            const thumbDesktop: string | null = theme.thumbnailDesktop || null;
            const selectedBadge = isSelected && (
              <span className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold shadow-md">
                ✓
              </span>
            );
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
                {/* Tema tanpa thumbnail tampil sebagai kartu nama */}
                {!thumbDesktop && !thumbMobile ? (
                  <div className="relative flex min-h-[8rem] items-center justify-center rounded-xl bg-stone-100 px-4 text-center">
                    <span className="font-serif text-lg font-bold leading-tight text-stone-700">{theme.name}</span>
                    {selectedBadge}
                  </div>
                ) : (
                <div className="stp-scene">
                  {thumbDesktop && (
                  <div className="stp-tablet">
                    <div className="stp-tablet-bar">
                      <div className="stp-tablet-dots"><span/><span/><span/></div>
                      <div className="stp-tablet-url">{getApexRootDomain()}/{theme.id}</div>
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
                  )}

                  {thumbMobile && (
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
                  )}

                  {selectedBadge}
                </div>
                )}

                {/* Info + Preview link */}
                <div className="space-y-0.5 mt-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                      {theme.subEvent ? `${theme.series} · ${theme.subEvent}` : theme.series}
                    </p>
                  </div>
                  <h3 className="text-sm font-serif font-bold text-stone-900 leading-tight">{theme.name}</h3>
                  <p className="text-[10px] text-stone-400 line-clamp-2 leading-snug">{theme.desc}</p>
                  {(thumbDesktop || thumbMobile) && (
                    <a
                      href={`/demo/${theme.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block text-[10px] font-bold text-amber-800 hover:underline pt-0.5"
                    >
                      Lihat Demo
                    </a>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold mb-1">
                  <span>Paket Anda:</span>
                  <span className="font-extrabold">{planNames[currentPlan] || currentPlan}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Pilih Desain Tema Perdana</h1>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                  Menampilkan katalog tema khusus mode <strong className="text-stone-800">{EVENT_TYPE_LABELS[eventType] || eventType}</strong>
                  {subEvent ? ` (${subEvent})` : ""}. Dapat diganti kapan saja selama berstatus Draf di Studio Editor.
                </p>
              </div>

              {/* Filter Sub-Acara Dinamis (Personal & Keluarga maupun Acara & Event Umum) */}
              {(eventType === "PERSONAL" || eventType === "EVENT") && dynamicSubOptions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    {
                      id: "all",
                      label: `${eventType === "PERSONAL" ? "Semua Personal" : "Semua Acara"} (${modeThemes.length})`,
                    },
                    ...dynamicSubOptions.map((sub) => ({
                      id: sub,
                      label: `${sub} (${modeThemes.filter((t: any) => (t.subEvent || "").toLowerCase() === sub.toLowerCase()).length})`,
                    })),
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubEventFilter(sub.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                        effectiveSubFilter.toLowerCase() === sub.id.toLowerCase()
                          ? "bg-amber-900 text-white border-amber-900 shadow-2xs"
                          : "bg-white text-stone-600 border-stone-200 hover:border-amber-400"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}

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
                          {subFiltered.filter((t: any) => t.category?.toLowerCase() === cat.id).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Theme Grid — Device Pair Mockup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredThemes.map(renderSetupThemeCard)}
              </div>

              {/* Catatan Isolasi Mode & Permintaan Adaptasi Desain via CS */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2.5">
                <p className="leading-relaxed">
                  Setiap mode acara memiliki koleksi tema mandiri. Ingin memakai desain dari mode acara lain?{" "}
                  <Link href="/contact" className="font-bold text-amber-900 underline hover:text-stone-900">
                    Hubungi CS
                  </Link>{" "}
                  agar tim kami menyiapkan versi khusus untuk mode {EVENT_TYPE_LABELS[eventType] || eventType}.
                </p>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="shrink-0 text-[11px] font-bold text-stone-700 hover:text-stone-900 underline cursor-pointer"
                >
                  Ubah Mode Acara
                </button>
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
                  Setelah ini Anda akan langsung masuk ke Studio Editor (status Draf) untuk melengkapi susunan acara, galeri foto, dan daftar tamu.
                </p>
              </div>

              <div className={`${WIZARD_ACTION_BAR} justify-between`}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="shrink-0 whitespace-nowrap px-4 sm:px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Kembali
                </button>

                <button
                  type="button"
                  onClick={handleCompleteSetup}
                  disabled={loading}
                  className="flex-1 sm:flex-none justify-center px-5 sm:px-8 py-3.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-amber-950/20 cursor-pointer flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span className="sm:hidden">Menyiapkan…</span>
                      <span className="hidden sm:inline">Menyiapkan Studio Undangan...</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">Masuk ke Studio</span>
                      <span className="hidden sm:inline">Selesai &amp; Masuk ke Studio Undangan</span>
                    </>
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
