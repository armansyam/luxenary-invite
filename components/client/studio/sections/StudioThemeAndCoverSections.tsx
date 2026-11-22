"use client";

import Link from "next/link";
import {
  EVENT_TYPE_LABELS,
  extractSubEventOptions,
  isThemeInMode,
  resolveSubEventMeta,
  sortThemesForEvent,
} from "@/lib/invitationUtils";
import { getApexRootDomain } from "@/lib/domainUtils";
import { BG_PHOTO_TONE_LIMIT, BG_SCRIM_MAX, parseBgPhotoTone, parseBgScrim } from "@/lib/bgPhotoTone";
import { MAX_DECORATIVE_LABEL_LENGTH, sectionLabelFor, type BuilderEventType } from "@/lib/themeBuilder/spec";
import type { EditableText, FreeSectionText } from "@/lib/themeBuilder/texts";
import {
  PhotoInput,
  FreeSectionTextFields,
  SectionHeaderToggle,
  SectionHeaderActions,
} from "@/components/client/studio/StudioFormControls";
import { studioSlotLabel, themeDefaultOf } from "@/components/client/studio/studioPresets";
import { useStudioEditor } from "@/components/client/studio/StudioEditorContext";

export function StudioThemeAndCoverSections() {
  const {
    activeSectionTab,
    audioUploadError,
    bgPhotoTone,
    bgScrim,
    collapsed,
    eventNounLabel,
    getCustomLabel,
    getFeatureSetting,
    handleAudioUpload,
    handleUploadEnd,
    handleUploadStart,
    invitation,
    invitationId,
    isDirty,
    isUploading,
    isWeddingEvent,
    loading,
    media,
    musicLoading,
    musicPresets,
    platformSettings,
    playingAudioUrl,
    renderSectionNavFooter,
    saveSection,
    savedSnapshot,
    saving,
    savingSec,
    sectionHeading,
    selectedPersonalThemeSub,
    selectedThemeCategory,
    selectedThemeObj,
    setAudioUploadError,
    setInvitation,
    setLiveIframeKey,
    setSelectedPersonalThemeSub,
    setSelectedThemeCategory,
    showMusic,
    slotUsed,
    themeFallbackMusicUrl,
    themesList,
    themesLoading,
    togglePlayPreview,
    toggleSection,
    unfilledSlots,
    unusedSlotPhotos,
    updateCustomLabel,
    updateFeatureSetting,
    updateField,
    updateMedia,
    uploadingAudio,
  } = useStudioEditor();

  return (
    <>
      {/* 1. SEKSI PILIHAN DESAIN TEMA (SEC1) */}
      {(activeSectionTab === "sec1") && (
      <section id="section-sec1" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec1")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec1
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec1")}</h2>
              {collapsed.sec1 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  {selectedThemeObj ? (
                    <span className="font-medium text-stone-700">{selectedThemeObj.name}</span>
                  ) : (
                    <span className="font-semibold text-rose-600">Belum memilih tema</span>
                  )}
                </span>
              )}
            </div>
            {!collapsed.sec1 && (
              <p className="text-xs text-stone-500 mt-0.5">Pilih tema desain undangan {eventNounLabel} Anda.</p>
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
          <div className="p-3.5 sm:p-7 space-y-5 sm:space-y-6">
            {/* Theme Mockups for this Mode (Isolasi Tegas 3 Mode — tanpa katalog lintas mode) */}
            {(() => {
              const invEvent = (invitation?.eventType || "WEDDING").toUpperCase();
              const isThemeLocked = invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED";
              const hasSubFilter = invEvent === "PERSONAL" || invEvent === "EVENT";
              const modeThemes = sortThemesForEvent(
                themesList.filter((t) => isThemeInMode(t.eventType, invEvent)),
                invEvent,
                invitation?.subEvent,
              );
              const dynamicSubOptions = hasSubFilter
                ? extractSubEventOptions(modeThemes, invEvent)
                : [];
              const effectiveSubFilter =
                selectedPersonalThemeSub !== "all" &&
                !dynamicSubOptions.some((s) => s.toLowerCase() === selectedPersonalThemeSub.toLowerCase())
                  ? "all"
                  : selectedPersonalThemeSub;
              const subFilteredThemes =
                hasSubFilter && effectiveSubFilter !== "all"
                  ? modeThemes.filter(
                      (t) => (t.subEvent || "").toLowerCase() === effectiveSubFilter.toLowerCase(),
                    )
                  : modeThemes;

              // Dapatkan daftar gaya unik pada tema yang ditampilkan
              const CATEGORY_ORDER = ["MINIMALIST", "MODERN", "TRADITIONAL"];
              const CATEGORY_LABELS: Record<string, string> = {
                MINIMALIST: "Minimalis",
                MODERN: "Modern",
                TRADITIONAL: "Traditional",
              };
              const rawCats = new Set(subFilteredThemes.map((t) => (t.category || "").toUpperCase()));
              const availableCategories = CATEGORY_ORDER.filter((c) => rawCats.has(c));

              // Tentukan gaya dari tema yang sedang aktif dipakai
              const currentTheme = themesList.find((t) => t.id === invitation?.themeId);
              const currentThemeCategory = (currentTheme?.category || "").toUpperCase();

              const activeCategoryTab = (selectedThemeCategory && availableCategories.includes(selectedThemeCategory))
                ? selectedThemeCategory
                : (availableCategories.includes(currentThemeCategory) ? currentThemeCategory : (availableCategories[0] || ""));

              const matchesActiveCat = (t: any) =>
                availableCategories.length <= 1 || (t.category || "").toUpperCase() === activeCategoryTab;
              const displayedThemes = subFilteredThemes.filter(matchesActiveCat);
              const availableThemes = subFilteredThemes;

              const renderStudioThemeCard = (th: any) => {
                const isSelected = Boolean(invitation.themeId) && invitation.themeId === th.id;
                const thumbMobile: string | null = th.thumbnailMobile || null;
                const thumbDesktop: string | null = th.thumbnailDesktop || null;
                const hasThumb = Boolean(thumbMobile || thumbDesktop);
                const selectedTick = isSelected && (
                  <span className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold shadow-md">
                    ✓
                  </span>
                );
                return (
                  <div
                    key={th.id}
                    onClick={() => {
                      if (isThemeLocked) return;
                      setInvitation((prev: any) => ({
                        ...prev,
                        themeId: th.id,
                      }));
                      setLiveIframeKey((k) => k + 1);
                    }}
                    className={`stp-card rounded-2xl p-3 border transition-all ${
                      isThemeLocked ? "cursor-default opacity-90" : "cursor-pointer"
                    } ${
                      isSelected
                        ? "is-selected border-amber-800 bg-amber-50/20 ring-2 ring-amber-800/15"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    {/* Tema tanpa thumbnail tampil sebagai kartu nama */}
                    {!hasThumb ? (
                      <div className="relative flex min-h-[8rem] items-center justify-center rounded-xl bg-stone-100 px-4 text-center">
                        <span className="font-serif text-lg font-bold leading-tight text-stone-700">{th.name}</span>
                        {selectedTick}
                      </div>
                    ) : (
                    <div className="stp-scene">
                      {thumbDesktop && (
                      <div className="stp-tablet">
                        <div className="stp-tablet-bar">
                          <div className="stp-tablet-dots">
                            <span/><span/><span/>
                          </div>
                          <div className="stp-tablet-url">
                            {getApexRootDomain()}/{th.id}
                          </div>
                          <div style={{ width: "18px" }}/>
                        </div>
                        <div className="stp-tablet-screen">
                          <img
                            src={thumbDesktop}
                            alt={`${th.name} desktop`}
                            loading="lazy"
                          />
                          <div className="stp-glare"/>
                        </div>
                      </div>
                      )}

                      {thumbMobile && (
                      <div className="stp-phone">
                        <div className="stp-phone-notch"/>
                        <div className="stp-phone-screen">
                          <img
                            src={thumbMobile}
                            alt={`${th.name} mobile`}
                            loading="lazy"
                          />
                          <div className="stp-glare"/>
                        </div>
                      </div>
                      )}

                      {selectedTick}
                    </div>
                    )}

                    {/* ── Theme Info ── */}
                    <div className="space-y-1 mt-0.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                          {th.subEvent ? `${th.series} · ${th.subEvent}` : th.series}
                        </p>
                        <span className={`text-[9px] font-bold ${isSelected ? "text-amber-900" : "text-stone-400"}`}>
                          {isSelected ? "Terpilih" : isThemeLocked ? "Terkunci" : ""}
                        </span>
                      </div>
                      <h3 className="font-bold text-stone-900 text-xs leading-tight">{th.name}</h3>
                      <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">{th.desc}</p>
                      {hasThumb && (
                        <a
                          href={`/demo/${th.id}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-block text-[10px] font-bold text-amber-800 hover:underline pt-0.5"
                        >
                          Lihat Demo
                        </a>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-4">
                  {/* Sub-filter dinamis berdasarkan tag subEvent pada tema aktif (Personal maupun Acara & Event Umum) */}
                  {hasSubFilter && dynamicSubOptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        {
                          id: "all",
                          label: `${invEvent === "PERSONAL" ? "Semua Personal" : "Semua Acara"} (${modeThemes.length})`,
                        },
                        ...dynamicSubOptions.map((sub) => ({
                          id: sub,
                          label: `${sub} (${modeThemes.filter((t) => (t.subEvent || "").toLowerCase() === sub.toLowerCase()).length})`,
                        })),
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSelectedPersonalThemeSub(sub.id)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                            effectiveSubFilter.toLowerCase() === sub.id.toLowerCase()
                              ? "bg-amber-900 text-white border-amber-900 shadow-2xs"
                              : "bg-white text-stone-600 border-stone-200 hover:border-amber-400"
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tab Gaya (Hanya tampil jika tersedia > 1 gaya) */}
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
                      {displayedThemes.map(renderStudioThemeCard)}
                    </div>
                  )}

                  {/* Catatan Isolasi Mode & Permintaan Adaptasi Tema via CS */}
                  {!isThemeLocked && (
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 text-[11px] text-stone-600 leading-relaxed">
                      Katalog ini khusus menampilkan tema mode <strong className="text-stone-800">{EVENT_TYPE_LABELS[invEvent] || invEvent}</strong>. Ingin memakai desain dari mode acara lain?{" "}
                      <Link href="/contact" className="font-bold text-amber-900 underline hover:text-stone-900">
                        Hubungi CS
                      </Link>{" "}
                      untuk permintaan pembuatan versi mode ini oleh tim kami.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tagline / Judul Header Undangan */}
            {(() => {
              const evType = (invitation?.eventType || "WEDDING").toUpperCase();
              const subMeta = resolveSubEventMeta(evType, invitation?.subEvent);
              const defaultTagline = evType === "WEDDING" ? "THE WEDDING OF" : subMeta.coverBadge;
              const baseTagOptions =
                evType === "PERSONAL"
                  ? [
                      subMeta.coverBadge,
                      "BIRTHDAY CELEBRATION",
                      "WALIMATUL KHITAN",
                      "TASYAKURAN AQIQAH",
                      "GRADUATION CELEBRATION",
                      "TASYAKURAN KHATAMAN AL-QUR'AN",
                      "WALIMATUL SAFAR",
                    ]
                  : evType === "EVENT"
                  ? [
                      subMeta.coverBadge,
                      "OFFICIAL INVITATION",
                      "CORPORATE EVENT",
                      "GRAND OPENING",
                      "SEMINAR & WORKSHOP",
                      "PRODUCT LAUNCH",
                      "COMMUNITY GATHERING",
                      "REUNI AKBAR",
                      "HALAL BIHALAL",
                      "SYUKURAN & PERESMIAN",
                    ]
                  : [
                      "THE WEDDING OF",
                      "WALIMATUL 'URS",
                      "THE WEDDING CELEBRATION",
                      "HOLY MATRIMONY",
                      "PAWIWAHAN",
                      "UNDANGAN PERNIKAHAN",
                    ];
              const tagOptions = Array.from(new Set(baseTagOptions));
              return (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900">Tagline / Label Header Undangan</label>
                    <p className="text-[10px] text-stone-500">Teks pembuka di atas nama pada sampul &amp; kartu undangan</p>
                  </div>
                  <input
                    type="text"
                    value={getFeatureSetting("weddingTagline", defaultTagline)}
                    onChange={(e) => updateFeatureSetting("weddingTagline", e.target.value)}
                    placeholder={defaultTagline}
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-base sm:text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 uppercase tracking-wider"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-stone-500 font-medium">Pilihan Cepat:</span>
                    {tagOptions.map((tag) => (
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
              );
            })()}

            {(() => {
              const decorativeTexts: EditableText[] = selectedThemeObj?.decorativeTexts ?? [];
              if (decorativeTexts.length === 0) return null;
              // Server membuang teks hias saat tema berganti (lib/themeLabels.ts), jadi isian baru untuk tema yang belum
              // disimpan akan hilang bersama penyimpanan pergantian tema.
              const themeSaved = invitation.themeId === savedSnapshot?.invitation?.themeId;
              return (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900">Teks Hias Tema</label>
                    <p className="text-[10px] text-stone-500">Tulisan dekoratif di atas desain tema, maksimal {MAX_DECORATIVE_LABEL_LENGTH} karakter. Teks yang panjang dapat menutupi isi undangan; kosongkan untuk menyembunyikannya.</p>
                  </div>
                  {!themeSaved ? (
                    <p className="text-[11px] text-stone-600">Simpan pilihan tema terlebih dahulu untuk mengubah teks hias tema ini.</p>
                  ) : (
                    decorativeTexts.map((text, i) => (
                      <div key={text.key}>
                        <label htmlFor={`decorative-${text.key}`} className="block text-[11px] font-bold text-stone-700 mb-1">
                          Teks hias {i + 1} · seksi {sectionLabelFor(text.section, invitation.eventType as BuilderEventType)}
                        </label>
                        <input
                          id={`decorative-${text.key}`}
                          type="text"
                          maxLength={MAX_DECORATIVE_LABEL_LENGTH}
                          value={getCustomLabel(text.key, text.value)}
                          onChange={(e) => updateCustomLabel(text.key, e.target.value)}
                          placeholder={text.value}
                          className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                        />
                      </div>
                    ))
                  )}
                </div>
              );
            })()}

            {(() => {
              const freeTexts: FreeSectionText[] = selectedThemeObj?.freeTexts ?? [];
              if (freeTexts.length === 0) return null;
              // Sama seperti teks hias: label seksi bebas tema lama dibuang saat tema berganti, jadi isi setelah tema disimpan.
              const themeSaved = invitation.themeId === savedSnapshot?.invitation?.themeId;
              return (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-900">Teks Seksi Tambahan Tema</label>
                    <p className="text-[10px] text-stone-500">Seksi tambahan dari desain tema (doa, catatan, protokol, kartu). Kosongkan isian untuk menyembunyikan baris itu.</p>
                  </div>
                  {!themeSaved ? (
                    <p className="text-[11px] text-stone-600">Simpan pilihan tema terlebih dahulu untuk mengubah teks seksi tambahan tema ini.</p>
                  ) : (
                    <FreeSectionTextFields freeTexts={freeTexts} getValue={getCustomLabel} onChange={updateCustomLabel} />
                  )}
                </div>
              );
            })()}

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
                <span>{!isDirty.sec1 ? "Tersimpan" : "Simpan Tema"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec1")}
          </div>
        )}
      </section>
      )}

      {/* 2. SEKSI SAMPUL & VISUAL UTAMA (SEC2) */}
      {(activeSectionTab === "sec2") && (
      <section id="section-sec2" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec2")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec2
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec2")}</h2>
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
          <div className="p-3.5 sm:p-7 space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {unfilledSlots.length > 0 && (
                <div className="md:col-span-3 p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 text-xs text-amber-950">
                  <span className="font-semibold">Belum diisi untuk tema ini:</span>{" "}
                  {unfilledSlots.map((slot) => studioSlotLabel(slot, invitation?.eventType)).join(", ")}.
                </div>
              )}
              <PhotoInput
                label="Cover Pembuka Mobile — Portrait 9:16"
                desc="Foto/Video PORTRAIT (9:16) — Cover pop-up saat tamu buka undangan di HP. Idealnya foto kepala-kaki 9:16 atau 4:5."
                value={media["LANDING_COVER"] || ""}
                onChange={(url) => updateMedia("LANDING_COVER", url)}
                placeholder="https://.../cover-mobile.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="LANDING_COVER"
                defaultUrl={themeDefaultOf(invitation, "LANDING_COVER")}
                fallbackColor={invitation?.themeMainColor || ""}
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
                expectOrientation="portrait"
              />
              <PhotoInput
                label="Cover Pembuka Desktop — Landscape 16:9 (Opsional)"
                desc="Foto/Video LANDSCAPE (16:9) — tampil layar penuh di PC/laptop. Jika kosong, Cover Mobile tampil utuh di kolom undangan (tidak layar penuh)."
                value={media["LANDING_COVER_DESKTOP"] || ""}
                onChange={(url) => updateMedia("LANDING_COVER_DESKTOP", url)}
                placeholder="https://.../cover-desktop.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="LANDING_COVER_DESKTOP"
                defaultUrl={themeDefaultOf(invitation, "LANDING_COVER_DESKTOP")}
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
                expectOrientation="landscape"
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
                defaultUrl={themeDefaultOf(invitation, "HOME_PHOTO")}
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Hero Kiri Desktop — Bebas"
                desc="Foto/Video BEBAS (square, landscape, portrait) — Panel kiri layar lebar. Ukuran panel = sisa layar setelah 460px kartu undangan di kanan. Semua rasio foto otomatis menyesuaikan tanpa distorsi. Bila dikosongkan, tampilan memakai bawaan tema."
                value={media["DESKTOP_SIDEBAR"] || ""}
                onChange={(url) => updateMedia("DESKTOP_SIDEBAR", url)}
                placeholder="https://.../sidebar-hero.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="DESKTOP_SIDEBAR"
                defaultUrl={themeDefaultOf(invitation, "DESKTOP_SIDEBAR")}
                fallbackColor={invitation?.themeMainColor || ""}
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Penutup / Footer — Portrait/Square"
                desc="Foto/Video PORTRAIT atau SQUARE — Background seksi penutup undangan. Bila dikosongkan, tampilan memakai bawaan tema."
                value={media["CLOSING_COVER"] || ""}
                onChange={(url) => updateMedia("CLOSING_COVER", url)}
                placeholder="https://.../closing.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="CLOSING_COVER"
                defaultUrl={themeDefaultOf(invitation, "CLOSING_COVER")}
                fallbackColor={invitation?.themeMainColor || ""}
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
              <PhotoInput
                label="Latar Belakang Global — Portrait/Bebas"
                desc="Foto/Video PORTRAIT atau bebas — Fixed canvas di balik seluruh kartu undangan. Bila dikosongkan, tampilan memakai bawaan tema."
                value={media["GLOBAL_FIXED_BG"] || ""}
                onChange={(url) => updateMedia("GLOBAL_FIXED_BG", url)}
                onUploaded={(res) => { if (typeof res.suggestedBgScrim === "number") updateFeatureSetting("bgScrim", res.suggestedBgScrim); }}
                placeholder="https://.../fixed-bg.jpg atau .mp4"
                allowVideo={true}
                invitationId={invitationId}
                slot="GLOBAL_FIXED_BG"
                defaultUrl={themeDefaultOf(invitation, "GLOBAL_FIXED_BG")}
                fallbackColor={invitation?.themeMainColor || ""}
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />

              {slotUsed("GLOBAL_FIXED_BG") && (media["GLOBAL_FIXED_BG"] || themeDefaultOf(invitation, "GLOBAL_FIXED_BG")) && (
                <div className="md:col-span-3 p-4 rounded-xl border border-stone-200/90 bg-white">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="bgPhotoTone" className="text-sm font-semibold text-stone-900">Kecerahan Foto Latar</label>
                    <span className="text-xs font-medium text-stone-600 tabular-nums">
                      {bgPhotoTone === 0 ? "Normal" : bgPhotoTone < 0 ? `Gelap ${-bgPhotoTone}%` : `Terang ${bgPhotoTone}%`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">
                    Geser ke kiri bila teks undangan sulit dibaca karena foto latar terlalu terang, ke kanan bila foto terlalu gelap. Warna teks tema tidak berubah.
                  </p>
                  <input
                    id="bgPhotoTone"
                    type="range"
                    min={-BG_PHOTO_TONE_LIMIT}
                    max={BG_PHOTO_TONE_LIMIT}
                    step={5}
                    value={bgPhotoTone}
                    onChange={(e) => updateFeatureSetting("bgPhotoTone", parseBgPhotoTone(e.target.value))}
                    className="mt-3 w-full accent-amber-700"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                    <span>Gelapkan</span>
                    {bgPhotoTone !== 0 && (
                      <button type="button" onClick={() => updateFeatureSetting("bgPhotoTone", 0)} className="font-semibold text-amber-800 hover:text-amber-900">
                        Kembali ke normal
                      </button>
                    )}
                    <span>Terangkan</span>
                  </div>
                </div>
              )}

              {slotUsed("GLOBAL_FIXED_BG") && media["GLOBAL_FIXED_BG"] && (
                <div className="md:col-span-3 p-4 rounded-xl border border-stone-200/90 bg-white">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="bgScrim" className="text-sm font-semibold text-stone-900">Kepekatan Lapisan Latar</label>
                    <span className="text-xs font-medium text-stone-600 tabular-nums">{bgScrim === null ? "Bawaan tema" : `${bgScrim}%`}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">
                    Lapisan warna tema di atas foto latar agar teks terbaca. Nilai awal dihitung dari terang-gelap foto yang Anda unggah; geser ke kanan bila teks masih sulit dibaca, ke kiri agar foto lebih terlihat.
                  </p>
                  <input
                    id="bgScrim"
                    type="range"
                    min={0}
                    max={BG_SCRIM_MAX}
                    step={5}
                    value={bgScrim ?? BG_SCRIM_MAX}
                    onChange={(e) => updateFeatureSetting("bgScrim", parseBgScrim(e.target.value))}
                    className="mt-3 w-full accent-amber-700"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                    <span>Foto lebih terlihat</span>
                    {bgScrim !== null && (
                      <button type="button" onClick={() => updateFeatureSetting("bgScrim", null)} className="font-semibold text-amber-800 hover:text-amber-900">
                        Kembali ke bawaan tema
                      </button>
                    )}
                    <span>Teks lebih terbaca</span>
                  </div>
                </div>
              )}

              {unusedSlotPhotos.length > 0 && (
                <details className="md:col-span-3 rounded-xl border border-stone-200/90 bg-white">
                  <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-stone-900">
                    Foto yang tidak dipakai tema ini ({unusedSlotPhotos.length})
                  </summary>
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-xs text-stone-600">
                      Foto ini tersimpan dari tema sebelumnya dan tidak tampil di tema yang dipilih. Foto tampil lagi bila Anda kembali ke tema yang memakainya. Hapus bila tidak diperlukan, lalu simpan.
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {unusedSlotPhotos.map((slot) => (
                        <li key={slot} className="flex items-center gap-3 p-2 rounded-lg border border-stone-200/80">
                          {/\.(mp4|webm|mov)(\?|$)/i.test(media[slot]) ? (
                            <span className="w-12 h-12 shrink-0 rounded-md bg-stone-100 text-[10px] font-semibold text-stone-500 flex items-center justify-center">Video</span>
                          ) : (
                            <img src={media[slot]} alt={studioSlotLabel(slot, invitation?.eventType)} className="w-12 h-12 shrink-0 rounded-md object-cover" />
                          )}
                          <span className="flex-1 min-w-0 text-xs font-medium text-stone-800 truncate">{studioSlotLabel(slot, invitation?.eventType)}</span>
                          <button
                            type="button"
                            onClick={() => updateMedia(slot, "")}
                            className="shrink-0 px-2.5 py-1 rounded-lg border border-stone-300 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
                          >
                            Hapus
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}

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
                    <span className="font-semibold text-amber-700">Cover Pembuka Mobile</span> — foto/video vertikal fullscreen layar ponsel. Idealnya foto {isWeddingEvent ? "prewedding" : "utama"} portrait 9:16 atau 4:5.
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200/70">
                    <span className="font-bold text-stone-800 block mb-1">Cover Desktop — Landscape 16:9</span>
                    <span className="font-semibold text-amber-700">Cover Pembuka Desktop</span> — foto/video horizontal yang tampil layar penuh di monitor. Idealnya foto {isWeddingEvent ? "prewedding" : "utama"} outdoor sinematik. Jika kosong, Cover Mobile tampil utuh di kolom undangan, tidak layar penuh, sehingga foto vertikal tidak terpotong.
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

            {/* Musik Latar */}
            <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/80 bg-amber-50/30 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Musik Latar Undangan (Audio Background)</h3>
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
                        const currentMusicUrl = invitation.musicUrl || themeFallbackMusicUrl;
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
                              : (musicPresets.find((p) => p.url === themeFallbackMusicUrl)?.title || (themeFallbackMusicUrl ? "Musik Bawaan Tema" : "Belum ada musik dipilih")))}
                        </p>
                        <span className="text-[10px] text-stone-500 block truncate">
                          {musicPresets.find((p) => p.url === invitation.musicUrl)?.genre ||
                            (invitation.musicUrl ? invitation.musicUrl : (musicPresets.find((p) => p.url === themeFallbackMusicUrl)?.genre || "Dipakai otomatis sampai Anda memilih lagu"))}
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
                    <span className="block text-[11px] font-bold text-stone-700 mb-2">Atau Pilih Lagu dari Sistem:</span>
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
                          const currentSelectedUrl = invitation.musicUrl || themeFallbackMusicUrl;
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
                      placeholder="https://domain.com/audio/background-music.mp3 atau https://youtube.com/watch?v=..."
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
    </>
  );
}
