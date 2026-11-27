"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { getPlanDisplayName } from "@/lib/planUtils";
import { isWeddingField, participantNames, safeParseParticipants, weddingFieldValue, withWeddingField } from "@/lib/participantUtils";
import { FEATURE_SETTING_LIVE_FIELDS, isLiveEditField } from "@/lib/liveEditFields";
import {
  eventNoun,
  resolveInvitationDisplayName,
  sanitizeSubEvent,
} from "@/lib/invitationUtils";
import { useFeedback } from "@/components/ui/Feedback";
import { parseBgPhotoTone, parseBgScrim } from "@/lib/bgPhotoTone";
import { BUILDER_EVENT_LABELS, EDITABLE_TEXT_KEYS, type BuilderEventType } from "@/lib/themeBuilder/spec";
import type { FreeSectionText } from "@/lib/themeBuilder/texts";
import { DECLARABLE_MEDIA_SLOTS, isSlotUsed, parseThemeMediaSlots } from "@/lib/themeMediaSlots";
import { ThemeSlotsContext } from "@/components/client/studio/StudioFormControls";
import { themeDefaultOf } from "@/components/client/studio/studioPresets";
import { FreeDraftBanner } from "@/components/client/FreeDraftBanner";
import { StudioEditorProvider, type StudioEditorContextValue } from "@/components/client/studio/StudioEditorContext";
import { StudioLiveWorkspace } from "@/components/client/studio/StudioLiveWorkspace";
import { StudioModals } from "@/components/client/studio/StudioModals";
import { StudioThemeAndCoverSections } from "@/components/client/studio/sections/StudioThemeAndCoverSections";
import { StudioProfileAndQuoteSections } from "@/components/client/studio/sections/StudioProfileAndQuoteSections";
import { StudioEventsAndCheckinSections } from "@/components/client/studio/sections/StudioEventsAndCheckinSections";
import { StudioStoryGalleryGiftSections } from "@/components/client/studio/sections/StudioStoryGalleryGiftSections";
import { StudioExtrasSections } from "@/components/client/studio/sections/StudioExtrasSections";
import { StudioTextAndVendorSections } from "@/components/client/studio/sections/StudioTextAndVendorSections";

