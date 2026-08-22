"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const THEMES = [
  { id: "heritage-aruna", name: "Heritage Aruna", series: "Heritage", premium: false },
  { id: "premium-ivanna", name: "Premium Ivanna", series: "Premium", premium: true },
  { id: "premium-kila", name: "Premium Kila", series: "Premium", premium: true },
  { id: "moody-papercut", name: "Moody Papercut", series: "Moody", premium: false },
  { id: "premium-danila", name: "Premium Danila", series: "Premium", premium: true },
];

const PLANS = [
  { type: "BASIC", name: "Basic", price: 99000, features: ["Slug URL", "Moody & Heritage", "WhatsApp RSVP"] },
  { type: "PREMIUM", name: "Premium", price: 199000, features: ["Subdomain Custom", "Semua Tema", "Video Background", "No Watermark"] },
];

export default function NewInvitation() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    groomName: "",
    brideName: "",
    invitationName: "Resepsi",
    themeId: "premium-kila",
    planType: "BASIC",
  });
  const [loading, setLoading] = useState(false);

  const updateForm = (key: string, value: string) => setForm({ ...form, [key]: value });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/client/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.invitationId) {
        router.push(`/dashboard/invitation/${data.invitationId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Buat Undangan Baru</h1>
        <p className="text-gray-600 mt-1">Langkah {step} dari 3</p>
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full ${
                s <= step ? "bg-amber-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Data Mempelai</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pengantin Pria</label>
              <input
                type="text"
                value={form.groomName}
                onChange={(e) => updateForm("groomName", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Adi Santoso"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pengantin Wanita</label>
              <input
                type="text"
                value={form.brideName}
                onChange={(e) => updateForm("brideName", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Irma Wijaya"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Undangan (slug)</label>
            <input
              type="text"
              value={form.invitationName}
              onChange={(e) => updateForm("invitationName", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Resepsi"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL: {slugify(form.groomName)}-{slugify(form.brideName)}.invited.id/{slugify(form.invitationName)}
            </p>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!form.groomName || !form.brideName}
            className="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
          >
            Lanjut
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Pilih Tema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {THEMES.map((t) => (
              <div
                key={t.id}
                onClick={() => updateForm("themeId", t.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  form.themeId === t.id
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">{t.name}</h3>
                  {t.premium && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      Premium
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{t.series} Series</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Kembali
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition"
            >
              Lanjut
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Pilih Paket</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLANS.map((p) => (
              <div
                key={p.type}
                onClick={() => updateForm("planType", p.type)}
                className={`p-5 border-2 rounded-xl cursor-pointer transition ${
                  form.planType === p.type
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <h3 className="text-lg font-bold text-gray-800">{p.name}</h3>
                <p className="text-2xl font-bold text-amber-700 my-2">
                  Rp {p.price.toLocaleString("id-ID")}
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Kembali
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
            >
              {loading ? "Membuat..." : "Buat Undangan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}