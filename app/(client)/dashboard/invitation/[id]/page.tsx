"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";

const THEMES = [
  // ── Premium Store (themes/premium/) ──
  {
    id: "kalandra",
    name: "Kalandra",
    subtitle: "Premium",
    category: "premium",
    desc: "Modern, Elegan & Minimalis",
    cover: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    tag: "Editorial",
  },
  {
    id: "valente",
    name: "Valente",
    subtitle: "Premium",
    category: "premium",
    desc: "High-Fashion, Editorial & Mewah",
    cover: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80",
    tag: "Editorial",
  },
  {
    id: "aurelia",
    name: "Aurelia",
    subtitle: "Premium",
    category: "premium",
    desc: "Romantis, Sinematik & Anggun",
    cover: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&q=80",
    tag: "Cinematic",
  },
  {
    id: "artisan",
    name: "Artisan",
    subtitle: "Premium",
    category: "premium",
    desc: "Artistik, Hangat & Vintage",
    cover: "https://images.unsplash.com/photo-1513279922550-250c24738d87?w=600&q=80",
    tag: "Vintage",
  },

  // ── Traditional Store (themes/traditional/) ──
  {
    id: "badrika",
    name: "Badrika",
    subtitle: "Traditional",
    category: "traditional",
    desc: "Walimatul 'Urs & Saoraja Royal",
    cover: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    tag: "Saoraja",
  },
  {
    id: "candani",
    name: "Candani",
    subtitle: "Traditional",
    category: "traditional",
    desc: "Pesona Nusantara Floral",
    cover: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    tag: "Nusantara",
  },
  {
    id: "dillalucky",
    name: "Dilla Lucky",
    subtitle: "Traditional",
    category: "traditional",
    desc: "Islami Sakral — Batik Ornament & Penuh Berkah",
    cover: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    tag: "Islami",
  },
  {
    id: "mayang",
    name: "Mayang",
    subtitle: "Traditional",
    category: "traditional",
    desc: "Nuansa Adat & Anggun",
    cover: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&q=80",
    tag: "Traditional",
  },
  {
    id: "prameswari",
    name: "Prameswari",
    subtitle: "Traditional",
    category: "traditional",
    desc: "Sakral, Megah & Royal Keraton",
    cover: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    tag: "Keraton",
  },

  // ── Modern Store (themes/modern/) ──
  {
    id: "ameera",
    name: "Ameera",
    subtitle: "Modern",
    category: "modern",
    desc: "Heritage Modern — Elegan Dark & Nuansa Warisan",
    cover: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600&q=80",
    tag: "Heritage",
  },
  {
    id: "chronicle",
    name: "Chronicle",
    subtitle: "Modern",
    category: "modern",
    desc: "High-Fashion Vogue Editorial",
    cover: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80",
    tag: "Editorial",
  },
  {
    id: "lumina",
    name: "Lumina",
    subtitle: "Modern",
    category: "modern",
    desc: "Minimalist Glass & Cinema",
    cover: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    tag: "Glass",
  },
  {
    id: "papercut",
    name: "Papercut",
    subtitle: "Modern",
    category: "modern",
    desc: "Moody Papercut — Kraft Paper Aesthetic & Artistik",
    cover: "https://images.unsplash.com/photo-1513279922550-250c24738d87?w=600&q=80",
    tag: "Papercut",
  },
  {
    id: "solaria",
    name: "Solaria",
    subtitle: "Modern",
    category: "modern",
    desc: "Romantic Sunset Glow",
    cover: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&q=80",
    tag: "Sunset",
  },
  {
    id: "wave",
    name: "Wave",
    subtitle: "Modern",
    category: "modern",
    desc: "Dark, Moody & Dramatic — Gelombang Elegan",
    cover: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80",
    tag: "Moody",
  },
];

const COLOR_PALETTES = [
  { id: "champagne", name: "Royal Champagne Gold", hex: "#a67c52", desc: "Elegan, netral, universal mewah" },
  { id: "emerald", name: "Emerald Green & Gold", hex: "#1b4332", desc: "Nuansa agung khas Bugis-Makassar / Islami" },
  { id: "burgundy", name: "Burgundy & Rose Gold", hex: "#54192b", desc: "Megah, klasik, dan romantis berani" },
  { id: "sage", name: "Botanical Sage Green", hex: "#4a5d4e", desc: "Segar, earthy, dan organik kekinian" },
  { id: "terracotta", name: "Warm Terracotta & Sand", hex: "#8c583a", desc: "Hangat, rustic modern, dan estetik" },
  { id: "monochrome", name: "Monochrome Dark & Silver", hex: "#262626", desc: "Minimalis editorial hitam-putih" },
];

