"use client";

import { getPlanDisplayName } from "@/lib/planUtils";
import {
  PERSONAL_SUB_EVENT_PRESETS,
  EVENT_SUB_EVENT_PRESETS,
  sanitizeSubEvent,
} from "@/lib/invitationUtils";
import { useStudioEditor } from "@/components/client/studio/StudioEditorContext";

export function StudioModals() {
  const {
    PLAN_HIERARCHY,
    changingEventType,
    eventTypeError,
    eventTypeModalOpen,
    freeSubCustomMode,
    handleChangeInvitationMode,
    handleUpgrade,
    invitation,
    packageOf,
    planType,
    platformSettings,
    selectedEventType,
    selectedFreeSubEvent,
    setEventTypeModalOpen,
    setFreeSubCustomMode,
    setSelectedEventType,
    setSelectedFreeSubEvent,
    setUpgradeModal,
    setUpgradeTarget,
    upgradeDiff,
    upgradeError,
    upgradeModal,
    upgradeTarget,
    upgrading,
  } = useStudioEditor();

  return (
    <>
      {/* ── GANTI JENIS / MODE ACARA MODAL (UNTUK SEMUA DRAF SEBELUM TERBIT) ────────── */}
      {eventTypeModalOpen && invitation?.status === "DRAFT" && (
        <div
          className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !changingEventType) setEventTypeModalOpen(false); }}
        >
          <div className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-stone-900">
            <div className="shrink-0 px-6 py-4 bg-stone-900 text-white flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block">
                  {invitation?.isFreeDraft ? "Mode Draf Gratis" : "Pengaturan Mode Undangan"}
                </span>
                <h2 className="text-base sm:text-lg font-serif font-bold text-stone-100 mt-0.5">Ganti Mode / Kategori Acara</h2>
              </div>
              <button
                type="button"
                disabled={changingEventType}
                onClick={() => setEventTypeModalOpen(false)}
                aria-label="Tutup"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-stone-600 leading-relaxed">
                Berpindah kategori akan menyesuaikan tema dan struktur form peserta. Berpindah sub-acara di dalam kategori yang sama tetap mempertahankan tema dan data Anda. Foto yang sudah diunggah tetap tersimpan.
              </p>
              {(() => {
                const enabledEvs: string[] = platformSettings?.enabledEventTypes || ["WEDDING", "PERSONAL", "EVENT"];
                const allowWedding = enabledEvs.includes("WEDDING");
                const allowPersonal = enabledEvs.includes("PERSONAL");
                const allowEvent = enabledEvs.includes("EVENT");
                const curCat = (invitation.eventType || "WEDDING").toUpperCase();
                return (
                  <div className="space-y-2.5">
                    {allowWedding && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventType("WEDDING");
                          setSelectedFreeSubEvent("");
                          setFreeSubCustomMode(false);
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                          selectedEventType === "WEDDING"
                            ? "border-2 border-amber-800 bg-amber-50/70"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-stone-900">Pernikahan</span>
                          <div className="flex items-center gap-1.5">
                            {curCat === "WEDDING" && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">Aktif</span>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200">2 Profil</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-stone-500 block mt-1">Akad, pemberkatan, &amp; resepsi pernikahan</span>
                      </button>
                    )}

                    {allowPersonal && (
                      <div
                        onClick={() => {
                          if (selectedEventType !== "PERSONAL") {
                            setSelectedEventType("PERSONAL");
                            setSelectedFreeSubEvent(
                              curCat === "PERSONAL" && invitation?.subEvent
                                ? invitation.subEvent
                                : PERSONAL_SUB_EVENT_PRESETS[0].id,
                            );
                            setFreeSubCustomMode(false);
                          }
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                          selectedEventType === "PERSONAL"
                            ? "border-2 border-amber-800 bg-amber-50/70"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-stone-900">Personal &amp; Keluarga</span>
                          <div className="flex items-center gap-1.5">
                            {curCat === "PERSONAL" && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">Aktif</span>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">1 Profil</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-stone-500 block mt-1">
                          Ulang Tahun, Khitanan, Aqiqah, Wisuda, Tamatan Ngaji, &amp; acara personal lainnya
                        </span>
                        {selectedEventType === "PERSONAL" && (
                          <div className="mt-2.5 pt-2.5 border-t border-amber-200/70 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-1.5">
                              {PERSONAL_SUB_EVENT_PRESETS.map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setFreeSubCustomMode(false);
                                    setSelectedFreeSubEvent(preset.id);
                                  }}
                                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                                    !freeSubCustomMode && selectedFreeSubEvent.toLowerCase() === preset.id.toLowerCase()
                                      ? "bg-amber-900 text-white"
                                      : "bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setFreeSubCustomMode(true);
                                  if (PERSONAL_SUB_EVENT_PRESETS.some((p) => p.id.toLowerCase() === selectedFreeSubEvent.toLowerCase())) {
                                    setSelectedFreeSubEvent("");
                                  }
                                }}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                                  freeSubCustomMode
                                    ? "bg-amber-900 text-white"
                                    : "bg-white text-amber-900 border border-dashed border-amber-400 hover:bg-amber-50"
                                }`}
                              >
                                + Tulis Sendiri
                              </button>
                            </div>
                            {freeSubCustomMode && (
                              <input
                                type="text"
                                value={selectedFreeSubEvent}
                                onChange={(e) => setSelectedFreeSubEvent(e.target.value)}
                                maxLength={50}
                                placeholder="Contoh: Tamatan Ngaji, Tedak Siten..."
                                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {allowEvent && (
                      <div
                        onClick={() => {
                          if (selectedEventType !== "EVENT") {
                            setSelectedEventType("EVENT");
                            setSelectedFreeSubEvent(
                              curCat === "EVENT" && invitation?.subEvent
                                ? invitation.subEvent
                                : EVENT_SUB_EVENT_PRESETS[0].id,
                            );
                            setFreeSubCustomMode(false);
                          }
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                          selectedEventType === "EVENT"
                            ? "border-2 border-amber-800 bg-amber-50/70"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-stone-900">Acara &amp; Event Umum</span>
                          <div className="flex items-center gap-1.5">
                            {curCat === "EVENT" && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">Aktif</span>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">Non-Personal</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-stone-500 block mt-1">
                          Corporate, Grand Opening, seminar, workshop, gathering, reuni, &amp; syukuran
                        </span>
                        {selectedEventType === "EVENT" && (
                          <div className="mt-2.5 pt-2.5 border-t border-amber-200/70 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-1.5">
                              {EVENT_SUB_EVENT_PRESETS.map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setFreeSubCustomMode(false);
                                    setSelectedFreeSubEvent(preset.id);
                                  }}
                                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                                    !freeSubCustomMode && selectedFreeSubEvent.toLowerCase() === preset.id.toLowerCase()
                                      ? "bg-amber-900 text-white"
                                      : "bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setFreeSubCustomMode(true);
                                  if (EVENT_SUB_EVENT_PRESETS.some((p) => p.id.toLowerCase() === selectedFreeSubEvent.toLowerCase())) {
                                    setSelectedFreeSubEvent("");
                                  }
                                }}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                                  freeSubCustomMode
                                    ? "bg-amber-900 text-white"
                                    : "bg-white text-amber-900 border border-dashed border-amber-400 hover:bg-amber-50"
                                }`}
                              >
                                + Tulis Sendiri
                              </button>
                            </div>
                            {freeSubCustomMode && (
                              <input
                                type="text"
                                value={selectedFreeSubEvent}
                                onChange={(e) => setSelectedFreeSubEvent(e.target.value)}
                                maxLength={50}
                                placeholder="Contoh: Rapat Kerja Nasional, Malam Keakraban..."
                                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              {eventTypeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {eventTypeError}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  disabled={changingEventType}
                  onClick={() => setEventTypeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    changingEventType ||
                    !selectedEventType ||
                    (selectedEventType === invitation.eventType &&
                      ((selectedEventType === "WEDDING" ? "" : sanitizeSubEvent(selectedFreeSubEvent) || "") ===
                        (invitation.subEvent || "")))
                  }
                  onClick={handleChangeInvitationMode}
                  className="px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {changingEventType ? "Mengubah..." : "Terapkan Jenis Acara"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPGRADE PAKET MODAL ────────────────────────────────────── */}
      {upgradeModal && !invitation?.isFreeDraft && (
        <div
          className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setUpgradeModal(false); }}
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 p-6 text-white border-b border-stone-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold tracking-widest uppercase text-amber-400">Upgrade Paket</span>
                <button onClick={() => setUpgradeModal(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <h2 className="text-xl font-serif font-bold text-stone-100">Tingkatkan Fitur & Kapasitas Paket</h2>
              <p className="text-stone-300 text-xs mt-1">Paket saat ini: <strong className="text-amber-300 font-semibold">{getPlanDisplayName(planType, platformSettings?.packages)}</strong></p>
            </div>

            {/* Tier Options */}
            <div className="p-5 space-y-3">
              {(["TIER_2", "TIER_3"] as const)
                .filter((t) => (PLAN_HIERARCHY[t] || 0) > (PLAN_HIERARCHY[planType] || 1))
                .map((tier) => {
                  const diff = upgradeDiff(tier, planType);
                  const isSelected = upgradeTarget === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setUpgradeTarget(tier)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition cursor-pointer ${
                        isSelected
                          ? "border-amber-700/80 bg-amber-50/50 shadow-xs ring-1 ring-amber-700/20"
                          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${
                            isSelected ? "border-amber-800 bg-amber-800" : "border-stone-300"
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                          </div>
                          <span className="font-bold text-sm text-stone-900">{getPlanDisplayName(tier, platformSettings?.packages)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-stone-500 block">Tambah bayar</span>
                          <p className="font-bold text-amber-900 text-sm">{diff > 0 ? `Rp ${diff.toLocaleString("id-ID")}` : "Memuat harga..."}</p>
                        </div>
                      </div>
                      <ul className="space-y-1 pl-6">
                        {((packageOf(tier)?.features as string[] | undefined)?.length ? packageOf(tier).features : [packageOf(tier)?.desc].filter(Boolean)).map((f: string, i: number) => (
                          <li key={i} className="text-xs text-stone-600 flex items-start gap-1.5">
                            <svg className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}

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
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-800 hover:bg-amber-900 text-white shadow-xs cursor-pointer"
                >
                  {upgrading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Memproses...</span></>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                      <span>
                        Upgrade Sekarang{upgradeTarget ? ` ke ${getPlanDisplayName(upgradeTarget, platformSettings?.packages)}` : ""}
                        {(() => {
                          if (!upgradeTarget) return "";
                          const diff = upgradeDiff(upgradeTarget, planType);
                          return diff > 0 ? ` (Rp ${diff.toLocaleString("id-ID")})` : "";
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
    </>
  );
}
