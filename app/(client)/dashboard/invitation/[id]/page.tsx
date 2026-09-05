"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { compressImageToWebP } from "@/lib/clientImageCompressor";

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

export default function EditInvitation() {
  const params = useParams();
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
  const [upgradeTarget, setUpgradeTarget] = useState<"MODERN" | "PREMIUM" | null>(null);
  const [includeCustomDomain, setIncludeCustomDomain] = useState(false);
  const [upgradeDomainInput, setUpgradeDomainInput] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const PLAN_HIERARCHY: Record<string, number> = { TRADITIONAL: 1, MODERN: 2, PREMIUM: 3 };
  const PLAN_PRICES: Record<string, number> = {
    // Harga HANYA dari platformSettings (AdminSetting) — tidak ada fallback hardcode
    // Jika belum dimuat, 0 agar kalkulasi selisih upgrade tidak salah
    TRADITIONAL: Number(platformSettings?.pricing?.price_traditional ?? 0),
    MODERN:      Number(platformSettings?.pricing?.price_modern      ?? 0),
    PREMIUM:     Number(platformSettings?.pricing?.price_premium     ?? 0),
  };
  const PLAN_COLOR: Record<string, string> = {
    TRADITIONAL: "bg-amber-50 text-amber-800 border-amber-200",
    MODERN: "bg-indigo-50 text-indigo-800 border-indigo-200",
    PREMIUM: "bg-violet-50 text-violet-800 border-violet-200",
  };
  const PLAN_FEATURES: Record<string, string[]> = {
    MODERN: ["Akses semua tema Traditional & Modern", "Semua fitur paket Traditional"],
    PREMIUM: ["Akses semua tema (Traditional, Modern & Premium)", "Tema eksklusif editorial & luxury", "Semua fitur paket Modern"],
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
          includeCustomDomain: upgradeTarget === "PREMIUM" && includeCustomDomain,
          requestedDomain: upgradeTarget === "PREMIUM" && includeCustomDomain ? upgradeDomainInput : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat order upgrade.");
      // Buka checkout dengan orderId baru
      const checkoutRes = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderId }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutData.error || "Gagal memulai pembayaran.");
      setUpgradeModal(false);
      if (checkoutData.checkoutUrl) {
        window.open(checkoutData.checkoutUrl, "_blank");
      } else {
        alert(`Order upgrade berhasil dibuat (Invoice: ${data.invoiceNumber}). Silakan selesaikan pembayaran.`);
      }
    } catch (err: any) {
      setUpgradeError(err.message);
    } finally {
      setUpgrading(false);
    }
  };

  // Dual-Native Studio State: Form Mode vs Live Visual Editor
  const [activeStudioTab, setActiveStudioTab] = useState<"form" | "live">("form");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [selectedThemeCategory, setSelectedThemeCategory] = useState<string>("");
  const liveIframeRef = useRef<HTMLIFrameElement>(null);

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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !invitationId) return;

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

      if (!res.ok) throw new Error("Gagal mengunggah file audio");
      const result = await res.json();
      if (result.url) {
        updateField("musicUrl", result.url);
        updateFeatureSetting("musicUrl", result.url);
        updateFeatureSetting("showMusic", true);
      }
    } catch (err: any) {
      alert(err.message || "Gagal mengunggah file musik");
    } finally {
      setUploadingAudio(false);
    }
  };

  // Independent Section Collapse States (true = collapsed/tutup, false = expanded/buka)
  const defaultCollapsed: Record<string, boolean> = {
    sec1: true,  // 1. Tema & Warna
    sec2: true,  // 2. Sampul & Musik
    sec3: true,  // 3. Profil Mempelai
    sec4: true,  // 4. Kutipan Pembuka
    sec5: true,  // 5. Rangkaian Acara
    sec6: true,  // 6. Pengaturan QR Code & Check-in
    sec7: true,  // 7. Kisah Cinta (Love Story)
    sec8: true,  // 8. Pengaturan Galeri Foto & Video
    sec9: true,  // 9. Rekening Bank & Hadiah Digital
    sec10: true, // 10. Panduan Busana (Dress Code)
    sec11: true, // 11. Siaran Langsung (Live Streaming)
    sec12: true, // 12. Filter Instagram Story
    sec13: true, // 13. Turut Mengundang & Himbauan
    sec14: true, // 14. Galeri Kenangan Tamu (After-Event)
    sec15: true, // 15. Pengaturan Teks UI & Bahasa
  };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(defaultCollapsed);

  // Restore persisted collapsed state from localStorage on load
  useEffect(() => {
    if (typeof window !== "undefined" && invitationId) {
      try {
        const saved = localStorage.getItem(`lux_studio_collapsed_${invitationId}`);
        if (saved) {
          setCollapsed((prev) => ({ ...prev, ...JSON.parse(saved) }));
        }
      } catch {}
    }
  }, [invitationId]);

  const toggleSection = (secKey: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [secKey]: !prev[secKey] };
      if (typeof window !== "undefined" && invitationId) {
        try {
          localStorage.setItem(`lux_studio_collapsed_${invitationId}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
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
        const loadedEvents = Array.isArray(ev) ? ev : [];
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
  const saveSection = async (secKey?: string) => {
    if (!invitation || saving) return;
    setSaving(true);
    setSavingSec(secKey || null);
    try {
      const payload = {
        ...invitation,
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
        throw new Error("Gagal menyimpan data ke server");
      }

      // Update saved snapshot to current state
      setSavedSnapshot({
        invitation: JSON.parse(JSON.stringify(invitation)),
        media: JSON.parse(JSON.stringify(media)),
        events: JSON.parse(JSON.stringify(events)),
        stories: JSON.parse(JSON.stringify(stories)),
        bankList: JSON.parse(JSON.stringify(bankList)),
      });

      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setLastSaved(`Tersimpan pukul ${timeStr}`);

      // If saved from a specific section, collapse it cleanly and persist state
      if (secKey) {
        setCollapsed((prev) => {
          const next = { ...prev, [secKey]: true };
          if (typeof window !== "undefined" && invitationId) {
            try {
              localStorage.setItem(`lux_studio_collapsed_${invitationId}`, JSON.stringify(next));
            } catch {}
          }
          return next;
        });
      }

      // Broadcast hot reload to open Live Preview tabs
      try {
        const bc = new BroadcastChannel("lux_preview_sync");
        bc.postMessage({ type: "INVITATION_SAVED", id: invitationId });
        bc.close();
      } catch {}
    } catch (err: any) {
      console.error("Save failed:", err);
      alert("Terjadi kendala saat menyimpan. Silakan coba lagi.");
    } finally {
      setSaving(false);
      setSavingSec(null);
    }
  };

  const handleDeployAndLock = async () => {
    if (!invitation || isDeploying) return;
    setIsDeploying(true);
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
      alert(err.message || "Terjadi kendala saat memperbarui undangan online.");
    } finally {
      setIsDeploying(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setInvitation((prev: any) => ({ ...prev, [field]: value }));
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
  };

  const getCustomLabel = (key: string, fallback: string = "") => {
    const fs = getFeatureSetting("customLabels", {});
    return fs && fs[key] !== undefined ? fs[key] : fallback;
  };

  const getSavedCustomLabel = (key: string, fallback: string = "") => {
    const fs = getSavedFeatureSetting("customLabels", {});
    return fs && fs[key] !== undefined ? fs[key] : fallback;
  };

  // Two-Way Sync: Listen to Live Visual Editor messages
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "LUX_INLINE_EDIT_CHANGE") {
        const { field, value } = e.data;
        if (!field) return;

        if (field.startsWith("customLabels.")) {
          const labelKey = field.replace("customLabels.", "");
          updateCustomLabel(labelKey, value);
        } else {
          setInvitation((prev: any) => ({ ...prev, [field]: value }));
        }
      } else if (e.data.type === "LUX_INLINE_SAVE_REQUEST") {
        saveSection();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation, events, stories, bankList, media]);

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
      (invitation.brideParents || "") !== (savedSnapshot.invitation?.brideParents || "") ||
      (invitation.groomInstagram || "") !== (savedSnapshot.invitation?.groomInstagram || "") ||
      (invitation.brideInstagram || "") !== (savedSnapshot.invitation?.brideInstagram || "") ||
      getFeatureSetting("displayOrder", "BRIDE_FIRST") !== getSavedFeatureSetting("displayOrder", "BRIDE_FIRST") ||
      (media["BRIDE_PHOTO"] || "") !== (savedSnapshot.media?.["BRIDE_PHOTO"] || "") ||
      (media["GROOM_PHOTO"] || "") !== (savedSnapshot.media?.["GROOM_PHOTO"] || "")
    );

    // Sec 4: Kutipan Doa & Ayat
    const dirty4 = (
      (invitation.openingQuote || "") !== (savedSnapshot.invitation?.openingQuote || "") ||
      (invitation.openingQuoteRef || "") !== (savedSnapshot.invitation?.openingQuoteRef || "")
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

  // Event Handlers
  const addEvent = (presetTitle: string = "Sesi Baru") => {
    setEvents((prev) => [
      ...prev,
      {
        title: presetTitle,
        date: prev[0]?.date || "",
        time: "",
        location: "",
        address: "",
        mapsUrl: "",
        badge: presetTitle.toLowerCase().includes("akad") || presetTitle.toLowerCase().includes("pemberkatan") ? "Sakral" : "Umum",
        notes: "",
      },
    ]);
  };

  const removeEvent = (index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEventItem = (index: number, field: string, value: any) => {
    setEvents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
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

  const planType = invitation.order?.planType || "";
  const packageConfig = platformSettings?.packages?.find((p: any) => p.id === planType);
  const allowedCaps = packageConfig?.capabilities || [];
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
              href={`/api/client/invitations/${invitationId}/preview?mode=edit`}
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 font-sans">
      
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

      {/* Top Header Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-amber-800 uppercase block">Studio Editor Undangan</span>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            {displayOrder === "BRIDE_FIRST" ? `${invitation.brideNickname || "Mempelai Wanita"} & ${invitation.groomNickname || "Mempelai Pria"}` : `${invitation.groomNickname || "Mempelai Pria"} & ${invitation.brideNickname || "Mempelai Wanita"}`}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                {planType !== "PREMIUM" && (
                  <button
                    type="button"
                    onClick={() => {
                      setUpgradeTarget(null);
                      setUpgradeError(null);
                      setIncludeCustomDomain(false);
                      setUpgradeDomainInput("");
                      setUpgradeModal(true);
                    }}
                    className="text-[10px] font-bold text-violet-700 hover:text-violet-900 border border-violet-200 hover:border-violet-400 bg-violet-50 hover:bg-violet-100 px-2 py-0.5 rounded-full transition flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                    Upgrade
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Badge */}
          <div className="px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-2">
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
            href={`/api/client/invitations/${invitationId}/preview?mode=edit`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
          >
            <span>Buka di Tab Baru</span>
            <svg className="w-3.5 h-3.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
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
              setCollapsed((prev) => ({ ...prev, sec1: false }));
              const sec1El = document.getElementById("section-sec1");
              if (sec1El) sec1El.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white font-bold rounded-xl text-xs transition shadow-xs flex-shrink-0 cursor-pointer"
          >
            Pilih Tema Sekarang
          </button>
        </div>
      )}

      {/* Smart Detector: Pengingat Foto Personal Belum Diunggah */}
      {Boolean(invitation.themeId) && (!media["GROOM_PHOTO"] || !media["BRIDE_PHOTO"] || !media["LANDING_COVER"]) && (
        <div className="bg-stone-900 text-white rounded-2xl p-4 sm:p-5 border border-stone-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white tracking-wide uppercase">Detektor Foto Personal Undangan</h2>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-400/30">Pengingat</span>
              </div>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Slot foto personal berikut belum Anda unggah: <strong className="text-amber-300">{[
                  !media["LANDING_COVER"] && "Sampul Pop-Up",
                  !media["GROOM_PHOTO"] && "Foto Mempelai Pria",
                  !media["BRIDE_PHOTO"] && "Foto Mempelai Wanita",
                ].filter(Boolean).join(", ")}</strong>. Harap unggah foto asli Anda agar undangan tidak menampilkan avatar monogram default saat disebarkan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
            {!media["LANDING_COVER"] && (
              <button
                type="button"
                onClick={() => {
                  setActiveStudioTab("form");
                  setCollapsed((prev) => ({ ...prev, sec2: false }));
                  const el = document.getElementById("section-sec2");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Unggah Sampul
              </button>
            )}
            {(!media["GROOM_PHOTO"] || !media["BRIDE_PHOTO"]) && (
              <button
                type="button"
                onClick={() => {
                  setActiveStudioTab("form");
                  setCollapsed((prev) => ({ ...prev, sec3: false }));
                  const el = document.getElementById("section-sec3");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
              >
                Unggah Foto Mempelai
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dual Native Studio Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-2 bg-white rounded-2xl border border-stone-200 shadow-xs gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveStudioTab("form")}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeStudioTab === "form"
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 bg-stone-50"
            }`}
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit Undangan (Form Data)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStudioTab("live")}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeStudioTab === "live"
                ? "bg-amber-800 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 bg-stone-50"
            }`}
          >
            <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span>Live Editor (Visual Click-to-Edit)</span>
          </button>
        </div>

        {activeStudioTab === "live" && (
          <div className="flex items-center justify-end gap-2 pr-1">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${previewDevice === "mobile" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${previewDevice === "desktop" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Layar Penuh</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (liveIframeRef.current) {
                  liveIframeRef.current.src = liveIframeRef.current.src;
                }
              }}
              title="Muat Ulang Canvas"
              className="p-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {activeStudioTab === "live" ? (
        /* ==========================================================================
           LIVE VISUAL INLINE EDITOR CANVAS (CANVA / NOTION STYLE)
           ========================================================================== */
        <div className="bg-stone-950 rounded-3xl p-4 sm:p-8 border border-stone-800 shadow-xl flex flex-col items-center min-h-[850px]">
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
                onClick={() => saveSection()}
                disabled={saving}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold rounded-lg text-xs transition shadow-sm"
              >
                {saving ? "Menyimpan..." : "Simpan Semua"}
              </button>
            </div>
          </div>

          <div
            className={`transition-all duration-300 rounded-2xl overflow-hidden border border-stone-700/60 shadow-2xl bg-black flex justify-center ${
              previewDevice === "mobile"
                ? "w-[390px] h-[780px] max-w-full"
                : "w-full h-[850px]"
            }`}
          >
            <iframe
              ref={liveIframeRef}
              src={`/api/client/invitations/${invitationId}/preview?mode=edit`}
              className="w-full h-full border-0 bg-stone-900"
              title="Live Visual Editor"
            />
          </div>
        </div>
      ) : (
        /* ==========================================================================
           STRUCTURED FORM EDITOR (13 SECTIONS)
           ========================================================================== */
        <div className="space-y-6">

      {/* 1. SEKSI TEMA & PALET WARNA (SEC1) */}
      <section id="section-sec1" className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">1. Pilihan Seri Desain &amp; Palet Warna</h2>
            <p className="text-xs text-stone-500">Pilih tema utama dan nuansa warna undangan pernikahan Anda.</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec1)}
            isSaving={saving && savingSec === "sec1"}
            onSave={() => saveSection("sec1")}
            collapsed={Boolean(collapsed.sec1)}
            onToggle={() => toggleSection("sec1")}
            closedLabel={selectedThemeObj ? "Edit Tema & Warna" : "Pilih Tema"}
          />
        </div>

        {collapsed.sec1 ? (
          selectedThemeObj ? (
            <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={selectedThemeObj.coverUrl || selectedThemeObj.cover}
                  alt={selectedThemeObj.name}
                  className="w-14 h-14 rounded-xl object-cover border border-stone-200 shadow-xs flex-shrink-0"
                />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                    {selectedThemeObj.series || selectedThemeObj.tag}
                  </span>
                  <h3 className="text-sm font-bold text-stone-900 mt-1">{selectedThemeObj.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                    <span className="w-3 h-3 rounded-full border border-black/10 inline-block shadow-2xs" style={{ backgroundColor: selectedPaletteObj.hex }}></span>
                    <span>Nuansa: <strong>{selectedPaletteObj.name}</strong></span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSection("sec1")}
                className="text-xs font-bold text-amber-800 hover:underline self-start sm:self-center"
              >
                Ubah Tema / Warna
              </button>
            </div>
          ) : (
            <div className="p-5 bg-rose-50/70 border-t border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                    Wajib Dipilih
                  </span>
                  <h3 className="text-sm font-bold text-stone-900 mt-1">Belum Memilih Tema Undangan</h3>
                  <p className="text-xs text-rose-700 mt-0.5">Silakan pilih salah satu desain tema di bawah ini untuk menampilkan undangan Anda.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSection("sec1")}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs transition shadow-xs self-start sm:self-center cursor-pointer"
              >
                Pilih Tema Sekarang
              </button>
            </div>
          )
        ) : (
          <div className="p-5 sm:p-7 space-y-6">
            {/* Theme Mockups for this Category / Store */}
            {(() => {
              const availableThemes = themesList.filter((t) => {
                const cat = (t.category || "").toUpperCase();
                const plan = planType.toUpperCase();
                if (plan === "PREMIUM") return true; 
                if (plan === "MODERN") return cat === "MODERN" || cat === "TRADITIONAL";
                if (plan === "TRADITIONAL") return cat === "TRADITIONAL"; 
                return true;
              });

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {displayedThemes.map((th) => {
                      const isSelected = Boolean(invitation.themeId) && invitation.themeId === th.id;
                      const isThemeLocked = invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED";
                      return (
                        <div
                          key={th.id}
                          onClick={() => {
                            if (!isThemeLocked) updateField("themeId", th.id);
                          }}
                          className={`rounded-2xl border overflow-hidden transition flex flex-col ${
                            isThemeLocked ? "cursor-default opacity-90" : "cursor-pointer"
                          } ${
                            isSelected
                              ? "border-amber-800 bg-amber-50/30 ring-2 ring-amber-800/20 shadow-sm"
                              : "border-stone-200 hover:border-stone-300 bg-white"
                          }`}
                        >
                          <div className="relative aspect-video overflow-hidden bg-stone-100">
                            <img src={th.coverUrl || th.cover} alt={th.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                            <span className="absolute top-2.5 left-2.5 text-[9px] font-bold tracking-wider uppercase bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded">
                              {th.series || th.tag || th.subtitle}
                            </span>
                            {isSelected && (
                              <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold shadow-md">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-stone-900 text-xs">{th.name}</h3>
                              <p className="text-[10px] text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">{th.desc}</p>
                            </div>
                            <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                              <a
                                href={`/demo/${th.id}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] font-bold text-amber-800 hover:underline"
                              >
                                Lihat Demo
                              </a>
                              <span className={`text-[10px] font-bold ${isSelected ? "text-amber-900" : "text-stone-400"}`}>
                                {isSelected ? "Terpilih" : isThemeLocked ? "Terkunci" : "Pilih"}
                              </span>
                            </div>
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
                      onClick={() => updateFeatureSetting("colorPalette", pal.id)}
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
          </div>
        )}
      </section>

      {/* 2. SEKSI SAMPUL & VISUAL UTAMA (SEC2) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">2. Sampul, Visual &amp; Musik Latar</h2>
            <p className="text-xs text-stone-500">Foto sampul pop-up, visual desktop widescreen, dan musik latar otomatis</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec2)}
            isSaving={saving && savingSec === "sec2"}
            onSave={() => saveSection("sec2")}
            collapsed={Boolean(collapsed.sec2)}
            onToggle={() => toggleSection("sec2")}
            closedLabel="Edit Visual & Musik"
          />
        </div>

        {collapsed.sec2 ? (() => {
          const visualItems = [
            {
              id: "LANDING_COVER",
              label: "Sampul Pop-Up",
              isFilled: Boolean(media["LANDING_COVER"]),
              statusText: media["LANDING_COVER"] ? "Terpasang" : "Bawaan Tema",
            },
            {
              id: "DESKTOP_SIDEBAR",
              label: "Sidebar Desktop",
              isFilled: Boolean(media["DESKTOP_SIDEBAR"]),
              statusText: media["DESKTOP_SIDEBAR"] ? "Terpasang" : "Bawaan Tema",
            },
            {
              id: "MUSIC",
              label: "Musik Latar",
              isFilled: Boolean(showMusic && (invitation.musicUrl || musicPresets.length > 0)),
              statusText: showMusic ? (invitation.musicUrl || musicPresets.length > 0 ? "Aktif" : "Bawaan Tema") : "Nonaktif",
            },
            {
              id: "HOME_PHOTO",
              label: "Latar Home",
              isFilled: Boolean(media["HOME_PHOTO"]),
              statusText: media["HOME_PHOTO"] ? "Terpasang" : "Bawaan Tema",
            },
            {
              id: "CLOSING_COVER",
              label: "Foto Penutup",
              isFilled: Boolean(media["CLOSING_COVER"]),
              statusText: media["CLOSING_COVER"] ? "Terpasang" : "Bawaan Tema",
            },
            {
              id: "GLOBAL_FIXED_BG",
              label: "Fixed Background",
              isFilled: Boolean(media["GLOBAL_FIXED_BG"]),
              statusText: media["GLOBAL_FIXED_BG"] ? "Terpasang" : "Bawaan Tema",
            },
          ];

          const completedVisuals = visualItems.filter((v) => v.isFilled);
          const uncompletedVisuals = visualItems.filter((v) => !v.isFilled);

          return (
            <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                {/* Baris 1: Media Kustom yang Sudah Terpasang (Indikator Hijau) */}
                {completedVisuals.length > 0 ? (
                  <div className="flex items-center gap-3 flex-wrap text-xs text-stone-600">
                    {completedVisuals.map((item, idx) => (
                      <span key={item.id} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>{item.label}: <strong className="text-stone-800">{item.statusText}</strong></span>
                        {idx < completedVisuals.length - 1 && <span className="text-stone-300 ml-1">•</span>}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>Format visual siap: <strong className="text-stone-800">Menggunakan Desain Asli Tema</strong></span>
                  </div>
                )}

                {/* Baris 2: Keterangan Tenang untuk Slot Opsional / Bawaan Tema (Tanpa Titik Merah) */}
                {uncompletedVisuals.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px] text-stone-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0"></span>
                    <span>
                      {completedVisuals.length > 0
                        ? `Slot lainnya (${uncompletedVisuals.map((v) => v.label).join(", ")}): Bawaan Desain Tema (Opsional)`
                        : "Semua slot visual menggunakan perpaduan estetika asli tema."}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => toggleSection("sec2")}
                className="text-xs font-bold text-amber-800 hover:underline shrink-0 self-start sm:self-center cursor-pointer"
              >
                Ubah Visual &amp; Musik
              </button>
            </div>
          );
        })() : (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PhotoInput
                label="Landing Cover (Pop-Up)"
                desc="Foto atau Video vertikal pembuka saat tamu klik 'Buka Undangan'"
                value={media["LANDING_COVER"] || ""}
                onChange={(url) => updateMedia("LANDING_COVER", url)}
                placeholder="https://.../cover-popup.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="LANDING_COVER"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Latar Belakang Home (Opsional)"
                desc="Foto di seksi pembuka setelah sampul dibuka. Jika kosong, otomatis menggunakan kanvas atau warna latar bawaan tema."
                value={media["HOME_PHOTO"] || ""}
                onChange={(url) => updateMedia("HOME_PHOTO", url)}
                placeholder="https://.../home-bg.jpg"
                invitationId={invitationId}
                slot="HOME_PHOTO"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Desktop Sidebar (70% Kiri)"
                desc="Foto landscape atau Video vertikal layar lebar desktop (Opsional)"
                value={media["DESKTOP_SIDEBAR"] || ""}
                onChange={(url) => updateMedia("DESKTOP_SIDEBAR", url)}
                placeholder="https://.../sidebar-desktop.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="DESKTOP_SIDEBAR"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Foto Penutup (Footer - Opsional)"
                desc="Foto background di seksi penutup undangan. Jika kosong, otomatis menggunakan desain penutup asli tema."
                value={media["CLOSING_COVER"] || ""}
                onChange={(url) => updateMedia("CLOSING_COVER", url)}
                placeholder="https://.../closing.jpg"
                invitationId={invitationId}
                slot="CLOSING_COVER"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Global Fixed Background (Opsional)"
                desc="Foto latar belakang kanvas di balik kartu undangan. Jika kosong, otomatis menggunakan wallpaper atau warna asli tema."
                value={media["GLOBAL_FIXED_BG"] || ""}
                onChange={(url) => updateMedia("GLOBAL_FIXED_BG", url)}
                placeholder="https://.../fixed-bg.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="GLOBAL_FIXED_BG"
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />

              {/* Panduan Media Visual & Rekomendasi Video Loop */}
              <div className="md:col-span-3 p-4 rounded-xl border border-stone-200/90 bg-stone-50/80 text-stone-700 text-xs space-y-2">
                <div className="flex items-center gap-2 text-stone-900 font-semibold">
                  <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Panduan & Rekomendasi Media Visual Undangan</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-stone-600 pt-1">
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
                    <span className="font-bold text-stone-800 block mb-0.5">Format & Kompatibilitas</span>
                    Foto: JPG, PNG, WebP (maks 15 MB). Video: MP4, MOV (iPhone), WebM (maks 30 MB).
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
                    <span className="font-bold text-stone-800 block mb-0.5">Rekomendasi Durasi Video</span>
                    Ideal 10–20 detik (mode loop sinematik tanpa audio). Durasi di atas 20 detik dipotong otomatis oleh sistem.
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
                    <span className="font-bold text-stone-800 block mb-0.5">Orientasi Tampilan</span>
                    Gunakan video portrait (9:16) untuk Landing Cover, dan landscape (16:9) untuk Desktop Sidebar.
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
                  <div className="p-3.5 bg-white rounded-xl border border-dashed border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Upload File Musik (.mp3 / .m4a)</span>
                      <span className="text-[11px] text-stone-500">Pilih lagu dari laptop atau HP Anda (Maksimal 15 MB)</span>
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
          </div>
        )}
      </section>

      {/* 3. SEKSI PROFIL MEMPELAI (SEC3) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">3. Profil Kedua Mempelai</h2>
            <p className="text-xs text-stone-500">Data lengkap, akun sosial media, dan foto portrait pengantin</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec3)}
            isSaving={saving && savingSec === "sec3"}
            onSave={() => saveSection("sec3")}
            collapsed={Boolean(collapsed.sec3)}
            onToggle={() => toggleSection("sec3")}
            closedLabel="Edit Profil"
          />
        </div>

        {collapsed.sec3 ? (() => {
          const isBrideFirst = displayOrder === "BRIDE_FIRST";
          const bridePhotoFilled = Boolean(media["BRIDE_PHOTO"]);
          const groomPhotoFilled = Boolean(media["GROOM_PHOTO"]);

          const photoItems = isBrideFirst
            ? [
                {
                  id: "BRIDE_PHOTO",
                  label: "Foto Mempelai Wanita",
                  isFilled: bridePhotoFilled,
                },
                {
                  id: "GROOM_PHOTO",
                  label: "Foto Mempelai Pria",
                  isFilled: groomPhotoFilled,
                },
              ]
            : [
                {
                  id: "GROOM_PHOTO",
                  label: "Foto Mempelai Pria",
                  isFilled: groomPhotoFilled,
                },
                {
                  id: "BRIDE_PHOTO",
                  label: "Foto Mempelai Wanita",
                  isFilled: bridePhotoFilled,
                },
              ];

          return (
            <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 text-xs text-stone-600">
                <div className="space-y-0.5">
                  <p>Mempelai Wanita: <strong className="text-stone-900">{invitation.brideName || "-"}</strong> ({invitation.brideNickname || "-"})</p>
                  <p>Mempelai Pria: <strong className="text-stone-900">{invitation.groomName || "-"}</strong> ({invitation.groomNickname || "-"})</p>
                  <p className="text-[11px] text-stone-400">Urutan Tampil: {isBrideFirst ? "Pihak Wanita Dahulu" : "Pihak Pria Dahulu"}</p>
                </div>

                {/* Status Indikator Foto Portrait Kedua Mempelai */}
                <div className="flex items-center gap-3 flex-wrap pt-1.5 border-t border-stone-200/60">
                  {photoItems.map((item, idx) => (
                    <span key={item.id} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.isFilled ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                      <span>
                        {item.label}: <strong className={item.isFilled ? "text-stone-800" : "text-amber-700 font-semibold"}>
                          {item.isFilled ? "Terpasang" : "Perlu Diunggah (Atau Monogram)"}
                        </strong>
                      </span>
                      {idx < photoItems.length - 1 && <span className="text-stone-300 ml-1">•</span>}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSection("sec3")}
                className="text-xs font-bold text-amber-800 hover:underline self-start sm:self-center cursor-pointer shrink-0"
              >
                Ubah Profil
              </button>
            </div>
          );
        })() : (
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
                      <Input label="Nama Orang Tua Wanita" value={invitation.brideParents || ""} onChange={(v) => updateField("brideParents", v)} placeholder="Putri dari Bapak Tomm Posma & Ibu Endang Noffiyanti" />
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
                      <Input label="Nama Orang Tua Pria" value={invitation.groomParents || ""} onChange={(v) => updateField("groomParents", v)} placeholder="Putra dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti" />
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
                      <Input label="Nama Orang Tua Pria" value={invitation.groomParents || ""} onChange={(v) => updateField("groomParents", v)} placeholder="Putra dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti" />
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
                      <Input label="Nama Orang Tua Wanita" value={invitation.brideParents || ""} onChange={(v) => updateField("brideParents", v)} placeholder="Putri dari Bapak Tomm Posma & Ibu Endang Noffiyanti" />
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
          </div>
        )}
      </section>

      {/* 4. SEKSI KUTIPAN PEMBUKA (SEC4) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">4. Kutipan Pembuka</h2>
            <p className="text-xs text-stone-500">Kutipan indah, puisi cinta, kata mutiara, ayat suci, atau doa pembuka undangan</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec4)}
            isSaving={saving && savingSec === "sec4"}
            onSave={() => saveSection("sec4")}
            collapsed={Boolean(collapsed.sec4)}
            onToggle={() => toggleSection("sec4")}
            closedLabel="Edit Kutipan"
          />
        </div>

        {collapsed.sec4 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5 text-xs text-stone-600 max-w-2xl">
              <p className="italic line-clamp-1">&ldquo;{invitation.openingQuote || "-"}&rdquo;</p>
              <p className="font-bold text-amber-900">{invitation.openingQuoteRef || "-"}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec4")}
              className="text-xs font-bold text-amber-800 hover:underline self-start sm:self-center"
            >
              Ubah Kutipan
            </button>
          </div>
        ) : (
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
              <Input
                label="Judul Seksi (Bebas Kustom)"
                value={getCustomLabel("quoteTitle", "Kutipan & Doa")}
                onChange={(v) => updateCustomLabel("quoteTitle", v)}
                placeholder="Kutipan Cinta / Kata Mutiara / Pappaseng / Ayat Suci"
              />
              <Input
                label="Referensi Sumber Kutipan"
                value={invitation.openingQuoteRef || ""}
                onChange={(v) => updateField("openingQuoteRef", v)}
                placeholder="QS. AR-RUM : 21 / SAPARDI DJOKO DAMONO / OUR SACRED PROMISE"
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
          </div>
        )}
      </section>

      {/* 5. SEKSI RANGKAIAN ACARA (SEC5) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">5. Rangkaian Acara (Multi-Event)</h2>
            <p className="text-xs text-stone-500">Atur seluruh agenda adat dan resepsi (Akad, Resepsi, Mappacci, dll.)</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec5)}
            isSaving={saving && savingSec === "sec5"}
            onSave={() => saveSection("sec5")}
            collapsed={Boolean(collapsed.sec5)}
            onToggle={() => toggleSection("sec5")}
            closedLabel="Edit Acara"
          />
        </div>

        {collapsed.sec5 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 text-xs text-stone-600">
              <span className="font-bold text-stone-900">{events.length} Sesi Terdaftar:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {events.map((ev, i) => (
                  <span key={i} className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-700 font-medium">
                    {ev.title || `Sesi ${i + 1}`} ({ev.date || "-"})
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec5")}
              className="text-xs font-bold text-amber-800 hover:underline self-start sm:self-center"
            >
              Kelola Sesi
            </button>
          </div>
        ) : (
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
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-950 mt-3 mb-1">
                <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className="font-bold text-amber-900">Jadwal Acara Telah Terkunci</p>
                  <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                    Tanggal acara terkunci secara otomatis setelah undangan diterbitkan untuk menjamin akurasi jadwal sistem retensi. Jika terdapat perubahan jadwal darurat, silakan hubungi Customer Support / Admin.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4 mt-2">
              {events.map((ev, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Sesi #{idx + 1} — {ev.title || "Acara"}</span>
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
                    <Input
                      label="Hari, Tanggal"
                      value={ev.date || ""}
                      onChange={(v) => updateEventItem(idx, "date", v)}
                      placeholder="Sabtu, 15 Juni 2026"
                      disabled={invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED"}
                      subtitle={(invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED") ? "Terkunci Pasca Publish" : undefined}
                    />
                    <Input label="Waktu / Jam" value={ev.time || ""} onChange={(v) => updateEventItem(idx, "time", v)} placeholder="Contoh: 09:00 - 12:00 WIB / WITA / WIT" />
                    <Input label="Nama Lokasi / Gedung" value={ev.location || ""} onChange={(v) => updateEventItem(idx, "location", v)} placeholder="Contoh: Gedung Pertemuan / Rumah Mempelai" />
                    <Input label="Alamat Lengkap" value={ev.address || ""} onChange={(v) => updateEventItem(idx, "address", v)} placeholder="Contoh: Jl. Melati No. 10" />
                    <Input label="Link Google Maps" value={ev.mapsUrl || ""} onChange={(v) => updateEventItem(idx, "mapsUrl", v)} placeholder="https://maps.app.goo.gl/..." />
                    <Input label="Label Badge" value={ev.badge || ""} onChange={(b) => updateEventItem(idx, "badge", b)} placeholder="Sakral / Adat Bugis / Umum" />
                    <div className="sm:col-span-2">
                      <Input label="Catatan Tambahan (Opsional)" value={ev.notes || ""} onChange={(v) => updateEventItem(idx, "notes", v)} placeholder="Masukkan catatan tambahan untuk tamu (Opsional)" />
                    </div>
                  </div>
                </div>
              ))}
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
          </div>
        )}
      </section>

      {/* 6. SEKSI KARTU AKSES QR & CHECK-IN (SEC6) */}
      {hasCap("qr_checkin") && (
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">6. Kartu Akses QR &amp; Check-In Tamu</h2>
            <p className="text-xs text-stone-500">Tampilkan QR Code tiket dan tombol buka kartu akses untuk scanning buku tamu di lokasi acara</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec6)}
            isSaving={saving && savingSec === "sec6"}
            onSave={() => saveSection("sec6")}
            collapsed={Boolean(collapsed.sec6)}
            onToggle={() => toggleSection("sec6")}
            closedLabel="Edit QR Pass"
          />
        </div>

        {collapsed.sec6 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              <span>Status: <strong>{showQrCheckin ? "Aktif (QR & Voucher Souvenir Ditampilkan)" : "Dinonaktifkan"}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec6")}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              Ubah Pengaturan
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900">Aktifkan Kartu Akses QR &amp; Check-In:</span>
                <p className="text-[11px] text-stone-500">Tamu dapat menunjukkan QR Code saat tiba di meja resepsionis untuk check-in cepat</p>
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
          </div>
        )}
      </section>
      )}

      {/* 7. SEKSI KISAH CINTA (SEC7) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">7. Kisah Cinta (Journey of Love)</h2>
            <p className="text-xs text-stone-500">Tuliskan babak perjalanan cinta dari awal bertemu hingga pernikahan</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec7)}
            isSaving={saving && savingSec === "sec7"}
            onSave={() => saveSection("sec7")}
            collapsed={Boolean(collapsed.sec7)}
            onToggle={() => toggleSection("sec7")}
            closedLabel="Edit Kisah"
          />
        </div>

        {collapsed.sec7 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              <span>Status: <strong>{showStory ? `${stories.length} Babak Kisah Terpasang` : "Seksi Dinonaktifkan"}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec7")}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              Ubah Kisah
            </button>
          </div>
        ) : (
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
          </div>
        )}
      </section>

      {/* 8. SEKSI GALERI & VIDEO (SEC8) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">8. Galeri Foto Pre-Wedding &amp; Video Teaser</h2>
            <p className="text-xs text-stone-500">Mendukung Folder Google Drive (CDN stream), Smart Puzzle Grid dinamis acak, dan modal galeri penuh</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec8)}
            isSaving={saving && savingSec === "sec8"}
            onSave={() => saveSection("sec8")}
            collapsed={Boolean(collapsed.sec8)}
            onToggle={() => toggleSection("sec8")}
            closedLabel="Edit Galeri"
          />
        </div>

        {collapsed.sec8 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600 space-y-0.5">
              <p>Status Galeri: <strong>{showGallery ? "Aktif (Smart Puzzle Grid)" : "Dinonaktifkan"}</strong></p>
              <p>Google Drive: <span className="font-mono text-stone-500">{getFeatureSetting("galleryDriveFolderUrl", "") ? "Folder Terhubung" : "Preset Demo"}</span></p>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec8")}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              Ubah Galeri
            </button>
          </div>
        ) : (
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
          </div>
        )}
      </section>

      {/* 9. SEKSI TANDA KASIH & AMPLOP (SEC9) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">9. Tanda Kasih &amp; Amplop Digital</h2>
            <p className="text-xs text-stone-500">Kelola nomor rekening bank, QRIS statis, dan alamat pengiriman kado fisik</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec9)}
            isSaving={saving && savingSec === "sec9"}
            onSave={() => saveSection("sec9")}
            collapsed={Boolean(collapsed.sec9)}
            onToggle={() => toggleSection("sec9")}
            closedLabel="Edit Amplop"
          />
        </div>

        {collapsed.sec9 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600 space-y-0.5">
              <p>Status: <strong>{showGift ? `${bankList.length} Rekening Terdaftar` : "Dinonaktifkan"}</strong></p>
              <p>Alamat Kado: <span className="text-stone-500 line-clamp-1">{invitation.shippingAddress || "Belum diatur"}</span></p>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec9")}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              Ubah Rekening
            </button>
          </div>
        ) : (
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
          </div>
        )}
      </section>

      {/* 10. SEKSI DRESS CODE (SEC10) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">10. Panduan Busana (Dress Code Guide)</h2>
            <p className="text-xs text-stone-500">Atur palet warna pakaian dan anjuran busana untuk para tamu undangan</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec10)}
            isSaving={saving && savingSec === "sec10"}
            onSave={() => saveSection("sec10")}
            collapsed={Boolean(collapsed.sec10)}
            onToggle={() => toggleSection("sec10")}
            closedLabel="Edit Dress Code"
          />
        </div>

        {collapsed.sec10 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              <span>Status: <strong>{showDresscode ? (invitation.dresscode || "Aktif") : "Dinonaktifkan"}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec10")}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              Ubah Dress Code
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Panduan Dress Code:</span>
              <SectionHeaderToggle
                label=""
                checked={showDresscode}
                onChange={(v) => updateFeatureSetting("showDresscode", v)}
              />
            </div>

            {showDresscode && (() => {
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
                            <span className="text-amber-600">✨</span>
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
            })()}

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
          </div>
        )}
      </section>

      {/* 11. SEKSI LIVE STREAMING (SEC11) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">11. Siaran Langsung (Live Streaming)</h2>
            <p className="text-xs text-stone-500">Tautkan link siaran virtual YouTube Live, Instagram Live, atau Zoom Meeting</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec11)}
            isSaving={saving && savingSec === "sec11"}
            onSave={() => saveSection("sec11")}
            collapsed={Boolean(collapsed.sec11)}
            onToggle={() => toggleSection("sec11")}
            closedLabel="Edit Live Stream"
          />
        </div>

        {collapsed.sec11 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              <span>Status: <strong>{showLiveStream ? "Aktif" : "Dinonaktifkan"}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec11")}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              Ubah Link Live
            </button>
          </div>
        ) : (
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
          </div>
        )}
      </section>

      {/* 12. SEKSI FILTER INSTAGRAM (SEC12) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">12. Filter Instagram (Wedding Frame AR)</h2>
            <p className="text-xs text-stone-500">Tautkan link effect / filter Instagram Story resmi pernikahan Anda</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec12)}
            isSaving={saving && savingSec === "sec12"}
            onSave={() => saveSection("sec12")}
            collapsed={Boolean(collapsed.sec12)}
            onToggle={() => toggleSection("sec12")}
            closedLabel="Edit Filter"
          />
        </div>

        {collapsed.sec12 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              <span>Status: <strong>{showFilter ? (getFeatureSetting("instagramFilterUrl", "") ? "Terhubung" : "Aktif") : "Dinonaktifkan"}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec12")}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              Ubah Filter
            </button>
          </div>
        ) : (
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
          </div>
        )}
      </section>

      {/* 13. SEKSI TURUT MENGUNDANG & HIMBAUAN (SEC13) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">13. Turut Mengundang &amp; Himbauan Tamu</h2>
            <p className="text-xs text-stone-500">Daftar keluarga besar yang turut mengundang dan catatan kenyamanan tamu</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec13)}
            isSaving={saving && savingSec === "sec13"}
            onSave={() => saveSection("sec13")}
            collapsed={Boolean(collapsed.sec13)}
            onToggle={() => toggleSection("sec13")}
            closedLabel="Edit Keluarga"
          />
        </div>

        {collapsed.sec13 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              <span>Status: <strong>{showTurutMengundang ? "Aktif" : "Dinonaktifkan"}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec13")}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              Ubah Daftar
            </button>
          </div>
        ) : (
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
          </div>
        )}
      </section>
      {/* 14. SEKSI GALERI KENANGAN TAMU (SEC14) */}
      {hasCap("guest_memories") && (
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900">14. Galeri Kenangan Tamu (After-Event)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Live Photo Drop
              </span>
            </div>
            <p className="text-xs text-stone-500">Tampung foto candid yang dibagikan para tamu undangan pasca acara</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec14)}
            isSaving={saving && savingSec === "sec14"}
            onSave={() => saveSection("sec14")}
            collapsed={Boolean(collapsed.sec14)}
            onToggle={() => toggleSection("sec14")}
            closedLabel="Kelola Kenangan"
          />
        </div>

        {collapsed.sec14 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${getFeatureSetting("showGuestMemories", true) ? "bg-emerald-500" : "bg-rose-500"}`}></span>
              <span>Status: <strong className={getFeatureSetting("showGuestMemories", true) ? "text-stone-900" : "text-rose-700"}>{getFeatureSetting("showGuestMemories", true) ? "Aktif di Undangan" : "Dinonaktifkan"}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec14")}
              className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
            >
              Buka Pengaturan
            </button>
          </div>
        ) : (
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
              <div className="space-y-5">
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

                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100/80 border border-amber-300/60 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-xs text-stone-600 space-y-1">
                    <span className="font-bold text-stone-900 block">Monitoring &amp; Unduh Arsip Foto Tamu</span>
                    <p className="leading-relaxed text-[11px]">
                      Daftar kiriman foto tamu, unduhan arsip ZIP, dan tautan publik album kenangan dapat Anda kelola langsung di halaman <strong>Dashboard Utama</strong>.
                    </p>
                    <Link
                      href="/dashboard#section-galeri-kenangan"
                      className="inline-flex items-center gap-1 font-bold text-amber-800 hover:underline text-[11px] pt-0.5"
                    >
                      <span>Buka Galeri Kenangan di Dashboard &rarr;</span>
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
          </div>
        )}
      </section>
      )}

      {/* 15. SEKSI PENGATURAN TEKS UI & LABEL (SEC15) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">15. Pengaturan Teks UI &amp; Label</h2>
            <p className="text-xs text-stone-500">Kustomisasi teks tombol RSVP, formulir, sampul, dan hitung mundur</p>
          </div>
          <SectionHeaderActions
            isDirty={Boolean(isDirty.sec15)}
            isSaving={saving && savingSec === "sec15"}
            onSave={() => saveSection("sec15")}
            collapsed={Boolean(collapsed.sec15)}
            onToggle={() => toggleSection("sec15")}
            closedLabel="Edit Label"
          />
        </div>

        {collapsed.sec15 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5 text-xs text-stone-600 max-w-2xl">
              <p className="font-semibold text-stone-900">
                Tombol RSVP: &ldquo;{getCustomLabel("rsvpBtnText", "Kirim Konfirmasi & Doa")}&rdquo;
              </p>
              <p className="text-stone-500 text-[11px]">
                Tombol Buka: &ldquo;{getCustomLabel("openBtn", "Buka Undangan")}&rdquo; · Judul RSVP: &ldquo;{getCustomLabel("rsvpTitle", "RSVP & Doa Restu")}&rdquo;
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec15")}
              className="text-xs font-bold text-amber-800 hover:underline self-start sm:self-center"
            >
              Ubah Label
            </button>
          </div>
        ) : (
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
          </div>
        )}
      </section>

        </div>
      )}
      {/* ── UPGRADE PAKET MODAL ────────────────────────────────────── */}
      {upgradeModal && (
        <div
          className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setUpgradeModal(false); }}
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-violet-900 to-indigo-900 p-6 text-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold tracking-widest uppercase text-violet-300">Upgrade Paket</span>
                <button onClick={() => setUpgradeModal(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <h2 className="text-xl font-serif font-bold">Tingkatkan Akses Tema</h2>
              <p className="text-violet-200 text-xs mt-1">Paket saat ini: <strong className="text-white">{planType}</strong></p>
            </div>

            {/* Tier Options */}
            <div className="p-5 space-y-3">
              {(["MODERN", "PREMIUM"] as const)
                .filter((t) => PLAN_HIERARCHY[t] > PLAN_HIERARCHY[planType])
                .map((tier) => {
                  const diff = (PLAN_PRICES[tier] ?? 0) - (PLAN_PRICES[planType] ?? 0);
                  const isSelected = upgradeTarget === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setUpgradeTarget(tier)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition ${
                        isSelected
                          ? "border-violet-600 bg-violet-50 shadow-sm"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-violet-600 bg-violet-600" : "border-stone-300"
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white"/>}
                          </div>
                          <span className="font-bold text-sm text-stone-900">{tier}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-stone-500">Tambah bayar</span>
                          <p className="font-bold text-violet-700 text-sm">Rp {diff.toLocaleString("id-ID")}</p>
                        </div>
                      </div>
                      <ul className="space-y-1 pl-6">
                        {(PLAN_FEATURES[tier] ?? []).map((f, i) => (
                          <li key={i} className="text-xs text-stone-600 flex items-start gap-1.5">
                            <svg className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}

              {/* Add-on Custom Domain Opsional (Hanya muncul jika memilih PREMIUM & fitur diaktifkan admin) */}
              {upgradeTarget === "PREMIUM" && (platformSettings?.addon_custom_domain_enabled ?? platformSettings?.addonCustomDomainEnabled ?? true) && (
                <div className="p-4 rounded-2xl border border-violet-200 bg-violet-50/70 space-y-2.5 transition">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCustomDomain}
                      onChange={(e) => setIncludeCustomDomain(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-violet-600 border-stone-300 focus:ring-violet-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">
                          Tambah Custom Domain Pribadi (.com / .id)
                        </span>
                        <span className="text-xs font-bold text-violet-700">
                          +Rp {Number(platformSettings?.addon_custom_domain_price ?? platformSettings?.addonCustomDomainPrice ?? 150000).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                        Masa aktif 1 tahun penuh & simpan galeri foto kenangan hingga 365 hari pasca-acara (tidak wajib).
                      </p>
                    </div>
                  </label>

                  {includeCustomDomain && (
                    <div className="pt-2 border-t border-violet-200/60 space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-violet-800">
                        Nama Domain yang Diinginkan
                      </label>
                      <input
                        type="text"
                        value={upgradeDomainInput}
                        onChange={(e) => setUpgradeDomainInput(e.target.value)}
                        placeholder="contoh: namakamu.com"
                        className="w-full px-3 py-2 text-xs border border-violet-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

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
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-800 hover:to-indigo-800 text-white shadow-lg shadow-violet-200"
                >
                  {upgrading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Memproses...</span></>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                      <span>
                        Upgrade Sekarang{upgradeTarget ? ` ke ${upgradeTarget}` : ""}
                        {(() => {
                          if (!upgradeTarget) return "";
                          const diff = (PLAN_PRICES[upgradeTarget] ?? 0) - (PLAN_PRICES[planType] ?? 0);
                          const domainPrice = Number(platformSettings?.addon_custom_domain_price ?? platformSettings?.addonCustomDomainPrice ?? 150000);
                          const total = diff + (upgradeTarget === "PREMIUM" && includeCustomDomain ? domainPrice : 0);
                          return ` (Rp ${total.toLocaleString("id-ID")})`;
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
}) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const isVideo = Boolean(
    value && /\.(mp4|webm|mov)(\?.*)?$/i.test(value)
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side file size guards
    const isVideoFile = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
    const maxVideoSize = 30 * 1024 * 1024; // 30 MB
    const maxPhotoSize = 15 * 1024 * 1024; // 15 MB

    if (isVideoFile && file.size > maxVideoSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      alert(`Ukuran video terlalu besar (${sizeMB} MB). Maksimal ukuran file video adalah 30 MB. Silakan potong durasi (maks 20 detik) atau kompres video Anda terlebih dahulu.`);
      e.target.value = "";
      return;
    }

    if (!isVideoFile && file.size > maxPhotoSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      alert(`Ukuran foto terlalu besar (${sizeMB} MB). Maksimal ukuran foto adalah 15 MB.`);
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
        onChange(data.url);
      } else {
        alert(data.error || "Gagal mengunggah file.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mengunggah file.");
    } finally {
      setUploading(false);
      onUploadEnd?.();
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-stone-900">{label}</h4>
          <p className="text-[10px] text-stone-500 leading-tight mt-0.5">{desc}</p>
        </div>
      </div>

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
                <span className="text-[10px] text-stone-400">
                  {allowVideo ? "Foto (JPG, PNG, WebP) atau Video (MP4, MOV, WebM)" : "Format Foto (JPG, PNG)"}
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
  collapsed,
  onToggle,
  closedLabel,
  openLabel = "Tutup",
}: {
  isDirty: boolean;
  isSaving?: boolean;
  onSave: () => void;
  collapsed: boolean;
  onToggle: () => void;
  closedLabel: string;
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
      <button
        type="button"
        onClick={onToggle}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
          collapsed
            ? "bg-amber-50 text-amber-900 hover:bg-amber-100"
            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
        }`}
      >
        {collapsed ? closedLabel : openLabel}
      </button>
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