"use client";

interface QuotePreset {
  label: string;
  quote: string;
  ref: string;
  title: string;
}

const QUOTE_PRESETS: QuotePreset[] = [
  {
    label: "Islam — QS. Ar-Rum : 21",
    quote:
      "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.",
    ref: "QS. AR-RUM : 21",
    title: "Pappaseng & Doa",
  },
  {
    label: "Kristen — 1 Korintus 13:4-7",
    quote:
      "Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong. Ia menutupi segala sesuatu, percaya segala sesuatu, mengharapkan segala sesuatu, sabar menanggung segala sesuatu.",
    ref: "1 KORINTUS 13 : 4-7",
    title: "Ayat Suci & Doa",
  },
  {
    label: "Kristen — Kejadian 2:24",
    quote:
      "Sebab itu seorang laki-laki akan meninggalkan ayahnya dan ibunya dan bersatu dengan isterinya, sehingga keduanya menjadi satu daging.",
    ref: "KEJADIAN 2 : 24",
    title: "Pemberkatan & Doa",
  },
  {
    label: "Hindu — Rgveda X.85.42",
    quote:
      "Semoga kedua mempelai ini tetap bersatu, semoga panjang umur dan menikmati kebahagiaan bersama anak cucu, bersukacita dalam rumah tangga mereka sendiri.",
    ref: "RGVEDA X.85.42",
    title: "Doa & Sloka",
  },
  {
    label: "Buddha — Mangala Sutta",
    quote:
      "Saling menghormati dan hidup dalam keselarasan, saling mendukung dalam kebajikan dan kebijaksanaan, itulah berkah utama dalam hidup berumah tangga.",
    ref: "MANGALA SUTTA",
    title: "Berkah & Doa",
  },
  {
    label: "Sastra — Sapardi Djoko Damono",
    quote:
      "Aku ingin mencintaimu dengan sederhana: dengan kata yang tak sempat diucapkan kayu kepada api yang menjadikannya abu. Aku ingin mencintaimu dengan sederhana: dengan isyarat yang tak sempat disampaikan awan kepada hujan yang menjadikannya tiada.",
    ref: "SAPARDI DJOKO DAMONO",
    title: "Kutipan Puisi",
  },
  {
    label: "Sastra — Kahlil Gibran",
    quote:
      "Kalian diciptakan bersama, dan kalian akan selamanya bersama. Berdirilah bersama, namun jangan terlampau rapat; sebab pilar-pilar kuil tegak terpisah, dan pohon tarbantin maupun pohon fir tidak tumbuh dalam naungan satu sama lain.",
    ref: "KAHLIL GIBRAN — SANG NABI",
    title: "Kutipan Cinta",
  },
  {
    label: "Universal — Janji Suci",
    quote:
      "Dan jika aku harus memilih kembali dalam seratus kehidupan, dalam seratus dunia, dalam versi realitas apa pun, aku akan tetap mencari dan memilih dirimu.",
    ref: "OUR SACRED PROMISE",
    title: "Janji Suci & Harapan",
  },
];

