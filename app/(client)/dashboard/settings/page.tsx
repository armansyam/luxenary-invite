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
    staffPin: false,
  });

  // WOW Publish UI State
  const [publishState, setPublishState] = useState<'idle' | 'baking' | 'success'>('idle');
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishMessage, setPublishMessage] = useState("");

  const [formData, setFormData] = useState({
    subdomain: "",
    status: "PUBLISHED",
    staffPin: "",
  });

  const [isPublishAcknowledged, setIsPublishAcknowledged] = useState(false);

  // Custom Domain State
  const [customDomain, setCustomDomain] = useState("");
  const [savingCustomDomain, setSavingCustomDomain] = useState(false);
  const [customDomainSuccess, setCustomDomainSuccess] = useState(false);
  const [customDomainError, setCustomDomainError] = useState<string | null>(null);
  const [showDnsGuide, setShowDnsGuide] = useState(false);
  const [platformName, setPlatformName] = useState("");
  const [cnameTarget, setCnameTarget] = useState("invite.platform-anda.id");
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [isDomainOwned, setIsDomainOwned] = useState(false);
  const [customDomainPrice, setCustomDomainPrice] = useState(150000);

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

  const isGroomValid = !!invitation?.groomName && !invitation.groomName.startsWith("Mempelai Pria");
  const isBrideValid = !!invitation?.brideName && !invitation.brideName.startsWith("Mempelai Wanita");
  const isEventValid = (() => {
    try {
      const ev = JSON.parse(invitation?.eventData || "[]");
      return Array.isArray(ev) && ev.length > 0 && !!ev[0].date && !!ev[0].location;
    } catch { return false; }
  })();
  const isPinValid = !!invitation?.staffPin && invitation.staffPin.length >= 4;
  const isSubdomainValid = !!invitation?.subdomain;

  const isPublishable = isGroomValid && isBrideValid && isEventValid && isPinValid && isSubdomainValid;

  useEffect(() => {
    fetch("/api/client/invitations")
      .then((res) => res.json())
      .then(async (invs) => {
        if (Array.isArray(invs) && invs.length > 0) {
          const invBasic = invs[0];
          setInvitation(invBasic);
          setCustomDomain(invBasic.customDomain || "");

          // Ambil staffPin dari endpoint individual yang mendekripsi PIN (ownership check di server)
          let currentPin = "";
          if (invBasic.id) {
            try {
              const detailRes = await fetch(`/api/client/invitations/${invBasic.id}`);
              if (detailRes.ok) {
                const detail = await detailRes.json();
                currentPin = detail.staffPin || "";
                // Update invitation state dengan detail lengkap termasuk PIN
                setInvitation(detail);
              }
            } catch {}
          }

          setFormData({
            subdomain: invBasic.subdomain || "",
            status: invBasic.status || "DRAFT",
            staffPin: currentPin,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg("Gagal memuat pengaturan undangan");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch("/api/public/settings").then(r => r.json()).then(d => {
      if (d?.platformName) setPlatformName(d.platformName);
      if (d?.cnameTarget) setCnameTarget(d.cnameTarget);
      if (d?.addon_custom_domain_price) setCustomDomainPrice(Number(d.addon_custom_domain_price) || 150000);
    }).catch(() => {});
  }, []);

  // Independent Section Save Handler
  const handleSaveSection = async (secKey: string) => {
    if (!invitation?.id || savingSec) return;

    // WOW UI Intercept for Publishing
    if (secKey === "status" && formData.status === "PUBLISHED" && invitation.status !== "PUBLISHED") {
      setPublishState('baking');
      setPublishProgress(0);
      setPublishMessage("Menginisialisasi Mesin Rendering...");
      
      // Simulate progress stages
      const stages = [
        { p: 25, msg: "Mengunci Modul Desain & Komponen..." },
        { p: 50, msg: "Meracik Seluruh Data Kustomisasi..." },
        { p: 75, msg: "Mengoptimalkan Performa & SEO..." },
        { p: 95, msg: "Memanggang HTML Statis (Zero-Flicker)..." }
      ];
      
      let step = 0;
      const progressInterval = setInterval(() => {
        if (step < stages.length) {
          setPublishProgress(stages[step].p);
          setPublishMessage(stages[step].msg);
          step++;
        }
      }, 800);

      try {
        const { media, user, order, guests, rsvps, wishes, ...cleanInvitation } = invitation;
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
          
          setTimeout(() => {
            clearInterval(progressInterval);
            setPublishProgress(100);
            setPublishMessage("Undangan Anda Telah Mengudara!");
            setPublishState('success');
            
            setTimeout(() => {
              setPublishState('idle');
            }, 3000);
          }, stages.length * 800 + 500);
          return;
        } else {
          throw new Error("Gagal mempublikasikan undangan");
        }
      } catch (err: any) {
        clearInterval(progressInterval);
        setPublishState('idle');
        setErrorMsg(err.message || "Terjadi kesalahan saat mempublikasikan");
        return;
      }
    }

    setSavingSec(secKey);
    setErrorMsg(null);

    try {
      // Construct clean payload (exclude prisma relations)
      const { media, user, order, guests, rsvps, wishes, ...cleanInvitation } = invitation;

      const payload = {
        ...cleanInvitation,
        subdomain: formData.subdomain ? formData.subdomain.trim().toLowerCase() : null,
        status: formData.status,
        ...(secKey === "staffPin" ? { staffPin: formData.staffPin } : {})
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
          <span className={`text-[11px] font-bold flex items-center gap-1.5 ${formData.status === 'PUBLISHED' ? 'text-emerald-700' : 'text-stone-500'}`}>
            {formData.status === 'PUBLISHED' ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aktif (Published)</> : <><span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span> Draft (Penyusunan)</>}
          </span>
        </div>
      </div>

      {/* Banner Pintas ke Edit Undangan */}
      <div className="p-5 sm:p-6 bg-amber-50/60 border border-amber-200/80 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4 5 5 0 0110 0 4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
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
          <span className="font-bold">Buka Edit Undangan</span>
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
                href={getInvitationPublicUrl(formData.subdomain || "mempelai-pria-wanita")}
                target="_blank"
                rel="noreferrer"
                className="text-xs sm:text-sm font-mono font-bold text-amber-900 hover:underline break-all"
              >
                {getInvitationPublicUrl(formData.subdomain || "mempelai-pria-wanita")}
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
                    <span>Tersedia</span>
                  </span>
                )}
                {subdomainStatus.state === "unavailable" && (
                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
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
                  placeholder="mempelai-wanita-pria"
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
                  Tersimpan
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
              <span className={`inline-block mt-1 text-[11px] font-bold flex items-center gap-1.5 ${formData.status === 'PUBLISHED' ? 'text-emerald-700' : 'text-stone-500'}`}>
                {formData.status === 'PUBLISHED' ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Dapat Diakses Tamu</> : <><span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span> Hanya Pemilik (Draft)</>}
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
          <div className="space-y-4 pt-1">
            {!isPublishable && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl mb-4">
                <h4 className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-2">
                  <span>⚠️</span> Syarat Publikasi Belum Terpenuhi
                </h4>
                <ul className="text-[11px] text-rose-700 space-y-1 ml-6 list-disc">
                  {!isSubdomainValid && <li>Tautan (Subdomain) belum diatur.</li>}
                  {(!isGroomValid || !isBrideValid) && <li>Nama Mempelai masih kosong/default (ubah di Menu Utama).</li>}
                  {!isEventValid && <li>Data Acara belum lengkap (ubah di menu Jadwal).</li>}
                  {!isPinValid && <li>PIN Keamanan Panitia belum diatur (lihat di bawah).</li>}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className={`p-4 rounded-xl border transition flex items-start gap-3 ${!isPublishable ? 'opacity-50 cursor-not-allowed bg-stone-50 border-stone-200' : formData.status === 'PUBLISHED' ? 'border-amber-700 bg-amber-50/50 cursor-pointer' : 'border-stone-200 bg-stone-50 cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="status"
                    value="PUBLISHED"
                    disabled={!isPublishable}
                    checked={formData.status === "PUBLISHED" && isPublishable}
                    onChange={() => setFormData({ ...formData, status: "PUBLISHED" })}
                    className="mt-0.5 text-amber-800 focus:ring-amber-800"
                  />
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">Publikasikan (Published)</span>
                    <span className="text-[11px] text-stone-500">Tautan undangan dapat dibuka dan diakses oleh tamu undangan.</span>
                  </div>
                </label>
                
                {formData.status === "PUBLISHED" && (
                  <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-lg space-y-3">
                    <div>
                      <h5 className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        PERHATIAN SEBELUM SIMPAN
                      </h5>
                      <ul className="text-[10px] text-rose-700 space-y-1 list-disc ml-4">
                        <li><strong>Tema Undangan</strong> akan terkunci permanen dan tidak bisa diganti (Hanya Admin yang dapat mengganti tema).</li>
                        <li><strong>Mengubah Tautan (Subdomain)</strong> setelah ini sangat berisiko membuat QR Code di cetakan/undangan fisik Anda menjadi mati (404 Not Found).</li>
                      </ul>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer p-2 bg-rose-100/50 rounded-md border border-rose-200/50 hover:bg-rose-100 transition">
                      <input 
                        type="checkbox" 
                        className="mt-0.5 text-rose-600 focus:ring-rose-500 rounded-sm cursor-pointer"
                        checked={isPublishAcknowledged}
                        onChange={(e) => setIsPublishAcknowledged(e.target.checked)}
                      />
                      <span className="text-[10px] text-rose-800 font-medium leading-relaxed">Saya memahami aturan di atas dan siap mempublikasikan undangan ini.</span>
                    </label>
                  </div>
                )}
              </div>

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
                  Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("status")}
                disabled={savingSec === "status" || (formData.status === "PUBLISHED" && !isPublishAcknowledged)}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSec === "status" ? "Menyimpan..." : "Simpan Status"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD 3: SECURITY PIN */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">PIN Keamanan Panitia</h3>
            <p className="text-xs text-stone-500">Sandi rahasia (6 karakter) untuk mengakses Resepsionis, Booth, dan Proyektor</p>
          </div>
          <button
            type="button"
            onClick={() => toggleEdit("staffPin")}
            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            {editMode.staffPin ? "Tutup" : "Edit"}
          </button>
        </div>

        {!editMode.staffPin ? (
          /* Summary Mode */
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">PIN Saat Ini:</span>
              <span className="inline-block mt-1 text-lg font-mono font-black tracking-widest text-amber-900">
                {formData.staffPin}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleEdit("staffPin")}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
            >
              Ubah PIN
            </button>
          </div>
        ) : (
          /* Form Edit Mode */
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">Masukkan PIN Baru</label>
              <input
                type="text"
                maxLength={10}
                value={formData.staffPin}
                onChange={(e) => setFormData({ ...formData, staffPin: e.target.value })}
                placeholder="Contoh: 123456"
                className="w-full py-3 px-4 rounded-xl border border-stone-200 bg-stone-50 text-sm font-mono font-bold focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 transition"
              />
              <p className="text-[10px] mt-1.5 text-stone-500">
                Bisa berupa angka atau huruf. Akan diminta saat membuka link fitur operasional.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {saveSuccess.staffPin && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("staffPin")}
                disabled={savingSec === "staffPin" || !formData.staffPin}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingSec === "staffPin" ? "Menyimpan..." : "Simpan PIN"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──────── CUSTOM DOMAIN ──────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900 leading-tight">Domain Sendiri</h2>
            <p className="text-[11px] text-stone-400 mt-0.5">Gunakan domain pribadi Anda (mis. undangan-kami.com) sebagai pengganti subdomain {platformName || "platform kami"}.</p>
          </div>
          <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Premium</span>
        </div>

        {/* Panduan DNS */}
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDnsGuide((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition cursor-pointer"
          >
            <span className="text-xs font-bold text-stone-700">Cara setup — 3 langkah mudah</span>
            <svg
              className={`w-4 h-4 text-stone-400 transition-transform ${showDnsGuide ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDnsGuide && (
            <div className="px-4 pb-4 space-y-3 border-t border-stone-100 pt-3 bg-stone-50/50">
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Setelah membeli domain di registrar (Niagahoster, Namecheap, Domainesia, dll), ikuti langkah berikut:
              </p>

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-xs font-bold text-stone-800">Login ke panel DNS domain Anda</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Buka bagian DNS Management / DNS Zone di registrar tempat Anda membeli domain.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-xs font-bold text-stone-800">Tambah record CNAME berikut:</p>
                  <div className="mt-2 rounded-lg overflow-hidden border border-stone-200 text-[11px] font-mono">
                    <div className="grid grid-cols-3 bg-stone-100 px-3 py-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      <span>Type</span><span>Host / Name</span><span>Value / Target</span>
                    </div>
                    <div className="grid grid-cols-3 px-3 py-2.5 bg-white text-stone-800 gap-1">
                      <span className="font-bold text-amber-700">CNAME</span>
                      <span>@ <span className="text-stone-400">(atau www)</span></span>
                      <span className="break-all">{cnameTarget}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">Jika tidak bisa pakai @, tambahkan juga record <strong>A</strong> dengan IP server kami. Hubungi Admin untuk mendapatkan IP.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-xs font-bold text-stone-800">Daftarkan domain di bawah ini & hubungi Admin</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Setelah DNS propagasi (biasanya 5–30 menit), isi field domain di bawah dan simpan. Lalu kirim pesan ke Admin agar SSL-nya diaktifkan.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  <strong>Propagasi DNS</strong> bisa memakan waktu hingga 48 jam tergantung registrar, namun biasanya selesai dalam 5–30 menit.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input domain */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-stone-700">Domain Anda</label>
          <div className="space-y-3">
            {!showBuyModal ? (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Integrasikan Domain Pribadi Anda</h4>
                  <p className="text-[11px] text-amber-700/80 mt-1">Punya domain sendiri dari Niagahoster/lainnya? Kami bantu pasangkan ke undangan ini (Gratis SSL & Perpanjangan Aktif 1 Tahun). Biaya Jasa Integrasi: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(customDomainPrice)}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBuyModal(true)}
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition whitespace-nowrap"
                >
                  Pesan Jasa Integrasi
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-2">
                  <h5 className="text-red-800 font-bold text-xs mb-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    PENTING: BUKAN PENDAFTARAN DOMAIN BARU
                  </h5>
                  <p className="text-red-700 text-[11px] leading-relaxed">
                    Sistem <b>TIDAK</b> akan mendaftarkan domain baru untuk Anda. Kami hanya menyambungkan domain yang <b>SUDAH ANDA BELI SENDIRI</b> dari registrar (Niagahoster, Rumahweb, dll) ke server undangan ini. Jangan memesan layanan ini jika Anda belum memiliki domain.
                  </p>
                </div>
                
                <label className="block text-[11px] font-bold text-stone-700">Masukkan Nama Domain Anda (Contoh: budi-ani.com)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => {
                      setCustomDomain(e.target.value.toLowerCase().replace(/\s/g, ""));
                      setCustomDomainError(null);
                    }}
                    placeholder="contoh: undangan-kami.com"
                    className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 bg-white text-sm font-mono focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 transition"
                  />
                </div>
                
                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-stone-200">
                  <input 
                    type="checkbox" 
                    id="confirm-domain" 
                    className="mt-0.5 rounded text-amber-700 focus:ring-amber-700 cursor-pointer"
                    checked={isDomainOwned}
                    onChange={(e) => setIsDomainOwned(e.target.checked)}
                  />
                  <label htmlFor="confirm-domain" className="text-[11px] text-stone-600 leading-snug cursor-pointer select-none">
                    Saya menyatakan bahwa saya <b>TELAH MEMBELI & MEMILIKI</b> nama domain di atas secara sah. Saya memahami bahwa dana yang telah dibayarkan untuk Jasa Integrasi ini tidak dapat di-refund jika ternyata domain belum dibeli.
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={savingCustomDomain || !customDomain || !invitation?.id || !isDomainOwned}
                    onClick={async () => {
                      if (!isDomainOwned) {
                        setCustomDomainError("Anda harus mencentang persetujuan kepemilikan domain.");
                        return;
                      }
                      setSavingCustomDomain(true);
                      setCustomDomainError(null);
                      try {
                        const response = await fetch("/api/client/custom-domain/buy", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            invitationId: invitation.id,
                            requestedDomain: customDomain
                          })
                        });
                        const resData = await response.json();
                        if (response.ok && resData.paymentUrl) {
                          window.location.href = resData.paymentUrl;
                        } else {
                          setCustomDomainError(resData.error || "Gagal membuat invoice");
                        }
                      } catch (err: any) {
                        setCustomDomainError(err.message || "Terjadi kesalahan jaringan");
                      }
                      setSavingCustomDomain(false);
                    }}
                    className={`px-4 py-2 bg-amber-800 text-white font-bold rounded-xl text-xs whitespace-nowrap transition flex items-center justify-center min-w-[120px] ${(!customDomain || !isDomainOwned) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-900'}`}
                  >
                    {savingCustomDomain ? <span className="animate-spin mr-2">⏳</span> : "Bayar Jasa"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {customDomainError && (
            <p className="text-[11px] text-red-600 font-medium">{customDomainError}</p>
          )}
          {customDomainSuccess && (
            <p className="text-[11px] text-emerald-600 font-semibold">Domain berhasil disimpan. Hubungi Admin untuk aktivasi SSL.</p>
          )}
          {invitation?.customDomain && !customDomainSuccess && (
            <p className="text-[11px] text-stone-400">
              Domain aktif saat ini: <span className="font-mono font-bold text-stone-700">{invitation.customDomain}</span>
            </p>
          )}
        </div>
      </div>

      {/* WOW PUBLISH UI OVERLAY */}
      {publishState !== 'idle' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-900/40 backdrop-blur-md transition-all duration-500">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 text-center transform transition-all duration-500 scale-100 relative overflow-hidden border border-stone-200">
            {publishState === 'baking' && (
              <>
                <div className="relative w-20 h-20 mx-auto mb-6">
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 border-4 border-amber-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-amber-600 rounded-full border-t-transparent animate-spin"></div>
                  {/* Inner static logo / icon */}
                  <div className="absolute inset-0 flex items-center justify-center text-amber-800">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-lg font-serif font-bold text-stone-900 mb-2">Memproses Publikasi</h3>
                <p className="text-xs text-stone-500 font-medium h-8 flex items-center justify-center">{publishMessage}</p>
                
                <div className="w-full bg-stone-100 h-2 rounded-full mt-6 overflow-hidden">
                  <div 
                    className="bg-amber-600 h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${publishProgress}%` }}
                  ></div>
                </div>
                <div className="text-right mt-1">
                  <span className="text-[10px] font-bold text-amber-800">{publishProgress}%</span>
                </div>
              </>
            )}

            {publishState === 'success' && (
              <div className="animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Berhasil!</h3>
                <p className="text-sm text-stone-600 font-medium mb-6">Undangan Anda telah mengudara dan siap disebarkan.</p>
                <a 
                  href={getInvitationPublicUrl(formData.subdomain || "")}
                  target="_blank"
                  className="inline-block w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-sm transition shadow-lg"
                >
                  Buka Undangan
                </a>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
