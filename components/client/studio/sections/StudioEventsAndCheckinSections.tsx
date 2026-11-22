"use client";

import Link from "next/link";
import { Input, SectionHeaderToggle, SectionHeaderActions } from "@/components/client/studio/StudioFormControls";
import { EVENT_PRESETS_BY_TYPE, formatIndonesianDatePreview } from "@/components/client/studio/studioPresets";
import { useStudioEditor } from "@/components/client/studio/StudioEditorContext";

export function StudioEventsAndCheckinSections() {
  const {
    activeSectionTab,
    addEvent,
    collapsed,
    events,
    handleTimeFieldChange,
    hasCap,
    invitation,
    invitationId,
    isDirty,
    isWeddingEvent,
    removeEvent,
    renderSectionNavFooter,
    saveSection,
    saving,
    savingSec,
    sectionHeading,
    setAsPrimaryEvent,
    showQrCheckin,
    toggleSection,
    updateEventItem,
    updateFeatureSetting,
  } = useStudioEditor();

  return (
    <>
      {/* 5. SEKSI RANGKAIAN ACARA (SEC5) */}
      {(activeSectionTab === "sec5") && (
      <section id="section-sec5" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec5")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec5
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec5")}</h2>
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
              <p className="text-xs text-stone-500 mt-0.5">
                {(!invitation?.eventType || invitation?.eventType === "WEDDING")
                  ? "Atur seluruh agenda adat dan resepsi (Akad, Resepsi, Mappacci, dll.)"
                  : "Atur seluruh rangkaian sesi agenda acara Anda"}
              </p>
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
          <div className="p-3.5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-stone-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-stone-500 mr-1">Quick Add:</span>
                {(EVENT_PRESETS_BY_TYPE[invitation?.eventType || "WEDDING"] || EVENT_PRESETS_BY_TYPE.WEDDING).slice(0, 4).map((p) => (
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
                    Anda tetap leluasa menyesuaikan jam dan menambah sesi acara kapan saja. Tanggal Jadwal Terima Tamu dikunci sejak undangan terbit karena menjadi patokan masa aktif.
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
                          Jadwal Terima Tamu
                        </span>
                      ) : !(invitation?.status === "PUBLISHED" || invitation?.status === "EVENT_FINISHED") ? (
                        <button
                          type="button"
                          onClick={() => setAsPrimaryEvent(idx)}
                          className="text-xs sm:text-[10px] font-semibold text-stone-500 hover:text-amber-900 px-3 sm:px-2 py-2 sm:py-0.5 rounded-md hover:bg-amber-100/60 border border-stone-200/80 transition cursor-pointer"
                        >
                          Jadikan Jadwal Terima Tamu
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
                  {ev.isPrimary && (
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Tanggal &amp; jam sesi ini adalah <strong>waktu tamu datang</strong>. Masa aktif undangan, hitung mundur, dan kunci buku tamu hari H mengikuti sesi ini.
                    </p>
                  )}
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

                    <Input label="Nama Lokasi / Gedung" value={ev.location || ""} onChange={(v) => updateEventItem(idx, "location", v)} placeholder={isWeddingEvent ? "Contoh: Gedung Pertemuan / Rumah Mempelai" : "Contoh: Gedung Pertemuan / Kediaman Keluarga"} />
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
      <section id="section-sec6" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec6")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec6
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec6")}</h2>
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
          <div className="p-3.5 sm:p-7 space-y-4">
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
    </>
  );
}
