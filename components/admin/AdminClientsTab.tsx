"use client";

import React, { useState, useEffect, useCallback } from "react";
import { startRemoteSession } from "@/app/(admin)/admin/actions/remote";

interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  totalSpent: number;
  latestOrder?: {
    planType: string;
    amount: number | string;
    paidAt?: string | null;
    invoiceNumber: string;
  } | null;
  invitations: Array<{
    id: string;
    subdomain?: string | null;
    invitationSlug: string;
    status: string;
    themeId: string;
    groomName?: string | null;
    brideName?: string | null;
  }>;
  _count?: {
    orders: number;
    invitations: number;
  };
}

export default function AdminClientsTab() {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Modal State
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setUsers(data.users || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error("Fetch clients error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Handle Impersonate
  const handleRemote = async (clientId: string) => {
    try {
      setImpersonating(true);
      setActionMsg(null);
      await startRemoteSession(clientId);
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal memulai sesi remote klien" });
      setImpersonating(false);
    }
  };

  // Handle Delete Client
  const handleDeleteClient = async (userId: string) => {
    if (!confirm("Peringatan: Seluruh data undangan dan pesanan klien ini akan dihapus permanen. Lanjutkan?")) {
      return;
    }

    try {
      setDeleting(true);
      setActionMsg(null);
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ ok: true, msg: "Akun klien berhasil dihapus permanen." });
        setSelectedClient(null);
        fetchClients();
      } else {
        throw new Error(data.error || "Gagal menghapus klien");
      }
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal menghapus klien" });
    } finally {
      setDeleting(false);
    }
  };

  const getWhatsAppLink = (phone?: string | null, clientName?: string | null) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    if (cleanPhone.length < 9) return null;
    const text = encodeURIComponent(
      `Halo Kak ${clientName || ""},\n\nKami dari Customer Support Luxenary Invite. Apakah ada hal terkait pembuatan undangan pernikahan Anda yang dapat kami bantu?`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="space-y-6">
      {/* ── Header Title & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            <span>Manajemen Akun Calon Pengantin</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Daftar Klien</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Pantau akun pengantin terdaftar, remote ruang kerja dasbor, dan riwayat pesanan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchClients()}
          className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-gray-200 shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <svg className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Segarkan</span>
        </button>
      </div>

      {/* ── Search Toolbar ── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama klien, email, atau nomor WhatsApp..."
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <span className="text-sm font-bold">&times;</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Feedback Message Banner ── */}
      {actionMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between gap-3 ${
            actionMsg.ok
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${actionMsg.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span>{actionMsg.msg}</span>
          </div>
          <button type="button" onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-gray-600 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* ── Table View ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/80">
              <tr>
                {["Klien", "Kontak WhatsApp", "Paket Terakhir", "Total Belanja", "Undangan", "Terdaftar", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data klien...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 italic">
                    Tidak ada akun klien yang cocok dengan kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                users.map((usr) => {
                  const waLink = getWhatsAppLink(usr.phoneNumber, usr.name);
                  return (
                    <tr key={usr.id} className="hover:bg-gray-50/80 transition">
                      {/* Klien (Avatar + Nama + Email) */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs shrink-0">
                            {(usr.name || "K")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{usr.name}</div>
                            <div className="text-[11px] text-gray-400 font-mono">{usr.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Kontak WhatsApp */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {usr.phoneNumber ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-700">{usr.phoneNumber}</span>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                title="Chat WhatsApp"
                                className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.073.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                                </svg>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Belum diisi</span>
                        )}
                      </td>

                      {/* Paket Terakhir */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {usr.latestOrder ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                            {usr.latestOrder.planType}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Belum Order</span>
                        )}
                      </td>

                      {/* Total Belanja */}
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-900 whitespace-nowrap">
                        {usr.totalSpent > 0 ? `Rp ${usr.totalSpent.toLocaleString("id-ID")}` : "-"}
                      </td>

                      {/* Undangan Pengantin (1 Akun = 1 Undangan) */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {usr.invitations && usr.invitations.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 truncate max-w-[140px]" title={usr.invitations[0].groomName && usr.invitations[0].brideName ? `${usr.invitations[0].groomName} & ${usr.invitations[0].brideName}` : usr.invitations[0].invitationSlug}>
                                {usr.invitations[0].groomName && usr.invitations[0].brideName
                                  ? `${usr.invitations[0].groomName.split(" ")[0]} & ${usr.invitations[0].brideName.split(" ")[0]}`
                                  : usr.invitations[0].invitationSlug}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">
                                {usr.invitations[0].subdomain ? `${usr.invitations[0].subdomain}` : `/${usr.invitations[0].invitationSlug}`}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              usr.invitations[0].status === "PUBLISHED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : usr.invitations[0].status === "DRAFT"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}>
                              {usr.invitations[0].status === "PUBLISHED" ? "Tayang" : usr.invitations[0].status === "DRAFT" ? "Draft" : usr.invitations[0].status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Belum Dibuat</span>
                        )}
                      </td>

                      {/* Terdaftar */}
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                        {new Date(usr.createdAt).toLocaleDateString("id-ID")}
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemote(usr.id)}
                            disabled={impersonating}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition disabled:opacity-50 cursor-pointer"
                            title="Remote Dasbor Klien (Impersonate)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClient(usr);
                              setActionMsg(null);
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
                          >
                            Kelola
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
          <div>
            Menampilkan{" "}
            <strong>
              {pagination.total > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, pagination.total)}
            </strong>{" "}
            dari <strong>{pagination.total}</strong> klien terdaftar
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer font-semibold"
            >
              Sebelumnya
            </button>

            <span className="text-xs font-medium px-1">
              Halaman {pagination.page} dari {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer font-semibold"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal Kelola Klien ── */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => !deleting && setSelectedClient(null)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Detail Akun Klien</h3>
                <p className="text-xs text-gray-400 font-mono">ID: {selectedClient.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                disabled={deleting}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition"
              >
                &times;
              </button>
            </div>

            {/* Informasi Profil */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama Pengguna:</span>
                <span className="font-bold text-gray-900">{selectedClient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-mono text-gray-800">{selectedClient.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nomor WhatsApp:</span>
                <span className="font-mono text-gray-800">{selectedClient.phoneNumber || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tanggal Pendaftaran:</span>
                <span className="text-gray-700">{new Date(selectedClient.createdAt).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-gray-900 font-bold">Total Belanja Lunas:</span>
                <span className="font-mono font-bold text-emerald-700">
                  Rp {selectedClient.totalSpent.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Undangan Pernikahan Klien */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                Undangan Pernikahan Klien
              </h4>
              {selectedClient.invitations.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Klien belum membuat undangan (menunggu checkout / onboarding).</p>
              ) : (
                <div className="space-y-2">
                  {selectedClient.invitations.map((inv) => (
                    <div key={inv.id} className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {inv.groomName || "Pria"} &amp; {inv.brideName || "Wanita"}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {inv.subdomain ? `${inv.subdomain}` : `/${inv.invitationSlug}`} &bull; Tema: {inv.themeId}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tombol Aksi Klien */}
            <div className="pt-3 border-t border-gray-100 space-y-2.5">
              <button
                type="button"
                onClick={() => handleRemote(selectedClient.id)}
                disabled={impersonating}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Remote Dasbor Klien Sekarang</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteClient(selectedClient.id)}
                disabled={deleting}
                className="w-full py-2.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {deleting ? (
                  <span>Menghapus Klien...</span>
                ) : (
                  <span>Hapus Akun Klien Permanen</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
