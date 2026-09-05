"use client";

import { useState, useEffect } from "react";
import { getInvitationPublicUrl, resolveEffectiveInvitationUrl } from "@/lib/domainUtils";

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  category: string | null;
  qrToken: string;
  waStatus: string;
  sessionInfo: string | null;
  guestQuota?: number;
  guestLimit?: number | null;
  tableNumber?: string | null;
  rsvps?: {
    status: string | null;
    guestCount: number;
    message: string | null;
  }[];
}

const DEFAULT_WA_TEMPLATE = `Kepada Yth.
Bapak/Ibu/Saudara/i {nama_tamu}

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:

{link_undangan}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.

Terima kasih.

Salam hangat,
{nama_mempelai}`;

const WA_PRESETS = [
  {
    id: "formal",
    name: "Formal & Sakral",
    badge: "Populer",
    desc: "Bahasa sopan standar undangan pernikahan",
    text: `Kepada Yth.\nBapak/Ibu/Saudara/i {nama_tamu}\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:\n\n{link_undangan}\n\nMerupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\n\nTerima kasih.\n\nSalam hangat,\n{nama_mempelai}`,
  },
  {
    id: "islami",
    name: "Islami Penuh Berkah",
    badge: "Islami",
    desc: "Dengan salam pembuka & penutup bernuansa Islami",
    text: `Assalamu'alaikum Warahmatullahi Wabarakatuh\n\nKepada Yth.\nBapak/Ibu/Saudara/i {nama_tamu}\n\nDengan memohon rahmat dan ridho Allah SWT, kami bermaksud menyelenggarakan perayaan pernikahan kami:\n\n{link_undangan}\n\nKehadiran dan doa restu Bapak/Ibu/Saudara/i merupakan kehormatan serta kebahagiaan bagi kami.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.\n\nSalam hormat,\n{nama_mempelai}`,
  },
  {
    id: "modern",
    name: "Modern & Santai",
    badge: "Teman / Sahabat",
    desc: "Cocok untuk teman sebaya, sahabat, atau rekan kerja",
    text: `Halo {nama_tamu}!\n\nKami mengundang kamu untuk hadir dan merayakan momen bahagia pernikahan kami:\n\n{link_undangan}\n\nInfo Kehadiran: {kuota_tamu} ({sesi_acara})\n\nBuka tautan di atas untuk melihat detail acara, lokasi maps, dan konfirmasi kehadiran (RSVP).\n\nCan't wait to celebrate with you!\n\nSalam hangat,\n{nama_mempelai}`,
  },
  {
    id: "singkat",
    name: "Singkat & Elegan",
    badge: "Ringkas",
    desc: "Format ringkas langsung ke inti tautan undangan",
    text: `Kepada Yth. {nama_tamu},\n\nKami mengundang Anda untuk hadir di hari bahagia pernikahan kami:\n\n{link_undangan}\n\nMohon doa restu untuk perjalanan baru kami.\n\nSalam bahagia,\n{nama_mempelai}`,
  },
];

