"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";

import { resolveEffectiveInvitationUrl, getLatestEventDate, getMemoriesActiveSchedule } from "@/lib/domainUtils";
import UnifiedAddonModal from "@/components/client/UnifiedAddonModal";
import PrintableQRCardModal from "@/components/client/PrintableQRCardModal";
import GuestOpeningSetupModal from "@/components/client/GuestOpeningSetupModal";

const FILTER_PRESETS_LIST = [
  {
    id: "aura_90s",
    name: "Aura '90s",
    subName: "Vintage Warm",
    desc: "Hangat, kulit merona, golden hour",
    badge: "Populer",
    previewBg: "from-amber-700/80 via-orange-600/70 to-stone-900",
    cssFilter: "contrast(1.15) saturate(1.2) sepia(0.18) brightness(0.97)",
  },
  {
    id: "heritage_romance",
    name: "Heritage Romance",
    subName: "Classic Sepia",
    desc: "Sepia pudar, champagne lembut, romantis klasik",
    badge: "Klasik",
    previewBg: "from-amber-900/80 via-stone-800 to-amber-950",
    cssFilter: "sepia(0.38) contrast(1.08) brightness(0.94) saturate(1.1)",
  },
  {
    id: "botanical_mist",
    name: "Botanical Mist",
    subName: "Earthy Soft",
    desc: "Pastel green teduh, cocok untuk pesta outdoor/garden",
    badge: "Garden",
    previewBg: "from-emerald-900/80 via-teal-900 to-stone-900",
    cssFilter: "contrast(1.08) saturate(0.95) hue-rotate(10deg) brightness(1.02)",
  },
  {
    id: "cinema_noir",
    name: "Cinema Noir",
    subName: "Moody B&W",
    desc: "Monokrom kontras tegas, mewah & dramatis",
    badge: "Monokrom",
    previewBg: "from-stone-950 via-stone-800 to-stone-900",
    cssFilter: "grayscale(1) contrast(1.3) brightness(0.92)",
  },
  {
    id: "pure_daylight",
    name: "Pure Daylight",
    subName: "True Natural",
    desc: "Warna asli alami tanpa distorsi, jernih & presisi",
    badge: "Natural",
    previewBg: "from-sky-900/60 via-stone-800 to-stone-900",
    cssFilter: "contrast(1.05) saturate(1.05) brightness(1.0)",
  },
];

const OPENING_LAYOUTS = [
  {
    id: "editorial_showcase",
    name: "Editorial Showcase",
    tag: "Default",
    desc: "Layar bersih dengan foto potret lengkung 4:5, tipografi serif anggun, dan tombol kapsul gelap.",
  },
  {
    id: "cinematic_hero",
    name: "Cinematic Hero",
    tag: "Mewah",
    desc: "Foto pasangan fullscreen dengan gradient dramatis sinematik dan floating glassmorphism card.",
  },
  {
    id: "polaroid_nostalgia",
    name: "Polaroid Nostalgia",
    tag: "Analog",
    desc: "Frame kartu foto polaroid instan vintage miring dengan stempel tanggal oranye retro analog.",
  },
];

