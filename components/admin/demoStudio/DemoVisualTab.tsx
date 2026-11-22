"use client";

import { BG_PHOTO_TONE_LIMIT, parseBgPhotoTone } from "@/lib/bgPhotoTone";
import ThemeThumbnailAutoCard from "@/components/admin/ThemeThumbnailAutoCard";
import { useDemoStudio } from "@/components/admin/demoStudio/DemoStudioContext";

export function DemoVisualTab() {
  const {
    demoBuiltinMedia,
    demoStudioData,
    demoStudioSaving,
    demoStudioSessionTime,
    demoStudioTab,
    demoStudioTheme,
    handleDiscardStagedAsset,
    handleRestoreDeletedAsset,
    handleStageDeleteAsset,
    handleStageDemoAsset,
    localPreviews,
    missingDemoSlots,
    setDemoStudioData,
    setMissingDemoSlots,
    setUpdatedDemoSlots,
    stagedDeletedSlots,
    stagedDemoFiles,
    systemMusics,
    updatedDemoSlots,
    uploadingSlot,
  } = useDemoStudio();

  return (
    <>
                  {/* TAB 1: VISUAL & AUDIO ASSETS */}
                  {demoStudioTab === "visual" && (
                    <div className="space-y-6">
                      <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-amber-900 text-xs leading-relaxed">
                        <div>
                          <strong>Panduan Aset:</strong> Foto atau Video MP4 yang diunggah akan otomatis disimpan ke folder{" "}
                          <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-bold">
                            public/uploads/demo/{demoStudioTheme.id}/
                          </code>{" "}
                          dan langsung tampil di halaman showroom demo publik tema bersangkutan.
                        </div>
                      </div>

                      <ThemeThumbnailAutoCard
                        themeId={demoStudioTheme.id}
                        onFinished={() => {
                          const now = Date.now();
                          setUpdatedDemoSlots((prev) => ({ ...prev, thumbnail_mobile: now, thumbnail_desktop: now }));
                        }}
                      />


                      {/* Main Cover & Hero Slots Grid */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
                          1. Foto Utama &amp; Banner Hero (Mendukung Video MP4 Loop)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[
                            { slot: "cover", label: "Landing Cover Mobile (Portrait 9:16)", file: "cover.webp", allowVideo: true, desc: "Tampilan layar pembuka khusus HP (Portrait 9:16 — Foto WebP/JPG atau Video Loop MP4)" },
                            { slot: "cover_desktop", label: "Landing Cover Desktop (Landscape 16:9)", file: "cover_desktop.webp", allowVideo: true, desc: "Tampilan layar pembuka khusus PC/Laptop (Landscape 16:9 — Foto WebP/JPG atau Video Loop MP4). Opsional, jika kosong pakai Cover Mobile." },
                            { slot: "hero", label: "Hero / Sidebar Desktop", file: "hero.webp", allowVideo: true, desc: "Foto portrait sidebar kolom kiri layar lebar desktop (Foto WebP/JPG atau Video Loop MP4)" },
                            { slot: "background", label: "Background Global", file: "background.webp", allowVideo: true, desc: "Latar belakang fixed tema (Foto WebP/JPG atau Video Loop MP4)" },
                            { slot: "home", label: "Latar Home", file: "home.webp", allowVideo: false, desc: "Background khusus seksi Home (Opsional)" },
                            { slot: "footer", label: "Foto Footer", file: "footer.webp", allowVideo: false, desc: "Foto penutup di bagian akhir undangan (Opsional)" },
                            ...((!demoStudioTheme?.eventType || demoStudioTheme?.eventType === "WEDDING")
                              ? [
                                  { slot: "groom", label: "Mempelai Pria", file: "groom.webp", allowVideo: false, desc: "Foto profil mempelai pria" },
                                  { slot: "bride", label: "Mempelai Wanita", file: "bride.webp", allowVideo: false, desc: "Foto profil mempelai wanita" },
                                ]
                              : demoStudioTheme?.eventType === "PERSONAL"
                              ? [
                                  { slot: "profile", label: "Foto Profil Utama", file: "profile.webp", allowVideo: false, desc: "Foto tokoh utama personal & keluarga" },
                                ]
                              : [
                                  { slot: "event", label: "Foto / Visual Utama Acara", file: "event.webp", allowVideo: false, desc: "Foto atau visual identitas acara" },
                                ]),
                            { 
                              slot: "thumbnail_mobile", 
                              label: "Thumbnail Mobile (HP)", 
                              file: "thumbnail_mobile.webp", 
                              allowVideo: false, 
                              desc: "Ukuran pas: 400 × 800 px (Rasio 1:2 — Retina: 800 × 1600 px)" 
                            },
                            { 
                              slot: "thumbnail_desktop", 
                              label: "Thumbnail Desktop (Laptop)", 
                              file: "thumbnail_desktop.webp", 
                              allowVideo: false, 
                              desc: "Ukuran pas: 1280 × 800 px (Rasio 16:10)" 
                            },
                          ].map((item) => {
                            const isDeleted = Boolean(stagedDeletedSlots[item.slot]);
                            const isStaged = Boolean(stagedDemoFiles[item.slot]);
                            const isSaved = Boolean(updatedDemoSlots[item.slot]) && !isStaged && !isDeleted;
                            const isCurrentUploading = uploadingSlot === item.slot;
                            const stagedFile = stagedDemoFiles[item.slot];
                            const localPreview = localPreviews[item.slot];

                            const explicitUrl = (
                              item.slot === "cover" ? demoStudioData.landingCoverUrl :
                              item.slot === "cover_desktop" ? demoStudioData.landingCoverDesktopUrl :
                              item.slot === "hero" ? demoStudioData.sidebarPhotoUrl :
                              item.slot === "background" ? demoStudioData.globalBgUrl :
                              item.slot === "home" ? demoStudioData.homePhotoUrl :
                              item.slot === "footer" ? demoStudioData.footerPhotoUrl :
                              item.slot === "groom" ? demoStudioData.groomPhotoUrl :
                              item.slot === "bride" ? demoStudioData.bridePhotoUrl :
                              item.slot === "profile" ? demoStudioData.personPhotoUrl :
                              item.slot === "event" ? demoStudioData.eventPhotoUrl :
                              item.slot === "thumbnail_mobile" ? demoStudioData.thumbnailMobileUrl :
                              item.slot === "thumbnail_desktop" ? demoStudioData.thumbnailDesktopUrl : undefined
                            );

                            const isExplicitlyEmpty = isDeleted || explicitUrl === "";
                            const rawSavedUrl = isExplicitlyEmpty ? "" : (explicitUrl || `/demo/${demoStudioTheme.id}/${item.file}`);

                            const cacheVersion = updatedDemoSlots[item.slot] || demoStudioSessionTime;
                            const cleanBaseUrl = rawSavedUrl ? rawSavedUrl.split("?")[0] : "";
                            const savedUrl = cleanBaseUrl ? `${cleanBaseUrl}?v=${cacheVersion}` : "";

                            const effectiveSrc = isDeleted ? "" : (localPreview || savedUrl);
                            const builtinSlot: Record<string, string> = { cover: "LANDING_COVER", cover_desktop: "LANDING_COVER_DESKTOP", hero: "DESKTOP_SIDEBAR", background: "GLOBAL_FIXED_BG", home: "HOME_PHOTO", footer: "CLOSING_COVER" };
                            const builtinSrc = builtinSlot[item.slot] ? demoBuiltinMedia[builtinSlot[item.slot]] : undefined;
                            // Tanpa berkas demo (kosong, dikosongkan, atau berkas tidak ada) demo menampilkan gambar bawaan tema.
                            const showBuiltin = Boolean(builtinSrc) && !isStaged && !localPreview && (isDeleted || !effectiveSrc || Boolean(missingDemoSlots[item.slot]));
                            const isVideoSlot = Boolean(
                              item.allowVideo && (
                                (stagedFile && (stagedFile.type?.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(stagedFile.name))) ||
                                (!stagedFile && effectiveSrc && /\.(mp4|webm|mov)(\?.*)?$/i.test(effectiveSrc))
                              )
                            );
                            return (
                              <div
                                key={item.slot}
                                className={`border rounded-2xl p-4 space-y-3 flex flex-col justify-between transition-all ${
                                  isDeleted
                                    ? "bg-rose-50/40 border-rose-300 ring-1 ring-rose-400/20"
                                    : isStaged
                                    ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/25 shadow-sm"
                                    : isSaved
                                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/15"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-xs text-gray-900">{item.label}</span>
                                    {isDeleted ? (
                                      <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span>✕</span> Dikosongkan
                                      </span>
                                    ) : isStaged ? (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span>●</span> Draft Baru
                                      </span>
                                    ) : isSaved ? (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span>✓</span> Tersimpan
                                      </span>
                                    ) : showBuiltin ? (
                                      <span className="text-[10px] font-semibold text-stone-600">Bawaan tema</span>
                                    ) : !effectiveSrc ? (
                                      <span className="text-[10px] font-semibold text-gray-400 italic">Kosong</span>
                                    ) : (
                                      <span className="font-mono text-[10px] text-gray-400">{item.file}</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 leading-tight">{item.desc}</p>
                                </div>

                                <div className={`relative rounded-xl bg-stone-100 overflow-hidden border border-gray-300 flex items-center justify-center ${
                                  item.slot === "thumbnail_mobile"
                                    ? "aspect-[1/2] max-h-56 mx-auto w-auto min-w-[112px]"
                                    : item.slot === "thumbnail_desktop"
                                    ? "aspect-[16/10] w-full"
                                    : item.slot === "cover" || item.slot === "groom" || item.slot === "bride" || item.slot === "hero"
                                    ? "aspect-[3/4] max-h-56 mx-auto w-auto min-w-[140px]"
                                    : "aspect-video w-full"
                                }`}>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center pointer-events-none text-stone-400">
                                    <svg className="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[10px] font-medium text-stone-500">
                                      {isDeleted ? "Foto dikosongkan (tanpa foto)" : "Belum ada file / Kosong"}
                                    </span>
                                  </div>
                                  {effectiveSrc && isVideoSlot ? (
                                    <video
                                      key={isStaged ? localPreview : updatedDemoSlots[item.slot] || effectiveSrc}
                                      src={effectiveSrc}
                                      autoPlay
                                      loop
                                      muted
                                      playsInline
                                      className="w-full h-full object-cover object-top relative z-1"
                                    />
                                  ) : effectiveSrc ? (
                                    <img
                                      key={isStaged ? localPreview : updatedDemoSlots[item.slot] || effectiveSrc}
                                      src={effectiveSrc}
                                      alt={item.label}
                                      className="w-full h-full object-cover object-top relative z-1"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                        if (!missingDemoSlots[item.slot]) setMissingDemoSlots((prev) => ({ ...prev, [item.slot]: true }));
                                      }}
                                      onLoad={(e) => {
                                        (e.target as HTMLElement).style.display = "block";
                                        if (missingDemoSlots[item.slot]) setMissingDemoSlots((prev) => ({ ...prev, [item.slot]: false }));
                                      }}
                                    />
                                  ) : null}
                                  {showBuiltin && (
                                    <>
                                      <img src={builtinSrc} alt={`${item.label} bawaan tema`} className="absolute inset-0 w-full h-full object-cover object-top z-1" />
                                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 text-[9px] font-semibold tracking-wide text-white rounded pointer-events-none z-10">
                                        Bawaan tema{isDeleted ? " (setelah dikosongkan)" : ""}
                                      </div>
                                    </>
                                  )}
                                  {effectiveSrc && isVideoSlot && (
                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-xs text-[9px] font-bold tracking-wider text-amber-300 rounded border border-amber-500/30 pointer-events-none z-10">
                                      VIDEO MP4
                                    </div>
                                  )}
                                  {isCurrentUploading && (
                                    <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 text-white p-2 text-center z-10 animate-fade-in">
                                      <svg className="animate-spin h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase">Menyimpan Aset...</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <label className="flex-1 py-2 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-xl text-xs font-bold transition text-center cursor-pointer block shadow-2xs">
                                    <span>{isStaged ? "Ganti Lagi" : effectiveSrc ? (item.allowVideo ? "Ganti File" : "Ganti Foto") : (item.allowVideo ? "Pilih Foto / Video" : "Pilih Foto")}</span>
                                    <input
                                      type="file"
                                      accept={item.allowVideo ? "image/*,video/mp4,video/webm" : "image/*"}
                                      disabled={demoStudioSaving}
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleStageDemoAsset(item.slot, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  {isStaged && (
                                    <button
                                      type="button"
                                      onClick={() => handleDiscardStagedAsset(item.slot)}
                                      disabled={demoStudioSaving}
                                      title="Batalkan draft aset ini"
                                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  )}
                                  {isDeleted && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreDeletedAsset(item.slot)}
                                      disabled={demoStudioSaving}
                                      title="Pulihkan foto sebelumnya"
                                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                      Pulihkan
                                    </button>
                                  )}
                                  {!isDeleted && effectiveSrc && (
                                    <button
                                      type="button"
                                      onClick={() => handleStageDeleteAsset(item.slot)}
                                      disabled={demoStudioSaving}
                                      title="Hapus / kosongkan foto slot ini"
                                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                      Hapus
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {(() => {
                          const tone = parseBgPhotoTone(demoStudioData.featureSettings?.bgPhotoTone);
                          const setTone = (value: number) => setDemoStudioData((prev: any) => {
                            const { bgPhotoTone: _drop, ...rest } = prev.featureSettings || {};
                            const featureSettings = value === 0 ? rest : { ...rest, bgPhotoTone: value };
                            return { ...prev, featureSettings };
                          });
                          return (
                            <div className="mt-4 border border-gray-200 rounded-2xl p-4 bg-white">
                              <div className="flex items-baseline justify-between gap-3">
                                <label htmlFor="demoBgPhotoTone" className="text-sm font-bold text-gray-900">Kecerahan Foto Latar</label>
                                <span className="text-xs font-medium text-gray-600 tabular-nums">
                                  {tone === 0 ? "Normal" : tone < 0 ? `Gelap ${-tone}%` : `Terang ${tone}%`}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-600">
                                Mengatur foto Background Global demo, sama dengan slider di studio klien. Geser ke kiri bila teks sulit dibaca, ke kanan bila foto terlalu gelap. Berlaku setelah Simpan Perubahan Demo.
                              </p>
                              <input
                                id="demoBgPhotoTone"
                                type="range"
                                min={-BG_PHOTO_TONE_LIMIT}
                                max={BG_PHOTO_TONE_LIMIT}
                                step={5}
                                value={tone}
                                onChange={(e) => setTone(parseBgPhotoTone(e.target.value))}
                                disabled={demoStudioSaving}
                                className="mt-3 w-full accent-amber-700"
                              />
                              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                                <span>Gelapkan</span>
                                {tone !== 0 && (
                                  <button type="button" onClick={() => setTone(0)} className="font-semibold text-amber-800 hover:text-amber-900">
                                    Kembali ke normal
                                  </button>
                                )}
                                <span>Terangkan</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 8 Gallery Photos Grid */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
                          2. Delapan Foto Galeri Showroom Demo (gallery_01 s/d gallery_08)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                          {Array.from({ length: 8 }).map((_, idx) => {
                            const slotName = `gallery_0${idx + 1}`;
                            const fileName = `${slotName}.webp`;
                            const isDeleted = Boolean(stagedDeletedSlots[slotName]);
                            const isStaged = Boolean(stagedDemoFiles[slotName]);
                            const isSaved = Boolean(updatedDemoSlots[slotName]) && !isStaged && !isDeleted;
                            const isCurrentUploading = uploadingSlot === slotName;

                            const rawGalleryUrl = Array.isArray(demoStudioData.galleryPhotos) ? demoStudioData.galleryPhotos[idx] : undefined;
                            const isExplicitlyEmpty = isDeleted || rawGalleryUrl === "";
                            const cleanSaved = isExplicitlyEmpty ? "" : (rawGalleryUrl || `/demo/${demoStudioTheme.id}/${fileName}`);
                            const imgSrc = isDeleted ? "" : (localPreviews[slotName] || (cleanSaved ? `${cleanSaved.split("?")[0]}?v=${updatedDemoSlots[slotName] || demoStudioSessionTime}` : ""));
                            return (
                              <div
                                key={slotName}
                                className={`border rounded-2xl p-3 space-y-2 transition-all ${
                                  isDeleted
                                    ? "bg-rose-50/40 border-rose-300 ring-1 ring-rose-400/20"
                                    : isStaged
                                    ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/25 shadow-sm"
                                    : isSaved
                                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/15"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                                  <span>Galeri #{idx + 1}</span>
                                  {isDeleted ? (
                                    <span className="text-[9px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✕</span> Dihapus
                                    </span>
                                  ) : isStaged ? (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>●</span> Draft
                                    </span>
                                  ) : isSaved ? (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✓</span> Tersimpan
                                    </span>
                                  ) : !imgSrc ? (
                                    <span className="text-[9px] font-semibold text-gray-400 italic">Kosong</span>
                                  ) : (
                                    <span className="font-mono text-[9px] text-gray-400">{fileName}</span>
                                  )}
                                </div>
                                <div className="relative aspect-square rounded-xl bg-gray-200 overflow-hidden border border-gray-300">
                                  {imgSrc ? (
                                    <img
                                      key={isStaged ? localPreviews[slotName] : updatedDemoSlots[slotName] || imgSrc}
                                      src={imgSrc}
                                      alt={`Gallery ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none text-stone-400 bg-stone-100">
                                      <span className="text-[10px] font-medium text-stone-500">
                                        {isDeleted ? "Dikosongkan" : "Kosong"}
                                      </span>
                                    </div>
                                  )}
                                  {isCurrentUploading && (
                                    <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-white p-1.5 text-center z-10 animate-fade-in">
                                      <svg className="animate-spin h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider">Menyimpan...</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <label className="flex-1 py-1.5 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-lg text-[11px] font-bold transition text-center cursor-pointer block shadow-2xs">
                                    <span>{isStaged ? "Ganti" : imgSrc ? "Ganti" : "Pilih"}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={demoStudioSaving}
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleStageDemoAsset(slotName, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  {isStaged && (
                                    <button
                                      type="button"
                                      onClick={() => handleDiscardStagedAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Batalkan draft foto ini"
                                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  )}
                                  {isDeleted && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreDeletedAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Pulihkan foto galeri ini"
                                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ↩
                                    </button>
                                  )}
                                  {!isDeleted && imgSrc && (
                                    <button
                                      type="button"
                                      onClick={() => handleStageDeleteAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Hapus foto galeri ini"
                                      className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Contoh Foto Kenangan Tamu / Guest Memories Showcase */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            3. Contoh Foto Kenangan Tamu (Guest Memories Demo Showcase)
                          </h4>
                          <span className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                            memory_01 s/d memory_04
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                          {Array.from({ length: 4 }).map((_, idx) => {
                            const slotName = `memory_0${idx + 1}`;
                            const fileName = `${slotName}.webp`;
                            const isDeleted = Boolean(stagedDeletedSlots[slotName]);
                            const isStaged = Boolean(stagedDemoFiles[slotName]);
                            const isSaved = Boolean(updatedDemoSlots[slotName]) && !isStaged && !isDeleted;
                            const isCurrentUploading = uploadingSlot === slotName;
                            const imgSrc = isDeleted ? "" : (localPreviews[slotName] || `/demo/${demoStudioTheme.id}/${fileName}?v=${updatedDemoSlots[slotName] || demoStudioSessionTime}`);
                            return (
                              <div
                                key={slotName}
                                className={`border rounded-2xl p-3 space-y-2 transition-all ${
                                  isDeleted
                                    ? "bg-rose-50/40 border-rose-300 ring-1 ring-rose-400/20"
                                    : isStaged
                                    ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/25 shadow-sm"
                                    : isSaved
                                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/15"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                                  <span>Momen #{idx + 1}</span>
                                  {isDeleted ? (
                                    <span className="text-[9px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✕</span> Dihapus
                                    </span>
                                  ) : isStaged ? (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>●</span> Draft
                                    </span>
                                  ) : isSaved ? (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✓</span> Tersimpan
                                    </span>
                                  ) : !imgSrc ? (
                                    <span className="text-[9px] font-semibold text-gray-400 italic">Kosong</span>
                                  ) : (
                                    <span className="font-mono text-[9px] text-gray-400">{fileName}</span>
                                  )}
                                </div>
                                <div className="relative aspect-square rounded-xl bg-gray-200 overflow-hidden border border-gray-300">
                                  {imgSrc ? (
                                    <img
                                      key={isStaged ? localPreviews[slotName] : updatedDemoSlots[slotName] || imgSrc}
                                      src={imgSrc}
                                      alt={`Memory ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        if (!img.src.includes("gallery_0")) {
                                          img.src = `/demo/${demoStudioTheme.id}/gallery_0${idx + 1}.webp?v=${updatedDemoSlots[slotName] || 1}`;
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none text-stone-400 bg-stone-100">
                                      <span className="text-[10px] font-medium text-stone-500">
                                        {isDeleted ? "Dikosongkan" : "Kosong"}
                                      </span>
                                    </div>
                                  )}
                                  {isCurrentUploading && (
                                    <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-white p-1.5 text-center z-10 animate-fade-in">
                                      <svg className="animate-spin h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider">Menyimpan...</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <label className="flex-1 py-1.5 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-lg text-[11px] font-bold transition text-center cursor-pointer block shadow-2xs">
                                    <span>{isStaged ? "Ganti" : imgSrc ? "Ganti" : "Pilih"}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={demoStudioSaving}
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleStageDemoAsset(slotName, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  {isStaged && (
                                    <button
                                      type="button"
                                      onClick={() => handleDiscardStagedAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Batalkan draft foto ini"
                                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  )}
                                  {isDeleted && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreDeletedAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Pulihkan foto momen ini"
                                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ↩
                                    </button>
                                  )}
                                  {!isDeleted && imgSrc && (
                                    <button
                                      type="button"
                                      onClick={() => handleStageDeleteAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Hapus foto momen ini"
                                      className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. Audio Musik Latar Belakang Demo (BGM) */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              4. Musik Latar Belakang Demo (Audio BGM)
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Lagu latar yang akan otomatis diputar saat pengunjung menekan tombol &ldquo;Buka Undangan&rdquo; di showroom demo publik.
                            </p>
                          </div>
                          {stagedDemoFiles["music"] ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md self-start sm:self-auto flex items-center gap-1">
                              <span>●</span> Draft Audio Baru
                            </span>
                          ) : updatedDemoSlots["music"] ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md self-start sm:self-auto flex items-center gap-1">
                              <span>✓</span> Tersimpan
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-gray-400 self-start sm:self-auto">
                              {demoStudioData.audioUrl || "music.mp3"}
                            </span>
                          )}
                        </div>

                        {/* Pilihan: Pilih dari Pustaka Sistem vs Upload Sendiri */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-8 space-y-1">
                            <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                              Pilih dari Pustaka Musik Sistem ({systemMusics.length} Lagu):
                            </label>
                            <select
                              value={stagedDemoFiles["music"] ? "" : (demoStudioData.audioUrl || "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                if (stagedDemoFiles["music"]) {
                                  handleDiscardStagedAsset("music");
                                }
                                setDemoStudioData((prev: any) => ({ ...prev, audioUrl: val }));
                              }}
                              disabled={demoStudioSaving}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer truncate"
                            >
                              <option value="">-- Pilih Lagu dari Pustaka Musik --</option>
                              {systemMusics.map((m) => (
                                <option key={m.id} value={m.url}>
                                  {m.title} {m.composer ? `(${m.composer})` : ""} {m.genre ? `• ${m.genre}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-4 flex items-center gap-2">
                            <label className="w-full px-3.5 py-2 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-xl text-xs font-bold transition text-center cursor-pointer block shadow-2xs truncate">
                              <span>{stagedDemoFiles["music"] ? "Ganti File Audio" : "Upload File Baru"}</span>
                              <input
                                type="file"
                                accept="audio/mpeg,audio/ogg,audio/mp3,.mp3,.ogg"
                                disabled={demoStudioSaving}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleStageDemoAsset("music", e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                            {stagedDemoFiles["music"] && (
                              <button
                                type="button"
                                onClick={() => handleDiscardStagedAsset("music")}
                                disabled={demoStudioSaving}
                                title="Batalkan file audio ini"
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                              >
                                Batal
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Player Preview Audio */}
                        <div>
                          <audio
                            key={stagedDemoFiles["music"] ? localPreviews["music"] : updatedDemoSlots["music"] || demoStudioData.audioUrl}
                            controls
                            src={localPreviews["music"] || demoStudioData.audioUrl || `/demo/${demoStudioTheme.id}/music.mp3`}
                            className="w-full h-10 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  )}
    </>
  );
}