export default function EditInvitation() {
  const feedback = useFeedback();
  const params = useParams();
  const router = useRouter();
  const invitationId = params.id as string;

  const [invitation, setInvitation] = useState<any>(null);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [bankList, setBankList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSec, setSavingSec] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [savedSnapshot, setSavedSnapshot] = useState<any>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState<string>("");
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [themesList, setThemesList] = useState<any[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [musicPresets, setMusicPresets] = useState<any[]>([]);
  const [musicLoading, setMusicLoading] = useState(true);

  // Upgrade Paket State
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<"TIER_2" | "TIER_3" | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  // Ganti Mode Acara (selama status DRAFT)
  const [eventTypeModalOpen, setEventTypeModalOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<string>("");
  const [selectedFreeSubEvent, setSelectedFreeSubEvent] = useState<string>("");
  const [freeSubCustomMode, setFreeSubCustomMode] = useState<boolean>(false);
  const [changingEventType, setChangingEventType] = useState(false);
  const [eventTypeError, setEventTypeError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [studioNotification, setStudioNotification] = useState<{ type: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    if (!studioNotification) return;
    const timer = setTimeout(() => {
      setStudioNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [studioNotification]);

  const PLAN_HIERARCHY: Record<string, number> = { TIER_1: 1, TIER_2: 2, TIER_3: 3 };
  // Sama dengan /api/payments/upgrade: selisih harga paket dari pengaturan admin. 0 = pengaturan belum termuat.
  const packageOf = (id: string) => platformSettings?.packages?.find((p: any) => p.id === id);
  const upgradeDiff = (target: string, current: string) => {
    const to = Number(packageOf(target)?.price) || 0;
    const from = Number(packageOf(current)?.price) || 0;
    return to > 0 && from > 0 ? to - from : 0;
  };
  const PLAN_COLOR: Record<string, string> = {
    TIER_1: "bg-amber-50 text-amber-800 border-amber-200",
    TIER_2: "bg-stone-100 text-stone-800 border-stone-200",
    TIER_3: "bg-amber-100/70 text-amber-950 border-amber-300",
  };

  const handleChangeInvitationMode = async () => {
    if (!invitationId || !selectedEventType || changingEventType) return;
    const cleanSub = selectedEventType === "WEDDING" ? null : sanitizeSubEvent(selectedFreeSubEvent);
    if (
      selectedEventType === invitation?.eventType &&
      (cleanSub || "") === (invitation?.subEvent || "")
    ) {
      setEventTypeModalOpen(false);
      return;
    }
    setChangingEventType(true);
    setEventTypeError(null);
    try {
      const res = await fetch(`/api/client/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_INVITATION_MODE",
          eventType: selectedEventType,
          subEvent: cleanSub,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEventTypeError(data.error || "Gagal mengganti mode acara.");
        return;
      }
      setEventTypeModalOpen(false);
      window.location.reload();
    } catch {
      setEventTypeError("Koneksi terganggu saat mengganti mode acara.");
    } finally {
      setChangingEventType(false);
    }
  };

  const [changingSubEvent, setChangingSubEvent] = useState(false);
  const [customSubEventDraft, setCustomSubEventDraft] = useState<string>("");
  const [subEventCustomOpen, setSubEventCustomOpen] = useState<boolean>(false);

  const handleSwitchSubEvent = async (rawNextSubEvent: string) => {
    const cleanNext = sanitizeSubEvent(rawNextSubEvent);
    if (!invitationId || changingSubEvent || (cleanNext || "") === (invitation?.subEvent || "")) return;
    setChangingSubEvent(true);
    try {
      const res = await fetch(`/api/client/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_SUB_EVENT",
          subEvent: cleanNext,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        feedback.notify(data.error || "Gagal mengganti sub-acara.", "error");
        return;
      }
      const serverInv = data.invitation || {};
      const nextSubVal = serverInv.subEvent ?? cleanNext;
      const patch = {
        subEvent: nextSubVal,
        ...(serverInv.openingQuote !== undefined ? { openingQuote: serverInv.openingQuote } : {}),
        ...(serverInv.openingQuoteRef !== undefined ? { openingQuoteRef: serverInv.openingQuoteRef } : {}),
        ...(serverInv.featureSettings !== undefined ? { featureSettings: serverInv.featureSettings } : {}),
      };
      setInvitation((prev: any) => (prev ? { ...prev, ...patch } : prev));
      setSavedSnapshot((prev: any) =>
        prev?.invitation ? { ...prev, invitation: { ...prev.invitation, ...patch } } : prev,
      );
      setLiveIframeKey((k) => k + 1);
      setSubEventCustomOpen(false);
      feedback.notify(
        nextSubVal ? `Sub-acara diperbarui menjadi "${nextSubVal}".` : "Sub-acara dikosongkan ke umum.",
        "success",
      );
    } catch {
      feedback.notify("Koneksi terganggu saat mengganti sub-acara.", "error");
    } finally {
      setChangingSubEvent(false);
    }
  };

  const handleUpgrade = async () => {
    if (!upgradeTarget || !invitationId) return;
    setUpgrading(true);
    setUpgradeError(null);
    try {
      const res = await fetch("/api/payments/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          targetPlan: upgradeTarget,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat order upgrade.");
      setUpgradeModal(false);
      router.push(`/checkout?order=${data.orderId}`);
    } catch (err: any) {
      setUpgradeError(err.message);
    } finally {
      setUpgrading(false);
    }
  };

  // Dual-Native Studio State: Form Mode vs Live Visual Editor vs Guest Memories
  const [activeStudioTab, setActiveStudioTab] = useState<"form" | "live">("form");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop" | "dual">("dual");
  const [selectedThemeCategory, setSelectedThemeCategory] = useState<string>("");
  const [selectedPersonalThemeSub, setSelectedPersonalThemeSub] = useState<string>("all");
  const liveMobileIframeRef = useRef<HTMLIFrameElement>(null);
  const liveDesktopIframeRef = useRef<HTMLIFrameElement>(null);
  const liveFallbackIframeRef = useRef<HTMLIFrameElement>(null);
  const liveSingleIframeRef = useRef<HTMLIFrameElement>(null);
  const [liveIframeKey, setLiveIframeKey] = useState<number>(0);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState<boolean>(false);
  const liveCanvasRef = useRef<HTMLDivElement | null>(null);

  const toggleCanvasFullscreen = useCallback(() => {
    setIsCanvasFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (liveCanvasRef.current && document.fullscreenEnabled && !document.fullscreenElement) {
          liveCanvasRef.current.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsCanvasFullscreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCanvasFullscreen) {
        setIsCanvasFullscreen(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCanvasFullscreen]);

  const getAllLiveWindows = useCallback(() => {
    return [
      liveMobileIframeRef.current?.contentWindow,
      liveDesktopIframeRef.current?.contentWindow,
      liveFallbackIframeRef.current?.contentWindow,
      liveSingleIframeRef.current?.contentWindow,
    ].filter((w): w is Window => !!w);
  }, []);

  const broadcastToAllLiveIframes = useCallback((msg: any) => {
    getAllLiveWindows().forEach((win) => {
      try {
        win.postMessage(msg, "*");
      } catch {}
    });
  }, [getAllLiveWindows]);

  const relayToSiblingLiveIframes = useCallback((sender: Window | MessageEventSource | null, senderRole: string | undefined, msg: any) => {
    if (senderRole === "mobile" && liveDesktopIframeRef.current?.contentWindow) {
      try {
        liveDesktopIframeRef.current.contentWindow.postMessage(msg, "*");
      } catch {}
      return;
    }
    if (senderRole === "desktop" && liveMobileIframeRef.current?.contentWindow) {
      try {
        liveMobileIframeRef.current.contentWindow.postMessage(msg, "*");
      } catch {}
      return;
    }

    getAllLiveWindows().forEach((win) => {
      if (win !== sender) {
        try {
          win.postMessage(msg, "*");
        } catch {}
      }
    });
  }, [getAllLiveWindows]);

  const pauseAllLiveIframesAudio = useCallback(() => {
    getAllLiveWindows().forEach((win) => {
      try {
        win.postMessage({ type: "LUX_PAUSE_AUDIO" }, "*");
        if (win.document) {
          win.document.querySelectorAll("audio, video").forEach((el: any) => {
            try { el.pause(); } catch {}
          });
          win.document.querySelectorAll(".audio-fab, .music-fab, .btn-music, .btn-audio-fab, #music-control, #musicFab").forEach((fab: any) => {
            fab.classList.remove("playing", "spin", "rotate");
          });
        }
      } catch {}
    });
  }, [getAllLiveWindows]);

  const handleStudioTabClick = (tab: "form" | "live") => {
    setActiveStudioTab(tab);
    if (tab === "form") {
      pauseAllLiveIframesAudio();
    }
  };

  useEffect(() => {
    if (activeStudioTab === "form") {
      pauseAllLiveIframesAudio();
    }
    return () => {
      pauseAllLiveIframesAudio();
    };
  }, [activeStudioTab, pauseAllLiveIframesAudio]);

  // Master-Detail Two-Column Studio State
  const [activeSectionTab, setActiveSectionTab] = useState<string>("sec1");
  const sectionPillStripRef = useRef<HTMLDivElement>(null);

  // Seksi bisa berganti lewat tombol "Lanjut ke Seksi" atau sidebar, bukan hanya pill; di HP pill aktif lalu berada di
  // luar strip yang bergulir horizontal. Hanya strip yang digulir, bukan halaman.
  useEffect(() => {
    const strip = sectionPillStripRef.current;
    const pill = strip?.querySelector<HTMLElement>('[data-active="true"]');
    if (strip && pill) strip.scrollTo({ left: pill.offsetLeft - (strip.clientWidth - pill.offsetWidth) / 2, behavior: "smooth" });
  }, [activeSectionTab]);

  const handleSelectSection = (secId: string) => {
    setActiveSectionTab(secId);
    setCollapsed((prev) => ({ ...prev, [secId]: false }));
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => {
        const el = document.getElementById(`section-${secId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  // Dress Code Color Studio State
  const [showManualHex, setShowManualHex] = useState(false);
  const [themeSyncSuccess, setThemeSyncSuccess] = useState(false);

  const isUploading = uploadingCount > 0;
  const handleUploadStart = () => setUploadingCount((c) => c + 1);
  const handleUploadEnd = () => setUploadingCount((c) => Math.max(0, c - 1));

  const togglePlayPreview = (url: string) => {
    if (playingAudioUrl === url) {
      audioElement?.pause();
      setPlayingAudioUrl(null);
    } else {
      audioElement?.pause();
      const audio = new Audio(url);
      audio.play().catch(() => {});
      audio.onended = () => setPlayingAudioUrl(null);
      setAudioElement(audio);
      setPlayingAudioUrl(url);
    }
  };

  useEffect(() => {
    return () => {
      audioElement?.pause();
    };
  }, [audioElement]);

  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !invitationId) return;

    setAudioUploadError(null);

    // Audio size guard (Maks 20 MB)
    const maxAudioSize = 20 * 1024 * 1024;
    if (file.size > maxAudioSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setAudioUploadError(`Ukuran file musik "${file.name}" (${sizeMB} MB) melebihi batas maksimal 20 MB. Silakan gunakan file musik berukuran lebih kecil.`);
      e.target.value = "";
      return;
    }

    setUploadingAudio(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("invitationId", invitationId);
      data.append("slot", "MUSIC");

      const res = await fetch("/api/client/upload", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengunggah file audio ke server");
      }
      const result = await res.json();
      if (result.url) {
        setAudioUploadError(null);
        updateField("musicUrl", result.url);
        updateFeatureSetting("musicUrl", result.url);
        updateFeatureSetting("showMusic", true);
      }
    } catch (err: any) {
      setAudioUploadError(err.message || "Gagal mengunggah file musik. Periksa koneksi internet Anda.");
    } finally {
      setUploadingAudio(false);
    }
  };

  // Mode Master-Detail Sidebar: seluruh seksi form selalu terbuka penuh (always expanded)
  const defaultCollapsed: Record<string, boolean> = {
    sec1: false,  // 1. Tema & Warna
    sec2: false,  // 2. Sampul & Musik
    sec3: false,  // 3. Profil Mempelai
    sec4: false,  // 4. Kutipan Pembuka
    sec5: false,  // 5. Rangkaian Acara
    sec6: false,  // 6. Pengaturan QR Code & Check-in
    sec7: false,  // 7. Kisah Cinta (Love Story)
    sec8: false,  // 8. Pengaturan Galeri Foto & Video
    sec9: false,  // 9. Rekening Bank & Hadiah Digital
    sec10: false, // 10. Panduan Busana (Dress Code)
    sec11: false, // 11. Siaran Langsung (Live Streaming)
    sec12: false, // 12. Filter Instagram Story
    sec13: false, // 13. Turut Mengundang & Himbauan
    sec14: false, // 14. Galeri Kenangan Tamu (After-Event)
    sec15: false, // 15. Pengaturan Teks UI & Bahasa
    sec16: false, // 16. Mitra & Vendor Pernikahan
  };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(defaultCollapsed);

  // Bersihkan legacy collapsed state dari localStorage agar tidak mengunci tampilan seksi
  useEffect(() => {
    if (typeof window !== "undefined" && invitationId) {
      try {
        localStorage.removeItem(`lux_studio_collapsed_${invitationId}`);
      } catch {}
    }
  }, [invitationId]);

  // Mode Master-Detail: seksi aktif selalu terbuka penuh
  const toggleSection = (_secKey: string) => {
    // No-op: seksi form aktif selalu terbuka
  };

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => {
        setPlatformSettings(data);
        if (data.support_whatsapp) {
          setAdminWhatsapp(data.support_whatsapp);
        }
      })
      .catch((err) => console.error(err));

    fetch("/api/public/themes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setThemesList(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setThemesLoading(false));

    fetch("/api/public/music")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.music)) {
          setMusicPresets(data.music);
        }
      })
      .catch((err) => console.error("[Client] Gagal memuat pustaka musik:", err))
      .finally(() => setMusicLoading(false));
  }, []);

  useEffect(() => {
    fetch(`/api/client/invitations/${invitationId}`)
      .then((r) => r.json())
      .then((inv) => {
        if (!inv || inv.error || !inv.id) {
          fetch("/api/client/invitations")
            .then((r) => r.json())
            .then((allInvs) => {
              if (Array.isArray(allInvs) && allInvs.length > 0) {
                window.location.replace(`/dashboard/invitation/${allInvs[0].id}`);
              } else {
                setLoading(false);
              }
            })
            .catch(() => setLoading(false));
          return;
        }

        setInvitation(inv);
        setMedia(inv.mediaMap || {});

        const rawList: any[] = Array.isArray(inv.eventData) ? inv.eventData : [];
        const loadedEvents = rawList.map((item: any) => {
          let startTime = item.startTime || "";
          let endTime = item.endTime || "";
          let timezone = item.timezone || "WIB";
          let isUntilDone = Boolean(item.isUntilDone);

          if ((!startTime || !endTime) && item.time) {
            const raw = String(item.time).trim();
            if (/WITA/i.test(raw)) timezone = "WITA";
            else if (/WIT/i.test(raw)) timezone = "WIT";
            else if (/WIB/i.test(raw)) timezone = "WIB";

            const match = raw.match(/(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2}|selesai)/i);
            if (match) {
              startTime = match[1].replace(".", ":").padStart(5, "0");
              if (/selesai/i.test(match[2])) {
                isUntilDone = true;
                endTime = "23:59";
              } else {
                endTime = match[2].replace(".", ":").padStart(5, "0");
              }
            }
          }

          if (!startTime) startTime = "09:00";
          if (!endTime) endTime = isUntilDone ? "23:59" : "12:00";

          let date = item.date || "";
          if (date.includes("T")) {
            date = date.split("T")[0];
          }

          const sTime = startTime || "09:00";
          const eTime = isUntilDone ? "Selesai" : (endTime || "12:00");
          const tz = timezone || "WIB";
          const synthTime = item.time || `${sTime} - ${eTime} ${tz}`;

          return {
            ...item,
            date,
            startTime,
            endTime,
            timezone,
            isUntilDone,
            time: synthTime,
          };
        });
        // Undangan lama tanpa penanda: tampilkan sesi yang memang dipakai server sebagai jadwal terima tamu.
        if (loadedEvents.length > 0 && !loadedEvents.some((e: any) => e.isPrimary)) {
          loadedEvents[0].isPrimary = true;
        }
        setEvents(loadedEvents);

        const loadedStories: any[] = Array.isArray(inv.loveStory) ? inv.loveStory : [];
        setStories(loadedStories);

        const loadedBanks: any[] = Array.isArray(inv.bankAccounts) ? inv.bankAccounts : [];
        setBankList(loadedBanks);

        // Jika tema belum dipilih, pastikan Seksi 1 terbuka otomatis untuk mengarahkan user memilih tema
        if (!inv.themeId) {
          setCollapsed((prev) => ({ ...prev, sec1: false }));
        }

        // Snapshot initial clean state for change detection (Dirty State tracking)
        setSavedSnapshot({
          invitation: JSON.parse(JSON.stringify(inv)),
          media: JSON.parse(JSON.stringify(inv.mediaMap || {})),
          events: JSON.parse(JSON.stringify(loadedEvents)),
          stories: JSON.parse(JSON.stringify(loadedStories)),
          bankList: JSON.parse(JSON.stringify(loadedBanks)),
        });

        setLoading(false);
        setLastSaved("Data termuat siap");
      })
      .catch(() => {
        setLoading(false);
      });
  }, [invitationId]);

  // Unified Save Handler (Saves to DB and broadcasts sync to Live Preview)
  const saveSection = async (secKey?: string, overrideInvitation?: any): Promise<{ ok: boolean; error?: string }> => {
    const invToSave = overrideInvitation || invitation;
    if (!invToSave) return { ok: false, error: "Data undangan belum termuat." };
    if (saving) return { ok: false, error: "Penyimpanan lain sedang berjalan." };
    setSaving(true);
    setSavingSec(secKey || null);
    try {
      // Subdomain, status, PIN, dan domain dikelola di Pengaturan. Mengirim nilai saat Studio dibuka akan menimpa
      // perubahan dari tab lain dan mematikan subdomain otomatis dari nama panggilan (rute hanya menurunkannya
      // bila subdomain tidak dikirim).
      const { subdomain, status, staffPin, customDomain, ...editable } = invToSave;
      const payload = {
        ...editable,
        eventData: events,
        loveStory: stories,
        bankAccounts: bankList,
        media,
      };

      const res = await fetch(`/api/client/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || "Gagal menyimpan data ke server");
      }

      // Ganti tema: media bawaan, slot foto, dan label bawaan tema baru disalin server saat menyimpan, jadi Studio membacanya ulang.
      let syncedInv = invToSave;
      if (invToSave.themeId !== savedSnapshot?.invitation?.themeId) {
        const freshRes = await fetch(`/api/client/invitations/${invitationId}`);
        if (freshRes.ok) {
          const fresh = await freshRes.json();
          syncedInv = {
            ...invToSave,
            featureSettings: fresh.featureSettings ?? invToSave.featureSettings,
            themeDefaultMedia: fresh.themeDefaultMedia,
            themeMediaSlots: fresh.themeMediaSlots,
            themeArtPreview: fresh.themeArtPreview,
            subdomain: fresh.subdomain ?? invToSave.subdomain,
            invitationSlug: fresh.invitationSlug ?? invToSave.invitationSlug,
          };
          setInvitation((prev: any) => ({
            ...prev,
            featureSettings: fresh.featureSettings ?? prev?.featureSettings,
            themeDefaultMedia: fresh.themeDefaultMedia,
            themeMediaSlots: fresh.themeMediaSlots,
            themeArtPreview: fresh.themeArtPreview,
            subdomain: fresh.subdomain ?? prev?.subdomain,
            invitationSlug: fresh.invitationSlug ?? prev?.invitationSlug,
          }));
        } else {
          setStudioNotification({ type: "error", message: "Tema tersimpan, tetapi daftar foto tema baru gagal dimuat. Muat ulang halaman." });
        }
      } else {
        const savedData = await res.json().catch(() => null);
        if (savedData && typeof savedData === "object") {
          if (savedData.invitationSlug && savedData.invitationSlug !== invToSave.invitationSlug) {
            syncedInv = { ...syncedInv, invitationSlug: savedData.invitationSlug };
            setInvitation((prev: any) => (prev ? { ...prev, invitationSlug: savedData.invitationSlug } : prev));
          }
          if (savedData.subdomain !== undefined && savedData.subdomain !== invToSave.subdomain) {
            syncedInv = { ...syncedInv, subdomain: savedData.subdomain };
            setInvitation((prev: any) => (prev ? { ...prev, subdomain: savedData.subdomain } : prev));
          }
        }
      }

      // Update saved snapshot to current state
      setSavedSnapshot({
        invitation: JSON.parse(JSON.stringify(syncedInv)),
        media: JSON.parse(JSON.stringify(media)),
        events: JSON.parse(JSON.stringify(events)),
        stories: JSON.parse(JSON.stringify(stories)),
        bankList: JSON.parse(JSON.stringify(bankList)),
      });

      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setLastSaved(`Tersimpan pukul ${timeStr}`);

      // Mode Master-Detail: seksi aktif tetap terbuka setelah disimpan

      // Broadcast hot reload to open Live Preview tabs
      try {
        const bc = new BroadcastChannel("lux_preview_sync");
        bc.postMessage({ type: "INVITATION_SAVED", id: invitationId });
        bc.close();
      } catch {}

      // Trigger hot reload preview di Live Editor
      setLiveIframeKey((k) => k + 1);
      return { ok: true };
    } catch (err: any) {
      console.error("Save failed:", err);
      const message = err?.message || "Terjadi kendala saat menyimpan data ke server. Silakan coba lagi.";
      setStudioNotification({ type: "error", message });
      return { ok: false, error: message };
    } finally {
      setSaving(false);
      setSavingSec(null);
    }
  };

  const handleDeployAndLock = async () => {
    if (!invitation || isDeploying) return;
    setIsDeploying(true);
    setStudioNotification(null);
    try {
      const res = await fetch(`/api/client/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DEPLOY_AND_LOCK" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui undangan online.");
      }
      setInvitation((prev: any) => ({
        ...prev,
        ...data,
        isLocked: true,
        isEmergencyUnlocked: false,
        lockReason: "PUBLISHED",
      }));
    } catch (err: any) {
      setStudioNotification({
        type: "error",
        message: err.message || "Terjadi kendala saat memperbarui undangan online.",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setInvitation((prev: any) => ({ ...prev, [field]: value }));
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field, value });
  };

  // Data mempelai tersimpan di participantsJson, sedangkan pratinjau langsung mengenalnya dengan nama field template.
  const updateWeddingField = (field: string, value: string) => {
    setInvitation((prev: any) => ({ ...prev, participantsJson: withWeddingField(prev?.participantsJson, field, value) }));
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field, value });
  };

  const weddingValue = (field: string) => weddingFieldValue(invitation?.participantsJson, field);

  const updateMedia = (slot: string, url: string) => {
    setMedia((prev) => ({ ...prev, [slot]: url }));
  };

  // Slot media yang dipakai tema (salinan saat tema dipilih); null = tema belum mendeklarasikan, semua slot tampil.
  const declaredSlots = parseThemeMediaSlots(invitation?.themeMediaSlots);
  const slotUsed = (slot: string) => isSlotUsed(declaredSlots, slot);

  const updateFeatureSetting = (key: string, value: any) => {
    setInvitation((prev: any) => {
      return {
        ...prev,
        featureSettings: {
          ...(prev.featureSettings ?? {}),
          [key]: value,
        },
      };
    });
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field: key, value });
  };

  const getFeatureSetting = (key: string, fallback: any = "") => invitation?.featureSettings?.[key] ?? fallback;

  const getSavedFeatureSetting = (key: string, fallback: any = "") => savedSnapshot?.invitation?.featureSettings?.[key] ?? fallback;

  const updateCustomLabel = (key: string, value: string) => {
    setInvitation((prev: any) => {
      const currentFs: Record<string, any> = prev.featureSettings ?? {};
      const customLabels = currentFs.customLabels || {};
      return {
        ...prev,
        featureSettings: {
          ...currentFs,
          customLabels: {
            ...customLabels,
            [key]: value,
          },
        },
      };
    });
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field: `customLabels.${key}`, value });
  };

  const getCustomLabel = (key: string, fallback: string = "") => {
    const fs = getFeatureSetting("customLabels", {});
    return fs && fs[key] !== undefined ? fs[key] : fallback;
  };

  const getSavedCustomLabel = (key: string, fallback: string = "") => {
    const fs = getSavedFeatureSetting("customLabels", {});
    return fs && fs[key] !== undefined ? fs[key] : fallback;
  };

  // Two-Way Dual-View Sync: Listen to Live Visual Editor messages & relay to sibling iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // Pesan sunting hanya sah dari iframe pratinjau milik halaman ini; jendela lain (popup situs luar) dapat mengisi
      // kolom undangan, termasuk rekening, lalu memicu simpan atas nama klien yang sedang login.
      if (e.origin !== window.location.origin) return;
      if (!e.source || !getAllLiveWindows().includes(e.source as Window)) return;
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "LUX_INLINE_EDIT_CHANGE") {
        const { field, value, senderRole } = e.data;
        if (!field || !isLiveEditField(field)) return;

        if (field.startsWith("customLabels.")) {
          const labelKey = field.replace("customLabels.", "");
          setInvitation((prev: any) => {
            const currentFs: Record<string, any> = prev.featureSettings ?? {};
            const customLabels = currentFs.customLabels || {};
            return {
              ...prev,
              featureSettings: {
                ...currentFs,
                customLabels: {
                  ...customLabels,
                  [labelKey]: value,
                },
              },
            };
          });
        } else if (field.startsWith("events.")) {
          const parts = field.split(".");
          const idx = parseInt(parts[1], 10);
          const prop = parts[2];
          if (!isNaN(idx) && prop) {
            setEvents((prev) => {
              const next = [...prev];
              if (next[idx]) next[idx] = { ...next[idx], [prop]: value };
              return next;
            });
          }
        } else if (field.startsWith("stories.")) {
          const parts = field.split(".");
          const idx = parseInt(parts[1], 10);
          const prop = parts[2];
          if (!isNaN(idx) && prop) {
            setStories((prev) => {
              const next = [...prev];
              if (next[idx]) next[idx] = { ...next[idx], [prop]: value };
              return next;
            });
          }
        } else if (field.startsWith("bankAccounts.")) {
          const parts = field.split(".");
          const idx = parseInt(parts[1], 10);
          const prop = parts[2];
          if (!isNaN(idx) && prop) {
            setBankList((prev) => {
              const next = [...prev];
              if (next[idx]) next[idx] = { ...next[idx], [prop]: value };
              return next;
            });
          }
        } else if (isWeddingField(field)) {
          setInvitation((prev: any) =>
            prev?.eventType && prev.eventType !== "WEDDING"
              ? prev
              : { ...prev, participantsJson: withWeddingField(prev?.participantsJson, field, value) }
          );
        } else if (FEATURE_SETTING_LIVE_FIELDS.has(field)) {
          setInvitation((prev: any) => ({ ...prev, featureSettings: { ...(prev.featureSettings ?? {}), [field]: value } }));
        } else {
          // Sisa kunci yang diizinkan isLiveEditField adalah kolom undangan (openingQuote, openingQuoteRef).
          setInvitation((prev: any) => ({ ...prev, [field]: value }));
        }

        // Two-Way Dual-View Sync: Relay keystrokes to sibling iframes
        relayToSiblingLiveIframes(e.source, senderRole, { type: "LUX_REMOTE_EDIT_CHANGE", field, value });
      } else if (e.data.type === "LUX_INVITATION_OPENED") {
        // Two-Way Dual-View Sync: Relay open envelope event to sibling iframes
        relayToSiblingLiveIframes(e.source, e.data.senderRole, { type: "LUX_REMOTE_OPEN_INVITATION" });
      } else if (e.data.type === "LUX_SCROLL_SYNC") {
        // Two-Way Dual-View Sync: Relay scroll position ratio to sibling iframes
        relayToSiblingLiveIframes(e.source, e.data.senderRole, { type: "LUX_SCROLL_SYNC", ratio: e.data.ratio });
      } else if (e.data.type === "LUX_INLINE_SAVE_REQUEST") {
        const source = e.source as Window;
        void saveSection().then((result) => {
          source.postMessage({ type: "LUX_INLINE_SAVE_RESULT", ...result }, window.location.origin);
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation, events, stories, bankList, media, relayToSiblingLiveIframes, getAllLiveWindows]);

  // Precise Per-Section Dirty State Tracking
  const isDirty = useMemo(() => {
    if (!savedSnapshot || !invitation) {
      return {
        sec1: false, sec2: false, sec3: false, sec4: false, sec5: false,
        sec6: false, sec7: false, sec8: false, sec9: false, sec10: false,
        sec11: false, sec12: false, sec13: false, sec14: false, sec15: false,
        sec16: false,
      };
    }

    // Sec 1: Tema & Tagline
    const dirty1 = (
      invitation.themeId !== savedSnapshot.invitation?.themeId ||
      getFeatureSetting("weddingTagline", "THE WEDDING OF") !== getSavedFeatureSetting("weddingTagline", "THE WEDDING OF") ||
      EDITABLE_TEXT_KEYS.some((key) => getCustomLabel(key, "") !== getSavedCustomLabel(key, "")) ||
      ((themesList.find((t) => t.id === invitation.themeId)?.freeTexts ?? []) as FreeSectionText[]).some((t) => getCustomLabel(t.key, "") !== getSavedCustomLabel(t.key, ""))
    );

    // Sec 2: Sampul & Visual
    const dirty2 = (
      JSON.stringify(media) !== JSON.stringify(savedSnapshot.media || {}) ||
      (invitation.musicUrl || "") !== (savedSnapshot.invitation?.musicUrl || "") ||
      Boolean(getFeatureSetting("showMusic", true)) !== Boolean(getSavedFeatureSetting("showMusic", true)) ||
      parseBgPhotoTone(getFeatureSetting("bgPhotoTone", 0)) !== parseBgPhotoTone(getSavedFeatureSetting("bgPhotoTone", 0)) ||
      parseBgScrim(getFeatureSetting("bgScrim", null)) !== parseBgScrim(getSavedFeatureSetting("bgScrim", null))
    );

    // Sec 3: Profil Mempelai / Persona Acara
    const dirty3 = (
      JSON.stringify(safeParseParticipants(invitation.participantsJson)) !== JSON.stringify(safeParseParticipants(savedSnapshot.invitation?.participantsJson)) ||
      getFeatureSetting("displayOrder", "GROOM_FIRST") !== getSavedFeatureSetting("displayOrder", "GROOM_FIRST") ||
      (media["BRIDE_PHOTO"] || "") !== (savedSnapshot.media?.["BRIDE_PHOTO"] || "") ||
      (media["GROOM_PHOTO"] || "") !== (savedSnapshot.media?.["GROOM_PHOTO"] || "")
    );

    // Sec 4: Kutipan Doa & Ayat
    const dirty4 = (
      (invitation.openingQuote || "") !== (savedSnapshot.invitation?.openingQuote || "") ||
      (invitation.openingQuoteRef || "") !== (savedSnapshot.invitation?.openingQuoteRef || "") ||
      getCustomLabel("quoteTitle", "") !== getSavedCustomLabel("quoteTitle", "") ||
      getCustomLabel("quoteEyebrow", "") !== getSavedCustomLabel("quoteEyebrow", "") ||
      getCustomLabel("openingGreeting", "") !== getSavedCustomLabel("openingGreeting", "")
    );

    // Sec 5: Rangkaian Acara
    const dirty5 = (
      JSON.stringify(events) !== JSON.stringify(savedSnapshot.events || [])
    );

    // Sec 6: Kartu Akses QR & Check-In
    const dirty6 = (
      Boolean(getFeatureSetting("showQrCheckin", true)) !== Boolean(getSavedFeatureSetting("showQrCheckin", true))
    );

    // Sec 7: Kisah Cinta
    const dirty7 = (
      JSON.stringify(stories) !== JSON.stringify(savedSnapshot.stories || []) ||
      Boolean(getFeatureSetting("showStory", true)) !== Boolean(getSavedFeatureSetting("showStory", true)) ||
      getCustomLabel("storyTitle", "") !== getSavedCustomLabel("storyTitle", "")
    );

    // Sec 8: Galeri & Video
    const dirty8 = (
      getFeatureSetting("videoGalleryUrl", "") !== getSavedFeatureSetting("videoGalleryUrl", "") ||
      getFeatureSetting("galleryDriveFolderUrl", "") !== getSavedFeatureSetting("galleryDriveFolderUrl", "") ||
      getFeatureSetting("galleryPhotosList", "") !== getSavedFeatureSetting("galleryPhotosList", "") ||
      Boolean(getFeatureSetting("showGallery", true)) !== Boolean(getSavedFeatureSetting("showGallery", true)) ||
      getCustomLabel("galleryTitle", "") !== getSavedCustomLabel("galleryTitle", "")
    );

    // Sec 9: Rekening & Hadiah
    const dirty9 = (
      JSON.stringify(bankList) !== JSON.stringify(savedSnapshot.bankList || []) ||
      (invitation.shippingAddress || "") !== (savedSnapshot.invitation?.shippingAddress || "") ||
      getFeatureSetting("qrisImageUrl", "") !== getSavedFeatureSetting("qrisImageUrl", "") ||
      Boolean(getFeatureSetting("showGift", true)) !== Boolean(getSavedFeatureSetting("showGift", true)) ||
      JSON.stringify(getFeatureSetting("giftRegistry", [])) !== JSON.stringify(getSavedFeatureSetting("giftRegistry", []))
    );

    // Sec 10: Dresscode
    const dirty10 = (
      (invitation.dresscode || "") !== (savedSnapshot.invitation?.dresscode || "") ||
      getFeatureSetting("dressCodeColors", "") !== getSavedFeatureSetting("dressCodeColors", "") ||
      getFeatureSetting("dressCodeNote", "") !== getSavedFeatureSetting("dressCodeNote", "") ||
      Boolean(getFeatureSetting("showDresscode", true)) !== Boolean(getSavedFeatureSetting("showDresscode", true))
    );

    // Sec 11: Live Streaming
    const dirty11 = (
      getFeatureSetting("liveStreamYoutubeUrl", "") !== getSavedFeatureSetting("liveStreamYoutubeUrl", "") ||
      getFeatureSetting("liveStreamInstagramUrl", "") !== getSavedFeatureSetting("liveStreamInstagramUrl", "") ||
      getFeatureSetting("liveStreamZoomUrl", "") !== getSavedFeatureSetting("liveStreamZoomUrl", "") ||
      Boolean(getFeatureSetting("showLiveStream", false)) !== Boolean(getSavedFeatureSetting("showLiveStream", false))
    );

    // Sec 12: Instagram Filter
    const dirty12 = (
      getFeatureSetting("instagramFilterUrl", "") !== getSavedFeatureSetting("instagramFilterUrl", "") ||
      Boolean(getFeatureSetting("showFilter", false)) !== Boolean(getSavedFeatureSetting("showFilter", false))
    );

    // Sec 13: Turut Mengundang & Himbauan
    const dirty13 = (
      getFeatureSetting("turutMengundang", "") !== getSavedFeatureSetting("turutMengundang", "") ||
      getFeatureSetting("guestGuidance", "") !== getSavedFeatureSetting("guestGuidance", "") ||
      Boolean(getFeatureSetting("showTurutMengundang", true)) !== Boolean(getSavedFeatureSetting("showTurutMengundang", true))
    );

    // Sec 14: Galeri Kenangan Tamu (After-Event)
    const dirty15 =
      JSON.stringify(invitation.featureSettings?.customLabels || {}) !== JSON.stringify(savedSnapshot.invitation?.featureSettings?.customLabels || {}) ||
      getFeatureSetting("language", "id") !== getSavedFeatureSetting("language", "id");

    const dirty14 = (
      Boolean(getFeatureSetting("showGuestMemories", true)) !== Boolean(getSavedFeatureSetting("showGuestMemories", true)) ||
      getFeatureSetting("memoriesWebLayout", "stories") !== getSavedFeatureSetting("memoriesWebLayout", "stories") ||
      getFeatureSetting("memoriesFilter", "aura_90s") !== getSavedFeatureSetting("memoriesFilter", "aura_90s") ||
      Boolean(getFeatureSetting("memoriesDateStamp", true)) !== Boolean(getSavedFeatureSetting("memoriesDateStamp", true)) ||
      getFeatureSetting("memoriesDateFormat", "DD MM 'YY") !== getSavedFeatureSetting("memoriesDateFormat", "DD MM 'YY") ||
      Number(getFeatureSetting("memoriesShotsQuota", 5)) !== Number(getSavedFeatureSetting("memoriesShotsQuota", 5)) ||
      Number(getFeatureSetting("memoriesMaxContributors", 100)) !== Number(getSavedFeatureSetting("memoriesMaxContributors", 100)) ||
      Boolean(getFeatureSetting("memoriesDelayedReveal", false)) !== Boolean(getSavedFeatureSetting("memoriesDelayedReveal", false)) ||
      getFeatureSetting("guestMemoriesDriveFolderUrl", "") !== getSavedFeatureSetting("guestMemoriesDriveFolderUrl", "") ||
      getCustomLabel("memoriesTitle", "Abadikan Momen Indah") !== getSavedCustomLabel("memoriesTitle", "Abadikan Momen Indah") ||
      getCustomLabel("memoriesEyebrow", "AFTER-EVENT MEMORIES") !== getSavedCustomLabel("memoriesEyebrow", "AFTER-EVENT MEMORIES") ||
      getCustomLabel("memoriesSubtitle", "") !== getSavedCustomLabel("memoriesSubtitle", "")
    );

    // Sec 16: Mitra & Vendor Pernikahan (Wedding Credits)
    const dirty16 = (() => {
        const curFs: Record<string, any> = invitation.featureSettings ?? {};
        const prevFs: Record<string, any> = savedSnapshot.invitation?.featureSettings ?? {};
        const curShow = Boolean(curFs.showVendors);
        const prevShow = Boolean(prevFs.showVendors);
        const curVendors = JSON.stringify(curFs.vendors || []);
        const prevVendors = JSON.stringify(prevFs.vendors || []);
        const curTitle = curFs.customLabels?.vendorTitle || "";
        const prevTitle = prevFs.customLabels?.vendorTitle || "";
        const curSub = curFs.customLabels?.vendorSubtitle || "";
        const prevSub = prevFs.customLabels?.vendorSubtitle || "";
        const curEye = curFs.customLabels?.vendorEyebrow || "";
        const prevEye = prevFs.customLabels?.vendorEyebrow || "";
        return curShow !== prevShow || curVendors !== prevVendors || curTitle !== prevTitle || curSub !== prevSub || curEye !== prevEye;
    })();

    return {
      sec1: dirty1,
      sec2: dirty2,
      sec3: dirty3,
      sec4: dirty4,
      sec5: dirty5,
      sec6: dirty6,
      sec7: dirty7,
      sec8: dirty8,
      sec9: dirty9,
      sec10: dirty10,
      sec11: dirty11,
      sec12: dirty12,
      sec13: dirty13,
      sec14: dirty14,
      sec15: dirty15,
      sec16: dirty16,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation, media, events, stories, bankList, savedSnapshot, themesList]);

  const revertAllChanges = async () => {
    if (!savedSnapshot) return;
    const ok = await feedback.confirm({
      title: "Urungkan semua perubahan?",
      message: "Seluruh perubahan yang belum disimpan pada semua formulir akan dikembalikan ke kondisi terakhir tersimpan.",
      confirmLabel: "Urungkan Semua",
    });
    if (!ok) return;

    if (savedSnapshot.invitation) {
      setInvitation(JSON.parse(JSON.stringify(savedSnapshot.invitation)));
    }
    if (savedSnapshot.media) {
      setMedia(JSON.parse(JSON.stringify(savedSnapshot.media)));
    }
    if (savedSnapshot.events) {
      setEvents(JSON.parse(JSON.stringify(savedSnapshot.events)));
    }
    if (savedSnapshot.stories) {
      setStories(JSON.parse(JSON.stringify(savedSnapshot.stories)));
    }
    if (savedSnapshot.bankList) {
      setBankList(JSON.parse(JSON.stringify(savedSnapshot.bankList)));
    }
    // Sunting langsung mengubah DOM iframe pratinjau; state yang dikembalikan tidak menyentuh DOM itu, jadi iframe dimuat ulang.
    setLiveIframeKey((k) => k + 1);
    feedback.notify("Seluruh perubahan berhasil diurungkan.", "success");
  };

  // Event Handlers & Chronological Auto-Sort
  const sortEventsChronologically = (list: any[]) => {
    return [...list].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
      const timeA = a.startTime || a.time || "";
      const timeB = b.startTime || b.time || "";
      return timeA.localeCompare(timeB);
    });
  };

  const addEvent = (presetTitle: string = "Sesi Baru") => {
    setEvents((prev) => {
      const isFirst = prev.length === 0;
      const defaultStart = isFirst ? "09:00" : "13:00";
      const defaultEnd = isFirst ? "11:00" : "16:00";
      const defaultTz = prev[0]?.timezone || "WIB";
      const defaultTime = `${defaultStart} - ${defaultEnd} ${defaultTz}`;
      const newEv = {
        title: presetTitle,
        date: prev[0]?.date || "",
        startTime: defaultStart,
        endTime: defaultEnd,
        timezone: defaultTz,
        isUntilDone: false,
        time: defaultTime,
        location: prev[0]?.location || "",
        address: prev[0]?.address || "",
        mapsUrl: prev[0]?.mapsUrl || "",
        badge: presetTitle.toLowerCase().includes("akad") || presetTitle.toLowerCase().includes("pemberkatan") ? "Sakral" : "Umum",
        notes: "",
        isPrimary: isFirst || !prev.some((e) => e.isPrimary),
      };
      return sortEventsChronologically([...prev, newEv]);
    });
  };

  const removeEvent = (index: number) => {
    setEvents((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length > 0 && !filtered.some((e) => e.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const setAsPrimaryEvent = (index: number) => {
    setEvents((prev) => {
      return prev.map((ev, i) => ({
        ...ev,
        isPrimary: i === index,
      }));
    });
  };

  const updateEventItem = (index: number, field: string, value: any) => {
    // Tidak diurutkan saat mengetik: kartu dirender per indeks, sehingga mengurutkan setelah tanggal diubah
    // memindahkan isian berikutnya (tempat, jam) ke sesi lain. Server mengurutkan kronologis saat disimpan.
    setEvents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field: `events.${index}.${field}`, value });
  };

  const handleTimeFieldChange = (index: number, field: "startTime" | "endTime" | "timezone" | "isUntilDone", value: any) => {
    let synthTime = "";
    setEvents((prev) => {
      const next = [...prev];
      const current = { ...next[index], [field]: value };
      const sTime = current.startTime || "09:00";
      const eTime = current.isUntilDone ? "Selesai" : (current.endTime || "12:00");
      const tz = current.timezone || "WIB";
      synthTime = `${sTime} - ${eTime} ${tz}`;
      current.time = synthTime;
      next[index] = current;
      return next;
    });
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field: `events.${index}.time`, value: synthTime });
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field: `events.${index}.${field}`, value });
  };

  // Story Handlers
  const addStory = () => {
    setStories((prev) => [
      ...prev,
      {
        title: "Babak Baru",
        date: "2026",
        content: "Tuliskan momen indah dan kenangan di babak ini.",
      },
    ]);
  };

  const removeStory = (index: number) => {
    setStories((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStoryItem = (index: number, field: string, value: any) => {
    setStories((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field: `stories.${index}.${field}`, value });
  };

  // Bank Handlers
  const addBank = () => {
    setBankList((prev) => [
      ...prev,
      {
        bank: "BCA",
        number: "",
        name: !invitation.eventType || invitation.eventType === "WEDDING"
          ? weddingValue("groomName")
          : participantNames(invitation.eventType, invitation.participantsJson).full,
      },
    ]);
  };

  const removeBank = (index: number) => {
    setBankList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBankItem = (index: number, field: string, value: any) => {
    setBankList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field: `bankAccounts.${index}.${field}`, value });
  };

  const updateParticipantData = (updater: (prev: Record<string, any>) => Record<string, any>) => {
    setInvitation((prev: any) => {
      const updated = updater(safeParseParticipants(prev?.participantsJson));
      return {
        ...prev,
        participantsJson: updated,
      };
    });
    broadcastToAllLiveIframes({
      type: "LUX_REMOTE_EDIT_CHANGE",
      field: "participantsJson",
      value: updater(safeParseParticipants(invitation?.participantsJson)),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-medium">Memuat Studio Editor Undangan...</p>
        </div>
      </div>
    );
  }

  if (!invitation) return <div className="text-center py-12 text-rose-600 font-medium">Undangan tidak ditemukan</div>;

  const currentThemeId = invitation.themeId === "kila" ? "kalandra" : (invitation.themeId || "");
  const selectedThemeObj = currentThemeId ? (themesList.find((t) => t.id === currentThemeId) || null) : null;
  const activeBlueprint = getThemeBlueprint(currentThemeId || "kalandra");
  // Urutan sama dengan lib/themeEngine.ts saat klien belum memilih lagu: musik tema (DB) → blueprint → pustaka pertama.
  const themeFallbackMusicUrl: string = selectedThemeObj?.defaultMusicUrl || activeBlueprint.defaultMusicUrl || musicPresets[0]?.url || "";
  // Tanpa pilihan tersimpan, mesin tema menampilkan mempelai pria lebih dulu (lib/themeEngine.ts).
  const displayOrder = getFeatureSetting("displayOrder", "GROOM_FIRST");

  const planType = invitation.order?.planType || "";
  const packageConfig = platformSettings?.packages?.find((p: any) => p.id === planType);
  const allowedCaps = packageConfig?.capabilities || (planType === "TIER_3" ? ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"] : planType === "TIER_2" ? ["music", "gallery", "qr_checkin", "guest_memories"] : ["music", "gallery"]);
  const hasCap = (cap: string) => allowedCaps.includes(cap);

  const showMusic = getFeatureSetting("showMusic", true);
  const showStory = getFeatureSetting("showStory", true);
  const showGallery = getFeatureSetting("showGallery", true);
  const showGift = getFeatureSetting("showGift", true);
  const showDresscode = getFeatureSetting("showDresscode", true);
  const showQrCheckin = hasCap("qr_checkin") && getFeatureSetting("showQrCheckin", true);
  const showLiveStream = getFeatureSetting("showLiveStream", false);
  const showFilter = getFeatureSetting("showFilter", false);
  const bgPhotoTone = parseBgPhotoTone(getFeatureSetting("bgPhotoTone", 0));
  const bgScrim = parseBgScrim(getFeatureSetting("bgScrim", null));
  const showTurutMengundang = getFeatureSetting("showTurutMengundang", true);
  if (invitation.isLocked && !invitation.isEmergencyUnlocked) {
    const isArchivedOrTakenDown = invitation.status === "ARCHIVED" || invitation.status === "TAKEN_DOWN";
    const isPublishedLock = !isArchivedOrTakenDown && (invitation.lockReason === "PUBLISHED" || (!invitation.lockReason && (invitation.status === "PUBLISHED" || invitation.status === "EVENT_FINISHED")));
    const coupleName = resolveInvitationDisplayName(invitation);

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-24 font-sans px-4 sm:px-0">
        <div className="py-16 sm:py-20 text-center space-y-6 bg-white rounded-3xl border border-stone-200 p-6 sm:p-12 shadow-xs">
          <div className="w-16 h-16 bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-amber-200">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <span className="px-3 py-1 bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              <span>
                {invitation.status === "TAKEN_DOWN"
                  ? "Dinonaktifkan Sistem"
                  : invitation.status === "ARCHIVED"
                  ? "Undangan Diarsipkan"
                  : isPublishedLock
                  ? "Terkunci Pasca Publikasi"
                  : "Studio Terkunci Permanen"}
              </span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
              {invitation.status === "TAKEN_DOWN"
                ? "Undangan Dinonaktifkan"
                : invitation.status === "ARCHIVED"
                ? "Studio Ditutup (Arsip)"
                : isPublishedLock
                ? "Studio Editor Terkunci"
                : "Studio Terkunci Permanen"}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {invitation.status === "TAKEN_DOWN"
                ? "Undangan ini sedang dinonaktifkan oleh Administrator. Silakan hubungi tim CS bila memerlukan informasi lebih lanjut."
                : isPublishedLock
                ? `Undangan resmi ${coupleName} saat ini telah aktif mengudara. Untuk melindungi keutuhan data dan keterhubungan QR Code fisik yang telah disebar kepada para tamu, form editor dikunci secara otomatis.`
                : "Acara telah selesai dan undangan ini kini tersimpan sebagai arsip. Akses edit ditutup untuk menjaga keaslian arsip."}
            </p>
          </div>

          {isPublishedLock && (
            <div className="max-w-lg mx-auto p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-left space-y-1.5">
              <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Memerlukan Perbaikan Data Mendesak?</span>
              </h3>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Jika Anda perlu merevisi data penting (seperti ralat jam sesi acara, pembaruan link Google Maps gedung, atau pembetulan kesalahan ketik nama keluarga), silakan ajukan <strong>Buka Kunci Darurat</strong> kepada Administrator. Akses edit akan dibuka sementara untuk Anda.
              </p>
            </div>
          )}

          {isPublishedLock && (
            <div className="max-w-lg mx-auto p-4 bg-white rounded-2xl border border-stone-200 text-left space-y-2">
              <h3 className="text-xs font-bold text-stone-900">Tetap dapat Anda ubah sendiri</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/dashboard/guests" className="flex-1 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-bold text-stone-800 text-center transition">
                  Kelola Daftar Tamu
                </Link>
                {hasCap("qr_checkin") && (
                  <Link href="/dashboard/settings" className="flex-1 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-bold text-stone-800 text-center transition">
                    Ganti PIN Panitia
                  </Link>
                )}
              </div>
              <p className="text-[11px] text-stone-500">Daftar tamu dapat diubah sampai sehari sebelum acara; pada hari acara tamu baru dicatat Resepsionis.</p>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/${adminWhatsapp.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                isPublishedLock
                  ? `Halo Admin ${platformSettings?.platformName || "Platform"}, mohon bantuan Buka Kunci Darurat untuk undangan kami: ${coupleName} (ID: ${invitation.id}). Kami memerlukan perbaikan data.`
                  : `Halo Admin ${platformSettings?.platformName || "Platform"}, mohon bantuan buka kunci undangan kami: ${coupleName}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{isPublishedLock ? "Ajukan Buka Kunci Darurat" : "Hubungi CS untuk Bantuan"}</span>
            </a>

            {isArchivedOrTakenDown ? (
              <>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition border border-stone-200 flex items-center justify-center gap-1.5"
                >
                  <span>Kembali ke Beranda Arsip</span>
                </Link>
                {invitation.status === "ARCHIVED" && invitation.invitationSlug && (
                  <a
                    href={`/${invitation.invitationSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-5 py-3 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>Lihat Arsip Undangan</span>
                  </a>
                )}
              </>
            ) : (
              <a
                href={`/api/client/invitations/${invitationId}/preview?mode=preview`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition border border-stone-200 flex items-center justify-center gap-1.5"
              >
                <span>Lihat Undangan Online</span>
                <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isWeddingEvent = !invitation?.eventType || invitation.eventType === "WEDDING";
  const eventNounLabel = eventNoun(invitation?.eventType, invitation?.subEvent);
  // Foto wajib hanya untuk slot yang dipakai tema: masing-masing mode memiliki slot fotonya sendiri.
  const needsCoverPhoto = slotUsed("LANDING_COVER") && !media["LANDING_COVER"];
  const needsPortraitPhoto = isWeddingEvent
    ? (slotUsed("GROOM_PHOTO") && !media["GROOM_PHOTO"]) || (slotUsed("BRIDE_PHOTO") && !media["BRIDE_PHOTO"])
    : invitation?.eventType === "EVENT"
    ? slotUsed("EVENT_PHOTO") && !media["EVENT_PHOTO"]
    : slotUsed("PROFILE_PHOTO") && !media["PROFILE_PHOTO"];
  // Foto klien di slot yang tidak dipakai tema terpilih (sisa tema sebelumnya); tidak dirender, baris tetap tersimpan.
  const unusedSlotPhotos = declaredSlots
    ? DECLARABLE_MEDIA_SLOTS.filter((slot) => !slotUsed(slot) && media[slot])
    : [];
  const unfilledSlots = declaredSlots
    ? DECLARABLE_MEDIA_SLOTS.filter((slot) => slotUsed(slot) && !media[slot] && !themeDefaultOf(invitation, slot))
    : [];

  const FORM_SECTIONS = [
    {
      id: "sec1",
      title: "Pilihan Desain Tema",
      shortTitle: "Pilihan Tema",
      summary: selectedThemeObj ? selectedThemeObj.name : "Belum memilih tema",
      isUrgent: !invitation?.themeId,
    },
    {
      id: "sec2",
      title: "Sampul, Visual & Musik Latar",
      shortTitle: "Sampul & Musik",
      summary: media["LANDING_COVER"] ? "Sampul Terpasang" : "Belum ada sampul kustom",
      isUrgent: !media["LANDING_COVER"],
    },
    {
      id: "sec3",
      title: (!invitation?.eventType || invitation?.eventType === "WEDDING")
        ? "Profil Kedua Mempelai"
        : invitation?.eventType === "PERSONAL"
        ? `Profil Tokoh${invitation?.subEvent ? ` (${invitation.subEvent})` : " & Keluarga"}`
        : `Profil Acara${invitation?.subEvent ? ` (${invitation.subEvent})` : ""}`,
      shortTitle: (!invitation?.eventType || invitation?.eventType === "WEDDING")
        ? "Profil Mempelai"
        : invitation?.eventType === "PERSONAL"
        ? "Profil Tokoh"
        : "Profil Acara",
      summary: resolveInvitationDisplayName(invitation),
      isUrgent: needsPortraitPhoto,
    },
    {
      id: "sec4",
      title: "Kutipan Pembuka",
      shortTitle: "Kutipan Pembuka",
      summary: invitation?.openingQuote ? "Kutipan kustom aktif" : "Bawaan blueprint tema",
    },
    {
      id: "sec5",
      title: "Rangkaian Acara (Multi-Event)",
      shortTitle: "Rangkaian Acara",
      summary: events.length > 0 ? `${events.length} Sesi Acara` : "Belum ada acara",
    },
    {
      id: "sec6",
      title: "Kartu Akses QR & Check-In Tamu",
      shortTitle: "Kartu Akses QR",
      summary: showQrCheckin ? "Aktif (QR Pass)" : "Nonaktif",
      hide: !hasCap("qr_checkin"),
    },
    {
      id: "sec7",
      title: (!invitation?.eventType || invitation?.eventType === "WEDDING")
        ? "Kisah Cinta (Journey of Love)"
        : invitation?.eventType === "PERSONAL"
        ? "Kisah & Perjalanan Hidup (Life Story)"
        : "Tonggak Perjalanan & Riwayat (Milestone)",
      shortTitle: (!invitation?.eventType || invitation?.eventType === "WEDDING")
        ? "Kisah Cinta"
        : invitation?.eventType === "PERSONAL"
        ? "Kisah & Perjalanan"
        : "Tonggak Perjalanan",
      summary: showStory ? `${stories.length} Babak Cerita` : "Nonaktif",
      hide: false,
    },
    {
      id: "sec8",
      title: (!invitation?.eventType || invitation?.eventType === "WEDDING") ? "Galeri Foto Pre-Wedding & Video Teaser" : "Galeri Foto & Video Teaser",
      shortTitle: "Galeri & Video",
      summary: showGallery ? (getFeatureSetting("galleryDriveFolderUrl", "") ? "Drive Stream CDN" : "Grid Dinamis") : "Nonaktif",
    },
    {
      id: "sec9",
      title: "Tanda Kasih & Amplop Digital",
      shortTitle: "Amplop Digital",
      summary: showGift ? `${bankList.length} Rekening Terdaftar` : "Nonaktif",
    },
    {
      id: "sec10",
      title: "Panduan Busana (Dress Code Guide)",
      shortTitle: "Panduan Busana",
      summary: showDresscode ? (invitation.dresscode || "Aktif") : "Nonaktif",
    },
    {
      id: "sec11",
      title: "Siaran Langsung (Live Streaming)",
      shortTitle: "Live Streaming",
      summary: showLiveStream ? "Aktif" : "Nonaktif",
    },
    {
      id: "sec12",
      title: (!invitation?.eventType || invitation?.eventType === "WEDDING") ? "Filter Instagram (Wedding Frame AR)" : "Filter Instagram (Frame AR)",
      shortTitle: "Filter Instagram",
      summary: showFilter ? "Aktif" : "Nonaktif",
    },
    {
      id: "sec13",
      title: "Turut Mengundang & Himbauan Tamu",
      shortTitle: "Turut Mengundang",
      summary: showTurutMengundang ? "Aktif" : "Nonaktif",
    },
    {
      id: "sec14",
      title: "Galeri Kenangan Tamu (After-Event)",
      shortTitle: "Kenangan Tamu",
      summary: getFeatureSetting("showGuestMemories", true) ? "Live Photo Drop" : "Nonaktif",
      hide: !hasCap("guest_memories"),
    },
    {
      id: "sec15",
      title: "Pengaturan Teks UI & Label",
      shortTitle: "Pengaturan Label",
      summary: "Hitung mundur & teks tombol",
    },
    {
      id: "sec16",
      title: (!invitation?.eventType || invitation?.eventType === "WEDDING") ? "Mitra & Vendor Pernikahan (Wedding Credits)" : "Mitra & Vendor Acara (Credits)",
      shortTitle: (!invitation?.eventType || invitation?.eventType === "WEDDING") ? "Vendor Pernikahan" : "Vendor Acara",
      summary: getFeatureSetting("showVendors", false)
        ? `${(() => {
            const raw = getFeatureSetting("vendors", []);
            let list = [];
            if (Array.isArray(raw)) list = raw;
            else if (typeof raw === "string") {
              try { list = JSON.parse(raw); } catch {}
            }
            return Array.isArray(list) ? list.length : 0;
          })()} Vendor`
        : "Nonaktif",
    },
  ];

  // Nomor seksi mengikuti seksi yang tampil; seksi tersembunyi (kisah cinta non-pernikahan, fitur paket) tidak meninggalkan celah.
  const visibleSections = FORM_SECTIONS.filter((s) => !s.hide).map((s, i) => ({ ...s, num: String(i + 1) }));
  const sectionHeading = (id: string) => {
    const sec = visibleSections.find((s) => s.id === id);
    return sec ? `${sec.num}. ${sec.title}` : "";
  };

  const renderSectionNavFooter = (currentSecId: string) => {
    const idx = visibleSections.findIndex((s) => s.id === currentSecId);
    if (idx === -1) return null;
    const prevSec = idx > 0 ? visibleSections[idx - 1] : null;
    const nextSec = idx < visibleSections.length - 1 ? visibleSections[idx + 1] : null;

    return (
      <div className="flex items-center justify-between gap-3 pt-5 mt-6 border-t border-stone-100">
        {prevSec ? (
          <button
            type="button"
            onClick={() => handleSelectSection(prevSec.id)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{prevSec.num}. {prevSec.shortTitle}</span>
          </button>
        ) : <div />}

        {nextSec ? (
          <button
            type="button"
            onClick={() => handleSelectSection(nextSec.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-900 hover:bg-amber-950 transition flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
          >
            <span>Lanjut ke Seksi {nextSec.num}: {nextSec.shortTitle}</span>
            <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : <div />}
      </div>
    );
  };

  const studioCtx: StudioEditorContextValue = {
    feedback, invitationId, invitation, setInvitation, media, events, stories, bankList,
    loading, saving, savingSec, isUploading, savedSnapshot, playingAudioUrl, uploadingAudio,
    audioUploadError, setAudioUploadError, platformSettings, themesList, themesLoading,
    musicPresets, musicLoading, upgradeModal, setUpgradeModal, upgradeTarget, setUpgradeTarget,
    upgrading, upgradeError, eventTypeModalOpen, setEventTypeModalOpen, selectedEventType,
    setSelectedEventType, selectedFreeSubEvent, setSelectedFreeSubEvent, freeSubCustomMode,
    setFreeSubCustomMode, changingEventType, eventTypeError, PLAN_HIERARCHY, packageOf,
    upgradeDiff, handleChangeInvitationMode, changingSubEvent, customSubEventDraft,
    setCustomSubEventDraft, subEventCustomOpen, setSubEventCustomOpen, handleSwitchSubEvent,
    handleUpgrade, activeStudioTab, previewDevice, selectedThemeCategory, setSelectedThemeCategory,
    selectedPersonalThemeSub, setSelectedPersonalThemeSub, liveMobileIframeRef, liveDesktopIframeRef,
    liveFallbackIframeRef, liveSingleIframeRef, liveIframeKey, setLiveIframeKey, isCanvasFullscreen,
    liveCanvasRef, toggleCanvasFullscreen, broadcastToAllLiveIframes, activeSectionTab,
    showManualHex, setShowManualHex, themeSyncSuccess, setThemeSyncSuccess, togglePlayPreview,
    handleAudioUpload, handleUploadStart, handleUploadEnd, collapsed, toggleSection, saveSection,
    updateField, updateWeddingField, weddingValue, updateMedia, slotUsed, updateFeatureSetting,
    getFeatureSetting, updateCustomLabel, getCustomLabel, isDirty, revertAllChanges, addEvent,
    removeEvent, setAsPrimaryEvent, updateEventItem, handleTimeFieldChange, addStory, removeStory,
    updateStoryItem, addBank, removeBank, updateBankItem, updateParticipantData, selectedThemeObj,
    activeBlueprint, themeFallbackMusicUrl, displayOrder, planType, hasCap, showMusic, showStory,
    showGallery, showGift, showDresscode, showQrCheckin, showLiveStream, showFilter, bgPhotoTone,
    bgScrim, showTurutMengundang, isWeddingEvent, eventNounLabel, unusedSlotPhotos, unfilledSlots,
    sectionHeading, renderSectionNavFooter,
  };

  return (
    <ThemeSlotsContext.Provider value={declaredSlots}>
    <StudioEditorProvider value={studioCtx}>
    <div className="w-full space-y-2.5 sm:space-y-3 pb-24 font-sans">
      
      {/* Emergency Unlock Banner with Atomic Single Deploy */}
      {invitation.isEmergencyUnlocked && (
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-amber-50/90 to-amber-100/60 border-2 border-amber-300/80 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-900">Akses Kunci Darurat Aktif</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-amber-950">
              Mode Perbaikan Data Undangan
            </h2>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              Administrator telah membuka izin edit darurat hingga <strong>{invitation.unlockExpiresAt ? new Date(invitation.unlockExpiresAt).toLocaleString('id-ID') : "24 Jam kedepan"}</strong>. Silakan lakukan perubahan data yang dibutuhkan di formulir bawah ini. Setelah selesai, klik tombol di samping untuk menerapkan pembaruan ke website tamu dan mengunci kembali studio secara otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDeployAndLock}
              disabled={isDeploying || saving}
              className={`px-5 py-3 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer ${
                isDeploying
                  ? "bg-amber-900/80 text-amber-100 cursor-not-allowed"
                  : "bg-amber-900 hover:bg-amber-950 text-white"
              }`}
            >
              {isDeploying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Mengupdate Publikasi...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Update Publikasi &amp; Kunci Kembali</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Free Draft Banner */}
      {invitation?.isFreeDraft && (
        <FreeDraftBanner compact createdAt={invitation.createdAt} />
      )}

      {/* Unified Studio Control & Header Card */}
      <div className="bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-xs border-b sm:border border-stone-200 overflow-hidden">
        {/* Tier 1: Title, Couple Info, Badges & Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 px-3.5 py-3 sm:px-6 sm:py-3.5">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase block">Studio Editor Undangan</span>
            <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 mt-0.5 leading-snug">
              {resolveInvitationDisplayName(invitation)}
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-stone-500">
                Tema: {selectedThemeObj ? (
                  <strong className="text-amber-900 font-bold capitalize">{selectedThemeObj.name}</strong>
                ) : (
                  <strong className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">Belum Memilih Tema</strong>
                )}
              </span>
              {invitation?.isFreeDraft ? (
                <>
                  <span className="text-stone-300">•</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-amber-50 text-amber-900 border-amber-300">
                    Draf Gratis
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-stone-50 text-stone-700 border-stone-200">
                    {BUILDER_EVENT_LABELS[(invitation.eventType || "WEDDING") as BuilderEventType] ?? invitation.eventType}
                    {invitation.subEvent ? ` · ${invitation.subEvent}` : ""}
                  </span>
                  {Array.isArray(platformSettings?.enabledEventTypes) && platformSettings.enabledEventTypes.length > 1 && invitation.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEventType(invitation.eventType || "WEDDING");
                        setSelectedFreeSubEvent(invitation.subEvent || "");
                        setFreeSubCustomMode(false);
                        setEventTypeError(null);
                        setEventTypeModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-stone-700 hover:text-stone-950 border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 px-2 py-0.5 rounded-full transition cursor-pointer"
                    >
                      Ganti Mode Acara
                    </button>
                  )}
                  <Link
                    href="/packages"
                    className="text-[10px] font-bold text-amber-950 hover:text-stone-900 border border-amber-300 hover:border-amber-400 bg-amber-100/80 hover:bg-amber-200/70 px-2.5 py-0.5 rounded-full transition"
                  >
                    Aktifkan Paket
                  </Link>
                </>
              ) : planType && (
                <>
                  <span className="text-stone-300">•</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${PLAN_COLOR[planType] || "bg-stone-50 text-stone-700 border-stone-200"}`}>
                    {getPlanDisplayName(planType, platformSettings?.packages)}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-stone-50 text-stone-700 border-stone-200">
                    {BUILDER_EVENT_LABELS[(invitation.eventType || "WEDDING") as BuilderEventType] ?? invitation.eventType}
                    {invitation.subEvent ? ` · ${invitation.subEvent}` : ""}
                  </span>
                  {Array.isArray(platformSettings?.enabledEventTypes) && platformSettings.enabledEventTypes.length > 1 && invitation.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEventType(invitation.eventType || "WEDDING");
                        setSelectedFreeSubEvent(invitation.subEvent || "");
                        setFreeSubCustomMode(false);
                        setEventTypeError(null);
                        setEventTypeModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-stone-700 hover:text-stone-950 border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 px-2 py-0.5 rounded-full transition cursor-pointer"
                    >
                      Ganti Mode Acara
                    </button>
                  )}
                  {planType !== "TIER_3" && (
                    <button
                      type="button"
                      onClick={() => {
                        setUpgradeTarget(null);
                        setUpgradeError(null);
                        setUpgradeModal(true);
                      }}
                      className="text-[10px] font-bold text-amber-900 hover:text-stone-900 border border-amber-300 hover:border-amber-400 bg-amber-50/80 hover:bg-amber-100 px-2 py-0.5 rounded-full transition flex items-center gap-1 cursor-pointer"
                    >
                      <svg className="w-3 h-3 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                      Upgrade
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Status Badge */}
            <div className="px-2.5 sm:px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-1.5">
              {saving ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
                  <span>Menyimpan...</span>
                </span>
              ) : isUploading ? (
                <span className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                  <span>Mengunggah...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{lastSaved || "Siap diedit"}</span>
                </span>
              )}
            </div>

            <a
              href={`/api/client/invitations/${invitationId}/preview?mode=preview`}
              target="_blank"
              rel="noreferrer"
              className="px-3 sm:px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <span className="hidden sm:inline">Buka di Tab Baru</span>
              <span className="sm:hidden">Tab Baru</span>
              <svg className="w-3.5 h-3.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Tier 2: Dual Native Mode Switcher & Quick Action Toolbar */}
        <div className="border-t border-stone-100 bg-stone-50/50 px-3 py-2 sm:px-5 sm:py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          {/* Sliding Magnetic Pill Track (Dual-Native: Form Data vs Live Editor) */}
          <div className="relative flex items-center bg-stone-200/70 p-1 rounded-xl border border-stone-200/80 w-full sm:w-auto shrink-0">
            {/* Animated Magnetic Sliding Pill Thumb — 2 tabs */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] sm:w-[125px] rounded-lg shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                activeStudioTab === "form" ? "left-1 bg-stone-900" : "left-1/2 sm:left-[129px] bg-amber-800"
              }`}
            />

            <button
              type="button"
              onClick={() => handleStudioTabClick("form")}
              className={`relative z-10 flex-1 sm:w-[125px] py-2.5 sm:py-1.5 px-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeStudioTab === "form" ? "text-white" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <svg className={`w-3.5 h-3.5 transition-colors shrink-0 ${activeStudioTab === "form" ? "text-amber-400" : "text-stone-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Form Data</span>
            </button>

            <button
              type="button"
              onClick={() => handleStudioTabClick("live")}
              className={`relative z-10 flex-1 sm:w-[125px] py-2.5 sm:py-1.5 px-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeStudioTab === "live" ? "text-white" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <svg className={`w-3.5 h-3.5 transition-colors shrink-0 ${activeStudioTab === "live" ? "text-amber-300" : "text-stone-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Live Editor</span>
            </button>
          </div>

          {/* Dynamic Action Chips (Pengingat Foto Ringkas & Terpadu) — Hanya di Tab Form Data */}
          {activeStudioTab === "form" && Boolean(invitation.themeId) && (needsCoverPhoto || needsPortraitPhoto) && (
            <div className="flex items-center justify-between sm:justify-end gap-2 border-t border-stone-200/60 sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto px-1 sm:px-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50/90 border border-amber-200/70 px-2 py-1 rounded-lg shrink-0">
                <svg className="w-3 h-3 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Perlu:
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {needsCoverPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudioTab("form");
                      handleSelectSection("sec2");
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-300/80 font-semibold rounded-lg text-[11px] transition cursor-pointer shadow-2xs"
                  >
                    + Sampul
                  </button>
                )}
                {needsPortraitPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudioTab("form");
                      handleSelectSection("sec3");
                    }}
                    className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg text-[11px] transition cursor-pointer shadow-2xs"
                  >
                    {(!invitation?.eventType || invitation?.eventType === "WEDDING") ? "+ Foto Mempelai" : "+ Foto Profil"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Controls di Tab Live Editor */}
          {activeStudioTab === "live" && (
            <div className="flex items-center justify-end gap-2 pr-1">

              <div className="hidden sm:flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    previewDevice === "mobile" ? "bg-white text-stone-900 shadow-2xs font-bold" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    previewDevice === "desktop" ? "bg-white text-stone-900 shadow-2xs font-bold" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("dual")}
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    previewDevice === "dual" ? "bg-white text-stone-900 shadow-2xs font-bold" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span>Keduanya</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLiveIframeKey((k) => k + 1);
                }}
                title="Muat Ulang Canvas"
                className="p-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-700 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              <button
                type="button"
                onClick={toggleCanvasFullscreen}
                title={isCanvasFullscreen ? "Keluar Mode Layar Penuh (Esc)" : "Mode Layar Penuh (Fullscreen)"}
                className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                  isCanvasFullscreen
                    ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                    : "bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700"
                }`}
              >
                {isCanvasFullscreen ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7m-7-17v6m0 0h6m-6 0L21 3M10 10V4m0 6H4m0 0l7-7" />
                    </svg>
                    <span className="hidden sm:inline">Keluar Penuh</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span className="hidden sm:inline">Layar Penuh</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Banner Wajib Pilih Tema Jika Belum Memilih */}
      {!invitation.themeId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0 mt-0.5 sm:mt-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-950">Tahap Wajib: Pilih Desain Tema Undangan</h2>
              <p className="text-xs text-amber-800 mt-0.5">
                Undangan Anda saat ini belum memiliki tema terpilih. Silakan buka <strong>Seksi 1 (Pilihan Desain Tema)</strong> untuk memilih desain yang diinginkan sebelum mempublikasikan undangan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveStudioTab("form");
              handleSelectSection("sec1");
            }}
            className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white font-bold rounded-xl text-xs transition shadow-xs flex-shrink-0 cursor-pointer"
          >
            Pilih Tema Sekarang
          </button>
        </div>
      )}

      <StudioLiveWorkspace />

      {/* ==========================================================================
         TWO-COLUMN MASTER-DETAIL STUDIO (FORM EDITOR)
         ========================================================================== */}
      <div
        className="flex flex-col lg:flex-row items-start gap-5 lg:gap-6 w-full"
        style={{ display: activeStudioTab === "form" ? "" : "none" }}
      >
          
          {/* ── LEFT COLUMN: SECTION NAVIGATOR (STICKY ON DESKTOP) ── */}
          <aside className="w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-20 z-10">
            {/* Mobile / Tablet Horizontal Scrollable Pills (< lg) */}
            <div className="lg:hidden bg-white/95 backdrop-blur-md px-3.5 py-2 sm:p-2.5 rounded-none sm:rounded-2xl border-b sm:border border-stone-200 shadow-none sm:shadow-xs mb-2.5 sm:mb-3 sticky top-0 sm:top-14 z-20">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-stone-500 uppercase tracking-wider">Navigasi Seksi Form</span>
                <span className="text-[11px] text-amber-900 font-semibold truncate max-w-[200px]">
                  {visibleSections.find(s => s.id === activeSectionTab)?.num}. {visibleSections.find(s => s.id === activeSectionTab)?.shortTitle}
                </span>
              </div>
              <div className="relative">
                <div ref={sectionPillStripRef} className="relative flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pr-6">
                  {visibleSections.map((sec) => {
                    const isActive = activeSectionTab === sec.id;
                    const isSecDirty = Boolean((isDirty as Record<string, boolean>)[sec.id]);
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        data-active={isActive}
                        onClick={() => handleSelectSection(sec.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-amber-900 text-white shadow-xs"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                          isActive ? "bg-amber-800 text-amber-100" : "bg-stone-200 text-stone-700"
                        }`}>
                          {sec.num}
                        </span>
                        <span>{sec.shortTitle}</span>
                        {isSecDirty && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Visual Scroll Shadow on Right */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-white to-transparent" />
              </div>
            </div>

            {/* Desktop Vertical Sidebar Navigator (>= lg) */}
            <div className="hidden lg:flex flex-col bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden max-h-[calc(100vh-6.5rem)]">
              {/* Sidebar Header */}
              <div className="p-3.5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">Daftar Seksi Form</h2>
                  <p className="text-[11px] text-stone-500 mt-0.5">{visibleSections.length} modul kustomisasi</p>
                </div>
                <div className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md">
                  {visibleSections.findIndex(s => s.id === activeSectionTab) + 1} / {visibleSections.length}
                </div>
              </div>

              {/* Scrollable Section Item List */}
              <nav aria-label="Seksi Undangan" className="p-2 space-y-1 overflow-y-auto flex-1 divide-y divide-stone-50">
                {visibleSections.map((sec) => {
                  const isActive = activeSectionTab === sec.id;
                  const isSecDirty = Boolean((isDirty as Record<string, boolean>)[sec.id]);
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleSelectSection(sec.id)}
                      className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2.5 cursor-pointer group ${
                        isActive
                          ? "bg-amber-50/90 text-amber-950 border border-amber-300/80 shadow-2xs font-semibold"
                          : "hover:bg-stone-50 text-stone-600 border border-transparent"
                      }`}
                    >
                      {/* Section Number Badge */}
                      <span className={`w-5 h-5 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition ${
                        isActive
                          ? "bg-amber-900 text-white shadow-2xs"
                          : "bg-stone-100 text-stone-600 group-hover:bg-stone-200"
                      }`}>
                        {sec.num}
                      </span>

                      {/* Title & Dynamic Summary */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-bold leading-tight truncate ${
                            isActive ? "text-amber-950" : "text-stone-800 group-hover:text-stone-900"
                          }`}>
                            {sec.shortTitle}
                          </p>
                          {isSecDirty ? (
                            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" title="Ada perubahan belum disimpan" />
                          ) : sec.isUrgent ? (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1 py-0.2 rounded shrink-0">Perlu</span>
                          ) : null}
                        </div>
                        <p className={`text-[11px] leading-tight truncate mt-0.5 ${
                          isActive ? "text-amber-800/80" : "text-stone-400 group-hover:text-stone-500"
                        }`}>
                          {sec.summary}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Sidebar Footer Hint */}
              <div className="p-2.5 border-t border-stone-100 bg-stone-50/50 text-center">
                <span className="text-[10px] text-stone-400">Pilih seksi di atas untuk mengedit isian di kanan</span>
              </div>
            </div>
          </aside>

          {/* ── RIGHT COLUMN: ACTIVE SECTION DETAIL FORM ── */}
          <main className="w-full flex-1 min-w-0 space-y-4 pb-24 sm:pb-0">

      <StudioThemeAndCoverSections />
      <StudioProfileAndQuoteSections />
      <StudioEventsAndCheckinSections />
      <StudioStoryGalleryGiftSections />
      <StudioExtrasSections />
      <StudioTextAndVendorSections />

          </main>

          {/* Mobile Floating Sticky Quick-Save Bar (Aktif khusus layar mobile saat berada di form tab) */}
          <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 bg-stone-900/95 backdrop-blur-md border border-stone-800 text-white p-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200">
            <div className="min-w-0 pl-1.5">
              <p className="text-xs font-bold text-stone-100 truncate">
                {visibleSections.find((s) => s.id === activeSectionTab)?.num}. {visibleSections.find((s) => s.id === activeSectionTab)?.shortTitle}
              </p>
              <p className="text-[10px] text-stone-400 truncate mt-0.5">
                {Boolean((isDirty as Record<string, boolean>)[activeSectionTab]) ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Ada perubahan belum disimpan
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <svg className="w-3 h-3 text-emerald-400 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    Data tersimpan aman
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveSection(activeSectionTab)}
              disabled={saving || !Boolean((isDirty as Record<string, boolean>)[activeSectionTab])}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                Boolean((isDirty as Record<string, boolean>)[activeSectionTab])
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md active:scale-95"
                  : "bg-stone-800 text-stone-500 cursor-not-allowed"
              }`}
            >
              {saving && savingSec === activeSectionTab ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Seksi</span>
              )}
            </button>
          </div>
        </div>



      <StudioModals />

      {/* Studio Action Notification Toast (Fixed Viewport, Minimalist SaaS) */}
      {studioNotification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[80] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border bg-white/95 backdrop-blur-md max-w-md animate-in slide-in-from-bottom-3 duration-200"
          style={{ borderColor: studioNotification.type === "error" ? "#fecdd3" : "#a7f3d0" }}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${studioNotification.type === "error" ? "bg-rose-500" : "bg-emerald-500"}`} />
          <p className="text-xs font-semibold text-stone-800 leading-snug flex-1">{studioNotification.message}</p>
          <button
            type="button"
            onClick={() => setStudioNotification(null)}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition cursor-pointer shrink-0 ml-1"
            title="Tutup pesan"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

    </div>
    </StudioEditorProvider>
    </ThemeSlotsContext.Provider>
  );
}