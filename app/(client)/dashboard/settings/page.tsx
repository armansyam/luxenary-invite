"use client";

import { useState, useEffect } from "react";

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

export default function SettingsPage() {
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingSec, setSavingSec] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Subdomain Availability Check State
  const [subdomainStatus, setSubdomainStatus] = useState<{
    state: "idle" | "checking" | "available" | "unavailable" | "error";
    message: string;
  }>({ state: "idle", message: "" });

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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !invitation?.id) return;

    setUploadingAudio(true);
    setErrorMsg(null);

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("invitationId", invitation.id);
      data.append("slot", "MUSIC");

      const res = await fetch("/api/client/upload", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        throw new Error("Gagal mengunggah file audio");
      }

      const result = await res.json();
      if (result.url) {
        setFormData((prev) => ({
          ...prev,
          musicUrl: result.url,
          showMusic: true,
        }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengunggah file musik");
    } finally {
      setUploadingAudio(false);
    }
  };

  useEffect(() => {
    return () => {
      audioElement?.pause();
    };
  }, [audioElement]);

  // Edit / Collapse Mode for each section (false = collapsed/view mode, true = edit/form mode)
  const [editMode, setEditMode] = useState<Record<string, boolean>>({
    subdomain: false,
    music: false,
    shipping: false,
    streaming: false,
    status: false,
  });

  const [formData, setFormData] = useState({
    subdomain: "",
    musicUrl: "",
    status: "PUBLISHED",
    liveStreamUrl: "",
    shippingAddress: "",
    showMusic: true,
    showShipping: true,
    showLiveStream: true,
  });

  // Real-time Subdomain Availability Checker
  useEffect(() => {
    if (!formData.subdomain || !invitation?.id) {
      setSubdomainStatus({ state: "idle", message: "" });
      return;
    }

    const clean = formData.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 3) {
      setSubdomainStatus({
        state: "unavailable",
        message: "Subdomain minimal terdiri dari 3 karakter.",
      });
      return;
    }

    setSubdomainStatus({ state: "checking", message: "Memeriksa ketersediaan..." });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/client/subdomain/check?subdomain=${encodeURIComponent(clean)}&invitationId=${invitation.id}`
        );
        const data = await res.json();
        if (data.available) {
          setSubdomainStatus({
            state: "available",
            message: data.message || "Subdomain tersedia dan dapat digunakan!",
          });
        } else {
          setSubdomainStatus({
            state: "unavailable",
            message: data.message || "Subdomain sudah digunakan pasangan lain.",
          });
        }
      } catch {
        setSubdomainStatus({
          state: "error",
          message: "Gagal memeriksa ketersediaan subdomain.",
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.subdomain, invitation?.id]);

  const toggleEdit = (key: string) => {
    setEditMode((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetch("/api/client/invitations")
      .then((res) => res.json())
      .then((invs) => {
        if (Array.isArray(invs) && invs.length > 0) {
          const inv = invs[0];
          setInvitation(inv);

          let feat: any = {};
          try {
            feat = typeof inv.featureSettings === "object" ? inv.featureSettings : JSON.parse(inv.featureSettings || "{}");
          } catch {}

          setFormData({
            subdomain: inv.subdomain || `${inv.groomSlug || "didan"}-${inv.brideSlug || "nasha"}`,
            musicUrl: inv.musicUrl || "",
            status: inv.status || "PUBLISHED",
            liveStreamUrl: inv.liveStreamUrl || feat.liveStreamYoutubeUrl || "",
            shippingAddress: inv.shippingAddress || "",
            showMusic: feat.showMusic !== false && Boolean(inv.musicUrl || feat.musicUrl),
            showShipping: feat.showShipping !== false && Boolean(inv.shippingAddress),
            showLiveStream: feat.showLiveStream !== false && Boolean(inv.liveStreamUrl || feat.liveStreamYoutubeUrl),
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg("Gagal memuat pengaturan undangan");
        setLoading(false);
      });
  }, []);

  // Independent Section Save Handler
  const handleSaveSection = async (secKey: string) => {
    if (!invitation?.id || savingSec) return;
    setSavingSec(secKey);
    setErrorMsg(null);

    try {
      let feat: any = {};
      try {
        feat = typeof invitation.featureSettings === "object" ? invitation.featureSettings : JSON.parse(invitation.featureSettings || "{}");
      } catch {}

      const updatedFeatureSettings = {
        ...feat,
        showMusic: formData.showMusic,
        showShipping: formData.showShipping,
        showLiveStream: formData.showLiveStream,
        liveStreamYoutubeUrl: formData.liveStreamUrl,
      };

      // Construct clean payload (exclude prisma relations like media array, user, orders)
      const { media, user, order, guests, rsvps, wishes, boothSessions, ...cleanInvitation } = invitation;

      const payload = {
        ...cleanInvitation,
        subdomain: formData.subdomain ? formData.subdomain.trim().toLowerCase() : null,
        musicUrl: formData.showMusic ? formData.musicUrl : "",
        shippingAddress: formData.showShipping ? formData.shippingAddress : "",
        liveStreamUrl: formData.showLiveStream ? formData.liveStreamUrl : "",
        status: formData.status,
        featureSettings: updatedFeatureSettings,
      };

      const res = await fetch(`/api/client/invitations/${invitation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json();
        setInvitation((prev: any) => ({ ...prev, ...savedData, featureSettings: updatedFeatureSettings }));
        // Automatically close/collapse edit form to show clean summary
        setEditMode((prev) => ({ ...prev, [secKey]: false }));
        setSaveSuccess((prev) => ({ ...prev, [secKey]: true }));
        setTimeout(() => {
          setSaveSuccess((prev) => ({ ...prev, [secKey]: false }));
        }, 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMsg(errJson.error || "Gagal memperbarui pengaturan");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan pengaturan");
    } finally {
      setSavingSec(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-medium">Memuat Pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-amber-800 uppercase block">Konfigurasi Sistem</span>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Pengaturan Undangan &amp; Domain
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola tautan subdomain, musik latar, alamat kado fisik, dan siaran langsung
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${formData.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {formData.status === 'PUBLISHED' ? 'Aktif (Published)' : 'Draft (Penyusunan)'}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* CARD 1: SUBDOMAIN */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Alamat Tautan Subdomain</h3>
            <p className="text-xs text-stone-500">Tentukan alamat URL eksklusif undangan pernikahan Anda</p>
          </div>
          <button
            type="button"
            onClick={() => toggleEdit("subdomain")}
            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            {editMode.subdomain ? "Tutup" : "Edit"}
          </button>
        </div>

        {!editMode.subdomain ? (
          /* Summary Mode */
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Tautan Aktif:</span>
              <a
                href={`https://${formData.subdomain || "didan-nasha"}.luxenary.id`}
                target="_blank"
                rel="noreferrer"
                className="text-xs sm:text-sm font-mono font-bold text-amber-900 hover:underline break-all"
              >
                https://{formData.subdomain || "didan-nasha"}.luxenary.id
              </a>
            </div>
            <button
              type="button"
              onClick={() => toggleEdit("subdomain")}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
            >
              Ubah Tautan
            </button>
          </div>
        ) : (
          /* Form Edit Mode */
          <div className="space-y-4 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-stone-700">Nama Subdomain</label>
                {/* Live Availability Badge */}
                {subdomainStatus.state === "checking" && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-spin border border-t-transparent"></span>
                    <span>Memeriksa...</span>
                  </span>
                )}
                {subdomainStatus.state === "available" && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <span>✓</span>
                    <span>Tersedia &amp; Siap Digunakan</span>
                  </span>
                )}
                {subdomainStatus.state === "unavailable" && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                    <span>✗</span>
                    <span>Sudah Terpakai / Tidak Valid</span>
                  </span>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  placeholder="didan-nasha"
                  className={`flex-1 p-3 bg-stone-50 border rounded-l-xl text-xs text-stone-900 font-mono transition focus:bg-white focus:outline-none focus:ring-2 ${
                    subdomainStatus.state === "available"
                      ? "border-emerald-400 focus:ring-emerald-600/30"
                      : subdomainStatus.state === "unavailable"
                      ? "border-rose-400 focus:ring-rose-600/30"
                      : "border-stone-200 focus:ring-amber-700/30"
                  }`}
                />
                <span className="px-4 py-3 bg-stone-100 border border-l-0 border-stone-200 rounded-r-xl text-xs text-stone-600 font-mono">
                  .luxenary.id
                </span>
              </div>

              {/* Status Message or URL Preview */}
              {subdomainStatus.state === "unavailable" ? (
                <span className="text-[11px] font-medium text-rose-600 mt-1.5 flex items-center gap-1">
                  <span>⚠</span>
                  <span>{subdomainStatus.message}</span>
                </span>
              ) : (
                <span className="text-[10px] text-stone-400 mt-1.5 block">
                  Pratinjau URL: https://{formData.subdomain || "didan-nasha"}.luxenary.id
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {saveSuccess.subdomain && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  ✓ Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("subdomain")}
                disabled={savingSec === "subdomain" || subdomainStatus.state === "unavailable" || subdomainStatus.state === "checking"}
                className={`px-5 py-2 font-bold rounded-xl text-xs transition flex items-center gap-1.5 ${
                  subdomainStatus.state === "unavailable" || subdomainStatus.state === "checking"
                    ? "bg-stone-200 text-stone-400 border border-stone-300 cursor-not-allowed"
                    : "bg-stone-900 hover:bg-stone-800 text-white cursor-pointer"
                }`}
              >
                {savingSec === "subdomain" ? "Menyimpan..." : "Simpan Subdomain"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: BACKGROUND MUSIC */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Musik Latar Pernikahan</h3>
            <p className="text-xs text-stone-500">Audio yang diputar secara otomatis saat tamu membuka undangan</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
              <input
                type="checkbox"
                checked={formData.showMusic}
                onChange={(e) => setFormData({ ...formData, showMusic: e.target.checked })}
                className="w-4 h-4 text-amber-800 rounded border-stone-300 focus:ring-amber-800 cursor-pointer"
              />
              <span>{formData.showMusic ? "Aktif" : "Nonaktif"}</span>
            </label>
            <button
              type="button"
              onClick={() => toggleEdit("music")}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {editMode.music ? "Tutup" : "Edit"}
            </button>
          </div>
        </div>

        {!editMode.music ? (
          /* Summary Mode */
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {formData.showMusic && (
                <button
                  type="button"
                  onClick={() => togglePlayPreview(formData.musicUrl || MUSIC_PRESETS[0].url)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition shrink-0 cursor-pointer ${playingAudioUrl === (formData.musicUrl || MUSIC_PRESETS[0].url) ? "bg-amber-800 ring-2 ring-amber-600 animate-pulse" : "bg-stone-900 hover:bg-stone-800"}`}
                  title="Dengarkan Musik"
                >
                  {playingAudioUrl === (formData.musicUrl || MUSIC_PRESETS[0].url) ? (
                    <span className="text-xs font-bold">❚❚</span>
                  ) : (
                    <span className="text-xs font-bold ml-0.5">▶</span>
                  )}
                </button>
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Musik Terpasang:</span>
                <p className="text-xs font-bold text-stone-800 mt-0.5 truncate">
                  {formData.showMusic ? (
                    MUSIC_PRESETS.find((p) => p.url === formData.musicUrl)?.title ||
                    (formData.musicUrl.includes("uploads/invitations")
                      ? "🎵 File Musik Khusus (Upload Sendiri)"
                      : formData.musicUrl.includes("youtube.com") || formData.musicUrl.includes("youtu.be")
                      ? "▶ Lagu dari YouTube"
                      : (formData.musicUrl ? "Musik Kustom (Tautan Eksternal)" : "Canon in D — Johann Pachelbel"))
                  ) : (
                    <span className="text-stone-400 italic font-normal">Musik Dinonaktifkan (Hening)</span>
                  )}
                </p>
                {formData.showMusic && (
                  <span className="text-[10px] text-stone-500 block">
                    {MUSIC_PRESETS.find((p) => p.url === formData.musicUrl)?.genre || (formData.musicUrl ? "File Audio Aktif" : "Piano & Strings Klasik Sakral")}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleEdit("music")}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer shrink-0"
            >
              Ubah Musik
            </button>
          </div>
        ) : (
          /* Form Edit Mode */
          <div className="space-y-5 pt-1">
            {/* Direct Upload Option */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-dashed border-amber-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Upload File Musik Sendiri (.mp3 / .m4a)</span>
                <span className="text-[11px] text-stone-500">Pilih lagu pernikahan favorit Anda langsung dari galeri HP / laptop</span>
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
              <span className="block text-[11px] font-bold text-stone-800 mb-2">Atau Pilih dari Lagu Pernikahan Sakral Pilihan:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MUSIC_PRESETS.map((preset) => {
                  const isSelected = formData.musicUrl === preset.url;
                  const isPlaying = playingAudioUrl === preset.url;

                  return (
                    <div
                      key={preset.id}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? "border-amber-800 bg-amber-50/70 ring-1 ring-amber-800/40"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => togglePlayPreview(preset.url)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] transition shrink-0 cursor-pointer ${
                            isPlaying ? "bg-amber-800 animate-pulse" : "bg-stone-800 hover:bg-stone-700"
                          }`}
                          title="Dengarkan Contoh"
                        >
                          {isPlaying ? "❚❚" : "▶"}
                        </button>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-stone-900 truncate">{preset.title}</h4>
                          <p className="text-[10px] text-stone-500">{preset.genre}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, musicUrl: preset.url })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
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
            <div className="pt-2 border-t border-stone-100">
              <label className="block text-[11px] font-bold text-stone-700 mb-1">Atau Gunakan Tautan Lagu Kustom (MP3 / YouTube):</label>
              <input
                type="url"
                value={formData.musicUrl}
                onChange={(e) => setFormData({ ...formData, musicUrl: e.target.value })}
                placeholder="https://domain.com/audio/wedding-song.mp3 atau https://youtube.com/watch?v=..."
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Mendukung link file MP3 online langsung atau link video/musik YouTube.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {saveSuccess.music && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  ✓ Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("music")}
                disabled={savingSec === "music" || uploadingAudio}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingSec === "music" ? "Menyimpan..." : "Simpan Musik"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD 3: SHIPPING ADDRESS */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Alamat Pengiriman Kado Fisik</h3>
            <p className="text-xs text-stone-500">Alamat rumah mempelai apabila tamu ingin mengirimkan bingkisan kado via kurir</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
              <input
                type="checkbox"
                checked={formData.showShipping}
                onChange={(e) => setFormData({ ...formData, showShipping: e.target.checked })}
                className="w-4 h-4 text-amber-800 rounded border-stone-300 focus:ring-amber-800 cursor-pointer"
              />
              <span>{formData.showShipping ? "Aktif" : "Nonaktif"}</span>
            </label>
            <button
              type="button"
              onClick={() => toggleEdit("shipping")}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {editMode.shipping ? "Tutup" : "Edit"}
            </button>
          </div>
        </div>

        {!editMode.shipping ? (
          /* Summary Mode */
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Alamat Terpasang:</span>
              <p className="text-xs text-stone-800 whitespace-pre-line">
                {formData.showShipping ? (
                  formData.shippingAddress || <span className="text-stone-400 italic">Belum diisi</span>
                ) : (
                  <span className="text-stone-400 italic">Fitur Pengiriman Kado Dinonaktifkan</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleEdit("shipping")}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer shrink-0"
            >
              Ubah Alamat
            </button>
          </div>
        ) : (
          /* Form Edit Mode */
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">Alamat Lengkap Pengiriman</label>
              <textarea
                rows={3}
                value={formData.shippingAddress}
                onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                placeholder="Jl. Boulevard No. 12, Kompleks Panakkukang Mas, Makassar, Sulawesi Selatan (Penerima: Didan / 0812xxxx)"
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {saveSuccess.shipping && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  ✓ Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("shipping")}
                disabled={savingSec === "shipping"}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingSec === "shipping" ? "Menyimpan..." : "Simpan Alamat"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD 4: LIVE STREAMING */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Tautan Siaran Langsung (Live Streaming)</h3>
            <p className="text-xs text-stone-500">Tautan siaran langsung bagi tamu yang berhalangan hadir ke lokasi</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
              <input
                type="checkbox"
                checked={formData.showLiveStream}
                onChange={(e) => setFormData({ ...formData, showLiveStream: e.target.checked })}
                className="w-4 h-4 text-amber-800 rounded border-stone-300 focus:ring-amber-800 cursor-pointer"
              />
              <span>{formData.showLiveStream ? "Aktif" : "Nonaktif"}</span>
            </label>
            <button
              type="button"
              onClick={() => toggleEdit("streaming")}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {editMode.streaming ? "Tutup" : "Edit"}
            </button>
          </div>
        </div>

        {!editMode.streaming ? (
          /* Summary Mode */
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Tautan Streaming:</span>
              <p className="text-xs font-medium text-stone-800 mt-0.5">
                {formData.showLiveStream ? (
                  formData.liveStreamUrl ? (
                    <a href={formData.liveStreamUrl} target="_blank" rel="noreferrer" className="text-amber-900 hover:underline font-mono">
                      {formData.liveStreamUrl}
                    </a>
                  ) : (
                    <span className="text-stone-400 italic">Belum diisi</span>
                  )
                ) : (
                  <span className="text-stone-400 italic">Siaran Langsung Dinonaktifkan</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleEdit("streaming")}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
            >
              Ubah Tautan
            </button>
          </div>
        ) : (
          /* Form Edit Mode */
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">URL Siaran Langsung</label>
              <input
                type="url"
                value={formData.liveStreamUrl}
                onChange={(e) => setFormData({ ...formData, liveStreamUrl: e.target.value })}
                placeholder="https://youtube.com/live/... atau https://instagram.com/..."
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {saveSuccess.streaming && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  ✓ Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("streaming")}
                disabled={savingSec === "streaming"}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingSec === "streaming" ? "Menyimpan..." : "Simpan Siaran Langsung"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD 5: PUBLICATION STATUS */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Status Publikasi Undangan</h3>
            <p className="text-xs text-stone-500">Atur apakah undangan dapat diakses publik atau masih dalam penyusunan</p>
          </div>
          <button
            type="button"
            onClick={() => toggleEdit("status")}
            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            {editMode.status ? "Tutup" : "Edit"}
          </button>
        </div>

        {!editMode.status ? (
          /* Summary Mode */
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Status Saat Ini:</span>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${formData.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {formData.status === 'PUBLISHED' ? '● Aktif (Dapat Diakses Tamu)' : '● Draft (Hanya Pemilik)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleEdit("status")}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
            >
              Ubah Status
            </button>
          </div>
        ) : (
          /* Form Edit Mode */
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${formData.status === 'PUBLISHED' ? 'border-amber-700 bg-amber-50/50' : 'border-stone-200 bg-stone-50'}`}>
                <input
                  type="radio"
                  name="status"
                  value="PUBLISHED"
                  checked={formData.status === "PUBLISHED"}
                  onChange={() => setFormData({ ...formData, status: "PUBLISHED" })}
                  className="mt-0.5 text-amber-800 focus:ring-amber-800"
                />
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Publikasikan (Published)</span>
                  <span className="text-[11px] text-stone-500">Tautan undangan dapat dibuka dan diakses oleh tamu undangan</span>
                </div>
              </label>

              <label className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${formData.status === 'DRAFT' ? 'border-amber-700 bg-amber-50/50' : 'border-stone-200 bg-stone-50'}`}>
                <input
                  type="radio"
                  name="status"
                  value="DRAFT"
                  checked={formData.status === "DRAFT"}
                  onChange={() => setFormData({ ...formData, status: "DRAFT" })}
                  className="mt-0.5 text-amber-800 focus:ring-amber-800"
                />
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Simpan sebagai Draft</span>
                  <span className="text-[11px] text-stone-500">Undangan sedang dalam proses pengisian dan belum dibuka untuk umum</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {saveSuccess.status && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  ✓ Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("status")}
                disabled={savingSec === "status"}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingSec === "status" ? "Menyimpan..." : "Simpan Status"}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