const GREETING_PRESETS = [
  { label: "بِسْمِ اللَّهِ (Arab)", value: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
  { label: "Bismillah (Latin)", value: "Bismillahir Rahmanir Rahim" },
  { label: "Salam Sejahtera", value: "Salam Sejahtera & Penuh Berkat" },
  { label: "Om Swastiastu", value: "Om Swastiastu" },
];

export function QuotesSectionEditor({
  openingQuote,
  openingQuoteRef,
  activeBlueprint,
  getCustomLabel,
  updateField,
  updateCustomLabel,
  isDirty,
  saving,
  onSave,
}: {
  openingQuote: string;
  openingQuoteRef: string;
  activeBlueprint: {
    openingGreeting?: string;
    openingQuoteRef?: string;
    quoteSectionEyebrow?: string;
    quoteSectionTitle?: string;
  } | null;
  getCustomLabel: (key: string, fallback?: string) => string;
  updateField: (field: string, value: string) => void;
  updateCustomLabel: (key: string, value: string) => void;
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-stone-700 mb-2">
          Pilih Preset Cepat (Ayat Suci, Puisi, atau Kata Mutiara):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {QUOTE_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                updateField("openingQuote", p.quote);
                updateField("openingQuoteRef", p.ref);
                updateCustomLabel("quoteTitle", p.title);
              }}
              className="text-left p-2.5 bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-xl text-[11px] font-semibold text-stone-800 hover:text-amber-950 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-stone-100 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <label className="block text-xs font-bold text-stone-700">
              Salam Pembuka / Doa Awal (Greeting)
            </label>
            <p className="text-[11px] text-stone-500">
              Tampil di atas kutipan doa. Bebas dipilih sesuai agama/adat atau dikosongkan.
            </p>
          </div>
          <span className="text-[11px] text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 self-start sm:self-auto">
            Opsional
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {GREETING_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => updateCustomLabel("openingGreeting", preset.value)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => updateCustomLabel("openingGreeting", "")}
            className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
            title="Kosongkan salam pembuka (tidak menampilkan tulisan Arab atau salam apapun)"
          >
            Hapus / Tanpa Salam
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Teks Salam Pembuka Kustom</label>
          <input
            type="text"
            value={getCustomLabel("openingGreeting", activeBlueprint?.openingGreeting || "")}
            onChange={(e) => updateCustomLabel("openingGreeting", e.target.value)}
            placeholder="بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ / Salam Sejahtera / Kosongkan jika tidak diinginkan"
            className="w-full p-2.5 rounded-xl text-xs text-stone-900 border bg-stone-50 border-stone-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Subjudul / Eyebrow Seksi</label>
          <input
            type="text"
            value={getCustomLabel("quoteEyebrow", activeBlueprint?.quoteSectionEyebrow || "")}
            onChange={(e) => updateCustomLabel("quoteEyebrow", e.target.value)}
            placeholder={activeBlueprint?.quoteSectionEyebrow || "WALIMATUL 'URSY / THE SACRED UNION"}
            className="w-full p-2.5 rounded-xl text-xs text-stone-900 border bg-stone-50 border-stone-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Judul Seksi (Bebas Kustom)</label>
          <input
            type="text"
            value={getCustomLabel("quoteTitle", activeBlueprint?.quoteSectionTitle || "Kutipan & Doa")}
            onChange={(e) => updateCustomLabel("quoteTitle", e.target.value)}
            placeholder={activeBlueprint?.quoteSectionTitle || "Kutipan Cinta / Kata Mutiara / Pappaseng / Ayat Suci"}
            className="w-full p-2.5 rounded-xl text-xs text-stone-900 border bg-stone-50 border-stone-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 transition"
          />
        </div>
      </div>

      <div className="pt-2">
        <label className="block text-xs font-bold text-stone-700 mb-1">Referensi Sumber Kutipan</label>
        <input
          type="text"
          value={openingQuoteRef}
          onChange={(e) => updateField("openingQuoteRef", e.target.value)}
          placeholder={activeBlueprint?.openingQuoteRef || "QS. AR-RUM : 21 / SAPARDI DJOKO DAMONO / OUR SACRED PROMISE"}
          className="w-full p-2.5 rounded-xl text-xs text-stone-900 border bg-stone-50 border-stone-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 transition"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-stone-700 mb-1">Teks Kutipan / Puisi / Doa</label>
        <textarea
          rows={3}
          value={openingQuote}
          onChange={(e) => updateField("openingQuote", e.target.value)}
          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 leading-relaxed"
          placeholder="Tuliskan teks kutipan indah, puisi cinta, ayat, atau doa pembuka di sini..."
        />
      </div>

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
          <span>{!isDirty ? "Tersimpan" : "Simpan Kutipan"}</span>
        </button>
      </div>
    </div>
  );
}
