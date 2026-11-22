"use client";

import { compressImageToWebP } from "@/lib/clientImageCompressor";
import { useDemoStudio } from "@/components/admin/demoStudio/DemoStudioContext";

export function DemoVendorsTab() {
  const {
    demoStudioData,
    demoStudioTab,
    demoStudioTheme,
    feedback,
    setDemoStudioData,
    setUploadingSlot,
    uploadingSlot,
  } = useDemoStudio();

  return (
    <>
                  {/* TAB 5: MITRA VENDOR */}
                  {demoStudioTab === "vendors" && (
                    <div className="space-y-6">
                      {/* Info Banner */}
                      <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-amber-900 text-xs leading-relaxed flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                          i
                        </div>
                        <div>
                          <strong>Desain Bersih &amp; Melayang (No Card Wrap):</strong> Atur logo, nama, dan tautan mitra vendor (fotografer, MUA, dekorasi, busana) untuk tema <strong>{demoStudioTheme.name}</strong>. Seluruh logo transparan tampil melayang elegan langsung di atas kanvas tema tanpa bingkai kartu di atas footer.
                        </div>
                      </div>

                      {/* Panel 1: Switch Tampilkan Section Vendor & Label Kustom */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              1. Pengaturan &amp; Visibilitas Seksi Vendor
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Tentukan apakah seksi mitra vendor ditampilkan pada demo publik tema ini.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={demoStudioData.showVendors !== false}
                              onChange={(e) => {
                                setDemoStudioData({
                                  ...demoStudioData,
                                  showVendors: e.target.checked,
                                });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                            <span className="ml-2.5 text-xs font-bold text-gray-800">
                              {demoStudioData.showVendors !== false ? "Aktif (Tampil)" : "Nonaktif (Sembunyi)"}
                            </span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200/60">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.vendorTitle ?? demoStudioData.vendorTitle ?? "Vendor"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.vendorTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels, vendorTitle: e.target.value });
                              }}
                              placeholder="Vendor / Event Partners"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Seksi</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.vendorEyebrow ?? demoStudioData.vendorEyebrow ?? "SPECIAL THANKS"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.vendorEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels, vendorEyebrow: e.target.value });
                              }}
                              placeholder="SPECIAL THANKS"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Subtitle / Catatan (Opsional)</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.vendorSubtitle ?? demoStudioData.vendorSubtitle ?? ""}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.vendorSubtitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels, vendorSubtitle: e.target.value });
                              }}
                              placeholder="Terima kasih kepada seluruh mitra..."
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Panel 2: Daftar Mitra Vendor & Upload Logo */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-2">
                              <span>2. Daftar Logo &amp; Profil Mitra Vendor</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300/70">
                                {((demoStudioData.vendors || demoStudioData.featureSettings?.vendors) || []).length} Vendor
                              </span>
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Unggah logo PNG transparan dan atur tautan media sosial mitra.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const dummyVendors = [
                                  { id: "v_1", name: "AMS Creative Studio", logoUrl: "/uploads/logo_dummy/logo_1.png", url: "https://instagram.com" },
                                  { id: "v_2", name: "Pick Your Photo", logoUrl: "/uploads/logo_dummy/logo_2.png", url: "https://instagram.com" },
                                  { id: "v_3", name: "Sore Hari Floral & Styling", logoUrl: "/uploads/logo_dummy/logo_3.png", url: "https://instagram.com" },
                                  { id: "v_4", name: "Royal Wedding Car", logoUrl: "/uploads/logo_dummy/logo_4.png", url: "https://instagram.com" },
                                ];
                                setDemoStudioData({
                                  ...demoStudioData,
                                  vendors: dummyVendors,
                                });
                              }}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                              title="Muat 4 Logo Dummy Default (AMS, Pick Your Photo, Sore Hari, Royal Wedding Car)"
                            >
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                              <span>Muat 4 Logo Dummy Default</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const curVendors = [...((demoStudioData.vendors || demoStudioData.featureSettings?.vendors) || [])];
                                curVendors.push({
                                  id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                  name: "",
                                  logoUrl: "",
                                  url: "",
                                });
                                setDemoStudioData({ ...demoStudioData, vendors: curVendors });
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                              <span>Tambah Vendor</span>
                            </button>
                          </div>
                        </div>

                        {/* List Vendor Items */}
                        <div className="space-y-2.5">
                          {(() => {
                            const curVendors = (demoStudioData.vendors || demoStudioData.featureSettings?.vendors) || [];
                            if (curVendors.length === 0) {
                              return (
                                <div className="p-8 bg-white border border-dashed border-gray-300 rounded-xl text-center space-y-3">
                                  <div className="w-10 h-10 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto text-xs font-bold">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-700">Belum Ada Mitra Vendor</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Tambahkan logo vendor secara manual atau klik tombol di bawah untuk memuat 4 logo dummy transparan default.</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dummyVendors = [
                                        { id: "v_1", name: "AMS Creative Studio", logoUrl: "/uploads/logo_dummy/logo_1.png", url: "https://instagram.com" },
                                        { id: "v_2", name: "Pick Your Photo", logoUrl: "/uploads/logo_dummy/logo_2.png", url: "https://instagram.com" },
                                        { id: "v_3", name: "Sore Hari Floral & Styling", logoUrl: "/uploads/logo_dummy/logo_3.png", url: "https://instagram.com" },
                                        { id: "v_4", name: "Royal Wedding Car", logoUrl: "/uploads/logo_dummy/logo_4.png", url: "https://instagram.com" },
                                      ];
                                      setDemoStudioData({
                                        ...demoStudioData,
                                        vendors: dummyVendors,
                                      });
                                    }}
                                    className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                                  >
                                    Muat 4 Logo Dummy Default
                                  </button>
                                </div>
                              );
                            }

                            return curVendors.map((vendor: any, vIdx: number) => {
                              const vendorSlot = `vendor_${vIdx + 1}`;
                              return (
                                <div 
                                  key={vendor.id || vIdx} 
                                  className="p-2 sm:p-2.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-all shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3"
                                >
                                  {/* Nomor urut */}
                                  <span className="hidden sm:flex w-6 h-6 rounded-lg bg-stone-100 text-stone-600 text-[10px] font-mono font-bold items-center justify-center shrink-0">
                                    {vIdx + 1}
                                  </span>

                                  {/* Slot Logo Mini */}
                                  <div className="relative shrink-0 flex items-center gap-1.5">
                                    <label 
                                      className="w-16 h-10 rounded-lg border border-dashed border-stone-300 hover:border-amber-600 bg-stone-50 hover:bg-amber-50/30 flex items-center justify-center p-1 transition cursor-pointer relative group/logo overflow-hidden" 
                                      title={vendor.logoUrl ? `Logo: ${vendor.logoUrl} (Klik untuk ganti berkas)` : "Klik untuk unggah berkas logo"}
                                    >
                                      <input
                                        type="file"
                                        accept="image/png,image/webp,image/jpeg"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file || !demoStudioTheme) return;
                                          try {
                                            setUploadingSlot(vendorSlot);
                                            const fd = new FormData();
                                            fd.append("slot", vendorSlot);
                                            fd.append("file", file);
                                            const res = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-asset`, {
                                              method: "POST",
                                              body: fd,
                                            });
                                            const json = await res.json();
                                            if (json.success && json.rawUrl) {
                                              const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, logoUrl: json.rawUrl } : v);
                                              setDemoStudioData({ ...demoStudioData, vendors: updated });
                                            } else {
                                              feedback.notify(json.error || "Gagal mengunggah logo vendor", "error");
                                            }
                                          } catch (err: any) {
                                            feedback.notify(err.message || "Error mengunggah logo", "error");
                                          } finally {
                                            setUploadingSlot(null);
                                          }
                                        }}
                                      />
                                      {uploadingSlot === vendorSlot ? (
                                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                      ) : vendor.logoUrl ? (
                                        <img 
                                          src={vendor.logoUrl} 
                                          alt={vendor.name || "Logo"} 
                                          className="max-h-8 max-w-full object-contain" 
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center text-stone-400 group-hover/logo:text-amber-700">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                          <span className="text-[8px] font-semibold tracking-tight mt-0.5">+ Logo</span>
                                        </div>
                                      )}
                                    </label>

                                    {/* Tombol Input URL Manual */}
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const currentUrl = vendor.logoUrl || "";
                                        const inputUrl = await feedback.prompt({
                                          title: "URL logo vendor",
                                          message: "Path lokal (misal /uploads/logo_dummy/logo_1.png) atau URL eksternal.",
                                          initialValue: currentUrl,
                                          placeholder: "/uploads/... atau https://...",
                                        });
                                        if (inputUrl !== null) {
                                          const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, logoUrl: inputUrl.trim() } : v);
                                          setDemoStudioData({ ...demoStudioData, vendors: updated });
                                        }
                                      }}
                                      className="text-stone-400 hover:text-amber-700 p-1 rounded transition cursor-pointer"
                                      title="Tautkan URL logo kustom secara manual"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    </button>

                                    {vendor.logoUrl && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, logoUrl: "" } : v);
                                          setDemoStudioData({ ...demoStudioData, vendors: updated });
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
                                        const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, name: e.target.value } : v);
                                        setDemoStudioData({ ...demoStudioData, vendors: updated });
                                      }}
                                      placeholder="Nama Vendor (misal: AMS Creative Studio)"
                                      className="w-full px-3 py-2 text-xs bg-stone-50/60 focus:bg-white border border-stone-200 focus:border-amber-600 rounded-lg text-stone-800 focus:outline-none transition"
                                    />
                                  </div>

                                  {/* Input Tautan / Instagram */}
                                  <div className="flex-1 min-w-[140px]">
                                    <input
                                      type="text"
                                      value={vendor.url || ""}
                                      onChange={(e) => {
                                        const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, url: e.target.value } : v);
                                        setDemoStudioData({ ...demoStudioData, vendors: updated });
                                      }}
                                      placeholder="@instagram atau https://..."
                                      className="w-full px-3 py-2 text-xs bg-stone-50/60 focus:bg-white border border-stone-200 focus:border-amber-600 rounded-lg text-stone-800 focus:outline-none transition"
                                    />
                                  </div>

                                  {/* Tombol Hapus Vendor */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = curVendors.filter((_: any, i: number) => i !== vIdx);
                                      setDemoStudioData({ ...demoStudioData, vendors: updated });
                                    }}
                                    className="self-end sm:self-center p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                                    title="Hapus vendor ini"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
    </>
  );
}
