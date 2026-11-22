"use client";

import Link from "next/link";
import { DresscodeStudioBlock } from "@/components/client/studio/DresscodeStudioBlock";
import { Input, SectionHeaderToggle, SectionHeaderActions } from "@/components/client/studio/StudioFormControls";
import { useStudioEditor } from "@/components/client/studio/StudioEditorContext";

export function StudioExtrasSections() {
  const {
    activeSectionTab,
    collapsed,
    eventNounLabel,
    getCustomLabel,
    getFeatureSetting,
    hasCap,
    invitation,
    isDirty,
    isWeddingEvent,
    renderSectionNavFooter,
    saveSection,
    saving,
    savingSec,
    sectionHeading,
    setShowManualHex,
    setThemeSyncSuccess,
    showDresscode,
    showFilter,
    showLiveStream,
    showManualHex,
    showTurutMengundang,
    themeSyncSuccess,
    toggleSection,
    updateCustomLabel,
    updateFeatureSetting,
    updateField,
  } = useStudioEditor();

  return (
    <>
      {/* 10. SEKSI DRESS CODE (SEC10) */}
      {(activeSectionTab === "sec10") && (
      <section id="section-sec10" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec10")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec10
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec10")}</h2>
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
          <div className="p-3.5 sm:p-7 space-y-4">
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
      <section id="section-sec11" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec11")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec11
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec11")}</h2>
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
          <div className="p-3.5 sm:p-7 space-y-4">
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
                  value={getFeatureSetting("liveStreamYoutubeUrl", "")}
                  onChange={(v) => updateFeatureSetting("liveStreamYoutubeUrl", v)}
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
      <section id="section-sec12" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec12")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec12
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec12")}</h2>
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
              <p className="text-xs text-stone-500 mt-0.5">Tautkan link effect / filter Instagram Story resmi {eventNounLabel} Anda</p>
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
          <div className="p-3.5 sm:p-7 space-y-4">
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
      <section id="section-sec13" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec13")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec13
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec13")}</h2>
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
          <div className="p-3.5 sm:p-7 space-y-4">
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
      <section id="section-sec14" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec14")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec14
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec14")}</h2>
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
          <div className="p-3.5 sm:p-7 space-y-5 sm:space-y-6">
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
                    <span>Buka Menu Moments</span>
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
                    value={getCustomLabel("memoriesSubtitle", `Buka kamera dan jepret momen candid seru Anda selama menghadiri ${isWeddingEvent ? "pernikahan" : "acara"} kami langsung ke album kenangan bersama:`)}
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
                      <span>Menu Moments</span>
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
    </>
  );
}
