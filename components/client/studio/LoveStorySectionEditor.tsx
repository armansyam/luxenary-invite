"use client";

export interface StoryChapter {
  title?: string;
  date?: string;
  content?: string;
}

export function LoveStorySectionEditor({
  showStory,
  stories,
  storyTitle,
  eventType = "WEDDING",
  onToggleShowStory,
  onAddStory,
  onRemoveStory,
  onUpdateStoryItem,
  onUpdateStoryTitle,
  isDirty,
  saving,
  onSave,
}: {
  showStory: boolean;
  stories: StoryChapter[];
  storyTitle: string;
  eventType?: string;
  onToggleShowStory: (val: boolean) => void;
  onAddStory: () => void;
  onRemoveStory: (idx: number) => void;
  onUpdateStoryItem: (idx: number, field: "title" | "date" | "content", value: string) => void;
  onUpdateStoryTitle: (value: string) => void;
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const normEvent = (eventType || "WEDDING").toUpperCase();
  const sectionNoun =
    normEvent === "PERSONAL"
      ? "Kisah & Perjalanan Hidup"
      : normEvent === "EVENT"
      ? "Tonggak Perjalanan Acara"
      : "Kisah Cinta";
  const titlePlaceholder =
    normEvent === "PERSONAL"
      ? "Kisah & Perjalanan / Perjalanan Hidup / Jejak Langkah"
      : normEvent === "EVENT"
      ? "Tonggak Perjalanan / Riwayat & Milestone / Sejarah Kami"
      : "Kisah Cinta / Our Love Story / Perjalanan Kami";
  const chapterTitlePlaceholder =
    normEvent === "PERSONAL"
      ? "Contoh: Awal Menempuh Pendidikan / Masa Perjuangan / Sidang Akhir"
      : normEvent === "EVENT"
      ? "Contoh: Pendirian Komunitas / Ekspansi Cabang / Puncak Acara"
      : "Masukkan judul momen kisah cinta Anda";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-700">Tampilkan Seksi {sectionNoun}:</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={showStory}
            onClick={() => onToggleShowStory(!showStory)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              showStory ? "bg-amber-700" : "bg-stone-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                showStory ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          {showStory && (
            <button
              type="button"
              onClick={onAddStory}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              + Tambah Babak
            </button>
          )}
        </div>
      </div>

      {showStory && (
        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Judul Seksi {sectionNoun} (Bebas Kustom)
            </label>
            <input
              type="text"
              value={storyTitle}
              onChange={(e) => onUpdateStoryTitle(e.target.value)}
              placeholder={titlePlaceholder}
              className="w-full p-2.5 rounded-xl text-xs text-stone-900 border bg-stone-50 border-stone-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 transition"
            />
          </div>

          {stories.map((st, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">Chapter 0{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => onRemoveStory(idx)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                >
                  Hapus
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Judul Momen</label>
                  <input
                    type="text"
                    value={st.title || ""}
                    onChange={(e) => onUpdateStoryItem(idx, "title", e.target.value)}
                    placeholder={chapterTitlePlaceholder}
                    className="w-full p-2.5 rounded-xl text-xs text-stone-900 border bg-white border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/30 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Tahun / Tanggal</label>
                  <input
                    type="text"
                    value={st.date || ""}
                    onChange={(e) => onUpdateStoryItem(idx, "date", e.target.value)}
                    placeholder="2020"
                    className="w-full p-2.5 rounded-xl text-xs text-stone-900 border bg-white border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/30 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Cerita Singkat</label>
                <textarea
                  rows={2}
                  value={st.content || ""}
                  onChange={(e) => onUpdateStoryItem(idx, "content", e.target.value)}
                  placeholder="Tuliskan cerita singkat momen ini..."
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-stone-100 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !isDirty}
          className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
            !isDirty
              ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
              : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{!isDirty ? "Tersimpan" : `Simpan ${sectionNoun}`}</span>
        </button>
      </div>
    </div>
  );
}
