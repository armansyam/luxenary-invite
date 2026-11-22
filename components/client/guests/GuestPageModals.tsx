"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { resolveEffectiveInvitationUrl } from "@/lib/domainUtils";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";
import type { waPresets } from "@/lib/waPresets";

export interface GuestModalsContext {
  addError: string | null;
  adminWaTemplate: string | null;
  bulkError: string | null;
  bulkFileName: string;
  bulkSuccess: string | null;
  confirmDeleteGuest: () => Promise<void>;
  currentTemplate: string;
  defaultSessionInfo: string;
  defaultTemplate: string;
  downloadCsvTemplate: () => void;
  guestToDelete: { id: string; name: string } | null;
  handleAddGuest: (e: FormEvent) => Promise<void>;
  handleExecuteBulkImport: () => Promise<void>;
  handleFileSelect: (file: File) => Promise<void>;
  handlePickMultipleContacts: () => Promise<void>;
  handlePickSingleContact: () => Promise<void>;
  handleSaveTemplate: () => Promise<void>;
  hasContactPicker: boolean;
  insertVariableTag: (tag: string) => void;
  invitationData: any;
  isBulkUploading: boolean;
  loading: boolean;
  newGuest: {
    name: string;
    phone: string;
    category: string;
    guestLimit: number;
    tableNumber: string;
    sessionInfo: string;
  };
  parsedGuests: Array<{
    name: string;
    phone?: string | null;
    category: string;
    guestQuota: number;
    tableNumber?: string | null;
    sessionInfo: string;
  }>;
  presets: ReturnType<typeof waPresets>;
  renderWaText: (guestName: string, guestLimit?: number, sessionInfo?: string) => string;
  savingTemplate: boolean;
  setAddError: Dispatch<SetStateAction<string | null>>;
  setBulkError: Dispatch<SetStateAction<string | null>>;
  setBulkFileName: Dispatch<SetStateAction<string>>;
  setBulkSuccess: Dispatch<SetStateAction<string | null>>;
  setGuestToDelete: Dispatch<SetStateAction<any>>;
  setNewGuest: Dispatch<SetStateAction<GuestModalsContext["newGuest"]>>;
  setParsedGuests: Dispatch<SetStateAction<GuestModalsContext["parsedGuests"]>>;
  setShowAddModal: Dispatch<SetStateAction<boolean>>;
  setShowBulkModal: Dispatch<SetStateAction<boolean>>;
  setShowTemplateModal: Dispatch<SetStateAction<boolean>>;
  setWaTemplate: Dispatch<SetStateAction<string | null>>;
  showAddModal: boolean;
  showBulkModal: boolean;
  showTemplateModal: boolean;
  templateSaveSuccess: boolean;
}

