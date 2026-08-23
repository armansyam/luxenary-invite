"use client";

import { useState, useEffect } from "react";

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  phoneNumber?: string | null;
  category: string | null;
  qrToken: string;
  waStatus: string;
  sessionInfo: string | null;
  guestQuota?: number;
  guestLimit?: number | null;
  rsvps?: {
    status: string | null;
    guestCount: number;
    message: string | null;
  }[];
}

export default function GuestsPage() {
  const [invitationId, setInvitationId] = useState<string>("");
  const [invitationData, setInvitationData] = useState<any>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const [newGuest, setNewGuest] = useState({
    name: "",
    phone: "",
    category: "UMUM",
    sessionInfo: "Akad & Resepsi",
    guestLimit: 2,
  });

  useEffect(() => {
    fetch(`/api/client/invitations`)
      .then((res) => res.json())
      .then((invs: any[]) => {
        if (Array.isArray(invs) && invs.length > 0) {
          setInvitationId(invs[0].id);
          setInvitationData(invs[0]);
          loadGuests(invs[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Gagal memuat data undangan");
        setLoading(false);
      });
  }, []);

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

  const generateWaLink = (guest: Guest) => {
    const groom = invitationData?.groomName || "Didan";
    const bride = invitationData?.brideName || "Nasha";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const invUrl = invitationData?.subdomain
      ? `https://${invitationData.subdomain}.luxenary.id`
      : `${baseUrl}/${invitationData?.groomSlug || "didan"}-${invitationData?.brideSlug || "nasha"}/${invitationData?.invitationSlug || "wedding"}`;

    const text = encodeURIComponent(
      `Kepada Yth.\nBapak/Ibu/Saudara/i ${guest.name}\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:\n\n${invUrl}?to=${encodeURIComponent(guest.name)}\n\nMerupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\n\nTerima kasih.\n\nSalam hangat,\n${groom} & ${bride}`
    );

    const targetPhone = (guest.phone || guest.phoneNumber || "").replace(/\D/g, "");
    if (targetPhone) {
      return `https://wa.me/${targetPhone}?text=${text}`;
    }
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  const filteredGuests = guests.filter((g) => {
    const matchesCategory = filterCategory === "all" || (g.category || "").toLowerCase() === filterCategory.toLowerCase();
    const matchesSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || (g.phone && g.phone.includes(search));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
            Buku Tamu &amp; Pengiriman WhatsApp
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Kelola nama penerima undangan, atur kuota kehadiran, dan bagikan tautan via WhatsApp
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Tamu Baru</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
        
        {/* Category Filters */}
        <div className="flex bg-stone-100 p-1 rounded-xl gap-1 text-xs overflow-x-auto">
          {[
            { id: "all", label: "Semua" },
            { id: "vip", label: "VIP" },
            { id: "keluarga", label: "Keluarga" },
            { id: "teman", label: "Teman" },
            { id: "umum", label: "Umum" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                filterCategory === tab.id
                  ? "bg-white text-stone-900 shadow-xs font-bold"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama tamu atau nomor HP..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
          />
          <svg className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Guest List (Mobile Cards + Desktop View) */}
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
          <p className="text-xs text-stone-400">Klik tombol &ldquo;Tambah Tamu Baru&rdquo; untuk mulai memasukkan daftar undangan Anda</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Tambah Tamu Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          
          {/* Mobile Card List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredGuests.map((guest) => {
              const waUrl = generateWaLink(guest);
              return (
                <div
                  key={guest.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{guest.name}</h4>
                        <span className="text-[11px] text-stone-500 font-mono">
                          {guest.phone || guest.phoneNumber || "Tanpa nomor WhatsApp"}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-bold uppercase tracking-wider">
                        {guest.category || "UMUM"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-1">
                      <span>Kuota: <strong>{guest.guestQuota || guest.guestLimit || 1} Pax</strong></span>
                      <span>•</span>
                      <span>Sesi: <strong>{guest.sessionInfo || "Reguler"}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Kirim WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeleteGuest(guest.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
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

      {/* Add Guest Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Tambah Tamu Undangan</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
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
                  placeholder="Contoh: Bpk. H. Syamsuddin &amp; Keluarga"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Nomor WhatsApp (Opsional)</label>
                <input
                  type="text"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
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

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Sesi Acara</label>
                <input
                  type="text"
                  value={newGuest.sessionInfo}
                  onChange={(e) => setNewGuest({ ...newGuest, sessionInfo: e.target.value })}
                  placeholder="Contoh: Sesi 1 / Akad &amp; Resepsi"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
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