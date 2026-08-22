"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface MediaSlot {
  slot: string;
  label: string;
  description: string;
}

const MEDIA_SLOTS: MediaSlot[] = [
  { slot: "LANDING_COVER", label: "Landing Cover", description: "Foto pembuka undangan (modal overlay)" },
  { slot: "DESKTOP_SIDEBAR", label: "Desktop Sidebar", description: "Foto kolom kiri desktop" },
  { slot: "GLOBAL_FIXED_BG", label: "Background Global", description: "Background tetap di belakang konten" },
  { slot: "GROOM_PHOTO", label: "Foto Mempelai Pria", description: "Foto khusus section groom" },
  { slot: "BRIDE_PHOTO", label: "Foto Mempelai Wanita", description: "Foto khusus section bride" },
  { slot: "GALLERY", label: "Gallery", description: "Foto-foto tambahan" },
];

export default function EditInvitation() {
  const params = useParams();
  const invitationId = params.id as string;

  const [invitation, setInvitation] = useState<any>(null);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/client/invitations/${invitationId}`).then((r) => r.json()),
      fetch(`/api/client/media/${invitationId}`).then((r) => r.json()),
    ])
      .then(([inv, med]) => {
        setInvitation(inv);
        setMedia(med || {});
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [invitationId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/client/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invitation),
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setInvitation((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="text-center py-12">Memuat...</div>;
  if (!invitation) return <div className="text-center py-12">Undangan tidak ditemukan</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          {invitation.groomName} & {invitation.brideName}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      {/* Basic Info */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Informasi Dasar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nama Panggilan Pria" value={invitation.groomNickname || ""} onChange={(v) => updateField("groomNickname", v)} />
          <Input label="Nama Panggilan Wanita" value={invitation.brideNickname || ""} onChange={(v) => updateField("brideNickname", v)} />
          <Input label="Orang Tua Pria" value={invitation.groomParents || ""} onChange={(v) => updateField("groomParents", v)} />
          <Input label="Orang Tua Wanita" value={invitation.brideParents || ""} onChange={(v) => updateField("brideParents", v)} />
          <Input label="Instagram Pria" value={invitation.groomInstagram || ""} onChange={(v) => updateField("groomInstagram", v)} />
          <Input label="Instagram Wanita" value={invitation.brideInstagram || ""} onChange={(v) => updateField("brideInstagram", v)} />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Opening Quote</label>
          <textarea
            value={invitation.openingQuote || ""}
            onChange={(e) => updateField("openingQuote", e.target.value)}
            rows={2}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Opening Quote Ref</label>
          <input
            type="text"
            value={invitation.openingQuoteRef || ""}
            onChange={(e) => updateField("openingQuoteRef", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            placeholder="QS. Ar-Rum: 21"
          />
        </div>
      </section>

      {/* Media Slots */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Media Slots</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MEDIA_SLOTS.map((slot) => (
            <div key={slot.slot} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-800">{slot.label}</h3>
                <span className="text-xs text-gray-500">{slot.slot}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{slot.description}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={media[slot.slot] || ""}
                  onChange={(e) => setMedia({ ...media, [slot.slot]: e.target.value })}
                  className="flex-1 p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="URL Google Drive / path"
                />
                {media[slot.slot] && (
                  <img src={media[slot.slot]} alt="" className="w-12 h-12 object-cover rounded" />
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            fetch(`/api/client/media/${invitationId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(media),
            });
          }}
          className="mt-4 px-5 py-2.5 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition"
        >
          Simpan Media
        </button>
      </section>

      {/* Feature Toggles */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Fitur Toggles</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["audio", "countdown", "rsvp", "gallery", "angpao", "livestream", "dresscode"].map((feature) => {
            const enabled = invitation.featureSettings?.[feature] ?? true;
            return (
              <button
                key={feature}
                onClick={() =>
                  updateField("featureSettings", {
                    ...invitation.featureSettings,
                    [feature]: !enabled,
                  })
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                  enabled
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                {feature.charAt(0).toUpperCase() + feature.slice(1)}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
      />
    </div>
  );
}