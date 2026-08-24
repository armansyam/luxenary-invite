"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getInvitationPublicUrl, getApexRootDomain } from "@/lib/domainUtils";

export default function SettingsPage() {
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingSec, setSavingSec] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subdomain Availability Check State
  const [subdomainStatus, setSubdomainStatus] = useState<{
    state: "idle" | "checking" | "available" | "unavailable" | "error";
    message: string;
  }>({ state: "idle", message: "" });

  const [editMode, setEditMode] = useState<Record<string, boolean>>({
    subdomain: false,
    status: false,
  });

  const [formData, setFormData] = useState({
    subdomain: "",
    status: "PUBLISHED",
  });

  // Real-time Subdomain Availability Checker
  useEffect(() => {
    if (!formData.subdomain || !invitation?.id) {
      setSubdomainStatus({ state: "idle", message: "" });
      return;
    }

    const clean = formData.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 3) {
      setSubdomainStatus({
        state: "unavailable",
        message: "Subdomain minimal terdiri dari 3 karakter.",
      });
      return;
    }

    setSubdomainStatus({ state: "checking", message: "Memeriksa ketersediaan..." });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/client/subdomain/check?subdomain=${encodeURIComponent(clean)}&invitationId=${invitation.id}`
        );
        const data = await res.json();
        if (data.available) {
          setSubdomainStatus({
            state: "available",
            message: data.message || "Subdomain tersedia dan dapat digunakan!",
          });
        } else {
          setSubdomainStatus({
            state: "unavailable",
            message: data.message || "Subdomain sudah digunakan pasangan lain.",
          });
        }
      } catch {
        setSubdomainStatus({
          state: "error",
          message: "Gagal memeriksa ketersediaan subdomain.",
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.subdomain, invitation?.id]);

  const toggleEdit = (key: string) => {
    setEditMode((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetch("/api/client/invitations")
      .then((res) => res.json())
      .then((invs) => {
        if (Array.isArray(invs) && invs.length > 0) {
          const inv = invs[0];
          setInvitation(inv);

          setFormData({
            subdomain: inv.subdomain || `${inv.groomSlug || "didan"}-${inv.brideSlug || "nasha"}`,
            status: inv.status || "PUBLISHED",
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg("Gagal memuat pengaturan undangan");
        setLoading(false);
      });
  }, []);

  // Independent Section Save Handler
  const handleSaveSection = async (secKey: string) => {
    if (!invitation?.id || savingSec) return;
    setSavingSec(secKey);
    setErrorMsg(null);

    try {
      // Construct clean payload (exclude prisma relations)
      const { media, user, order, guests, rsvps, wishes, boothSessions, ...cleanInvitation } = invitation;

      const payload = {
        ...cleanInvitation,
        subdomain: formData.subdomain ? formData.subdomain.trim().toLowerCase() : null,
        status: formData.status,
      };

      const res = await fetch(`/api/client/invitations/${invitation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json();
        setInvitation((prev: any) => ({ ...prev, ...savedData }));
        setEditMode((prev) => ({ ...prev, [secKey]: false }));
        setSaveSuccess((prev) => ({ ...prev, [secKey]: true }));
        setTimeout(() => {
          setSaveSuccess((prev) => ({ ...prev, [secKey]: false }));
        }, 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMsg(errJson.error || "Gagal memperbarui pengaturan");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan pengaturan");
    } finally {
      setSavingSec(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-medium">Memuat Pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-amber-800 uppercase block">Konfigurasi Sistem</span>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Pengaturan Domain &amp; Publikasi
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola tautan subdomain unik, aksesibilitas tautan publik, dan status visibilitas undangan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${formData.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {formData.status === 'PUBLISHED' ? '● Aktif (Published)' : '● Draft (Penyusunan)'}
          </span>
        </div>
      </div>

      {/* Banner Pintas ke Edit Undangan */}
      <div className="p-5 sm:p-6 bg-amber-50/60 border border-amber-200/80 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h3 className="text-xs sm:text-sm font-bold text-amber-950">Ingin Mengubah Konten &amp; Desain Undangan?</h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed max-w-xl">
            Pengaturan musik latar, foto sampul, galeri pre-wedding, profil mempelai, rangkaian acara, rekening amplop, dresscode, dan live streaming kini terpusat lengkap di studio <strong>Edit Undangan</strong>.
          </p>
        </div>
        <Link
          href={invitation?.id ? `/dashboard/invitation/${invitation.id}` : "/dashboard/invitation"}
          className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>Buka Edit Undangan</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* CARD 1: SUBDOMAIN */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Alamat Tautan Subdomain</h3>
            <p className="text-xs text-stone-500">Tentukan alamat URL eksklusif undangan pernikahan Anda</p>
          </div>
          <button
            type="button"
            onClick={() => toggleEdit("subdomain")}
            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            {editMode.subdomain ? "Tutup" : "Edit"}
          </button>
        </div>

        {!editMode.subdomain ? (
          /* Summary Mode */
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Tautan Aktif:</span>
              <a
                href={getInvitationPublicUrl(formData.subdomain || "didan-nasha")}
                target="_blank"
                rel="noreferrer"
                className="text-xs sm:text-sm font-mono font-bold text-amber-900 hover:underline break-all"
              >
                {getInvitationPublicUrl(formData.subdomain || "didan-nasha")}
              </a>
            </div>
            <button
              type="button"
              onClick={() => toggleEdit("subdomain")}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
            >
              Ubah Tautan
            </button>
          </div>
        ) : (
          /* Form Edit Mode */
          <div className="space-y-4 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-stone-700">Nama Subdomain</label>
                {/* Live Availability Badge */}
                {subdomainStatus.state === "checking" && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                    <span>Memeriksa...</span>
                  </span>
                )}
                {subdomainStatus.state === "available" && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <span>✓</span>
                    <span>Tersedia</span>
                  </span>
                )}
                {subdomainStatus.state === "unavailable" && (
                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                    <span>✕</span>
                    <span>Sudah dipakai</span>
                  </span>
                )}
              </div>

              <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 overflow-hidden focus-within:border-amber-700 focus-within:ring-2 focus-within:ring-amber-700/20">
                <span className="pl-3.5 pr-1 text-xs text-stone-400 font-mono select-none">
                  {typeof window !== "undefined" && window.location.protocol === "http:" ? "http://" : "https://"}
                </span>
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    setFormData({ ...formData, subdomain: val });
                  }}
                  placeholder="nasha-didan"
                  className="flex-1 py-3 px-1 text-xs text-stone-900 font-mono font-bold bg-transparent focus:outline-none"
                />
                <span className="pr-3.5 pl-1 text-xs text-stone-400 font-mono select-none">.{getApexRootDomain()}</span>
              </div>

              {subdomainStatus.message && (
                <p className={`text-[10px] mt-1.5 ${subdomainStatus.state === 'available' ? 'text-emerald-700' : subdomainStatus.state === 'unavailable' ? 'text-rose-600' : 'text-stone-500'}`}>
                  {subdomainStatus.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {saveSuccess.subdomain && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  ✓ Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("subdomain")}
                disabled={savingSec === "subdomain" || subdomainStatus.state === "unavailable" || subdomainStatus.state === "checking"}
                className={`px-5 py-2 font-bold rounded-xl text-xs transition flex items-center gap-1.5 ${
                  subdomainStatus.state === "unavailable" || subdomainStatus.state === "checking"
                    ? "bg-stone-200 text-stone-400 border border-stone-300 cursor-not-allowed"
                    : "bg-stone-900 hover:bg-stone-800 text-white cursor-pointer"
                }`}
              >
                {savingSec === "subdomain" ? "Menyimpan..." : "Simpan Subdomain"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: PUBLICATION STATUS */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Status Publikasi Undangan</h3>
            <p className="text-xs text-stone-500">Atur apakah undangan dapat diakses publik atau masih dalam penyusunan</p>
          </div>
          <button
            type="button"
            onClick={() => toggleEdit("status")}
            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            {editMode.status ? "Tutup" : "Edit"}
          </button>
        </div>

        {!editMode.status ? (
          /* Summary Mode */
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Status Saat Ini:</span>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${formData.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {formData.status === 'PUBLISHED' ? '● Aktif (Dapat Diakses Tamu)' : '● Draft (Hanya Pemilik)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleEdit("status")}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
            >
              Ubah Status
            </button>
          </div>
        ) : (
          /* Form Edit Mode */
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${formData.status === 'PUBLISHED' ? 'border-amber-700 bg-amber-50/50' : 'border-stone-200 bg-stone-50'}`}>
                <input
                  type="radio"
                  name="status"
                  value="PUBLISHED"
                  checked={formData.status === "PUBLISHED"}
                  onChange={() => setFormData({ ...formData, status: "PUBLISHED" })}
                  className="mt-0.5 text-amber-800 focus:ring-amber-800"
                />
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Publikasikan (Published)</span>
                  <span className="text-[11px] text-stone-500">Tautan undangan dapat dibuka dan diakses oleh tamu undangan</span>
                </div>
              </label>

              <label className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${formData.status === 'DRAFT' ? 'border-amber-700 bg-amber-50/50' : 'border-stone-200 bg-stone-50'}`}>
                <input
                  type="radio"
                  name="status"
                  value="DRAFT"
                  checked={formData.status === "DRAFT"}
                  onChange={() => setFormData({ ...formData, status: "DRAFT" })}
                  className="mt-0.5 text-amber-800 focus:ring-amber-800"
                />
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Simpan sebagai Draft</span>
                  <span className="text-[11px] text-stone-500">Undangan sedang dalam proses pengisian dan belum dibuka untuk umum</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {saveSuccess.status && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  ✓ Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("status")}
                disabled={savingSec === "status"}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingSec === "status" ? "Menyimpan..." : "Simpan Status"}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