export function GuestPageModals({ ctx }: { ctx: GuestModalsContext }) {
  const {
    addError,
    adminWaTemplate,
    bulkError,
    bulkFileName,
    bulkSuccess,
    confirmDeleteGuest,
    currentTemplate,
    defaultSessionInfo,
    defaultTemplate,
    downloadCsvTemplate,
    guestToDelete,
    handleAddGuest,
    handleExecuteBulkImport,
    handleFileSelect,
    handlePickMultipleContacts,
    handlePickSingleContact,
    handleSaveTemplate,
    hasContactPicker,
    insertVariableTag,
    invitationData,
    isBulkUploading,
    loading,
    newGuest,
    parsedGuests,
    presets,
    renderWaText,
    savingTemplate,
    setAddError,
    setBulkError,
    setBulkFileName,
    setBulkSuccess,
    setGuestToDelete,
    setNewGuest,
    setParsedGuests,
    setShowAddModal,
    setShowBulkModal,
    setShowTemplateModal,
    setWaTemplate,
    showAddModal,
    showBulkModal,
    showTemplateModal,
    templateSaveSuccess,
  } = ctx;

  return (
    <>
      {/* WHATSAPP TEMPLATE EDITOR MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl border border-stone-200 space-y-5 my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900">
                  Kustomisasi Template Pesan WhatsApp
                </h3>
                <p className="text-xs text-stone-500">
                  Ubah format kata-kata undangan sesuai gaya bahasa Anda. Tautan undangan akan otomatis menyesuaikan subdomain aktif.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Editor & Variables */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Preset Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1.5">Pilihan Cepat Format Pesan:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Template dari AdminSetting — ditampilkan sebagai opsi pertama jika admin sudah mengisi */}
                    {adminWaTemplate && (
                      <button
                        key="admin-template"
                        type="button"
                        onClick={() => setWaTemplate(adminWaTemplate)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between col-span-2 ${
                          currentTemplate === adminWaTemplate
                            ? "border-violet-600 bg-violet-50/70 ring-1 ring-violet-600/30"
                            : "border-violet-300 bg-violet-50/40 hover:bg-violet-50 hover:border-violet-400"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-violet-900">Template Resmi (Admin)</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-violet-600 text-white rounded-md font-semibold">Default Admin</span>
                        </div>
                        <span className="text-[10px] text-violet-600 line-clamp-1">{adminWaTemplate.slice(0, 80)}{adminWaTemplate.length > 80 ? "…" : ""}</span>
                      </button>
                    )}
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setWaTemplate(preset.text)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          currentTemplate === preset.text
                            ? "border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700/30"
                            : "border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-stone-900">{preset.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-stone-200/80 text-stone-700 rounded-md font-semibold">{preset.badge}</span>
                        </div>
                        <span className="text-[10px] text-stone-500 line-clamp-1">{preset.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variable Tags (Click to Insert) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-stone-700">Variabel Dinamis (Klik untuk Menambahkan):</label>
                    <span className="text-[10px] text-stone-400">Otomatis diganti sesuai data tamu</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { tag: "{nama_tamu}", label: "Nama Tamu", desc: "Contoh: Bpk. Abiyoga" },
                      { tag: "{link_undangan}", label: "Link Undangan", desc: "URL Khusus Tamu (Domain / Subdomain)" },
                      invitationData?.eventType && invitationData.eventType !== "WEDDING"
                        ? { tag: "{nama_mempelai}", label: "Nama Acara", desc: resolveInvitationDisplayName(invitationData) }
                        : { tag: "{nama_mempelai}", label: "Nama Mempelai", desc: "Nama Kedua Mempelai" },
                      { tag: "{kuota_tamu}", label: "Kuota Tamu", desc: "2 Pax" },
                      { tag: "{sesi_acara}", label: "Sesi Acara", desc: defaultSessionInfo },
                    ].map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => insertVariableTag(item.tag)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-lg text-[11px] font-mono font-semibold transition cursor-pointer shadow-2xs"
                        title={item.desc}
                      >
                        + {item.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea Editor */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Teks Format Pesan WhatsApp:</label>
                  <textarea
                    rows={10}
                    value={currentTemplate}
                    onChange={(e) => setWaTemplate(e.target.value)}
                    placeholder="Tulis format pesan WhatsApp..."
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-base sm:text-xs text-stone-900 font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                  <div className="flex items-center justify-between mt-1 text-[10px] text-stone-400">
                    <span>Gunakan tanda bintang *teks* untuk cetak tebal, _teks_ untuk miring</span>
                    <button
                      type="button"
                      onClick={() => setWaTemplate(defaultTemplate)}
                      className="text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      {adminWaTemplate ? "Reset ke Template Admin" : "Reset ke Template Standar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Chat Simulation Preview */}
              {(() => {
                const isDraft = invitationData?.status !== "PUBLISHED" && invitationData?.status !== "EVENT_FINISHED";
                const domainInfo = resolveEffectiveInvitationUrl({
                  customDomain: invitationData?.customDomain,
                  subdomain: invitationData?.subdomain,
                  invitationSlug: invitationData?.invitationSlug,
                });

                return (
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-3 bg-stone-100 p-4 rounded-2xl border border-stone-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Live Preview WhatsApp</span>
                        </span>
                        <span className="text-[10px] text-stone-500">Simulasi untuk: <strong>Bpk. Abiyoga</strong></span>
                      </div>

                      {/* Domain Mode Indicator */}
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white rounded-xl border border-stone-200 text-[10px]">
                        <span className="text-stone-500 font-medium">Domain Aktif:</span>
                        {domainInfo.domainType === "CUSTOM_DOMAIN" ? (
                          <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            Custom Domain ({domainInfo.domainIdentifier})
                          </span>
                        ) : domainInfo.domainType === "SUBDOMAIN" ? (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            Subdomain ({domainInfo.domainIdentifier})
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                            Belum Dikonfigurasi
                          </span>
                        )}
                      </div>

                      {/* WhatsApp Bubble Preview Box */}
                      <div className="p-3.5 bg-[#d9fdd3] text-stone-900 rounded-2xl rounded-tr-xs border border-emerald-200/80 shadow-xs text-xs whitespace-pre-wrap font-sans leading-relaxed break-words">
                        {renderWaText("Bpk. Abiyoga", 2, defaultSessionInfo)}
                        <div className="text-right text-[9px] text-stone-400 mt-1 font-mono">
                          12:00
                        </div>
                      </div>

                      {/* Notice jika status masih DRAFT */}
                      {isDraft && (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-amber-950">
                            <svg className="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Undangan Masih DRAFT (Tautan Terkunci)</span>
                          </div>
                          <p className="text-stone-600 text-[10px] leading-relaxed">
                            Tautan undangan belum diaktifkan. Tautan resmi akan otomatis terpasang dan siap dikirimkan kepada tamu setelah Anda mempublikasikan undangan di menu Pengaturan / Beranda.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                      <span className="font-bold text-stone-800 block">Panduan Pengiriman:</span>
                      <p>
                        Tautan <code className="text-amber-800 font-bold font-mono text-[10px]">{"{link_undangan}"}</code> otomatis menggunakan domain kustom atau subdomain aktif Anda dan menyertakan nama tamu sehingga ucapan nama tamu personal otomatis muncul saat mereka membuka web.
                      </p>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Footer Action Buttons */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
              <div>
                {templateSaveSuccess && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    Template WhatsApp Berhasil Disimpan
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingTemplate ? "Menyimpan..." : "Simpan Template"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase block">Import Massal</span>
                <h3 className="text-base font-bold text-stone-900 mt-0.5">Import Daftar Tamu via CSV</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isBulkUploading) {
                    setShowBulkModal(false);
                    setBulkError(null);
                    setBulkSuccess(null);
                    setParsedGuests([]);
                    setBulkFileName("");
                  }
                }}
                disabled={isBulkUploading}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Template Download Card */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5 text-xs text-stone-600">
                <span className="font-bold text-stone-900 block">Belum memiliki format CSV yang sesuai?</span>
                <p className="text-[11px] text-stone-500">
                  Unduh berkas template contoh lalu buka menggunakan Microsoft Excel atau Google Sheets.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 shadow-2xs"
              >
                <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Unduh Template CSV</span>
              </button>
            </div>

            {/* Native Android Contact Picker Card (Jika Didukung) */}
            {hasContactPicker && (
              <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs text-purple-900">
                  <span className="font-bold text-purple-950 block">Atau Pilih Langsung dari Kontak HP</span>
                  <p className="text-[11px] text-purple-800/80">
                    Pilih kontak teman &amp; keluarga dari buku telepon Android tanpa perlu membuat file Excel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePickMultipleContacts}
                  className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Pilih dari Kontak HP</span>
                </button>
              </div>
            )}

            {/* Drag & Drop File Zone */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2">Pilih Berkas CSV</label>
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-stone-300 hover:border-amber-600/70 bg-stone-50/50 hover:bg-amber-50/20 rounded-2xl p-6 text-center transition-colors cursor-pointer relative"
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      void handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="text-xs">
                    {bulkFileName ? (
                      <span className="font-bold text-stone-900">{bulkFileName}</span>
                    ) : (
                      <>
                        <span className="font-bold text-amber-800">Klik untuk memilih</span>
                        <span className="text-stone-500"> atau seret berkas Excel (.xlsx) / .csv ke sini</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400">Mendukung berkas Excel .xlsx &amp; .csv (maksimal 500 tamu)</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {bulkError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{bulkError}</span>
              </div>
            )}

            {/* Success Message */}
            {bulkSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{bulkSuccess}</span>
              </div>
            )}

            {/* Preview Table */}
            {parsedGuests.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Pratinjau Data ({parsedGuests.length} Tamu Terdeteksi)</span>
                  </span>
                  <span className="text-[10px] text-stone-400">Menampilkan hingga 5 baris pertama</span>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-x-auto text-[11px]">
                  <table className="w-full min-w-[340px] text-left divide-y divide-stone-200">
                    <thead className="bg-stone-50 text-stone-600 font-bold">
                      <tr>
                        <th className="px-3 py-2">Nama</th>
                        <th className="px-3 py-2">WhatsApp</th>
                        <th className="px-3 py-2">Kategori</th>
                        <th className="px-3 py-2 text-center">Kuota</th>
                        <th className="px-3 py-2">Meja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700 bg-white">
                      {parsedGuests.slice(0, 5).map((g, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="px-3 py-2 font-medium text-stone-900">{g.name}</td>
                          <td className="px-3 py-2 font-mono text-[10px]">{g.phone || "-"}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-[10px] font-semibold">{g.category}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono">{g.guestQuota}</td>
                          <td className="px-3 py-2 text-stone-500">{g.tableNumber || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkError(null);
                  setBulkSuccess(null);
                  setParsedGuests([]);
                  setBulkFileName("");
                }}
                disabled={isBulkUploading}
                className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkImport}
                disabled={isBulkUploading || parsedGuests.length === 0}
                className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isBulkUploading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Mengimpor Tamu...</span>
                  </>
                ) : (
                  <span>Mulai Import ({parsedGuests.length} Tamu)</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Guest Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Tambah Tamu Undangan</h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setAddError(null); }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddGuest} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-stone-700">Nama Tamu *</label>
                  {hasContactPicker && (
                    <button
                      type="button"
                      onClick={handlePickSingleContact}
                      className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer transition bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200"
                    >
                      <svg className="w-3 h-3 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Pilih dari Kontak HP</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  placeholder="Masukkan nama lengkap tamu yang diundang"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Nomor WhatsApp (Opsional)</label>
                <input
                  type="text"
                  value={newGuest.phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    if (val.startsWith("0")) val = "62" + val.slice(1);
                    setNewGuest({ ...newGuest, phone: val });
                  }}
                  placeholder="08123456789 atau 628123456789"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Kategori</label>
                  <select
                    value={newGuest.category}
                    onChange={(e) => setNewGuest({ ...newGuest, category: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  >
                    <option value="VIP">VIP</option>
                    <option value="KELUARGA">Keluarga</option>
                    <option value="TEMAN">Teman</option>
                    <option value="UMUM">Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Kuota Kehadiran</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newGuest.guestLimit}
                    onChange={(e) => setNewGuest({ ...newGuest, guestLimit: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Nomor Meja (Opsional)</label>
                  <input
                    type="text"
                    value={newGuest.tableNumber}
                    onChange={(e) => setNewGuest({ ...newGuest, tableNumber: e.target.value })}
                    placeholder="Contoh: VIP-1, Meja 5"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Sesi Acara</label>
                  <input
                    type="text"
                    value={newGuest.sessionInfo}
                    onChange={(e) => setNewGuest({ ...newGuest, sessionInfo: e.target.value })}
                    placeholder="Tentukan sesi (Opsional)"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
              </div>

              {addError && (
                <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {addError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(null); }}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Menyimpan..." : "Simpan Tamu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Guest Confirmation Modal */}
      {guestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-stone-900">Hapus Tamu Undangan?</h3>
              <p className="text-xs text-stone-600">
                Apakah Anda yakin ingin menghapus <strong className="text-stone-900 font-semibold">{guestToDelete.name}</strong> dari daftar tamu? Tautan khusus dan catatan RSVP tamu ini akan dihapus.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuestToDelete(null)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteGuest}
                disabled={loading}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? "Menghapus..." : "Hapus Tamu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
