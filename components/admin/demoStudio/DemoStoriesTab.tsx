"use client";


import { useDemoStudio } from "@/components/admin/demoStudio/DemoStudioContext";

export function DemoStoriesTab() {
  const {
    demoStudioData,
    demoStudioTab,
    setDemoStudioData,
  } = useDemoStudio();

  return (
    <>
                  {/* TAB 3: LOVE STORIES & BANK ACCOUNTS */}
                  {demoStudioTab === "stories" && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              Kisah Cinta Demo (Love Story Chapters)
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Kelola bab alur cerita cinta yang ditampilkan pada demo tema ini.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const stories = [...(demoStudioData.stories || [])];
                              stories.push({
                                chapter: `Bab ${stories.length + 1}`,
                                title: "Momen Indah",
                                content: "",
                              });
                              setDemoStudioData({ ...demoStudioData, stories });
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Tambah Bab Cerita</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(demoStudioData.stories || []).length === 0 ? (
                            <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-400">
                              Belum ada bab cerita cinta. Klik &quot;Tambah Bab Cerita&quot; di atas untuk menambahkan.
                            </div>
                          ) : (
                            (demoStudioData.stories || []).map((story: any, sIdx: number) => (
                              <div key={sIdx} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                                  <span className="text-xs font-bold text-amber-900 font-mono">Bab {sIdx + 1}: {story.title || "Kisah"}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const stories = (demoStudioData.stories || []).filter((_: any, idx: number) => idx !== sIdx);
                                      setDemoStudioData({ ...demoStudioData, stories });
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition cursor-pointer"
                                  >
                                    Hapus Bab
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Label / Bab</label>
                                    <input
                                      type="text"
                                      value={story.chapter || ""}
                                      onChange={(e) => {
                                        const stories = [...(demoStudioData.stories || [])];
                                        stories[sIdx].chapter = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, stories });
                                      }}
                                      placeholder="Pertemuan / Lamaran"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Judul Bab</label>
                                    <input
                                      type="text"
                                      value={story.title || ""}
                                      onChange={(e) => {
                                        const stories = [...(demoStudioData.stories || [])];
                                        stories[sIdx].title = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, stories });
                                      }}
                                      placeholder="Langkah Awal"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Isi Cerita</label>
                                  <textarea
                                    rows={2}
                                    value={story.content || ""}
                                    onChange={(e) => {
                                      const stories = [...(demoStudioData.stories || [])];
                                      stories[sIdx].content = e.target.value;
                                      setDemoStudioData({ ...demoStudioData, stories });
                                    }}
                                    placeholder="Ceritakan momen indah perjalanan cinta..."
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white resize-none"
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Bank Accounts */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              Rekening Hadiah Digital Demo
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Kelola rekening bank atau dompet digital untuk fitur tanda kasih.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const banks = [...(demoStudioData.banks || [])];
                              banks.push({
                                bank: "BCA",
                                number: "",
                                name: demoStudioData.groomName || "Mempelai",
                              });
                              setDemoStudioData({ ...demoStudioData, banks });
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Tambah Rekening</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(demoStudioData.banks || []).length === 0 ? (
                            <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-400">
                              Belum ada rekening demo. Klik &quot;Tambah Rekening&quot; di atas.
                            </div>
                          ) : (
                            (demoStudioData.banks || []).map((bank: any, bIdx: number) => (
                              <div key={bIdx} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                                  <span className="text-xs font-bold text-amber-900 font-mono">Rekening {bIdx + 1}: {bank.bank || "Bank"}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const banks = (demoStudioData.banks || []).filter((_: any, idx: number) => idx !== bIdx);
                                      setDemoStudioData({ ...demoStudioData, banks });
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition cursor-pointer"
                                  >
                                    Hapus Rekening
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nama Bank / Wallet</label>
                                    <input
                                      type="text"
                                      value={bank.bank || ""}
                                      onChange={(e) => {
                                        const banks = [...(demoStudioData.banks || [])];
                                        banks[bIdx].bank = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, banks });
                                      }}
                                      placeholder="Bank BCA / Mandiri / BSI"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nomor Rekening</label>
                                    <input
                                      type="text"
                                      value={bank.number || ""}
                                      onChange={(e) => {
                                        const banks = [...(demoStudioData.banks || [])];
                                        banks[bIdx].number = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, banks });
                                      }}
                                      placeholder="8830192831"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Atas Nama (Pemilik)</label>
                                    <input
                                      type="text"
                                      value={bank.name || ""}
                                      onChange={(e) => {
                                        const banks = [...(demoStudioData.banks || [])];
                                        banks[bIdx].name = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, banks });
                                      }}
                                      placeholder="Raditya Pratama"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
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
