"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { BrandLogo } from "@/components/BrandLogo";
import { isThemeCompatible } from "@/lib/invitationUtils";
import { BUILDER_EVENT_LABELS, type BuilderEventType } from "@/lib/themeBuilder/spec";

const FREE_DRAFT_EVENT_DESCRIPTIONS: Record<string, string> = {
  WEDDING: "Format dua mempelai, akad & resepsi, cerita cinta, dan galeri prewedding.",
  BIRTHDAY: "Perayaan ulang tahun personal dengan profil tuan rumah dan susunan acara.",
  KHITAN: "Walimatul khitan dengan profil anak, orang tua, dan doa restu tamu.",
  AQIQAH: "Tasyakuran kelahiran & aqiqah buah hati beserta detail waktu dan lokasi.",
  WISUDA: "Perayaan kelulusan / wisuda lengkap dengan info acara dan ucapan selamat.",
  GATHERING: "Acara kantor, reuni, komunitas, halal bihalal, atau syukuran umum.",
};

interface PublicThemeOption {
  id: string;
  name: string;
  eventType: string;
}

function PackageSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewAdditional = searchParams?.get("new") === "1";
  const requestedThemeParam = searchParams?.get("theme")?.trim().toLowerCase() || "";
  const requestedEventParam = searchParams?.get("event")?.trim().toUpperCase() || "";
  const { data: session, status } = useSession();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformName, setPlatformName] = useState("");
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [enabledEventTypes, setEnabledEventTypes] = useState<string[]>([]);
  const [existingFreeDraftId, setExistingFreeDraftId] = useState<string | null>(null);
  const [existingFreeDraftMeta, setExistingFreeDraftMeta] = useState<{ themeId?: string; eventType?: string } | null>(null);
  const [paidDraftTarget, setPaidDraftTarget] = useState<{ id: string; themeId?: string; eventType?: string } | null>(null);
  const [applyingPaidDraftTheme, setApplyingPaidDraftTheme] = useState(false);
  const [paidDraftError, setPaidDraftError] = useState("");
  const [requestedThemeObj, setRequestedThemeObj] = useState<PublicThemeOption | null>(null);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [selectedFreeEventType, setSelectedFreeEventType] = useState<string>("");
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [autoLaunchingTheme, setAutoLaunchingTheme] = useState(false);
  const [draftError, setDraftError] = useState("");
  const intentHandledRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;
    (async () => {
      try {
        const [onboardData, settingsData, themesData] = await Promise.all([
          status === "authenticated"
            ? fetch("/api/client/onboarding-state", { cache: "no-store" }).then((r) => r.json()).catch(() => null)
            : Promise.resolve(null),
          fetch("/api/public/settings", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          requestedThemeParam
            ? fetch("/api/public/themes", { cache: "no-store" }).then((r) => r.json()).catch(() => [])
            : Promise.resolve([]),
        ]);

        if (cancelled) return;

        const enabledList: string[] = Array.isArray(settingsData?.enabledEventTypes) ? settingsData.enabledEventTypes : [];
        const srvStatus = settingsData?.serviceStatus || null;
        const srvClosed = Boolean(srvStatus && !srvStatus.isOpen);

        if (settingsData) {
          if (Array.isArray(settingsData.packages)) setPackages(settingsData.packages);
          if (settingsData.platformName) setPlatformName(settingsData.platformName);
          if (settingsData.serviceStatus) setServiceStatus(settingsData.serviceStatus);
          if (Array.isArray(settingsData.enabledEventTypes)) setEnabledEventTypes(settingsData.enabledEventTypes);
        }

        const matchedTheme: PublicThemeOption | null =
          requestedThemeParam && Array.isArray(themesData)
            ? themesData.find((t: any) => String(t?.id || "").toLowerCase() === requestedThemeParam) || null
            : null;
        setRequestedThemeObj(matchedTheme);
        if (matchedTheme) {
          try {
            sessionStorage.setItem(
              "lux_pending_setup_theme",
              JSON.stringify({
                themeId: matchedTheme.id,
                eventType: requestedEventParam || matchedTheme.eventType || "WEDDING",
              }),
            );
          } catch {}
        } else if (!requestedThemeParam) {
          try {
            sessionStorage.removeItem("lux_pending_setup_theme");
          } catch {}
        }

        if (onboardData?.step === "PAID_NEED_SETUP") {
          const baseSetupUrl = onboardData.redirectUrl || "/dashboard/setup";
          const sep = baseSetupUrl.includes("?") ? "&" : "?";
          const withTheme = matchedTheme
            ? `${baseSetupUrl}${sep}theme=${encodeURIComponent(matchedTheme.id)}${
                requestedEventParam ? `&event=${encodeURIComponent(requestedEventParam)}` : ""
              }`
            : baseSetupUrl;
          router.replace(withTheme);
          return;
        }

        if (onboardData?.step === "COMPLETED" && !isNewAdditional) {
          const paidInv = onboardData.invitation;
          if (matchedTheme && paidInv?.id && paidInv.status === "DRAFT" && isThemeCompatible(matchedTheme.eventType, paidInv.eventType)) {
            if (String(paidInv.themeId || "").toLowerCase() === matchedTheme.id.toLowerCase()) {
              router.replace(`/dashboard/invitation/${paidInv.id}`);
              return;
            }
            // Tampilkan modal konfirmasi ganti tema pada draf undangan klien (1 akun 1 undangan)
            setPaidDraftTarget({
              id: paidInv.id,
              themeId: paidInv.themeId,
              eventType: paidInv.eventType,
            });
            setLoading(false);
            return;
          }
          router.replace(
            paidInv?.id ? `/dashboard/invitation/${paidInv.id}` : onboardData.redirectUrl || "/dashboard",
          );
          return;
        }

        if (onboardData?.step === "FREE_DRAFT" && onboardData?.freeDraftId) {
          setExistingFreeDraftId(onboardData.freeDraftId);
          setExistingFreeDraftMeta({
            themeId: onboardData.invitation?.themeId,
            eventType: onboardData.invitation?.eventType,
          });
        }

        // Intent "Gunakan Tema Ini" (?theme=...&event=...) dari Portofolio atau Katalog Demo
        if (
          status === "authenticated" &&
          !isNewAdditional &&
          !srvClosed &&
          matchedTheme &&
          !intentHandledRef.current
        ) {
          const compatibleEvents = enabledList.filter((ev) => isThemeCompatible(matchedTheme.eventType, ev));
          if (compatibleEvents.length > 0) {
            intentHandledRef.current = true;
            const preferredEv =
              requestedEventParam && compatibleEvents.includes(requestedEventParam)
                ? requestedEventParam
                : compatibleEvents.includes(String(matchedTheme.eventType || "").toUpperCase())
                ? String(matchedTheme.eventType).toUpperCase()
                : compatibleEvents[0];

            // Kasus A: Klien sudah punya Draf Gratis
            if (onboardData?.step === "FREE_DRAFT" && onboardData?.freeDraftId) {
              const curTheme = String(onboardData.invitation?.themeId || "").toLowerCase();
              const curEvent = String(onboardData.invitation?.eventType || "WEDDING").toUpperCase();
              // Jika tema sudah sama dan jenis acara kompatibel, langsung buka studio drafnya
              if (curTheme === matchedTheme.id.toLowerCase() && isThemeCompatible(matchedTheme.eventType, curEvent)) {
                router.replace(`/dashboard/invitation/${onboardData.freeDraftId}`);
                return;
              }
              // Buka modal konfirmasi penerapan tema ke Draf Gratis yang sudah ada
              setSelectedFreeEventType(compatibleEvents.includes(curEvent) ? curEvent : preferredEv);
              setEventPickerOpen(true);
              setLoading(false);
              return;
            }

            // Kasus B: Klien belum punya draf/undangan -> jika hanya 1 jenis acara yang kompatibel (mis. WEDDING),
            // langsung buat Draf Gratis dengan tema tersebut dan masuk ke Studio tanpa klik tambahan.
            if (compatibleEvents.length === 1) {
              setAutoLaunchingTheme(true);
              setLoading(false);
              try {
                const res = await fetch("/api/client/invitations/free-draft", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    eventType: compatibleEvents[0],
                    themeId: matchedTheme.id,
                  }),
                });
                const draftData = await res.json();
                if (res.ok && draftData.invitation?.id) {
                  try {
                    sessionStorage.removeItem("lux_pending_setup_theme");
                  } catch {}
                  router.replace(`/dashboard/invitation/${draftData.invitation.id}`);
                  return;
                }
                setDraftError(draftData.error || "Gagal menyiapkan draf gratis.");
              } catch {
                setDraftError("Koneksi terganggu saat menyiapkan draf gratis.");
              } finally {
                setAutoLaunchingTheme(false);
              }
              return;
            }

            // Kasus C: Tema Non-Wedding dengan >1 pilihan jenis acara non-wedding aktif -> tampilkan modal pemilih
            // jenis acara dengan eventType portofolio/katalog terpilih sebagai default
            setSelectedFreeEventType(preferredEv);
            setEventPickerOpen(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, router, isNewAdditional, requestedThemeParam, requestedEventParam]);

  if (loading || autoLaunchingTheme) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-stone-500 font-medium">
            {autoLaunchingTheme && requestedThemeObj
              ? `Menyiapkan Studio Draf dengan tema ${requestedThemeObj.name}...`
              : "Memuat daftar paket..."}
          </p>
        </div>
      </div>
    );
  }

  const isClosed = serviceStatus && !serviceStatus.isOpen;

  const modalCompatibleEventTypes = requestedThemeObj
    ? enabledEventTypes.filter((ev) => isThemeCompatible(requestedThemeObj.eventType, ev))
    : enabledEventTypes;

  const submitFreeDraft = async (eventType: string) => {
    if (creatingDraft || isClosed) return;
    setDraftError("");
    setCreatingDraft(true);
    try {
      // Jika klien sudah punya Draf Gratis dan sedang menerapkan tema baru dari Portofolio / Katalog Demo
      if (existingFreeDraftId && requestedThemeObj) {
        const res = await fetch(`/api/client/invitations/${existingFreeDraftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CHANGE_FREE_DRAFT_EVENT_TYPE",
            eventType,
            themeId: requestedThemeObj.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setDraftError(data.error || "Gagal menerapkan tema ke draf gratis.");
          return;
        }
        setEventPickerOpen(false);
        try {
          sessionStorage.removeItem("lux_pending_setup_theme");
        } catch {}
        router.push(`/dashboard/invitation/${existingFreeDraftId}`);
        return;
      }

      const res = await fetch("/api/client/invitations/free-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          ...(requestedThemeObj ? { themeId: requestedThemeObj.id } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.invitation?.id) {
        setDraftError(data.error || "Gagal membuat draf gratis.");
        return;
      }
      setEventPickerOpen(false);
      try {
        sessionStorage.removeItem("lux_pending_setup_theme");
      } catch {}
      router.push(`/dashboard/invitation/${data.invitation.id}`);
    } catch {
      setDraftError("Koneksi terganggu saat menyiapkan draf gratis.");
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleStartFreeDraft = async () => {
    if (creatingDraft || isClosed) return;
    setDraftError("");
    const targetEvents = modalCompatibleEventTypes.length > 0 ? modalCompatibleEventTypes : enabledEventTypes;
    if (targetEvents.length > 1 || (existingFreeDraftId && requestedThemeObj)) {
      setSelectedFreeEventType((prev) => (prev && targetEvents.includes(prev) ? prev : targetEvents[0]));
      setEventPickerOpen(true);
      return;
    }
    const singleType = targetEvents[0] || "WEDDING";
    await submitFreeDraft(singleType);
  };

  const handleApplyThemeToPaidDraft = async () => {
    if (!paidDraftTarget?.id || !requestedThemeObj || applyingPaidDraftTheme) return;
    setPaidDraftError("");
    setApplyingPaidDraftTheme(true);
    try {
      const res = await fetch(`/api/client/invitations/${paidDraftTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: requestedThemeObj.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaidDraftError(data.error || "Gagal menerapkan tema ke draf undangan Anda.");
        return;
      }
      try {
        sessionStorage.removeItem("lux_pending_setup_theme");
      } catch {}
      router.push(`/dashboard/invitation/${paidDraftTarget.id}`);
    } catch {
      setPaidDraftError("Koneksi terganggu saat menerapkan tema.");
    } finally {
      setApplyingPaidDraftTheme(false);
    }
  };

    return (
      <div className="min-h-screen bg-[#faf8f5] font-sans flex flex-col">
        <header className="border-b border-[#eadecf]/70 bg-white sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <BrandLogo size="sm" showName brandName={platformName} />
            <div className="text-xs font-semibold text-stone-500">Pilih Paket</div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1e1c1a]">
              Selamat Datang{session?.user?.name ? `, ${session.user.name}` : session?.user?.email ? `, ${session.user.email.split("@")[0]}` : ""}!
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-2 max-w-lg mx-auto">
              Akun Anda telah berhasil terdaftar. Silakan pilih paket undangan digital yang paling sesuai dengan kebutuhan acara Anda untuk melanjutkan.
            </p>
          </div>

          {/* Multi-event reassurance badge: hanya jenis acara yang menerima undangan baru */}
          {enabledEventTypes.length > 1 && (
            <div className="max-w-2xl mx-auto mb-8 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center justify-center gap-2.5 text-center text-xs text-amber-950">
              <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0"></span>
              <span><strong>Multi-Acara Fleksibel:</strong> Seluruh paket di bawah mendukung jenis acara {enabledEventTypes.map((ev) => BUILDER_EVENT_LABELS[ev as BuilderEventType] ?? ev).join(", ")}.</span>
            </div>
          )}

          {/* Dynamic Service Status Notice */}
          {isClosed && (
            <div className={`mb-8 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border text-sm max-w-3xl mx-auto ${serviceStatus.mode === "CLOSED_ORDER"
              ? "bg-amber-50/90 border-amber-300/80 text-amber-950"
              : serviceStatus.mode === "MAINTENANCE"
                ? "bg-rose-50/90 border-rose-300/80 text-rose-950"
                : "bg-stone-50 border-stone-200 text-stone-900"
              }`}>
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs mb-1">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${serviceStatus.mode === "CLOSED_ORDER" ? "bg-amber-600" :
                  serviceStatus.mode === "MAINTENANCE" ? "bg-rose-600" : "bg-stone-700"
                  }`} />
                <span>{serviceStatus.title}</span>
              </div>
              <p className="text-stone-700 leading-relaxed text-xs">
                {serviceStatus.message}
              </p>
              {serviceStatus.reopenDate && (
                <p className="text-xs font-semibold text-amber-900 mt-2">
                  Estimasi dibuka kembali: <span className="underline">{serviceStatus.reopenDate}</span>
                </p>
              )}
              {serviceStatus.contactWa && (
                <div className="mt-3 pt-3 border-t border-amber-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-stone-500">Ingin konsultasi atau antrean pemesanan berikutnya?</span>
                  <a
                    href={`https://wa.me/${serviceStatus.contactWa.replace(/\D/g, "")}?text=${encodeURIComponent("Halo Admin, saya ingin reservasi/antrean paket undangan digital.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-800 text-white rounded-full text-xs font-bold hover:bg-amber-900 transition shrink-0"
                  >
                    Tanya Kuota via WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-2xl sm:rounded-3xl p-5 sm:p-8 flex flex-col justify-between transition-all duration-200 relative ${pkg.isFeatured
                  ? "bg-[#fffdfa] border-2 border-amber-800/40 shadow-lg sm:scale-[1.02]"
                  : "bg-white border border-[#eadecf] shadow-sm hover:shadow-md"
                  }`}
              >
                {pkg.badge && (
                  <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-700 to-amber-900 text-white text-[11px] sm:text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    {pkg.badge}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-serif font-bold text-[#1e1c1a] mt-2 sm:mt-4">{pkg.name}</h3>
                  <p className="text-xs text-[#6e685f] mt-1 line-clamp-2">{pkg.desc}</p>

                  <div className="my-5">
                    <span className="text-3xl font-bold text-[#1e1c1a]">
                      Rp {pkg.price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[#6e685f] text-xs"> / undangan</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#524d45] mb-8">
                    {pkg.features?.map((f: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isClosed ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 font-bold rounded-full text-center text-sm bg-stone-200 text-stone-500 cursor-not-allowed opacity-80"
                  >
                    Pemesanan Ditutup
                  </button>
                ) : (
                  <Link
                    href={`/checkout?plan=${pkg.id}${isNewAdditional ? "&new=1" : ""}`}
                    className={`w-full py-3 font-bold rounded-full text-center transition text-sm shadow-xs ${pkg.isFeatured
                      ? "bg-amber-800 hover:bg-amber-900 text-white"
                      : "bg-stone-900 hover:bg-stone-800 text-white"
                      }`}
                  >
                    Pilih Paket Ini
                  </Link>
                )}
              </div>
            ))}
          </div>

          {!isClosed && !isNewAdditional && status === "authenticated" && (
            existingFreeDraftId ? (
              <div className="mt-8 bg-white border border-amber-300/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span>Draf Gratis Aktif</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-serif font-bold text-[#1e1c1a]">
                    Pilih Paket di Atas untuk Mengaktifkan Draf Anda
                  </h2>
                  <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                    Seluruh tema, teks, dan foto yang sudah Anda susun di Draf Gratis akan otomatis tersimpan dan langsung terbuka penuh setelah paket dibayar.
                  </p>
                </div>
                <Link
                  href={`/dashboard/invitation/${existingFreeDraftId}`}
                  className="shrink-0 px-5 py-3 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold transition text-center shadow-xs"
                >
                  Kembali ke Studio Draf
                </Link>
              </div>
            ) : (
              <div className="mt-8 bg-white border border-amber-300/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span>Coba Sebelum Membayar</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-serif font-bold text-[#1e1c1a]">
                    Coba Buat Draf Gratis Terlebih Dahulu
                  </h2>
                  <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                    Uji coba studio editor, pilih jenis acara &amp; tema, unggah hingga 3 foto, dan lihat pratinjau undangan secara langsung selama 14 hari sebelum mengaktifkan paket.
                  </p>
                  {draftError && !eventPickerOpen && (
                    <p className="text-xs font-semibold text-rose-700 pt-1">{draftError}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={creatingDraft}
                  onClick={handleStartFreeDraft}
                  className="shrink-0 px-5 py-3 rounded-full bg-amber-900 hover:bg-amber-950 text-white text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {creatingDraft ? "Menyiapkan Draf..." : "Coba Buat Draf Gratis"}
                </button>
              </div>
            )
          )}

          {/* Modal Pilih Jenis Acara sebelum membuat Draf Gratis */}
          {eventPickerOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/50 backdrop-blur-xs"
              onClick={() => !creatingDraft && setEventPickerOpen(false)}
            >
              <div
                className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden text-stone-900"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-stone-200/80 bg-stone-50/90 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                      {existingFreeDraftId && requestedThemeObj ? "Terapkan Tema Pilihan" : "Langkah Awal Draf Gratis"}
                    </span>
                    <h3 className="text-base font-serif font-bold text-stone-900 mt-0.5">
                      {existingFreeDraftId && requestedThemeObj
                        ? `Gunakan Tema ${requestedThemeObj.name}`
                        : "Pilih Jenis Acara Undangan"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={creatingDraft}
                    onClick={() => setEventPickerOpen(false)}
                    aria-label="Tutup"
                    className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                  {requestedThemeObj && (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between gap-2 text-xs text-amber-950">
                      <span className="font-semibold">Tema Pilihan: {requestedThemeObj.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-900">
                        {requestedThemeObj.eventType === "WEDDING" ? "Pernikahan" : "Multi-Acara Non-Wedding"}
                      </span>
                    </div>
                  )}

                  {existingFreeDraftId &&
                    requestedThemeObj &&
                    existingFreeDraftMeta?.eventType &&
                    existingFreeDraftMeta.eventType !== selectedFreeEventType && (
                      <p className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
                        Draf gratis Anda saat ini berjenis acara{" "}
                        <strong>{BUILDER_EVENT_LABELS[existingFreeDraftMeta.eventType as BuilderEventType] ?? existingFreeDraftMeta.eventType}</strong>.
                        Mengganti jenis acara akan menerapkan tema <strong>{requestedThemeObj.name}</strong> dan menyesuaikan ulang struktur form peserta.
                      </p>
                    )}

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Pilihan ini menentukan katalog tema dan struktur form (Pernikahan memakai dua mempelai, sedangkan acara non-pernikahan memakai format satu subjek). Anda masih dapat menggantinya selama dalam mode Draf Gratis.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(modalCompatibleEventTypes.length > 0 ? modalCompatibleEventTypes : enabledEventTypes).map((ev) => {
                      const isSelected = selectedFreeEventType === ev;
                      const isWedding = ev === "WEDDING";
                      return (
                        <button
                          key={ev}
                          type="button"
                          onClick={() => setSelectedFreeEventType(ev)}
                          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${isSelected
                            ? "border-2 border-amber-800 bg-amber-50/70 shadow-2xs"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/70"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-stone-900">
                              {BUILDER_EVENT_LABELS[ev as BuilderEventType] ?? ev}
                            </span>
                            <span
                              className={`shrink-0 whitespace-nowrap text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isWedding
                                ? "bg-amber-100/80 text-amber-900 border-amber-200"
                                : "bg-stone-100 text-stone-600 border-stone-200"
                                }`}
                            >
                              {isWedding ? "Pernikahan" : "Non-Wedding"}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                            {FREE_DRAFT_EVENT_DESCRIPTIONS[ev] || "Undangan digital dengan tema dan susunan acara fleksibel."}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {draftError && (
                    <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                      {draftError}
                    </p>
                  )}
                </div>

                <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-stone-200/80 bg-stone-50/80 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={creatingDraft}
                    onClick={() => setEventPickerOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={creatingDraft || !selectedFreeEventType}
                    onClick={() => submitFreeDraft(selectedFreeEventType)}
                    className="px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {creatingDraft
                      ? "Menyiapkan Studio..."
                      : existingFreeDraftId && requestedThemeObj
                      ? "Terapkan & Buka Studio"
                      : "Mulai Draf Gratis"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Konfirmasi Penerapan Tema pada Draf Berbayar yang Sudah Ada */}
          {paidDraftTarget && requestedThemeObj && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/50 backdrop-blur-xs"
              onClick={() => !applyingPaidDraftTheme && setPaidDraftTarget(null)}
            >
              <div
                className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden text-stone-900"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 sm:px-6 py-4 border-b border-stone-200/80 bg-stone-50/90 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                      Konfirmasi Pergantian Tema
                    </span>
                    <h3 className="text-base font-serif font-bold text-stone-900 mt-0.5">
                      Gunakan Tema {requestedThemeObj.name}?
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={applyingPaidDraftTheme}
                    onClick={() => setPaidDraftTarget(null)}
                    aria-label="Tutup"
                    className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Anda sudah memiliki draf undangan aktif. Apakah Anda ingin mengganti tema draf undangan Anda ke{" "}
                    <strong className="text-stone-900">{requestedThemeObj.name}</strong>? Data peserta, jadwal acara,
                    dan teks yang sudah Anda isi tetap tersimpan.
                  </p>

                  {paidDraftError && (
                    <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                      {paidDraftError}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      disabled={applyingPaidDraftTheme}
                      onClick={handleApplyThemeToPaidDraft}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      {applyingPaidDraftTheme ? "Mengganti Tema..." : "Ganti Tema & Buka Studio"}
                    </button>
                    <button
                      type="button"
                      disabled={applyingPaidDraftTheme}
                      onClick={() => router.push(`/dashboard/invitation/${paidDraftTarget.id}`)}
                      className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Batal &amp; Kembali ke Studio Draf
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 text-center max-w-2xl mx-auto px-4">
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              Dengan memilih paket dan melanjutkan proses ke gerbang pembayaran, Anda setuju bahwa Anda telah membaca dan menerima seluruh{' '}
              <Link href="/terms" className="text-amber-700 hover:underline">Syarat & Ketentuan</Link> serta{' '}
              <Link href="/privacy" className="text-amber-700 hover:underline">Kebijakan Privasi</Link> layanan {platformName}, termasuk kebijakan{' '}
              <Link href="/refund" className="text-amber-700 hover:underline font-medium">TIDAK ADA PENGEMBALIAN DANA (No Refund)</Link>{' '}
              untuk produk digital yang telah dibeli.
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-stone-400 hover:text-stone-700 text-xs transition cursor-pointer"
            >
              Bukan akun Anda? <span className="underline">Ganti Akun / Keluar</span>
            </button>
          </div>
        </main>
      </div>
    );
}

export default function PackageSelectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center font-sans">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PackageSelectionContent />
    </Suspense>
  );
}