export default function GuestsPage() {
  const [invitationId, setInvitationId] = useState<string>("");
  const [invitationData, setInvitationData] = useState<any>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "SENT" | "PENDING">("all");
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);

  // WhatsApp Template Customization States
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WA_TEMPLATE);
  const [adminWaTemplate, setAdminWaTemplate] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);

  const [newGuest, setNewGuest] = useState({
    name: "",
    phone: "",
    category: "UMUM",
    sessionInfo: "Akad & Resepsi",
    guestLimit: 2,
    tableNumber: "",
  });

  const loadGuests = (invId: string) => {
    setLoading(true);
    fetch(`/api/client/guests/${invId}`)
      .then((res) => res.json())
      .then((data: Guest[]) => {
        setGuests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat daftar tamu");
        setLoading(false);
      });
  };

  // Load admin WA template dari AdminSetting via /api/public/settings
  useEffect(() => {
    fetch("/api/public/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.waTemplateMessage && data.waTemplateMessage.trim()) {
          setAdminWaTemplate(data.waTemplateMessage.trim());
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/client/invitations`, { cache: "no-store" })
      .then((res) => res.json())
      .then((invs: any[]) => {
        if (Array.isArray(invs) && invs.length > 0) {
          const inv = invs[0];
          setInvitationId(inv.id);
          setInvitationData(inv);

          // Extract existing saved WA template if any
          let feat: any = {};
          try {
            feat = typeof inv.featureSettings === "string" ? JSON.parse(inv.featureSettings) : (inv.featureSettings || {});
          } catch {}

          if (feat.waTemplate) {
            // Prioritas tertinggi: template yang sudah disimpan client
            setWaTemplate(feat.waTemplate);
          }
          // Jika belum ada, template akan di-set ke adminWaTemplate saat adminWaTemplate tersedia (useEffect berikutnya)

          loadGuests(inv.id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Gagal memuat data undangan");
        setLoading(false);
      });
  }, []);

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationId || !newGuest.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/client/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, ...newGuest }),
      });
      if (res.ok) {
        setShowAddModal(false);
        loadGuests(invitationId);
        setNewGuest({
          name: "",
          phone: "",
          category: "UMUM",
          sessionInfo: "Akad & Resepsi",
          guestLimit: 2,
          tableNumber: "",
        });
      } else {
        setError("Gagal menambah tamu");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm("Hapus tamu ini dari daftar undangan?")) return;
    setLoading(true);
    try {
      await fetch(`/api/client/guests/${id}`, { method: "DELETE" });
      loadGuests(invitationId);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Checkbox Status (Auto-Save to DB)
  const toggleWaStatus = async (guestId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "SENT" ? "PENDING" : "SENT";

    // Optimistic state update
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, waStatus: nextStatus } : g))
    );

    try {
      await fetch(`/api/client/guests/${guestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waStatus: nextStatus }),
      });
    } catch {
      // Rollback on error
      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, waStatus: currentStatus } : g))
      );
    }
  };

  // Save Custom WhatsApp Template Handler
  const handleSaveTemplate = async () => {
    if (!invitationId || savingTemplate) return;
    setSavingTemplate(true);
    setError(null);

    try {
      let currentFeat: any = {};
      try {
        currentFeat = typeof invitationData?.featureSettings === "string"
          ? JSON.parse(invitationData.featureSettings)
          : (invitationData?.featureSettings || {});
      } catch {}

      const updatedFeat = {
        ...currentFeat,
        waTemplate: waTemplate.trim(),
      };

      const res = await fetch(`/api/client/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureSettings: updatedFeat,
        }),
      });

      if (res.ok) {
        setInvitationData((prev: any) => ({
          ...prev,
          featureSettings: updatedFeat,
        }));
        setTemplateSaveSuccess(true);
        setTimeout(() => setTemplateSaveSuccess(false), 3000);
      } else {
        setError("Gagal menyimpan template pesan WhatsApp");
      }
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan template");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Helper to render customized text for a guest
  const renderWaText = (guestName: string, guestLimit: number = 2, sessionInfo: string = "Akad & Resepsi", qrToken?: string) => {
    const groom = invitationData?.groomNickname || invitationData?.groomName || "Mempelai Pria";
    const bride = invitationData?.brideNickname || invitationData?.brideName || "Mempelai Wanita";
    
    let feat: any = {};
    try {
      feat = typeof invitationData?.featureSettings === "string" ? JSON.parse(invitationData.featureSettings) : (invitationData?.featureSettings || {});
    } catch {}

    const displayOrder = feat.displayOrder || "BRIDE_FIRST";
    const coupleName = displayOrder === "BRIDE_FIRST" ? `${bride} & ${groom}` : `${groom} & ${bride}`;

    const isPublished = invitationData?.status === "PUBLISHED" || invitationData?.status === "EVENT_FINISHED";
    const resolved = isPublished
      ? resolveEffectiveInvitationUrl({
          customDomain: invitationData?.customDomain,
          subdomain: invitationData?.subdomain,
          guestSlug: guestName,
        })
      : { url: "" };

    // Jika belum dipublikasikan, jangan gunakan URL simulasi palsu
    const fullGuestUrl = isPublished && resolved.url
      ? resolved.url
      : "[Tautan resmi aktif otomatis setelah undangan dipublikasikan]";

    const template = waTemplate || DEFAULT_WA_TEMPLATE;

    return template
      // Format client: {nama_tamu}, {link_undangan}, dll
      .replace(/{nama_tamu}/g, guestName)
      .replace(/{link_undangan}/g, fullGuestUrl)
      .replace(/{nama_mempelai}/g, coupleName)
      .replace(/{kuota_tamu}/g, `${guestLimit} Pax`)
      .replace(/{sesi_acara}/g, sessionInfo)
      // Format admin: {{GUEST_NAME}}, {{INVITATION_URL}}, dll — agar template AdminSetting langsung bisa dirender
      .replace(/\{\{GUEST_NAME\}\}/g, guestName)
      .replace(/\{\{INVITATION_URL\}\}/g, fullGuestUrl)
      .replace(/\{\{COUPLE_NAMES\}\}/g, coupleName)
      .replace(/\{\{GROOM_NAME\}\}/g, groom)
      .replace(/\{\{BRIDE_NAME\}\}/g, bride)
      .replace(/\{\{GUEST_QUOTA\}\}/g, `${guestLimit} Pax`)
      .replace(/\{\{SESSION_INFO\}\}/g, sessionInfo);
  };

  const generateWaLink = (guest: Guest) => {
    const isPublished = invitationData?.status === "PUBLISHED" || invitationData?.status === "EVENT_FINISHED";
    if (!isPublished) return "";

    const renderedText = renderWaText(
      guest.name,
      guest.guestLimit || guest.guestQuota || 2,
      guest.sessionInfo || "Akad & Resepsi",
      guest.qrToken
    );

    const text = encodeURIComponent(renderedText);
    let targetPhone = (guest.phone || "").replace(/\D/g, "");
    if (targetPhone.startsWith("0")) {
      targetPhone = "62" + targetPhone.slice(1);
    }
    if (targetPhone) {
      return `https://wa.me/${targetPhone}?text=${text}`;
    }
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  const handleCopyGuestLink = (guest: Guest) => {
    const isPublished = invitationData?.status === "PUBLISHED" || invitationData?.status === "EVENT_FINISHED";
    if (!isPublished) return;

    const resolved = resolveEffectiveInvitationUrl({
      customDomain: invitationData?.customDomain,
      subdomain: invitationData?.subdomain,
      guestSlug: guest.name,
    });

    if (!resolved.url) return;

    navigator.clipboard.writeText(resolved.url).then(() => {
      setCopiedGuestId(guest.id);
      setTimeout(() => setCopiedGuestId(null), 2000);
    });
  };

  const insertVariableTag = (tag: string) => {
    setWaTemplate((prev) => prev + tag);
  };

  const filteredGuests = guests.filter((g) => {
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "SENT" && g.waStatus === "SENT") ||
      (filterStatus === "PENDING" && g.waStatus !== "SENT");

    const matchesCategory =
      filterCategory === "all" ||
      (g.category || "").toLowerCase() === filterCategory.toLowerCase();

    const matchesSearch =
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.phone && g.phone.includes(search));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const totalGuests = guests.length;
  const sentCount = guests.filter((g) => g.waStatus === "SENT").length;
  const pendingCount = totalGuests - sentCount;

  return (
    <div className="space-y-6 font-sans pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-amber-800 uppercase block">Manajemen Undangan</span>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Buku Tamu &amp; Pengiriman WhatsApp
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola nama penerima undangan, checklist status pengiriman, dan sesuaikan template pesan WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Edit WhatsApp Template Button */}
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/80 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit Template WA</span>
          </button>

          {/* Add Guest Button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Tamu</span>
          </button>
        </div>
      </div>


      {/* Draft Status Notification */}
      {invitationData && invitationData.status === "DRAFT" && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex gap-3 shadow-xs items-start">
          <svg className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 min-w-0 text-xs">
            <h4 className="text-xs sm:text-sm font-bold text-amber-950">Undangan Masih Berstatus Draft (Belum Dipublikasikan)</h4>
            <p className="text-[11px] text-amber-900/80 mt-1 leading-relaxed">
              Fitur pengiriman WhatsApp dan salin tautan personal tamu dinonaktifkan sementara untuk mencegah terkirimnya tautan prematur. Seluruh aksi pengiriman akan aktif otomatis setelah Anda mempublikasikan undangan resmi Anda di <a href="/dashboard/settings" className="font-bold underline hover:text-amber-950">Menu Pengaturan / Publikasi</a>.
            </p>
          </div>
        </div>
      )}

      {/* Quick Summary Counter Bar (Clickable Filter Cards) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={`p-4 rounded-2xl border transition text-left cursor-pointer flex items-center gap-3 ${
            filterStatus === "all"
              ? "bg-white border-stone-900 shadow-md ring-2 ring-stone-900/10"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
            filterStatus === "all" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Semua Tamu</span>
            <span className="text-sm sm:text-base font-bold text-stone-900">{totalGuests}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus("SENT")}
          className={`p-4 rounded-2xl border transition text-left cursor-pointer flex items-center gap-3 ${
            filterStatus === "SENT"
              ? "bg-emerald-50/80 border-emerald-700 shadow-md ring-2 ring-emerald-700/20"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
            filterStatus === "SENT" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700"
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Sudah Dikirim</span>
            <span className="text-sm sm:text-base font-bold text-emerald-700">{sentCount}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus("PENDING")}
          className={`p-4 rounded-2xl border transition text-left cursor-pointer flex items-center gap-3 ${
            filterStatus === "PENDING"
              ? "bg-amber-50/80 border-amber-700 shadow-md ring-2 ring-amber-700/20"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
            filterStatus === "PENDING" ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-700"
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Belum Dikirim</span>
            <span className="text-sm sm:text-base font-bold text-amber-700">{pendingCount}</span>
          </div>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Filter Toolbar (Status Tabs + Category Pills + Search) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        
        {/* Status Tabs Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1 shrink-0">Status:</span>
            {[
              { id: "all", label: "Semua Tamu", count: totalGuests },
              { id: "SENT", label: "Sudah Terkirim", count: sentCount },
              { id: "PENDING", label: "Belum Dikirim", count: pendingCount },
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? tab.id === "SENT"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : tab.id === "PENDING"
                        ? "bg-amber-800 text-white shadow-xs"
                        : "bg-stone-900 text-white shadow-xs"
                      : "bg-stone-100 hover:bg-stone-200 text-stone-600"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? "bg-white/25 text-white" : "bg-stone-200 text-stone-700"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau nomor HP..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
            />
            <svg className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-0.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1 shrink-0">Kategori:</span>
          {[
            { id: "all", label: "Semua Kategori" },
            { id: "vip", label: "VIP" },
            { id: "keluarga", label: "Keluarga" },
            { id: "teman", label: "Teman" },
            { id: "umum", label: "Umum" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                filterCategory === tab.id
                  ? "bg-amber-50 text-amber-900 border border-amber-300/80 font-bold"
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* HIGH-DENSITY EFFICIENT LIST TABLE */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">
          Memuat daftar tamu undangan...
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-stone-700">Belum ada tamu yang terdaftar</p>
          <p className="text-xs text-stone-400">Klik tombol &ldquo;Tambah Tamu&rdquo; untuk mulai memasukkan daftar undangan Anda</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Tambah Tamu Pertama
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          
          {/* Table Header (Desktop) */}
          <div className="hidden md:grid md:grid-cols-12 gap-3 px-5 py-3 bg-stone-50/80 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider items-center">
            <div className="col-span-1 text-center">Terkirim</div>
            <div className="col-span-4">Nama Tamu &amp; Kontak</div>
            <div className="col-span-2">Kategori</div>
            <div className="col-span-2">Kuota &amp; Sesi</div>
            <div className="col-span-3 text-right">Aksi Pengiriman</div>
          </div>

          {/* Table Body (High Density List Rows) */}
          <div className="divide-y divide-stone-100">
            {filteredGuests.map((guest, idx) => {
              const isPublished = invitationData?.status === "PUBLISHED" || invitationData?.status === "EVENT_FINISHED";
              const waUrl = isPublished ? generateWaLink(guest) : "";
              const isSent = guest.waStatus === "SENT";

              return (
                <div
                  key={guest.id}
                  className={`p-3.5 sm:px-5 sm:py-3.5 transition flex flex-col md:grid md:grid-cols-12 gap-2.5 md:gap-3 md:items-center ${
                    isSent ? "bg-emerald-50/20 hover:bg-emerald-50/40" : "hover:bg-stone-50/80"
                  }`}
                >
                  
                  {/* Column 1: Checkbox (Status Terkirim) */}
                  <div className="flex md:col-span-1 items-center justify-between md:justify-center">
                    <label className="flex items-center gap-2 cursor-pointer select-none group" title="Centang jika undangan sudah dikirim ke tamu ini">
                      <input
                        type="checkbox"
                        checked={isSent}
                        onChange={() => toggleWaStatus(guest.id, guest.waStatus)}
                        className="w-4 h-4 text-emerald-700 rounded border-stone-300 focus:ring-emerald-700 cursor-pointer"
                      />
                      <span className="md:hidden text-xs font-bold text-stone-700">
                        {isSent ? "✓ Sudah Dikirim" : "Belum Dikirim"}
                      </span>
                    </label>

                    {/* Mobile Index Badge */}
                    <span className="md:hidden text-[10px] text-stone-400 font-mono">#{idx + 1}</span>
                  </div>

                  {/* Column 2: Guest Name & Phone */}
                  <div className="md:col-span-4 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">{guest.name}</h4>
                    <span className="text-[11px] text-stone-500 font-mono block truncate">
                      {guest.phone || "Tanpa No. WhatsApp"}
                    </span>
                  </div>

                  {/* Column 3: Category Badge */}
                  <div className="md:col-span-2 flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      (guest.category || "").toUpperCase() === "VIP"
                        ? "bg-amber-100 text-amber-900 border border-amber-300/60"
                        : (guest.category || "").toUpperCase() === "KELUARGA"
                        ? "bg-purple-100 text-purple-900 border border-purple-300/60"
                        : (guest.category || "").toUpperCase() === "TEMAN"
                        ? "bg-blue-100 text-blue-900 border border-blue-300/60"
                        : "bg-stone-100 text-stone-700 border border-stone-200"
                    }`}>
                      {guest.category || "UMUM"}
                    </span>
                  </div>

                  {/* Column 4: Quota & Session */}
                  <div className="md:col-span-2 text-xs text-stone-600">
                    <span className="font-semibold text-stone-900">{guest.guestQuota || guest.guestLimit || 1} Pax</span>
                    <span className="text-stone-400 mx-1">·</span>
                    <span className="text-[11px] text-stone-500">{guest.sessionInfo || "Reguler"}</span>
                  </div>

                  {/* Column 5: Action Buttons (WhatsApp, Copy Link, Delete) */}
                  <div className="md:col-span-3 flex items-center justify-end gap-1.5 pt-2 md:pt-0 border-t md:border-0 border-stone-100">
                    
                    {/* Copy Link Button */}
                    <div className={`relative group flex items-center ${!isPublished ? "cursor-not-allowed" : ""}`}>
                      <button
                        type="button"
                        onClick={() => handleCopyGuestLink(guest)}
                        disabled={!isPublished}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                          isPublished
                            ? "bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                            : "bg-stone-100/60 text-stone-400 border border-stone-200/50 select-none pointer-events-none"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>{copiedGuestId === guest.id ? "Tersalin!" : "Salin"}</span>
                      </button>

                      {/* Tooltip Melayang saat Draft (Opsi 2) */}
                      {!isPublished && (
                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-end z-30 transition-all duration-150">
                          <div className="bg-stone-900/95 text-stone-200 text-[10px] font-medium px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap border border-stone-700/60 flex items-center gap-1.5 backdrop-blur-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                            <span>Tautan aktif setelah undangan dipublikasikan</span>
                          </div>
                          <div className="w-2 h-2 bg-stone-900/95 rotate-45 mr-4 -mt-1 border-r border-b border-stone-700/60"></div>
                        </div>
                      )}
                    </div>

                    {/* Send WhatsApp Button */}
                    {isPublished ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (!isSent) toggleWaStatus(guest.id, guest.waStatus);
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Buka WhatsApp untuk Mengirim Undangan"
                      >
                        <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Kirim WA</span>
                      </a>
                    ) : (
                      <div className="relative group flex items-center cursor-not-allowed">
                        <button
                          type="button"
                          disabled
                          className="px-3 py-1.5 bg-stone-100 text-stone-400 border border-stone-200/60 rounded-lg text-xs font-medium flex items-center gap-1.5 pointer-events-none select-none"
                        >
                          <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Kirim WA</span>
                        </button>

                        {/* Tooltip Melayang saat Draft (Opsi 2) */}
                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-end z-30 transition-all duration-150">
                          <div className="bg-stone-900/95 text-stone-200 text-[10px] font-medium px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap border border-stone-700/60 flex items-center gap-1.5 backdrop-blur-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                            <span>Publikasikan undangan di Pengaturan untuk mengaktifkan pengiriman</span>
                          </div>
                          <div className="w-2 h-2 bg-stone-900/95 rotate-45 mr-5 -mt-1 border-r border-b border-stone-700/60"></div>
                        </div>
                      </div>
                    )}

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteGuest(guest.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus Tamu"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* WHATSAPP TEMPLATE EDITOR MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl border border-stone-200 space-y-5 my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900">
                  Kustomisasi Template Pesan WhatsApp
                </h3>
                <p className="text-xs text-stone-500">
                  Ubah format kata-kata undangan sesuai gaya bahasa Anda. Tautan undangan akan otomatis menyesuaikan subdomain aktif.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Editor & Variables */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Preset Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1.5">Pilihan Cepat Format Pesan:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Template dari AdminSetting — ditampilkan sebagai opsi pertama jika admin sudah mengisi */}
                    {adminWaTemplate && (
                      <button
                        key="admin-template"
                        type="button"
                        onClick={() => setWaTemplate(adminWaTemplate)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between col-span-2 ${
                          waTemplate === adminWaTemplate
                            ? "border-violet-600 bg-violet-50/70 ring-1 ring-violet-600/30"
                            : "border-violet-300 bg-violet-50/40 hover:bg-violet-50 hover:border-violet-400"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-violet-900">Template Resmi (Admin)</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-violet-600 text-white rounded-md font-semibold">Default Admin</span>
                        </div>
                        <span className="text-[10px] text-violet-600 line-clamp-1">{adminWaTemplate.slice(0, 80)}{adminWaTemplate.length > 80 ? "…" : ""}</span>
                      </button>
                    )}
                    {WA_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setWaTemplate(preset.text)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          waTemplate === preset.text
                            ? "border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700/30"
                            : "border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-stone-900">{preset.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-stone-200/80 text-stone-700 rounded-md font-semibold">{preset.badge}</span>
                        </div>
                        <span className="text-[10px] text-stone-500 line-clamp-1">{preset.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variable Tags (Click to Insert) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-stone-700">Variabel Dinamis (Klik untuk Menambahkan):</label>
                    <span className="text-[10px] text-stone-400">Otomatis diganti sesuai data tamu</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { tag: "{nama_tamu}", label: "Nama Tamu", desc: "Contoh: Bpk. Abiyoga" },
                      { tag: "{link_undangan}", label: "Link Undangan", desc: "URL Khusus Tamu (Domain / Subdomain)" },
                      { tag: "{nama_mempelai}", label: "Nama Mempelai", desc: "Nama Kedua Mempelai" },
                      { tag: "{kuota_tamu}", label: "Kuota Tamu", desc: "2 Pax" },
                      { tag: "{sesi_acara}", label: "Sesi Acara", desc: "Akad & Resepsi" },
                    ].map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => insertVariableTag(item.tag)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-lg text-[11px] font-mono font-semibold transition cursor-pointer shadow-2xs"
                        title={item.desc}
                      >
                        + {item.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea Editor */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Teks Format Pesan WhatsApp:</label>
                  <textarea
                    rows={10}
                    value={waTemplate}
                    onChange={(e) => setWaTemplate(e.target.value)}
                    placeholder="Tulis format pesan WhatsApp..."
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-900 font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                  <div className="flex items-center justify-between mt-1 text-[10px] text-stone-400">
                    <span>Gunakan tanda bintang *teks* untuk cetak tebal, _teks_ untuk miring</span>
                    <button
                      type="button"
                      onClick={() => setWaTemplate(adminWaTemplate || DEFAULT_WA_TEMPLATE)}
                      className="text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      {adminWaTemplate ? "Reset ke Template Admin" : "Reset ke Template Standar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Chat Simulation Preview */}
              {(() => {
                const isDraft = invitationData?.status !== "PUBLISHED" && invitationData?.status !== "EVENT_FINISHED";
                const domainInfo = resolveEffectiveInvitationUrl({
                  customDomain: invitationData?.customDomain,
                  subdomain: invitationData?.subdomain,
                  groomSlug: invitationData?.groomSlug,
                  brideSlug: invitationData?.brideSlug,
                  invitationSlug: invitationData?.invitationSlug,
                });

                return (
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-3 bg-stone-100 p-4 rounded-2xl border border-stone-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Live Preview WhatsApp</span>
                        </span>
                        <span className="text-[10px] text-stone-500">Simulasi untuk: <strong>Bpk. Abiyoga</strong></span>
                      </div>

                      {/* Domain Mode Indicator */}
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white rounded-xl border border-stone-200 text-[10px]">
                        <span className="text-stone-500 font-medium">Domain Aktif:</span>
                        {domainInfo.domainType === "CUSTOM_DOMAIN" ? (
                          <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            Custom Domain ({domainInfo.domainIdentifier})
                          </span>
                        ) : domainInfo.domainType === "SUBDOMAIN" ? (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            Subdomain ({domainInfo.domainIdentifier})
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                            Belum Dikonfigurasi
                          </span>
                        )}
                      </div>

                      {/* WhatsApp Bubble Preview Box */}
                      <div className="p-3.5 bg-[#d9fdd3] text-stone-900 rounded-2xl rounded-tr-xs border border-emerald-200/80 shadow-xs text-xs whitespace-pre-wrap font-sans leading-relaxed break-words">
                        {renderWaText("Bpk. Abiyoga", 2, "Akad & Resepsi", "dummy-qr-token")}
                        <div className="text-right text-[9px] text-stone-400 mt-1 font-mono">
                          12:00
                        </div>
                      </div>

                      {/* Notice jika status masih DRAFT */}
                      {isDraft && (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-amber-950">
                            <svg className="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Undangan Masih DRAFT (Tautan Terkunci)</span>
                          </div>
                          <p className="text-stone-600 text-[10px] leading-relaxed">
                            Tautan undangan belum diaktifkan. Tautan resmi akan otomatis terpasang dan siap dikirimkan kepada tamu setelah Anda mempublikasikan undangan di menu Pengaturan / Beranda.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                      <span className="font-bold text-stone-800 block">Panduan Pengiriman:</span>
                      <p>
                        Tautan <code className="text-amber-800 font-bold font-mono text-[10px]">{"{link_undangan}"}</code> otomatis menggunakan domain kustom atau subdomain aktif Anda dan menyertakan nama tamu sehingga ucapan nama tamu personal otomatis muncul saat mereka membuka web.
                      </p>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Footer Action Buttons */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
              <div>
                {templateSaveSuccess && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    Template WhatsApp Berhasil Disimpan
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingTemplate ? "Menyimpan..." : "Simpan Template"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add Guest Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Tambah Tamu Undangan</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddGuest} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Nama Tamu *</label>
                <input
                  type="text"
                  required
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  placeholder="Masukkan nama lengkap tamu yang diundang"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Nomor WhatsApp (Opsional)</label>
                <input
                  type="text"
                  value={newGuest.phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    if (val.startsWith("0")) val = "62" + val.slice(1);
                    setNewGuest({ ...newGuest, phone: val });
                  }}
                  placeholder="08123456789 atau 628123456789"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Kategori</label>
                  <select
                    value={newGuest.category}
                    onChange={(e) => setNewGuest({ ...newGuest, category: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  >
                    <option value="VIP">VIP</option>
                    <option value="KELUARGA">Keluarga</option>
                    <option value="TEMAN">Teman</option>
                    <option value="UMUM">Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Kuota Kehadiran</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newGuest.guestLimit}
                    onChange={(e) => setNewGuest({ ...newGuest, guestLimit: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Nomor Meja (Opsional)</label>
                  <input
                    type="text"
                    value={newGuest.tableNumber}
                    onChange={(e) => setNewGuest({ ...newGuest, tableNumber: e.target.value })}
                    placeholder="Contoh: VIP-1, Meja 5"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Sesi Acara</label>
                  <input
                    type="text"
                    value={newGuest.sessionInfo}
                    onChange={(e) => setNewGuest({ ...newGuest, sessionInfo: e.target.value })}
                    placeholder="Tentukan sesi (Opsional)"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Menyimpan..." : "Simpan Tamu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}