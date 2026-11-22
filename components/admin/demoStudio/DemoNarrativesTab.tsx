"use client";

import { DEMO_EXTRA_LABEL_FIELDS } from "@/components/admin/demoStudio/DemoStudioContext";
import { useDemoStudio } from "@/components/admin/demoStudio/DemoStudioContext";

export function DemoNarrativesTab() {
  const {
    currentDemoBlueprint,
    demoStudioData,
    demoStudioTab,
    demoStudioTheme,
    setDemoStudioData,
  } = useDemoStudio();

  return (
    <>
                  {/* TAB 4: THEME BLUEPRINT & SECTION TEXTS */}
                  {demoStudioTab === "narratives" && (
                    <div className="space-y-6">
                      <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-amber-900 text-xs leading-relaxed">
                        <div>
                          <strong>Cetak Biru Teks Bawaan Tema:</strong> Teks dan narasi di bawah ini merupakan teks penulisan bawaan untuk tema <strong>{demoStudioTheme.name}</strong>. Ketika calon klien memilih tema ini di dashboard, teks inilah yang otomatis dimuat ke formulir undangan mereka (tidak disamaratakan).
                        </div>
                      </div>

                      {/* Sub-Panel 1: Kutipan Pembuka & Sampul */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            1. Pembuka &amp; Sampul Undangan (Cover Section)
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Opening &amp; Cover</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Kutipan Ayat / Kata Mutiara Pembuka</label>
                          <textarea
                            rows={3}
                            value={demoStudioData.openingQuote ?? currentDemoBlueprint?.openingQuote ?? ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, openingQuote: e.target.value })}
                            placeholder="Kutipan pembuka..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Rujukan / Sumber Kutipan</label>
                            <input
                              type="text"
                              value={demoStudioData.openingQuoteRef ?? currentDemoBlueprint?.openingQuoteRef ?? ""}
                              onChange={(e) => setDemoStudioData({ ...demoStudioData, openingQuoteRef: e.target.value })}
                              placeholder="QS. AR-RUM: 21"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Label Tombol Buka Undangan</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.openBtn ?? currentDemoBlueprint?.openBtn ?? "Buka Undangan"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.openBtn = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Buka Undangan"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Subjudul Sampul / Teks Undangan</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.coverSubtitle ?? currentDemoBlueprint?.coverSubtitle ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.coverSubtitle = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Tanpa mengurangi rasa hormat..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Sub-Panel 2: Seksi Mempelai & Acara */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            2. Teks Seksi Mempelai &amp; Rangkaian Acara
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Couple &amp; Events</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Mempelai</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.coupleTitle ?? currentDemoBlueprint?.coupleSectionTitle ?? "Mempelai"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.coupleTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Mempelai / The Couple"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Rangkaian Acara</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.eventsTitle ?? currentDemoBlueprint?.eventsSectionTitle ?? "Rangkaian Acara"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.eventsTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Rangkaian Acara"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Mempelai</label>
                            <textarea
                              rows={2}
                              value={demoStudioData.customLabels?.coupleSub ?? currentDemoBlueprint?.coupleSectionSub ?? ""}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.coupleSub = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Dengan penuh rasa syukur..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Rangkaian Acara</label>
                            <textarea
                              rows={2}
                              value={demoStudioData.customLabels?.eventsSub ?? currentDemoBlueprint?.eventsSectionSub ?? ""}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.eventsSub = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Merupakan suatu kehormatan dan kebahagiaan bagi kami..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Panel 3: Seksi Kisah Cinta & Galeri Momen */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            3. Teks Seksi Kisah Cinta &amp; Galeri Momen
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Story &amp; Gallery</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Kisah Cinta (Story)</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.storyTitle ?? currentDemoBlueprint?.storySectionTitle ?? "Love Story"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.storyTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Love Story / Cerita Cinta"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow / Subjudul Kisah Cinta</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.storyEyebrow ?? currentDemoBlueprint?.storySectionEyebrow ?? "Our Journey"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.storyEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Our Journey / Perjalanan Kisah Kami"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Galeri Momen</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.galleryTitle ?? currentDemoBlueprint?.gallerySectionTitle ?? "Our Moments"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.galleryTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Our Moments / Galeri Momen"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow / Subjudul Galeri</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.galleryEyebrow ?? currentDemoBlueprint?.gallerySectionEyebrow ?? "Sweet Memories"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.galleryEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Sweet Memories / Momen Bahagia"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Kutipan / Narasi Pengantar Galeri</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.galleryQuote ?? currentDemoBlueprint?.galleryQuote ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.galleryQuote = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Kebahagiaan yang terabadikan dalam setiap bingkai cerita kami."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Sub-Panel 4: Seksi Dress Code & Live Streaming */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            4. Teks Dress Code &amp; Live Streaming
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Dress Code &amp; Streaming</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Dress Code</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.dressCodeTitle ?? currentDemoBlueprint?.dressCodeTitle ?? "Dress Code"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.dressCodeTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Dress Code / Aturan Busana"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Dress Code</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.dressCodeEyebrow ?? currentDemoBlueprint?.dressCodeEyebrow ?? "Attire Guide"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.dressCodeEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Attire Guide / Panduan Busana"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Panduan Dress Code</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.dressCodeSubtitle ?? currentDemoBlueprint?.dressCodeSubtitle ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.dressCodeSubtitle = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Nuansa pakaian yang disarankan untuk keharmonisan momen istimewa kami"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Live Streaming</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.streamingTitle ?? currentDemoBlueprint?.streamingTitle ?? "Live Streaming"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.streamingTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Live Streaming"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Live Streaming</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.streamingEyebrow ?? currentDemoBlueprint?.streamingEyebrow ?? "Virtual Attendance"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.streamingEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Virtual Attendance / Siaran Langsung"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Live Streaming</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.streamingSubtitle ?? currentDemoBlueprint?.streamingSubtitle ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.streamingSubtitle = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Bagi keluarga dan sahabat yang berhalangan hadir secara langsung, Anda dapat menyaksikan momen bahagia kami secara virtual."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Sub-Panel 5: Seksi Tanda Kasih & Turut Mengundang */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            5. Teks Tanda Kasih &amp; Turut Mengundang
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Gifts &amp; Family</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Tanda Kasih</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.giftTitle ?? currentDemoBlueprint?.giftSectionTitle ?? "Tanda Kasih"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.giftTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Tanda Kasih / Digital Gift"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Tanda Kasih</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.giftEyebrow ?? currentDemoBlueprint?.giftSectionEyebrow ?? "Wedding Gift"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.giftEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Digital Gift / Kirim Hadiah"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Tanda Kasih</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.giftDesc ?? currentDemoBlueprint?.giftSectionDesc ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.giftDesc = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Doa restu Anda adalah hadiah terindah bagi kami..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Turut Mengundang</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.turutMengundangTitle ?? currentDemoBlueprint?.turutMengundangTitle ?? "Turut Mengundang"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.turutMengundangTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Turut Mengundang"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Turut Mengundang</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.turutMengundangEyebrow ?? currentDemoBlueprint?.turutMengundangEyebrow ?? "Hormat Kami"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.turutMengundangEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Hormat Kami"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Subjudul Turut Mengundang</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.turutMengundangSubtitle ?? currentDemoBlueprint?.turutMengundangSubtitle ?? "Keluarga Besar"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.turutMengundangSubtitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Keluarga Besar"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Panel 6: Doa Penutup, RSVP & Ucapan */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            6. Doa Penutup, Ucapan &amp; RSVP
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Closing &amp; Wishes</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Kutipan Doa / Narasi Penutup</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.closingQuote ?? currentDemoBlueprint?.closingQuote ?? ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, closingQuote: e.target.value })}
                            placeholder="Merupakan suatu kehormatan dan kebahagiaan bagi kami..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Salam Penutup / Tanda Hormat Keluarga</label>
                          <input
                            type="text"
                            value={demoStudioData.closingSub ?? currentDemoBlueprint?.closingSub ?? ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, closingSub: e.target.value })}
                            placeholder="Salam hangat dari keluarga besar..."
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi RSVP</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.rsvpTitle ?? currentDemoBlueprint?.rsvpTitle ?? "Konfirmasi Kehadiran & Doa"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.rsvpTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="RSVP & Doa"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Label Tombol RSVP</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.rsvpBtnText ?? currentDemoBlueprint?.rsvpBtnText ?? "Kirim Konfirmasi Kehadiran"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.rsvpBtnText = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Kirim Konfirmasi Kehadiran"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Ucapan</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.wishesTitle ?? currentDemoBlueprint?.wishesSectionTitle ?? "Ucapan & Doa Restu"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.wishesTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Ucapan & Doa Restu"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Ucapan</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.wishesSub ?? currentDemoBlueprint?.wishesSectionSub ?? ""}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.wishesSub = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Berikan doa & restu untuk kedua mempelai"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Panel: label yang juga dapat diubah klien di Studio undangan */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Label Lainnya</h4>
                          <span className="text-[10px] font-mono text-gray-400">customLabels</span>
                        </div>
                        <p className="text-[11px] text-gray-500">Kosongkan untuk memakai teks bawaan tema. Label yang tidak dipakai master tema ini tidak berpengaruh.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {DEMO_EXTRA_LABEL_FIELDS.map(({ key, label }) => (
                            <div key={key}>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">{label}</label>
                              <input
                                type="text"
                                value={demoStudioData.customLabels?.[key] ?? ""}
                                onChange={(e) => {
                                  const customLabels = { ...(demoStudioData.customLabels || {}) };
                                  if (e.target.value) customLabels[key] = e.target.value;
                                  else delete customLabels[key];
                                  setDemoStudioData({ ...demoStudioData, customLabels });
                                }}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
    </>
  );
}
