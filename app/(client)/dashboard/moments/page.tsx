"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { resolveEffectiveInvitationUrl, getMemoriesActiveSchedule } from "@/lib/domainUtils";
import { computeLifecycleDates, getPrimaryEventDateString, lifecycleSettingsFromPublic } from "@/lib/lifecycleDates";
import UnifiedAddonModal from "@/components/client/UnifiedAddonModal";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";
import { useFeedback } from "@/components/ui/Feedback";
import { useClientInvitation } from "@/components/client/ClientInvitationContext";
import { FILTER_PRESETS_LIST, OPENING_LAYOUTS } from "@/components/client/moments/presets";
import { MomentsStudioPanels } from "@/components/client/moments/MomentsStudioPanels";
import { MomentsModals } from "@/components/client/moments/MomentsModals";

export default function MomentsSetupPage() {
  const feedback = useFeedback();
  const router = useRouter();
  const {
    invitations,
    activeInvitation,
    activeInvitationId,
    loading: ctxLoading,
  } = useClientInvitation();

  const [invitation, setInvitation] = useState<any>(null);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Memories State
  const [guestMemoriesList, setGuestMemoriesList] = useState<any[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [memoriesQuota, setMemoriesQuota] = useState<any>(null);

  // Download ZIP State
  const [downloadPhase, setDownloadPhase] = useState<"idle" | "fetching" | "downloading" | "zipping" | "done" | "error">("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
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
        if (data.quota) setMemoriesQuota(data.quota);
      }
    } catch (e) {
      console.error("Gagal mengambil data kenangan tamu:", e);
    } finally {
      setLoadingMemories(false);
    }
  }, [invitation?.id]);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => setPlatformSettings(data))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (ctxLoading) return;
    if (invitations.length === 0 || !activeInvitation) {
      router.replace("/dashboard/setup");
      return;
    }

    setLoading(true);
    setInvitation(activeInvitation);
    setSessions(
      Array.isArray(activeInvitation.featureSettings?.memoriesSessions)
        ? activeInvitation.featureSettings.memoriesSessions
        : [],
    );

    void fetchGuestMemories(activeInvitation.id).finally(() => setLoading(false));
  }, [ctxLoading, invitations.length, activeInvitationId, activeInvitation, router, fetchGuestMemories]);

  // Helper Feature Settings
  const getFeatureSetting = (key: string, defaultVal: any) => invitation?.featureSettings?.[key] ?? defaultVal;

  const updateSettingFast = async (key: string, value: any) => {
    if (!invitation?.id) return;
    setUpdatingSetting(true);
    const previousFeatureSettings = invitation.featureSettings;
    // Optimistic update: sinkronkan state lokal seketika (0 ms) sebelum respons server tiba
    setInvitation((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        featureSettings: { ...(prev.featureSettings ?? {}), [key]: value },
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
        featureSettings: data.featureSettings,
      }));
      setStatusToast("Pengaturan berhasil disimpan.");
      setTimeout(() => setStatusToast(null), 2500);
    } catch (err: any) {
      // Server menolak: tampilan kembali ke nilai yang benar-benar tersimpan.
      setInvitation((prev: any) => (prev ? { ...prev, featureSettings: previousFeatureSettings } : prev));
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
      setInvitation((prev: any) => prev && ({
        ...prev,
        featureSettings: { ...(prev.featureSettings ?? {}), memoriesShotsQuota: rollModalInput },
      }));
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

  const [isTogglingGalleryMode, setIsTogglingGalleryMode] = useState(false);
  const handleToggleGalleryMode = async () => {
    if (!invitation?.id || isTogglingGalleryMode) return;
    const currentStatus = invitation.status;
    const targetMode = currentStatus === "PUBLISHED" ? "EVENT_FINISHED" : "PUBLISHED";
    setIsTogglingGalleryMode(true);
    try {
      const res = await fetch(`/api/client/invitations/${invitation.id}/gallery-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetMode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengalihkan mode tampilan");
      }
      setInvitation((prev: any) => ({
        ...prev,
        status: data.status,
      }));
      setStatusToast(data.message || "Mode berhasil dialihkan.");
      setTimeout(() => setStatusToast(null), 3500);
    } catch (err: any) {
      setStatusToast(`Gagal: ${err.message}`);
      setTimeout(() => setStatusToast(null), 3500);
    } finally {
      setIsTogglingGalleryMode(false);
    }
  };

  const handleDeletePhoto = async (memoryId: string) => {
    if (!invitation?.id) return;
    const confirmed = await feedback.confirm({
      title: "Hapus foto",
      message: "Hapus foto candid ini dari galeri kenangan?",
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/client/invitations/${invitation.id}/memories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId }),
      });
      if (res.ok) {
        setGuestMemoriesList((prev) => prev.filter((m) => m.id !== memoryId));
        await fetchGuestMemories(invitation.id);
      } else {
        const data = await res.json().catch(() => ({}));
        feedback.notify(data.error || "Gagal menghapus momen.", "error");
      }
    } catch {
      feedback.notify("Koneksi terputus. Momen belum terhapus.", "error");
    }
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

  const isFreeDraft = Boolean(invitation?.isFreeDraft || !invitation?.order?.planType);
  const planType = isFreeDraft ? "" : (invitation?.order?.planType || invitation?.planType || "TIER_1").toUpperCase();
  const pkgConfig = planType ? platformSettings?.packages?.find((p: any) => p.id === planType) : null;
  const hasAccess = isFreeDraft
    ? false
    : pkgConfig
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
        <h2 className="text-lg font-bold text-stone-900">
          {isFreeDraft ? "Fitur Kamera Tamu Tersedia di Paket Berbayar" : "Fitur Kamera Tamu Belum Aktif"}
        </h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          {isFreeDraft
            ? "Fitur Virtual Disposable Camera & Live Moments dapat digunakan setelah Anda memilih paket yang mendukung fitur Kamera Tamu."
            : "Fitur Virtual Disposable Camera & Live Moments belum aktif pada paket undangan Anda. Tingkatkan paket Anda untuk mengabadikan momen candid tamu acara."}
        </p>
        <Link
          href={isFreeDraft ? "/packages" : "/dashboard?upgrade=true"}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition"
        >
          <span>{isFreeDraft ? "Pilih & Aktifkan Paket" : "Upgrade Paket"}</span>
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
  const lifecycleSettings = lifecycleSettingsFromPublic(platformSettings);
  const baseRetentionDays = lifecycleSettings.galleryRetentionDays;
  const extraGalleryDays: number = invitation?.extraGalleryDays ?? 0;

  const eventDayString = getPrimaryEventDateString(invitation?.eventData);
  const effectiveExpiry =
    computeLifecycleDates({ eventData: invitation?.eventData, galleryExpiresAt: invitation?.galleryExpiresAt }, lifecycleSettings)
      ?.galleryExpiresAt ?? null;

  const daysRemaining = effectiveExpiry
    ? Math.max(0, Math.ceil((effectiveExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const hasExtended = extraGalleryDays >= 30;

  const openingLayoutId = getFeatureSetting("memoriesOpeningLayout", "editorial_showcase");
  const activeOpeningObj = OPENING_LAYOUTS.find((l) => l.id === openingLayoutId) || OPENING_LAYOUTS[0];
  const activeOpeningName = activeOpeningObj.name;

  const coupleTitle = invitation ? resolveInvitationDisplayName(invitation) : "Undangan";
  const coverPhoto: string = getFeatureSetting("memoriesCoverPhoto", "") || invitation?.media?.find((m: any) => m.mediaSlot === "LANDING_COVER")?.localPath || "";
  // Sebelum terbit belum ada alamat publik; uji kamera memakai rute slug yang tetap melayani undangan DRAFT.
  const testCameraUrl = sharemomentUrl || (invitation?.invitationSlug ? `/${invitation.invitationSlug}/sharemoment` : "");
  const topupPhotos: number = platformSettings?.addonMemoriesTopupPhotos ?? 0;
  const isTopupEnabled = platformSettings?.addonMemoriesTopupEnabled !== false;
  const instructionText = getFeatureSetting("memoriesCardInstruction", "Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda.");

  const getRetroDateStamp = () => {
    if (eventDayString) {
      const [year, month, day] = eventDayString.split("-");
      return `${day}  ${month}  '${year.slice(-2)}`;
    }
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}  ${String(now.getMonth() + 1).padStart(2, "0")}  '${String(now.getFullYear()).slice(-2)}`;
  };

  const events: any[] = Array.isArray(invitation?.eventData) ? invitation.eventData : [];

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
          featureSettings: data.featureSettings,
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
        timezone: ev.timezone || undefined,
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
      ...(invitation?.featureSettings ?? {}),
      memoriesSessions: sessions,
    },
    invitation?.eventData
  );

  // Status penyelesaian acara dinamis
  const isScheduleConcluded = activeSchedule.isAllFinished;
  const isEventMarkedFinished = invitation?.status === "EVENT_FINISHED";
  const isManuallyClosed = !isEnabled || Boolean(invitation?.memoriesUploadLocked);
  const isReadyForDownload = (isScheduleConcluded || isEventMarkedFinished || isManuallyClosed) && guestMemoriesList.length > 0;
  const zipDownloadHint =
    guestMemoriesList.length === 0
      ? "Belum ada foto candid tamu untuk diunduh."
      : activeSchedule.isSessionActive && activeSchedule.currentSession
      ? `Sesi "${activeSchedule.currentSession.name}" sedang berlangsung hingga pkl ${activeSchedule.currentSession.endTime}. Unduh ZIP aktif otomatis setelah sesi selesai.`
      : activeSchedule.nextSession
      ? `Masih ada sesi "${activeSchedule.nextSession.name}" yang belum selesai. Unduh ZIP aktif setelah seluruh rangkaian acara berakhir.`
      : !isScheduleConcluded && !isEventMarkedFinished && !isManuallyClosed
      ? "Unduh ZIP otomatis aktif setelah jadwal seluruh sesi acara berakhir."
      : `Jadwal acara telah selesai. Klik untuk mengunduh seluruh ${guestMemoriesList.length} foto candid (.ZIP).`;

  // Handler Download ZIP Client-Side via JSZip
  const handleStartDownloadZip = async () => {
    if (downloadPhase === "fetching" || downloadPhase === "downloading" || downloadPhase === "zipping") return;
    if (guestMemoriesList.length === 0 || !invitation?.id) return;

    setDownloadPhase("fetching");
    setDownloadProgress(0);

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

      // Setelah ZIP terunduh, unggahan momen dikunci; ZIP yang kehilangan foto tidak boleh dianggap selesai.
      let failedFiles = 0;
      for (let i = 0; i < files.length; i++) {
        const { url, filename } = files[i];
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          zip.file(filename, await resp.blob());
        } catch {
          failedFiles++;
        }
        setDownloadProgress(Math.round(((i + 1) / files.length) * 85));
      }
      if (failedFiles > 0) {
        throw new Error(`${failedFiles} dari ${files.length} foto gagal diambil. Periksa koneksi internet lalu unduh ulang; unggahan tamu belum dikunci.`);
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
      feedback.notify(err.message || "Gagal mengunduh file ZIP.", "error");
      setDownloadPhase("error");
      setTimeout(() => {
        setDownloadPhase("idle");
      }, 5000);
    }
  };

  const momentsCtx = {
    activeFilterId, activeOpeningName, activeSchedule, coupleTitle, coverPhoto, downloadPhase, downloadProgress, events, fetchGuestMemories, getFeatureSetting, getRetroDateStamp, guestMemoriesList, handleAddSession, handleAutoBalanceQuota, handleAutoSyncSessions, handleBlurSession, handleDeletePhoto, handleRemoveSession, handleStartDownloadZip, handleUpdateSession, instructionText, invitation, isReadyForDownload, loadingMemories, openingLayoutId, sessionSaveStatus, sessions, setIsOpeningModalOpen, setIsPrintQrModalOpen, totalAllocated, totalEventQuota, updateSettingFast, updatingSetting, zipDownloadHint, daysRemaining, handleSaveRollQuota, hasExtended, isAddonModalOpen, isOpeningModalOpen, isPrintQrModalOpen, isRollModalOpen, isSavingRoll, isSyncHelpModalOpen, memoriesQuota, planType, platformSettings, rollModalInput, rollModalMsg, setInvitation, setIsAddonModalOpen, setIsRollModalOpen, setIsSyncHelpModalOpen, setRollModalInput, setStatusToast, sharemomentUrl, testCameraUrl,
  };

  if (invitation?.status === "ARCHIVED" || invitation?.status === "TAKEN_DOWN") {
    return (
      <div className="max-w-3xl mx-auto py-8 sm:py-12 font-sans">
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-10 text-center space-y-5 shadow-xs">
          <div className="w-14 h-14 bg-stone-100 text-stone-700 rounded-2xl flex items-center justify-center mx-auto border border-stone-200">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              <span>{invitation.status === "ARCHIVED" ? "Galeri Momen Diarsipkan" : "Undangan Dinonaktifkan"}</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
              {invitation.status === "ARCHIVED"
                ? "Periode Galeri Foto Tamu Telah Berakhir"
                : "Galeri Momen Tidak Tersedia"}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {invitation.status === "ARCHIVED"
                ? "Sesuai kebijakan retensi privasi, kamera tamu dan penyimpanan foto candid untuk undangan ini telah ditutup secara permanen. Rekap doa & daftar tamu tetap tersedia di Beranda Arsip."
                : "Undangan ini sedang dinonaktifkan oleh Administrator sehingga pengaturan galeri tidak dapat diubah."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition"
            >
              Kembali ke Beranda Arsip
            </Link>
            <Link
              href="/packages?new=1"
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition"
            >
              Buat Undangan Baru
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 pb-36">
      {/* Toast Notifikasi */}
      {statusToast && (
        <div className="fixed top-4 right-4 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all">
          {statusToast}
        </div>
      )}

      {/* Header Halaman Moments */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs">
        <div>
          <div className="hidden sm:flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md">
              Pusat Komando Moments
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">Virtual Disposable Camera</span>
          </div>
          <h1 className="text-base sm:text-xl font-bold text-stone-900">
            <span className="sm:hidden">Kamera Tamu &amp; Galeri</span>
            <span className="hidden sm:inline">Pengaturan Kamera Tamu &amp; Galeri Kenangan</span>
          </h1>
          <p className="hidden sm:block text-xs text-stone-500 mt-0.5">
            Kelola filter analog seragam, jatah roll per tamu, jadwal acara, dan unduh foto kenangan candid.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 sm:flex-wrap">
          <Link
            href={`${testCameraUrl}?test=true`}
            target="_blank"
            className="min-h-11 sm:min-h-0 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
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
            className="min-h-11 sm:min-h-0 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="sm:hidden">Cetak Kartu QR</span>
            <span className="hidden sm:inline">Cetak Standing Banner &amp; Kartu QR</span>
          </button>
        </div>
      </div>

      {/* ── MODE TAMPILAN URL UTAMA (UNDANGAN VS GALERI KENANGAN) ── */}
      {hasAccess && (invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED") && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                Pintu Utama Domain &amp; Slug
              </span>
              <span className="hidden sm:inline text-stone-300">•</span>
              {invitation.status === "EVENT_FINISHED" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                  Mode Galeri Kenangan Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Mode Web Undangan Aktif
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900">
              Pengalihan Tampilan Alamat Utama
            </h2>
            <p className="hidden sm:block text-xs text-stone-500 max-w-xl leading-relaxed">
              {invitation.status === "EVENT_FINISHED"
                ? "Acara telah ditandai selesai. Setiap tamu yang membuka link utama undangan otomatis diarahkan ke Galeri Foto Kenangan Tamu (/memories)."
                : "Acara sedang berjalan. Link utama saat ini menampilkan Web Undangan resmi. Jika resepsi telah usai, Anda dapat beralih ke Mode Galeri secara instan."}
            </p>
          </div>

          <div className="sm:shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleGalleryMode}
              disabled={isTogglingGalleryMode}
              className={`w-full sm:w-auto min-h-11 sm:min-h-0 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50 ${
                invitation.status === "EVENT_FINISHED"
                  ? "bg-white hover:bg-stone-50 text-stone-800 border border-stone-300"
                  : "bg-amber-800 hover:bg-amber-900 text-white"
              }`}
            >
              {isTogglingGalleryMode ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : invitation.status === "EVENT_FINISHED" ? (
                <>
                  <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span>Kembalikan ke Mode Undangan</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Beralih ke Mode Galeri Pasca-Acara</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Alert Banner: Roll Penuh (100%+) atau Peringatan Kuota (80%+) */}
      {memoriesQuota && memoriesQuota.maxTotalPhotos > 0 && (memoriesQuota.usedPhotos / memoriesQuota.maxTotalPhotos) >= 0.8 && (() => {
        const percent = Math.round((memoriesQuota.usedPhotos / memoriesQuota.maxTotalPhotos) * 100);
        const isFull = percent >= 100;

        return (
          <div className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs border ${
            isFull
              ? "bg-rose-50 border-rose-300 text-rose-950"
              : "bg-amber-50 border-amber-300 text-amber-950"
          }`}>
            <div className="flex items-start sm:items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                isFull
                  ? "bg-rose-100 border-rose-300 text-rose-800"
                  : "bg-amber-100 border-amber-300 text-amber-800"
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isFull ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </div>
              <div>
                <div className={`text-xs font-bold uppercase tracking-wider ${isFull ? "text-rose-900" : "text-amber-900"}`}>
                  {isFull ? "Kapasitas Roll Kamera Penuh (100%)" : `Pemberitahuan Kuota Roll: ${percent}% Terisi`}
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed ${isFull ? "text-rose-800" : "text-amber-800"}`}>
                  {isFull ? (
                    <>Seluruh kapasitas roll kamera kenangan (<strong>{memoriesQuota.usedPhotos} dari {memoriesQuota.maxTotalPhotos} foto</strong>) telah terisi penuh. Tamu saat ini tidak dapat mengunggah foto baru. Perluas roll kapan saja agar tamu dapat kembali mengabadikan momen.</>
                  ) : (
                    <>Tamu Anda sangat antusias! Saat ini telah terabadikan <strong>{memoriesQuota.usedPhotos} dari {memoriesQuota.maxTotalPhotos} foto</strong> (tersisa {memoriesQuota.remainingPhotos} foto). Anda dapat menambah roll kapan saja agar tamu tetap leluasa mengabadikan momen.</>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddonModalOpen(true)}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 ${
                isFull
                  ? "bg-rose-700 hover:bg-rose-800"
                  : "bg-amber-800 hover:bg-amber-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{!isTopupEnabled ? "Lihat Layanan Tambahan" : isFull ? `Buka Kunci Roll (+${topupPhotos} Foto)` : `Top-Up +${topupPhotos} Foto`}</span>
            </button>
          </div>
        );
      })()}

      {/* Switch Status Aktifkan Fitur Kamera */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-xs flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-stone-900 block">
            <span className="sm:hidden">Kamera tamu {isEnabled ? "aktif" : "nonaktif"}</span>
            <span className="hidden sm:inline">Status Fitur Kamera Tamu di Undangan:</span>
          </span>
          <span className="hidden sm:inline text-[11px] text-stone-500">
            {isEnabled ? "Aktif — Tombol 'Bagikan Momen' tampil di undangan dan kamera dapat digunakan." : "Nonaktif — Tamu tidak dapat mengakses kamera virtual."}
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
        <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-full bg-stone-100 text-stone-700 items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Berakhir<span className="hidden sm:inline"> (Masa Simpan Galeri)</span></span>
              <span className="block text-sm font-semibold text-stone-800">
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
              {daysRemaining} hari lagi
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
        <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-full bg-stone-100 text-stone-700 items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Filter Kamera Analog</span>
              <span className="block text-sm font-semibold text-stone-800">
                {activePreset.name} ({activePreset.subName})
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shrink-0">
            {activePreset.badge}
          </span>
        </div>

        {/* 3. Layar Pembuka Tamu */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-full bg-stone-100 text-stone-700 items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Layar Pembuka Tamu<span className="hidden sm:inline"> (/sharemoment)</span></span>
              <span className="block text-sm font-semibold text-stone-800">
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
            <span className="sm:hidden">Ubah</span>
            <span className="hidden sm:inline">Sesuaikan Teks &amp; Foto</span>
          </button>
        </div>

        {/* 4. Roll limit per user tamu */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-full bg-stone-100 text-stone-700 items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Roll Limit per Tamu</span>
              <span className="block text-sm font-semibold text-stone-800">
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
        <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-full bg-stone-100 text-stone-700 items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-stone-500">Kuota<span className="hidden sm:inline"> Total Foto</span></span>
              <span className="block text-sm font-semibold text-stone-800">
                {memoriesQuota ? `${memoriesQuota.usedPhotos} / ${memoriesQuota.maxTotalPhotos} Foto` : `${guestMemoriesList.length} Foto`}
                {memoriesQuota && (
                  <span className="hidden sm:inline ml-2 text-xs font-normal text-stone-500">
                    (Tersisa {memoriesQuota.remainingPhotos} foto)
                  </span>
                )}
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

      <MomentsStudioPanels ctx={momentsCtx} />
      <MomentsModals ctx={momentsCtx} />
    </div>
  );
}
