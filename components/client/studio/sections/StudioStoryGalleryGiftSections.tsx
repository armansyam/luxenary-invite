"use client";

import Link from "next/link";
import { GiftRegistryEditor } from "@/components/client/studio/GiftRegistryEditor";
import { LoveStorySectionEditor } from "@/components/client/studio/LoveStorySectionEditor";
import { Input, PhotoInput, SectionHeaderToggle, SectionHeaderActions } from "@/components/client/studio/StudioFormControls";
import type { GiftRegistryItem } from "@/lib/giftRegistry";
import { useStudioEditor } from "@/components/client/studio/StudioEditorContext";

export function StudioStoryGalleryGiftSections() {
  const {
    activeSectionTab,
    addBank,
    addStory,
    bankList,
    collapsed,
    getCustomLabel,
    getFeatureSetting,
    handleUploadEnd,
    handleUploadStart,
    invitation,
    invitationId,
    isDirty,
    isUploading,
    isWeddingEvent,
    removeBank,
    removeStory,
    renderSectionNavFooter,
    saveSection,
    saving,
    savingSec,
    sectionHeading,
    showGallery,
    showGift,
    showStory,
    stories,
    toggleSection,
    updateBankItem,
    updateCustomLabel,
    updateFeatureSetting,
    updateField,
    updateStoryItem,
  } = useStudioEditor();

  return (
    <>
      {/* 7. SEKSI KISAH & PERJALANAN (SEC7 — Universal untuk WEDDING, PERSONAL, dan EVENT) */}
      {(activeSectionTab === "sec7") && (
      <section id="section-sec7" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec7")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec7
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec7")}</h2>
              {collapsed.sec7 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showStory ? "text-stone-700 font-medium" : "text-stone-500"}>
                    {showStory ? `${stories.length} Babak Cerita` : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec7 && (
              <p className="text-xs text-stone-500 mt-0.5">
                {(!invitation?.eventType || invitation?.eventType === "WEDDING")
                  ? "Tuliskan babak perjalanan cinta dari awal bertemu hingga pernikahan (dapat disembunyikan bila tidak digunakan)"
                  : invitation?.eventType === "PERSONAL"
                  ? "Tuliskan kisah perjalanan hidup, pencapaian pendidikan (wisuda), atau momen tumbuh kembang (dapat disembunyikan bila tidak digunakan)"
                  : "Tuliskan tonggak sejarah (milestone), perjalanan organisasi, atau latar belakang acara (dapat disembunyikan bila tidak digunakan)"}
              </p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec7)}
              isSaving={saving && savingSec === "sec7"}
              onSave={() => saveSection("sec7")}
              collapsed={Boolean(collapsed.sec7)}
              onToggle={() => toggleSection("sec7")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec7 && (
          <div className="p-3.5 sm:p-7 space-y-4">
            <LoveStorySectionEditor
              showStory={showStory}
              stories={stories}
              eventType={invitation?.eventType || "WEDDING"}
              storyTitle={getCustomLabel(
                "storyTitle",
                (!invitation?.eventType || invitation?.eventType === "WEDDING")
                  ? "Kisah Cinta"
                  : invitation?.eventType === "PERSONAL"
                  ? "Kisah & Perjalanan"
                  : "Tonggak Perjalanan",
              )}
              onToggleShowStory={(v) => updateFeatureSetting("showStory", v)}
              onAddStory={addStory}
              onRemoveStory={removeStory}
              onUpdateStoryItem={updateStoryItem}
              onUpdateStoryTitle={(v) => updateCustomLabel("storyTitle", v)}
              isDirty={Boolean(isDirty.sec7)}
              saving={saving}
              onSave={() => saveSection("sec7")}
            />
            {renderSectionNavFooter("sec7")}
          </div>
        )}
      </section>
      )}

      {/* 8. SEKSI GALERI & VIDEO (SEC8) */}
      {(activeSectionTab === "sec8") && (
      <section id="section-sec8" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec8")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec8
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec8")}</h2>
              {collapsed.sec8 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showGallery ? "text-stone-700 font-medium" : "text-stone-500"}>
                    {showGallery ? (getFeatureSetting("galleryDriveFolderUrl", "") ? "Drive Stream CDN" : "Grid Dinamis") : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec8 && (
              <p className="text-xs text-stone-500 mt-0.5">Mendukung Folder Google Drive (CDN stream), Smart Puzzle Grid dinamis acak, dan modal galeri penuh</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec8)}
              isSaving={saving && savingSec === "sec8"}
              onSave={() => saveSection("sec8")}
              collapsed={Boolean(collapsed.sec8)}
              onToggle={() => toggleSection("sec8")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec8 && (
          <div className="p-3.5 sm:p-7 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Galeri{isWeddingEvent ? " Pre-Wedding" : ""}:</span>
              <SectionHeaderToggle
                label=""
                checked={showGallery}
                onChange={(v) => updateFeatureSetting("showGallery", v)}
              />
            </div>

            {showGallery && (
              <div className="space-y-4">
                <Input
                  label="Judul Seksi Galeri (Bebas Kustom)"
                  value={getCustomLabel("galleryTitle", "Galeri Momen")}
                  onChange={(v) => updateCustomLabel("galleryTitle", v)}
                  placeholder="Galeri Momen / Our Moments / Ceritaku / Album Kenangan"
                />

                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-amber-900">Video Teaser{isWeddingEvent ? " Pre-Wedding" : ""} (YouTube / Vimeo)</h4>
                  <p className="text-[11px] text-stone-600">Tempelkan link video YouTube biasa (misal: <code>https://youtu.be/...</code>) untuk memutar teaser video di atas galeri.</p>
                  <input
                    type="text"
                    value={getFeatureSetting("videoGalleryUrl", "")}
                    onChange={(e) => updateFeatureSetting("videoGalleryUrl", e.target.value)}
                    placeholder="https://youtu.be/abcdef12345 atau https://www.youtube.com/watch?v=..."
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono"
                  />
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-stone-900">Link Folder Google Drive (Live Stream CDN)</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Tempelkan 1 tautan folder Google Drive publik. Sistem otomatis men-stream foto acak dalam format <strong>Smart Puzzle Grid (Zero Crop)</strong> dan tombol <strong>&ldquo;Lihat Semua Foto&rdquo;</strong> tanpa membebani storage server.
                  </p>
                  <input
                    type="url"
                    value={getFeatureSetting("galleryDriveFolderUrl", "")}
                    onChange={(e) => updateFeatureSetting("galleryDriveFolderUrl", e.target.value)}
                    placeholder="Masukkan URL Google Drive galeri foto kamu"
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono"
                  />
                  <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900">
                    Pastikan akses link folder di Google Drive disetel ke <strong>&ldquo;Siapa saja yang memiliki link dapat melihat&rdquo;</strong>.
                  </div>
                  <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] text-amber-900">
                    Sistem hanya membaca <strong>100 foto pertama</strong> dalam folder Drive. Jika folder berisi lebih dari 100 foto, hanya 100 foto pertama yang akan ditampilkan di undangan.
                  </div>
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-stone-900">Daftar Link URL Foto Galeri (Alternatif Mandiri)</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Tempelkan tautan foto langsung (1 baris per link) jika Anda memiliki hosting gambar eksternal / CDN foto pribadi.
                  </p>
                  <textarea
                    rows={4}
                    value={getFeatureSetting("galleryPhotosList", "")}
                    onChange={(e) => updateFeatureSetting("galleryPhotosList", e.target.value)}
                    placeholder={"https://.../foto-1.jpg\nhttps://.../foto-2.jpg\nhttps://.../foto-3.jpg"}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec8")}
                disabled={saving || !isDirty.sec8}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  !isDirty.sec8
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{!isDirty.sec8 ? "Tersimpan" : "Simpan Pengaturan Galeri"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec8")}
          </div>
        )}
      </section>
      )}

      {/* 9. SEKSI TANDA KASIH & AMPLOP (SEC9) */}
      {(activeSectionTab === "sec9") && (
      <section id="section-sec9" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec9")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec9
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec9")}</h2>
              {collapsed.sec9 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className={showGift ? "text-stone-700 font-medium" : "text-stone-500"}>
                    {showGift ? `${bankList.length} Rekening Terdaftar` : "Nonaktif"}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec9 && (
              <p className="text-xs text-stone-500 mt-0.5">Kelola nomor rekening bank, QRIS statis, dan alamat pengiriman kado fisik</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec9)}
              isSaving={saving && savingSec === "sec9"}
              onSave={() => saveSection("sec9")}
              collapsed={Boolean(collapsed.sec9)}
              onToggle={() => toggleSection("sec9")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec9 && (
          <div className="p-3.5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Tampilkan Amplop Digital:</span>
              <div className="flex items-center gap-3">
                <SectionHeaderToggle
                  label=""
                  checked={showGift}
                  onChange={(v) => updateFeatureSetting("showGift", v)}
                />
                {showGift && (
                  <button
                    type="button"
                    onClick={addBank}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    + Tambah Rekening
                  </button>
                )}
              </div>
            </div>

            {showGift && (
              <div className="space-y-4 mt-2">
                <div className="space-y-3">
                  {bankList.map((b, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-full sm:w-1/4">
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Nama Bank / E-Wallet</label>
                        <input
                          type="text"
                          value={b.bank || ""}
                          onChange={(e) => updateBankItem(idx, "bank", e.target.value)}
                          placeholder="BCA / Mandiri / BSI"
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg text-base sm:text-xs"
                        />
                      </div>
                      <div className="w-full sm:w-1/3">
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Nomor Rekening</label>
                        <input
                          type="text"
                          value={b.number || ""}
                          onChange={(e) => updateBankItem(idx, "number", e.target.value)}
                          placeholder="Contoh: 1234567890"
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg text-base sm:text-xs font-mono"
                        />
                      </div>
                      <div className="w-full sm:w-1/3">
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Atas Nama (Owner)</label>
                        <input
                          type="text"
                          value={b.name || ""}
                          onChange={(e) => updateBankItem(idx, "name", e.target.value)}
                          placeholder="Nama Pemilik Rekening"
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg text-base sm:text-xs"
                        />
                      </div>
                      {bankList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBank(idx)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-bold self-end sm:self-center pt-2 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <PhotoInput
                    label="Gambar QRIS Pembayaran"
                    desc="Upload gambar QRIS statis untuk scan tanda kasih"
                    value={getFeatureSetting("qrisImageUrl", "")}
                    onChange={(v) => updateFeatureSetting("qrisImageUrl", v)}
                    placeholder="https://.../qris-pembayaran.jpg"
                    invitationId={invitationId}
                    slot="QRIS"
                    onUploadStart={handleUploadStart}
                    onUploadEnd={handleUploadEnd}
                  />
                  <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-2">
                    <label className="block text-xs font-bold text-stone-900">Alamat Pengiriman Kado Fisik</label>
                    <p className="text-[10px] text-stone-500">Alamat rumah/kantor untuk penerimaan kado fisik dari tamu</p>
                    <textarea
                      rows={3}
                      value={invitation.shippingAddress || ""}
                      onChange={(e) => updateField("shippingAddress", e.target.value)}
                      placeholder="Jl. Perintis Kemerdekaan No. 12, Tamalanrea, Kota Makassar"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>
                </div>

                <GiftRegistryEditor
                  invitationId={invitationId}
                  items={(Array.isArray(getFeatureSetting("giftRegistry", [])) ? getFeatureSetting("giftRegistry", []) : []) as GiftRegistryItem[]}
                  onChange={(nextItems) => updateFeatureSetting("giftRegistry", nextItems)}
                />
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec9")}
                disabled={saving || isUploading || !isDirty.sec9}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  isUploading
                    ? "bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed"
                    : !isDirty.sec9
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{saving ? "Menyimpan..." : isUploading ? "Sedang Mengunggah QRIS..." : !isDirty.sec9 ? "Tersimpan" : "Simpan Rekening & Hadiah"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec9")}
          </div>
        )}
      </section>
      )}
    </>
  );
}
