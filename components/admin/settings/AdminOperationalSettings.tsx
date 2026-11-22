"use client";

import { SettingsCard, FieldRow } from "@/components/admin/AdminSettingsUI";
import { EVENT_TYPES, parseEnabledEventTypes } from "@/lib/invitationUtils";
import { BUILDER_EVENT_LABELS } from "@/lib/themeBuilder/spec";
import type { AdminSettingsTabProps } from "@/components/admin/settings/types";

export function AdminOperationalSettings(props: AdminSettingsTabProps) {
  const {
    settingsMap,
    editSection,
    settingsSaved,
    currentOrigin,
    savingServiceStatus,
    setSavingServiceStatus,
    savingPlatform,
    setSavingPlatform,
    savingPlatformCustom,
    setSavingPlatformCustom,
    logoUrl,
    faviconUrl,
    pendingLogo,
    setPendingLogo,
    pendingFavicon,
    setPendingFavicon,
    previewLogo,
    setPreviewLogo,
    previewFavicon,
    setPreviewFavicon,
    uploadingLogo,
    uploadingFavicon,
    brandUploadMsg,
    setBrandUploadMsg,
    setSetting,
    toggleEditSection,
    cancelEdit,
    isSectionDirty,
    saveSettings,
    uploadBrandAsset,
  } = props;

  return (
    <>
  {/* ── Status Layanan & Pembatasan Registrasi (Service Availability / Close Order) ── */}
  <SettingsCard
    title="Status Layanan & Pembatasan Registrasi / Order"
    description="Kelola ketersediaan platform: Buka normal, Tutup order / kuota penuh, Pemeliharaan sistem, atau Segera hadir. Dilengkapi notifikasi dinamis untuk pengunjung."
    isEditing={Boolean(editSection["service_status"])}
    onEdit={() => toggleEditSection("service_status")}
    onCancel={() =>
      cancelEdit("service_status", [
        "service_status_mode",
        "service_status_title",
        "service_status_message",
        "service_status_reopen_date",
        "service_status_contact_wa",
      ])
    }
    onSave={() =>
      saveSettings(
        [
          "service_status_mode",
          "service_status_title",
          "service_status_message",
          "service_status_reopen_date",
          "service_status_contact_wa",
        ],
        setSavingServiceStatus,
        "service_status"
      )
    }
    saving={savingServiceStatus}
    isDirty={isSectionDirty([
      "service_status_mode",
      "service_status_title",
      "service_status_message",
      "service_status_reopen_date",
      "service_status_contact_wa",
    ])}
    saveSuccess={settingsSaved["service_status"]}
    saveSuccessMessage="Status ketersediaan layanan berhasil disimpan dan langsung aktif"
    viewContent={
      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-gray-500">Mode Saat Ini:</span>
            {(!settingsMap["service_status_mode"] || settingsMap["service_status_mode"] === "OPEN") && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Buka Normal (Layanan Penuh)
              </span>
            )}
            {settingsMap["service_status_mode"] === "CLOSED_ORDER" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                Tutup Order / Kuota Penuh
              </span>
            )}
            {settingsMap["service_status_mode"] === "MAINTENANCE" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Pemeliharaan Sistem
              </span>
            )}
            {settingsMap["service_status_mode"] === "COMING_SOON" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                Segera Hadir (Pre-Launch)
              </span>
            )}
          </div>

          <span className="text-[11px] text-gray-500">
            {(!settingsMap["service_status_mode"] || settingsMap["service_status_mode"] === "OPEN")
              ? "Pendaftaran akun baru & order terbuka"
              : "Klien terdaftar tetap dapat login & akses dashboard"}
          </span>
        </div>

        {/* Details when non-OPEN */}
        {settingsMap["service_status_mode"] && settingsMap["service_status_mode"] !== "OPEN" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-medium">Judul Pengumuman</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                {settingsMap["service_status_title"] || (
                  settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "Pemesanan Ditutup Sementara" :
                  settingsMap["service_status_mode"] === "MAINTENANCE" ? "Sistem Dalam Pemeliharaan" : "Segera Hadir"
                )}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-medium">Estimasi Dibuka Kembali</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                {settingsMap["service_status_reopen_date"] || "Tidak ditentukan"}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-medium">WhatsApp Waiting List</span>
              <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                {settingsMap["service_status_contact_wa"] ? `+${settingsMap["service_status_contact_wa"]}` : "Belum diatur"}
              </span>
            </div>
          </div>
        )}

        {settingsMap["service_status_mode"] && settingsMap["service_status_mode"] !== "OPEN" && (
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[11px] text-gray-500 block font-medium mb-1">Isi Pesan Pengumuman Klien</span>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
              {settingsMap["service_status_message"] || (
                settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "Mohon maaf, kuota pemesanan undangan baru saat ini telah penuh demi menjaga standar kualitas dan ketepatan pengerjaan. Klien terdaftar tetap dapat masuk dan mengelola undangan seperti biasa." :
                settingsMap["service_status_mode"] === "MAINTENANCE" ? "Kami sedang melakukan pemeliharaan berkala untuk meningkatkan stabilitas sistem. Pendaftaran akun baru ditangguhkan sementara." :
                "Platform undangan pernikahan digital mewah sedang mempersiapkan perilisan versi terbaru. Pantau terus pembaruan kami."
              )}
            </p>
          </div>
        )}
      </div>
    }
  >
    <div className="space-y-5">
      {/* Mode Selection Cards */}
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Pilih Mode Status Layanan</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: "OPEN",
              label: "Buka Normal",
              desc: "Pendaftaran akun baru dan order paket aktif tanpa batasan.",
              color: "emerald",
            },
            {
              id: "CLOSED_ORDER",
              label: "Tutup Order",
              desc: "Kuota penuh. Pendaftaran baru ditolak, klien lama tetap bisa login.",
              color: "amber",
            },
            {
              id: "MAINTENANCE",
              label: "Pemeliharaan",
              desc: "Perbaikan sistem. Pendaftaran & transaksi baru ditangguhkan.",
              color: "rose",
            },
            {
              id: "COMING_SOON",
              label: "Segera Hadir",
              desc: "Persiapan rilis versi baru. Registrasi publik belum dibuka.",
              color: "purple",
            },
          ].map((m) => {
            const isSelected = (settingsMap["service_status_mode"] || "OPEN") === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSetting("service_status_mode", m.id);
                  if (!settingsMap["service_status_title"]) {
                    if (m.id === "CLOSED_ORDER") setSetting("service_status_title", "Pemesanan Ditutup Sementara");
                    if (m.id === "MAINTENANCE") setSetting("service_status_title", "Sistem Dalam Pemeliharaan");
                    if (m.id === "COMING_SOON") setSetting("service_status_title", "Segera Hadir");
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between relative ${
                  isSelected
                    ? m.color === "emerald"
                      ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20"
                      : m.color === "amber"
                      ? "bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20"
                      : m.color === "rose"
                      ? "bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20"
                      : "bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20"
                    : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900">{m.label}</span>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                      isSelected
                        ? m.color === "emerald" ? "border-emerald-600 bg-emerald-600" :
                          m.color === "amber" ? "border-amber-600 bg-amber-600" :
                          m.color === "rose" ? "border-rose-600 bg-rose-600" : "border-purple-600 bg-purple-600"
                        : "border-gray-300 bg-white"
                    }`}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Configuration Details (Relevant when not OPEN or custom) */}
      {(settingsMap["service_status_mode"] && settingsMap["service_status_mode"] !== "OPEN") && (
        <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Formulir Pesan &amp; Notifikasi Pengunjung</h4>

          <FieldRow
            label="Judul Notifikasi"
            description="Teks judul yang ditampilkan di banner atas login, paket, dan landing page."
          >
            <input
              type="text"
              value={settingsMap["service_status_title"] ?? ""}
              placeholder={
                settingsMap["service_status_mode"] === "CLOSED_ORDER"
                  ? "Pemesanan Ditutup Sementara"
                  : settingsMap["service_status_mode"] === "MAINTENANCE"
                  ? "Sistem Dalam Pemeliharaan"
                  : "Segera Hadir"
              }
              onChange={(e) => setSetting("service_status_title", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
            />
          </FieldRow>

          <FieldRow
            label="Pesan Penjelasan untuk Klien"
            description="Jelaskan alasan penutupan, kuota pengerjaan, atau informasi pemeliharaan sistem."
          >
            <textarea
              rows={3}
              value={settingsMap["service_status_message"] ?? ""}
              placeholder={
                settingsMap["service_status_mode"] === "CLOSED_ORDER"
                  ? "Mohon maaf, kuota pemesanan undangan baru saat ini telah penuh demi menjaga standar kualitas dan ketepatan pengerjaan. Klien terdaftar tetap dapat masuk dan mengelola undangan seperti biasa."
                  : settingsMap["service_status_mode"] === "MAINTENANCE"
                  ? "Kami sedang melakukan pemeliharaan berkala untuk meningkatkan stabilitas sistem. Pendaftaran akun baru ditangguhkan sementara."
                  : "Platform undangan pernikahan digital mewah sedang mempersiapkan perilisan versi terbaru. Pantau terus pembaruan kami."
              }
              onChange={(e) => setSetting("service_status_message", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
            />
          </FieldRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow
              label="Estimasi Dibuka Kembali"
              description="Contoh: 15 Oktober 2026 atau Segera (kosongkan jika belum pasti)."
            >
              <input
                type="text"
                value={settingsMap["service_status_reopen_date"] ?? ""}
                placeholder="Contoh: 15 Oktober 2026"
                onChange={(e) => setSetting("service_status_reopen_date", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
              />
            </FieldRow>

            <FieldRow
              label="WhatsApp Bantuan / Waiting List"
              description="Format internasional tanpa tanda plus, contoh: 6281234567890."
            >
              <input
                type="text"
                value={settingsMap["service_status_contact_wa"] ?? ""}
                placeholder="Contoh: 6281234567890"
                onChange={(e) => setSetting("service_status_contact_wa", e.target.value.replace(/\D/g, ""))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
              />
            </FieldRow>
          </div>

          {/* Live Preview Box */}
          <div className="pt-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Simulasi Tampilan Banner di Halaman Login &amp; Paket:</span>
            <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              settingsMap["service_status_mode"] === "CLOSED_ORDER"
                ? "bg-amber-50 border-amber-300 text-amber-950"
                : settingsMap["service_status_mode"] === "MAINTENANCE"
                ? "bg-rose-50 border-rose-300 text-rose-950"
                : "bg-stone-50 border-stone-200 text-stone-900"
            }`}>
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "bg-amber-600" :
                  settingsMap["service_status_mode"] === "MAINTENANCE" ? "bg-rose-600" : "bg-stone-700"
                }`} />
                <span>
                  {settingsMap["service_status_title"] || (
                    settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "Pemesanan Ditutup Sementara" :
                    settingsMap["service_status_mode"] === "MAINTENANCE" ? "Sistem Dalam Pemeliharaan" : "Segera Hadir"
                  )}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed text-xs">
                {settingsMap["service_status_message"] || (
                  settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "Mohon maaf, kuota pemesanan undangan baru saat ini telah penuh demi menjaga standar kualitas dan ketepatan pengerjaan. Klien terdaftar tetap dapat masuk dan mengelola undangan seperti biasa." :
                  settingsMap["service_status_mode"] === "MAINTENANCE" ? "Kami sedang melakukan pemeliharaan berkala untuk meningkatkan stabilitas sistem. Pendaftaran akun baru ditangguhkan sementara." :
                  "Platform undangan pernikahan digital mewah sedang mempersiapkan perilisan versi terbaru. Pantau terus pembaruan kami."
                )}
              </p>
              {settingsMap["service_status_reopen_date"] && (
                <p className="text-[11px] font-semibold text-amber-900">
                  Estimasi dibuka kembali: <span className="underline">{settingsMap["service_status_reopen_date"]}</span>
                </p>
              )}
              <div className="pt-2 border-t border-black/5 text-[11px] text-gray-500 flex items-center justify-between">
                <span>Akun terdaftar tetap bisa login.</span>
                {settingsMap["service_status_contact_wa"] && (
                  <span className="font-bold text-amber-800">Tanya Kuota via WhatsApp</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </SettingsCard>

  {/* Jenis acara yang menerima undangan baru */}
  {(() => {
    const enabled = parseEnabledEventTypes(settingsMap["enabled_event_types"]);
    const toggle = (ev: string) => {
      const next = enabled.includes(ev) ? enabled.filter((e) => e !== ev) : [...enabled, ev];
      setSetting("enabled_event_types", EVENT_TYPES.filter((t) => next.includes(t)).join(","));
    };
    return (
      <SettingsCard
        title="Jenis Acara yang Menerima Undangan Baru"
        description="Klien baru hanya dapat memilih jenis acara yang dicentang dan memiliki minimal satu tema aktif. Undangan yang sudah dibuat tidak terpengaruh. Beranda, halaman paket, dan katalog demo hanya menampilkan jenis acara yang dicentang."
        isEditing={Boolean(editSection["event_types"])}
        onEdit={() => toggleEditSection("event_types")}
        onCancel={() => cancelEdit("event_types", ["enabled_event_types"])}
        onSave={() => saveSettings(["enabled_event_types"], setSavingPlatformCustom, "event_types")}
        saving={savingPlatformCustom}
        isDirty={isSectionDirty(["enabled_event_types"])}
        saveSuccess={settingsSaved["event_types"]}
        saveSuccessMessage="Jenis acara aktif berhasil disimpan"
        viewContent={
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((ev) => (
              <span key={ev} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${enabled.includes(ev) ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${enabled.includes(ev) ? "bg-emerald-500" : "bg-gray-300"}`} />
                {BUILDER_EVENT_LABELS[ev]}
              </span>
            ))}
          </div>
        }
      >
        <FieldRow label="Jenis Acara Aktif" description="Minimal satu jenis acara harus dicentang.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EVENT_TYPES.map((ev) => (
              <label key={ev} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 cursor-pointer hover:border-amber-400 transition">
                <input
                  type="checkbox"
                  checked={enabled.includes(ev)}
                  disabled={enabled.length === 1 && enabled.includes(ev)}
                  onChange={() => toggle(ev)}
                  className="w-4 h-4 accent-amber-600 cursor-pointer disabled:cursor-not-allowed"
                />
                {BUILDER_EVENT_LABELS[ev]}
              </label>
            ))}
          </div>
        </FieldRow>
      </SettingsCard>
    );
  })()}

  {/* WhatsApp Template Settings */}
  <SettingsCard
    title="Template Pesan WhatsApp (Pengiriman Undangan)"
    description="Kustomisasi pesan default yang akan dikirimkan ke tamu via WhatsApp. Gunakan placeholder {{GUEST_NAME}}, {{INVITATION_URL}}, {{COUPLE_NAMES}}."
    isEditing={Boolean(editSection["wa_template"])}
    onEdit={() => toggleEditSection("wa_template")}
    onCancel={() => cancelEdit("wa_template", ["wa_template_message"])}
    onSave={() => saveSettings(["wa_template_message"], setSavingPlatformCustom, "wa_template")}
    saving={savingPlatformCustom}
    isDirty={isSectionDirty(["wa_template_message"])}
    saveSuccess={settingsSaved["wa_template"]}
    saveSuccessMessage="Template WhatsApp berhasil disimpan"
    viewContent={
      settingsMap["wa_template_message"]?.trim() ? (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-wrap text-sm text-gray-700">
          {settingsMap["wa_template_message"]}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
          Belum diatur. Klien memakai template bawaan yang menyesuaikan jenis acara (pernikahan, khitanan, wisuda, dan lainnya).
        </div>
      )
    }
  >
    <FieldRow label="Isi Pesan WhatsApp" description="Jika diisi, pesan ini menjadi bawaan untuk semua klien dari semua jenis acara. Kosongkan agar klien memakai template yang menyesuaikan jenis acaranya.">
      <textarea
        rows={6}
        value={settingsMap["wa_template_message"] ?? ""}
        placeholder={"Kepada Yth. {{GUEST_NAME}},\n\nKami mengundang Anda ke acara kami:\n{{INVITATION_URL}}\n\nHormat kami,\n{{COUPLE_NAMES}}"}
        onChange={(e) => setSetting("wa_template_message", e.target.value)}
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
      />
    </FieldRow>
  </SettingsCard>

  {/* Landing Page Feature Cards Settings */}
  <SettingsCard
    title="Fitur Landing Page (3 Kartu)"
    description="Sesuaikan judul dan deskripsi untuk 3 kartu fitur utama di halaman depan (Landing Page)."
    isEditing={Boolean(editSection["landing_features"])}
    onEdit={() => toggleEditSection("landing_features")}
    onCancel={() => cancelEdit("landing_features", ["landing_feature_1_title", "landing_feature_1_desc", "landing_feature_2_title", "landing_feature_2_desc", "landing_feature_3_title", "landing_feature_3_desc"])}
    onSave={() => saveSettings(["landing_feature_1_title", "landing_feature_1_desc", "landing_feature_2_title", "landing_feature_2_desc", "landing_feature_3_title", "landing_feature_3_desc"], setSavingPlatformCustom, "landing_features")}
    saving={savingPlatformCustom}
    isDirty={isSectionDirty(["landing_feature_1_title", "landing_feature_1_desc", "landing_feature_2_title", "landing_feature_2_desc", "landing_feature_3_title", "landing_feature_3_desc"])}
    saveSuccess={settingsSaved["landing_features"]}
    saveSuccessMessage="Fitur Landing Page berhasil disimpan"
    viewContent={
      <div className="space-y-4">
        {[1, 2, 3].map((num) => (
          <div key={num} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-amber-600 font-bold block mb-1">Kartu Fitur {num}</span>
            <div className="font-bold text-gray-800 text-sm">{settingsMap[`landing_feature_${num}_title`] || (num === 1 ? "Desain Elegan & Responsif" : num === 2 ? "Manajemen Tamu & WhatsApp" : "Galeri Foto Dinamis")}</div>
            <div className="text-xs text-gray-500 mt-1">{settingsMap[`landing_feature_${num}_desc`] || (num === 1 ? "Desain visual modern yang memukau di perangkat apa pun." : num === 2 ? "Generator link pintar per tamu dengan automasi pesan." : "Layout Masonry cerdas untuk galeri foto pernikahan.")}</div>
          </div>
        ))}
      </div>
    }
  >
    <div className="space-y-4">
      {[1, 2, 3].map((num) => (
        <div key={num} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
          <h4 className="text-sm font-bold text-gray-700">Kartu {num}</h4>
          <FieldRow label="Judul">
            <input
              type="text"
              value={settingsMap[`landing_feature_${num}_title`] || ""}
              onChange={(e) => setSetting(`landing_feature_${num}_title`, e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs"
            />
          </FieldRow>
          <FieldRow label="Deskripsi">
            <textarea
              rows={2}
              value={settingsMap[`landing_feature_${num}_desc`] || ""}
              onChange={(e) => setSetting(`landing_feature_${num}_desc`, e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs"
            />
          </FieldRow>
        </div>
      ))}
    </div>
  </SettingsCard>





  {/* Branding — Logo & Favicon */}
  <div
    className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 p-6 ${
      editSection["branding"]
        ? "border-amber-400 ring-2 ring-amber-400/20"
        : "border-gray-200 hover:border-gray-300"
    }`}
  >
    <div className="flex items-start justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
      <div>
        <h3 className="font-bold text-gray-900 text-lg">Branding — Logo &amp; Favicon</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Identitas visual platform yang otomatis terpasang dan tersinkronisasi di seluruh halaman.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          toggleEditSection("branding");
          setPendingLogo(null);
          setPendingFavicon(null);
          setPreviewLogo(null);
          setPreviewFavicon(null);
          setBrandUploadMsg(null);
        }}
        className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
      >
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>{editSection["branding"] ? "Tutup Form" : "Ubah File"}</span>
      </button>
    </div>

    {/* Upload Message */}
    {brandUploadMsg && (
      <div className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
        brandUploadMsg.ok
          ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
          : "bg-rose-50 border border-rose-300 text-rose-900"
      }`}>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {brandUploadMsg.ok
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          }
        </svg>
        <span>[{brandUploadMsg.type.toUpperCase()}] {brandUploadMsg.msg}</span>
      </div>
    )}

    {/* ── Minimized Summary View (Saat tidak mode edit) ── */}
    {!editSection["branding"] ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Summary Logo */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="font-bold font-serif text-amber-800 text-sm">L</span>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-gray-800 block">Logo Platform</span>
              <span className="text-[11px] text-gray-500 truncate block max-w-[180px]">
                {logoUrl ? "logo.webp (Optimal)" : "Menggunakan Monogram"}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            logoUrl ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
          }`}>
            {logoUrl ? "● Terpasang" : "Default"}
          </span>
        </div>

        {/* Summary Favicon */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {faviconUrl ? (
                <img src={faviconUrl} alt="Favicon" className="w-6 h-6 object-contain" />
              ) : (
                <span className="font-bold text-gray-400 text-xs">ICO</span>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-gray-800 block">Favicon Tab</span>
              <span className="text-[11px] text-gray-500 truncate block max-w-[180px]">
                {faviconUrl ? "favicon.png (64×64)" : "favicon.ico"}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            faviconUrl ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
          }`}>
            {faviconUrl ? "● Terpasang" : "Default"}
          </span>
        </div>
      </div>
    ) : (
      /* ── Expanded Form Edit Mode ── */
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* ── Logo Upload ── */}
        <div className="space-y-3 p-4 bg-gray-50/70 rounded-xl border border-gray-200">
          <div>
            <p className="text-sm font-bold text-gray-800">Upload Logo Baru</p>
            <p className="text-xs text-gray-400 mt-0.5">Format: WebP, maks. 800px. Menimpa logo sebelumnya.</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {(previewLogo || logoUrl) ? (
                <img src={previewLogo ?? logoUrl!} alt="Logo preview" className="w-full h-full object-contain" />
              ) : (
                <span className="font-bold font-serif text-gray-400 text-sm">L</span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-gray-500 truncate">
                {pendingLogo
                  ? <span className="text-amber-800 font-bold">Terpilih: {pendingLogo.name}</span>
                  : logoUrl ? "/brand/logo.webp" : "Belum ada logo"
                }
              </p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition bg-gray-100 hover:bg-gray-200 text-gray-700">
                Pilih File Logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPendingLogo(f);
                    setPreviewLogo(URL.createObjectURL(f));
                    setBrandUploadMsg(null);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {pendingLogo && (
              <button
                type="button"
                onClick={() => { setPendingLogo(null); setPreviewLogo(null); }}
                disabled={uploadingLogo}
                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold transition"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={() => uploadBrandAsset("logo")}
              disabled={!pendingLogo || uploadingLogo}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
            >
              {uploadingLogo ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
              ) : "Simpan Logo"}
            </button>
          </div>
        </div>

        {/* ── Favicon Upload ── */}
        <div className="space-y-3 p-4 bg-gray-50/70 rounded-xl border border-gray-200">
          <div>
            <p className="text-sm font-bold text-gray-800">Upload Favicon Baru</p>
            <p className="text-xs text-gray-400 mt-0.5">Format: PNG/SVG persegi (disarankan min. 192×192px). Sistem otomatis men-generate seluruh ukuran standar Google Search & PWA (48px, 96px, 192px, 512px).</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {(previewFavicon || faviconUrl) ? (
                <img src={previewFavicon ?? faviconUrl!} alt="Favicon preview" className="w-8 h-8 object-contain" />
              ) : (
                <span className="font-bold text-gray-400 text-xs">ICO</span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-gray-500 truncate">
                {pendingFavicon
                  ? <span className="text-amber-800 font-bold">Terpilih: {pendingFavicon.name}</span>
                  : faviconUrl ? "/brand/favicon.png" : "Belum ada favicon"
                }
              </p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition bg-gray-100 hover:bg-gray-200 text-gray-700">
                Pilih File Favicon
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPendingFavicon(f);
                    setPreviewFavicon(URL.createObjectURL(f));
                    setBrandUploadMsg(null);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {pendingFavicon && (
              <button
                type="button"
                onClick={() => { setPendingFavicon(null); setPreviewFavicon(null); }}
                disabled={uploadingFavicon}
                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold transition"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={() => uploadBrandAsset("favicon")}
              disabled={!pendingFavicon || uploadingFavicon}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
            >
              {uploadingFavicon ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
              ) : "Simpan Favicon"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Platform Settings */}
  <SettingsCard
    title="Konfigurasi Platform & Tampilan"
    description="Nama platform, kontak resmi, dan teks headline hero yang digunakan di seluruh sistem."
    isEditing={Boolean(editSection["platform"])}
    onEdit={() => toggleEditSection("platform")}
    onCancel={() => cancelEdit("platform", ["platform_name", "support_email", "support_whatsapp", "hero_tagline", "hero_subtitle"])}
    onSave={() => saveSettings(["platform_name", "support_email", "support_whatsapp", "hero_tagline", "hero_subtitle"], setSavingPlatform, "platform")}
    saving={savingPlatform}
    isDirty={isSectionDirty(["platform_name", "support_email", "support_whatsapp", "hero_tagline", "hero_subtitle"])}
    saveSuccess={settingsSaved["platform"]}
    saveSuccessMessage="Konfigurasi platform & tampilan berhasil disimpan"
    viewContent={
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Nama Platform</span>
            <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">{settingsMap["platform_name"] || "Sistem Undangan"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Domain Host</span>
            <span className="text-xs font-mono font-bold text-emerald-700 mt-0.5 inline-block">{currentOrigin}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Email Support</span>
            <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">{settingsMap["support_email"] || "Belum diatur"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">WhatsApp Admin / CS</span>
            <span className="text-sm font-bold text-emerald-700 mt-0.5 inline-block">{settingsMap["support_whatsapp"] ? `+${settingsMap["support_whatsapp"]}` : "Belum diatur"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Tagline Hero (Halaman Utama)</span>
            <span className="text-xs font-semibold text-gray-800 mt-0.5 inline-block">{settingsMap["hero_tagline"] || "Undangan Digital Elegan, Hangat & Berkelas"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Deskripsi Subtitle Hero</span>
            <span className="text-xs text-gray-600 mt-0.5 line-clamp-2">{settingsMap["hero_subtitle"] || "Didesain khusus dengan sentuhan estetika mewah dan eksklusif..."}</span>
          </div>
        </div>
      </div>
    }
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FieldRow label="Nama Platform">
        <input
          type="text"
          value={settingsMap["platform_name"] !== undefined ? settingsMap["platform_name"] : "Sistem Undangan"}
          onChange={(e) => setSetting("platform_name", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        />
      </FieldRow>

      <FieldRow label="Domain Host Platform" description="Domain terdeteksi otomatis dari host server aktif.">
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-mono flex items-center justify-between">
          <span>{currentOrigin}</span>
          <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded font-sans font-bold">● Auto</span>
        </div>
      </FieldRow>

      <FieldRow label="Email Support">
        <input
          type="email"
          value={settingsMap["support_email"] || ""}
          onChange={(e) => setSetting("support_email", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        />
      </FieldRow>

      <FieldRow label="Nomor WhatsApp Admin / CS" description="Gunakan kode negara tanpa +, contoh: 6281234567890">
        <input
          type="text"
          value={settingsMap["support_whatsapp"] || ""}
          onChange={(e) => {
            let val = e.target.value.replace(/[^0-9]/g, "");
            if (val.startsWith("0")) val = "62" + val.slice(1);
            setSetting("support_whatsapp", val);
          }}
          placeholder="Contoh: 6281234567890"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        />
      </FieldRow>

      </div>

    <FieldRow label="Tagline Hero (Headline Besar Halaman Utama)">
      <input
        type="text"
        value={settingsMap["hero_tagline"] || "Undangan Digital Elegan, Hangat & Berkelas"}
        onChange={(e) => setSetting("hero_tagline", e.target.value)}
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
      />
    </FieldRow>

    <FieldRow label="Deskripsi / Subtitle Hero Halaman Utama">
      <textarea
        rows={3}
        value={settingsMap["hero_subtitle"] || "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, dan buku tamu real-time."}
        onChange={(e) => setSetting("hero_subtitle", e.target.value)}
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none shadow-2xs"
      />
    </FieldRow>
  </SettingsCard>
    </>
  );
}