const MUSIC_PRESETS = [
  {
    id: "canon-in-d",
    title: "Canon in D — Johann Pachelbel",
    genre: "Piano & Strings Klasik Romantis",
    url: "/music/canon-in-d.ogg",
  },
  {
    id: "pachelbel-piano",
    title: "Canon in D — Piano Solo (Lee Galloway)",
    genre: "Solo Piano Syahdu & Khidmat",
    url: "/music/pachelbel-piano.ogg",
  },
  {
    id: "canon-gigue",
    title: "Canon & Gigue in D — Strings & Organ",
    genre: "Orkestra Strings Sakral & Megah",
    url: "/music/canon-gigue.ogg",
  },
  {
    id: "moonlight-sonata",
    title: "Moonlight Sonata Mvt. 2 — Beethoven",
    genre: "Piano Klasik Lembut & Romantis",
    url: "/music/moonlight-sonata.ogg",
  },
];

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
  const [uploadingCount, setUploadingCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [savedSnapshot, setSavedSnapshot] = useState<any>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState<string>("6281234567890");
  const [platformSettings, setPlatformSettings] = useState<any>(null);

  // Dual-Native Studio State: Form Mode vs Live Visual Editor
  const [activeStudioTab, setActiveStudioTab] = useState<"form" | "live">("form");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const liveIframeRef = useRef<HTMLIFrameElement>(null);

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
    sec4: true,  // 4. Doa Pembuka & Pappaseng
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
  };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(defaultCollapsed);
  const [guestMemoriesList, setGuestMemoriesList] = useState<any[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);

  const fetchGuestMemories = useCallback(async () => {
    if (!invitationId) return;
    setLoadingMemories(true);
    try {
      const res = await fetch(`/api/client/invitations/${invitationId}/memories`);
      const data = await res.json();
      if (data.success) {
        setGuestMemoriesList(data.memories || []);
      }
    } catch (e) {
      console.error("Failed to fetch guest memories:", e);
    } finally {
      setLoadingMemories(false);
    }
  }, [invitationId]);

  useEffect(() => {
    fetchGuestMemories();
  }, [fetchGuestMemories]);

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus foto/video kenangan ini?")) return;
    setDeletingMemoryId(memoryId);
    try {
      const res = await fetch(`/api/client/invitations/${invitationId}/memories?memoryId=${memoryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setGuestMemoriesList((prev) => prev.filter((m) => m.id !== memoryId));
      } else {
        alert(data.error || "Gagal menghapus.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghapus.");
    } finally {
      setDeletingMemoryId(null);
    }
  };

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
        const loadedEvents = ev.length > 0 ? ev : [
          { title: "Akad Nikah", date: "2026-10-05", time: "08:00 - 10:00 WITA", location: "Masjid Raya Makassar", address: "Jl. Masjid Raya, Makassar", mapsUrl: "https://maps.google.com", badge: "Sakral", notes: "" },
          { title: "Resepsi Pernikahan", date: "2026-10-05", time: "11:00 - 14:00 WITA", location: "Grand Ballroom Phinisi Hotel Clarion", address: "Jl. A.P. Pettarani, Makassar", mapsUrl: "https://maps.google.com", badge: "Umum", notes: "" },
        ];
        setEvents(loadedEvents);

        const st = parseJ(inv.loveStory, []);
        const loadedStories = st.length > 0 ? st : [
          { title: "Awal Bertemu", date: "2020", content: "Pertama kali dipertemukan dalam sebuah kegiatan akademis di kampus." },
          { title: "Lamaran Resmi", date: "2025", content: "Momen sakral saat kedua keluarga besar saling bersilaturahmi dan bersepakat." },
        ];
        setStories(loadedStories);

        const bk = parseJ(inv.bankAccounts, []);
        const loadedBanks = bk.length > 0 ? bk : [
          { bank: "BCA", number: "7330497518", name: inv.groomName || "Didan Faadhilah" },
        ];
        setBankList(loadedBanks);

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
      return { sec1: false, sec2: false, sec3: false, sec4: false, sec5: false, sec6: false, sec7: false, sec8: false, sec9: false };
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
      Boolean(getFeatureSetting("isNoPhoto", false)) !== Boolean(getSavedFeatureSetting("isNoPhoto", false)) ||
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
        date: "2026-10-05",
        time: "19:00 - Selesai WITA",
        location: "Grand Ballroom",
        address: "Makassar",
        mapsUrl: "https://maps.google.com",
        badge: "Acara",
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

  const isNoPhoto = Boolean(getFeatureSetting("isNoPhoto", false));
  const currentPalette = getFeatureSetting("colorPalette", "champagne");
  const displayOrder = getFeatureSetting("displayOrder", "BRIDE_FIRST");

  const currentThemeId = invitation.themeId === "kila" ? "kalandra" : invitation.themeId === "aruna" ? "prameswari" : invitation.themeId === "ivanna" ? "valente" : invitation.themeId === "danila" ? "aurelia" : invitation.themeId === "papercut" ? "artisan" : (invitation.themeId || "kalandra");
  const selectedThemeObj = THEMES.find((t) => t.id === currentThemeId) || THEMES[0];
  const selectedPaletteObj = COLOR_PALETTES.find((p) => p.id === currentPalette) || COLOR_PALETTES[0];

  const planType = invitation.order?.planType || "TRADITIONAL";
  const packageConfig = platformSettings?.packages?.find((p: any) => p.id === planType);
  const allowedCaps = packageConfig?.capabilities || [];
  const hasCap = (cap: string) => allowedCaps.includes(cap);

  const showMusic = getFeatureSetting("showMusic", true);
  const showStory = getFeatureSetting("showStory", true);
  const showGallery = getFeatureSetting("showGallery", true);
  const showGift = getFeatureSetting("showGift", true);
  const showDresscode = getFeatureSetting("showDresscode", true);
  const showQrCheckin = hasCap("qr_checkin") && getFeatureSetting("showQrCheckin", true);
  const showLiveStream = hasCap("livestream") && getFeatureSetting("showLiveStream", false);
  const showFilter = getFeatureSetting("showFilter", false);
  const showTurutMengundang = getFeatureSetting("showTurutMengundang", true);
  const showGuestMemoriesGlobal = hasCap("guest_memories") && getFeatureSetting("showGuestMemories", true);
  if (invitation.isLocked && !invitation.isEmergencyUnlocked) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-24 font-sans px-4 sm:px-0">
        <div className="py-32 text-center space-y-5">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-stone-200">
            <svg className="w-10 h-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900">Studio Terkunci Permanen</h2>
          <p className="text-stone-500 font-medium max-w-md mx-auto leading-relaxed">
            Acara telah lewat dan undangan ini kini berstatus Published Forever sebagai portofolio. Akses edit telah ditutup untuk menjaga keaslian arsip.
          </p>
          <div className="pt-4">
            <a
              href={`https://wa.me/${adminWhatsapp}?text=Halo%20Admin,%20mohon%20bantuan%20buka%20kunci%20darurat%20undangan%20saya`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-xl transition shadow-sm"
            >
              Hubungi CS untuk Bantuan
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 font-sans">
      
      {/* Emergency Unlock Banner */}
      {invitation.isEmergencyUnlocked && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <p className="text-xs font-semibold">
              Kunci Darurat Aktif: Administrator telah membuka akses edit darurat hingga {invitation.unlockExpiresAt ? new Date(invitation.unlockExpiresAt).toLocaleString('id-ID') : "24 Jam kedepan"}.
            </p>
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
              <h3 className="font-bold text-sm text-white">Undangan Terkunci (Arsip Seumur Hidup)</h3>
              <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                Tanggal acara pernikahan telah terlewati. Undangan Anda tetap aktif online seumur hidup sebagai kenang-kenangan. Form editor telah dikunci permanen untuk menjaga keaslian arsip.
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/${adminWhatsapp}?text=Halo%20Admin,%20mohon%20bantuan%20buka%20kunci%20darurat%20undangan%20saya`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 flex-shrink-0 shadow-sm"
          >
            <span>Hubungi Admin</span>
            <span>↗</span>
          </a>
        </div>
      )}

      {/* Top Header Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-amber-800 uppercase block">Studio Editor Undangan</span>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            {displayOrder === "BRIDE_FIRST" ? `${invitation.brideNickname || "Nasha"} & ${invitation.groomNickname || "Didan"}` : `${invitation.groomNickname || "Didan"} & ${invitation.brideNickname || "Nasha"}`}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-stone-500">
              Tema: <strong className="text-amber-900 font-bold capitalize">{selectedThemeObj.name}</strong>
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500">
              Nuansa: <strong className="text-stone-800 font-bold">{selectedPaletteObj.name}</strong>
            </span>
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
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">1. Pilihan Seri Desain &amp; Palet Warna</h2>
            <p className="text-xs text-stone-500">Pilih tema utama dan nuansa warna undangan pernikahan Anda.</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSection("sec1")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec1 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec1 ? "Edit Tema & Warna" : "Tutup"}
          </button>
        </div>

        {collapsed.sec1 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={selectedThemeObj.cover}
                alt={selectedThemeObj.name}
                className="w-14 h-14 rounded-xl object-cover border border-stone-200 shadow-xs flex-shrink-0"
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                  {selectedThemeObj.tag}
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
              Ubah Tema / Warna &rarr;
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-7 space-y-6">
            {/* Theme Mockups for this Category / Store */}
            {(() => {
              const availableThemes = THEMES.filter((t) => {
                const cat = (t.category || "").toUpperCase();
                const plan = planType.toUpperCase();
                if (plan === "PREMIUM") return true; 
                if (plan === "MODERN") return cat === "MODERN" || cat === "TRADITIONAL";
                if (plan === "TRADITIONAL") return cat === "TRADITIONAL"; 
                return true;
              });
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {availableThemes.map((th) => {
                    const isSelected = (invitation.themeId || "kalandra") === th.id;
                    return (
                      <div
                        key={th.id}
                        onClick={() => updateField("themeId", th.id)}
                        className={`rounded-2xl border overflow-hidden cursor-pointer transition flex flex-col ${
                          isSelected
                            ? "border-amber-800 bg-amber-50/30 ring-2 ring-amber-800/20 shadow-sm"
                            : "border-stone-200 hover:border-stone-300 bg-white"
                        }`}
                      >
                        <div className="relative aspect-video overflow-hidden bg-stone-100">
                          <img src={th.cover} alt={th.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                          <span className="absolute top-2.5 left-2.5 text-[9px] font-bold tracking-wider uppercase bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded">
                            {th.tag}
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
                              Lihat Demo &rarr;
                            </a>
                            <span className={`text-[10px] font-bold ${isSelected ? "text-amber-900" : "text-stone-400"}`}>
                              {isSelected ? "Terpilih" : "Pilih"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
          <button
            type="button"
            onClick={() => toggleSection("sec2")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec2 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec2 ? "Edit Visual & Musik" : "Tutup"}
          </button>
        </div>

        {collapsed.sec2 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap text-xs text-stone-600">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${media["LANDING_COVER"] ? "bg-emerald-500" : "bg-stone-300"}`}></span>
                <span>Sampul Pop-Up: <strong>{media["LANDING_COVER"] ? "Terpasang" : "Default"}</strong></span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${media["DESKTOP_SIDEBAR"] ? "bg-emerald-500" : "bg-stone-300"}`}></span>
                <span>Sidebar Desktop: <strong>{media["DESKTOP_SIDEBAR"] ? "Terpasang" : "Default"}</strong></span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${showMusic ? "bg-emerald-500" : "bg-stone-300"}`}></span>
                <span>Musik Latar: <strong>{showMusic ? (invitation.musicUrl ? "Aktif" : "Canon in D") : "Hening"}</strong></span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec2")}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              Ubah Visual &amp; Musik &rarr;
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Mode Tanpa Foto:</span>
              <SectionHeaderToggle
                label="Mode Tanpa Foto"
                sub="Ganti foto dengan Monogram"
                checked={isNoPhoto}
                onChange={(v) => updateFeatureSetting("isNoPhoto", v)}
              />
            </div>

            {!isNoPhoto ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PhotoInput
                  label="Landing Cover (Pop-Up)"
                  desc="Foto pembuka saat tamu klik 'Buka Undangan'"
                  value={media["LANDING_COVER"] || ""}
                  onChange={(url) => updateMedia("LANDING_COVER", url)}
                  placeholder="https://.../cover-popup.jpg"
                  invitationId={invitationId}
                  slot="LANDING_COVER"
                  onUploadStart={handleUploadStart}
                  onUploadEnd={handleUploadEnd}
                />
                <PhotoInput
                  label="Desktop Sidebar (70% Kiri)"
                  desc="Foto landscape atau Video vertikal layar lebar"
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
                  label="Global Fixed Background"
                  desc="Foto latar belakang di balik kartu undangan"
                  value={media["GLOBAL_FIXED_BG"] || ""}
                  onChange={(url) => updateMedia("GLOBAL_FIXED_BG", url)}
                  placeholder="https://.../fixed-bg.jpg atau .mp4"
                  allowVideo={true}
                  invitationId={invitationId}
                  slot="GLOBAL_FIXED_BG"
                  onUploadStart={handleUploadStart}
                  onUploadEnd={handleUploadEnd}
                />
              </div>
            ) : (
              <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl text-center space-y-1">
                <span className="text-xs font-bold text-amber-900">Mode Tanpa Foto Aktif</span>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Undangan akan menggunakan Monogram Kaligrafi Inisial ({displayOrder === "BRIDE_FIRST" ? "N & D" : "D & N"}) dengan nuansa ornamen mewah tanpa foto mempelai.
                </p>
              </div>
            )}

            {/* Musik Latar Pernikahan */}
            {hasCap("music") && (
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
                      <button
                        type="button"
                        onClick={() => togglePlayPreview(invitation.musicUrl || MUSIC_PRESETS[0].url)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition shrink-0 cursor-pointer ${
                          playingAudioUrl === (invitation.musicUrl || MUSIC_PRESETS[0].url)
                            ? "bg-amber-800 ring-2 ring-amber-600 animate-pulse"
                            : "bg-stone-900 hover:bg-stone-800"
                        }`}
                        title="Dengarkan Musik"
                      >
                        {playingAudioUrl === (invitation.musicUrl || MUSIC_PRESETS[0].url) ? (
                          <span className="text-xs font-bold">❚❚</span>
                        ) : (
                          <span className="text-xs font-bold ml-0.5">▶</span>
                        )}
                      </button>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Lagu Terpasang:</span>
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {MUSIC_PRESETS.find((p) => p.url === invitation.musicUrl)?.title ||
                            (invitation.musicUrl?.includes("uploads/invitations")
                              ? "File Musik Khusus (Upload Sendiri)"
                              : invitation.musicUrl?.includes("youtube.com") || invitation.musicUrl?.includes("youtu.be")
                              ? "Lagu dari YouTube"
                              : (invitation.musicUrl ? "Musik Kustom (Tautan Eksternal)" : "Canon in D — Johann Pachelbel"))}
                        </p>
                        <span className="text-[10px] text-stone-500 block truncate">
                          {MUSIC_PRESETS.find((p) => p.url === invitation.musicUrl)?.genre || (invitation.musicUrl || "Piano & Strings Klasik Sakral")}
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
                    <span className="block text-[11px] font-bold text-stone-700 mb-2">Atau Pilih Lagu Pernikahan Sakral Pilihan:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {MUSIC_PRESETS.map((preset) => {
                        const isSelected = (invitation.musicUrl || MUSIC_PRESETS[0].url) === preset.url;
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
                                <p className="text-[10px] text-stone-500 truncate">{preset.genre}</p>
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
            )}

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
          <button
            type="button"
            onClick={() => toggleSection("sec3")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec3 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec3 ? "Edit Profil" : "Tutup"}
          </button>
        </div>

        {collapsed.sec3 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5 text-xs text-stone-600">
              <p>Mempelai Wanita: <strong className="text-stone-900">{invitation.brideName || "-"}</strong> ({invitation.brideNickname || "-"})</p>
              <p>Mempelai Pria: <strong className="text-stone-900">{invitation.groomName || "-"}</strong> ({invitation.groomNickname || "-"})</p>
              <p className="text-[11px] text-stone-400">Urutan Tampil: {displayOrder === "BRIDE_FIRST" ? "Pihak Wanita Dahulu" : "Pihak Pria Dahulu"}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec3")}
              className="text-xs font-bold text-amber-800 hover:underline self-start sm:self-center"
            >
              Ubah Profil &rarr;
            </button>
          </div>
        ) : (
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
                      <Input label="Nama Lengkap Wanita *" value={invitation.brideName || ""} onChange={(v) => updateField("brideName", v)} placeholder="Nasha Selsabilla, S.Ds." />
                      <Input label="Nama Panggilan Wanita" value={invitation.brideNickname || ""} onChange={(v) => updateField("brideNickname", v)} placeholder="Nasha" />
                      <Input label="Nama Orang Tua Wanita" value={invitation.brideParents || ""} onChange={(v) => updateField("brideParents", v)} placeholder="Putri dari Bapak Tomm Posma & Ibu Endang Noffiyanti" />
                      <Input label="Username Instagram Wanita" value={invitation.brideInstagram || ""} onChange={(v) => updateField("brideInstagram", v)} placeholder="nashasl (tanpa @)" />
                    </div>
                  </div>

                  {/* Card Data Mempelai Pria */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                      <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Mempelai Pria (The Groom)</h3>
                      <span className="text-[10px] font-bold bg-stone-200/70 text-stone-800 px-2.5 py-0.5 rounded-full">Pria</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Nama Lengkap Pria *" value={invitation.groomName || ""} onChange={(v) => updateField("groomName", v)} placeholder="Didan Faadhilah, S.T." />
                      <Input label="Nama Panggilan Pria" value={invitation.groomNickname || ""} onChange={(v) => updateField("groomNickname", v)} placeholder="Didan" />
                      <Input label="Nama Orang Tua Pria" value={invitation.groomParents || ""} onChange={(v) => updateField("groomParents", v)} placeholder="Putra dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti" />
                      <Input label="Username Instagram Pria" value={invitation.groomInstagram || ""} onChange={(v) => updateField("groomInstagram", v)} placeholder="didanfaadhilah (tanpa @)" />
                    </div>
                  </div>

                  {/* Foto Portrait Berdampingan di Bagian Bawah */}
                  {!isNoPhoto && (
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
                  )}
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
                      <Input label="Nama Lengkap Pria *" value={invitation.groomName || ""} onChange={(v) => updateField("groomName", v)} placeholder="Didan Faadhilah, S.T." />
                      <Input label="Nama Panggilan Pria" value={invitation.groomNickname || ""} onChange={(v) => updateField("groomNickname", v)} placeholder="Didan" />
                      <Input label="Nama Orang Tua Pria" value={invitation.groomParents || ""} onChange={(v) => updateField("groomParents", v)} placeholder="Putra dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti" />
                      <Input label="Username Instagram Pria" value={invitation.groomInstagram || ""} onChange={(v) => updateField("groomInstagram", v)} placeholder="didanfaadhilah (tanpa @)" />
                    </div>
                  </div>

                  {/* Card Data Mempelai Wanita */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                      <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Mempelai Wanita (The Bride)</h3>
                      <span className="text-[10px] font-bold bg-stone-200/70 text-stone-800 px-2.5 py-0.5 rounded-full">Wanita</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Nama Lengkap Wanita *" value={invitation.brideName || ""} onChange={(v) => updateField("brideName", v)} placeholder="Nasha Selsabilla, S.Ds." />
                      <Input label="Nama Panggilan Wanita" value={invitation.brideNickname || ""} onChange={(v) => updateField("brideNickname", v)} placeholder="Nasha" />
                      <Input label="Nama Orang Tua Wanita" value={invitation.brideParents || ""} onChange={(v) => updateField("brideParents", v)} placeholder="Putri dari Bapak Tomm Posma & Ibu Endang Noffiyanti" />
                      <Input label="Username Instagram Wanita" value={invitation.brideInstagram || ""} onChange={(v) => updateField("brideInstagram", v)} placeholder="nashasl (tanpa @)" />
                    </div>
                  </div>

                  {/* Foto Portrait Berdampingan di Bagian Bawah */}
                  {!isNoPhoto && (
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
                  )}
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

      {/* 4. SEKSI KUTIPAN DOA & AYAT (SEC4) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">4. Kutipan Ayat / Doa Pembuka</h2>
            <p className="text-xs text-stone-500">Kalimat doa atau kutipan suci pembuka surat undangan</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSection("sec4")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec4 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec4 ? "Edit Doa" : "Tutup"}
          </button>
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
              Ubah Doa &rarr;
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-7 space-y-4">
            {/* Quick Presets for Multi-Religious / Universal Quotes */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">Pilih Preset Cepat Doa / Ayat:</label>
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
                    label: "Universal — Janji Suci",
                    quote: "Dan jika aku harus memilih kembali dalam seratus kehidupan, dalam seratus dunia, dalam versi realitas apa pun, aku akan tetap mencari dan memilih dirimu.",
                    ref: "OUR SACRED PROMISE",
                    title: "Doa & Harapan",
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
                label="Judul Seksi Doa (Bebas Kustom)"
                value={getCustomLabel("quoteTitle", "Pappaseng & Doa")}
                onChange={(v) => updateCustomLabel("quoteTitle", v)}
                placeholder="Pappaseng & Doa / Doa & Harapan / Ayat Suci"
              />
              <Input
                label="Referensi Sumber Kutipan"
                value={invitation.openingQuoteRef || ""}
                onChange={(v) => updateField("openingQuoteRef", v)}
                placeholder="QS. AR-RUM : 21 / 1 KORINTUS 13:4-7"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Teks Kutipan Doa / Ayat / Puisi</label>
              <textarea
                rows={3}
                value={invitation.openingQuote || ""}
                onChange={(e) => updateField("openingQuote", e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 leading-relaxed"
                placeholder="Tuliskan teks doa, ayat, atau kutipan indah di sini..."
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
                <span>{!isDirty.sec4 ? "Tersimpan" : "Simpan Doa Pembuka"}</span>
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
          <button
            type="button"
            onClick={() => toggleSection("sec5")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec5 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec5 ? "Edit Acara" : "Tutup"}
          </button>
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
              Kelola Sesi &rarr;
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
                    <Input label="Nama Sesi Acara" value={ev.title || ""} onChange={(v) => updateEventItem(idx, "title", v)} placeholder="Contoh: Mappacci / Akad Nikah" />
                    <Input label="Hari, Tanggal" value={ev.date || ""} onChange={(v) => updateEventItem(idx, "date", v)} placeholder="Sabtu, 15 Juni 2026" />
                    <Input label="Waktu / Jam" value={ev.time || ""} onChange={(v) => updateEventItem(idx, "time", v)} placeholder="19:30 - Selesai WITA" />
                    <Input label="Nama Lokasi / Gedung" value={ev.location || ""} onChange={(v) => updateEventItem(idx, "location", v)} placeholder="Grand Ballroom Phinisi" />
                    <Input label="Alamat Lengkap" value={ev.address || ""} onChange={(v) => updateEventItem(idx, "address", v)} placeholder="Jl. A.P. Pettarani No. 12" />
                    <Input label="Link Google Maps" value={ev.mapsUrl || ""} onChange={(v) => updateEventItem(idx, "mapsUrl", v)} placeholder="https://maps.google.com/..." />
                    <Input label="Label Badge" value={ev.badge || ""} onChange={(b) => updateEventItem(idx, "badge", b)} placeholder="Sakral / Adat Bugis / Umum" />
                    <div className="sm:col-span-2">
                      <Input label="Catatan Tambahan (Opsional)" value={ev.notes || ""} onChange={(v) => updateEventItem(idx, "notes", v)} placeholder="Contoh: Dresscode Adat / Hadir 15 Menit Awal" />
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
          <button
            type="button"
            onClick={() => toggleSection("sec6")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec6 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec6 ? "Edit QR Pass" : "Tutup"}
          </button>
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
              Ubah Pengaturan &rarr;
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
          <button
            type="button"
            onClick={() => toggleSection("sec7")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec7 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec7 ? "Edit Kisah" : "Tutup"}
          </button>
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
              Ubah Kisah &rarr;
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
                      <Input label="Judul Momen" value={st.title || ""} onChange={(v) => updateStoryItem(idx, "title", v)} placeholder="Contoh: Awal Bertemu" />
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
          <button
            type="button"
            onClick={() => toggleSection("sec8")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec8 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec8 ? "Edit Galeri" : "Tutup"}
          </button>
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
              Ubah Galeri &rarr;
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
                    placeholder="https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ?usp=sharing"
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono"
                  />
                  <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900">
                    Pastikan akses link folder di Google Drive disetel ke <strong>&ldquo;Siapa saja yang memiliki link dapat melihat&rdquo;</strong>.
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
          <button
            type="button"
            onClick={() => toggleSection("sec9")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec9 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec9 ? "Edit Amplop" : "Tutup"}
          </button>
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
              Ubah Rekening &rarr;
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
                          placeholder="Didan Faadhilah"
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
          <button
            type="button"
            onClick={() => toggleSection("sec10")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec10 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec10 ? "Edit Dress Code" : "Tutup"}
          </button>
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
              Ubah Dress Code &rarr;
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

            {showDresscode && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nuansa / Aturan Dress Code"
                    value={invitation.dresscode || ""}
                    onChange={(v) => updateField("dresscode", v)}
                    placeholder="Contoh: Formal / Nuansa Pastel & Earthy"
                  />
                  <Input
                    label="Palet Warna Hex (Pisahkan dengan koma)"
                    value={getFeatureSetting("dressCodeColors", "#a67c52, #2b2725, #faf7f2")}
                    onChange={(v) => updateFeatureSetting("dressCodeColors", v)}
                    placeholder="#a67c52, #2b2725, #faf7f2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Catatan Tambahan Busana (Opsional)</label>
                  <textarea
                    rows={2}
                    value={getFeatureSetting("dressCodeNote", "")}
                    onChange={(e) => updateFeatureSetting("dressCodeNote", e.target.value)}
                    placeholder="Contoh: Diharapkan mengenakan pakaian bernuansa earthy tone untuk keserasian foto bersama."
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
              </div>
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
          </div>
        )}
      </section>

      {/* 11. SEKSI LIVE STREAMING (SEC11) */}
      {hasCap("livestream") && (
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">11. Siaran Langsung (Live Streaming)</h2>
            <p className="text-xs text-stone-500">Tautkan link siaran virtual YouTube Live, Instagram Live, atau Zoom Meeting</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSection("sec11")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec11 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec11 ? "Edit Live Stream" : "Tutup"}
          </button>
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
              Ubah Link Live &rarr;
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
                  placeholder="https://youtube.com/live/..."
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
      )}

      {/* 12. SEKSI FILTER INSTAGRAM (SEC12) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">12. Filter Instagram (Wedding Frame AR)</h2>
            <p className="text-xs text-stone-500">Tautkan link effect / filter Instagram Story resmi pernikahan Anda</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSection("sec12")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec12 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec12 ? "Edit Filter" : "Tutup"}
          </button>
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
              Ubah Filter &rarr;
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
          <button
            type="button"
            onClick={() => toggleSection("sec13")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec13 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec13 ? "Edit Keluarga" : "Tutup"}
          </button>
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
              Ubah Daftar &rarr;
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
                    placeholder="Contoh: Tamu diharapkan hadir 15 menit sebelum acara. Area parkir VIP tersedia di sisi utara gedung."
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
            <p className="text-xs text-stone-500">Tampung foto candid &amp; video ucapan yang dibagikan tamu ke album Google Drive pengantin</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSection("sec14")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              collapsed.sec14 ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {collapsed.sec14 ? "Kelola Kenangan" : "Tutup"}
          </button>
        </div>

        {collapsed.sec14 ? (
          <div className="p-5 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-600 flex items-center gap-3">
              <span>Status: <strong>{getFeatureSetting("showGuestMemories", true) ? "Aktif" : "Dinonaktifkan"}</strong></span>
              <span className="text-stone-300">•</span>
              <span><strong>{guestMemoriesList.length}</strong> Foto/Video Masuk</span>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("sec14")}
              className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
            >
              Buka Pengaturan &rarr;
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
                    value={getCustomLabel("memoriesSubtitle", "Punya foto candid atau video seru selama menghadiri pernikahan kami? Bagikan momen spesial Anda langsung ke album pribadi kami.")}
                    onChange={(e) => updateCustomLabel("memoriesSubtitle", e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 resize-none"
                  />
                </div>

                {/* Google Drive Folder Link Container */}
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-950">
                      Link Folder Google Drive Penampung (Opsional)
                    </label>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      Stream CDN
                    </span>
                  </div>
                  <input
                    type="url"
                    value={getFeatureSetting("guestMemoriesDriveFolderUrl", "")}
                    onChange={(e) => updateFeatureSetting("guestMemoriesDriveFolderUrl", e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/1ABCxyz..."
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono"
                  />
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    <strong>Panduan Akses:</strong> Buat 1 folder di Google Drive Anda, ubah akses sharing folder menjadi <em>&ldquo;Siapa saja yang memiliki link &rarr; Editor (Pengedit)&rdquo;</em>, lalu tempel link-nya di sini agar sistem dapat menerima upload foto tamu secara instan sekaligus men-stream ke galeri.
                  </p>
                </div>
                {/* Link Permanen Galeri Kenangan Tamu */}
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 tracking-wider uppercase block font-mono">
                      LINK PERMANEN ALBUM KENANGAN (SEUMUR HIDUP)
                    </span>
                    <span className="text-xs font-mono font-bold text-stone-900 break-all">
                      {typeof window !== "undefined" ? window.location.origin : "https://luxenary.id"}
                      {`/${invitation.groomSlug}-${invitation.brideSlug}/${invitation.invitationSlug}/memories`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/${invitation.groomSlug}-${invitation.brideSlug}/${invitation.invitationSlug}/memories`;
                        navigator.clipboard.writeText(url);
                        alert("Link galeri kenangan berhasil disalin!");
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                    >
                      Salin Link
                    </button>
                    <a
                      href={`/${invitation.groomSlug}-${invitation.brideSlug}/${invitation.invitationSlug}/memories`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs"
                    >
                      <span>Buka Galeri</span>
                    </a>
                  </div>
                </div>

                {/* Real-time Submissions Monitoring List */}
                <div className="pt-4 border-t border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-stone-900 flex items-center gap-2">
                      <span>Daftar Foto &amp; Video Masuk dari Tamu</span>
                      <span className="px-2 py-0.5 bg-stone-200 text-stone-800 rounded-full text-[10px] font-mono">
                        {guestMemoriesList.length}
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={fetchGuestMemories}
                      disabled={loadingMemories}
                      className="text-xs text-amber-800 font-bold hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh</span>
                    </button>
                  </div>

                  {guestMemoriesList.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 text-center text-xs text-stone-500 font-medium">
                      Belum ada kiriman foto atau video dari tamu. Saat acara berlangsung, foto yang dikirim tamu akan muncul di sini secara otomatis.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                      {guestMemoriesList.map((item) => (
                        <div key={item.id} className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex gap-3 items-start relative group">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-stone-300 flex items-center justify-center">
                            {item.mediaType === "VIDEO" ? (
                              <div className="text-xs font-bold text-stone-600 text-center">Video</div>
                            ) : (
                              <img src={item.mediaUrl} alt={item.senderName} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-stone-900 truncate">{item.senderName}</h4>
                              <button
                                type="button"
                                onClick={() => handleDeleteMemory(item.id)}
                                disabled={deletingMemoryId === item.id}
                                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold transition cursor-pointer p-1"
                                title="Hapus kiriman ini"
                              >
                                {deletingMemoryId === item.id ? "..." : "✕"}
                              </button>
                            </div>
                            <p className="text-[10px] text-stone-500 font-mono truncate">{item.senderEmail}</p>
                            {item.message && (
                              <p className="text-[11px] text-stone-700 mt-1 line-clamp-2 italic">
                                &ldquo;{item.message}&rdquo;
                              </p>
                            )}
                            <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-stone-200/60">
                              <span className="text-[10px] text-stone-400">
                                {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <a
                                href={item.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-amber-800 hover:underline inline-flex items-center gap-1"
                              >
                                <span>Lihat Full ↗</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

        </div>
      )}

    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-stone-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
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
    value && (value.endsWith(".mp4") || value.endsWith(".webm") || value.includes("video"))
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    onUploadStart?.();
    try {
      const formData = new FormData();
      formData.append("file", file);
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
                    accept={allowVideo ? "image/*,video/mp4,video/webm" : "image/*"}
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
                  {allowVideo ? "Format Foto (JPG, PNG) atau Video (.mp4)" : "Format Foto (JPG, PNG)"}
                </span>
              </>
            )}
            <input
              type="file"
              accept={allowVideo ? "image/*,video/mp4,video/webm" : "image/*"}
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