export default function MomentsSetupPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [invitation, setInvitation] = useState<any>(null);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Memories State
  const [guestMemoriesList, setGuestMemoriesList] = useState<any[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [pendingGalleryOrder, setPendingGalleryOrder] = useState<any>(null);
  const [memoriesQuota, setMemoriesQuota] = useState<any>(null);

  // Download ZIP State
  const [downloadPhase, setDownloadPhase] = useState<"idle" | "fetching" | "downloading" | "zipping" | "done" | "error">("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isSyncHelpModalOpen, setIsSyncHelpModalOpen] = useState(false);

  // Sessions State & Autosave Debouncing
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionSaveStatus, setSessionSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const sessionSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [isRollModalOpen, setIsRollModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isPrintQrModalOpen, setIsPrintQrModalOpen] = useState(false);
  const [rollModalInput, setRollModalInput] = useState<number>(5);
  const [isSavingRoll, setIsSavingRoll] = useState(false);
  const [rollModalMsg, setRollModalMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter & Camera Settings
  const [updatingSetting, setUpdatingSetting] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const fetchGuestMemories = useCallback(async (invId?: string) => {
    const targetId = invId || invitation?.id;
    if (!targetId) return;
    setLoadingMemories(true);
    try {
      const res = await fetch(`/api/client/invitations/${targetId}/memories`);
      const data = await res.json();
      if (data.success) {
        setGuestMemoriesList(data.memories || []);
        if (data.pendingOrder !== undefined) setPendingGalleryOrder(data.pendingOrder);
        if (data.quota) setMemoriesQuota(data.quota);
      }
    } catch (e) {
      console.error("Gagal mengambil data kenangan tamu:", e);
    } finally {
      setLoadingMemories(false);
    }
  }, [invitation?.id]);

  useEffect(() => {
    fetch("/api/client/invitations", { cache: "no-store" })
      .then((res) => res.json())
      .then(async (invitations) => {
        if (Array.isArray(invitations) && invitations.length > 0) {
          const inv = invitations[0];
          setInvitation(inv);

          if (inv.featureSettings) {
            try {
              const parsedFs = typeof inv.featureSettings === "object" ? inv.featureSettings : JSON.parse(inv.featureSettings);
              if (Array.isArray(parsedFs.memoriesSessions)) {
                setSessions(parsedFs.memoriesSessions);
              }
            } catch {}
          }

          fetch("/api/public/settings")
            .then((r) => r.json())
            .then((data) => setPlatformSettings(data))
            .catch(() => null);

          await fetchGuestMemories(inv.id);
          setLoading(false);
        } else {
          router.replace("/dashboard/setup");
        }
      })
      .catch(() => setLoading(false));
  }, [router, fetchGuestMemories]);

  // Helper Feature Settings
  const getFeatureSetting = (key: string, defaultVal: any) => {
    if (!invitation?.featureSettings) return defaultVal;
    try {
      const parsed = typeof invitation.featureSettings === "object"
        ? invitation.featureSettings
        : JSON.parse(invitation.featureSettings);
      return parsed[key] !== undefined ? parsed[key] : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  const updateSettingFast = async (key: string, value: any) => {
    if (!invitation?.id) return;
    setUpdatingSetting(true);
    // Optimistic update: sinkronkan state lokal seketika (0 ms) sebelum respons server tiba
    setInvitation((prev: any) => {
      if (!prev) return prev;
      let currentFs: Record<string, any> = {};
      try {
        currentFs = typeof prev.featureSettings === "object" && prev.featureSettings !== null
          ? { ...prev.featureSettings }
          : JSON.parse(prev.featureSettings || "{}");
      } catch {}
      return {
        ...prev,
        featureSettings: JSON.stringify({ ...currentFs, [key]: value }),
      };
    });
    try {
      const res = await fetch(`/api/client/invitations/${invitation.id}/memories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan perubahan");
      }
      setInvitation((prev: any) => ({
        ...prev,
        featureSettings: JSON.stringify(data.featureSettings),
      }));
      setStatusToast("Pengaturan berhasil disimpan.");
      setTimeout(() => setStatusToast(null), 2500);
    } catch (err: any) {
      setStatusToast(`Gagal: ${err.message}`);
      setTimeout(() => setStatusToast(null), 3000);
    } finally {
      setUpdatingSetting(false);
    }
  };

  const handleSaveRollQuota = async () => {
    if (!invitation?.id || isSavingRoll) return;
    setIsSavingRoll(true);
    setRollModalMsg(null);
    try {
      const res = await fetch(`/api/client/invitations/${invitation.id}/memories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotsQuota: rollModalInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan jatah roll.");
      }
      setRollModalMsg({ type: "success", text: `Jatah roll berhasil disimpan: ${rollModalInput} foto per tamu.` });
      setInvitation((prev: any) => {
        if (!prev) return prev;
        const currentFs = typeof prev.featureSettings === "object" ? prev.featureSettings : JSON.parse(prev.featureSettings || "{}");
        return {
          ...prev,
          featureSettings: JSON.stringify({
            ...currentFs,
            memoriesShotsQuota: rollModalInput,
            shotsQuota: rollModalInput,
          }),
        };
      });
      await fetchGuestMemories(invitation.id);
      setTimeout(() => {
        setIsRollModalOpen(false);
        setRollModalMsg(null);
      }, 1000);
    } catch (err: any) {
      setRollModalMsg({ type: "error", text: err.message || "Gagal menyimpan pengaturan." });
    } finally {
      setIsSavingRoll(false);
    }
  };

  const handleDeletePhoto = async (memoryId: string) => {
    if (!confirm("Hapus foto candid ini dari galeri kenangan?") || !invitation?.id) return;
    try {
      const res = await fetch(`/api/client/invitations/${invitation.id}/memories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId }),
      });
      if (res.ok) {
        setGuestMemoriesList((prev) => prev.filter((m) => m.id !== memoryId));
        await fetchGuestMemories(invitation.id);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2 text-stone-500">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Memuat Pusat Komando Moments...</span>
        </div>
      </div>
    );
  }

  const planType = (invitation?.order?.planType || invitation?.planType || "TIER_1").toUpperCase();
  const pkgConfig = platformSettings?.packages?.find((p: any) => p.id === planType);
  const hasAccess = pkgConfig
    ? Boolean(pkgConfig.capabilities?.includes("guest_memories"))
    : (memoriesQuota?.hasAccess !== undefined ? Boolean(memoriesQuota.hasAccess) : (planType === "TIER_2" || planType === "TIER_3"));

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-10 bg-white border border-stone-200 rounded-3xl shadow-xs text-center space-y-4 my-8">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-stone-900">Fitur Kamera Tamu Belum Aktif</h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          Fitur Virtual Disposable Camera &amp; Live Moments belum aktif pada paket undangan Anda. Hubungi administrator atau tingkatkan paket Anda untuk mengabadikan momen candid tamu pernikahan.
        </p>
        <Link
          href={`/dashboard/invitation/${invitation?.id || ""}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition"
        >
          <span>Upgrade Paket di Studio</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    );
  }

  const hasValidSubdomain = !!invitation?.subdomain?.trim();
  const hasCustomDomain = !!invitation?.customDomain?.trim();
  const isPublished = invitation?.status === "PUBLISHED";

  // STRICT ZERO-FALLBACK: Jangan gunakan fallback URL dummy jika belum publish atau subdomain kosong!
  let sharemomentUrl = "";
  if (isPublished && (hasCustomDomain || hasValidSubdomain)) {
    const resolvedDomain = resolveEffectiveInvitationUrl({
      customDomain: invitation?.customDomain,
      subdomain: invitation?.subdomain,
    });
    const rawBase = (resolvedDomain?.url || "").replace(/\/+$/, "");
    if (rawBase) {
      sharemomentUrl = `${rawBase}/sharemoment`;
    }
  }

  const activeFilterId = getFeatureSetting("memoriesFilter", "aura_90s");
  const activePreset = FILTER_PRESETS_LIST.find((f) => f.id === activeFilterId) || FILTER_PRESETS_LIST[0];
  const isEnabled = getFeatureSetting("showGuestMemories", true);
  const baseRetentionDays = planType === "TIER_3" ? 90 : (planType === "TIER_2" ? 30 : 7);
  const extraGalleryDays = Number(getFeatureSetting("extraGalleryDays", 0)) || 0;
  const totalRetentionDays = baseRetentionDays + extraGalleryDays;

  const latestEventDate = getLatestEventDate(invitation?.eventData);
  const effectiveExpiry = invitation?.galleryExpiresAt
    ? new Date(invitation.galleryExpiresAt)
    : latestEventDate
    ? new Date(latestEventDate.getTime() + totalRetentionDays * 24 * 60 * 60 * 1000)
    : null;

  const daysRemaining = effectiveExpiry
    ? Math.max(0, Math.ceil((effectiveExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const hasExtended = extraGalleryDays >= 30;
  const isRenewalWindow = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const canExtend = !hasExtended && isRenewalWindow;

  const openingLayoutId = getFeatureSetting("memoriesOpeningLayout", "editorial_showcase");
  const activeOpeningObj = OPENING_LAYOUTS.find((l) => l.id === openingLayoutId) || OPENING_LAYOUTS[0];
  const activeOpeningName = activeOpeningObj.name;

  const coupleTitle = `${invitation?.groomNickname || "Mempelai Pria"} & ${invitation?.brideNickname || "Mempelai Wanita"}`;
  const coverPhoto = getFeatureSetting("memoriesCoverPhoto", "") || invitation?.media?.find((m: any) => m.mediaSlot === "LANDING_COVER")?.localPath || "/demo/candani/gallery_01.webp";
  const instructionText = getFeatureSetting("memoriesCardInstruction", "Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda.");

  const getRetroDateStamp = () => {
    if (latestEventDate) {
      const day = String(latestEventDate.getDate()).padStart(2, "0");
      const month = String(latestEventDate.getMonth() + 1).padStart(2, "0");
      const yearShort = String(latestEventDate.getFullYear()).slice(-2);
      return `${day}  ${month}  '${yearShort}`;
    }
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}  ${String(now.getMonth() + 1).padStart(2, "0")}  '${String(now.getFullYear()).slice(-2)}`;
  };

  const events = (() => {
    try {
      if (!invitation?.eventData) return [];
      const parsed = typeof invitation.eventData === "string" ? JSON.parse(invitation.eventData) : invitation.eventData;
      return Array.isArray(parsed) ? parsed : parsed?.events || [];
    } catch {
      return [];
    }
  })();

  const totalEventQuota = memoriesQuota?.maxTotalPhotos || (planType === "TIER_3" ? 1000 : 250);

  // Simpan sesi ke server secara terisolasi tanpa memicu fetchGuestMemories atau lag pengetikan
  const saveSessionsToServer = async (updatedSessions: any[]) => {
    if (!invitation?.id) return;
    setSessionSaveStatus("saving");
    try {
      const res = await fetch(`/api/client/invitations/${invitation.id}/memories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoriesSessions: updatedSessions }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvitation((prev: any) => ({
          ...prev,
          featureSettings: JSON.stringify(data.featureSettings),
        }));
        setSessionSaveStatus("saved");
        setTimeout(() => setSessionSaveStatus("idle"), 2500);
      } else {
        setSessionSaveStatus("idle");
      }
    } catch {
      setSessionSaveStatus("idle");
    }
  };

  const scheduleSaveSessions = (updatedSessions: any[]) => {
    if (sessionSaveTimerRef.current) {
      clearTimeout(sessionSaveTimerRef.current);
    }
    setSessionSaveStatus("saving");
    sessionSaveTimerRef.current = setTimeout(() => {
      saveSessionsToServer(updatedSessions);
    }, 700);
  };

  const handleAutoSyncSessions = () => {
    if (!events || events.length === 0) {
      setIsSyncHelpModalOpen(true);
      return;
    }
    const count = events.length;
    const perSession = Math.floor(totalEventQuota / count);
    const synced = events.map((ev: any, idx: number) => {
      const isLast = idx === count - 1;
      const allocated = isLast ? (totalEventQuota - perSession * (count - 1)) : perSession;

      let cleanDate = ev.date || "";
      if (cleanDate.includes("T")) {
        cleanDate = cleanDate.split("T")[0];
      }

      let sTime = ev.startTime || "";
      let eTime = ev.endTime || "";
      if ((!sTime || !eTime) && ev.time) {
        const match = String(ev.time).match(/(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2}|selesai)/i);
        if (match) {
          sTime = match[1].replace(".", ":").padStart(5, "0");
          eTime = /selesai/i.test(match[2]) ? "23:59" : match[2].replace(".", ":").padStart(5, "0");
        }
      }

      return {
        id: ev.id || `sess_${idx}_${Date.now()}`,
        name: ev.title || (idx === 0 ? "Akad Nikah" : "Resepsi Pernikahan"),
        date: cleanDate,
        startTime: sTime || "08:00",
        endTime: eTime || "22:00",
        allocatedQuota: allocated,
      };
    });
    setSessions(synced);
    saveSessionsToServer(synced);
    setStatusToast(`Berhasil menarik ${synced.length} sesi acara dari undangan.`);
    setTimeout(() => setStatusToast(null), 3000);
  };

  const handleAddSession = () => {
    const current = [...sessions];
    const firstDate = events && events[0]?.date ? events[0].date : "";
    current.push({
      id: `sess_${Date.now()}`,
      name: `Sesi ${current.length + 1}`,
      date: firstDate,
      startTime: "19:00",
      endTime: "23:00",
      allocatedQuota: 0,
    });
    setSessions(current);
    saveSessionsToServer(current);
  };

  const handleUpdateSession = (index: number, field: string, value: any) => {
    const current = [...sessions];
    if (field === "allocatedQuota") {
      // Pembatas Otomatis: Batasi nilai maksimal sesuai sisa kuota yang belum dialokasikan ke sesi lain
      const otherAllocated = current.reduce((sum, s, idx) => idx === index ? sum : sum + (Number(s.allocatedQuota) || 0), 0);
      const maxAllowed = Math.max(0, totalEventQuota - otherAllocated);
      const rawNum = value === "" ? 0 : parseInt(value);
      const parsed = isNaN(rawNum) ? 0 : Math.max(0, rawNum);
      const clamped = Math.min(parsed, maxAllowed);
      current[index] = { ...current[index], allocatedQuota: clamped };
    } else {
      current[index] = { ...current[index], [field]: value };
    }
    setSessions(current);
    scheduleSaveSessions(current);
  };

  const handleAutoBalanceQuota = () => {
    if (sessions.length === 0) return;
    const count = sessions.length;
    const perSession = Math.floor(totalEventQuota / count);
    const updated = sessions.map((s, idx) => {
      const isLast = idx === count - 1;
      const allocated = isLast ? (totalEventQuota - perSession * (count - 1)) : perSession;
      return { ...s, allocatedQuota: allocated };
    });
    setSessions(updated);
    saveSessionsToServer(updated);
    setStatusToast(`Berhasil membagi rata ${totalEventQuota} foto ke ${count} sesi.`);
    setTimeout(() => setStatusToast(null), 3000);
  };

  const handleBlurSession = () => {
    if (sessionSaveTimerRef.current) {
      clearTimeout(sessionSaveTimerRef.current);
    }
    saveSessionsToServer(sessions);
  };

  const handleRemoveSession = (index: number) => {
    const current = sessions.filter((_, idx) => idx !== index);
    setSessions(current);
    saveSessionsToServer(current);
  };

  const totalAllocated = sessions.reduce((acc: number, s: any) => acc + (Number(s.allocatedQuota) || 0), 0);

  // Evaluasi jadwal sesi multi-sesi secara real-time berdasarkan data sesi aktif
  const activeSchedule = getMemoriesActiveSchedule(
    {
      ...(typeof invitation?.featureSettings === "object" ? invitation?.featureSettings : JSON.parse(invitation?.featureSettings || "{}")),
      memoriesSessions: sessions,
    },
    invitation?.eventData
  );

  // Status penyelesaian acara dinamis
  const isScheduleConcluded = activeSchedule.isAllFinished;
  const isEventMarkedFinished = invitation?.status === "EVENT_FINISHED";
  const isManuallyClosed = !isEnabled || Boolean(invitation?.memoriesUploadLocked);
  const isReadyForDownload = (isScheduleConcluded || isEventMarkedFinished || isManuallyClosed) && guestMemoriesList.length > 0;

  // Handler Download ZIP Client-Side via JSZip
  const handleStartDownloadZip = async () => {
    if (downloadPhase === "fetching" || downloadPhase === "downloading" || downloadPhase === "zipping") return;
    if (guestMemoriesList.length === 0 || !invitation?.id) return;

    setDownloadPhase("fetching");
    setDownloadProgress(0);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/client/memories/download-urls?invitationId=${invitation.id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error === "EMPTY" ? "Belum ada foto momen dari tamu." : (data.error || "Gagal mengambil daftar foto."));
      }

      const { files, zipName } = data as { files: { url: string; filename: string }[]; zipName: string };
      if (!files || files.length === 0) {
        throw new Error("Belum ada foto momen yang siap diunduh.");
      }

      setDownloadPhase("downloading");

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < files.length; i++) {
        const { url, filename } = files[i];
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const blob = await resp.blob();
            zip.file(filename, blob);
          }
        } catch {
          console.warn(`Skip file gagal: ${filename}`);
        }
        setDownloadProgress(Math.round(((i + 1) / files.length) * 85));
      }

      setDownloadPhase("zipping");
      setDownloadProgress(90);
      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 1 },
      });

      setDownloadProgress(95);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = zipName || `Momen_Tamu_${invitation.invitationSlug || "Wedding"}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);

      try {
        await fetch(`/api/client/memories/lock?invitationId=${invitation.id}`, { method: "POST" });
        setInvitation((prev: any) => ({ ...prev, memoriesUploadLocked: true }));
      } catch (lockErr) {
        console.warn("[Lock Upload Warning]", lockErr);
      }

      setDownloadProgress(100);
      setDownloadPhase("done");
      setTimeout(() => {
        setDownloadPhase("idle");
        setDownloadProgress(0);
      }, 4000);
    } catch (err: any) {
      console.error("[Download ZIP Error]", err);
      setDownloadError(err.message || "Gagal mengunduh file ZIP.");
      setDownloadPhase("error");
      setTimeout(() => {
        setDownloadPhase("idle");
      }, 5000);
    }
  };

  return (
    <div className="space-y-6 pb-36">
      {/* Toast Notifikasi */}
      {statusToast && (
        <div className="fixed top-4 right-4 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all">
          {statusToast}
        </div>
      )}

      {/* Header Halaman Moments */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md">
              Pusat Komando Moments
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">Virtual Disposable Camera</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900">Pengaturan Kamera Tamu &amp; Galeri Kenangan</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Kelola filter analog seragam, jatah roll per tamu, jadwal acara, dan unduh foto kenangan candid.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`${sharemomentUrl}?test=true`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Tes Kamera</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsPrintQrModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span>Cetak Standing Banner &amp; Kartu QR</span>
          </button>
        </div>
      </div>

      {/* Switch Status Aktifkan Fitur Kamera */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-xs flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-stone-900 block">Status Fitur Kamera Tamu di Undangan:</span>
          <span className="text-[11px] text-stone-500">
            {isEnabled ? "Aktif — Tombol 'Bagikan Momen' tampil di undangan pernikahan dan kamera dapat digunakan." : "Nonaktif — Tamu tidak dapat mengakses kamera virtual."}
          </span>
        </div>
        <button
          type="button"
          onClick={() => updateSettingFast("showGuestMemories", !isEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
            isEnabled ? "bg-amber-800" : "bg-stone-300"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
      </div>

      {/* LIST GROUP CARD (MOREMENTS-STYLE) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden divide-y divide-stone-100">
        {/* 1. Berakhir */}
        <div className="p-4 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Berakhir (Masa Simpan Galeri)</span>
              <span className="block text-sm font-semibold text-stone-800 truncate">
                {effectiveExpiry
                  ? effectiveExpiry.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                  : `${baseRetentionDays} Hari Pasca Acara`}
              </span>
            </div>
          </div>
          {hasExtended ? (
            <span className="text-[11px] font-bold text-stone-700 bg-stone-100 border border-stone-300/80 px-2.5 py-1 rounded-full shrink-0">
              Masa Aktif Maksimal (+30 Hari Digunakan)
            </span>
          ) : daysRemaining !== null && daysRemaining > 7 ? (
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
              Aman ({daysRemaining} Hari Lagi · H-7)
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddonModalOpen(true)}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs"
            >
              Perpanjang Masa Aktif (+30 Hari)
            </button>
          )}
        </div>

        {/* 2. Filter Kamera */}
        <div className="p-4 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Filter Kamera Analog</span>
              <span className="block text-sm font-semibold text-stone-800 truncate">
                {activePreset.name} ({activePreset.subName})
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shrink-0">
            {activePreset.badge}
          </span>
        </div>

        {/* 3. Layar Pembuka Tamu */}
        <div className="p-4 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Layar Pembuka Tamu (/sharemoment)</span>
              <span className="block text-sm font-semibold text-stone-800 truncate">
                {activeOpeningName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpeningModalOpen(true)}
            className="px-3.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Sesuaikan Teks &amp; Foto</span>
          </button>
        </div>

        {/* 4. Roll limit per user tamu */}
        <div className="p-4 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Roll Limit per Tamu</span>
              <span className="block text-sm font-semibold text-stone-800 truncate">
                {memoriesQuota?.shotsQuota || 5} Foto / Tamu
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setRollModalInput(memoriesQuota?.shotsQuota || 5);
              setRollModalMsg(null);
              setIsRollModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Atur Roll</span>
          </button>
        </div>

        {/* 5. Quota Total Foto */}
        <div className="p-4 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Kapasitas Quota Total Foto</span>
              <span className="block text-sm font-semibold text-stone-800 truncate">
                {memoriesQuota ? `${memoriesQuota.usedPhotos} / ${memoriesQuota.maxTotalPhotos} Foto` : `${guestMemoriesList.length} Foto`}
                <span className="ml-2 text-xs font-normal text-stone-500">
                  (Tersisa {memoriesQuota?.remainingPhotos ?? 250} foto)
                </span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddonModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Kuota</span>
          </button>
        </div>
      </div>

      {/* Pratinjau Layar Pembuka Smartphone Tamu (Live Phone Mockup & 3 Layout Selector) */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Live Smartphone Preview
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">Layar Pembuka Tamu (/sharemoment)</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              Pratinjau &amp; Pilihan Gaya Layar Pembuka Tamu
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Pilih salah satu dari 3 desain layar pembuka di bawah ini. Tamu yang memindai QR Code di meja akan disambut dengan tampilan ini di smartphone mereka.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsOpeningModalOpen(true)}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Sesuaikan Teks &amp; Foto</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* KOLOM KIRI: Mobile Phone Mockup Langsung (Murni Tanpa Card Wrapper) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center py-4 select-none">
            {/* 1. MOCKUP SMARTPHONE IPHONE 16 PRO */}
            <div
              className="w-[268px] h-[536px] bg-[#0d0c0b] rounded-[42px] p-2.5 relative flex flex-col justify-between shadow-[0_25px_60px_-15px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.06),0_0_0_5px_#1c1917,0_0_0_6.5px_rgba(201,162,39,0.35)] shrink-0"
            >
              {/* Dynamic Island & Real Status Bar */}
              <div className={`absolute top-2.5 inset-x-5 flex items-center justify-between z-30 pointer-events-none text-[10px] font-semibold ${openingLayoutId === "cinematic_hero" ? "text-white" : "text-stone-800"}`}>
                <span className="font-sans pl-1">9:41</span>
                {/* Dynamic Island */}
                <div className="w-[74px] h-[19px] bg-black rounded-full flex items-center justify-end pr-2 shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-[#11131a] ring-1 ring-blue-900/40 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-blue-500/30" />
                  </div>
                </div>
                {/* Status Icons: Sinyal, Wifi, Baterai */}
                <div className="flex items-center gap-1.5 pr-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/></svg>
                  <div className={`w-4 h-2 border ${openingLayoutId === "cinematic_hero" ? "border-white" : "border-stone-800"} rounded-xs p-0.5 flex items-center`}>
                    <div className={`w-full h-full ${openingLayoutId === "cinematic_hero" ? "bg-white" : "bg-stone-800"} rounded-2xs`} />
                  </div>
                </div>
              </div>

              {/* Specular Glare Sheen Reflection */}
              <div className="pointer-events-none absolute inset-0 rounded-[38px] z-25 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12]" />

              {/* Layar Smartphone Pure Edge-to-Edge */}
              <div className="rounded-[34px] overflow-hidden w-full h-full relative text-left text-xs z-10 shadow-inner bg-[#faf8f5]">
                {/* ──────────────── LAYOUT 1: EDITORIAL SHOWCASE ──────────────── */}
                {openingLayoutId === "editorial_showcase" && (
                  <div className="absolute inset-0 bg-[#faf8f5] flex flex-col justify-between pt-9 pb-3 px-3.5">
                    {/* Foto Mempelai / Acara (4:5) */}
                    <div className="w-full aspect-[4/5] rounded-[22px] overflow-hidden shadow-sm border border-stone-200/60 relative shrink-0">
                      <img src={coverPhoto} alt={coupleTitle} className="w-full h-full object-cover object-center" />
                    </div>

                    {/* Tipografi Acara & Tanggal */}
                    <div className="text-center space-y-1 my-auto py-1">
                      <h4 className="text-sm font-serif font-bold text-[#23211f] leading-snug tracking-tight">
                        {coupleTitle}
                      </h4>
                      <div className="text-[9.5px] font-mono font-bold text-stone-600 tracking-[0.25em]">
                        {getRetroDateStamp()}
                      </div>
                    </div>

                    {/* Tombol Kapsul Espresso & Footer */}
                    <div className="space-y-2">
                      <div className="w-full py-2.5 bg-[#2b2724] text-white font-medium text-[11px] rounded-full text-center shadow-sm flex items-center justify-center gap-1.5">
                        <span>Mulai motret</span>
                        <span>→</span>
                      </div>
                      <div className="text-center font-serif font-bold text-[10px] tracking-widest text-stone-400">
                        {coupleTitle ? coupleTitle.toUpperCase() : "GUEST MOMENTS"}
                      </div>
                      <div className="w-20 h-1 bg-stone-300 rounded-full mx-auto mt-1" />
                    </div>
                  </div>
                )}

                {/* ──────────────── LAYOUT 2: CINEMATIC HERO (100% Fullscreen, Tanpa Garis Putih) ──────────────── */}
                {openingLayoutId === "cinematic_hero" && (
                  <div className="absolute inset-0 flex flex-col justify-between pt-9 pb-3 px-3.5 text-white overflow-hidden">
                    {/* Fullscreen Photo & Cinematic Vignette */}
                    <div className="absolute inset-0 z-0">
                      <img
                        src={coverPhoto}
                        alt={coupleTitle}
                        className="w-full h-full object-cover filter brightness-[0.70]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-stone-950/70" />
                    </div>

                    {/* Floating Info */}
                    <div className="relative z-10 my-auto text-center space-y-1 py-1">
                      <span className="text-[7.5px] font-mono tracking-[0.25em] uppercase text-amber-300 font-bold block">
                        CINEMATIC MOMENTS
                      </span>
                      <h4 className="text-base font-serif font-bold text-white drop-shadow-md">
                        {coupleTitle}
                      </h4>
                      <p className="text-[8px] font-mono tracking-widest text-stone-300">
                        {getRetroDateStamp()}
                      </p>
                    </div>

                    {/* Action Button & Safe Footer */}
                    <div className="relative z-10 space-y-1.5 pb-1">
                      <div className="w-full py-2 bg-white text-stone-950 font-bold text-[10.5px] rounded-full text-center shadow-xl flex items-center justify-center gap-1">
                        <span>Mulai Abadikan Momen</span>
                        <span>→</span>
                      </div>
                      <p className="text-[7.5px] text-stone-300 text-center leading-tight line-clamp-1">
                        {instructionText}
                      </p>
                      <div className="w-20 h-1 bg-white/40 rounded-full mx-auto mt-1" />
                    </div>
                  </div>
                )}

                {/* ──────────────── LAYOUT 3: POLAROID NOSTALGIA ──────────────── */}
                {openingLayoutId === "polaroid_nostalgia" && (
                  <div className="absolute inset-0 bg-[#ede8df] flex flex-col justify-between pt-9 pb-3 px-3.5 text-stone-900">
                    {/* Polaroid Frame Card */}
                    <div className="my-auto bg-white p-2 pb-2.5 rounded-xl shadow-xl border border-stone-300/80 -rotate-1 text-center space-y-1">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-stone-100 shadow-inner">
                        <img
                          src={coverPhoto}
                          alt={coupleTitle}
                          className="w-full h-full object-cover filter sepia-[0.15]"
                        />
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded font-mono text-[7px] font-bold text-amber-400">
                          {getRetroDateStamp()}
                        </div>
                      </div>
                      <h4 className="text-xs font-serif font-bold text-stone-900 truncate">
                        {coupleTitle}
                      </h4>
                      <p className="text-[6.5px] font-mono tracking-widest text-stone-500 uppercase">
                        DISPOSABLE CAM ARCHIVE
                      </p>
                    </div>

                    {/* Action Button & Safe Footer */}
                    <div className="space-y-1 pb-1">
                      <div className="w-full py-2 bg-stone-900 text-white font-bold text-[10px] rounded-full text-center shadow-md flex items-center justify-center gap-1">
                        <span>Buka Kamera Retro</span>
                        <span>→</span>
                      </div>
                      <p className="text-[7px] text-stone-500 text-center leading-tight line-clamp-1">
                        {instructionText}
                      </p>
                      <div className="w-20 h-1 bg-stone-400/40 rounded-full mx-auto mt-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <span className="text-xs font-medium text-stone-500 mt-4 block text-center">
              Pratinjau: <strong className="text-stone-800">{activeOpeningName}</strong>
            </span>
          </div>

          {/* KOLOM KANAN: 3 Layout Selector Cards */}
          <div className="lg:col-span-7 space-y-3.5">
            <span className="text-xs font-bold text-stone-800 block">
              Pilih Gaya Tampilan Layar Pembuka:
            </span>

            <div className="space-y-2.5">
              {OPENING_LAYOUTS.map((op) => {
                const isSelected = openingLayoutId === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => updateSettingFast("memoriesOpeningLayout", op.id)}
                    disabled={updatingSetting}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-start justify-between cursor-pointer ${
                      isSelected
                        ? "bg-amber-50/90 border-amber-700 ring-2 ring-amber-700 shadow-xs"
                        : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/60"
                    }`}
                  >
                    <div className="pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-stone-900">{op.name}</span>
                        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 uppercase">
                          {op.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        {op.desc}
                      </p>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                        isSelected
                          ? "border-amber-800 bg-amber-800 text-white"
                          : "border-stone-300 bg-white"
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <strong className="block font-bold text-stone-800">Ubah Foto Cover &amp; Teks Sapaan</strong>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Anda dapat mengganti foto utama pembuka atau mengubah kalimat panduan untuk tamu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpeningModalOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
              >
                Atur Teks &amp; Foto
              </button>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <strong className="block font-bold text-stone-800">Cetak Standing Banner &amp; Kartu QR</strong>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Unduh template siap cetak akrilik 300 DPI untuk diletakkan di meja tamu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintQrModalOpen(true)}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
              >
                Cetak QR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 5 Pilihan Filter Analog Acara */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Pilih Preset Filter Analog Acara:</h2>
            <p className="text-xs text-stone-500">Filter ini seragam diterapkan ke kamera virtual seluruh tamu undangan Anda.</p>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 self-start sm:self-auto">
            1-Click Live Update
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {FILTER_PRESETS_LIST.map((flt) => {
            const isSelected = activeFilterId === flt.id;
            return (
              <button
                key={flt.id}
                type="button"
                onClick={() => updateSettingFast("memoriesFilter", flt.id)}
                disabled={updatingSetting}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-amber-50/90 border-amber-700 ring-2 ring-amber-700 shadow-xs"
                    : "bg-white border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className={`h-16 w-full rounded-xl bg-gradient-to-tr ${flt.previewBg} mb-2.5 relative overflow-hidden flex items-end p-2 shadow-inner`}>
                  <span className="text-[8px] font-mono text-amber-300 font-bold bg-stone-950/70 px-1.5 py-0.5 rounded">
                    15 09 &apos;26
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-xs font-bold truncate ${isSelected ? "text-amber-950" : "text-stone-900"}`}>
                      {flt.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 leading-snug line-clamp-2">
                    {flt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stempel Tanggal LED & Foto Layar Pembuka */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs space-y-3">
          <div>
            <h3 className="text-xs font-bold text-stone-900">Stempel Tanggal Retro (LED Date Stamp)</h3>
            <p className="text-[11px] text-stone-500">Cetak cap tanggal retro menyala di sudut kanan bawah foto tamu.</p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-100">
            <select
              value={getFeatureSetting("memoriesDateFormat", "DD MM 'YY")}
              onChange={(e) => updateSettingFast("memoriesDateFormat", e.target.value)}
              disabled={!getFeatureSetting("memoriesDateStamp", true)}
              className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800 disabled:opacity-40"
            >
              <option value="DD MM 'YY">Format: 15 09 &apos;26</option>
              <option value="DD · MMM · YYYY">Format: 15 · SEP · 2026</option>
            </select>
            <button
              type="button"
              onClick={() => updateSettingFast("memoriesDateStamp", !getFeatureSetting("memoriesDateStamp", true))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                getFeatureSetting("memoriesDateStamp", true) ? "bg-amber-800" : "bg-stone-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                getFeatureSetting("memoriesDateStamp", true) ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs space-y-3">
          <div>
            <h3 className="text-xs font-bold text-stone-900">Delayed Reveal (Kamar Gelap Bersama)</h3>
            <p className="text-[11px] text-stone-500">Foto dicuci rahasia dan baru dirilis serentak saat seluruh acara selesai.</p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-600 font-medium">
              {getFeatureSetting("memoriesDelayedReveal", false) ? "Aktif — Hasil dirilis serentak" : "Nonaktif — Langsung tampil di feed"}
            </span>
            <button
              type="button"
              onClick={() => updateSettingFast("memoriesDelayedReveal", !getFeatureSetting("memoriesDelayedReveal", false))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                getFeatureSetting("memoriesDelayedReveal", false) ? "bg-amber-800" : "bg-stone-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                getFeatureSetting("memoriesDelayedReveal", false) ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── JADWAL WAKTU MULTI-SESI & ALOKASI KUOTA FOTO ── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Jadwal &amp; Kuota Sesi
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">Multi-Session Schedule</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900">Jadwal Sesi Kamera &amp; Alokasi Kuota Foto</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Atur sesi acara (misal: Akad &amp; Resepsi) serta alokasikan kuota foto per sesi agar tidak habis di sesi awal.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sessionSaveStatus === "saving" && (
              <span className="text-[11px] text-amber-700 flex items-center gap-1 font-medium bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/70">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Menyimpan...
              </span>
            )}
            {sessionSaveStatus === "saved" && (
              <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200/70">
                <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tersimpan otomatis
              </span>
            )}
            {/* Tombol Tarik Sesi dari Undangan (Selalu Tampil) */}
            <button
              type="button"
              onClick={handleAutoSyncSessions}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Tarik data nama, tanggal, dan jam sesi dari susunan acara di Studio Undangan (Seksi 5)"
            >
              <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Tarik Sesi dari Undangan</span>
            </button>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleAutoBalanceQuota}
                className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Bagi rata total kuota acara ke seluruh sesi yang ada"
              >
                <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Bagi Rata Kuota</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleAddSession}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <span>+ Sesi Baru</span>
            </button>
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((sess, idx) => (
              <div
                key={sess.id || idx}
                className="p-3.5 bg-stone-50/60 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={sess.name || ""}
                      onChange={(e) => handleUpdateSession(idx, "name", e.target.value)}
                      onBlur={handleBlurSession}
                      placeholder="Nama Sesi (misal: Akad Nikah)"
                      className="p-1.5 px-2.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40 w-full sm:max-w-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSession(idx)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Hapus sesi ini"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Tanggal:</label>
                    <input
                      type="date"
                      value={sess.date || ""}
                      onChange={(e) => handleUpdateSession(idx, "date", e.target.value)}
                      onBlur={handleBlurSession}
                      className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Jam Buka:</label>
                    <input
                      type="time"
                      value={sess.startTime || "08:00"}
                      onChange={(e) => handleUpdateSession(idx, "startTime", e.target.value)}
                      onBlur={handleBlurSession}
                      className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Jam Tutup:</label>
                    <input
                      type="time"
                      value={sess.endTime || "22:00"}
                      onChange={(e) => handleUpdateSession(idx, "endTime", e.target.value)}
                      onBlur={handleBlurSession}
                      className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-bold text-stone-500">Alokasi Kuota Foto:</label>
                      {(() => {
                        const otherAllocated = sessions.reduce((sum, s, i) => i === idx ? sum : sum + (Number(s.allocatedQuota) || 0), 0);
                        const maxForThis = Math.max(0, totalEventQuota - otherAllocated);
                        if (maxForThis > (sess.allocatedQuota || 0)) {
                          return (
                            <button
                              type="button"
                              onClick={() => handleUpdateSession(idx, "allocatedQuota", maxForThis)}
                              className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                              title={`Isi otomatis dengan sisa kuota yang tersedia (${maxForThis} foto)`}
                            >
                              Pakai Sisa ({maxForThis})
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={totalEventQuota}
                        value={sess.allocatedQuota || 0}
                        onChange={(e) => handleUpdateSession(idx, "allocatedQuota", e.target.value)}
                        onBlur={handleBlurSession}
                        className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-700/40"
                      />
                      <span className="text-[10px] text-stone-400 font-medium shrink-0">Foto</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="p-3 bg-stone-100/80 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-stone-700">
                Distribusi Kuota Acara: <strong>{totalAllocated}</strong> / {totalEventQuota} Foto
              </span>
              {totalAllocated === totalEventQuota ? (
                <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Kuota Pas Terbagi
                </span>
              ) : totalAllocated > totalEventQuota ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-rose-600 font-bold text-[11px]">
                    Alokasi melebihi total kuota (+{totalAllocated - totalEventQuota} foto)
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoBalanceQuota}
                    className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300/80 rounded font-bold text-[10px] transition cursor-pointer"
                  >
                    Perbaiki &amp; Bagi Rata
                  </button>
                </div>
              ) : (
                <span className="text-amber-700 font-medium text-[11px]">
                  Sisa belum teralokasi: {totalEventQuota - totalAllocated} foto
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center border border-dashed border-stone-200 rounded-xl">
            <p className="text-xs font-semibold text-stone-600">Belum ada sesi kamera aktif yang diatur</p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Klik &quot;Auto-Sync Acara&quot; untuk menyelaraskan dengan jadwal pernikahan atau &quot;+ Sesi Baru&quot; untuk menambah manual.
            </p>
          </div>
        )}
      </div>

      {/* Real-time Submissions Gallery & Moderasi Foto */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Feed Foto Candid Terkumpul ({guestMemoriesList.length} Foto)</h2>
            <p className="text-xs text-stone-500">Pantau foto candid yang diunggah para tamu, hapus foto yang tidak layak.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Tombol Unduh ZIP Dinamis Terikat Jadwal */}
            <button
              type="button"
              onClick={() => {
                if (!isReadyForDownload) return;
                handleStartDownloadZip();
              }}
              disabled={!isReadyForDownload || downloadPhase === "fetching" || downloadPhase === "downloading" || downloadPhase === "zipping"}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                guestMemoriesList.length === 0
                  ? "bg-stone-100 text-stone-400 border border-stone-200/70 cursor-not-allowed"
                  : !isReadyForDownload
                  ? "bg-amber-50/80 text-amber-900/70 border border-amber-200/80 cursor-not-allowed"
                  : downloadPhase === "done"
                  ? "bg-emerald-600 text-white shadow-2xs cursor-pointer"
                  : downloadPhase === "error"
                  ? "bg-rose-600 text-white shadow-2xs cursor-pointer"
                  : downloadPhase !== "idle"
                  ? "bg-stone-800 text-white cursor-wait"
                  : "bg-stone-900 hover:bg-stone-800 text-white shadow-2xs cursor-pointer"
              }`}
              title={
                guestMemoriesList.length === 0
                  ? "Belum ada foto candid tamu untuk diunduh."
                  : activeSchedule.isSessionActive && activeSchedule.currentSession
                  ? `Sesi "${activeSchedule.currentSession.name}" sedang berlangsung hingga pkl ${activeSchedule.currentSession.endTime}. Unduh ZIP aktif otomatis setelah sesi selesai.`
                  : activeSchedule.nextSession
                  ? `Masih ada sesi "${activeSchedule.nextSession.name}" yang belum selesai. Unduh ZIP aktif setelah seluruh rangkaian acara berakhir.`
                  : !isScheduleConcluded && !isEventMarkedFinished && !isManuallyClosed
                  ? "Unduh ZIP otomatis aktif setelah jadwal seluruh sesi acara berakhir."
                  : `Jadwal acara telah selesai. Klik untuk mengunduh seluruh ${guestMemoriesList.length} foto candid (.ZIP).`
              }
            >
              {downloadPhase === "fetching" || downloadPhase === "downloading" || downloadPhase === "zipping" ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>
                    {downloadPhase === "fetching" && "Menyiapkan..."}
                    {downloadPhase === "downloading" && `Mengunduh (${downloadProgress}%)`}
                    {downloadPhase === "zipping" && "Mengompresi..."}
                  </span>
                </>
              ) : downloadPhase === "done" ? (
                <>
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>ZIP Terunduh</span>
                </>
              ) : downloadPhase === "error" ? (
                <span>Gagal (Coba Lagi)</span>
              ) : guestMemoriesList.length === 0 ? (
                <>
                  <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Unduh ZIP (0 Foto)</span>
                </>
              ) : !isReadyForDownload ? (
                <>
                  <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Unduh ZIP ({activeSchedule.isSessionActive ? "Sesi Berjalan" : "Terkunci · Acara Berlangsung"})</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Unduh ZIP ({guestMemoriesList.length} Foto)</span>
                </>
              )}
            </button>

            {/* Tombol Segarkan */}
            <button
              type="button"
              onClick={() => fetchGuestMemories(invitation.id)}
              disabled={loadingMemories}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className={`w-3.5 h-3.5 ${loadingMemories ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {guestMemoriesList.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-stone-200 rounded-2xl">
            <svg className="w-10 h-10 text-stone-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs font-semibold text-stone-600">Belum ada foto yang diunggah tamu</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Foto yang dijepret tamu di hari-H akan otomatis muncul di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {guestMemoriesList.map((photo) => (
              <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-square shadow-2xs">
                <img
                  src={photo.mediaUrl}
                  alt={photo.senderName || "Foto Tamu"}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="p-1 bg-red-600/90 text-white rounded-md hover:bg-red-700 transition cursor-pointer"
                      title="Hapus foto ini"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-white">
                    <span className="block text-[11px] font-bold truncate">{photo.senderName || "Tamu Undangan"}</span>
                    <span className="block text-[9px] text-stone-300 font-mono">
                      {photo.createdAt ? new Date(photo.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {/* 1. Modal Studio Desain Kartu Cetak QR */}
      {invitation && (
        <PrintableQRCardModal
          isOpen={isPrintQrModalOpen}
          onClose={() => setIsPrintQrModalOpen(false)}
          invitation={invitation}
          shareMomentUrl={sharemomentUrl}
        />
      )}

      {/* 2. Modal Pengaturan Layar Pembuka Tamu */}
      {invitation && (
        <GuestOpeningSetupModal
          isOpen={isOpeningModalOpen}
          onClose={() => setIsOpeningModalOpen(false)}
          invitation={invitation}
          shareMomentUrl={sharemomentUrl}
          onInvitationUpdated={async (updatedInv) => {
            if (updatedInv) {
              setInvitation(updatedInv);
            }
            await fetchGuestMemories(invitation.id);
            setStatusToast("Layar pembuka tamu berhasil diperbarui.");
            setTimeout(() => setStatusToast(null), 2500);
          }}
        />
      )}

      {/* 3. Modal Atur Jatah Roll per Tamu */}
      {isRollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Atur Roll Limit per User Tamu</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">Jatah jepretan foto untuk setiap perangkat tamu</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRollModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {rollModalMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  rollModalMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {rollModalMsg.text}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-800">
                  Jumlah Foto per Tamu (Roll Limit):
                </label>
                <div className="flex items-center gap-2">
                  {[3, 5, 8, 10, 15].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setRollModalInput(count)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        rollModalInput === count
                          ? "bg-amber-900 text-white border-amber-900 shadow-xs"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRollModalOpen(false)}
                  disabled={isSavingRoll}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveRollQuota}
                  disabled={isSavingRoll}
                  className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {isSavingRoll ? "Menyimpan..." : "Simpan Roll Limit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Unified Addon Modal (Tambah Kuota Foto / Masa Simpan) */}
      {invitation && (
        <UnifiedAddonModal
          isOpen={isAddonModalOpen}
          onClose={() => setIsAddonModalOpen(false)}
          invitationId={invitation.id}
          currentPlan={planType}
          currentQuota={memoriesQuota?.maxTotalPhotos || (planType === "TIER_3" ? 1000 : 250)}
          galleryExpiresAt={effectiveExpiry ? effectiveExpiry.toISOString() : null}
          pricingSettings={platformSettings}
          hasExtended={hasExtended}
          daysRemaining={daysRemaining}
        />
      )}

      {/* 5. Modal Panduan Sinkronisasi Susunan Acara */}
      {isSyncHelpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Rangkaian Acara Belum Diisi</h3>
                  <p className="text-[11px] text-stone-500">Studio Undangan (Seksi 5)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncHelpModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-stone-600 leading-relaxed">
              <p>
                Data susunan acara di <strong>Studio Undangan (Seksi 5: Rangkaian Acara)</strong> saat ini masih kosong.
              </p>
              <p className="text-[11px] text-stone-500">
                Silakan isi agenda acara (seperti Akad Nikah, Resepsi, Mappacci, dll.) di Studio terlebih dahulu agar sesi kamera dapat ditarik otomatis, atau Anda tetap bisa menambahkan sesi kamera kustom langsung dengan tombol <strong>&quot;+ Sesi Baru&quot;</strong>.
              </p>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSyncHelpModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Tutup
                </button>
                {invitation?.id && (
                  <Link
                    href={`/dashboard/invitation/${invitation.id}`}
                    className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Buka Studio Undangan</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
