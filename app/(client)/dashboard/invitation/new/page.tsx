"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const THEMES = [
  { id: "kila", name: "Premium Kila", series: "Premium", desc: "Split-screen hero, photo slides, glass dock", premium: true },
  { id: "aruna", name: "Heritage Aruna", series: "Heritage", desc: "Wax seal 3D, kubah emas keraton, perkamen antik", premium: false },
  { id: "ivanna", name: "Premium Ivanna", series: "Premium", desc: "Strict CSS scroll snap 100vh, watermark Bodoni", premium: true },
  { id: "danila", name: "Premium Danila", series: "Premium", desc: "Video sutra bergerak, kelopak mawar, rose gold", premium: true },
  { id: "papercut", name: "Moody Papercut", series: "Moody", desc: "Scrapbook kertas kraft, stitch dashed, polaroid", premium: false },
];

export default function NewInvitation() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState([
    { type: "TRADITIONAL", name: "Traditional Series", price: 299000, features: ["Tema Prameswari, Aruna & Papercut", "Buku Tamu & WA Direct Link", "RSVP & Ucapan Tamu", "Musik Latar"] },
    { type: "MODERN", name: "Modern Series", price: 499000, features: ["Tema Kila, Ivanna, Danila", "Subdomain Custom", "Galeri Video Background", "Photobooth QR Session", "Tanpa Batas Tamu"] },
    { type: "PREMIUM", name: "Premium Series", price: 699000, features: ["Tema Kalandra, Valente, Aurelia, Artisan", "Full-Text Editorial & Luxury Motion", "Amplop Digital QRIS & Bank", "Bebas Ganti Seluruh Tema", "Akses VIP Priority"] },
  ]);

  const [form, setForm] = useState({
    groomName: "",
    brideName: "",
    invitationName: "wedding",
    themeId: "kila",
    planType: "PREMIUM",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.grouped?.pricing) {
          const p = data.grouped.pricing;
          setPlans([
            { type: "TRADITIONAL", name: p.name_traditional || "Traditional Series", price: Number(p.price_traditional || 299000), features: ["Tema Prameswari, Aruna & Papercut", "Buku Tamu & WA Direct Link", "RSVP & Ucapan Tamu", "Musik Latar"] },
            { type: "MODERN", name: p.name_modern || "Modern Series", price: Number(p.price_modern || 499000), features: ["Tema Kila, Ivanna, Danila", "Subdomain Custom", "Galeri Video Background", "Photobooth QR Session", "Tanpa Batas Tamu"] },
            { type: "PREMIUM", name: p.name_premium || "Premium Series", price: Number(p.price_premium || 699000), features: ["Tema Kalandra, Valente, Aurelia, Artisan", "Full-Text Editorial & Luxury Motion", "Amplop Digital QRIS & Bank", "Bebas Ganti Seluruh Tema", "Akses VIP Priority"] },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  const updateForm = (key: string, value: string) => setForm({ ...form, [key]: value });

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/client/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat undangan");
      }

      if (data.invitationId) {
        router.push(`/dashboard/invitation/${data.invitationId}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Buat Undangan Baru</h1>
        <p className="text-gray-500 text-sm mt-1">Langkah {step} dari 3 — Konfigurasi Dasar Undangan</p>
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-all ${
                s <= step ? "bg-amber-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Step 1: Data Mempelai */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">1. Data Nama Mempelai</h2>
            <p className="text-xs text-gray-500 mt-0.5">Nama ini akan digunakan untuk URL publik dan tampilan awal tema.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Panggilan Pria</label>
              <input
                type="text"
                value={form.groomName}
                onChange={(e) => updateForm("groomName", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm transition"
                placeholder="Contoh: Didan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Panggilan Wanita</label>
              <input
                type="text"
                value={form.brideName}
                onChange={(e) => updateForm("brideName", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm transition"
                placeholder="Contoh: Nasha"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Undangan (Slug Path)</label>
            <input
              type="text"
              value={form.invitationName}
              onChange={(e) => updateForm("invitationName", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm transition font-mono"
              placeholder="wedding"
            />
            {form.groomName && form.brideName && (
              <p className="text-xs text-amber-700 font-mono mt-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Link URL: /{slugify(form.groomName)}-{slugify(form.brideName)}/{slugify(form.invitationName || "wedding")}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!form.groomName || !form.brideName}
            className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-sm transition disabled:opacity-50 cursor-pointer"
          >
            Lanjut ke Pilihan Tema →
          </button>
        </div>
      )}

      {/* Step 2: Pilih Tema */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">2. Pilih Tema Desain Awal</h2>
            <p className="text-xs text-gray-500 mt-0.5">Anda bisa mengganti tema kapan saja setelah undangan dibuat.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {THEMES.map((t) => (
              <div
                key={t.id}
                onClick={() => updateForm("themeId", t.id)}
                className={`p-4 border-2 rounded-xl cursor-pointer transition ${
                  form.themeId === t.id
                    ? "border-amber-600 bg-amber-50 shadow-xs"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">{t.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.premium ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-800"}`}>
                    {t.series}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 text-sm transition"
            >
              ← Kembali
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-sm transition"
            >
              Lanjut ke Pilihan Paket →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pilih Paket */}
      {step === 3 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">3. Pilih Paket Lisensi</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pilih paket lisensi untuk undangan pernikahan Anda.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div
                key={p.type}
                onClick={() => updateForm("planType", p.type)}
                className={`p-5 border-2 rounded-2xl cursor-pointer transition flex flex-col justify-between ${
                  form.planType === p.type
                    ? "border-amber-600 bg-amber-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-gray-900">{p.name}</h3>
                    {p.type === "PREMIUM" && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">VIP / Rekomendasi</span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-amber-800 my-2">
                    Rp {p.price.toLocaleString("id-ID")}
                  </p>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 text-sm transition"
            >
              ← Kembali
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Membuat Studio...
                </>
              ) : (
                "✦ Selesai & Buka Studio Editor"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
