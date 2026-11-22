"use client";

import { useState, useEffect, useMemo } from "react";
import { compressImageToWebP } from "@/lib/clientImageCompressor";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { useFeedback } from "@/components/ui/Feedback";
import { DemoStudioProvider, type DemoStudioContextValue } from "@/components/admin/demoStudio/DemoStudioContext";
import { DemoVisualTab } from "@/components/admin/demoStudio/DemoVisualTab";
import { DemoProfileTab } from "@/components/admin/demoStudio/DemoProfileTab";
import { DemoStoriesTab } from "@/components/admin/demoStudio/DemoStoriesTab";
import { DemoNarrativesTab } from "@/components/admin/demoStudio/DemoNarrativesTab";
import { DemoVendorsTab } from "@/components/admin/demoStudio/DemoVendorsTab";

interface AdminDemoStudioModalProps {
  theme: any;
  systemMusics: any[];
  onClose: () => void;
  onThemesUpdated: (themes: any[]) => void;
  showAdminToast: (msg: string, ok?: boolean) => void;
}

export default function AdminDemoStudioModal({
  theme: demoStudioTheme,
  systemMusics,
  onClose,
  onThemesUpdated,
  showAdminToast,
}: AdminDemoStudioModalProps) {
  const feedback = useFeedback();
  const [demoStudioTab, setDemoStudioTab] = useState<"visual" | "profile" | "stories" | "narratives" | "vendors">("visual");
  const [demoStudioData, setDemoStudioData] = useState<any>({});
  const [demoBuiltinMedia, setDemoBuiltinMedia] = useState<Record<string, string>>({});
  const [missingDemoSlots, setMissingDemoSlots] = useState<Record<string, boolean>>({});
  const [initialDemoStudioData, setInitialDemoStudioData] = useState<any>({});
  const [stagedDemoFiles, setStagedDemoFiles] = useState<Record<string, File>>({});
  const [stagedDeletedSlots, setStagedDeletedSlots] = useState<Record<string, boolean>>({});
  const [demoStudioLoading, setDemoStudioLoading] = useState(true);
  const [demoStudioSaving, setDemoStudioSaving] = useState(false);
  const [demoStudioUploadSuccess, setDemoStudioUploadSuccess] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [updatedDemoSlots, setUpdatedDemoSlots] = useState<Record<string, number>>({});
  const [demoStudioSessionTime, setDemoStudioSessionTime] = useState<number>(() => Date.now());
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

  const currentDemoBlueprint = useMemo(() => {
    return demoStudioTheme ? getThemeBlueprint(demoStudioTheme.id, demoStudioData) : null;
  }, [demoStudioTheme, demoStudioData]);

  const isDemoStudioDirty = useMemo(() => {
    const hasStagedFiles = Object.keys(stagedDemoFiles).length > 0;
    const hasDeletedSlots = Object.keys(stagedDeletedSlots).length > 0;
    const hasDataChanges = JSON.stringify(demoStudioData) !== JSON.stringify(initialDemoStudioData);
    return hasStagedFiles || hasDeletedSlots || hasDataChanges;
  }, [stagedDemoFiles, stagedDeletedSlots, demoStudioData, initialDemoStudioData]);

  useEffect(() => {
    if (!demoStudioTheme?.id) return;
    let cancelled = false;
    setDemoStudioLoading(true);
    setDemoStudioTab("visual");
    setDemoStudioUploadSuccess(null);
    setDemoStudioSessionTime(Date.now());
    setUpdatedDemoSlots({});
    setLocalPreviews({});
    setStagedDemoFiles({});
    setStagedDeletedSlots({});
    setMissingDemoSlots({});

    fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-data`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setDemoBuiltinMedia(json.builtinMedia && typeof json.builtinMedia === "object" ? json.builtinMedia : {});
        if (json.success && json.data) {
          setDemoStudioData(json.data);
          setInitialDemoStudioData(JSON.parse(JSON.stringify(json.data)));
        } else {
          setDemoStudioData({});
          setInitialDemoStudioData({});
        }
      })
      .catch(() => {
        if (cancelled) return;
        setDemoStudioData({});
        setInitialDemoStudioData({});
      })
      .finally(() => {
        if (!cancelled) setDemoStudioLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [demoStudioTheme?.id]);

  const setThemes = onThemesUpdated;
  const handleCloseDemoStudio = () => {
    setStagedDemoFiles({});
    setStagedDeletedSlots({});
    setLocalPreviews({});
    onClose();
  };

  const handleStageDemoAsset = async (slot: string, file: File) => {
    try {
      // Otomatis kompresi gambar di browser (Client-Side) ke format WebP ringan
      let processedFile = file;
      if (file.type.startsWith("image/")) {
        processedFile = await compressImageToWebP(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.82,
        });
      }
      const localUrl = URL.createObjectURL(processedFile);
      setLocalPreviews((prev) => ({ ...prev, [slot]: localUrl }));
      setStagedDemoFiles((prev) => ({ ...prev, [slot]: processedFile }));
      setStagedDeletedSlots((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      setDemoStudioUploadSuccess(null);
    } catch (err: any) {
      showAdminToast("Gagal memuat file gambar: " + err.message, false);
    }
  };

  const handleDiscardStagedAsset = (slot: string) => {
    if (localPreviews[slot]?.startsWith("blob:")) {
      try { URL.revokeObjectURL(localPreviews[slot]); } catch {}
    }
    setStagedDemoFiles((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setLocalPreviews((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const handleStageDeleteAsset = (slot: string) => {
    if (localPreviews[slot]?.startsWith("blob:")) {
      try { URL.revokeObjectURL(localPreviews[slot]); } catch {}
    }
    setLocalPreviews((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setStagedDemoFiles((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setStagedDeletedSlots((prev) => ({ ...prev, [slot]: true }));
    setDemoStudioData((prev: any) => {
      const next = { ...prev };
      if (slot === "cover") next.landingCoverUrl = "";
      else if (slot === "cover_desktop") next.landingCoverDesktopUrl = "";
      else if (slot === "hero") next.sidebarPhotoUrl = "";
      else if (slot === "background") next.globalBgUrl = "";
      else if (slot === "home") next.homePhotoUrl = "";
      else if (slot === "footer") {
        next.footerPhotoUrl = "";
        next.closingPhotoUrl = "";
      }
      else if (slot === "groom") next.groomPhotoUrl = "";
      else if (slot === "bride") next.bridePhotoUrl = "";
      else if (slot === "profile") next.personPhotoUrl = "";
      else if (slot === "event") next.eventPhotoUrl = "";
      else if (slot === "thumbnail_mobile") next.thumbnailMobileUrl = "";
      else if (slot === "thumbnail_desktop") next.thumbnailDesktopUrl = "";
      else if (slot === "music") next.audioUrl = "";
      else if (slot.startsWith("gallery_")) {
        const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
        if (Array.isArray(next.galleryPhotos)) {
          next.galleryPhotos = [...next.galleryPhotos];
          next.galleryPhotos[idx] = "";
        }
      }
      return next;
    });
  };

  const handleRestoreDeletedAsset = (slot: string) => {
    setStagedDeletedSlots((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setDemoStudioData((prev: any) => {
      const next = { ...prev };
      if (slot === "cover") next.landingCoverUrl = initialDemoStudioData.landingCoverUrl;
      else if (slot === "cover_desktop") next.landingCoverDesktopUrl = initialDemoStudioData.landingCoverDesktopUrl;
      else if (slot === "hero") next.sidebarPhotoUrl = initialDemoStudioData.sidebarPhotoUrl;
      else if (slot === "background") next.globalBgUrl = initialDemoStudioData.globalBgUrl;
      else if (slot === "home") next.homePhotoUrl = initialDemoStudioData.homePhotoUrl;
      else if (slot === "footer") {
        next.footerPhotoUrl = initialDemoStudioData.footerPhotoUrl;
        next.closingPhotoUrl = initialDemoStudioData.closingPhotoUrl;
      }
      else if (slot === "groom") next.groomPhotoUrl = initialDemoStudioData.groomPhotoUrl;
      else if (slot === "bride") next.bridePhotoUrl = initialDemoStudioData.bridePhotoUrl;
      else if (slot === "profile") next.personPhotoUrl = initialDemoStudioData.personPhotoUrl;
      else if (slot === "event") next.eventPhotoUrl = initialDemoStudioData.eventPhotoUrl;
      else if (slot === "thumbnail_mobile") next.thumbnailMobileUrl = initialDemoStudioData.thumbnailMobileUrl;
      else if (slot === "thumbnail_desktop") next.thumbnailDesktopUrl = initialDemoStudioData.thumbnailDesktopUrl;
      else if (slot === "music") next.audioUrl = initialDemoStudioData.audioUrl;
      else if (slot.startsWith("gallery_")) {
        const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
        if (Array.isArray(initialDemoStudioData.galleryPhotos)) {
          next.galleryPhotos = [...(next.galleryPhotos || [])];
          next.galleryPhotos[idx] = initialDemoStudioData.galleryPhotos[idx];
        }
      }
      return next;
    });
  };

  const handleSaveAllDemoChanges = async () => {
    if (!demoStudioTheme || !isDemoStudioDirty) return;
    setDemoStudioSaving(true);
    setDemoStudioUploadSuccess(null);

    try {
      // 1. Process deletions
      const delSlots = Object.keys(stagedDeletedSlots);
      if (delSlots.length > 0) {
        for (const slot of delSlots) {
          setUploadingSlot(slot);
          const delRes = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-asset?slot=${slot}&deferPublish=1`, {
            method: "DELETE",
          });
          const delData = await delRes.json();
          if (!delData.success) {
            throw new Error(`Gagal menghapus slot ${slot}: ${delData.error || "Gagal delete"}`);
          }
        }
      }

      // 2. Upload all staged files to server
      const slots = Object.keys(stagedDemoFiles);
      const nextDemoData = { ...demoStudioData };

      delSlots.forEach((slot) => {
        if (slot === "cover") nextDemoData.landingCoverUrl = "";
        else if (slot === "cover_desktop") nextDemoData.landingCoverDesktopUrl = "";
        else if (slot === "hero") nextDemoData.sidebarPhotoUrl = "";
        else if (slot === "background") nextDemoData.globalBgUrl = "";
        else if (slot === "home") nextDemoData.homePhotoUrl = "";
        else if (slot === "footer") {
          nextDemoData.footerPhotoUrl = "";
          nextDemoData.closingPhotoUrl = "";
        }
        else if (slot === "groom") nextDemoData.groomPhotoUrl = "";
        else if (slot === "bride") nextDemoData.bridePhotoUrl = "";
        else if (slot === "profile") nextDemoData.personPhotoUrl = "";
        else if (slot === "event") nextDemoData.eventPhotoUrl = "";
        else if (slot === "thumbnail_mobile") nextDemoData.thumbnailMobileUrl = "";
        else if (slot === "thumbnail_desktop") nextDemoData.thumbnailDesktopUrl = "";
        else if (slot === "music") nextDemoData.audioUrl = "";
        else if (slot.startsWith("gallery_")) {
          const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
          if (Array.isArray(nextDemoData.galleryPhotos)) {
            nextDemoData.galleryPhotos[idx] = "";
          }
        }
      });

      if (slots.length > 0) {
        for (const slot of slots) {
          setUploadingSlot(slot);
          const file = stagedDemoFiles[slot];
          const fd = new FormData();
          fd.append("slot", slot);
          fd.append("file", file);
          // Langkah 3 (demo-data) selalu menyusul dan mengompilasi demo sekali untuk seluruh perubahan.
          fd.append("deferPublish", "1");

          const res = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-asset`, {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (!data.success) {
            throw new Error(`Gagal mengunggah slot ${slot}: ${data.error || "Gagal upload"}`);
          }

          // Synchronize URL in nextDemoData so step 3 preserves the updated media/video/audio URLs
          const targetUrl = data.rawUrl || `/demo/${demoStudioTheme.id}/${data.fileName}`;
          if (slot === "cover") nextDemoData.landingCoverUrl = targetUrl;
          else if (slot === "cover_desktop") nextDemoData.landingCoverDesktopUrl = targetUrl;
          else if (slot === "hero") nextDemoData.sidebarPhotoUrl = targetUrl;
          else if (slot === "background") nextDemoData.globalBgUrl = targetUrl;
          else if (slot === "home") nextDemoData.homePhotoUrl = targetUrl;
          else if (slot === "footer") nextDemoData.footerPhotoUrl = targetUrl;
          else if (slot === "groom") nextDemoData.groomPhotoUrl = targetUrl;
          else if (slot === "bride") nextDemoData.bridePhotoUrl = targetUrl;
          else if (slot === "profile") nextDemoData.personPhotoUrl = targetUrl;
          else if (slot === "event") nextDemoData.eventPhotoUrl = targetUrl;
          else if (slot === "thumbnail_mobile") nextDemoData.thumbnailMobileUrl = targetUrl;
          else if (slot === "thumbnail_desktop") nextDemoData.thumbnailDesktopUrl = targetUrl;
          else if (slot === "music") nextDemoData.audioUrl = targetUrl;
          else if (slot.startsWith("gallery_")) {
            const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
            if (!Array.isArray(nextDemoData.galleryPhotos)) {
              nextDemoData.galleryPhotos = [];
            }
            nextDemoData.galleryPhotos[idx] = targetUrl;
          }
        }
        setDemoStudioData(nextDemoData);
      }

      // 3. Save text profile & story demo data
      const dataRes = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextDemoData),
      });
      const dataJson = await dataRes.json();
      if (!dataJson.success) {
        throw new Error(dataJson.error || "Gagal menyimpan data demo");
      }

      // 4. Mark successfully saved
      const now = Date.now();
      const newUpdatedSlots: Record<string, number> = { ...updatedDemoSlots };
      slots.forEach((s) => {
        newUpdatedSlots[s] = now;
      });
      delSlots.forEach((s) => {
        newUpdatedSlots[s] = now;
      });
      setUpdatedDemoSlots(newUpdatedSlots);
      setDemoStudioSessionTime(now);
      setInitialDemoStudioData(JSON.parse(JSON.stringify(nextDemoData)));
      setStagedDemoFiles({});
      setStagedDeletedSlots({});
      fetch("/api/admin/themes").then((r) => r.json()).then((d) => {
        if (d.success && Array.isArray(d.themes)) setThemes(d.themes);
      }).catch(() => {});
      setDemoStudioUploadSuccess(`✓ Semua perubahan demo tema ${demoStudioTheme.name} berhasil disimpan permanen!`);
      setTimeout(() => setDemoStudioUploadSuccess(null), 4000);
    } catch (err: any) {
      showAdminToast("Error: " + err.message, false);
    } finally {
      setUploadingSlot(null);
      setDemoStudioSaving(false);
    }
  };

  const demoCtx: DemoStudioContextValue = {
    demoStudioTheme, systemMusics, feedback, demoStudioTab, demoStudioData, setDemoStudioData,
    demoBuiltinMedia, missingDemoSlots, setMissingDemoSlots, stagedDemoFiles, stagedDeletedSlots,
    demoStudioSaving, uploadingSlot, setUploadingSlot, updatedDemoSlots, setUpdatedDemoSlots,
    demoStudioSessionTime, localPreviews, currentDemoBlueprint, handleStageDemoAsset,
    handleDiscardStagedAsset, handleStageDeleteAsset, handleRestoreDeletedAsset,
  };

  return (
    <DemoStudioProvider value={demoCtx}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4 5 5 0 0110 0 4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold font-serif text-lg text-stone-100">
                      Theme Demo Studio: {demoStudioTheme.name}
                    </h3>
                    <span className="font-mono text-[10px] bg-stone-800 text-amber-400 px-2 py-0.5 rounded-full uppercase">
                      #{demoStudioTheme.id}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    Kelola aset foto showroom, musik bawaan, dan cerita pasangan demo tema
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <a
                  href={`/demo/${demoStudioTheme.id}${demoStudioSessionTime ? `?t=${demoStudioSessionTime}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Lihat Demo Live</span>
                </a>
                <button
                  type="button"
                  onClick={handleCloseDemoStudio}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Success Feedback Alert */}
            {demoStudioUploadSuccess && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <span>{demoStudioUploadSuccess}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="px-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2 pt-2 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDemoStudioTab("visual")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "visual"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Aset Visual &amp; Audio ({demoStudioTheme.id})
              </button>
              <button
                type="button"
                onClick={() => setDemoStudioTab("profile")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "profile"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Profil Pasangan &amp; Acara
              </button>
              <button
                type="button"
                onClick={() => setDemoStudioTab("stories")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "stories"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Kisah Cinta &amp; Rekening
              </button>
              <button
                type="button"
                onClick={() => setDemoStudioTab("narratives")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "narratives"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Teks Seksi &amp; Narasi Bawaan
              </button>
              <button
                type="button"
                onClick={() => setDemoStudioTab("vendors")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "vendors"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Mitra Vendor
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {demoStudioLoading ? (
                <div className="py-20 text-center text-gray-400 text-sm">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                  Memuat data demo tema...
                </div>
              ) : (
                <>
                  <DemoVisualTab />
                  <DemoProfileTab />
                  <DemoStoriesTab />
                  <DemoNarrativesTab />
                  <DemoVendorsTab />
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                {isDemoStudioDirty ? (
                  <div className="flex items-center gap-2 text-amber-900 font-semibold bg-amber-100/70 border border-amber-300/80 px-2.5 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                    <span>Ada perubahan draft yang belum disimpan.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0"></span>
                    <span>Tidak ada perubahan baru.</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseDemoStudio}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-white transition cursor-pointer"
                >
                  {isDemoStudioDirty ? "Batal" : "Tutup"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllDemoChanges}
                  disabled={!isDemoStudioDirty || demoStudioSaving}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 ${
                    isDemoStudioDirty && !demoStudioSaving
                      ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 cursor-pointer shadow-md"
                      : "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed opacity-60"
                  }`}
                >
                  {demoStudioSaving && (
                    <svg className="animate-spin h-3.5 w-3.5 text-stone-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{demoStudioSaving ? "Menyimpan ke Demo..." : "Simpan Perubahan Demo"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
  );
    </DemoStudioProvider>
  );
}
