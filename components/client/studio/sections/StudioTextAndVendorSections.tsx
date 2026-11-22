"use client";

import { compressImageToWebP } from "@/lib/clientImageCompressor";
import { LanguageSelector } from "@/components/client/studio/LanguageSelector";
import { Input, SectionHeaderToggle, SectionHeaderActions } from "@/components/client/studio/StudioFormControls";
import { useStudioEditor } from "@/components/client/studio/StudioEditorContext";

export function StudioTextAndVendorSections() {
  const {
    activeBlueprint,
    activeSectionTab,
    collapsed,
    eventNounLabel,
    feedback,
    getCustomLabel,
    getFeatureSetting,
    invitation,
    invitationId,
    isDirty,
    isWeddingEvent,
    renderSectionNavFooter,
    saveSection,
    saving,
    savingSec,
    sectionHeading,
    toggleSection,
    updateCustomLabel,
    updateFeatureSetting,
  } = useStudioEditor();

  return (
    <>
      {/* 15. SEKSI PENGATURAN TEKS UI & LABEL (SEC15) */}
      {(activeSectionTab === "sec15") && (
      <section id="section-sec15" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec15")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec15
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec15")}</h2>
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
          <div className="p-3.5 sm:p-7 space-y-4 sm:space-y-5">
            <LanguageSelector
              value={getFeatureSetting("language", "id") === "en" ? "en" : "id"}
              onChange={(nextLang) => updateFeatureSetting("language", nextLang)}
            />

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
                  value={getCustomLabel("coverSubtitle", (!invitation?.eventType || invitation?.eventType === "WEDDING") ? "UNDANGAN PERNIKAHAN" : "UNDANGAN RESMI")}
                  onChange={(v) => updateCustomLabel("coverSubtitle", v)}
                  placeholder="UNDANGAN RESMI / DIGITAL INVITATION"
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

            {/* Group 4: Judul & Eyebrow Seksi Undangan */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                Judul &amp; Eyebrow Seksi Undangan (Universal Label)
              </h4>
              <p className="text-[11px] text-stone-500">Kustomisasi judul, subjudul, dan teks pengantar di seluruh seksi undangan sesuai konsep acara Anda.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {isWeddingEvent && (
                  <>
                    <Input
                      label="Judul Seksi Mempelai"
                      value={getCustomLabel("coupleTitle", activeBlueprint?.coupleSectionTitle || "Mempelai")}
                      onChange={(v) => updateCustomLabel("coupleTitle", v)}
                      placeholder={activeBlueprint?.coupleSectionTitle || "Mempelai / The Couple"}
                    />
                    <Input
                      label="Eyebrow Seksi Mempelai"
                      value={getCustomLabel("coupleEyebrow", activeBlueprint?.coupleSectionEyebrow || "THE COUPLE")}
                      onChange={(v) => updateCustomLabel("coupleEyebrow", v)}
                      placeholder={activeBlueprint?.coupleSectionEyebrow || "DUA INSAN / THE COUPLE"}
                    />
                  </>
                )}
                <Input
                  label="Judul Seksi Rangkaian Acara"
                  value={getCustomLabel("eventsTitle", activeBlueprint?.eventsSectionTitle || "Rangkaian Acara")}
                  onChange={(v) => updateCustomLabel("eventsTitle", v)}
                  placeholder={activeBlueprint?.eventsSectionTitle || "Rangkaian Acara / Schedule"}
                />
                <Input
                  label="Eyebrow Seksi Rangkaian Acara"
                  value={getCustomLabel("eventsEyebrow", activeBlueprint?.eventsSectionEyebrow || "AGENDA ACARA")}
                  onChange={(v) => updateCustomLabel("eventsEyebrow", v)}
                  placeholder={activeBlueprint?.eventsSectionEyebrow || "AGENDA ACARA / SAVE THE DATE"}
                />
                {isWeddingEvent && (
                  <Input
                    label="Eyebrow Kisah Kasih (Story)"
                    value={getCustomLabel("storyEyebrow", activeBlueprint?.storySectionEyebrow || "OUR JOURNEY")}
                    onChange={(v) => updateCustomLabel("storyEyebrow", v)}
                    placeholder={activeBlueprint?.storySectionEyebrow || "OUR JOURNEY / KISAH KASIH"}
                  />
                )}
                <Input
                  label="Eyebrow Galeri Momen"
                  value={getCustomLabel("galleryEyebrow", activeBlueprint?.gallerySectionEyebrow || "MOMEN BAHAGIA")}
                  onChange={(v) => updateCustomLabel("galleryEyebrow", v)}
                  placeholder={activeBlueprint?.gallerySectionEyebrow || "MOMEN BAHAGIA / GALLERY"}
                />
                <Input
                  label="Judul Seksi Tanda Kasih / Kado"
                  value={getCustomLabel("giftTitle", activeBlueprint?.giftSectionTitle || "Tanda Kasih")}
                  onChange={(v) => updateCustomLabel("giftTitle", v)}
                  placeholder={activeBlueprint?.giftSectionTitle || "Tanda Kasih / Digital Gift"}
                />
                <Input
                  label="Eyebrow Tanda Kasih"
                  value={getCustomLabel("giftEyebrow", activeBlueprint?.giftSectionEyebrow || "TANDA KASIH")}
                  onChange={(v) => updateCustomLabel("giftEyebrow", v)}
                  placeholder={activeBlueprint?.giftSectionEyebrow || "DIGITAL GIFT / TANDA KASIH"}
                />
                <Input
                  label="Judul Turut Mengundang"
                  value={getCustomLabel("turutMengundangTitle", activeBlueprint?.turutMengundangTitle || "Turut Mengundang")}
                  onChange={(v) => updateCustomLabel("turutMengundangTitle", v)}
                  placeholder={activeBlueprint?.turutMengundangTitle || "Turut Mengundang / Honored Guests"}
                />
                <Input
                  label="Eyebrow Turut Mengundang"
                  value={getCustomLabel("turutMengundangEyebrow", activeBlueprint?.turutMengundangEyebrow || "KELUARGA BESAR")}
                  onChange={(v) => updateCustomLabel("turutMengundangEyebrow", v)}
                  placeholder={activeBlueprint?.turutMengundangEyebrow || "KELUARGA BESAR / WITH RESPECT"}
                />
                <Input
                  label="Judul Buku Tamu & Kehadiran"
                  value={getCustomLabel("wishesTitle", activeBlueprint?.wishesSectionTitle || "Buku Tamu & Kehadiran")}
                  onChange={(v) => updateCustomLabel("wishesTitle", v)}
                  placeholder={activeBlueprint?.wishesSectionTitle || "Buku Tamu & Kehadiran / Guest Book"}
                />
                <Input
                  label="Eyebrow Buku Tamu"
                  value={getCustomLabel("wishesEyebrow", "WISHES & RSVP")}
                  onChange={(v) => updateCustomLabel("wishesEyebrow", v)}
                  placeholder="WISHES & RSVP / DOA RESTU"
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

      {/* 16. SEKSI MITRA & VENDOR PERNIKAHAN (SEC16) */}
      {(activeSectionTab === "sec16") && (
      <section id="section-sec16" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec16")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec16
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec16")}</h2>
              {collapsed.sec16 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className="text-stone-600 font-medium truncate max-w-[220px] sm:max-w-xs">
                    {Boolean(getFeatureSetting("showVendors", false)) ? "Aktif" : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec16 && (
              <p className="text-xs text-stone-500 mt-0.5">Daftar logo dan nama mitra vendor acara (fotografer, dokumentasi, dekorasi, busana) yang tampil bersih tanpa bingkai kartu di atas footer.</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec16)}
              isSaving={saving && savingSec === "sec16"}
              onSave={() => saveSection("sec16")}
              collapsed={Boolean(collapsed.sec16)}
              onToggle={() => toggleSection("sec16")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec16 && (
          <div className="p-3.5 sm:p-7 space-y-5 sm:space-y-6">
            {/* Toggle Switch Tampilkan Section Vendor */}
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Tampilkan Section Mitra Vendor:</span>
                <span className="text-[11px] text-stone-500 leading-tight block mt-0.5">Aktifkan untuk menampilkan ucapan kredit dan logo mitra vendor di undangan digital Anda.</span>
              </div>
              <SectionHeaderToggle
                label=""
                checked={Boolean(getFeatureSetting("showVendors", false))}
                onChange={(v) => updateFeatureSetting("showVendors", v)}
              />
            </div>

            {Boolean(getFeatureSetting("showVendors", false)) && (
              <>
                {/* Pengaturan Label Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Judul Section"
                    value={getCustomLabel("vendorTitle", "Vendor")}
                    onChange={(v) => updateCustomLabel("vendorTitle", v)}
                    placeholder="Vendor / Event Partners"
                  />
                  <Input
                    label="Teks Subtitle / Catatan (Opsional)"
                    value={getCustomLabel("vendorSubtitle", "")}
                    onChange={(v) => updateCustomLabel("vendorSubtitle", v)}
                    placeholder="Terima kasih kepada seluruh mitra yang telah membantu..."
                  />
                </div>

                {/* Daftar Vendor */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider text-amber-950 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        <span>Daftar Mitra Vendor</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300/70">
                          {(() => {
                            const raw = getFeatureSetting("vendors", []);
                            return Array.isArray(raw) ? raw.length : 0;
                          })()} Vendor
                        </span>
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">Logo PNG transparan dan nama vendor tampil melayang bersih tanpa bingkai kartu di atas footer.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const raw = getFeatureSetting("vendors", []);
                        let curList: any[] = [];
                        if (Array.isArray(raw)) curList = [...raw];
                        else if (typeof raw === "string") {
                          try { curList = JSON.parse(raw); } catch {}
                        }
                        const newV = {
                          id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                          name: "",
                          logoUrl: "",
                          url: "",
                        };
                        updateFeatureSetting("vendors", [...curList, newV]);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span>Tambah Vendor</span>
                    </button>
                  </div>

                  {(() => {
                    const raw = getFeatureSetting("vendors", []);
                    let list: any[] = [];
                    if (Array.isArray(raw)) list = raw;
                    else if (typeof raw === "string") {
                      try { list = JSON.parse(raw); } catch {}
                    }
                    if (!Array.isArray(list)) list = [];

                    if (list.length === 0) {
                      return (
                        <div className="p-8 text-center bg-stone-50/70 rounded-2xl border border-dashed border-stone-200">
                          <p className="text-xs font-medium text-stone-500 mb-2">Belum ada mitra vendor yang ditambahkan.</p>
                          <p className="text-[11px] text-stone-400 max-w-sm mx-auto mb-4">Klik tombol Tambah Vendor untuk memasukkan logo atau nama vendor fotografer, MUA, dekorasi, atau busana {eventNounLabel} Anda.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const newV = {
                                id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                name: "",
                                logoUrl: "",
                                url: "",
                              };
                              updateFeatureSetting("vendors", [newV]);
                            }}
                            className="px-4 py-2 text-xs font-semibold bg-amber-800 hover:bg-amber-900 text-white rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span>Tambah Vendor Pertama</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        {list.map((vendor: any, idx: number) => {
                          const vendorSlot = `vendor_${vendor.id || idx + 1}`;
                          return (
                            <div 
                              key={vendor.id || idx} 
                              className="p-2 sm:p-2.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-all shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3"
                            >
                              {/* Nomor urut */}
                              <span className="hidden sm:flex w-6 h-6 rounded-lg bg-stone-100 text-stone-600 text-[10px] font-mono font-bold items-center justify-center shrink-0">
                                {idx + 1}
                              </span>

                              {/* Slot Logo Mini */}
                              <div className="relative shrink-0 flex items-center gap-1.5">
                                <label 
                                  className="w-16 h-10 rounded-lg border border-dashed border-stone-300 hover:border-amber-600 bg-stone-50 hover:bg-amber-50/30 flex items-center justify-center p-1 transition cursor-pointer relative group/logo overflow-hidden" 
                                  title={vendor.logoUrl ? "Klik untuk mengganti logo" : "Klik untuk unggah logo PNG transparan"}
                                >
                                  <input
                                    type="file"
                                    accept="image/png,image/webp,image/jpeg"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      try {
                                        // SVG ditolak /api/client/upload (bisa memuat skrip dan dirender sharp lewat librsvg).
                                        const fileToUpload = await compressImageToWebP(file, {
                                          maxWidth: 600,
                                          maxHeight: 300,
                                          quality: 0.88,
                                        });
                                        const fd = new FormData();
                                        fd.append("file", fileToUpload);
                                        if (invitationId) fd.append("invitationId", invitationId);
                                        fd.append("slot", vendorSlot);

                                        const res = await fetch("/api/client/upload", {
                                          method: "POST",
                                          body: fd,
                                        });
                                        const data = await res.json();
                                        if (data.success && data.url) {
                                          const updated = list.map((v: any, i: number) => i === idx ? { ...v, logoUrl: data.url } : v);
                                          updateFeatureSetting("vendors", updated);
                                        } else {
                                          feedback.notify(data.error || "Gagal mengunggah logo", "error");
                                        }
                                      } catch (err: any) {
                                        feedback.notify(err?.message || "Gagal mengunggah logo", "error");
                                      }
                                    }}
                                  />
                                  {vendor.logoUrl ? (
                                    <img 
                                      src={vendor.logoUrl} 
                                      alt="Logo" 
                                      className="max-h-8 max-w-full object-contain" 
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center text-stone-400 group-hover/logo:text-amber-700">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      <span className="text-[8px] font-semibold tracking-tight mt-0.5">+ Logo</span>
                                    </div>
                                  )}
                                </label>
                                {vendor.logoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = list.map((v: any, i: number) => i === idx ? { ...v, logoUrl: "" } : v);
                                      updateFeatureSetting("vendors", updated);
                                    }}
                                    className="text-stone-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                    title="Hapus logo (gunakan hanya teks nama)"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                )}
                              </div>

                              {/* Input Nama Vendor */}
                              <div className="flex-1 min-w-[140px]">
                                <input
                                  type="text"
                                  value={vendor.name || ""}
                                  onChange={(e) => {
                                    const updated = list.map((v: any, i: number) => i === idx ? { ...v, name: e.target.value } : v);
                                    updateFeatureSetting("vendors", updated);
                                  }}
                                  placeholder="Nama Vendor (misal: Sore Hari Floral)"
                                  className="w-full px-3 py-2 text-xs bg-stone-50/60 focus:bg-white border border-stone-200 focus:border-amber-600 rounded-lg text-stone-800 focus:outline-none transition"
                                />
                              </div>

                              {/* Input Tautan / Instagram */}
                              <div className="flex-1 min-w-[140px]">
                                <input
                                  type="text"
                                  value={vendor.url || ""}
                                  onChange={(e) => {
                                    const updated = list.map((v: any, i: number) => i === idx ? { ...v, url: e.target.value } : v);
                                    updateFeatureSetting("vendors", updated);
                                  }}
                                  placeholder="@instagram atau https://..."
                                  className="w-full px-3 py-2 text-xs bg-stone-50/60 focus:bg-white border border-stone-200 focus:border-amber-600 rounded-lg text-stone-800 focus:outline-none transition"
                                />
                              </div>

                              {/* Tombol Hapus Vendor */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = list.filter((_: any, i: number) => i !== idx);
                                  updateFeatureSetting("vendors", updated);
                                }}
                                className="self-end sm:self-center p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                                title="Hapus vendor ini"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec16")}
                disabled={saving || !isDirty.sec16}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec16
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec16 ? "Tersimpan" : "Simpan Mitra Vendor"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec16")}
          </div>
        )}
      </section>
      )}
    </>
  );
}
