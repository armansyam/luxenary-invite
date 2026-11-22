"use client";


import { useDemoStudio } from "@/components/admin/demoStudio/DemoStudioContext";

export function DemoProfileTab() {
  const {
    demoStudioData,
    demoStudioTab,
    demoStudioTheme,
    setDemoStudioData,
  } = useDemoStudio();

  return (
    <>
                  {/* TAB 2: COUPLE PROFILE & EVENTS */}
                  {demoStudioTab === "profile" && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">Tagline Undangan Demo</label>
                          <input
                            type="text"
                            value={demoStudioData.tagline || ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, tagline: e.target.value })}
                            placeholder={demoStudioTheme?.eventType && demoStudioTheme.eventType !== "WEDDING" ? "EXCLUSIVE INVITATION" : "THE WEDDING OF"}
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">Kota / Lokasi Umum</label>
                          <input
                            type="text"
                            value={demoStudioData.city || ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, city: e.target.value })}
                            placeholder="Jakarta"
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* 3-Mode Demo Profile: WEDDING vs PERSONAL vs EVENT */}
                      {(!demoStudioTheme?.eventType || demoStudioTheme?.eventType === "WEDDING") ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                          {/* Groom */}
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-amber-900 uppercase font-mono block">Mempelai Pria (Demo)</span>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Panggilan</label>
                              <input
                                type="text"
                                value={demoStudioData.groomName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomName: e.target.value })}
                                placeholder="Raditya"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Lengkap &amp; Gelar</label>
                              <input
                                type="text"
                                value={demoStudioData.groomDisplayName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomDisplayName: e.target.value })}
                                placeholder="Raditya Pratama, S.T."
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ayah Pria</label>
                                <input
                                  type="text"
                                  value={demoStudioData.groomFather || ""}
                                  onChange={(e) => setDemoStudioData({ ...demoStudioData, groomFather: e.target.value })}
                                  placeholder="Contoh: Ir. Hendra Pratama / Alm. Hendra Pratama"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ibu Pria</label>
                                <input
                                  type="text"
                                  value={demoStudioData.groomMother || ""}
                                  onChange={(e) => setDemoStudioData({ ...demoStudioData, groomMother: e.target.value })}
                                  placeholder="Contoh: Ratna Dewi / Almh. Ratna Dewi"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Instagram (@)</label>
                              <input
                                type="text"
                                value={demoStudioData.groomInstagram || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomInstagram: e.target.value })}
                                placeholder="raditya.pratama"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                          </div>

                          {/* Bride */}
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-amber-900 uppercase font-mono block">Mempelai Wanita (Demo)</span>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Panggilan</label>
                              <input
                                type="text"
                                value={demoStudioData.brideName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, brideName: e.target.value })}
                                placeholder="Alana"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Lengkap &amp; Gelar</label>
                              <input
                                type="text"
                                value={demoStudioData.brideDisplayName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, brideDisplayName: e.target.value })}
                                placeholder="Alana Khairunnisa, B.Des."
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ayah Wanita</label>
                                <input
                                  type="text"
                                  value={demoStudioData.brideFather || ""}
                                  onChange={(e) => setDemoStudioData({ ...demoStudioData, brideFather: e.target.value })}
                                  placeholder="Contoh: Dr. Faisal Basri / Alm. Faisal Basri"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ibu Wanita</label>
                                <input
                                  type="text"
                                  value={demoStudioData.brideMother || ""}
                                  onChange={(e) => setDemoStudioData({ ...demoStudioData, brideMother: e.target.value })}
                                  placeholder="Contoh: Soraya Latief / Almh. Soraya Latief"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Instagram (@)</label>
                              <input
                                type="text"
                                value={demoStudioData.brideInstagram || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, brideInstagram: e.target.value })}
                                placeholder="alana.khairunnisa"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ) : demoStudioTheme?.eventType === "PERSONAL" ? (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                          <span className="text-xs font-bold text-amber-900 uppercase font-mono block">Profil Tokoh Utama (Demo PERSONAL)</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Panggilan</label>
                              <input
                                type="text"
                                value={demoStudioData.personNickname || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, personNickname: e.target.value })}
                                placeholder="Farhan"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Lengkap</label>
                              <input
                                type="text"
                                value={demoStudioData.personName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, personName: e.target.value })}
                                placeholder="Farhan Pratama"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Orang Tua (Opsional)</label>
                              <input
                                type="text"
                                value={demoStudioData.parentName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, parentName: e.target.value })}
                                placeholder="Bpk. Hendra & Ibu Rina"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Instagram (@)</label>
                              <input
                                type="text"
                                value={demoStudioData.personInstagram || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, personInstagram: e.target.value })}
                                placeholder="farhan.pratama"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                          <span className="text-xs font-bold text-amber-900 uppercase font-mono block">Identitas Acara (Demo EVENT)</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Acara</label>
                              <input
                                type="text"
                                value={demoStudioData.eventTitle || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, eventTitle: e.target.value })}
                                placeholder="Annual Gathering 2026"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Subjudul / Penyelenggara</label>
                              <input
                                type="text"
                                value={demoStudioData.eventSubtitle || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, eventSubtitle: e.target.value })}
                                placeholder="PT Sinergi Nusantara"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quotes & Dates */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">Kutipan Pembuka (Opening Quote)</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.openingQuote || ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, openingQuote: e.target.value })}
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500 resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-800 mb-1">Referensi / Dalil Kutipan</label>
                            <input
                              type="text"
                              value={demoStudioData.openingQuoteRef || ""}
                              onChange={(e) => setDemoStudioData({ ...demoStudioData, openingQuoteRef: e.target.value })}
                              placeholder="QS. AR-RUM : 21"
                              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-800 mb-1">Format Tanggal Pernikahan Teks</label>
                            <input
                              type="text"
                              value={demoStudioData.weddingDateFormatted || ""}
                              onChange={(e) => setDemoStudioData({ ...demoStudioData, weddingDateFormatted: e.target.value })}
                              placeholder="Sabtu, 14 November 2026"
                              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Timeline & Sesi Acara Demo */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              Timeline &amp; Rangkaian Acara Demo
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Kelola sesi acara (Akad Nikah, Resepsi, Walimah, dll.) untuk tema ini.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const events = [...(demoStudioData.events || [])];
                              events.push({
                                badge: "RESEPSI",
                                title: "Sesi Acara Baru",
                                time: "11.00 – 14.00 WIB",
                                location: demoStudioData.city ? `Ballroom di ${demoStudioData.city}` : "Ballroom Hotel",
                                address: demoStudioData.city ? `Jl. Utama No. 1, ${demoStudioData.city}` : "Jl. Utama No. 1",
                                mapsUrl: "https://maps.google.com",
                              });
                              setDemoStudioData({ ...demoStudioData, events });
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Tambah Acara</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(demoStudioData.events || []).length === 0 ? (
                            <div className="p-4 bg-white border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-400">
                              Belum ada sesi acara. Klik &quot;Tambah Acara&quot; di atas untuk menambahkan.
                            </div>
                          ) : (
                            (demoStudioData.events || []).map((ev: any, evIdx: number) => (
                              <div key={evIdx} className="p-4 bg-white border border-gray-200 rounded-xl space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <span className="text-xs font-bold text-amber-900 font-mono">Sesi {evIdx + 1}: {ev.title || "Acara"}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const events = (demoStudioData.events || []).filter((_: any, idx: number) => idx !== evIdx);
                                      setDemoStudioData({ ...demoStudioData, events });
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition cursor-pointer"
                                  >
                                    Hapus Acara
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Kategori / Badge Sesi</label>
                                    <input
                                      type="text"
                                      value={ev.badge || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].badge = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="AKAD NIKAH / RESEPSI"
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white uppercase font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nama / Judul Acara</label>
                                    <input
                                      type="text"
                                      value={ev.title || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].title = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="Akad Nikah &amp; Resepsi"
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Waktu / Jam Pelaksanaan</label>
                                    <input
                                      type="text"
                                      value={ev.time || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].time = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="08.00 – 11.00 WIB"
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nama Tempat / Gedung</label>
                                    <input
                                      type="text"
                                      value={ev.location || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].location = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="Grand Ballroom Gedong Putih"
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Link Google Maps</label>
                                    <input
                                      type="text"
                                      value={ev.mapsUrl || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].mapsUrl = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="https://maps.google.com/..."
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-blue-600 font-mono"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Alamat Lengkap</label>
                                  <textarea
                                    rows={2}
                                    value={ev.address || ""}
                                    onChange={(e) => {
                                      const events = [...(demoStudioData.events || [])];
                                      events[evIdx].address = e.target.value;
                                      setDemoStudioData({ ...demoStudioData, events });
                                    }}
                                    placeholder="Jl. Villa Triniti KM 4.7, Parongpong, Bandung Barat"
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white resize-none"
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
    </>
  );
}
