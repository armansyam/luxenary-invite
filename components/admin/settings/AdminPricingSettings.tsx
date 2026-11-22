"use client";

import { SettingsCard, FieldRow } from "@/components/admin/AdminSettingsUI";
import {
  AVAILABLE_CAPABILITIES,
  PRICING_SUBTITLE_DEFAULT,
  type AdminSettingsTabProps,
} from "@/components/admin/settings/types";

export function AdminPricingSettings(props: AdminSettingsTabProps) {
  const {
    settingsMap,
    editSection,
    settingsSaved,
    savingPricing,
    setSavingPricing,
    savingAddons,
    setSavingAddons,
    setSetting,
    getCaps,
    toggleCap,
    toggleEditSection,
    cancelEdit,
    isSectionDirty,
    saveSettings,
  } = props;

  return (
    <>
  {/* Pricing Settings */}
  {(() => {
    const PRICING_KEYS = [
      "pricing_subtitle",
      "name_tier1", "name_tier2", "name_tier3",
      "price_tier1", "price_tier2", "price_tier3",
      "desc_tier1", "desc_tier2", "desc_tier3",
      "features_tier1", "features_tier2", "features_tier3",
      "capabilities_tier1", "capabilities_tier2", "capabilities_tier3",
      "memories_total_quota_tier1", "memories_max_contributors_tier1", "memories_shots_quota_tier1",
      "memories_total_quota_tier2", "memories_max_contributors_tier2", "memories_shots_quota_tier2",
      "memories_total_quota_tier3", "memories_max_contributors_tier3", "memories_shots_quota_tier3",
    ];
    return (
      <SettingsCard
        title="Manajemen Harga & Paket"
        description="Atur nama paket komersial, harga, deskripsi, kapabilitas, dan plafon kuota kamera tamu untuk masing-masing tingkatan (Tier 1, Tier 2, Tier 3)."
        isEditing={Boolean(editSection["pricing"])}
        onEdit={() => toggleEditSection("pricing")}
        onCancel={() => cancelEdit("pricing", PRICING_KEYS)}
        onSave={() => saveSettings(PRICING_KEYS, setSavingPricing, "pricing")}
        saving={savingPricing}
        isDirty={isSectionDirty(PRICING_KEYS)}
        saveSuccess={settingsSaved["pricing"]}
        saveSuccessMessage="Harga, kapabilitas, dan kuota paket berhasil diperbarui"
        viewContent={
          <div className="space-y-3.5">
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Subjudul Section Harga (Homepage)</span>
              <p className="text-xs text-gray-700 leading-relaxed">{settingsMap["pricing_subtitle"] || PRICING_SUBTITLE_DEFAULT}</p>
              <p className="text-[10px] text-gray-400 mt-1">{"{{archiveRetention}}"} dan {"{{galleryRetention}}"} otomatis diganti masa simpan arsip dan galeri dari tab Operasional.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Tier 1 • {settingsMap["name_tier1"] || "Serenade"}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  Rp {Number(settingsMap["price_tier1"] || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_tier1"] || "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online"}</p>
              <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg border text-stone-700 bg-white border-stone-200">
                {getCaps("capabilities_tier1").includes("guest_memories")
                  ? `Kamera: ${settingsMap["memories_total_quota_tier1"] || 0} Foto Acara`
                  : "Kamera Tamu: Nonaktif"}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Tier 2 • {settingsMap["name_tier2"] || "Symphony"}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  Rp {Number(settingsMap["price_tier2"] || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_tier2"] || "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu"}</p>
              <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg border text-slate-700 bg-white border-slate-200">
                {getCaps("capabilities_tier2").includes("guest_memories")
                  ? `Kamera: ${settingsMap["memories_total_quota_tier2"] || 200} Foto Acara`
                  : "Kamera Tamu: Nonaktif"}
              </div>
            </div>
            <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                  <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                    Tier 3 • {settingsMap["name_tier3"] || "Eternity"}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  Rp {Number(settingsMap["price_tier3"] || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_tier3"] || "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi (.com/.id) & Kuota Maksimal"}</p>
              <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg border text-purple-700 bg-white border-purple-200">
                {getCaps("capabilities_tier3").includes("guest_memories")
                  ? `Kamera: ${settingsMap["memories_total_quota_tier3"] || 500} Foto Acara`
                  : "Kamera Tamu: Nonaktif"}
              </div>
            </div>
          </div>
          </div>
        }
      >
    <div className="space-y-4">
      <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
        <FieldRow label="Subjudul Section Harga (Homepage)" description="Kalimat di bawah judul 'Pilih Paket yang Sesuai dengan Cerita Anda' di beranda. Tulis {{archiveRetention}} dan {{galleryRetention}} agar masa simpan selalu mengikuti pengaturan.">
          <input
            type="text"
            value={settingsMap["pricing_subtitle"] ?? PRICING_SUBTITLE_DEFAULT}
            onChange={(e) => setSetting("pricing_subtitle", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </FieldRow>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {/* Tier 1 */}
      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-sm font-bold text-gray-800">Tier 1 • {settingsMap["name_tier1"] || "Serenade"}</span>
        </div>
        <FieldRow label="Nama Paket">
          <input
            type="text"
            value={settingsMap["name_tier1"] || "Serenade"}
            onChange={(e) => setSetting("name_tier1", e.target.value)}
            placeholder="Contoh: Serenade"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </FieldRow>
        <FieldRow label="Harga (IDR)">
          <input
            type="number"
            value={settingsMap["price_tier1"] ?? ""}
            onChange={(e) => setSetting("price_tier1", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </FieldRow>
        <FieldRow label="Deskripsi">
          <textarea
            rows={3}
            value={settingsMap["desc_tier1"] || "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online"}
            onChange={(e) => setSetting("desc_tier1", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
          />
        </FieldRow>
        <FieldRow label="Daftar Fitur (Satu per baris)">
          <textarea
            rows={4}
            value={settingsMap["features_tier1"] || ""}
            onChange={(e) => setSetting("features_tier1", e.target.value)}
            placeholder="Pisahkan dengan baris baru (Enter)"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
          />
        </FieldRow>
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-700 mb-2">Fitur / Kapabilitas Paket</label>
          <div className="space-y-1.5 bg-white p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
            {AVAILABLE_CAPABILITIES.map(cap => (
              <label key={cap.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-600 w-3.5 h-3.5 cursor-pointer"
                  checked={getCaps("capabilities_tier1").includes(cap.id)}
                  onChange={() => toggleCap("capabilities_tier1", cap.id)}
                />
                <span>{cap.label}</span>
              </label>
            ))}
          </div>
        </div>
        {getCaps("capabilities_tier1").includes("guest_memories") && (
          <div className="mt-2.5 p-3 bg-amber-500/10 rounded-xl border border-amber-300/60 space-y-2">
            <span className="block text-[11px] font-bold text-amber-900 uppercase tracking-wide">Total Kuota Foto Acara</span>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Batas Maksimal Foto Tamu (Plafon Cloud)</label>
              <input
                type="number"
                min={0}
                max={2000}
                step={25}
                value={settingsMap["memories_total_quota_tier1"] || "0"}
                onChange={(e) => setSetting("memories_total_quota_tier1", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-[10px] text-amber-800 leading-tight">
              Pengantin bebas mengatur jatah roll per tamu di studionya selama total foto tidak melampaui kuota ini.
            </p>
          </div>
        )}
      </div>

      {/* Tier 2 */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600"></span>
          <span className="text-sm font-bold text-gray-800">Tier 2 • {settingsMap["name_tier2"] || "Symphony"}</span>
        </div>
        <FieldRow label="Nama Paket">
          <input
            type="text"
            value={settingsMap["name_tier2"] || "Symphony"}
            onChange={(e) => setSetting("name_tier2", e.target.value)}
            placeholder="Contoh: Symphony"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition"
          />
        </FieldRow>
        <FieldRow label="Harga (IDR)">
          <input
            type="number"
            value={settingsMap["price_tier2"] ?? ""}
            onChange={(e) => setSetting("price_tier2", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition"
          />
        </FieldRow>
        <FieldRow label="Deskripsi">
          <textarea
            rows={3}
            value={settingsMap["desc_tier2"] || "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu"}
            onChange={(e) => setSetting("desc_tier2", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition resize-none"
          />
        </FieldRow>
        <FieldRow label="Daftar Fitur (Satu per baris)">
          <textarea
            rows={4}
            value={settingsMap["features_tier2"] || ""}
            onChange={(e) => setSetting("features_tier2", e.target.value)}
            placeholder="Pisahkan dengan baris baru (Enter)"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition resize-none"
          />
        </FieldRow>
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-700 mb-2">Fitur / Kapabilitas Paket</label>
          <div className="space-y-1.5 bg-white p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
            {AVAILABLE_CAPABILITIES.map(cap => (
              <label key={cap.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-slate-600 focus:ring-slate-600 w-3.5 h-3.5 cursor-pointer"
                  checked={getCaps("capabilities_tier2").includes(cap.id)}
                  onChange={() => toggleCap("capabilities_tier2", cap.id)}
                />
                <span>{cap.label}</span>
              </label>
            ))}
          </div>
        </div>
        {getCaps("capabilities_tier2").includes("guest_memories") && (
          <div className="mt-2.5 p-3 bg-slate-100 rounded-xl border border-slate-300/80 space-y-2">
            <span className="block text-[11px] font-bold text-slate-800 uppercase tracking-wide">Total Kuota Foto Acara</span>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Batas Maksimal Foto Tamu (Plafon Cloud)</label>
              <input
                type="number"
                min={50}
                max={5000}
                step={50}
                value={settingsMap["memories_total_quota_tier2"] || "200"}
                onChange={(e) => setSetting("memories_total_quota_tier2", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-slate-500"
              />
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">
              Pengantin bebas mengatur jatah roll per tamu di studionya selama total foto tidak melampaui kuota ini.
            </p>
          </div>
        )}
      </div>

      {/* Tier 3 */}
      <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
          <span className="text-sm font-bold text-gray-800">Tier 3 • {settingsMap["name_tier3"] || "Eternity"}</span>
        </div>
        <FieldRow label="Nama Paket">
          <input
            type="text"
            value={settingsMap["name_tier3"] || "Eternity"}
            onChange={(e) => setSetting("name_tier3", e.target.value)}
            placeholder="Contoh: Eternity"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
          />
        </FieldRow>
        <FieldRow label="Harga (IDR)">
          <input
            type="number"
            value={settingsMap["price_tier3"] ?? ""}
            onChange={(e) => setSetting("price_tier3", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
          />
        </FieldRow>
        <FieldRow label="Deskripsi">
          <textarea
            rows={3}
            value={settingsMap["desc_tier3"] || "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi (.com/.id) & Kuota Maksimal"}
            onChange={(e) => setSetting("desc_tier3", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
          />
        </FieldRow>
        <FieldRow label="Daftar Fitur (Satu per baris)">
          <textarea
            rows={4}
            value={settingsMap["features_tier3"] || ""}
            onChange={(e) => setSetting("features_tier3", e.target.value)}
            placeholder="Pisahkan dengan baris baru (Enter)"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
          />
        </FieldRow>
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-700 mb-2">Fitur / Kapabilitas Paket</label>
          <div className="space-y-1.5 bg-white p-3 border border-purple-200 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
            {AVAILABLE_CAPABILITIES.map(cap => (
              <label key={cap.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-purple-50 p-1 rounded">
                <input
                  type="checkbox"
                  className="rounded border-purple-300 text-purple-600 focus:ring-purple-600 w-3.5 h-3.5 cursor-pointer"
                  checked={getCaps("capabilities_tier3").includes(cap.id)}
                  onChange={() => toggleCap("capabilities_tier3", cap.id)}
                />
                <span>{cap.label}</span>
              </label>
            ))}
          </div>
        </div>
        {getCaps("capabilities_tier3").includes("guest_memories") && (
          <div className="mt-2.5 p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
            <span className="block text-[11px] font-bold text-purple-900 uppercase tracking-wide">Total Kuota Foto Acara</span>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Batas Maksimal Foto Tamu (Plafon Cloud)</label>
              <input
                type="number"
                min={100}
                max={10000}
                step={100}
                value={settingsMap["memories_total_quota_tier3"] || "500"}
                onChange={(e) => setSetting("memories_total_quota_tier3", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <p className="text-[10px] text-purple-700 leading-tight">
              Pengantin bebas mengatur jatah roll per tamu di studionya selama total foto tidak melampaui kuota ini.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
  </SettingsCard>
    );
  })()}

  {/* Add-ons & Extension Pricing Settings */}
  {(() => {
    const ADDONS_KEYS = [
      "gallery_extension_price_per_month",
      "addon_memories_topup_photos",
      "addon_memories_topup_price",
      "addon_memories_topup_enabled",
    ];
    return (
      <SettingsCard
        title="Pengaturan Layanan Tambahan (Add-Ons)"
        description="Atur tarif dinamis untuk layanan perpanjangan masa aktif (undangan & galeri momen tamu) serta add-on kapasitas kuota foto tambahan (top-up)."
        isEditing={Boolean(editSection["addons"])}
        onEdit={() => toggleEditSection("addons")}
        onCancel={() => cancelEdit("addons", ADDONS_KEYS)}
        onSave={() => saveSettings(ADDONS_KEYS, setSavingAddons, "addons")}
        saving={savingAddons}
        isDirty={isSectionDirty(ADDONS_KEYS)}
        saveSuccess={settingsSaved["addons"]}
        saveSuccessMessage="Pengaturan layanan tambahan (Add-Ons) berhasil diperbarui"
        viewContent={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-purple-900 block mb-1">Perpanjangan Masa Simpan Galeri Foto Tamu</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-mono font-bold text-purple-950">
                    Rp {Number(settingsMap["gallery_extension_price_per_month"] || 50000).toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs text-purple-800 font-medium">/ 30 Hari (Bulan)</span>
                </div>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  Tarif per 30 hari untuk memperpanjang penyimpanan foto momen tamu. Masa subdomain dan arsip undangan tidak ikut berubah.
                </p>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-900">Top-Up Kuota Foto Tamu</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${settingsMap["addon_memories_topup_enabled"] !== "false" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                    {settingsMap["addon_memories_topup_enabled"] !== "false" ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-mono font-bold text-indigo-950">
                    Rp {Number(settingsMap["addon_memories_topup_price"] || 35000).toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs text-indigo-800 font-medium">/ +{settingsMap["addon_memories_topup_photos"] || 100} Foto</span>
                </div>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  Ekstra kapasitas foto tamu yang dapat dibeli pengantin secara fleksibel di dashboard tanpa harus upgrade tier paket.
                </p>
              </div>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <FieldRow
            label="Tarif Perpanjangan Galeri Foto Tamu (per 30 Hari)"
            description="Nominal tagihan per 30 hari untuk memperpanjang penyimpanan galeri foto momen tamu (Rupiah). Masa subdomain dan arsip undangan tidak ikut diperpanjang."
          >
            <input
              type="number"
              min="10000"
              step="5000"
              value={settingsMap["gallery_extension_price_per_month"] || "50000"}
              onChange={(e) => setSetting("gallery_extension_price_per_month", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-mono"
            />
          </FieldRow>

          <FieldRow
            label="Top-Up Kuota Foto Kamera Tamu"
            description="Atur kapasitas tambahan foto dan tarif add-on top-up per batch jika pengantin membutuhkan kuota foto lebih banyak tanpa upgrade paket."
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status Add-On</label>
                <select
                  value={settingsMap["addon_memories_topup_enabled"] ?? "true"}
                  onChange={(e) => setSetting("addon_memories_topup_enabled", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  <option value="true">Aktif (Dapat Dipesan)</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tambah Kuota (Foto)</label>
                <input
                  type="number"
                  min="25"
                  step="25"
                  value={settingsMap["addon_memories_topup_photos"] || "100"}
                  onChange={(e) => setSetting("addon_memories_topup_photos", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Harga Add-On (IDR)</label>
                <input
                  type="number"
                  min="10000"
                  step="5000"
                  value={settingsMap["addon_memories_topup_price"] || "35000"}
                  onChange={(e) => setSetting("addon_memories_topup_price", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </FieldRow>
        </div>
      </SettingsCard>
    );
  })()}
    </>
  );
}
