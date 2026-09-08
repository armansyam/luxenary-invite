"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";

interface OrderItem {
  id: string;
  invoiceNumber: string;
  planType: string;
  amount: number | string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | string;
  paymentMethod?: string | null;
  proofImageUrl?: string | null;
  rejectReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
  user?: {
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  } | null;
}

interface OrdersResponse {
  orders: OrderItem[];
  summary?: {
    totalFilteredRevenue: number;
    totalFilteredPaidOrders: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminOrdersTab() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"SEMUA" | "PENDING" | "PAID" | "FAILED">("SEMUA");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "7DAYS" | "THIS_MONTH">("TODAY");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ totalFilteredRevenue: 0, totalFilteredPaidOrders: 0 });

  // Modal State untuk Struk & Approval
  const [inspectOrder, setInspectOrder] = useState<OrderItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset ke halaman 1 setiap pencarian berganti
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Hitung rentang tanggal dari preset
  const getDateRange = useCallback(() => {
    if (dateFilter === "ALL") return { startDate: "", endDate: "" };
    const now = new Date();

    if (dateFilter === "TODAY") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: today.toISOString(), endDate: now.toISOString() };
    }

    if (dateFilter === "7DAYS") {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      return { startDate: past7.toISOString(), endDate: now.toISOString() };
    }

    if (dateFilter === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: firstDay.toISOString(), endDate: now.toISOString() };
    }

    return { startDate: "", endDate: "" };
  }, [dateFilter]);

  // Fetch data transaksi dari server
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusTab,
      });

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
        setSummary(data.summary || { totalFilteredRevenue: 0, totalFilteredPaidOrders: 0 });
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusTab, getDateRange]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const { startDate, endDate } = getDateRange();
    const params = new URLSearchParams({
      export: "csv",
      status: statusTab,
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    window.open(`/api/admin/orders?${params.toString()}`, "_blank");
  };

  // Handle Approve Order
  const handleApprove = async (orderId: string) => {
    try {
      setActionLoading(true);
      setActionMsg(null);
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ ok: true, msg: "Pembayaran berhasil disetujui. Undangan telah aktif." });
        setInspectOrder(null);
        fetchOrders();
      } else {
        throw new Error(data.error || "Gagal menyetujui transaksi");
      }
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal menyetujui transaksi" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Order
  const handleReject = async (orderId: string) => {
    if (!rejectReason.trim()) {
      alert("Harap masukkan alasan penolakan untuk klien.");
      return;
    }
    try {
      setActionLoading(true);
      setActionMsg(null);
      const res = await fetch(`/api/admin/orders/${orderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ ok: true, msg: "Transaksi telah ditolak dan alasan penolakan dikirim ke kasir klien." });
        setInspectOrder(null);
        setShowRejectForm(false);
        setRejectReason("");
        fetchOrders();
      } else {
        throw new Error(data.error || "Gagal menolak transaksi");
      }
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal menolak transaksi" });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper WhatsApp link
  const getWhatsAppLink = (phone?: string | null, clientName?: string | null, invoiceNo?: string) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    if (cleanPhone.length < 9) return null;
    const text = encodeURIComponent(
      `Halo Kak ${clientName || ""},\n\nKami dari tim Administrator terkait pesanan invoice *${invoiceNo || ""}*. Apakah ada yang bisa kami bantu mengenai proses aktivasi undangan pernikahan Anda?`
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
            <span>Manajemen Transaksi &amp; Kasir</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Daftar Transaksi</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Kelola verifikasi pembayaran manual, invoice gateway, dan unduh laporan kasir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-2xs border border-stone-200"
            title="Unduh Rekap CSV Transaksi Sesuai Filter"
          >
            <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => fetchOrders()}
            className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-gray-200 shadow-2xs cursor-pointer"
          >
            <svg className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* ── Filter Toolbar: Search, Status, Date Presets ── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input with Clear Button */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor invoice, nama klien, email, atau telepon..."
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

          {/* Date Filter Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-semibold text-gray-400 mr-1 shrink-0">Periode:</span>
            {[
              { id: "TODAY", label: "Hari Ini" },
              { id: "7DAYS", label: "7 Hari" },
              { id: "THIS_MONTH", label: "Bulan Ini" },
              { id: "ALL", label: "Semua Waktu" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDateFilter(preset.id as any);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  dateFilter === preset.id
                    ? "bg-amber-100 text-amber-900 font-bold border border-amber-200"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Subtabs Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 overflow-x-auto pb-1">
          {[
            { id: "PENDING", label: "Menunggu Pembayaran" },
            { id: "PAID", label: "Sukses / Lunas" },
            { id: "FAILED", label: "Gagal / Dibatalkan" },
            { id: "SEMUA", label: "Semua Transaksi" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusTab(tab.id as any);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                statusTab === tab.id
                  ? "bg-stone-900 text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
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

      {/* ── Desktop Widescreen Table View ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/80">
              <tr>
                {["Invoice", "Klien", "Paket", "Metode", "Jumlah", "Bukti Transfer", "Status", "Waktu", "Aksi"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data transaksi...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 italic">
                    Tidak ada transaksi yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const waLink = getWhatsAppLink(ord.user?.phoneNumber, ord.user?.name, ord.invoiceNumber);
                  return (
                    <tr key={ord.id} className="hover:bg-gray-50/80 transition">
                      {/* Invoice No */}
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                        {ord.invoiceNumber}
                      </td>

                      {/* Klien */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-semibold text-gray-900 truncate max-w-[140px]">{ord.user?.name || "Klien"}</div>
                            <div className="text-[11px] text-gray-400 font-mono truncate max-w-[140px]">{ord.user?.email || "-"}</div>
                          </div>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              title={`Chat WhatsApp ke ${ord.user?.phoneNumber}`}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition shrink-0"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.073.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Paket */}
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                        {ord.planType}
                      </td>

                      {/* Metode Pembayaran */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ord.paymentMethod === "MANUAL_TRANSFER" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Transfer Bank</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-900 border border-sky-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <span>QRIS / Otomatis</span>
                          </span>
                        )}
                      </td>

                      {/* Jumlah Nominal */}
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                        Rp {Number(ord.amount || 0).toLocaleString("id-ID")}
                      </td>

                      {/* Bukti Transfer */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ord.proofImageUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectOrder(ord);
                              setShowRejectForm(false);
                              setRejectReason("");
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Lihat Struk</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ord.status === "PAID" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Lunas</span>
                          </span>
                        )}
                        {ord.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Menunggu Bayar</span>
                          </span>
                        )}
                        {(ord.status === "FAILED" || ord.status === "EXPIRED") && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>{ord.status === "EXPIRED" ? "Kedaluwarsa" : "Ditolak"}</span>
                          </span>
                        )}
                      </td>

                      {/* Tanggal */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        <div>{new Date(ord.createdAt).toLocaleDateString("id-ID")}</div>
                        <div className="text-[10px] text-gray-400">{new Date(ord.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ord.status === "PENDING" && ord.proofImageUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectOrder(ord);
                              setShowRejectForm(false);
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                          >
                            Verifikasi
                          </button>
                        ) : ord.status === "FAILED" && ord.rejectReason ? (
                          <span className="text-[11px] text-gray-400 italic" title={ord.rejectReason}>
                            Alasan tercatat
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
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
            dari <strong>{pagination.total}</strong> transaksi total
            {summary.totalFilteredRevenue > 0 && (
              <span className="ml-2 pl-2 border-l border-gray-300 font-semibold text-emerald-700">
                (Omset Lunas Filter: Rp {summary.totalFilteredRevenue.toLocaleString("id-ID")})
              </span>
            )}
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

      {/* ── Modal Verifikasi & Struk Transfer ── */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => !actionLoading && setInspectOrder(null)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Verifikasi Pembayaran Manual</h3>
                <p className="text-xs text-gray-500 font-mono">{inspectOrder.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                disabled={actionLoading}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition"
              >
                &times;
              </button>
            </div>

            {/* Rincian Transaksi */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama Klien:</span>
                <span className="font-semibold text-gray-900">{inspectOrder.user?.name || "Klien"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-mono text-gray-700">{inspectOrder.user?.email || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paket:</span>
                <span className="font-semibold text-gray-900">{inspectOrder.planType}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-gray-900 font-bold">Total Tagihan:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  Rp {Number(inspectOrder.amount).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Gambar Struk */}
            {inspectOrder.proofImageUrl && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-700 block">Foto Bukti Transfer:</span>
                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-stone-900/5 max-h-72 flex items-center justify-center">
                  <img
                    src={inspectOrder.proofImageUrl}
                    alt="Bukti Transfer"
                    className="max-h-72 w-auto object-contain cursor-pointer"
                    onClick={() => window.open(inspectOrder.proofImageUrl || "", "_blank")}
                  />
                </div>
                <div className="text-right">
                  <a
                    href={inspectOrder.proofImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-amber-800 hover:underline"
                  >
                    Buka Ukuran Penuh di Tab Baru &rarr;
                  </a>
                </div>
              </div>
            )}

            {/* Form Alasan Tolak */}
            {showRejectForm ? (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-3">
                <label className="block text-xs font-bold text-rose-900">Alasan Penolakan untuk Klien:</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Misal: Bukti transfer buram / nominal tidak sesuai / dana belum masuk ke mutasi rekening."
                  className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  rows={3}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-700 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(inspectOrder.id)}
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition"
                  >
                    {actionLoading ? "Memproses..." : "Kirim Penolakan"}
                  </button>
                </div>
              </div>
            ) : (
              /* Tombol Aksi */
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Tolak Pembayaran
                </button>

                <button
                  type="button"
                  onClick={() => handleApprove(inspectOrder.id)}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {actionLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyetujui...</span>
                    </>
                  ) : (
                    <span>Konfirmasi Lunas &amp; Aktifkan</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
