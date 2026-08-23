"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  category: string | null;
  qrToken: string;
  waStatus: string;
  sessionInfo: string | null;
  guestLimit: number | null;
  rsvp: {
    status: string | null;
    guestCount: number;
    message: string | null;
  } | null;
}

export default function GuestsPage() {
  const router = useRouter();
  const [invitationId, setInvitationId] = useState<string>("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGuest, setNewGuest] = useState({
    name: "",
    phone: "",
    category: "" as "KELUARGA" | "VIP" | "TEMAN" | "UMUM",
    sessionInfo: "" as "pagi" | "siang" | "malam" | "",
    guestLimit: 1,
  });

  useEffect(() => {
    // For demo, we'll hardcode an invitation ID. In real app, we'd get from context or URL.
    // For now, we'll fetch the first invitation for the user.
    fetch(`/api/client/invitations`)
      .then((res) => res.json())
      .then((invs: any[]) => {
        if (invs.length > 0) {
          setInvitationId(invs[0].id);
          loadGuests(invs[0].id);
        }
      })
      .catch(() => setError("Gagal memuat undangan"));
  }, []);

  const loadGuests = (invId: string) => {
    setLoading(true);
    fetch(`/api/client/guests/${invId}`)
      .then((res) => res.json())
      .then((data: Guest[]) => {
        setGuests(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat daftar tamu");
        setLoading(false);
      });
  };

  const handleAddGuest = async () => {
    if (!invitationId) return;
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
          category: "KELUARGA",
          sessionInfo: "",
          guestLimit: 1,
        });
      } else {
        setError("Gagal menambah tamu");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm("Hapus tamu ini?")) return;
    setLoading(true);
    try {
      await fetch(`/api/client/guests/${id}`, { method: "DELETE" });
      loadGuests(invitationId);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGuest = async (guest: Guest, field: keyof Guest, value: any) => {
    setLoading(true);
    try {
      await fetch(`/api/client/guests/${guest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      loadGuests(invitationId);
    } finally {
      setLoading(false);
    }
  };

  if (loading && guests.length === 0) return <div className="text-center py-12">Memuat...</div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Tamu</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition"
          >
            + Tambah Tamu
          </button>
          <Link
            href="/dashboard/invitation"
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Kembali ke Undangan
          </Link>
        </div>
      </div>

      {/* Add Guest Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Tambah Tamu Baru</h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Nama Tamu</label>
              <input
                type="text"
                value={newGuest.name}
                onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Nama lengkap tamu"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="081234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kategori</label>
                <select
                  value={newGuest.category}
                  onChange={(e) => setNewGuest({ ...newGuest, category: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="KELUARGA">Keluarga</option>
                  <option value="VIP">VIP</option>
                  <option value="TEMAN">Teman</option>
                  <option value="UMUM">Umum</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sesi Akad</label>
                <select
                  value={newGuest.sessionInfo}
                  onChange={(e) => setNewGuest({ ...newGuest, sessionInfo: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="">- Pilih Sesi -</option>
                  <option value="pagi">Pagi</option>
                  <option value="siang">Siang</option>
                  <option value="malam">Malam</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Batas Tamu Tambahan</label>
                <input
                  type="number"
                  value={newGuest.guestLimit ?? 1}
                  min={1}
                  onChange={(e) => setNewGuest({ ...newGuest, guestLimit: Number(e.target.value) || 1 })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddGuest}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
              >
                {loading ? "Menambahkan..." : "Tambah Tamu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sesi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status WA</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RSVP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {guests.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-center text-gray-500" colSpan={8}>
                  Belum ada tamu. Tambah tamu pertama menggunakan tombol di atas.
                </td>
              </tr>
            ) : (
              guests.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {guest.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {guest.phone || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {guest.category || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {guest.sessionInfo || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {guest.guestLimit ?? 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      guest.waStatus === "SENT"
                        ? "bg-green-100 text-green-800"
                        : guest.waStatus === "READ"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {guest.waStatus === "PENDING" ? "Menunggu" : guest.waStatus === "SENT" ? "Terkirim" : "Terbaca"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {guest.rsvp ? (
                      <>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          guest.rsvp.status === "hadir"
                            ? "bg-green-100 text-green-800"
                            : guest.rsvp.status === "tidak"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {guest.rsvp.status === "hadir" ? "Hadir" : guest.rsvp.status === "tidak" ? "Tidak Hadir" : "Belum Resp"}
                        </span>
                        <br />
                        <span className="text-xs text-gray-500">
                          {guest.rsvp.guestCount} orang
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Belum Resp</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // In a real app, we'd open a modal to edit guest details
                          alert("Edit guest functionality coming soon");
                        }}
                        className="p-1 text-gray-500 hover:text-amber-600"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteGuest(guest.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h10a2 2 0 002-2v0a1 1 0 100-2v-3a1 1 0 00-.276-.948l6.224-6.224A1 1 0 0013 4V4h-.256A1 1 0 009 2zM12 10a1 1 0 100 2 1 1 0 000-2zM11 7a2 2 0 104 0 2 2 0 00-4 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}