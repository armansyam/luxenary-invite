"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { compressImageToWebP } from "@/lib/clientImageCompressor";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { getPlanDisplayName } from "@/lib/planUtils";

// Pilihan tema dimuat secara dinamis dari API /api/public/themes untuk menjamin sinkronisasi status aktif


const COLOR_PALETTES = [
  { id: "champagne", name: "Royal Champagne Gold", hex: "#a67c52", desc: "Elegan, netral, universal mewah" },
  { id: "emerald", name: "Emerald Green & Gold", hex: "#1b4332", desc: "Nuansa agung khas Bugis-Makassar / Islami" },
  { id: "burgundy", name: "Burgundy & Rose Gold", hex: "#54192b", desc: "Megah, klasik, dan romantis berani" },
  { id: "sage", name: "Botanical Sage Green", hex: "#4a5d4e", desc: "Segar, earthy, dan organik kekinian" },
  { id: "terracotta", name: "Warm Terracotta & Sand", hex: "#8c583a", desc: "Hangat, rustic modern, dan estetik" },
  { id: "monochrome", name: "Monochrome Dark & Silver", hex: "#262626", desc: "Minimalis editorial hitam-putih" },
];

// Preset Palet Busana Pernikahan Populer (1-Klik untuk Pengguna Awam)
const WEDDING_DRESSCODE_PRESETS = [
  {
    name: "Earthy Terracotta",
    category: "Rustic & Warm",
    colors: ["#8b4513", "#c86d51", "#dfc9b8", "#fbf7f4"],
  },
  {
    name: "Sage & Champagne",
    category: "Botanical Nature",
    colors: ["#4a5d4e", "#8f9779", "#d4af37", "#fbf9f5"],
  },
  {
    name: "Dusty Rose & Blush",
    category: "Romantic Pastel",
    colors: ["#a36367", "#d9a5b3", "#ead8cd", "#ffffff"],
  },
  {
    name: "Royal Navy & Gold",
    category: "Grand & Classic",
    colors: ["#1b2a4a", "#415a77", "#d4af37", "#f0ebd8"],
  },
  {
    name: "Emerald Luxury",
    category: "Royal Heritage",
    colors: ["#0f4336", "#2d6a4f", "#c5a059", "#f7f5f0"],
  },
  {
    name: "Modern Monochrome",
    category: "Minimalist Chic",
    colors: ["#1a1a1a", "#4a4a4a", "#b0b0b0", "#ffffff"],
  },
  {
    name: "Sogan Batik Nusantara",
    category: "Traditional Heritage",
    colors: ["#4a2c11", "#8c5827", "#c99700", "#f5efe6"],
  },
  {
    name: "Sunset Lilac & Peach",
    category: "Contemporary Sweet",
    colors: ["#795578", "#a77b96", "#e8b4b8", "#fbf5f3"],
  },
];

// Pemetaan Warna Palet Harmonis Berdasarkan Tema Fisik Aktif
const THEME_DRESSCODE_MAP: Record<string, { name: string; colors: string[] }> = {
  candani: { name: "Pesona Emas & Cokelat Jawa", colors: ["#8b6f38", "#2a2012", "#f5ebd9"] },
  solaria: { name: "Romantic Sunset Terracotta", colors: ["#a85d42", "#dfc9b8", "#fbf7f4"] },
  artisan: { name: "Editorial Noir & Earthy Bronze", colors: ["#1a1a1a", "#8c7355", "#f5f0ea"] },
  kalandra: { name: "Warm Amber, Sand & Cream", colors: ["#a85d42", "#d4a373", "#fefae0"] },
  aurelia: { name: "Royal Gold & Classic Black", colors: ["#bfa15f", "#1a1a1a", "#ffffff"] },
  valente: { name: "Classic Navy & Slate Blue", colors: ["#2c3e50", "#7f8c8d", "#ecf0f1"] },
  badrika: { name: "Saoraja Muted Earth Brown", colors: ["#6e5849", "#b08968", "#ede0d4"] },
  mayang: { name: "Heritage Bronze & Ivory", colors: ["#3d342d", "#8d7b68", "#f5efe6"] },
  prameswari: { name: "Keraton Green & Heritage Gold", colors: ["#4a5d4e", "#d4af37", "#fdfbf7"] },
  lagaligo: { name: "Bugis Emerald & Royal Gold", colors: ["#003f30", "#f9e7bc", "#059669"] },
  dillalucky: { name: "Emerald Islamic Batik & Gold", colors: ["#0f2b23", "#c5a059", "#fbfaf7"] },
  lumina: { name: "Golden Glass & Modern Bronze", colors: ["#b5833c", "#261b11", "#faf6f0"] },
  chronicle: { name: "Vogue High-Fashion Monochrome", colors: ["#09090b", "#e5e7eb", "#ffffff"] },
  papercut: { name: "Kraft Paper Clay & Terracotta", colors: ["#a8583c", "#d97736", "#fbf7f4"] },
  wave: { name: "Dramatic Obsidian & Silver", colors: ["#0d0d0f", "#d8cebe", "#f4eee6"] },
  ameera: { name: "Heritage Dark Modern Gray", colors: ["#736b5e", "#c2b69d", "#faf8f5"] },
};

const EVENT_PRESETS = [
  "Akad Nikah",
  "Resepsi Pernikahan",
  "Mappacci / Korontigi",
  "Mapparola",
  "Mappasili",
  "Pemberkatan Nikah",
  "Syukuran & Pengajian",
  "Custom Sesi Khusus",
];

function formatIndonesianDatePreview(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = clean.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      }
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    return dateStr;
  } catch {
    return dateStr || "";
  }
}

