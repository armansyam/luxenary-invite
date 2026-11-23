"use client";

import { useState, useEffect, useCallback } from "react";
import { getApexRootDomain } from "@/lib/domainUtils";
import { PERSONAL_SUB_EVENT_PRESETS, EVENT_SUB_EVENT_PRESETS } from "@/lib/invitationUtils";
import { useFeedback } from "@/components/ui/Feedback";
import AdminDemoStudioModal from "@/components/admin/AdminDemoStudioModal";

interface AdminThemesTabProps {
  themes: any[];
  setThemes: React.Dispatch<React.SetStateAction<any[]>>;
  platformName?: string;
  showAdminToast: (msg: string, ok?: boolean) => void;
  onSyncSuccess: () => void;
}

export default function AdminThemesTab({
  themes,
  setThemes,
  platformName,
  showAdminToast,
  onSyncSuccess,
}: AdminThemesTabProps) {
  const feedback = useFeedback();
  const settingsMap = { platform_name: platformName || "" };

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<any | null>(null);
  const [themeForm, setThemeForm] = useState({
    id: "",
    name: "",
    eventType: "WEDDING",
    subEvent: "",
    category: "minimalist",
    series: "Minimalist",
    description: "",
    sortOrder: 1,
    isActive: true,
    defaultMusicUrl: "",
  });
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSyncing, setThemeSyncing] = useState(false);
  const [themeSyncResult, setThemeSyncResult] = useState<any>(null);

  useEffect(() => {
    if (!themeSyncResult) return;
    const timer = setTimeout(() => {
      setThemeSyncResult(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [themeSyncResult]);

  const [themeError, setThemeError] = useState<string | null>(null);
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<string>("all");
  const [themeEventTypeFilter, setThemeEventTypeFilter] = useState<string>("all");
  const [themeStatusFilter, setThemeStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [themeSearch, setThemeSearch] = useState<string>("");
  const [themeFile, setThemeFile] = useState<File | null>(null);

  const [demoStudioTheme, setDemoStudioTheme] = useState<any | null>(null);

  const [themeSubTab, setThemeSubTab] = useState<"themes" | "drafts" | "music">("themes");
  const [systemMusics, setSystemMusics] = useState<any[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicUploading, setMusicUploading] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [editingMusic, setEditingMusic] = useState<any | null>(null);
  const [musicForm, setMusicForm] = useState({
    title: "",
    composer: "",
    genre: "",
  });
  const [selectedMusicFile, setSelectedMusicFile] = useState<File | null>(null);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);
  const [musicAudioInstance, setMusicAudioInstance] = useState<HTMLAudioElement | null>(null);

  const fetchSystemMusics = useCallback(async () => {
    setMusicLoading(true);
    try {
      const res = await fetch("/api/admin/music", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.music)) {
        setSystemMusics(data.music);
      }
    } catch (err) {
      console.error("Gagal mengambil data musik:", err);
    } finally {
      setMusicLoading(false);
    }
  }, []);

  const handleToggleMusicActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/music/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        setSystemMusics((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isActive: !currentActive } : m))
        );
        showAdminToast(currentActive ? "Musik dinonaktifkan" : "Musik diaktifkan", true);
      } else {
        showAdminToast(data.error || "Gagal mengubah status musik", false);
      }
    } catch (err) {
      showAdminToast("Terjadi kesalahan jaringan saat mengubah status musik.", false);
    }
  };

  const handleDeleteMusic = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/admin/music/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (playingMusicId === id && musicAudioInstance) {
          musicAudioInstance.pause();
          setPlayingMusicId(null);
        }
        setSystemMusics((prev) => prev.filter((m) => m.id !== id));
        showAdminToast(`Lagu "${title}" berhasil dihapus`, true);
      } else {
        showAdminToast(data.error || "Gagal menghapus musik", false);
      }
    } catch (err) {
      showAdminToast("Terjadi kesalahan saat menghapus lagu.", false);
    }
  };

  const handlePlayPreviewMusic = (music: any) => {
    if (playingMusicId === music.id) {
      musicAudioInstance?.pause();
      setPlayingMusicId(null);
      return;
    }

    if (musicAudioInstance) {
      musicAudioInstance.pause();
    }

    const audio = new Audio(music.url);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingMusicId(null);
    setMusicAudioInstance(audio);
    setPlayingMusicId(music.id);
  };

  const handleOpenAddMusicModal = () => {
    setEditingMusic(null);
    setMusicForm({
      title: "",
      composer: "",
      genre: "ROMANTIC",
    });
    setSelectedMusicFile(null);
    setShowMusicModal(true);
  };

  const handleOpenEditMusic = (music: any) => {
    setEditingMusic(music);
    setMusicForm({
      title: music.title || "",
      composer: music.composer || "",
      genre: music.genre || "",
    });
    setSelectedMusicFile(null);
    setShowMusicModal(true);
  };

  const handleSaveMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicForm.title.trim()) {
      showAdminToast("Judul lagu wajib diisi.", false);
      return;
    }

    setMusicUploading(true);
    try {
      if (editingMusic) {
        const res = await fetch(`/api/admin/music/${editingMusic.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: musicForm.title.trim(),
            composer: musicForm.composer.trim() || null,
            genre: musicForm.genre.trim() || null,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSystemMusics((prev) =>
            prev.map((m) => (m.id === editingMusic.id ? data.music : m))
          );
          setShowMusicModal(false);
          showAdminToast("Data musik berhasil diperbarui!", true);
        } else {
          showAdminToast(data.error || "Gagal memperbarui data musik", false);
        }
      } else {
        if (!selectedMusicFile) {
          showAdminToast("Pilih file audio terlebih dahulu.", false);
          setMusicUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", selectedMusicFile);
        formData.append("title", musicForm.title.trim());
        if (musicForm.composer.trim()) formData.append("composer", musicForm.composer.trim());
        if (musicForm.genre.trim()) formData.append("genre", musicForm.genre.trim());

        const res = await fetch("/api/admin/music", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          setSystemMusics((prev) => [data.music, ...prev]);
          setShowMusicModal(false);
          showAdminToast("Musik baru berhasil diunggah!", true);
        } else {
          showAdminToast(data.error || "Gagal mengunggah musik baru", false);
        }
      }
    } catch (err: any) {
      showAdminToast(err.message || "Terjadi kesalahan saat menyimpan musik", false);
    } finally {
      setMusicUploading(false);
    }
  };

  const handleOpenNewTheme = () => {
    if (systemMusics.length === 0) {
      fetchSystemMusics();
    }
    setEditingTheme(null);
    setThemeFile(null);
    setThemeForm({
      id: "",
      name: "",
      eventType: "WEDDING",
      subEvent: "",
      category: "minimalist",
      series: "Minimalist",
      description: "",
      sortOrder: (themes.length + 1),
      isActive: true,
      defaultMusicUrl: "",
    });
    setThemeError(null);
    setShowThemeModal(true);
  };

  const handleOpenEditTheme = (th: any) => {
    if (systemMusics.length === 0) {
      fetchSystemMusics();
    }
    setEditingTheme(th);
    setThemeFile(null);
    setThemeForm({
      id: th.id,
      name: th.name,
      eventType: th.eventType || "WEDDING",
      subEvent: th.subEvent || "",
      category: th.category || "minimalist",
      series: th.series || (th.category === "traditional" ? "Traditional" : th.category === "modern" ? "Modern" : "Minimalist"),
      description: th.description || "",
      sortOrder: th.sortOrder || 1,
      isActive: th.isActive !== false,
      defaultMusicUrl: th.defaultMusicUrl || "",
    });
    setThemeError(null);
    setShowThemeModal(true);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeForm.id || !themeForm.name) {
      setThemeError("ID Tema dan Nama Tema wajib diisi");
      return;
    }
    if (!editingTheme && !themeFile) {
      setThemeError("File master template (.html) wajib diunggah untuk tema baru.");
      return;
    }
    if (themeFile && !themeFile.name.toLowerCase().endsWith(".html")) {
      setThemeError("File master wajib berformat .html");
      return;
    }

    setThemeSaving(true);
    setThemeError(null);
    try {
      const url = "/api/admin/themes";
      const method = editingTheme ? "PUT" : "POST";
      const formData = new FormData();
      formData.append("id", themeForm.id);
      formData.append("name", themeForm.name);
      formData.append("eventType", themeForm.eventType || "WEDDING");
      formData.append("subEvent", themeForm.eventType === "WEDDING" ? "" : (themeForm.subEvent || "").trim());
      formData.append("category", themeForm.category);
      formData.append("series", themeForm.series);
      formData.append("description", themeForm.description);
      formData.append("sortOrder", String(themeForm.sortOrder));
      formData.append("isActive", String(themeForm.isActive));
      formData.append("defaultMusicUrl", themeForm.defaultMusicUrl || "");
      if (themeFile) {
        formData.append("file", themeFile);
      }

      const res = await fetch(url, {
        method,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan tema");
      }
      setShowThemeModal(false);
      setThemeFile(null);
      if (editingTheme && data.theme) {
        setThemes((prev) => prev.map((t) => (t.id === data.theme.id ? { ...t, ...data.theme } : t)));
        showAdminToast(`Tema "${data.theme.name}" berhasil diperbarui`, true);
      } else if (data.theme) {
        setThemes((prev) => [...prev, data.theme]);
        showAdminToast(`Tema baru "${data.theme.name}" berhasil ditambahkan`, true);
      } else {
        // Fallback jika response tidak menyertakan payload tema
        fetch("/api/admin/themes").then((r) => r.json()).then((d) => {
          if (d.success && Array.isArray(d.themes)) setThemes(d.themes);
        }).catch(() => {});
      }
    } catch (err: any) {
      setThemeError(err.message);
    } finally {
      setThemeSaving(false);
    }
  };

  const handleDeleteTheme = async (themeId: string, themeName: string) => {
    try {
      const res = await fetch(`/api/admin/themes?id=${themeId}`, { method: "DELETE" });
      if (res.ok) {
        setThemes((prev) => prev.filter((t) => t.id !== themeId));
        showAdminToast(`Tema "${themeName}" berhasil dihapus`, true);
      } else {
        const d = await res.json();
        showAdminToast("Error: " + d.error, false);
      }
    } catch (err: any) {
      showAdminToast("Gagal: " + err.message, false);
    }
  };

  const handleToggleThemeStatus = async (th: any) => {
    const newActive = th.isActive === false ? true : false;
    // Optimistic update instan tanpa beban reload overview
    setThemes((prev) =>
      prev.map((t) => (t.id === th.id ? { ...t, isActive: newActive } : t))
    );
    try {
      const res = await fetch("/api/admin/themes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: th.id, isActive: newActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status tema");
      }
      showAdminToast(`Status tema "${th.name}" diubah ke ${newActive ? "Aktif" : "Nonaktif"}`, true);
    } catch (err: any) {
      // Revert status jika gagal
      setThemes((prev) =>
        prev.map((t) => (t.id === th.id ? { ...t, isActive: !newActive } : t))
      );
      showAdminToast("Gagal: " + err.message, false);
    }
  };

  const handleReleaseDraftTheme = async (th: any) => {
    setThemes((prev) =>
      prev.map((t) => (t.id === th.id ? { ...t, isActive: true, series: null } : t))
    );
    try {
      const res = await fetch("/api/admin/themes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: th.id, isActive: true, series: null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal merilis tema draf");
      }
      showAdminToast(`🚀 Tema "${th.name}" resmi dirilis & dipindahkan ke Katalog Tema!`, true);
    } catch (err: any) {
      setThemes((prev) =>
        prev.map((t) => (t.id === th.id ? { ...t, isActive: false, series: "DRAFT_REVIEW" } : t))
      );
      showAdminToast("Gagal merilis draf: " + err.message, false);
    }
  };

  const handleSyncThemes = async () => {
    try {
      setThemeSyncing(true);
      setThemeSyncResult(null);
      const res = await fetch("/api/admin/themes/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setThemeSyncResult(data);
        showAdminToast("Sinkronisasi tema berhasil!", true);
        onSyncSuccess();
      } else {
        showAdminToast(data.error || "Gagal menyinkronkan tema", false);
      }
    } catch (err: any) {
      showAdminToast("Gagal: " + err.message, false);
    } finally {
      setThemeSyncing(false);
    }
  };

  const handleOpenDemoStudio = (theme: any) => {
    if (systemMusics.length === 0) {
      fetchSystemMusics();
    }
    setDemoStudioTheme(theme);
  };

  return (
    <>
                <div className="space-y-6">
                  {/* Sub-Tab Navigation: Katalog Tema vs Draft Themes vs Pustaka Musik */}
                  {(() => {
                    const catalogCount = themes.filter((t) => t.id !== "starter-blueprint" && t.series !== "DRAFT_REVIEW").length;
                    const draftCount = themes.filter((t) => t.id !== "starter-blueprint" && t.series === "DRAFT_REVIEW").length;
                    return (
                  <div className="flex items-center gap-2 border-b border-stone-200 pb-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setThemeSubTab("themes")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        themeSubTab === "themes"
                          ? "bg-stone-900 text-white shadow-xs"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span>Katalog Tema ({catalogCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeSubTab("drafts")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        themeSubTab === "drafts"
                          ? "bg-indigo-700 text-white shadow-xs"
                          : draftCount > 0
                            ? "bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      <span>🕵️ Draft Themes</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        themeSubTab === "drafts"
                          ? "bg-white/20 text-white"
                          : draftCount > 0
                            ? "bg-indigo-600 text-white"
                            : "bg-stone-200 text-stone-600"
                      }`}>
                        {draftCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setThemeSubTab("music");
                        fetchSystemMusics();
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        themeSubTab === "music"
                          ? "bg-amber-800 text-white shadow-xs"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span>Pustaka Musik Sistem ({systemMusics.length})</span>
                    </button>
                  </div>
                    );
                  })()}

                  {themeSubTab === "themes" ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                        <span className="sm:hidden">Katalog Tema</span>
                        <span className="hidden sm:inline">Katalog &amp; Manajemen Tema</span>
                      </h2>
                      <p className="hidden sm:block text-sm text-gray-500 mt-0.5">Kelola daftar tema per kategori (Modern &amp; Traditional), status aktif, dan urutan</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSyncThemes}
                        disabled={themeSyncing}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Scan ulang folder themes/, daftarkan tema baru, dan bersihkan cache demo"
                      >
                        <svg className={`w-3.5 h-3.5 ${themeSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{themeSyncing ? "Menyinkronkan..." : "Sinkronisasi Tema & Cache"}</span>
                      </button>
                      <a
                        href="/downloads/starter-blueprint.html"
                        download="starter-blueprint.html"
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-stone-300 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Blueprint</span>
                      </a>
                      <a
                        href="/admin/theme-builder"
                        className="hidden lg:flex px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition items-center gap-1.5 shadow-xs"
                        title="Rancang tema pernikahan baru tanpa menulis kode: warna, huruf, tata letak, ornamen, animasi"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16v5H4zM4 14h7v5H4zM15 14h5v5h-5z" />
                        </svg>
                        <span>Buat dengan Builder</span>
                      </a>
                      <button
                        onClick={handleOpenNewTheme}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span>+</span>
                        <span>Tambah Tema Baru</span>
                      </button>
                    </div>
                  </div>

                  {/* Sync Result Banner */}
                  {themeSyncResult && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <h4 className="text-xs font-bold text-emerald-900">
                            {themeSyncResult.message} ({themeSyncResult.syncedCount} Tema Terdeteksi)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setThemeSyncResult(null)}
                          className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 cursor-pointer"
                        >
                          Tutup
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                        {themeSyncResult.discoveredThemes?.map((th: any) => (
                          <div key={th.id} className="text-[11px] bg-white/80 border border-emerald-100 p-2 rounded-lg flex items-center justify-between">
                            <span className="font-semibold text-stone-800">{th.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${th.isHealthValid ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-amber-100 text-amber-800 font-bold'}`}>
                              {th.isHealthValid ? "Tersinkron" : "Cek Token"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* EventType + Category + Status Filter (Unified SaaS Control Bar) */}
                  {(() => {
                    const validThemes = themes.filter((t) => t.id !== "starter-blueprint" && t.series !== "DRAFT_REVIEW");

                    const countWedding  = validThemes.filter((t) => !t.eventType || t.eventType === "WEDDING").length;
                    const countPersonal = validThemes.filter((t) => t.eventType === "PERSONAL").length;
                    const countEvent    = validThemes.filter((t) => t.eventType === "EVENT").length;

                    const eventTypeFilteredThemes = themeEventTypeFilter === "all"
                      ? validThemes
                      : validThemes.filter((t) =>
                          themeEventTypeFilter === "wedding"
                            ? (!t.eventType || t.eventType === "WEDDING")
                            : t.eventType === themeEventTypeFilter.toUpperCase()
                        );

                    const countMinimalist  = eventTypeFilteredThemes.filter((t) => (t.category || "").toLowerCase() === "minimalist" || (t.category || "").toLowerCase() === "premium").length;
                    const countModern      = eventTypeFilteredThemes.filter((t) => (t.category || "").toLowerCase() === "modern").length;
                    const countTraditional = eventTypeFilteredThemes.filter((t) => (t.category || "").toLowerCase() === "traditional").length;

                    const categoryTabs = [
                      countMinimalist  > 0 ? { id: "minimalist",  label: `Minimalis (${countMinimalist})` }  : null,
                      countModern      > 0 ? { id: "modern",      label: `Modern (${countModern})` }          : null,
                      countTraditional > 0 ? { id: "traditional", label: `Tradisional (${countTraditional})` } : null,
                    ].filter(Boolean) as { id: string; label: string }[];

                    const categoryFilteredThemes = themeCategoryFilter === "all"
                      ? eventTypeFilteredThemes
                      : eventTypeFilteredThemes.filter((t) => {
                          const cat = (t.category || "").toLowerCase();
                          if (themeCategoryFilter === "minimalist") return cat === "minimalist" || cat === "premium";
                          return cat === themeCategoryFilter;
                        });

                    const countStatusActive = categoryFilteredThemes.filter((t) => t.isActive !== false).length;
                    const countStatusInactive = categoryFilteredThemes.filter((t) => t.isActive === false).length;

                    const statusFilteredThemes = themeStatusFilter === "all"
                      ? categoryFilteredThemes
                      : categoryFilteredThemes.filter((t) =>
                          themeStatusFilter === "active" ? t.isActive !== false : t.isActive === false
                        );

                    const displayedThemes = themeSearch.trim()
                      ? statusFilteredThemes.filter((t) =>
                          t.name.toLowerCase().includes(themeSearch.toLowerCase()) ||
                          t.id.toLowerCase().includes(themeSearch.toLowerCase())
                        )
                      : statusFilteredThemes;

                    return (
                      <div className="space-y-4">
                        {/* 1. Master Segmented Event Bar */}
                        <div className="bg-stone-100/90 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar border border-stone-200/80">
                          {[
                            { id: "all",      label: "Semua",               count: validThemes.length },
                            { id: "wedding",  label: "Pernikahan",          count: countWedding },
                            { id: "personal", label: "Personal & Keluarga", count: countPersonal },
                            { id: "event",    label: "Acara & Event Umum",  count: countEvent },
                          ].map((tab) => {
                            const isActive = themeEventTypeFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                  setThemeEventTypeFilter(tab.id);
                                  setThemeCategoryFilter("all");
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 shrink-0 ${
                                  isActive
                                    ? "bg-white text-stone-900 shadow-xs font-bold"
                                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                                }`}
                              >
                                <span>{tab.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                                  isActive
                                    ? "bg-stone-900 text-white font-bold"
                                    : "bg-stone-200 text-stone-600 font-medium"
                                }`}>
                                  {tab.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* 2. Sub-Filter Toolbar: Search + Style Category Chips + Status Filter (Aktif / Nonaktif) */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-stone-200/80">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative w-full sm:w-60">
                              <input
                                type="text"
                                value={themeSearch}
                                onChange={(e) => setThemeSearch(e.target.value)}
                                placeholder="Cari nama atau slug tema..."
                                className="w-full pl-8 pr-7 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                              />
                              <svg className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              {themeSearch && (
                                <button
                                  type="button"
                                  onClick={() => setThemeSearch("")}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Status Filter: Semua | Aktif | Nonaktif */}
                            <div className="inline-flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200/80 shrink-0">
                              {[
                                { id: "all", label: `Semua (${categoryFilteredThemes.length})`, activeCls: "bg-white text-stone-900 shadow-2xs font-bold" },
                                { id: "active", label: `● Aktif (${countStatusActive})`, activeCls: "bg-emerald-600 text-white shadow-2xs font-bold" },
                                { id: "inactive", label: `○ Nonaktif (${countStatusInactive})`, activeCls: "bg-stone-700 text-white shadow-2xs font-bold" },
                              ].map((st) => {
                                const isSel = themeStatusFilter === st.id;
                                return (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setThemeStatusFilter(st.id as "all" | "active" | "inactive")}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer whitespace-nowrap ${
                                      isSel ? st.activeCls : "text-stone-600 hover:text-stone-900 font-medium"
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                );
                              })}
                            </div>

                            {categoryTabs.length > 0 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                {[
                                  { id: "all", label: `Semua Gaya (${eventTypeFilteredThemes.length})` },
                                  ...categoryTabs,
                                ].map((cat) => {
                                  const isCatActive = themeCategoryFilter === cat.id;
                                  return (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => setThemeCategoryFilter(cat.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                                        isCatActive
                                          ? "bg-stone-800 text-white font-semibold shadow-2xs"
                                          : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                                      }`}
                                    >
                                      {cat.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="text-right text-[11px] text-stone-500 font-medium shrink-0">
                            Menampilkan <span className="font-bold text-stone-800">{displayedThemes.length}</span> dari {validThemes.length} tema
                          </div>
                        </div>

                        {displayedThemes.length === 0 ? (
                          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-200 text-stone-500">
                            <p className="text-sm font-semibold">Tidak ada tema yang cocok dengan filter aktif</p>
                            <p className="text-xs text-stone-400 mt-1">Coba ganti kategori atau kosongkan pencarian</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
                          {displayedThemes.map((theme) => {
                            const cat = (theme.category || "modern").toLowerCase();
                            return (
                              <div
                                key={theme.id}
                                className={`group bg-white rounded-2xl border flex flex-col justify-between transition-all duration-300 shadow-2xs hover:shadow-md ${
                                  theme.isActive === false
                                    ? "opacity-65 border-dashed border-stone-300"
                                    : "border-stone-200 hover:border-stone-300"
                                }`}
                              >
                                <div>
                                  {/* 1. Visual Showcase: Device Pair Mockup — di HP disembunyikan; status & Preview tetap ada di baris aksi */}
                                  <div className="hidden sm:block p-3 pb-1">
                                    <div className="stp-scene">
                                      {/* Tablet frame */}
                                      <div className="stp-tablet">
                                        <div className="stp-tablet-bar">
                                          <div className="stp-tablet-dots"><span/><span/><span/></div>
                                          <div className="stp-tablet-url">{getApexRootDomain()}/{theme.id}</div>
                                          <div style={{ width: "18px" }}/>
                                        </div>
                                        <div className="stp-tablet-screen">
                                          {theme.thumbnailDesktop ? (
                                            <img
                                              src={theme.thumbnailDesktop}
                                              alt={`${theme.name} Desktop`}
                                              loading="lazy"
                                              decoding="async"
                                              className="w-full h-full object-cover object-top"
                                            />
                                          ) : (
                                            <span className="flex h-full w-full items-center justify-center bg-stone-100 px-2 text-center font-serif text-xs font-bold text-stone-600">{theme.name}</span>
                                          )}
                                          <div className="stp-glare"/>
                                        </div>

                                      {/* Hover Quick Action — Lihat Live */}
                                      <a
                                        href={`/demo/${theme.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 bg-black/30 backdrop-blur-[1px]"
                                        title={`Buka Demo ${theme.name}`}
                                      >
                                        <span className="px-3.5 py-1.5 bg-stone-900/90 hover:bg-black text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-transform group-hover:scale-105">
                                          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          Lihat Live
                                        </span>
                                      </a>
                                    </div>

                                    {/* Phone frame — overlapping bottom-left */}
                                    <div className="stp-phone">
                                      <div className="stp-phone-notch"/>
                                      <div className="stp-phone-screen">
                                        {theme.thumbnailMobile ? (
                                          <img
                                            src={theme.thumbnailMobile}
                                            alt={`${theme.name} Mobile`}
                                            loading="lazy"
                                            decoding="async"
                                          />
                                        ) : (
                                          <span className="flex h-full w-full items-center justify-center bg-stone-100" />
                                        )}
                                        <div className="stp-glare"/>
                                      </div>
                                    </div>

                                    {/* Floating Category Badge */}
                                    <div className="absolute top-5 right-5 z-20 pointer-events-none">
                                      <span
                                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border shadow-xs backdrop-blur-md ${
                                          cat === "traditional"
                                            ? "bg-amber-950/85 text-amber-200 border-amber-600/40"
                                            : cat === "modern"
                                            ? "bg-slate-950/85 text-slate-200 border-slate-600/40"
                                            : "bg-stone-950/85 text-amber-100 border-stone-600/40"
                                        }`}
                                      >
                                        {cat === "traditional" ? "Tradisional" : cat === "modern" ? "Modern" : "Minimalis"}
                                      </span>
                                    </div>

                                    {/* Floating Active Status Indicator */}
                                    <div className="absolute top-5 left-5 z-20 pointer-events-none">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-xs backdrop-blur-md border ${
                                          theme.isActive !== false
                                            ? "bg-emerald-950/85 text-emerald-300 border-emerald-600/50"
                                            : "bg-stone-950/85 text-stone-400 border-stone-700/50"
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            theme.isActive !== false
                                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                                              : "bg-stone-500"
                                          }`}
                                        />
                                        <span>{theme.isActive !== false ? "Aktif" : "Nonaktif"}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>


                                  {/* 2. Theme Identity & Description (Hirarki Tengah) */}
                                  <div className="px-4 pt-3 pb-2 sm:p-4 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h3 className="font-bold text-gray-900 text-base group-hover:text-amber-900 transition">{theme.name}</h3>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                                            (!theme.eventType || theme.eventType === "WEDDING")
                                              ? "bg-amber-50 text-amber-800 border-amber-200"
                                              : theme.eventType === "PERSONAL"
                                              ? "bg-purple-50 text-purple-700 border-purple-200"
                                              : "bg-teal-50 text-teal-700 border-teal-200"
                                          }`}>
                                            {theme.subEvent ? `${theme.eventType} · ${theme.subEvent}` : (theme.eventType || "WEDDING")}
                                          </span>
                                        </div>
                                        <span className="text-[11px] font-mono text-gray-400">/{theme.id}</span>
                                      </div>
                                    </div>
                                    <p className="hidden sm:block text-xs text-gray-500 leading-relaxed line-clamp-2">
                                      {theme.description || (settingsMap["platform_name"] ? `Desain eksklusif ${settingsMap["platform_name"]}` : "Desain eksklusif")}
                                    </p>
                                  </div>
                                </div>

                                {/* 3. Bottom Action Row (Hirarki Bawah) */}
                                <div className="px-4 pb-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-stone-50/50">
                                  <div className="flex flex-wrap items-center gap-2 [&>*]:whitespace-nowrap">
                                    <a
                                      href={`/demo/${theme.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-2xs"
                                    >
                                      <span>Preview</span>
                                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                    {theme.builderSpec != null ? (
                                      <a
                                        href={`/admin/theme-builder?id=${encodeURIComponent(theme.id)}`}
                                        className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1"
                                        title="Ubah tampilan tema ini di Theme Builder"
                                      >
                                        Edit
                                      </a>
                                    ) : (
                                      <>
                                        <a
                                          href={`/admin/master-editor?id=${encodeURIComponent(theme.id)}`}
                                          className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1"
                                          title="Sunting warna, huruf, gambar, tata letak, seksi, dan CSS master ini di atas desain aslinya; berkas master tidak ditimpa"
                                        >
                                          Edit
                                        </a>
                                        <a
                                          href={`/admin/theme-builder?from=${encodeURIComponent(theme.id)}`}
                                          className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 rounded-xl text-xs font-medium transition inline-flex items-center gap-1"
                                          title="Buat tema builder baru dengan tema ini sebagai titik awal; master aslinya tidak berubah"
                                        >
                                          Salin ke Builder
                                        </a>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDemoStudio(theme)}
                                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                                      title="Kelola foto, musik & data cerita demo tema ini"
                                    >
                                      <span>Studio</span>
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {/* Toggle Aktif / Nonaktif — tombol luar pengganti tombol hapus */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleThemeStatus(theme);
                                      }}
                                      className={`px-2.5 py-1 text-xs font-semibold rounded-xl border transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                        theme.isActive !== false
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                          : "bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200"
                                      }`}
                                      title={theme.isActive !== false ? "Tema Aktif — Klik untuk nonaktifkan" : "Tema Nonaktif — Klik untuk aktifkan"}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          theme.isActive !== false
                                            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                                            : "bg-stone-400"
                                        }`}
                                      />
                                      <span>{theme.isActive !== false ? "Aktif" : "Nonaktif"}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditTheme(theme)}
                                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                                      title="Edit Metadata Tema"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
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
                </div>
              ) : themeSubTab === "drafts" ? (
                /* ── Sub-Tab: Draft Themes (Tema Baru Menunggu Review & Rilis) ── */
                (() => {
                  const draftThemes = themes
                    .filter((t) => t.id !== "starter-blueprint" && t.series === "DRAFT_REVIEW")
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

                  return (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">🕵️ Draft Themes — Review Tema Baru</h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold font-mono">
                              {draftThemes.length} Draf
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            Tema baru buatan tim AI Dept 2 (MCP) maupun Theme Builder yang berstatus <b>Nonaktif (Belum Rilis)</b>. Hanya Admin yang bisa membuka Preview sebelum Anda klik <b>Rilis ke Katalog</b>.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={onSyncSuccess}
                          className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>🔄 Segarkan Daftar Draf</span>
                        </button>
                      </div>

                      {draftThemes.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center space-y-2">
                          <div className="text-3xl">✨</div>
                          <p className="text-sm font-bold text-stone-800">Belum ada Draft Themes yang menunggu review</p>
                          <p className="text-xs text-stone-500 max-w-md mx-auto">
                            Saat tim AI Dept 2 (Bima) mengirim tema baru melalui Remote MCP (<code>luxvite_create_draft_theme</code>), tema akan masuk ke sini terlebih dahulu untuk Anda preview &amp; rilis.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {draftThemes.map((theme) => {
                            const isBuilder = Boolean(theme.builderSpec);
                            const evLabel =
                              theme.eventType === "PERSONAL"
                                ? "Personal"
                                : theme.eventType === "EVENT"
                                  ? "Event"
                                  : "Wedding";
                            const styleLabel =
                              (theme.category || "").toLowerCase() === "traditional"
                                ? "Tradisional"
                                : (theme.category || "").toLowerCase() === "modern"
                                  ? "Modern"
                                  : "Minimalis";
                            return (
                              <div
                                key={theme.id}
                                className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-xs p-4 flex flex-col justify-between gap-4 hover:border-indigo-400 transition"
                              >
                                <div className="space-y-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                                          🕵️ DRAFT · Belum Rilis
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-semibold">
                                          {isBuilder ? "🧩 Builder 3.0" : "✍️ Handcrafted / AI"}
                                        </span>
                                      </div>
                                      <h3 className="font-bold text-base text-stone-900 truncate">{theme.name}</h3>
                                      <div className="text-[11px] font-mono text-stone-500">
                                        /{theme.id} · {evLabel} · {styleLabel}
                                        {theme.subEvent ? ` · ${theme.subEvent}` : ""}
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                                    {theme.description || "Tema draf baru siap direview oleh Admin sebelum dirilis ke katalog publik."}
                                  </p>
                                  <div className="text-[10.5px] font-mono text-indigo-700 bg-indigo-50/70 border border-indigo-100 rounded-lg px-2.5 py-1.5 truncate">
                                    Preview: /demo/{theme.id}
                                  </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-stone-100">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <a
                                      href={`/demo/${theme.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold text-center transition"
                                    >
                                      👁️ Preview Admin
                                    </a>
                                    <a
                                      href={isBuilder ? `/admin/theme-builder?id=${theme.id}` : `/admin/master-editor?id=${theme.id}`}
                                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition"
                                    >
                                      ✏️ Edit
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleReleaseDraftTheme(theme)}
                                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                                    >
                                      🚀 Rilis ke Katalog Tema
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Hapus draf tema "${theme.name}" secara permanen?`)) {
                                          handleDeleteTheme(theme.id, theme.name);
                                        }
                                      }}
                                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                                      title="Tolak & Hapus Draf"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* ── Sub-Tab: Pustaka Musik Sistem ── */
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Pustaka Musik Sistem</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Kelola koleksi lagu pernikahan yang tersedia untuk dipilih klien pada editor undangan
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fetchSystemMusics}
                        disabled={musicLoading}
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className={`w-3.5 h-3.5 ${musicLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Segarkan</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddMusicModal}
                        className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Tambah Lagu Baru</span>
                      </button>
                    </div>
                  </div>

                  {/* Music Grid */}
                  {musicLoading && systemMusics.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-300 border-t-amber-800 mb-3" />
                      <p className="text-sm font-medium text-stone-500">Memuat pustaka musik sistem...</p>
                    </div>
                  ) : systemMusics.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-6">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <h4 className="text-base font-bold text-stone-800 mb-1">Belum Ada Lagu di Pustaka</h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
                        Tambahkan file lagu latar (MP3 / OGG / WAV / M4A) untuk dijadikan pilihan bagi klien.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddMusicModal}
                        className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
                      >
                        + Tambah Lagu Pertama
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {systemMusics.map((music) => {
                        const isPlaying = playingMusicId === music.id;
                        return (
                          <div
                            key={music.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              music.isActive
                                ? "bg-white border-stone-200 shadow-xs hover:border-amber-300"
                                : "bg-stone-50/80 border-stone-200 opacity-60"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => handlePlayPreviewMusic(music)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer ${
                                  isPlaying
                                    ? "bg-amber-800 text-white shadow-sm ring-2 ring-amber-400/50"
                                    : "bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-900"
                                }`}
                                title={isPlaying ? "Jeda Preview" : "Putar Preview"}
                              >
                                {isPlaying ? (
                                  <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  </svg>
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-sm font-bold text-stone-900 truncate" title={music.title}>
                                    {music.title}
                                  </h4>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                      music.isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-stone-200 text-stone-600"
                                    }`}
                                  >
                                    {music.isActive ? "Aktif" : "Nonaktif"}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-500 truncate mt-0.5">
                                  {music.composer || "Pencipta Anonim"}
                                </p>
                                {music.genre && (
                                  <span className="inline-block mt-1 text-[10px] font-medium text-amber-900/80 bg-amber-50 px-2 py-0.5 rounded-md">
                                    {music.genre}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={music.isActive}
                                    onChange={() => handleToggleMusicActive(music.id, music.isActive)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                                <span className="text-[11px] text-stone-500">
                                  {music.isActive ? "Tampil di Klien" : "Disembunyikan"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMusic(music)}
                                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                                  title="Edit Metadata"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMusic(music.id, music.title)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                  title="Hapus Lagu"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

      {showThemeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-lg">
                {editingTheme ? `Edit Tema: ${editingTheme.name}` : "Tambah Tema Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                title="Tutup"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {themeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{themeError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTheme} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">ID Tema (Nama file HTML)</label>
                <input
                  type="text"
                  value={themeForm.id}
                  onChange={(e) => setThemeForm({ ...themeForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  placeholder="contoh: kalandra, jawa, sunda"
                  disabled={Boolean(editingTheme)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-60 focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  File HTML disimpan di <code className="font-mono text-gray-700 font-semibold">themes/{(themeForm.eventType || "wedding").toLowerCase()}/{themeForm.category}/{themeForm.id || "id"}.html</code>.{" "}
                  <a
                    href={`/downloads/starter-blueprint-${(themeForm.eventType || "wedding").toLowerCase()}.html`}
                    download={`starter-blueprint-${(themeForm.eventType || "wedding").toLowerCase()}.html`}
                    className="text-amber-700 font-bold hover:underline"
                  >
                    Unduh Starter Blueprint HTML ({themeForm.eventType || "WEDDING"})
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Nama Tema</label>
                <input
                  type="text"
                  value={themeForm.name}
                  onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                  placeholder="contoh: Kalandra"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">Kategori Undangan</label>
                  <select
                    value={themeForm.eventType || "WEDDING"}
                    onChange={(e) => setThemeForm({ ...themeForm, eventType: e.target.value, subEvent: e.target.value === "WEDDING" ? "" : themeForm.subEvent })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="WEDDING">Pernikahan (2 Profil)</option>
                    <option value="PERSONAL">Personal &amp; Keluarga (1 Profil)</option>
                    <option value="EVENT">Acara &amp; Event Umum (Non-Personal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">Gaya Desain</label>
                  <select
                    value={themeForm.category}
                    onChange={(e) => setThemeForm({ ...themeForm, category: e.target.value, series: e.target.value === "traditional" ? "Traditional" : e.target.value === "modern" ? "Modern" : "Minimalist" })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="minimalist">Minimalis</option>
                    <option value="modern">Modern</option>
                    <option value="traditional">Traditional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">Urutan (Sort)</label>
                  <input
                    type="number"
                    value={themeForm.sortOrder}
                    onChange={(e) => setThemeForm({ ...themeForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {themeForm.eventType !== "WEDDING" && (
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Sub-Acara / Tag Filter <span className="font-normal text-gray-400">(opsional, dinamis)</span>
                  </label>
                  <input
                    type="text"
                    list="admin-theme-sub-event-presets"
                    value={themeForm.subEvent}
                    onChange={(e) => setThemeForm({ ...themeForm, subEvent: e.target.value })}
                    maxLength={50}
                    placeholder={
                      themeForm.eventType === "PERSONAL"
                        ? "Contoh: Ulang Tahun, Khitanan, Aqiqah, Wisuda, Tamatan Ngaji..."
                        : "Contoh: Corporate, Grand Opening, Seminar & Workshop, Gathering..."
                    }
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="admin-theme-sub-event-presets">
                    {(themeForm.eventType === "PERSONAL" ? PERSONAL_SUB_EVENT_PRESETS : EVENT_SUB_EVENT_PRESETS).map((p) => (
                      <option key={p.id} value={p.id} />
                    ))}
                  </datalist>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Muncul sebagai chip filter otomatis di Katalog Demo &amp; Studio. Kosongkan bila tema bersifat umum.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={themeForm.description}
                  onChange={(e) => setThemeForm({ ...themeForm, description: e.target.value })}
                  placeholder="contoh: Modern, Elegan & Minimalis"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Master HTML File Uploader */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-800">
                    File Master Template (.html) {!editingTheme && <span className="text-red-500">*</span>}
                  </label>
                  {editingTheme && (
                    <span className="text-[10px] text-gray-400 font-normal">Opsional (Unggah jika ingin mengganti file master)</span>
                  )}
                </div>
                <div className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-2xl p-3 bg-stone-50/50 transition">
                  <input
                    type="file"
                    id="themeMasterFileInput"
                    accept=".html"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setThemeFile(f);
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="themeMasterFileInput"
                    className="flex flex-col items-center justify-center cursor-pointer text-center py-2"
                  >
                    <svg className="w-6 h-6 text-amber-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {themeFile ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-emerald-700 break-all">{themeFile.name}</p>
                        <p className="text-[10px] text-gray-500">{(themeFile.size / 1024).toFixed(1)} KB — Siap disimpan</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-gray-700">
                          {editingTheme ? "Klik untuk mengganti file master .html" : "Pilih atau Seret file .html ke sini"}
                        </p>
                        <p className="text-[10px] text-gray-400">File akan otomatis disimpan ke folder themes/ dan dikompilasi ke demo statis</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Musik Default Tema — pilih dari Pustaka Musik Sistem */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-gray-800">
                  Musik Default Tema
                  <span className="ml-1.5 text-[10px] font-normal text-gray-400">(Opsional — dipakai otomatis saat klien belum upload musik sendiri)</span>
                </label>
                <select
                  value={themeForm.defaultMusicUrl}
                  onChange={(e) => setThemeForm({ ...themeForm, defaultMusicUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">— Tidak ada (pakai fallback sistem) —</option>
                  {systemMusics.map((m: any) => (
                    <option key={m.id} value={m.url}>
                      {m.title}{m.composer ? ` — ${m.composer}` : ""}
                    </option>
                  ))}
                </select>
                {themeForm.defaultMusicUrl && (
                  <p className="text-[10px] text-stone-400 font-mono truncate" title={themeForm.defaultMusicUrl}>
                    {themeForm.defaultMusicUrl}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                {/* Tombol Hapus — hanya muncul saat edit tema yang ada */}
                {editingTheme ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed = await feedback.confirm({
                        title: "Hapus tema",
                        message: `Hapus tema "${editingTheme.name}" secara permanen? Tindakan ini tidak dapat dibatalkan.`,
                        confirmLabel: "Hapus",
                        danger: true,
                      });
                      if (confirmed) {
                        setShowThemeModal(false);
                        handleDeleteTheme(editingTheme.id, editingTheme.name);
                      }
                    }}
                    className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Hapus Tema
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowThemeModal(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={themeSaving}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {themeSaving ? "Menyimpan..." : "Simpan Tema"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMusicModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {editingMusic ? "Edit Metadata Lagu" : "Tambah Lagu ke Pustaka Sistem"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !musicUploading && setShowMusicModal(false)}
                disabled={musicUploading}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMusic} className="space-y-3.5">
              {!editingMusic && (
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    File Audio (.mp3, .ogg, .wav, .m4a) <span className="text-rose-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-2xl p-3.5 bg-stone-50/50 transition">
                    <input
                      type="file"
                      id="systemMusicFileInput"
                      accept="audio/mp3,audio/mpeg,audio/ogg,audio/wav,audio/m4a,audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedMusicFile(file);
                        if (file && !musicForm.title) {
                          // Auto fill title from filename without extension
                          const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                          setMusicForm((prev) => ({ ...prev, title: baseName }));
                        }
                      }}
                      className="hidden"
                      disabled={musicUploading}
                    />
                    <label
                      htmlFor="systemMusicFileInput"
                      className="flex flex-col items-center justify-center cursor-pointer text-center py-2"
                    >
                      <svg className="w-7 h-7 text-amber-700 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      {selectedMusicFile ? (
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-emerald-700 break-all">{selectedMusicFile.name}</p>
                          <p className="text-[10px] text-gray-500">{(selectedMusicFile.size / (1024 * 1024)).toFixed(2)} MB — Siap diproses</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-gray-700">Pilih atau seret file audio ke sini</p>
                          <p className="text-[10px] text-gray-400">Otomatis dioptimalkan &amp; dikompres ke MP3 128 kbps (FFmpeg)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Judul Lagu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={musicForm.title}
                  onChange={(e) => setMusicForm({ ...musicForm, title: e.target.value })}
                  placeholder="contoh: Canon in D (Johann Pachelbel)"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  required
                  disabled={musicUploading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Pencipta / Komposer</label>
                <input
                  type="text"
                  value={musicForm.composer}
                  onChange={(e) => setMusicForm({ ...musicForm, composer: e.target.value })}
                  placeholder="contoh: Johann Pachelbel / Ludwig van Beethoven"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  disabled={musicUploading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Genre / Mood</label>
                <input
                  type="text"
                  value={musicForm.genre}
                  onChange={(e) => setMusicForm({ ...musicForm, genre: e.target.value })}
                  placeholder="contoh: Piano &amp; Strings Klasik Sakral"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  disabled={musicUploading}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowMusicModal(false)}
                  disabled={musicUploading}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={musicUploading}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {musicUploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Mengunggah &amp; Kompresi (FFmpeg)...</span>
                    </>
                  ) : (
                    <span>{editingMusic ? "Simpan Perubahan" : "Simpan Lagu"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {demoStudioTheme && (
        <AdminDemoStudioModal
          theme={demoStudioTheme}
          systemMusics={systemMusics}
          onClose={() => setDemoStudioTheme(null)}
          onThemesUpdated={(next) => setThemes(next)}
          showAdminToast={showAdminToast}
        />
      )}
    </>
  );
}