export default function EditInvitation() {
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
  const [isDeploying, setIsDeploying] = useState(false);
  const [showLivePalette, setShowLivePalette] = useState(false);
  const [studioNotification, setStudioNotification] = useState<{ type: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    if (!studioNotification) return;
    const timer = setTimeout(() => {
      setStudioNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [studioNotification]);

  const PLAN_HIERARCHY: Record<string, number> = { TIER_1: 1, TIER_2: 2, TIER_3: 3 };
  const PLAN_PRICES: Record<string, number> = {
    TIER_1: Number(
      platformSettings?.packages?.find((p: any) => p.id === "TIER_1")?.price ??
      platformSettings?.pricing?.price_tier1 ?? 49000
    ),
    TIER_2: Number(
      platformSettings?.packages?.find((p: any) => p.id === "TIER_2")?.price ??
      platformSettings?.pricing?.price_tier2 ?? 99000
    ),
    TIER_3: Number(
      platformSettings?.packages?.find((p: any) => p.id === "TIER_3")?.price ??
      platformSettings?.pricing?.price_tier3 ?? 149000
    ),
  };
  const PLAN_COLOR: Record<string, string> = {
    TIER_1: "bg-amber-50 text-amber-800 border-amber-200",
    TIER_2: "bg-stone-100 text-stone-800 border-stone-200",
    TIER_3: "bg-amber-100/70 text-amber-950 border-amber-300",
  };
  const PLAN_FEATURES: Record<string, string[]> = {
    TIER_2: ["Akses semua tema desain pilihan", "Dilengkapi QR Check-in Resepsionis", "Kamera Saku Digital Tamu (250 Foto)"],
    TIER_3: ["Akses seluruh tema tanpa batas", "Termasuk Custom Domain Pribadi (.com / .id)", "Kamera Tamu Kuota Maksimal (1.000 Foto)", "Prioritas Akses Server"],
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

        const parseJ = (v: any, def: any) => {
          if (!v) return def;
          if (typeof v === "object") return v;
          try {
            return JSON.parse(v);
          } catch {
            return def;
          }
        };

        const ev = parseJ(inv.eventData, []);
        const rawList = Array.isArray(ev) ? ev : [];
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
        setEvents(loadedEvents);

        const st = parseJ(inv.loveStory, []);
        const loadedStories = Array.isArray(st) ? st : [];
        setStories(loadedStories);

        const bk = parseJ(inv.bankAccounts, []);
        const loadedBanks = Array.isArray(bk) ? bk : [];
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
  const saveSection = async (secKey?: string, overrideInvitation?: any) => {
    const invToSave = overrideInvitation || invitation;
    if (!invToSave || saving) return;
    setSaving(true);
    setSavingSec(secKey || null);
    try {
      const payload = {
        ...invToSave,
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

      // Update saved snapshot to current state
      setSavedSnapshot({
        invitation: JSON.parse(JSON.stringify(invToSave)),
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
    } catch (err: any) {
      console.error("Save failed:", err);
      setStudioNotification({
        type: "error",
        message: err?.message || "Terjadi kendala saat menyimpan data ke server. Silakan coba lagi.",
      });
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

  const updateMedia = (slot: string, url: string) => {
    setMedia((prev) => ({ ...prev, [slot]: url }));
  };

  const updateFeatureSetting = (key: string, value: any) => {
    setInvitation((prev: any) => {
      let current = {};
      try {
        current = typeof prev.featureSettings === "object" ? prev.featureSettings : JSON.parse(prev.featureSettings || "{}");
      } catch {
        current = {};
      }
      return {
        ...prev,
        featureSettings: {
          ...current,
          [key]: value,
        },
      };
    });
    broadcastToAllLiveIframes({ type: "LUX_REMOTE_EDIT_CHANGE", field: key, value });
  };

  const applyPaletteToIframe = useCallback((paletteId: string) => {
    const palTokens: Record<string, { primary: string; secondary: string; accent: string; bgLight: string; bgDark: string }> = {
      champagne: { primary: "#a67c52", secondary: "#7a5430", accent: "#b38b4d", bgLight: "#faf7f2", bgDark: "#1a1614" },
      emerald: { primary: "#1b4332", secondary: "#2d6a4f", accent: "#c9a227", bgLight: "#f2f7f4", bgDark: "#0b1c14" },
      burgundy: { primary: "#54192b", secondary: "#7a253f", accent: "#d4a373", bgLight: "#faf2f4", bgDark: "#1c070e" },
      sage: { primary: "#4a5d4e", secondary: "#627d68", accent: "#b89f81", bgLight: "#f1f5f2", bgDark: "#141c16" },
      terracotta: { primary: "#8c583a", secondary: "#a86b47", accent: "#c99a57", bgLight: "#fdf8f4", bgDark: "#1c120c" },
      monochrome: { primary: "#262626", secondary: "#404040", accent: "#737373", bgLight: "#f8f8f8", bgDark: "#121212" },
    };
    const t = palTokens[paletteId] || palTokens.champagne;

    const applyToDoc = (iframeEl: HTMLIFrameElement | null) => {
      if (!iframeEl) return;
      try {
        if (iframeEl.contentDocument) {
          const doc = iframeEl.contentDocument;
          const targets = [doc.body, doc.documentElement].filter(Boolean);
          targets.forEach((el) => {
            el.style.setProperty("--gold", t.primary);
            el.style.setProperty("--gold-dim", t.secondary);
            el.style.setProperty("--gold-pale", t.bgLight);
            el.style.setProperty("--primary", t.primary);
            el.style.setProperty("--secondary", t.secondary);
            el.style.setProperty("--accent", t.accent);
            el.style.setProperty("--bg-light", t.bgLight);
            el.style.setProperty("--bg-dark", t.bgDark);
          });
        }
      } catch {}

      try {
        if (iframeEl.contentWindow) {
          iframeEl.contentWindow.postMessage(
            {
              type: "LUX_PALETTE_CHANGED",
              paletteId,
              palette: t,
            },
            "*"
          );
        }
      } catch {}
    };

    applyToDoc(liveMobileIframeRef.current);
    applyToDoc(liveDesktopIframeRef.current);
    applyToDoc(liveFallbackIframeRef.current);
    applyToDoc(liveSingleIframeRef.current);
  }, []);

  const handleSelectPalette = (paletteId: string) => {
    updateFeatureSetting("colorPalette", paletteId);
    applyPaletteToIframe(paletteId);
  };

  const getFeatureSetting = (key: string, fallback: any = "") => {
    if (!invitation?.featureSettings) return fallback;
    try {
      const parsed = typeof invitation.featureSettings === "object" ? invitation.featureSettings : JSON.parse(invitation.featureSettings);
      return parsed[key] !== undefined ? parsed[key] : fallback;
    } catch {
      return fallback;
    }
  };

  const getSavedFeatureSetting = (key: string, fallback: any = "") => {
    if (!savedSnapshot?.invitation?.featureSettings) return fallback;
    try {
      const parsed = typeof savedSnapshot.invitation.featureSettings === "object"
        ? savedSnapshot.invitation.featureSettings
        : JSON.parse(savedSnapshot.invitation.featureSettings);
      return parsed[key] !== undefined ? parsed[key] : fallback;
    } catch {
      return fallback;
    }
  };

  const updateCustomLabel = (key: string, value: string) => {
    setInvitation((prev: any) => {
      let currentFs: any = {};
      try {
        currentFs = typeof prev.featureSettings === "object" ? prev.featureSettings : JSON.parse(prev.featureSettings || "{}");
      } catch {
        currentFs = {};
      }
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
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "LUX_INLINE_EDIT_CHANGE") {
        const { field, value, senderRole } = e.data;
        if (!field) return;

        if (field.startsWith("customLabels.")) {
          const labelKey = field.replace("customLabels.", "");
          setInvitation((prev: any) => {
            let currentFs: any = {};
            try {
              currentFs = typeof prev.featureSettings === "object" ? prev.featureSettings : JSON.parse(prev.featureSettings || "{}");
            } catch {
              currentFs = {};
            }
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
        } else {
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
        saveSection();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation, events, stories, bankList, media, relayToSiblingLiveIframes]);

  // Precise Per-Section Dirty State Tracking
  const isDirty = useMemo(() => {
    if (!savedSnapshot || !invitation) {
      return {
        sec1: false, sec2: false, sec3: false, sec4: false, sec5: false,
        sec6: false, sec7: false, sec8: false, sec9: false, sec10: false,
        sec11: false, sec12: false, sec13: false, sec14: false, sec15: false,
      };
    }

    // Sec 1: Tema, Warna & Tagline
    const dirty1 = (
      invitation.themeId !== savedSnapshot.invitation?.themeId ||
      getFeatureSetting("colorPalette", "champagne") !== getSavedFeatureSetting("colorPalette", "champagne") ||
      getFeatureSetting("weddingTagline", "THE WEDDING OF") !== getSavedFeatureSetting("weddingTagline", "THE WEDDING OF")
    );

    // Sec 2: Sampul & Visual
    const dirty2 = (
      JSON.stringify(media) !== JSON.stringify(savedSnapshot.media || {}) ||
      (invitation.musicUrl || "") !== (savedSnapshot.invitation?.musicUrl || "") ||
      Boolean(getFeatureSetting("showMusic", true)) !== Boolean(getSavedFeatureSetting("showMusic", true))
    );

    // Sec 3: Profil Mempelai
    const dirty3 = (
      (invitation.groomName || "") !== (savedSnapshot.invitation?.groomName || "") ||
      (invitation.brideName || "") !== (savedSnapshot.invitation?.brideName || "") ||
      (invitation.groomNickname || "") !== (savedSnapshot.invitation?.groomNickname || "") ||
      (invitation.brideNickname || "") !== (savedSnapshot.invitation?.brideNickname || "") ||
      (invitation.groomParents || "") !== (savedSnapshot.invitation?.groomParents || "") ||
      (invitation.groomFather || "") !== (savedSnapshot.invitation?.groomFather || "") ||
      (invitation.groomMother || "") !== (savedSnapshot.invitation?.groomMother || "") ||
      (invitation.brideParents || "") !== (savedSnapshot.invitation?.brideParents || "") ||
      (invitation.brideFather || "") !== (savedSnapshot.invitation?.brideFather || "") ||
      (invitation.brideMother || "") !== (savedSnapshot.invitation?.brideMother || "") ||
      (invitation.groomInstagram || "") !== (savedSnapshot.invitation?.groomInstagram || "") ||
      (invitation.brideInstagram || "") !== (savedSnapshot.invitation?.brideInstagram || "") ||
      getFeatureSetting("displayOrder", "BRIDE_FIRST") !== getSavedFeatureSetting("displayOrder", "BRIDE_FIRST") ||
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
      Boolean(getFeatureSetting("showStory", true)) !== Boolean(getSavedFeatureSetting("showStory", true))
    );

    // Sec 8: Galeri & Video
    const dirty8 = (
      getFeatureSetting("videoGalleryUrl", "") !== getSavedFeatureSetting("videoGalleryUrl", "") ||
      getFeatureSetting("galleryDriveFolderUrl", "") !== getSavedFeatureSetting("galleryDriveFolderUrl", "") ||
      getFeatureSetting("galleryPhotosList", "") !== getSavedFeatureSetting("galleryPhotosList", "") ||
      Boolean(getFeatureSetting("showGallery", true)) !== Boolean(getSavedFeatureSetting("showGallery", true))
    );

    // Sec 9: Rekening & Hadiah
    const dirty9 = (
      JSON.stringify(bankList) !== JSON.stringify(savedSnapshot.bankList || []) ||
      (invitation.shippingAddress || "") !== (savedSnapshot.invitation?.shippingAddress || "") ||
      getFeatureSetting("qrisImageUrl", "") !== getSavedFeatureSetting("qrisImageUrl", "") ||
      Boolean(getFeatureSetting("showGift", true)) !== Boolean(getSavedFeatureSetting("showGift", true))
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
      (invitation.liveStreamUrl || "") !== (savedSnapshot.invitation?.liveStreamUrl || "") ||
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
    const dirty15 = (() => {
      try {
        const curFs = typeof invitation.featureSettings === "object" ? invitation.featureSettings : JSON.parse(invitation.featureSettings || "{}");
        const prevFs = typeof savedSnapshot.invitation?.featureSettings === "object" ? savedSnapshot.invitation.featureSettings : JSON.parse(savedSnapshot.invitation?.featureSettings || "{}");
        return JSON.stringify(curFs.customLabels || {}) !== JSON.stringify(prevFs.customLabels || {});
      } catch {
        return false;
      }
    })();

    const dirty14 = (
      Boolean(getFeatureSetting("showGuestMemories", true)) !== Boolean(getSavedFeatureSetting("showGuestMemories", true)) ||
      getFeatureSetting("memoriesFilter", "aura_90s") !== getSavedFeatureSetting("memoriesFilter", "aura_90s") ||
      Boolean(getFeatureSetting("memoriesDateStamp", true)) !== Boolean(getSavedFeatureSetting("memoriesDateStamp", true)) ||
      getFeatureSetting("memoriesDateFormat", "DD MM 'YY") !== getSavedFeatureSetting("memoriesDateFormat", "DD MM 'YY") ||
      Number(getFeatureSetting("memoriesShotsQuota", 5)) !== Number(getSavedFeatureSetting("memoriesShotsQuota", 5)) ||
      Number(getFeatureSetting("memoriesMaxContributors", 100)) !== Number(getSavedFeatureSetting("memoriesMaxContributors", 100)) ||
      Boolean(getFeatureSetting("memoriesDelayedReveal", false)) !== Boolean(getSavedFeatureSetting("memoriesDelayedReveal", false)) ||
      Boolean(getFeatureSetting("memoriesCustomSchedule", false)) !== Boolean(getSavedFeatureSetting("memoriesCustomSchedule", false)) ||
      getFeatureSetting("memoriesStartTime", "") !== getSavedFeatureSetting("memoriesStartTime", "") ||
      getFeatureSetting("memoriesEndTime", "") !== getSavedFeatureSetting("memoriesEndTime", "") ||
      getFeatureSetting("guestMemoriesDriveFolderUrl", "") !== getSavedFeatureSetting("guestMemoriesDriveFolderUrl", "") ||
      getCustomLabel("memoriesTitle", "Abadikan Momen Indah") !== getSavedCustomLabel("memoriesTitle", "Abadikan Momen Indah") ||
      getCustomLabel("memoriesEyebrow", "AFTER-EVENT MEMORIES") !== getSavedCustomLabel("memoriesEyebrow", "AFTER-EVENT MEMORIES") ||
      getCustomLabel("memoriesSubtitle", "") !== getSavedCustomLabel("memoriesSubtitle", "")
    );

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation, media, events, stories, bankList, savedSnapshot]);

  const hasAnyDirty = Object.values(isDirty).some(Boolean);

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
    setEvents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "date" && typeof value === "string" && value.length === 10) {
        return sortEventsChronologically(next);
      }
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
      { bank: "BCA", number: "", name: invitation.groomName || "" },
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

  const currentPalette = getFeatureSetting("colorPalette", "champagne");
  const displayOrder = getFeatureSetting("displayOrder", "BRIDE_FIRST");

  const currentThemeId = invitation.themeId === "kila" ? "kalandra" : (invitation.themeId || "");
  const selectedThemeObj = currentThemeId ? (themesList.find((t) => t.id === currentThemeId) || null) : null;
  const selectedPaletteObj = COLOR_PALETTES.find((p) => p.id === currentPalette) || COLOR_PALETTES[0];
  const activeBlueprint = getThemeBlueprint(currentThemeId || "kalandra");

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
  const showTurutMengundang = getFeatureSetting("showTurutMengundang", true);
  const showGuestMemoriesGlobal = hasCap("guest_memories") && getFeatureSetting("showGuestMemories", true);
  if (invitation.isLocked && !invitation.isEmergencyUnlocked) {
    const isPublishedLock = invitation.lockReason === "PUBLISHED" || (!invitation.lockReason && (invitation.status === "PUBLISHED" || invitation.status === "EVENT_FINISHED"));
    const coupleName = displayOrder === "BRIDE_FIRST"
      ? `${invitation.brideNickname || invitation.brideName || "Mempelai Wanita"} & ${invitation.groomNickname || invitation.groomName || "Mempelai Pria"}`
      : `${invitation.groomNickname || invitation.groomName || "Mempelai Pria"} & ${invitation.brideNickname || invitation.brideName || "Mempelai Wanita"}`;

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
              <span>{isPublishedLock ? "Terkunci Pasca Publikasi" : "Studio Terkunci Permanen"}</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
              {isPublishedLock ? "Studio Editor Terkunci" : "Studio Terkunci Permanen"}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {isPublishedLock
                ? `Undangan resmi ${coupleName} saat ini telah aktif mengudara. Untuk melindungi keutuhan data dan keterhubungan QR Code fisik yang telah disebar kepada para tamu, form editor dikunci secara otomatis.`
                : "Acara telah lewat dan undangan ini kini berstatus Published Forever sebagai portofolio. Akses edit telah ditutup untuk menjaga keaslian arsip."}
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
          </div>
        </div>
      </div>
    );
  }

  const FORM_SECTIONS = [
    {
      id: "sec1",
      num: "1",
      title: "Pilihan Seri Desain & Palet Warna",
      shortTitle: "Tema & Warna",
      summary: selectedThemeObj ? `${selectedThemeObj.name} (${selectedPaletteObj.name})` : "Belum memilih tema",
      isUrgent: !invitation?.themeId,
    },
    {
      id: "sec2",
      num: "2",
      title: "Sampul, Visual & Musik Latar",
      shortTitle: "Sampul & Musik",
      summary: media["LANDING_COVER"] ? "Sampul Terpasang" : "Belum ada sampul kustom",
      isUrgent: !media["LANDING_COVER"],
    },
    {
      id: "sec3",
      num: "3",
      title: "Profil Kedua Mempelai",
      shortTitle: "Profil Mempelai",
      summary: (invitation?.groomNickname || invitation?.brideNickname) ? `${invitation?.groomNickname || "Pria"} & ${invitation?.brideNickname || "Wanita"}` : "Nama belum lengkap",
      isUrgent: !media["GROOM_PHOTO"] || !media["BRIDE_PHOTO"],
    },
    {
      id: "sec4",
      num: "4",
      title: "Kutipan Pembuka",
      shortTitle: "Kutipan Pembuka",
      summary: invitation?.openingQuote ? "Kutipan kustom aktif" : "Bawaan blueprint tema",
    },
    {
      id: "sec5",
      num: "5",
      title: "Rangkaian Acara (Multi-Event)",
      shortTitle: "Rangkaian Acara",
      summary: events.length > 0 ? `${events.length} Sesi Acara` : "Belum ada acara",
    },
    {
      id: "sec6",
      num: "6",
      title: "Kartu Akses QR & Check-In Tamu",
      shortTitle: "Kartu Akses QR",
      summary: showQrCheckin ? "Aktif (QR Pass)" : "Nonaktif",
      hide: !hasCap("qr_checkin"),
    },
    {
      id: "sec7",
      num: "7",
      title: "Kisah Cinta (Journey of Love)",
      shortTitle: "Kisah Cinta",
      summary: showStory ? `${stories.length} Babak Cerita` : "Nonaktif",
    },
    {
      id: "sec8",
      num: "8",
      title: "Galeri Foto Pre-Wedding & Video Teaser",
      shortTitle: "Galeri & Video",
      summary: showGallery ? (getFeatureSetting("galleryDriveFolderUrl", "") ? "Drive Stream CDN" : "Grid Dinamis") : "Nonaktif",
    },
    {
      id: "sec9",
      num: "9",
      title: "Tanda Kasih & Amplop Digital",
      shortTitle: "Amplop Digital",
      summary: showGift ? `${bankList.length} Rekening Terdaftar` : "Nonaktif",
    },
    {
      id: "sec10",
      num: "10",
      title: "Panduan Busana (Dress Code Guide)",
      shortTitle: "Panduan Busana",
      summary: showDresscode ? (invitation.dresscode || "Aktif") : "Nonaktif",
    },
    {
      id: "sec11",
      num: "11",
      title: "Siaran Langsung (Live Streaming)",
      shortTitle: "Live Streaming",
      summary: showLiveStream ? "Aktif" : "Nonaktif",
    },
    {
      id: "sec12",
      num: "12",
      title: "Filter Instagram (Wedding Frame AR)",
      shortTitle: "Filter Instagram",
      summary: showFilter ? "Aktif" : "Nonaktif",
    },
    {
      id: "sec13",
      num: "13",
      title: "Turut Mengundang & Himbauan Tamu",
      shortTitle: "Turut Mengundang",
      summary: showTurutMengundang ? "Aktif" : "Nonaktif",
    },
    {
      id: "sec14",
      num: "14",
      title: "Galeri Kenangan Tamu (After-Event)",
      shortTitle: "Kenangan Tamu",
      summary: getFeatureSetting("showGuestMemories", true) ? "Live Photo Drop" : "Nonaktif",
      hide: !hasCap("guest_memories"),
    },
    {
      id: "sec15",
      num: "15",
      title: "Pengaturan Teks UI & Label",
      shortTitle: "Pengaturan Label",
      summary: "Hitung mundur & teks tombol",
    },
  ];

  const visibleSections = FORM_SECTIONS.filter((s) => !s.hide);

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

  return (
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
                  <span>Memperbarui Online...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Perbarui Undangan &amp; Kunci Kembali</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Post-Event Permanent Lock Banner */}
      {invitation.isLocked && (
        <div className="p-5 bg-stone-900 text-white rounded-2xl sm:rounded-3xl border border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Periode Acara Berakhir - Retensi 30 Hari</h3>
              <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                Tanggal acara pernikahan telah terlewati. Form editor dikunci. Data tamu dan foto akan dibersihkan dalam 30 hari pasca-acara. Mohon segera unduh foto Anda.
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/${adminWhatsapp.replace(/\D/g, '').replace(/^0/, '62')}?text=Halo%20Admin,%20mohon%20bantuan%20buka%20kunci%20darurat%20undangan%20saya`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 flex-shrink-0 shadow-sm"
          >
            <span>Hubungi Admin</span>
            
          </a>
        </div>
      )}

      {/* Unified Studio Control & Header Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200 overflow-hidden">
        {/* Tier 1: Title, Couple Info, Badges & Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase block">Studio Editor Undangan</span>
            <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 mt-0.5 leading-snug">
              {displayOrder === "BRIDE_FIRST" ? `${invitation.brideNickname || "Mempelai Wanita"} & ${invitation.groomNickname || "Mempelai Pria"}` : `${invitation.groomNickname || "Mempelai Pria"} & ${invitation.brideNickname || "Mempelai Wanita"}`}
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-stone-500">
                Tema: {selectedThemeObj ? (
                  <strong className="text-amber-900 font-bold capitalize">{selectedThemeObj.name}</strong>
                ) : (
                  <strong className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">Belum Memilih Tema</strong>
                )}
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500">
                Nuansa: <strong className="text-stone-800 font-bold">{selectedPaletteObj.name}</strong>
              </span>
              {planType && (
                <>
                  <span className="text-stone-300">•</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${PLAN_COLOR[planType] || "bg-stone-50 text-stone-700 border-stone-200"}`}>
                    {planType}
                  </span>
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
            <div className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-1.5">
              {saving ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
                  <span>Menyimpan...</span>
                </span>
              ) : isUploading ? (
                <span className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                  <span>Mengunggah media...</span>
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
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Buka di Tab Baru</span>
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
              className={`relative z-10 flex-1 sm:w-[125px] py-1.5 px-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
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
              className={`relative z-10 flex-1 sm:w-[125px] py-1.5 px-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
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
          {activeStudioTab === "form" && Boolean(invitation.themeId) && (!media["GROOM_PHOTO"] || !media["BRIDE_PHOTO"] || !media["LANDING_COVER"]) && (
            <div className="flex items-center justify-between sm:justify-end gap-2 border-t border-stone-200/60 sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto px-1 sm:px-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50/90 border border-amber-200/70 px-2 py-1 rounded-lg shrink-0">
                <svg className="w-3 h-3 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Perlu:
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {!media["LANDING_COVER"] && (
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
                {(!media["GROOM_PHOTO"] || !media["BRIDE_PHOTO"]) && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudioTab("form");
                      handleSelectSection("sec3");
                    }}
                    className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg text-[11px] transition cursor-pointer shadow-2xs"
                  >
                    + Foto Mempelai
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Controls di Tab Live Editor */}
          {activeStudioTab === "live" && (
            <div className="flex items-center justify-end gap-2 pr-1">
              <button
                type="button"
                onClick={() => setShowLivePalette((prev) => !prev)}
                className={`h-9 px-2.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  showLivePalette
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                }`}
                title={`Palet: ${selectedPaletteObj.name} (Klik untuk ${showLivePalette ? "menutup" : "mengubah"})`}
                aria-label={`Palet: ${selectedPaletteObj.name}`}
              >
                <svg className="w-3.5 h-3.5 opacity-75 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3a9 9 0 00-9 9c0 4.97 4.03 9 9 9 1.1 0 2-.9 2-2 0-.46-.17-.89-.46-1.22-.29-.33-.46-.76-.46-1.22 0-1.1.9-2 2-2h2.5c3.59 0 6.5-2.91 6.5-6.5C21 6.48 16.97 3 12 3z" />
                  <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
                  <circle cx="12" cy="7.5" r="1" fill="currentColor" />
                  <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
                </svg>
                <span
                  className="w-3 h-3 rounded-full border border-black/15 shadow-xs flex-shrink-0"
                  style={{ backgroundColor: selectedPaletteObj.hex }}
                />
                <svg className={`w-3 h-3 transition-transform duration-200 ${showLivePalette ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs">
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
                Undangan Anda saat ini belum memiliki tema terpilih. Silakan buka <strong>Seksi 1 (Tema Desain &amp; Palet Warna)</strong> untuk memilih desain yang diinginkan sebelum mempublikasikan undangan.
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

      <div
        className="space-y-2.5 sm:space-y-3"
        style={{ display: activeStudioTab === "live" ? "" : "none" }}
      >
        <div className="space-y-2.5 sm:space-y-3">
          {/* Palet Warna Sync Bar di Atas Live View (Collapsed by Default) */}
          {showLivePalette && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Pilih Nuansa Warna Utama:
                  </label>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Ubah nuansa warna secara instan tanpa perlu berpindah tab. Warna otomatis tersinkronisasi dua arah dengan form data undangan.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {isDirty.sec1 && (
                    <>
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                        Palet belum disimpan
                      </span>
                      <button
                        type="button"
                        onClick={() => saveSection("sec1")}
                        disabled={saving}
                        className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition"
                      >
                        {saving && savingSec === "sec1" ? "Menyimpan..." : "Simpan Palet"}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowLivePalette(false)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                    title="Tutup Palet"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {COLOR_PALETTES.map((pal) => {
                  const isSelected = currentPalette === pal.id;
                  return (
                    <div
                      key={pal.id}
                      onClick={() => handleSelectPalette(pal.id)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${
                        isSelected
                          ? "border-amber-800 bg-amber-50/50 ring-2 ring-amber-800/20 shadow-xs"
                          : "border-stone-200 hover:border-stone-300 bg-white"
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full shadow-inner border border-black/10 flex-shrink-0"
                        style={{ backgroundColor: pal.hex }}
                      ></span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-stone-900 truncate">{pal.name}</h4>
                        <p className="text-[10px] text-stone-500 line-clamp-1">{pal.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================================================
             LIVE VISUAL INLINE EDITOR CANVAS (CANVA / NOTION STYLE)
             ========================================================================== */}
          <div
            ref={liveCanvasRef}
            className={`bg-stone-950 border border-stone-800 shadow-xl flex flex-col items-center transition-all duration-200 ${
              isCanvasFullscreen
                ? "fixed inset-0 z-50 rounded-none w-screen h-screen p-4 sm:p-6 overflow-y-auto"
                : "rounded-3xl p-4 sm:p-8 min-h-[850px]"
            }`}
          >
            <div className="w-full flex items-center justify-between pb-4 border-b border-stone-800 mb-6 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-white font-medium">Mode Visual Click-to-Edit</span>
                <span className="text-stone-600">•</span>
                <span className="hidden sm:inline">Klik langsung teks judul, kutipan doa, atau nama untuk mengedit</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLiveIframeKey((k) => k + 1)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-medium rounded-lg text-xs transition border border-stone-800 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Muat ulang pratinjau dari server"
                >
                  <svg className="w-3.5 h-3.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Muat Ulang</span>
                </button>
                <button
                  type="button"
                  onClick={toggleCanvasFullscreen}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-medium rounded-lg text-xs transition border border-stone-800 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title={isCanvasFullscreen ? "Keluar Layar Penuh (Esc)" : "Mode Layar Penuh (Fullscreen)"}
                >
                  {isCanvasFullscreen ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7m-7-17v6m0 0h6m-6 0L21 3M10 10V4m0 6H4m0 0l7-7" />
                      </svg>
                      <span className="hidden sm:inline">Keluar Penuh</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span className="hidden sm:inline">Layar Penuh</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    broadcastToAllLiveIframes({ type: "LUX_REMOTE_OPEN_INVITATION" });
                  }}
                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-medium rounded-lg text-xs transition border border-stone-800 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Buka amplop sampul pada layar pratinjau"
                >
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Buka Amplop</span>
                </button>
                <button
                  type="button"
                  onClick={() => saveSection()}
                  disabled={saving}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Semua"}
                </button>
              </div>
            </div>

            {previewDevice === "dual" ? (
              <>
                {/* Desktop Split Dual View (>= lg) */}
                <div className={`hidden lg:flex items-start gap-6 w-full ${isCanvasFullscreen ? "flex-1 min-h-0" : ""}`}>
                  {/* Left Pane: Mobile Phone Mockup */}
                  <div className={`w-[390px] shrink-0 flex flex-col ${isCanvasFullscreen ? "h-full" : ""}`}>
                    <div className="flex items-center justify-between text-xs text-stone-400 font-medium mb-2.5 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-white font-semibold">Tampilan Ponsel</span>
                        <span className="text-stone-500 text-[11px]">(390px)</span>
                      </div>
                      <span className="text-[10px] text-stone-400 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-md">
                        Mute
                      </span>
                    </div>
                    <div className={`w-full rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-black ${
                      isCanvasFullscreen ? "h-[calc(100vh-140px)]" : "h-[780px]"
                    }`}>
                      <iframe
                        key={`m-${liveIframeKey}`}
                        ref={liveMobileIframeRef}
                        src={`/api/client/invitations/${invitationId}/preview?mode=edit&audio=0&view=mobile&v=${liveIframeKey}`}
                        onLoad={() => applyPaletteToIframe(currentPalette)}
                        className="w-full h-full border-0 bg-stone-900"
                        title="Live Visual Editor Mobile"
                      />
                    </div>
                  </div>

                  {/* Right Pane: Desktop Widescreen Mockup */}
                  <div className={`flex-1 min-w-0 flex flex-col ${isCanvasFullscreen ? "h-full" : ""}`}>
                    <div className="flex items-center justify-between text-xs text-stone-400 font-medium mb-2.5 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="text-white font-semibold">Tampilan Komputer (Layar Lebar)</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                        Audio Utama
                      </span>
                    </div>
                    <div className={`w-full rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-black ${
                      isCanvasFullscreen ? "h-[calc(100vh-140px)]" : "h-[780px]"
                    }`}>
                      <iframe
                        key={`d-${liveIframeKey}`}
                        ref={liveDesktopIframeRef}
                        src={`/api/client/invitations/${invitationId}/preview?mode=edit&view=desktop&v=${liveIframeKey}`}
                        onLoad={() => applyPaletteToIframe(currentPalette)}
                        className="w-full h-full border-0 bg-stone-900"
                        title="Live Visual Editor Desktop"
                      />
                    </div>
                  </div>
                </div>

                {/* Mobile & Tablet Fallback (< lg): Single Mobile Frame */}
                <div className="lg:hidden w-full flex justify-center">
                  <div className={`w-[390px] max-w-full rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-black ${
                    isCanvasFullscreen ? "h-[calc(100vh-140px)]" : "h-[780px]"
                  }`}>
                    <iframe
                      key={`fallback-${liveIframeKey}`}
                      ref={liveFallbackIframeRef}
                      src={`/api/client/invitations/${invitationId}/preview?mode=edit&view=mobile&v=${liveIframeKey}`}
                      onLoad={() => applyPaletteToIframe(currentPalette)}
                      className="w-full h-full border-0 bg-stone-900"
                      title="Live Visual Editor Fallback"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Single Mode (Mobile or Desktop Fullscreen) */
              <div
                className={`transition-all duration-300 rounded-2xl overflow-hidden border border-stone-700/60 shadow-2xl bg-black flex justify-center ${
                  isCanvasFullscreen
                    ? previewDevice === "mobile"
                      ? "w-[390px] h-[calc(100vh-140px)] max-w-full"
                      : "w-full h-[calc(100vh-140px)]"
                    : previewDevice === "mobile"
                    ? "w-[390px] h-[780px] max-w-full"
                    : "w-full h-[850px]"
                }`}
              >
                <iframe
                  key={`single-${liveIframeKey}`}
                  ref={liveSingleIframeRef}
                  src={`/api/client/invitations/${invitationId}/preview?mode=edit&view=${previewDevice}&v=${liveIframeKey}`}
                  onLoad={() => applyPaletteToIframe(currentPalette)}
                  className="w-full h-full border-0 bg-stone-900"
                  title="Live Visual Editor"
                />
              </div>
            )}
          </div>
        </div>
      </div>

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
            <div className="lg:hidden bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs mb-3">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Navigasi Seksi Form</span>
                <span className="text-[11px] text-amber-900 font-semibold truncate max-w-[200px]">
                  {visibleSections.find(s => s.id === activeSectionTab)?.num}. {visibleSections.find(s => s.id === activeSectionTab)?.shortTitle}
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {visibleSections.map((sec) => {
                  const isActive = activeSectionTab === sec.id;
                  const isSecDirty = Boolean((isDirty as Record<string, boolean>)[sec.id]);
                  return (
                    <button
                      key={sec.id}
                      type="button"
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
          <main className="w-full flex-1 min-w-0 space-y-4">

      {/* 1. SEKSI TEMA & PALET WARNA (SEC1) */}
      {(activeSectionTab === "sec1") && (
      <section id="section-sec1" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec1")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec1
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">1. Pilihan Seri Desain &amp; Palet Warna</h2>
              {collapsed.sec1 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  {selectedThemeObj ? (
                    <>
                      <span className="font-medium text-stone-700">{selectedThemeObj.name}</span>
                      <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/10 shadow-2xs" style={{ backgroundColor: selectedPaletteObj.hex }}></span>
                      <span className="text-stone-500">({selectedPaletteObj.name})</span>
                    </>
                  ) : (
                    <span className="font-semibold text-rose-600">Belum memilih tema</span>
                  )}
                </span>
              )}
            </div>
            {!collapsed.sec1 && (
              <p className="text-xs text-stone-500 mt-0.5">Pilih tema utama dan nuansa warna undangan pernikahan Anda.</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec1)}
              isSaving={saving && savingSec === "sec1"}
              onSave={() => saveSection("sec1")}
              collapsed={Boolean(collapsed.sec1)}
              onToggle={() => toggleSection("sec1")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec1 && (
          <div className="p-5 sm:p-7 space-y-6">
            {/* Theme Mockups for this Category / Store */}
            {(() => {
              // Seluruh tema desain bebas dipilih di semua paket (All-Access Themes)
              const availableThemes = themesList;

              // Dapatkan daftar kategori unik sesuai paket klien
              const CATEGORY_ORDER = ["PREMIUM", "MODERN", "TRADITIONAL"];
              const CATEGORY_LABELS: Record<string, string> = {
                PREMIUM: "Premium",
                MODERN: "Modern",
                TRADITIONAL: "Traditional",
              };
              const rawCats = new Set(availableThemes.map((t) => (t.category || "").toUpperCase()));
              const availableCategories = CATEGORY_ORDER.filter((c) => rawCats.has(c));

              // Tentukan kategori dari tema yang sedang aktif dipakai
              const currentTheme = themesList.find((t) => t.id === invitation?.themeId);
              const currentThemeCategory = (currentTheme?.category || "").toUpperCase();

              // Tab aktif: jika sudah dipilih dan valid gunakan pilihan user,
              // jika belum, default ke kategori tema yang sedang terpilih, atau kategori pertama
              const activeCategoryTab = (selectedThemeCategory && availableCategories.includes(selectedThemeCategory))
                ? selectedThemeCategory
                : (availableCategories.includes(currentThemeCategory) ? currentThemeCategory : (availableCategories[0] || ""));

              // Jika lebih dari 1 kategori, filter tema sesuai tab aktif
              const displayedThemes = availableCategories.length > 1
                ? availableThemes.filter((t) => (t.category || "").toUpperCase() === activeCategoryTab)
                : availableThemes;

              return (
                <div className="space-y-4">
                  {/* Tab Kategori (Hanya tampil jika klien memiliki hak akses > 1 kategori) */}
                  {availableCategories.length > 1 && (
                    <div className="flex items-center gap-1.5 p-1 bg-stone-100/90 rounded-xl w-fit border border-stone-200/80">
                      {availableCategories.map((catKey) => {
                        const isActive = activeCategoryTab === catKey;
                        const count = availableThemes.filter((t) => (t.category || "").toUpperCase() === catKey).length;
                        return (
                          <button
                            key={catKey}
                            type="button"
                            onClick={() => setSelectedThemeCategory(catKey)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              isActive
                                ? "bg-white text-amber-900 shadow-xs border border-stone-200/60"
                                : "text-stone-500 hover:text-stone-800 hover:bg-stone-200/50"
                            }`}
                          >
                            <span>{CATEGORY_LABELS[catKey] || catKey}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isActive ? "bg-amber-100 text-amber-900 font-semibold" : "bg-stone-200/80 text-stone-600"
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {(invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED") && (
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
                      <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <div>
                        <p className="font-bold text-amber-900">Desain Tema Telah Terkunci</p>
                        <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                          Pilihan desain tema dikunci secara permanen pasca publikasi demi menjaga konsistensi template HTML yang aktif. Jika Anda memerlukan penggantian tema secara darurat, silakan hubungi Administrator.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Grid Tema Ringkas */}
                  {themesLoading && themesList.length === 0 ? (
                    <div className="py-10 text-center text-stone-500 text-xs bg-stone-50/50 rounded-2xl border border-stone-200/60">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-stone-300 border-t-amber-800 mb-2" />
                      <p className="font-medium">Memuat daftar tema aktif...</p>
                    </div>
                  ) : displayedThemes.length === 0 ? (
                    <div className="py-8 text-center text-stone-500 text-xs bg-stone-50/50 rounded-2xl border border-stone-200/60">
                      <p className="font-medium">Tidak ada tema yang tersedia untuk kategori ini.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {displayedThemes.map((th) => {
                      const isSelected = Boolean(invitation.themeId) && invitation.themeId === th.id;
                      const isThemeLocked = invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED";
                      const thumbMobile = th.thumbnailMobile || `/demo/${th.id}/thumbnail_mobile.webp`;
                      const thumbDesktop = th.thumbnailDesktop || `/demo/${th.id}/thumbnail_desktop.webp`;
                      return (
                        <div
                          key={th.id}
                          onClick={() => {
                            if (!isThemeLocked) {
                              setInvitation((prev: any) => ({
                                ...prev,
                                themeId: th.id,
                              }));
                              setLiveIframeKey((k) => k + 1);
                            }
                          }}
                          className={`stp-card rounded-2xl p-3 border transition-all ${
                            isThemeLocked ? "cursor-default opacity-90" : "cursor-pointer"
                          } ${
                            isSelected
                              ? "is-selected border-amber-800 bg-amber-50/20 ring-2 ring-amber-800/15"
                              : "border-stone-200 hover:border-stone-300 bg-white"
                          }`}
                        >
                          {/* ── Device Pair Mockup ── */}
                          <div className="stp-scene">
                            {/* Tablet frame */}
                            <div className="stp-tablet">
                              <div className="stp-tablet-bar">
                                <div className="stp-tablet-dots">
                                  <span/><span/><span/>
                                </div>
                                <div className="stp-tablet-url">
                                  luxenary.id/{th.id}
                                </div>
                                <div style={{ width: "18px" }}/>
                              </div>
                              <div className="stp-tablet-screen">
                                <img
                                  src={thumbDesktop}
                                  alt={`${th.name} desktop`}
                                  loading="lazy"
                                  onError={(e) => {
                                    const el = e.currentTarget;
                                    if (!el.src.includes("hero.webp") && !el.src.includes("cover.webp")) {
                                      el.src = `/demo/${th.id}/hero.webp`;
                                    } else if (el.src.includes("hero.webp")) {
                                      el.src = `/demo/${th.id}/cover.webp`;
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
                                  alt={`${th.name} mobile`}
                                  loading="lazy"
                                  onError={(e) => {
                                    const el = e.currentTarget;
                                    if (!el.src.includes("cover.webp")) el.src = `/demo/${th.id}/cover.webp`;
                                  }}
                                />
                                <div className="stp-glare"/>
                              </div>
                            </div>

                            {/* Selected tick */}
                            {isSelected && (
                              <span className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold shadow-md">
                                ✓
                              </span>
                            )}
                          </div>

                          {/* ── Theme Info ── */}
                          <div className="space-y-1 mt-0.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">{th.series}</p>
                              <span className={`text-[9px] font-bold ${isSelected ? "text-amber-900" : "text-stone-400"}`}>
                                {isSelected ? "Terpilih" : isThemeLocked ? "Terkunci" : ""}
                              </span>
                            </div>
                            <h3 className="font-bold text-stone-900 text-xs leading-tight">{th.name}</h3>
                            <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">{th.desc}</p>
                            <a
                              href={`/demo/${th.id}`}
                              target="_blank"
                              rel="noreferrer"
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

                  )}
                </div>
              );
            })()}

            {/* Color Palette Grid */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5">Pilih Nuansa Warna Utama:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {COLOR_PALETTES.map((pal) => {
                  const isSelected = currentPalette === pal.id;
                  return (
                    <div
                      key={pal.id}
                      onClick={() => handleSelectPalette(pal.id)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${
                        isSelected
                          ? "border-amber-800 bg-amber-50/50 ring-2 ring-amber-800/20"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <span className="w-7 h-7 rounded-full shadow-inner border border-black/10 flex-shrink-0" style={{ backgroundColor: pal.hex }}></span>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">{pal.name}</h4>
                        <p className="text-[10px] text-stone-500">{pal.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tagline / Judul Header Undangan */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-900">Tagline / Label Header Undangan</label>
                <p className="text-[10px] text-stone-500">Teks pembuka di atas nama kedua mempelai pada sampul &amp; kartu undangan</p>
              </div>
              <input
                type="text"
                value={getFeatureSetting("weddingTagline", "THE WEDDING OF")}
                onChange={(e) => updateFeatureSetting("weddingTagline", e.target.value)}
                placeholder="THE WEDDING OF"
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 uppercase tracking-wider"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-stone-500 font-medium">Pilihan Cepat:</span>
                {["THE WEDDING OF", "WALIMATUL 'URS", "THE WEDDING CELEBRATION", "HOLY MATRIMONY", "PAWIWAHAN", "UNDANGAN PERNIKAHAN"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => updateFeatureSetting("weddingTagline", tag)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-900 border border-stone-200 rounded-lg text-[10px] font-semibold transition cursor-pointer text-stone-600"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Section Save Button */}
            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec1")}
                disabled={saving || !isDirty.sec1}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec1
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec1 ? "Tersimpan" : "Simpan Tema & Warna"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec1")}
          </div>
        )}
      </section>
      )}

      {/* 2. SEKSI SAMPUL & VISUAL UTAMA (SEC2) */}
      {(activeSectionTab === "sec2") && (
      <section id="section-sec2" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec2")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec2
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">2. Sampul, Visual &amp; Musik Latar</h2>
              {collapsed.sec2 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span>{media["LANDING_COVER"] ? "Sampul Kustom" : "Sampul Tema"}</span>
                  <span className="text-stone-300">•</span>
                  <span>Musik: <strong className="font-medium text-stone-700">{showMusic ? (invitation.musicUrl || musicPresets.length > 0 ? "Aktif" : "Bawaan Tema") : "Nonaktif"}</strong></span>
                </span>
              )}
            </div>
            {!collapsed.sec2 && (
              <p className="text-xs text-stone-500 mt-0.5">Foto sampul pop-up, visual desktop widescreen, dan musik latar otomatis</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec2)}
              isSaving={saving && savingSec === "sec2"}
              onSave={() => saveSection("sec2")}
              collapsed={Boolean(collapsed.sec2)}
              onToggle={() => toggleSection("sec2")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec2 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PhotoInput
                label="Cover Pembuka Mobile — Portrait 9:16"
                desc="Foto/Video PORTRAIT (9:16) — Cover pop-up saat tamu buka undangan di HP. Idealnya foto kepala-kaki 9:16 atau 4:5."
                value={media["LANDING_COVER"] || ""}
                onChange={(url) => updateMedia("LANDING_COVER", url)}
                placeholder="https://.../cover-mobile.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="LANDING_COVER"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Cover Pembuka Desktop — Landscape 16:9 (Opsional)"
                desc="Foto/Video LANDSCAPE (16:9) — Cover pop-up khusus layar PC/Laptop fullscreen. Jika kosong, otomatis pakai Cover Mobile."
                value={media["LANDING_COVER_DESKTOP"] || ""}
                onChange={(url) => updateMedia("LANDING_COVER_DESKTOP", url)}
                placeholder="https://.../cover-desktop.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="LANDING_COVER_DESKTOP"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Latar Home — Portrait/Square (Opsional)"
                desc="Foto/Video PORTRAIT atau SQUARE — Background seksi pembuka setelah undangan dibuka. Jika kosong, pakai kanvas bawaan tema."
                value={media["HOME_PHOTO"] || ""}
                onChange={(url) => updateMedia("HOME_PHOTO", url)}
                placeholder="https://.../home-bg.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="HOME_PHOTO"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Hero Kiri Desktop — Bebas (Opsional)"
                desc="Foto/Video BEBAS (square, landscape, portrait) — Panel kiri layar lebar. Ukuran panel = sisa layar setelah 460px kartu undangan di kanan. Semua rasio foto otomatis menyesuaikan tanpa distorsi."
                value={media["DESKTOP_SIDEBAR"] || ""}
                onChange={(url) => updateMedia("DESKTOP_SIDEBAR", url)}
                placeholder="https://.../sidebar-hero.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="DESKTOP_SIDEBAR"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Penutup / Footer — Portrait/Square (Opsional)"
                desc="Foto/Video PORTRAIT atau SQUARE — Background seksi penutup undangan. Jika kosong, pakai desain penutup bawaan tema."
                value={media["CLOSING_COVER"] || ""}
                onChange={(url) => updateMedia("CLOSING_COVER", url)}
                placeholder="https://.../closing.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="CLOSING_COVER"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Latar Belakang Global — Portrait/Bebas (Opsional)"
                desc="Foto/Video PORTRAIT atau bebas — Fixed canvas di balik seluruh kartu undangan. Jika kosong, pakai wallpaper/warna bawaan tema."
                value={media["GLOBAL_FIXED_BG"] || ""}
                onChange={(url) => updateMedia("GLOBAL_FIXED_BG", url)}
                placeholder="https://.../fixed-bg.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="GLOBAL_FIXED_BG"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />

              {/* Panduan Orientasi & Format Media Visual */}
              <div className="md:col-span-3 p-4 rounded-xl border border-stone-200/90 bg-stone-50/80 text-stone-700 text-xs space-y-2">
                <div className="flex items-center gap-2 text-stone-900 font-semibold">
                  <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Panduan Orientasi &amp; Format Media Visual</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-stone-600 pt-1">
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
                    <span className="font-bold text-stone-800 block mb-1">Cover Mobile — Portrait 9:16</span>
                    <span className="font-semibold text-amber-700">Cover Pembuka Mobile</span> — foto/video vertikal fullscreen layar ponsel. Idealnya foto prewedding portrait 9:16 atau 4:5.
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
                    <span className="font-bold text-stone-800 block mb-1">Cover Desktop — Landscape 16:9</span>
                    <span className="font-semibold text-amber-700">Cover Pembuka Desktop</span> — foto/video horizontal fullscreen monitor. Idealnya foto prewedding outdoor sinematik. Jika kosong, pakai Cover Mobile.
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
                    <span className="font-bold text-stone-800 block mb-1">Hero Kiri Desktop — Bebas (Otomatis)</span>
                    Panel kiri = sisa layar setelah <span className="font-semibold text-stone-800">kartu undangan 460px</span> di kanan. Foto apa pun (landscape, square, portrait) otomatis menyesuaikan via <code className="bg-stone-100 px-1 rounded">background-size: cover</code> tanpa distorsi.
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
                    <span className="font-bold text-stone-800 block mb-1">Kartu Undangan — Fixed 460px</span>
                    Isi undangan di <span className="font-semibold text-stone-800">kanan selalu 460px</span> seperti mobile, tidak berubah seberapa pun lebar monitor. Semua slot lain (Home, Penutup, BG) portrait/bebas.
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200/70 sm:col-span-2">
                    <span className="font-bold text-stone-800 block mb-1">Format &amp; Video Loop</span>
                    Foto: JPG/PNG/WebP maks {Number(platformSettings?.max_photo_upload_mb) || 15} MB. Video: MP4/MOV maks {Number(platformSettings?.max_video_upload_mb) || 50} MB, durasi ideal 10–20 detik (dipotong otomatis &gt; 20 detik), tanpa audio (dihapus otomatis agar autoplay instan).
                  </div>
                </div>
              </div>
            </div>

            {/* Musik Latar Pernikahan */}
            <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/80 bg-amber-50/30 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Musik Latar Pernikahan (Audio Background)</h3>
                  <p className="text-[11px] text-stone-500">Audio yang otomatis diputar saat tamu menekan tombol &ldquo;Buka Undangan&rdquo;</p>
                </div>
                <SectionHeaderToggle
                  label=""
                  checked={showMusic}
                  onChange={(v) => updateFeatureSetting("showMusic", v)}
                />
              </div>

              {showMusic && (
                <div className="space-y-4">
                  {/* Current Active Music Bar */}
                  <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const currentMusicUrl = invitation.musicUrl || musicPresets[0]?.url || "";
                        const isPlaying = playingAudioUrl === currentMusicUrl && Boolean(currentMusicUrl);
                        return (
                          <button
                            type="button"
                            onClick={() => currentMusicUrl && togglePlayPreview(currentMusicUrl)}
                            disabled={!currentMusicUrl}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition shrink-0 cursor-pointer disabled:opacity-40 ${
                              isPlaying
                                ? "bg-amber-800 ring-2 ring-amber-600 animate-pulse"
                                : "bg-stone-900 hover:bg-stone-800"
                            }`}
                            title={isPlaying ? "Jeda Musik" : "Dengarkan Musik"}
                          >
                            {isPlaying ? (
                              <span className="text-xs font-bold">❚❚</span>
                            ) : (
                              <span className="text-xs font-bold ml-0.5">▶</span>
                            )}
                          </button>
                        );
                      })()}
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Lagu Terpasang:</span>
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {musicPresets.find((p) => p.url === invitation.musicUrl)?.title ||
                            (invitation.musicUrl?.includes("uploads/invitations")
                              ? "File Musik Khusus (Upload Sendiri)"
                              : invitation.musicUrl?.includes("youtube.com") || invitation.musicUrl?.includes("youtu.be")
                              ? "Lagu dari YouTube"
                              : invitation.musicUrl
                              ? "Musik Kustom (Tautan Eksternal)"
                              : (musicPresets[0]?.title || "Belum ada musik dipilih"))}
                        </p>
                        <span className="text-[10px] text-stone-500 block truncate">
                          {musicPresets.find((p) => p.url === invitation.musicUrl)?.genre ||
                            (invitation.musicUrl ? invitation.musicUrl : (musicPresets[0]?.genre || "Pustaka Musik Sistem"))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Upload Option */}
                  <div className={`p-3.5 bg-white rounded-xl border border-dashed transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${audioUploadError ? "border-rose-300 bg-rose-50/30" : "border-amber-800/40"}`}>
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Upload File Musik (.mp3 / .m4a)</span>
                      <span className="text-[11px] text-stone-500">Pilih lagu dari laptop atau HP Anda (Maksimal 20 MB)</span>
                    </div>
                    <label className={`px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer ${uploadingAudio ? "opacity-60 cursor-not-allowed" : ""}`}>
                      {uploadingAudio ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>Upload Lagu (.mp3)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/*"
                        className="sr-only"
                        onChange={handleAudioUpload}
                        disabled={uploadingAudio}
                      />
                    </label>
                  </div>

                  {audioUploadError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
                      <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-rose-900 leading-tight">Gagal Mengunggah Lagu</p>
                        <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">{audioUploadError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAudioUploadError(null)}
                        className="text-rose-400 hover:text-rose-700 p-0.5 rounded transition cursor-pointer"
                        title="Tutup pesan"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Curated Presets Selection */}
                  <div>
                    <span className="block text-[11px] font-bold text-stone-700 mb-2">Atau Pilih Lagu Pernikahan Pilihan dari Sistem:</span>
                    {musicLoading ? (
                      <div className="p-6 text-center bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500">
                        <div className="w-5 h-5 border-2 border-stone-300 border-t-amber-800 rounded-full animate-spin mx-auto mb-2" />
                        <span>Memuat pustaka musik...</span>
                      </div>
                    ) : musicPresets.length === 0 ? (
                      <div className="p-4 text-center bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500">
                        Belum ada koleksi musik sistem aktif. Anda dapat mengunggah file musik sendiri di atas.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {musicPresets.map((preset) => {
                          const currentSelectedUrl = invitation.musicUrl || musicPresets[0]?.url || "";
                          const isSelected = currentSelectedUrl === preset.url;
                          const isPlaying = playingAudioUrl === preset.url;

                          return (
                            <div
                              key={preset.id}
                              className={`p-3 rounded-xl border transition flex items-center justify-between gap-2.5 ${
                                isSelected
                                  ? "border-amber-800 bg-amber-50/80 ring-1 ring-amber-800/40"
                                  : "border-stone-200 bg-white hover:border-stone-300"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => togglePlayPreview(preset.url)}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] transition shrink-0 cursor-pointer ${
                                    isPlaying ? "bg-amber-800 animate-pulse" : "bg-stone-800 hover:bg-stone-700"
                                  }`}
                                  title="Dengarkan Contoh"
                                >
                                  {isPlaying ? "❚❚" : "▶"}
                                </button>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-stone-900 truncate">{preset.title}</h4>
                                  <p className="text-[10px] text-stone-500 truncate">{preset.genre || preset.composer || "Pustaka Sistem"}</p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  updateField("musicUrl", preset.url);
                                  updateFeatureSetting("musicUrl", preset.url);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer ${
                                  isSelected
                                    ? "bg-amber-800 text-white"
                                    : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                                }`}
                              >
                                {isSelected ? "✓ Terpilih" : "Pilih"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Custom URL Option */}
                  <div className="pt-2 border-t border-amber-200/50">
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Atau Gunakan Tautan Audio Kustom (MP3 / YouTube):</label>
                    <input
                      type="url"
                      value={invitation.musicUrl || ""}
                      onChange={(e) => {
                        updateField("musicUrl", e.target.value);
                        updateFeatureSetting("musicUrl", e.target.value);
                      }}
                      placeholder="https://domain.com/audio/wedding-song.mp3 atau https://youtube.com/watch?v=..."
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec2")}
                disabled={saving || isUploading || uploadingAudio || !isDirty.sec2}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  isUploading || uploadingAudio
                    ? "bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed"
                    : !isDirty.sec2
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{saving ? "Menyimpan..." : isUploading || uploadingAudio ? "Sedang Mengunggah..." : !isDirty.sec2 ? "Tersimpan" : "Simpan Sampul & Musik"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec2")}
          </div>
        )}
      </section>
      )}

      {/* 3. SEKSI PROFIL MEMPELAI (SEC3) */}
      {(activeSectionTab === "sec3") && (
      <section id="section-sec3" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec3")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec3
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">3. Profil Kedua Mempelai</h2>
              {collapsed.sec3 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className="font-medium text-stone-700">
                    {displayOrder === "BRIDE_FIRST"
                      ? `${invitation.brideNickname || "Wanita"} & ${invitation.groomNickname || "Pria"}`
                      : `${invitation.groomNickname || "Pria"} & ${invitation.brideNickname || "Wanita"}`}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec3 && (
              <p className="text-xs text-stone-500 mt-0.5">Data lengkap, akun sosial media, dan foto portrait pengantin</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec3)}
              isSaving={saving && savingSec === "sec3"}
              onSave={() => saveSection("sec3")}
              collapsed={Boolean(collapsed.sec3)}
              onToggle={() => toggleSection("sec3")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec3 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200 self-start sm:self-auto w-fit">
              <button
                type="button"
                onClick={() => updateFeatureSetting("displayOrder", "BRIDE_FIRST")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  displayOrder === "BRIDE_FIRST"
                    ? "bg-white text-rose-900 shadow-xs border border-stone-200/80"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Mempelai Wanita Dahulu
              </button>
              <button
                type="button"
                onClick={() => updateFeatureSetting("displayOrder", "GROOM_FIRST")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  displayOrder === "GROOM_FIRST"
                    ? "bg-white text-amber-900 shadow-xs border border-stone-200/80"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Mempelai Pria Dahulu
              </button>
            </div>

            <div className="space-y-5">
              {displayOrder === "BRIDE_FIRST" ? (
                <>
                  {/* Card Data Mempelai Wanita */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-rose-200/80 bg-rose-50/20 space-y-4">
                    <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                      <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">Mempelai Wanita (The Bride) — Tampil Pertama</h3>
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">Pihak Mengundang</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Nama Lengkap Wanita *" value={invitation.brideName || ""} onChange={(v) => updateField("brideName", v)} placeholder="Masukkan nama lengkap mempelai wanita" />
                      <Input label="Nama Panggilan Wanita" value={invitation.brideNickname || ""} onChange={(v) => updateField("brideNickname", v)} placeholder="Masukkan panggilan wanita" />
                      <Input label="Nama Ayah (Mempelai Wanita)" value={invitation.brideFather || ""} onChange={(v) => updateField("brideFather", v)} placeholder="Contoh: Tomm Posma / Alm. Tomm Posma / Bpk. Tomm Posma" />
                      <Input label="Nama Ibu (Mempelai Wanita)" value={invitation.brideMother || ""} onChange={(v) => updateField("brideMother", v)} placeholder="Contoh: Endang Noffiyanti / Almh. Endang Noffiyanti / Ibu Endang Noffiyanti" />
                      <Input label="Username Instagram Wanita" value={invitation.brideInstagram || ""} onChange={(v) => updateField("brideInstagram", v)} placeholder="usernameig (tanpa @)" />
                    </div>
                  </div>

                  {/* Card Data Mempelai Pria */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                      <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Mempelai Pria (The Groom)</h3>
                      <span className="text-[10px] font-bold bg-stone-200/70 text-stone-800 px-2.5 py-0.5 rounded-full">Pria</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Nama Lengkap Pria *" value={invitation.groomName || ""} onChange={(v) => updateField("groomName", v)} placeholder="Masukkan nama lengkap mempelai pria" />
                      <Input label="Nama Panggilan Pria" value={invitation.groomNickname || ""} onChange={(v) => updateField("groomNickname", v)} placeholder="Masukkan panggilan pria" />
                      <Input label="Nama Ayah (Mempelai Pria)" value={invitation.groomFather || ""} onChange={(v) => updateField("groomFather", v)} placeholder="Contoh: Arif Yaniadi / Alm. Arif Yaniadi / Bpk. Arif Yaniadi" />
                      <Input label="Nama Ibu (Mempelai Pria)" value={invitation.groomMother || ""} onChange={(v) => updateField("groomMother", v)} placeholder="Contoh: Yuni Widiastuti / Almh. Yuni Widiastuti / Ibu Yuni Widiastuti" />
                      <Input label="Username Instagram Pria" value={invitation.groomInstagram || ""} onChange={(v) => updateField("groomInstagram", v)} placeholder="usernameig (tanpa @)" />
                    </div>
                  </div>

                  {/* Foto Portrait Berdampingan di Bagian Bawah */}
                  <div className="pt-1 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-stone-900">Foto Portrait Kedua Mempelai</h3>
                        <p className="text-[10px] text-stone-500">Foto portrait khusus masing-masing mempelai</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PhotoInput
                        label="Foto Portrait Mempelai Wanita"
                        desc="Foto portrait khusus mempelai wanita"
                        value={media["BRIDE_PHOTO"] || ""}
                        onChange={(url) => updateMedia("BRIDE_PHOTO", url)}
                        placeholder="https://.../bride-portrait.jpg"
                        invitationId={invitationId}
                        slot="BRIDE_PHOTO"
                        onUploadStart={handleUploadStart}
                        onUploadEnd={handleUploadEnd}
                      />
                      <PhotoInput
                        label="Foto Portrait Mempelai Pria"
                        desc="Foto portrait khusus mempelai pria"
                        value={media["GROOM_PHOTO"] || ""}
                        onChange={(url) => updateMedia("GROOM_PHOTO", url)}
                        placeholder="https://.../groom-portrait.jpg"
                        invitationId={invitationId}
                        slot="GROOM_PHOTO"
                        onUploadStart={handleUploadStart}
                        onUploadEnd={handleUploadEnd}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Card Data Mempelai Pria */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                      <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">Mempelai Pria (The Groom) — Tampil Pertama</h3>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">Pihak Mengundang</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Nama Lengkap Pria *" value={invitation.groomName || ""} onChange={(v) => updateField("groomName", v)} placeholder="Masukkan nama lengkap mempelai pria" />
                      <Input label="Nama Panggilan Pria" value={invitation.groomNickname || ""} onChange={(v) => updateField("groomNickname", v)} placeholder="Masukkan panggilan pria" />
                      <Input label="Nama Ayah (Mempelai Pria)" value={invitation.groomFather || ""} onChange={(v) => updateField("groomFather", v)} placeholder="Contoh: Arif Yaniadi / Alm. Arif Yaniadi / Bpk. Arif Yaniadi" />
                      <Input label="Nama Ibu (Mempelai Pria)" value={invitation.groomMother || ""} onChange={(v) => updateField("groomMother", v)} placeholder="Contoh: Yuni Widiastuti / Almh. Yuni Widiastuti / Ibu Yuni Widiastuti" />
                      <Input label="Username Instagram Pria" value={invitation.groomInstagram || ""} onChange={(v) => updateField("groomInstagram", v)} placeholder="usernameig (tanpa @)" />
                    </div>
                  </div>

                  {/* Card Data Mempelai Wanita */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                      <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Mempelai Wanita (The Bride)</h3>
                      <span className="text-[10px] font-bold bg-stone-200/70 text-stone-800 px-2.5 py-0.5 rounded-full">Wanita</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Nama Lengkap Wanita *" value={invitation.brideName || ""} onChange={(v) => updateField("brideName", v)} placeholder="Masukkan nama lengkap mempelai wanita" />
                      <Input label="Nama Panggilan Wanita" value={invitation.brideNickname || ""} onChange={(v) => updateField("brideNickname", v)} placeholder="Masukkan panggilan wanita" />
                      <Input label="Nama Ayah (Mempelai Wanita)" value={invitation.brideFather || ""} onChange={(v) => updateField("brideFather", v)} placeholder="Contoh: Tomm Posma / Alm. Tomm Posma / Bpk. Tomm Posma" />
                      <Input label="Nama Ibu (Mempelai Wanita)" value={invitation.brideMother || ""} onChange={(v) => updateField("brideMother", v)} placeholder="Contoh: Endang Noffiyanti / Almh. Endang Noffiyanti / Ibu Endang Noffiyanti" />
                      <Input label="Username Instagram Wanita" value={invitation.brideInstagram || ""} onChange={(v) => updateField("brideInstagram", v)} placeholder="usernameig (tanpa @)" />
                    </div>
                  </div>

                  {/* Foto Portrait Berdampingan di Bagian Bawah */}
                  <div className="pt-1 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-stone-900">Foto Portrait Kedua Mempelai</h3>
                        <p className="text-[10px] text-stone-500">Foto portrait khusus masing-masing mempelai</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PhotoInput
                        label="Foto Portrait Mempelai Pria"
                        desc="Foto portrait khusus mempelai pria"
                        value={media["GROOM_PHOTO"] || ""}
                        onChange={(url) => updateMedia("GROOM_PHOTO", url)}
                        placeholder="https://.../groom-portrait.jpg"
                        invitationId={invitationId}
                        slot="GROOM_PHOTO"
                        onUploadStart={handleUploadStart}
                        onUploadEnd={handleUploadEnd}
                      />
                      <PhotoInput
                        label="Foto Portrait Mempelai Wanita"
                        desc="Foto portrait khusus mempelai wanita"
                        value={media["BRIDE_PHOTO"] || ""}
                        onChange={(url) => updateMedia("BRIDE_PHOTO", url)}
                        placeholder="https://.../bride-portrait.jpg"
                        invitationId={invitationId}
                        slot="BRIDE_PHOTO"
                        onUploadStart={handleUploadStart}
                        onUploadEnd={handleUploadEnd}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec3")}
                disabled={saving || isUploading || !isDirty.sec3}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  isUploading
                    ? "bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed"
                    : !isDirty.sec3
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{saving ? "Menyimpan..." : isUploading ? "Sedang Mengunggah Foto..." : !isDirty.sec3 ? "Tersimpan" : "Simpan Profil Mempelai"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec3")}
          </div>
        )}
      </section>
      )}

      {/* 4. SEKSI KUTIPAN PEMBUKA (SEC4) */}
      {(activeSectionTab === "sec4") && (
      <section id="section-sec4" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec4")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec4
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">4. Kutipan Pembuka</h2>
              {collapsed.sec4 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className="font-medium text-stone-700 truncate max-w-[240px] sm:max-w-md">
                    {invitation.openingQuoteRef || (invitation.openingQuote ? `"${invitation.openingQuote.slice(0, 30)}..."` : "Kutipan / Doa Pembuka")}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec4 && (
              <p className="text-xs text-stone-500 mt-0.5">Kutipan indah, puisi cinta, kata mutiara, ayat suci, atau doa pembuka undangan</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec4)}
              isSaving={saving && savingSec === "sec4"}
              onSave={() => saveSection("sec4")}
              collapsed={Boolean(collapsed.sec4)}
              onToggle={() => toggleSection("sec4")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec4 && (
          <div className="p-5 sm:p-7 space-y-4">
            {/* Quick Presets for Multi-Religious / Universal / Literary Quotes */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">Pilih Preset Cepat (Ayat Suci, Puisi, atau Kata Mutiara):</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  {
                    label: "Islam — QS. Ar-Rum : 21",
                    quote: "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.",
                    ref: "QS. AR-RUM : 21",
                    title: "Pappaseng & Doa",
                  },
                  {
                    label: "Kristen — 1 Korintus 13:4-7",
                    quote: "Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong. Ia menutupi segala sesuatu, percaya segala sesuatu, mengharapkan segala sesuatu, sabar menanggung segala sesuatu.",
                    ref: "1 KORINTUS 13 : 4-7",
                    title: "Ayat Suci & Doa",
                  },
                  {
                    label: "Kristen — Kejadian 2:24",
                    quote: "Sebab itu seorang laki-laki akan meninggalkan ayahnya dan ibunya dan bersatu dengan isterinya, sehingga keduanya menjadi satu daging.",
                    ref: "KEJADIAN 2 : 24",
                    title: "Pemberkatan & Doa",
                  },
                  {
                    label: "Hindu — Rgveda X.85.42",
                    quote: "Semoga kedua mempelai ini tetap bersatu, semoga panjang umur dan menikmati kebahagiaan bersama anak cucu, bersukacita dalam rumah tangga mereka sendiri.",
                    ref: "RGVEDA X.85.42",
                    title: "Doa & Sloka",
                  },
                  {
                    label: "Buddha — Mangala Sutta",
                    quote: "Saling menghormati dan hidup dalam keselarasan, saling mendukung dalam kebajikan dan kebijaksanaan, itulah berkah utama dalam hidup berumah tangga.",
                    ref: "MANGALA SUTTA",
                    title: "Berkah & Doa",
                  },
                  {
                    label: "Sastra — Sapardi Djoko Damono",
                    quote: "Aku ingin mencintaimu dengan sederhana: dengan kata yang tak sempat diucapkan kayu kepada api yang menjadikannya abu. Aku ingin mencintaimu dengan sederhana: dengan isyarat yang tak sempat disampaikan awan kepada hujan yang menjadikannya tiada.",
                    ref: "SAPARDI DJOKO DAMONO",
                    title: "Kutipan Puisi",
                  },
                  {
                    label: "Sastra — Kahlil Gibran",
                    quote: "Kalian diciptakan bersama, dan kalian akan selamanya bersama. Berdirilah bersama, namun jangan terlampau rapat; sebab pilar-pilar kuil tegak terpisah, dan pohon tarbantin maupun pohon fir tidak tumbuh dalam naungan satu sama lain.",
                    ref: "KAHLIL GIBRAN — SANG NABI",
                    title: "Kutipan Cinta",
                  },
                  {
                    label: "Universal — Janji Suci",
                    quote: "Dan jika aku harus memilih kembali dalam seratus kehidupan, dalam seratus dunia, dalam versi realitas apa pun, aku akan tetap mencari dan memilih dirimu.",
                    ref: "OUR SACRED PROMISE",
                    title: "Janji Suci & Harapan",
                  },
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      updateField("openingQuote", p.quote);
                      updateField("openingQuoteRef", p.ref);
                      updateCustomLabel("quoteTitle", p.title);
                    }}
                    className="text-left p-2.5 bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-xl text-[11px] font-semibold text-stone-800 hover:text-amber-950 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Salam Pembuka / Doa Awal (Dinamis / Netral Agama) */}
            <div className="pt-3 border-t border-stone-100 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700">Salam Pembuka / Doa Awal (Greeting)</label>
                  <p className="text-[11px] text-stone-500">Tampil di atas kutipan doa. Bebas dipilih sesuai agama/adat atau dikosongkan.</p>
                </div>
                <span className="text-[11px] text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 self-start sm:self-auto">
                  Opsional
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => updateCustomLabel("openingGreeting", "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition cursor-pointer"
                >
                  بِسْمِ اللَّهِ (Arab)
                </button>
                <button
                  type="button"
                  onClick={() => updateCustomLabel("openingGreeting", "Bismillahir Rahmanir Rahim")}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition cursor-pointer"
                >
                  Bismillah (Latin)
                </button>
                <button
                  type="button"
                  onClick={() => updateCustomLabel("openingGreeting", "Salam Sejahtera & Penuh Berkat")}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition cursor-pointer"
                >
                  Salam Sejahtera
                </button>
                <button
                  type="button"
                  onClick={() => updateCustomLabel("openingGreeting", "Om Swastiastu")}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition cursor-pointer"
                >
                  Om Swastiastu
                </button>
                <button
                  type="button"
                  onClick={() => updateCustomLabel("openingGreeting", "")}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                  title="Kosongkan salam pembuka (tidak menampilkan tulisan Arab atau salam apapun)"
                >
                  Hapus / Tanpa Salam
                </button>
              </div>

              <Input
                label="Teks Salam Pembuka Kustom"
                value={getCustomLabel("openingGreeting", activeBlueprint?.openingGreeting || "")}
                onChange={(v) => updateCustomLabel("openingGreeting", v)}
                placeholder="بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ / Salam Sejahtera / Kosongkan jika tidak diinginkan"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
              <Input
                label="Subjudul / Eyebrow Seksi"
                value={getCustomLabel("quoteEyebrow", activeBlueprint?.quoteSectionEyebrow || "")}
                onChange={(v) => updateCustomLabel("quoteEyebrow", v)}
                placeholder={activeBlueprint?.quoteSectionEyebrow || "WALIMATUL 'URSY / THE SACRED UNION"}
              />
              <Input
                label="Judul Seksi (Bebas Kustom)"
                value={getCustomLabel("quoteTitle", activeBlueprint?.quoteSectionTitle || "Kutipan & Doa")}
                onChange={(v) => updateCustomLabel("quoteTitle", v)}
                placeholder={activeBlueprint?.quoteSectionTitle || "Kutipan Cinta / Kata Mutiara / Pappaseng / Ayat Suci"}
              />
            </div>

            <div className="pt-2">
              <Input
                label="Referensi Sumber Kutipan"
                value={invitation.openingQuoteRef || ""}
                onChange={(v) => updateField("openingQuoteRef", v)}
                placeholder={activeBlueprint?.openingQuoteRef || "QS. AR-RUM : 21 / SAPARDI DJOKO DAMONO / OUR SACRED PROMISE"}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Teks Kutipan / Puisi / Doa</label>
              <textarea
                rows={3}
                value={invitation.openingQuote || ""}
                onChange={(e) => updateField("openingQuote", e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 leading-relaxed"
                placeholder="Tuliskan teks kutipan indah, puisi cinta, ayat, atau doa pembuka di sini..."
              />
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec4")}
                disabled={saving || !isDirty.sec4}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec4
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec4 ? "Tersimpan" : "Simpan Kutipan"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec4")}
          </div>
        )}
      </section>
      )}

      {/* 5. SEKSI RANGKAIAN ACARA (SEC5) */}
      {(activeSectionTab === "sec5") && (
      <section id="section-sec5" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec5")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec5
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">5. Rangkaian Acara (Multi-Event)</h2>
              {collapsed.sec5 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className="font-medium text-stone-700">{events.length} Sesi Acara</span>
                  {events[0]?.date && (
                    <span className="text-stone-400">({events[0].date})</span>
                  )}
                </span>
              )}
            </div>
            {!collapsed.sec5 && (
              <p className="text-xs text-stone-500 mt-0.5">Atur seluruh agenda adat dan resepsi (Akad, Resepsi, Mappacci, dll.)</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec5)}
              isSaving={saving && savingSec === "sec5"}
              onSave={() => saveSection("sec5")}
              collapsed={Boolean(collapsed.sec5)}
              onToggle={() => toggleSection("sec5")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec5 && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-stone-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-stone-500 mr-1">Quick Add:</span>
                {EVENT_PRESETS.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => addEvent(p)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                  >
                    + {p.split(" ")[0]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addEvent("Sesi Acara Baru")}
                className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                + Tambah Sesi
              </button>
            </div>

            {(invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED") && (
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex items-start gap-3 text-xs text-stone-700 mt-3 mb-1">
                <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold text-stone-900">Penyesuaian Jadwal &amp; Sesi Acara</p>
                  <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                    Anda tetap leluasa menyesuaikan jam dan menambah sesi acara kapan saja. Tanggal dasar masa aktif undangan tetap berpatokan pada jadwal awal saat pertama kali dipublikasikan.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4 mt-2">
              {events.map((ev, idx) => {
                const isDateLocked = Boolean(ev.isPrimary && (invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED"));
                return (
                <div key={idx} className={`p-4 rounded-2xl border transition ${
                  ev.isPrimary 
                    ? "border-amber-300 bg-amber-50/40 shadow-xs ring-1 ring-amber-200/60" 
                    : "border-stone-200 bg-stone-50/50"
                } space-y-3`}>
                  <div className="flex items-center justify-between border-b border-stone-200/80 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Sesi #{idx + 1} — {ev.title || "Acara"}
                      </span>
                      {ev.isPrimary ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-xs">
                          <svg className="w-3 h-3 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Sesi Acara Utama (Patokan Masa Aktif)
                        </span>
                      ) : !(invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED") ? (
                        <button
                          type="button"
                          onClick={() => setAsPrimaryEvent(idx)}
                          className="text-[10px] font-semibold text-stone-500 hover:text-amber-900 px-2 py-0.5 rounded-md hover:bg-amber-100/60 border border-stone-200/80 transition cursor-pointer"
                        >
                          Jadikan Sesi Utama
                        </button>
                      ) : null}
                    </div>
                    {events.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEvent(idx)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        Hapus Sesi
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <Input label="Nama Sesi Acara" value={ev.title || ""} onChange={(v) => updateEventItem(idx, "title", v)} placeholder="Masukkan nama sesi acara (Misal: Akad Nikah)" />
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-stone-700">
                          Hari, Tanggal Acara
                        </label>
                        {isDateLocked && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                            Terkunci
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        disabled={isDateLocked}
                        value={ev.date || ""}
                        onChange={(e) => updateEventItem(idx, "date", e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border font-medium transition ${
                          isDateLocked
                            ? "border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed"
                            : "border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                        }`}
                      />
                      {isDateLocked ? (
                        <p className="text-[10px] text-amber-800 font-medium mt-1 leading-relaxed">
                          Terkunci pasca-publikasi sebagai patokan masa aktif. Hubungi Admin jika perlu penyesuaian.
                        </p>
                      ) : ev.date ? (
                        <p className="text-[11px] text-amber-900 font-semibold mt-1">
                          {formatIndonesianDatePreview(ev.date)}
                        </p>
                      ) : (
                        <p className="text-[11px] text-stone-400 mt-1">
                          Pilih tanggal pelaksanaan acara
                        </p>
                      )}
                    </div>
                    <Input label="Label Badge" value={ev.badge || ""} onChange={(b) => updateEventItem(idx, "badge", b)} placeholder="Sakral / Adat Bugis / Umum" />

                    {/* Form Waktu Terstruktur */}
                    <div className="sm:col-span-2 md:col-span-3 p-3.5 bg-stone-50/80 rounded-2xl border border-stone-200/90 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-800">Waktu &amp; Zona Wilayah Acara</span>
                        <span className="text-[11px] font-mono font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                          {ev.time || `${ev.startTime || "09:00"} - ${ev.isUntilDone ? "Selesai" : (ev.endTime || "12:00")} ${ev.timezone || "WIB"}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                            Jam Mulai
                          </label>
                          <input
                            type="time"
                            value={ev.startTime || "09:00"}
                            onChange={(e) => handleTimeFieldChange(idx, "startTime", e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-stone-700">
                              Jam Selesai
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-stone-600 hover:text-stone-900">
                              <input
                                type="checkbox"
                                checked={Boolean(ev.isUntilDone)}
                                onChange={(e) => handleTimeFieldChange(idx, "isUntilDone", e.target.checked)}
                                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500/20"
                              />
                              <span>Sampai Selesai</span>
                            </label>
                          </div>
                          {ev.isUntilDone ? (
                            <div className="px-3 py-2 text-xs rounded-xl border border-dashed border-stone-300 bg-stone-100 text-stone-600 font-medium text-center">
                              Sampai Selesai Acara
                            </div>
                          ) : (
                            <input
                              type="time"
                              value={ev.endTime || "12:00"}
                              onChange={(e) => handleTimeFieldChange(idx, "endTime", e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                            Pilihan Zona Waktu
                          </label>
                          <select
                            value={ev.timezone || "WIB"}
                            onChange={(e) => handleTimeFieldChange(idx, "timezone", e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                          >
                            <option value="WIB">WIB (Indonesia Barat - UTC+7)</option>
                            <option value="WITA">WITA (Indonesia Tengah - UTC+8)</option>
                            <option value="WIT">WIT (Indonesia Timur - UTC+9)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <Input label="Nama Lokasi / Gedung" value={ev.location || ""} onChange={(v) => updateEventItem(idx, "location", v)} placeholder="Contoh: Gedung Pertemuan / Rumah Mempelai" />
                    <Input label="Alamat Lengkap" value={ev.address || ""} onChange={(v) => updateEventItem(idx, "address", v)} placeholder="Contoh: Jl. Melati No. 10" />
                    <Input label="Link Google Maps" value={ev.mapsUrl || ""} onChange={(v) => updateEventItem(idx, "mapsUrl", v)} placeholder="https://maps.app.goo.gl/..." />
                    <div className="sm:col-span-2 md:col-span-3">
                      <Input label="Catatan Tambahan (Opsional)" value={ev.notes || ""} onChange={(v) => updateEventItem(idx, "notes", v)} placeholder="Masukkan catatan tambahan untuk tamu (Opsional)" />
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec5")}
                disabled={saving || !isDirty.sec5}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec5
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec5 ? "Tersimpan" : "Simpan Rangkaian Acara"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec5")}
          </div>
        )}
      </section>
      )}

      {/* 6. SEKSI KARTU AKSES QR & CHECK-IN (SEC6) */}
      {hasCap("qr_checkin") && (activeSectionTab === "sec6") && (
      <section id="section-sec6" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec6")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec6
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">6. Kartu Akses QR &amp; Check-In Tamu</h2>
              {collapsed.sec6 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showQrCheckin ? "text-emerald-700 font-medium" : "text-stone-500"}>
                    {showQrCheckin ? "Aktif (QR Pass)" : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec6 && (
              <p className="text-xs text-stone-500 mt-0.5">Tampilkan QR Code tiket dan tombol buka kartu akses untuk scanning buku tamu di lokasi acara</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec6)}
              isSaving={saving && savingSec === "sec6"}
              onSave={() => saveSection("sec6")}
              collapsed={Boolean(collapsed.sec6)}
              onToggle={() => toggleSection("sec6")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec6 && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900">Aktifkan Kartu Akses QR &amp; Check-In:</span>
                <p className="text-[11px] text-stone-500">Tamu dapat menunjukkan QR Code saat tiba di resepsionis untuk check-in cepat</p>
              </div>
              <SectionHeaderToggle
                label=""
                checked={showQrCheckin}
                onChange={(v) => updateFeatureSetting("showQrCheckin", v)}
              />
            </div>

            {showQrCheckin && (
              <div className="p-4 rounded-2xl border border-amber-200/70 bg-amber-50/40 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h4 className="text-xs font-bold text-amber-950">Fitur Check-In Aktif</h4>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Tombol <strong>&ldquo;QR Check-In&rdquo;</strong> di cover pembuka dan navigasi samping akan aktif. Setiap tamu yang membuka link unik mereka akan mendapatkan QR Code otomatis dan kode voucher souvenir <code>SOUVENIR-{invitationId?.slice(0, 8).toUpperCase()}</code>.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec6")}
                disabled={saving || !isDirty.sec6}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec6
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec6 ? "Tersimpan" : "Simpan Pengaturan QR"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec6")}
          </div>
        )}
      </section>
      )}

      {/* 7. SEKSI KISAH CINTA (SEC7) */}
      {(activeSectionTab === "sec7") && (
      <section id="section-sec7" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec7")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec7
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">7. Kisah Cinta (Journey of Love)</h2>
              {collapsed.sec7 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showStory ? "text-stone-700 font-medium" : "text-stone-500"}>
                    {showStory ? `${stories.length} Babak Cerita` : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec7 && (
              <p className="text-xs text-stone-500 mt-0.5">Tuliskan babak perjalanan cinta dari awal bertemu hingga pernikahan</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec7)}
              isSaving={saving && savingSec === "sec7"}
              onSave={() => saveSection("sec7")}
              collapsed={Boolean(collapsed.sec7)}
              onToggle={() => toggleSection("sec7")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec7 && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Seksi Kisah Cinta:</span>
              <div className="flex items-center gap-3">
                <SectionHeaderToggle
                  label=""
                  checked={showStory}
                  onChange={(v) => updateFeatureSetting("showStory", v)}
                />
                {showStory && (
                  <button
                    type="button"
                    onClick={addStory}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    + Tambah Babak
                  </button>
                )}
              </div>
            </div>

            {showStory && (
              <div className="space-y-3 mt-2">
                <Input
                  label="Judul Seksi Kisah Cinta (Bebas Kustom)"
                  value={getCustomLabel("storyTitle", "Kisah Cinta")}
                  onChange={(v) => updateCustomLabel("storyTitle", v)}
                  placeholder="Kisah Cinta / Our Love Story / Perjalanan Kami"
                />
                {stories.map((st, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800">Chapter 0{idx + 1}</span>
                      <button type="button" onClick={() => removeStory(idx)} className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer">Hapus</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Judul Momen" value={st.title || ""} onChange={(v) => updateStoryItem(idx, "title", v)} placeholder="Masukkan judul momen kisah cinta Anda" />
                      <Input label="Tahun / Tanggal" value={st.date || ""} onChange={(v) => updateStoryItem(idx, "date", v)} placeholder="2020" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Cerita Singkat</label>
                      <textarea
                        rows={2}
                        value={st.content || ""}
                        onChange={(e) => updateStoryItem(idx, "content", e.target.value)}
                        placeholder="Tuliskan cerita singkat momen ini..."
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec7")}
                disabled={saving || !isDirty.sec7}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec7
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec7 ? "Tersimpan" : "Simpan Kisah Cinta"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec7")}
          </div>
        )}
      </section>
      )}

      {/* 8. SEKSI GALERI & VIDEO (SEC8) */}
      {(activeSectionTab === "sec8") && (
      <section id="section-sec8" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec8")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec8
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">8. Galeri Foto Pre-Wedding &amp; Video Teaser</h2>
              {collapsed.sec8 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showGallery ? "text-stone-700 font-medium" : "text-stone-500"}>
                    {showGallery ? (getFeatureSetting("galleryDriveFolderUrl", "") ? "Drive Stream CDN" : "Grid Dinamis") : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec8 && (
              <p className="text-xs text-stone-500 mt-0.5">Mendukung Folder Google Drive (CDN stream), Smart Puzzle Grid dinamis acak, dan modal galeri penuh</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec8)}
              isSaving={saving && savingSec === "sec8"}
              onSave={() => saveSection("sec8")}
              collapsed={Boolean(collapsed.sec8)}
              onToggle={() => toggleSection("sec8")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec8 && (
          <div className="p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Galeri Pre-Wedding:</span>
              <SectionHeaderToggle
                label=""
                checked={showGallery}
                onChange={(v) => updateFeatureSetting("showGallery", v)}
              />
            </div>

            {showGallery && (
              <div className="space-y-4">
                <Input
                  label="Judul Seksi Galeri (Bebas Kustom)"
                  value={getCustomLabel("galleryTitle", "Galeri Momen")}
                  onChange={(v) => updateCustomLabel("galleryTitle", v)}
                  placeholder="Galeri Momen / Our Moments / Ceritaku / Album Kenangan"
                />

                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-amber-900">Video Teaser Pre-Wedding (YouTube / Vimeo)</h4>
                  <p className="text-[11px] text-stone-600">Tempelkan link video YouTube biasa (misal: <code>https://youtu.be/...</code>) untuk memutar teaser video di atas galeri.</p>
                  <input
                    type="text"
                    value={getFeatureSetting("videoGalleryUrl", "")}
                    onChange={(e) => updateFeatureSetting("videoGalleryUrl", e.target.value)}
                    placeholder="https://youtu.be/abcdef12345 atau https://www.youtube.com/watch?v=..."
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono"
                  />
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-stone-900">Link Folder Google Drive (Live Stream CDN)</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Tempelkan 1 tautan folder Google Drive publik. Sistem otomatis men-stream foto acak dalam format <strong>Smart Puzzle Grid (Zero Crop)</strong> dan tombol <strong>&ldquo;Lihat Semua Foto&rdquo;</strong> tanpa membebani storage server.
                  </p>
                  <input
                    type="url"
                    value={getFeatureSetting("galleryDriveFolderUrl", "")}
                    onChange={(e) => updateFeatureSetting("galleryDriveFolderUrl", e.target.value)}
                    placeholder="Masukkan URL drive Prewedding galery kamu"
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono"
                  />
                  <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900">
                    Pastikan akses link folder di Google Drive disetel ke <strong>&ldquo;Siapa saja yang memiliki link dapat melihat&rdquo;</strong>.
                  </div>
                  <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] text-amber-900">
                    Sistem hanya membaca <strong>100 foto pertama</strong> dalam folder Drive. Jika folder berisi lebih dari 100 foto, hanya 100 foto pertama yang akan ditampilkan di undangan.
                  </div>
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-stone-900">Daftar Link URL Foto Galeri (Alternatif Mandiri)</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Tempelkan tautan foto langsung (1 baris per link) jika Anda memiliki hosting gambar eksternal / CDN foto pribadi.
                  </p>
                  <textarea
                    rows={4}
                    value={getFeatureSetting("galleryPhotosList", "")}
                    onChange={(e) => updateFeatureSetting("galleryPhotosList", e.target.value)}
                    placeholder="https://.../foto-prewed-1.jpg&#10;https://.../foto-prewed-2.jpg&#10;https://.../foto-prewed-3.jpg"
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec8")}
                disabled={saving || !isDirty.sec8}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec8
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec8 ? "Tersimpan" : "Simpan Pengaturan Galeri"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec8")}
          </div>
        )}
      </section>
      )}

      {/* 9. SEKSI TANDA KASIH & AMPLOP (SEC9) */}
      {(activeSectionTab === "sec9") && (
      <section id="section-sec9" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec9")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec9
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">9. Tanda Kasih &amp; Amplop Digital</h2>
              {collapsed.sec9 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showGift ? "text-stone-700 font-medium" : "text-stone-500"}>
                    {showGift ? `${bankList.length} Rekening Terdaftar` : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec9 && (
              <p className="text-xs text-stone-500 mt-0.5">Kelola nomor rekening bank, QRIS statis, dan alamat pengiriman kado fisik</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec9)}
              isSaving={saving && savingSec === "sec9"}
              onSave={() => saveSection("sec9")}
              collapsed={Boolean(collapsed.sec9)}
              onToggle={() => toggleSection("sec9")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec9 && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Amplop Digital:</span>
              <div className="flex items-center gap-3">
                <SectionHeaderToggle
                  label=""
                  checked={showGift}
                  onChange={(v) => updateFeatureSetting("showGift", v)}
                />
                {showGift && (
                  <button
                    type="button"
                    onClick={addBank}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    + Tambah Rekening
                  </button>
                )}
              </div>
            </div>

            {showGift && (
              <div className="space-y-4 mt-2">
                <div className="space-y-3">
                  {bankList.map((b, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-full sm:w-1/4">
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Nama Bank / E-Wallet</label>
                        <input
                          type="text"
                          value={b.bank || ""}
                          onChange={(e) => updateBankItem(idx, "bank", e.target.value)}
                          placeholder="BCA / Mandiri / BSI"
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="w-full sm:w-1/3">
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Nomor Rekening</label>
                        <input
                          type="text"
                          value={b.number || ""}
                          onChange={(e) => updateBankItem(idx, "number", e.target.value)}
                          placeholder="7330497518"
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div className="w-full sm:w-1/3">
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Atas Nama (Owner)</label>
                        <input
                          type="text"
                          value={b.name || ""}
                          onChange={(e) => updateBankItem(idx, "name", e.target.value)}
                          placeholder="Nama Pemilik Rekening"
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs"
                        />
                      </div>
                      {bankList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBank(idx)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-bold self-end sm:self-center pt-2 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <PhotoInput
                    label="Gambar QRIS Pembayaran"
                    desc="Upload gambar QRIS statis untuk scan tanda kasih"
                    value={getFeatureSetting("qrisImageUrl", "")}
                    onChange={(v) => updateFeatureSetting("qrisImageUrl", v)}
                    placeholder="https://.../qris-pembayaran.jpg"
                    invitationId={invitationId}
                    slot="QRIS"
                    onUploadStart={handleUploadStart}
                    onUploadEnd={handleUploadEnd}
                  />
                  <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-2">
                    <label className="block text-xs font-bold text-stone-900">Alamat Pengiriman Kado Fisik</label>
                    <p className="text-[10px] text-stone-500">Alamat rumah/kantor untuk penerimaan kado fisik dari tamu</p>
                    <textarea
                      rows={3}
                      value={invitation.shippingAddress || ""}
                      onChange={(e) => updateField("shippingAddress", e.target.value)}
                      placeholder="Jl. Perintis Kemerdekaan No. 12, Tamalanrea, Kota Makassar"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec9")}
                disabled={saving || isUploading || !isDirty.sec9}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  isUploading
                    ? "bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed"
                    : !isDirty.sec9
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{saving ? "Menyimpan..." : isUploading ? "Sedang Mengunggah QRIS..." : !isDirty.sec9 ? "Tersimpan" : "Simpan Rekening & Hadiah"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec9")}
          </div>
        )}
      </section>
      )}

      {/* 10. SEKSI DRESS CODE (SEC10) */}
      {(activeSectionTab === "sec10") && (
      <section id="section-sec10" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec10")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec10
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">10. Panduan Busana (Dress Code Guide)</h2>
              {collapsed.sec10 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showDresscode ? "text-stone-700 font-medium" : "text-stone-500"}>
                    {showDresscode ? (invitation.dresscode || "Aktif") : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec10 && (
              <p className="text-xs text-stone-500 mt-0.5">Atur palet warna pakaian dan anjuran busana untuk para tamu undangan</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec10)}
              isSaving={saving && savingSec === "sec10"}
              onSave={() => saveSection("sec10")}
              collapsed={Boolean(collapsed.sec10)}
              onToggle={() => toggleSection("sec10")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec10 && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Panduan Dress Code:</span>
              <SectionHeaderToggle
                label=""
                checked={showDresscode}
                onChange={(v) => updateFeatureSetting("showDresscode", v)}
              />
            </div>

            {showDresscode && (
              <DresscodeStudioBlock
                invitation={invitation}
                updateField={updateField}
                updateFeatureSetting={updateFeatureSetting}
                getFeatureSetting={getFeatureSetting}
                themeSyncSuccess={themeSyncSuccess}
                setThemeSyncSuccess={setThemeSyncSuccess}
                showManualHex={showManualHex}
                setShowManualHex={setShowManualHex}
              />
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec10")}
                disabled={saving || !isDirty.sec10}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec10
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec10 ? "Tersimpan" : "Simpan Dress Code"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec10")}
          </div>
        )}
      </section>
      )}

      {/* 11. SEKSI LIVE STREAMING (SEC11) */}
      {(activeSectionTab === "sec11") && (
      <section id="section-sec11" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec11")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec11
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">11. Siaran Langsung (Live Streaming)</h2>
              {collapsed.sec11 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showLiveStream ? "text-emerald-700 font-medium" : "text-stone-500"}>
                    {showLiveStream ? "Aktif" : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec11 && (
              <p className="text-xs text-stone-500 mt-0.5">Tautkan link siaran virtual YouTube Live, Instagram Live, atau Zoom Meeting</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec11)}
              isSaving={saving && savingSec === "sec11"}
              onSave={() => saveSection("sec11")}
              collapsed={Boolean(collapsed.sec11)}
              onToggle={() => toggleSection("sec11")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec11 && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Siaran Langsung:</span>
              <SectionHeaderToggle
                label=""
                checked={showLiveStream}
                onChange={(v) => updateFeatureSetting("showLiveStream", v)}
              />
            </div>

            {showLiveStream && (
              <div className="space-y-3 mt-2">
                <Input
                  label="Link YouTube Live"
                  value={getFeatureSetting("liveStreamYoutubeUrl", invitation.liveStreamUrl || "")}
                  onChange={(v) => { updateFeatureSetting("liveStreamYoutubeUrl", v); updateField("liveStreamUrl", v); }}
                  placeholder="Masukkan link youtube live"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Link Instagram Live (Opsional)"
                    value={getFeatureSetting("liveStreamInstagramUrl", "")}
                    onChange={(v) => updateFeatureSetting("liveStreamInstagramUrl", v)}
                    placeholder="https://instagram.com/..."
                  />
                  <Input
                    label="Link Zoom Meeting (Opsional)"
                    value={getFeatureSetting("liveStreamZoomUrl", "")}
                    onChange={(v) => updateFeatureSetting("liveStreamZoomUrl", v)}
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec11")}
                disabled={saving || !isDirty.sec11}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec11
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec11 ? "Tersimpan" : "Simpan Live Streaming"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec11")}
          </div>
        )}
      </section>
      )}

      {/* 12. SEKSI FILTER INSTAGRAM (SEC12) */}
      {(activeSectionTab === "sec12") && (
      <section id="section-sec12" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec12")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec12
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">12. Filter Instagram (Wedding Frame AR)</h2>
              {collapsed.sec12 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showFilter ? "text-emerald-700 font-medium" : "text-stone-500"}>
                    {showFilter ? (getFeatureSetting("instagramFilterUrl", "") ? "Terhubung" : "Aktif") : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec12 && (
              <p className="text-xs text-stone-500 mt-0.5">Tautkan link effect / filter Instagram Story resmi pernikahan Anda</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec12)}
              isSaving={saving && savingSec === "sec12"}
              onSave={() => saveSection("sec12")}
              collapsed={Boolean(collapsed.sec12)}
              onToggle={() => toggleSection("sec12")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec12 && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Tombol Filter Instagram:</span>
              <SectionHeaderToggle
                label=""
                checked={showFilter}
                onChange={(v) => updateFeatureSetting("showFilter", v)}
              />
            </div>

            {showFilter && (
              <div className="space-y-3 mt-2">
                <Input
                  label="Link Filter Instagram Story"
                  value={getFeatureSetting("instagramFilterUrl", "")}
                  onChange={(v) => updateFeatureSetting("instagramFilterUrl", v)}
                  placeholder="https://www.instagram.com/ar/123456789/..."
                />
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec12")}
                disabled={saving || !isDirty.sec12}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec12
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec12 ? "Tersimpan" : "Simpan Filter Instagram"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec12")}
          </div>
        )}
      </section>
      )}

      {/* 13. SEKSI TURUT MENGUNDANG & HIMBAUAN (SEC13) */}
      {(activeSectionTab === "sec13") && (
      <section id="section-sec13" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec13")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec13
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">13. Turut Mengundang &amp; Himbauan Tamu</h2>
              {collapsed.sec13 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showTurutMengundang ? "text-stone-700 font-medium" : "text-stone-500"}>
                    {showTurutMengundang ? "Aktif" : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec13 && (
              <p className="text-xs text-stone-500 mt-0.5">Daftar keluarga besar yang turut mengundang dan catatan kenyamanan tamu</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec13)}
              isSaving={saving && savingSec === "sec13"}
              onSave={() => saveSection("sec13")}
              collapsed={Boolean(collapsed.sec13)}
              onToggle={() => toggleSection("sec13")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec13 && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Seksi Turut Mengundang:</span>
              <SectionHeaderToggle
                label=""
                checked={showTurutMengundang}
                onChange={(v) => updateFeatureSetting("showTurutMengundang", v)}
              />
            </div>

            {showTurutMengundang && (
              <div className="space-y-4 mt-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Daftar Turut Mengundang (1 Nama per Baris):</label>
                  <textarea
                    rows={4}
                    value={getFeatureSetting("turutMengundang", "")}
                    onChange={(e) => updateFeatureSetting("turutMengundang", e.target.value)}
                    placeholder={`Bpk. H. Arif Yaniadi & Ibu Yuni Widiastuti\nBpk. Tomm Posma & Ibu Endang Noffiyanti\nKeluarga Besar Kerukunan Sulawesi Selatan`}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 leading-relaxed font-mono"
                  />
                </div>

                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
                  <label className="block text-xs font-bold text-stone-900">Himbauan &amp; Kenyamanan Tamu (Protokol/Parkir)</label>
                  <input
                    type="text"
                    value={getFeatureSetting("guestGuidance", "")}
                    onChange={(e) => updateFeatureSetting("guestGuidance", e.target.value)}
                    placeholder="Ketik pengumuman atau catatan khusus untuk dibaca tamu"
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec13")}
                disabled={saving || !isDirty.sec13}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec13
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec13 ? "Tersimpan" : "Simpan Turut Mengundang"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec13")}
          </div>
        )}
      </section>
      )}

      {/* 14. SEKSI GALERI KENANGAN TAMU (SEC14) */}
      {hasCap("guest_memories") && (activeSectionTab === "sec14") && (
      <section id="section-sec14" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec14")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec14
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">14. Galeri Kenangan Tamu (After-Event)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Live Photo Drop
              </span>
              {collapsed.sec14 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={getFeatureSetting("showGuestMemories", true) ? "text-emerald-700 font-medium" : "text-stone-500"}>
                    {getFeatureSetting("showGuestMemories", true) ? "Aktif" : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec14 && (
              <p className="text-xs text-stone-500 mt-0.5">Tampung foto candid yang dibagikan para tamu undangan pasca acara</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec14)}
              isSaving={saving && savingSec === "sec14"}
              onSave={() => saveSection("sec14")}
              collapsed={Boolean(collapsed.sec14)}
              onToggle={() => toggleSection("sec14")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec14 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Aktifkan Seksi Galeri Kenangan Tamu:</span>
                <span className="text-[11px] text-stone-500">Menampilkan tombol pop-up modal &ldquo;Bagikan Momen&rdquo; di halaman undangan</span>
              </div>
              <SectionHeaderToggle
                label=""
                checked={getFeatureSetting("showGuestMemories", true)}
                onChange={(v) => updateFeatureSetting("showGuestMemories", v)}
              />
            </div>

            {getFeatureSetting("showGuestMemories", true) && (
              <div className="space-y-6">
                {/* ── A. TAMPILAN SEKSI DI WEBSITE UNDANGAN ── */}
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">Gaya Tampilan Seksi di Website Undangan:</span>
                    <span className="text-[11px] text-stone-500">Pilih bagaimana galeri kenangan candid tamu disajikan kepada para tamu di website undangan Anda</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: "stories",
                        name: "Circle Stories",
                        tag: "Instagram-Style",
                        desc: "Lingkaran avatar bertumpuk dengan ring gradient emas dan cuplikan foto terkini.",
                      },
                      {
                        id: "grid",
                        name: "Modern Masonry",
                        tag: "Populer",
                        desc: "Grid mosaik foto candid bertumpuk artistik dengan rasio foto dinamis.",
                      },
                      {
                        id: "minimal",
                        name: "Clean Minimalist",
                        tag: "Elegan",
                        desc: "Banner kartu ringkas dengan tombol aksi 'Kirim Foto Momen' yang anggun.",
                      },
                    ].map((lay) => {
                      const isSelected = getFeatureSetting("memoriesWebLayout", "stories") === lay.id;
                      return (
                        <button
                          key={lay.id}
                          type="button"
                          onClick={() => updateFeatureSetting("memoriesWebLayout", lay.id)}
                          className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? "bg-amber-50/90 border-amber-600 ring-2 ring-amber-600 shadow-xs"
                              : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-xs font-bold text-stone-900">{lay.name}</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                              {lay.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 leading-relaxed">
                            {lay.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── B. PANDUAN PUSAT OPERASIONAL KAMERA MOMENTS ── */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-stone-900 block">Pusat Komando Kamera &amp; Operasional Moments</span>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Pengaturan filter analog, jatah roll per tamu, jadwal sesi kamera, alokasi kuota per sesi, cetak standing banner &amp; kartu QR, dan unduh ZIP foto kini dikelola terpusat di menu Moments.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/moments"
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
                  >
                    <span>Buka Menu Moments &rarr;</span>
                  </Link>
                </div>

                {/* ── E. TEKS JUDUL & MONITORING ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Judul Seksi di Undangan:</label>
                    <input
                      type="text"
                      value={getCustomLabel("memoriesTitle", "Abadikan Momen Indah")}
                      onChange={(e) => updateCustomLabel("memoriesTitle", e.target.value)}
                      placeholder="Abadikan Momen Indah"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Eyebrow / Subjudul Atas:</label>
                    <input
                      type="text"
                      value={getCustomLabel("memoriesEyebrow", "AFTER-EVENT MEMORIES")}
                      onChange={(e) => updateCustomLabel("memoriesEyebrow", e.target.value)}
                      placeholder="AFTER-EVENT MEMORIES"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Deskripsi / Ajakan Berbagi Momen:</label>
                  <textarea
                    rows={2}
                    value={getCustomLabel("memoriesSubtitle", "Punya foto candid seru selama menghadiri pernikahan kami? Bagikan momen spesial Anda langsung ke album pribadi kami.")}
                    onChange={(e) => updateCustomLabel("memoriesSubtitle", e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 resize-none"
                  />
                </div>

                {/* Monitoring Link & Test Button */}
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100/80 border border-amber-300/60 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-xs text-stone-600 space-y-0.5">
                      <span className="font-bold text-stone-900 block">Monitoring &amp; Unduh Arsip Foto Tamu</span>
                      <p className="leading-relaxed text-[11px]">
                        Seluruh kiriman foto tamu dapat Anda pantau secara live, moderasi, dan unduh ZIP di Menu Moments.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${invitation?.invitationSlug || "demo"}/sharemoment?test=true`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      <span>Tes Kamera</span>
                    </Link>
                    <Link
                      href="/dashboard/moments"
                      className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center gap-1 transition"
                    >
                      <span>Menu Moments &rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec14")}
                disabled={saving || !isDirty.sec14}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec14
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec14 ? "Tersimpan" : "Simpan Galeri Kenangan"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec14")}
          </div>
        )}
      </section>
      )}

      {/* 15. SEKSI PENGATURAN TEKS UI & LABEL (SEC15) */}
      {(activeSectionTab === "sec15") && (
      <section id="section-sec15" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec15")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec15
              ? "px-5 py-3.5 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "p-5 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">15. Pengaturan Teks UI &amp; Label</h2>
              {collapsed.sec15 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className="text-stone-600 font-medium truncate max-w-[220px] sm:max-w-xs">
                    RSVP: &ldquo;{getCustomLabel("rsvpBtnText", "Kirim Konfirmasi & Doa")}&rdquo;
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec15 && (
              <p className="text-xs text-stone-500 mt-0.5">Kustomisasi teks tombol RSVP, formulir, sampul, dan hitung mundur</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec15)}
              isSaving={saving && savingSec === "sec15"}
              onSave={() => saveSection("sec15")}
              collapsed={Boolean(collapsed.sec15)}
              onToggle={() => toggleSection("sec15")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec15 && (
          <div className="p-5 sm:p-7 space-y-5">
            {/* Group 1: Formulir & Tombol RSVP */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                Formulir RSVP &amp; Doa
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Teks Tombol Kirim RSVP (Aksi Utama)"
                  value={getCustomLabel("rsvpBtnText", "Kirim Konfirmasi & Doa")}
                  onChange={(v) => updateCustomLabel("rsvpBtnText", v)}
                  placeholder="Kirim Konfirmasi & Doa / Kirim RSVP"
                />
                <Input
                  label="Judul Seksi RSVP"
                  value={getCustomLabel("rsvpTitle", "RSVP & Doa Restu")}
                  onChange={(v) => updateCustomLabel("rsvpTitle", v)}
                  placeholder="RSVP & Doa Restu / Konfirmasi Kehadiran"
                />
                <Input
                  label="Label Kolom Nama Tamu"
                  value={getCustomLabel("rsvpNameLabel", "Nama Lengkap")}
                  onChange={(v) => updateCustomLabel("rsvpNameLabel", v)}
                  placeholder="Nama Lengkap"
                />
                <Input
                  label="Label Pilihan Kehadiran"
                  value={getCustomLabel("rsvpStatusLabel", "Konfirmasi Kehadiran")}
                  onChange={(v) => updateCustomLabel("rsvpStatusLabel", v)}
                  placeholder="Konfirmasi Kehadiran"
                />
                <Input
                  label="Label Kolom Jumlah Tamu"
                  value={getCustomLabel("rsvpCountLabel", "Jumlah Tamu")}
                  onChange={(v) => updateCustomLabel("rsvpCountLabel", v)}
                  placeholder="Jumlah Tamu"
                />
                <Input
                  label="Label Kolom Pesan / Ucapan"
                  value={getCustomLabel("rsvpMessageLabel", "Ucapan & Doa Restu")}
                  onChange={(v) => updateCustomLabel("rsvpMessageLabel", v)}
                  placeholder="Ucapan & Doa Restu"
                />
              </div>
            </div>

            {/* Group 2: Sampul & Tombol Buka Undangan */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                Sampul &amp; Tombol Pembuka
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Teks Tombol Buka Undangan"
                  value={getCustomLabel("openBtn", "Buka Undangan")}
                  onChange={(v) => updateCustomLabel("openBtn", v)}
                  placeholder="Buka Undangan / Open Invitation"
                />
                <Input
                  label="Subjudul Sampul (Cover Subtitle)"
                  value={getCustomLabel("coverSubtitle", "UNDANGAN PERNIKAHAN")}
                  onChange={(v) => updateCustomLabel("coverSubtitle", v)}
                  placeholder="UNDANGAN PERNIKAHAN / WEDDING INVITATION"
                />
              </div>
            </div>

            {/* Group 3: Hitung Mundur (Countdown Timer) */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                Label Hitung Mundur (Countdown)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Input
                  label="Hari"
                  value={getCustomLabel("cdDays", "Hari")}
                  onChange={(v) => updateCustomLabel("cdDays", v)}
                  placeholder="Hari / Days"
                />
                <Input
                  label="Jam"
                  value={getCustomLabel("cdHours", "Jam")}
                  onChange={(v) => updateCustomLabel("cdHours", v)}
                  placeholder="Jam / Hours"
                />
                <Input
                  label="Menit"
                  value={getCustomLabel("cdMins", "Menit")}
                  onChange={(v) => updateCustomLabel("cdMins", v)}
                  placeholder="Menit / Minutes"
                />
                <Input
                  label="Detik"
                  value={getCustomLabel("cdSecs", "Detik")}
                  onChange={(v) => updateCustomLabel("cdSecs", v)}
                  placeholder="Detik / Seconds"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec15")}
                disabled={saving || !isDirty.sec15}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec15
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec15 ? "Tersimpan" : "Simpan Pengaturan Label"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec15")}
          </div>
        )}
      </section>
      )}

          </main>
        </div>



      {/* ── UPGRADE PAKET MODAL ────────────────────────────────────── */}
      {upgradeModal && (
        <div
          className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setUpgradeModal(false); }}
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 p-6 text-white border-b border-stone-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold tracking-widest uppercase text-amber-400">Upgrade Paket</span>
                <button onClick={() => setUpgradeModal(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <h2 className="text-xl font-serif font-bold text-stone-100">Tingkatkan Fitur & Kapasitas Paket</h2>
              <p className="text-stone-300 text-xs mt-1">Paket saat ini: <strong className="text-amber-300 font-semibold">{getPlanDisplayName(planType, platformSettings?.packages)}</strong></p>
            </div>

            {/* Tier Options */}
            <div className="p-5 space-y-3">
              {(["TIER_2", "TIER_3"] as const)
                .filter((t) => (PLAN_HIERARCHY[t] || 0) > (PLAN_HIERARCHY[planType] || 1))
                .map((tier) => {
                  const diff = (PLAN_PRICES[tier] ?? 0) - (PLAN_PRICES[planType] ?? 0);
                  const isSelected = upgradeTarget === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setUpgradeTarget(tier)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition cursor-pointer ${
                        isSelected
                          ? "border-amber-700/80 bg-amber-50/50 shadow-xs ring-1 ring-amber-700/20"
                          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${
                            isSelected ? "border-amber-800 bg-amber-800" : "border-stone-300"
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                          </div>
                          <span className="font-bold text-sm text-stone-900">{getPlanDisplayName(tier, platformSettings?.packages)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-stone-500 block">Tambah bayar</span>
                          <p className="font-bold text-amber-900 text-sm">Rp {diff.toLocaleString("id-ID")}</p>
                        </div>
                      </div>
                      <ul className="space-y-1 pl-6">
                        {((platformSettings?.packages?.find((p: any) => p.id === tier)?.features) || PLAN_FEATURES[tier] || []).map((f: string, i: number) => (
                          <li key={i} className="text-xs text-stone-600 flex items-start gap-1.5">
                            <svg className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}

              {upgradeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-700 font-medium">{upgradeError}</p>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={!upgradeTarget || upgrading}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-800 hover:bg-amber-900 text-white shadow-xs cursor-pointer"
                >
                  {upgrading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Memproses...</span></>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                      <span>
                        Upgrade Sekarang{upgradeTarget ? ` ke ${getPlanDisplayName(upgradeTarget, platformSettings?.packages)}` : ""}
                        {(() => {
                          if (!upgradeTarget) return "";
                          const diff = (PLAN_PRICES[upgradeTarget] ?? 0) - (PLAN_PRICES[planType] ?? 0);
                          return ` (Rp ${diff.toLocaleString("id-ID")})`;
                        })()}
                      </span>
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-stone-400">Pembayaran diproses otomatis. Tier aktif segera setelah lunas.</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  subtitle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-bold text-stone-700">{label}</label>
        {subtitle && <span className="text-[10px] text-amber-700 font-semibold">{subtitle}</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full p-2.5 rounded-xl text-xs text-stone-900 border transition ${
          disabled
            ? "bg-stone-100/90 border-stone-200 text-stone-500 cursor-not-allowed select-none"
            : "bg-stone-50 border-stone-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
        }`}
      />
    </div>
  );
}

function PhotoInput({
  label,
  desc,
  value,
  onChange,
  placeholder,
  allowVideo = false,
  invitationId = "",
  slot = "photo",
  onUploadStart,
  onUploadEnd,
  maxVideoMb,
  maxPhotoMb,
}: {
  label: string;
  desc: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  allowVideo?: boolean;
  invitationId?: string;
  slot?: string;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  maxVideoMb?: number;
  maxPhotoMb?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadError, setUploadError] = useState<{
    title: string;
    message: string;
    fileName?: string;
    fileSize?: string;
  } | null>(null);
  const [dynamicLimits, setDynamicLimits] = useState<{ video: number; photo: number }>({
    video: maxVideoMb || 50,
    photo: maxPhotoMb || 15,
  });

  useEffect(() => {
    if (maxVideoMb && maxPhotoMb) {
      setDynamicLimits({ video: maxVideoMb, photo: maxPhotoMb });
      return;
    }
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.max_video_upload_mb || d?.max_photo_upload_mb) {
          setDynamicLimits({
            video: Number(d.max_video_upload_mb) || 50,
            photo: Number(d.max_photo_upload_mb) || 15,
          });
        }
      })
      .catch(() => {});
  }, [maxVideoMb, maxPhotoMb]);

  const isVideo = Boolean(
    value && /\.(mp4|webm|mov)(\?.*)?$/i.test(value)
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Client-side file size guards (menggunakan batas dinamis dari AdminSetting)
    const isVideoFile = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
    const dynamicMaxVideoMb = dynamicLimits.video;
    const dynamicMaxPhotoMb = dynamicLimits.photo;
    const maxVideoSize = dynamicMaxVideoMb * 1024 * 1024;
    const maxPhotoSize = dynamicMaxPhotoMb * 1024 * 1024;

    if (isVideoFile && file.size > maxVideoSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError({
        title: `Ukuran Video Terlalu Besar (Maksimal ${dynamicMaxVideoMb} MB)`,
        message: `File video "${file.name}" berukuran ${sizeMB} MB. Batas maksimal ukuran video adalah ${dynamicMaxVideoMb} MB agar halaman undangan tetap ringan dibuka oleh tamu undangan. Silakan kompres atau potong durasi video (ideal 10–20 detik) terlebih dahulu.`,
        fileName: file.name,
        fileSize: `${sizeMB} MB`,
      });
      e.target.value = "";
      return;
    }

    if (!isVideoFile && file.size > maxPhotoSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError({
        title: `Ukuran Foto Terlalu Besar (Maksimal ${dynamicMaxPhotoMb} MB)`,
        message: `File foto "${file.name}" berukuran ${sizeMB} MB. Batas maksimal ukuran foto adalah ${dynamicMaxPhotoMb} MB. Silakan gunakan foto yang telah dikompres.`,
        fileName: file.name,
        fileSize: `${sizeMB} MB`,
      });
      e.target.value = "";
      return;
    }

    setUploading(true);
    onUploadStart?.();
    try {
      let fileToUpload = file;
      if (!isVideoFile) {
        fileToUpload = await compressImageToWebP(file, {
          maxWidth: slot?.toUpperCase() === "QRIS" ? 800 : 1600,
          maxHeight: slot?.toUpperCase() === "QRIS" ? 800 : 1600,
          quality: 0.82,
        });
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      if (invitationId) formData.append("invitationId", invitationId);
      if (slot) formData.append("slot", slot);

      const res = await fetch("/api/client/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setUploadError(null);
        onChange(data.url);
      } else {
        setUploadError({
          title: "Gagal Mengunggah Media",
          message: data.error || "Terjadi kendala saat memproses file di server. Silakan coba beberapa saat lagi.",
          fileName: file.name,
        });
      }
    } catch (err: any) {
      setUploadError({
        title: "Koneksi Terputus",
        message: err?.message || "Terjadi gangguan jaringan saat mengunggah file ke server. Silakan periksa koneksi internet Anda.",
        fileName: file.name,
      });
    } finally {
      setUploading(false);
      onUploadEnd?.();
    }
  };

  return (
    <div className={`p-4 rounded-2xl border transition-colors space-y-3 ${uploadError ? "border-rose-300 bg-rose-50/30" : "border-stone-200 bg-stone-50/60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-stone-900">{label}</h4>
          <p className="text-[10px] text-stone-500 leading-tight mt-0.5">{desc}</p>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-800 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{uploadError.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-rose-400 hover:text-rose-700 p-0.5 rounded transition cursor-pointer"
              title="Tutup pesan error"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed pl-5.5">
            {uploadError.message}
          </p>
          {uploadError.fileName && (
            <div className="pl-5.5 flex items-center gap-2 pt-0.5 text-[10px] text-rose-600 font-mono">
              <span className="truncate max-w-[220px]">{uploadError.fileName}</span>
              {uploadError.fileSize && (
                <>
                  <span>•</span>
                  <span className="font-bold">{uploadError.fileSize}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {value ? (
        <div className="space-y-2">
          {/* Clean Proportional Preview Card */}
          <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-center gap-3.5 shadow-2xs">
            {/* Media Thumbnail Container */}
            <div className="relative w-24 h-32 sm:w-28 sm:h-36 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0 group">
              {isVideo ? (
                <video
                  src={value}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={value}
                  alt={label}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Uploading Spinner */}
              {uploading && (
                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1.5 text-white text-[10px] font-semibold">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Proses...</span>
                </div>
              )}
            </div>

            {/* Media Info & Controls */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-stone-900 block">{isVideo ? "Video Terpasang" : "Foto Terpasang"}</span>
                <p className="text-[11px] text-stone-500 line-clamp-1">{label}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <label className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Ganti</span>
                  <input
                    type="file"
                    accept={allowVideo ? "image/*,video/mp4,video/webm,video/quicktime,.mov" : "image/*"}
                    className="sr-only"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end text-[11px]">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-stone-500 hover:text-stone-800 underline cursor-pointer text-[10px]"
            >
              {showUrlInput ? "Tutup URL" : "Edit URL"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="w-full py-4 px-4 bg-white hover:bg-stone-100 border border-dashed border-stone-300 hover:border-amber-700 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center shadow-xs">
            {uploading ? (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="w-6 h-6 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-amber-900">Mengunggah file...</span>
              </div>
            ) : (
              <>
                <svg className="w-6 h-6 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-bold text-stone-800">
                  Pilih File dari Galeri HP / Komputer
                </span>
                <span className="text-[10px] text-stone-500 font-medium">
                  {allowVideo ? `Video MP4/MOV/WebM (Maks ${dynamicLimits.video} MB) • Foto JPG/PNG/WebP (Maks ${dynamicLimits.photo} MB)` : `Format Foto JPG, PNG, WebP (Maks ${dynamicLimits.photo} MB)`}
                </span>
              </>
            )}
            <input
              type="file"
              accept={allowVideo ? "image/*,video/mp4,video/webm,video/quicktime,.mov" : "image/*"}
              className="sr-only"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[10px] text-stone-500 hover:text-amber-800 underline cursor-pointer"
            >
              {showUrlInput ? "Gunakan Upload File Saja" : "Atau tempel link URL online"}
            </button>
          </div>
        </div>
      )}

      {showUrlInput && (
        <div className="pt-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono"
          />
        </div>
      )}
    </div>
  );
}

function SectionHeaderToggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      {sub && <span className="text-[10px] text-stone-400 hidden sm:inline">{sub}</span>}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-amber-800" : "bg-stone-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      {label && <span className="text-xs font-semibold text-stone-700">{label}</span>}
    </div>
  );
}

/**
 * Tombol & Indikator Header Seksi (Clean Typography, Zero Nested Cards)
 * Menampilkan teks "Perubahan belum tersimpan • Simpan" saat isDirty bernilai true.
 * Begitu data tersimpan, teks otomatis lenyap dan header kembali bersih.
 */
function SectionHeaderActions({
  isDirty,
  isSaving,
  onSave,
}: {
  isDirty: boolean;
  isSaving?: boolean;
  onSave: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
  closedLabel?: string;
  openLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
      {isDirty && (
        <div className="flex items-center gap-1.5 text-xs animate-in fade-in duration-200">
          <span className="text-amber-800 font-medium">Perubahan belum tersimpan</span>
          <span className="text-stone-300">•</span>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="font-bold text-amber-900 hover:text-stone-900 underline cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      )}
    </div>
  );
}

interface DresscodeStudioProps {
  invitation: any;
  updateField: (field: string, value: any) => void;
  updateFeatureSetting: (key: string, value: any) => void;
  getFeatureSetting: (key: string, defaultVal: any) => any;
  themeSyncSuccess: boolean;
  setThemeSyncSuccess: (val: boolean) => void;
  showManualHex: boolean;
  setShowManualHex: (val: boolean) => void;
}

function DresscodeStudioBlock({
  invitation,
  updateField,
  updateFeatureSetting,
  getFeatureSetting,
  themeSyncSuccess,
  setThemeSyncSuccess,
  showManualHex,
  setShowManualHex,
}: DresscodeStudioProps) {
  const rawColors = getFeatureSetting("dressCodeColors", "#a67c52, #2b2725, #faf7f2");
  const currentColorList: string[] = typeof rawColors === "string"
    ? rawColors.split(",").map((c: string) => c.trim()).filter((c: string) => c.length > 0)
    : ["#a67c52", "#2b2725", "#faf7f2"];
  const safeColorList = currentColorList.length > 0 ? currentColorList : ["#a67c52", "#2b2725", "#faf7f2"];

  const updateColors = (list: string[]) => {
    updateFeatureSetting("dressCodeColors", list.join(", "));
  };

  const handleSwatchColorChange = (index: number, newHex: string) => {
    const updated = [...safeColorList];
    updated[index] = newHex;
    updateColors(updated);
  };

  const handleRemoveSwatch = (index: number) => {
    if (safeColorList.length <= 1) return;
    const updated = safeColorList.filter((_, i) => i !== index);
    updateColors(updated);
  };

  const handleAddSwatch = () => {
    if (safeColorList.length >= 6) return;
    const updated = [...safeColorList, "#d4af37"];
    updateColors(updated);
  };

  const handleApplyPreset = (preset: { name: string; colors: string[] }) => {
    updateColors(preset.colors);
    if (!invitation.dresscode) {
      updateField("dresscode", preset.name);
    }
  };

  const activeTheme = invitation?.themeId || "solaria";
  const themePreset = THEME_DRESSCODE_MAP[activeTheme] || THEME_DRESSCODE_MAP["solaria"];

  const handleSyncTheme = () => {
    if (themePreset) {
      updateColors(themePreset.colors);
      if (!invitation.dresscode) {
        updateField("dresscode", themePreset.name);
      }
      setThemeSyncSuccess(true);
      setTimeout(() => setThemeSyncSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-5 mt-2">
      {/* Nuansa / Aturan Dress Code */}
      <Input
        label="Nuansa / Aturan Dress Code"
        value={invitation.dresscode || ""}
        onChange={(v) => updateField("dresscode", v)}
        placeholder="Contoh: Earthy Terracotta, Formal Batik, Modern Pastel"
      />

      {/* Studio Palet Warna Visual */}
      <div className="p-4 sm:p-5 bg-stone-50/80 rounded-2xl border border-stone-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <label className="text-xs font-bold text-stone-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4 5 5 0 0110 0 4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              <span>Palet Warna Busana Tamu (Visual Swatches)</span>
            </label>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Klik bulatan warna untuk memilih warna secara visual. Tanpa perlu menghafal kode heksadesimal.
            </p>
          </div>

          {/* Tombol Pintas Cerdas: Samakan dengan Tema */}
          <button
            type="button"
            onClick={handleSyncTheme}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto ${
              themeSyncSuccess
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                : "bg-white hover:bg-amber-50 text-amber-900 border border-amber-300/80 shadow-xs"
            }`}
            title="Samakan warna dress code dengan palet bawaan tema undangan Anda"
          >
            {themeSyncSuccess ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Tersinkron dengan Tema!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Samakan Tema ({activeTheme.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>

        {/* Bulatan Swatch Warna Interaktif (Isolasi Visual 0ms Delay) */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          {safeColorList.map((hex: string, idx: number) => (
            <ColorSwatchPicker
              key={idx}
              initialColor={hex}
              index={idx}
              totalColors={safeColorList.length}
              onCommit={handleSwatchColorChange}
              onRemove={handleRemoveSwatch}
            />
          ))}

          {/* Tombol Tambah Warna (+) */}
          {safeColorList.length < 6 && (
            <button
              type="button"
              onClick={handleAddSwatch}
              className="w-12 h-12 rounded-full border-2 border-dashed border-stone-300 hover:border-amber-700 text-stone-400 hover:text-amber-800 flex flex-col items-center justify-center transition-all cursor-pointer group bg-white hover:bg-amber-50/40 shadow-2xs"
              title="Tambah bulatan warna baru (Maksimal 6 warna)"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* Pilihan Cepat: Palet Tren Pernikahan 1-Klik */}
        <div className="space-y-2 pt-3 border-t border-stone-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
              Pilihan Cepat: Palet Tren Pernikahan
            </span>
            <span className="text-[10px] text-stone-400">1-Klik Terapkan</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WEDDING_DRESSCODE_PRESETS.map((p, pIdx) => {
              const isSelected = p.colors.join(", ").toLowerCase() === safeColorList.join(", ").toLowerCase();
              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? "bg-amber-50/80 border-amber-600 ring-2 ring-amber-500/20 shadow-xs"
                      : "bg-white hover:bg-stone-50/80 border-stone-200 hover:border-stone-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {p.colors.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs inline-block"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block truncate">{p.name}</span>
                    <span className="text-[10px] text-stone-400 block truncate">{p.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pratinjau Tampilan Undangan Tamu (Live Preview) */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-stone-50 to-amber-50/30 border border-amber-200/70 rounded-2xl space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest text-amber-900 uppercase flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            <span>Pratinjau Tampilan Tamu (Live Preview)</span>
          </span>
          <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Sesuai Tampilan Website
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold tracking-widest text-stone-400 uppercase block">
              Panduan Busana Undangan
            </span>
            <h4 className="text-sm sm:text-base font-serif font-bold text-stone-900">
              {invitation.dresscode || "Panduan Busana"}
            </h4>
            <p className="text-xs text-stone-500 max-w-md leading-relaxed">
              {getFeatureSetting("dressCodeNote", "") || "Para tamu kehormatan dianjurkan mengenakan busana bernuansa senada."}
            </p>
          </div>

          {/* Swatches Tamu */}
          <div className="flex items-center gap-2 shrink-0">
            {safeColorList.map((c: string, i: number) => (
              <span
                key={i}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md inline-block transition-transform hover:scale-110 ring-1 ring-stone-200"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Catatan Tambahan Busana */}
      <div>
        <label className="block text-xs font-bold text-stone-700 mb-1">Catatan Tambahan Busana (Opsional)</label>
        <textarea
          rows={2}
          value={getFeatureSetting("dressCodeNote", "")}
          onChange={(e) => updateFeatureSetting("dressCodeNote", e.target.value)}
          placeholder="Contoh: Kami memohon agar para tamu menghindari warna putih atau pakaian kasual."
          className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
        />
      </div>

      {/* Mode Lanjutan: Input Manual Kode Hex */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowManualHex(!showManualHex)}
          className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 transition flex items-center gap-1 cursor-pointer"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${showManualHex ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span>{showManualHex ? "Sembunyikan Pengaturan Kode Hex Manual" : "Pengaturan Lanjutan: Edit Kode Hex Manual"}</span>
        </button>

        {showManualHex && (
          <div className="mt-2.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200 animate-in fade-in duration-200 space-y-1.5">
            <Input
              label="Palet Warna Hex (Pisahkan dengan koma)"
              value={rawColors}
              onChange={(v) => updateFeatureSetting("dressCodeColors", v)}
              placeholder="#a67c52, #2b2725, #faf7f2"
            />
            <p className="text-[10px] text-stone-400 leading-normal">
              Perubahan pada teks kode hex di atas akan otomatis memperbarui bulatan warna visual di atas secara dua arah (*two-way sync*).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Komponen Swatch Warna Terisolasi (Isolated Visual Update)
 * Memisahkan state render drag mouse native color picker dari root halaman EditInvitation.
 * Hanya me-render bulatan 48px dan kode hex secara instan (0ms delay) tanpa memicu re-render 15 section lainnya.
 */
function ColorSwatchPicker({
  initialColor,
  index,
  totalColors,
  onCommit,
  onRemove,
}: {
  initialColor: string;
  index: number;
  totalColors: number;
  onCommit: (index: number, newColor: string) => void;
  onRemove: (index: number) => void;
}) {
  const [color, setColor] = useState(initialColor);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sinkronisasi saat parent mengubah warna (misal: 1-klik preset atau Samakan Tema)
  useEffect(() => {
    setColor(initialColor);
  }, [initialColor]);

  // Bersihkan debounce timer saat komponen di-unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleColorChange = (newHex: string) => {
    // 1. Update visual instan HANYA di bulatan ini (0ms delay, 0% beban CPU ke section lain)
    setColor(newHex);

    // 2. Debounce commit ke form utama (200ms setelah user berhenti drag)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onCommit(index, newHex);
    }, 200);
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (color !== initialColor) {
      onCommit(index, color);
    }
  };

  return (
    <div className="relative group flex flex-col items-center gap-1.5">
      {/* Lingkaran Warna dengan Native Color Picker Transparan di Atasnya */}
      <div
        className="w-12 h-12 rounded-full border-2 border-white shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg relative overflow-hidden flex items-center justify-center cursor-pointer ring-1 ring-stone-300"
        style={{ backgroundColor: color }}
        title={`Klik untuk ubah warna (${color})`}
      >
        <input
          type="color"
          value={color.startsWith("#") && color.length === 7 ? color : "#a67c52"}
          onInput={(e) => handleColorChange((e.target as HTMLInputElement).value)}
          onChange={(e) => handleColorChange(e.target.value)}
          onBlur={handleBlur}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {/* Ikon Pensil Halus saat Hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white rounded-full p-1 pointer-events-none">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>

      {/* Kode Hex Label Monospace */}
      <span className="text-[10px] font-mono font-bold text-stone-600 uppercase bg-white border border-stone-200 px-1.5 py-0.5 rounded shadow-2xs tracking-tight">
        {color}
      </span>

      {/* Tombol Hapus (x) Muncul Saat Hover */}
      {totalColors > 1 && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-800 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs cursor-pointer shadow-sm"
          title="Hapus warna ini"
        >
          &times;
        </button>
      )}
    </div>
  );
}