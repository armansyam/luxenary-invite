"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

interface MetricSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
  momGrowth: number;
}

interface MonthlyDataPoint {
  label: string;
  revenue: number;
  expense: number;
  net: number;
}

interface ExpenseItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  paymentSource: string | null;
  referenceNumber: string | null;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  INFRASTRUCTURE: { label: "Server & Cloud", color: "bg-sky-50 text-sky-700 border-sky-200" },
  UTILITIES: { label: "Listrik & Internet", color: "bg-amber-50 text-amber-700 border-amber-200" },
  MARKETING: { label: "Marketing & Iklan", color: "bg-purple-50 text-purple-700 border-purple-200" },
  SOFTWARE_LICENSES: { label: "Software & Lisensi", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  OPERATIONAL: { label: "Operasional & ATK", color: "bg-stone-100 text-stone-700 border-stone-200" },
  OTHER: { label: "Pengeluaran Lainnya", color: "bg-stone-50 text-stone-600 border-stone-200" },
};

const PAYMENT_SOURCES = [
  { id: "BCA_OPERASIONAL", label: "BCA Operasional" },
  { id: "MANDIRI_BISNIS", label: "Mandiri Bisnis" },
  { id: "TRANSFER_BANK", label: "Transfer Bank Umum" },
  { id: "QRIS_EWALLET", label: "QRIS / E-Wallet" },
  { id: "CASH", label: "Kas Tunai (Petty Cash)" },
];

function formatRupiah(num: number | undefined | null): string {
  const safeNum = typeof num === "number" && !isNaN(num) ? num : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(safeNum);
}

function formatCompactRupiah(num: number): string {
  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " M";
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + " jt";
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(0) + " rb";
  }
  return num.toString();
}

function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function AdminCashflowTab() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Overview State
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewMetrics, setOverviewMetrics] = useState<MetricSummary | null>(null);
  const [monthlySeries, setMonthlySeries] = useState<MonthlyDataPoint[]>([]);
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyDataPoint | null>(null);

  // Expenses Ledger State
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseTotalFiltered, setExpenseTotalFiltered] = useState(0);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseTotalPages, setExpenseTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  // Inline Delete State (Zero Window.Confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("OPERATIONAL");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formSource, setFormSource] = useState("BCA_OPERASIONAL");
  const [formRef, setFormRef] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formReceiptUrl, setFormReceiptUrl] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formError, setFormError] = useState("");

  // Alert State
  const [alertBanner, setAlertBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showAlert = (type: "success" | "error", message: string) => {
    setAlertBanner({ type, message });
    setTimeout(() => setAlertBanner(null), 5000);
  };

  // 1. Fetch Overview (Cashflow Metrics & 12 Months Chart)
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(`/api/admin/finance/overview?timeframe=month&year=${selectedYear}`);
      const data = await res.json();
      if (res.ok) {
        const m = data.metrics || {};
        setOverviewMetrics({
          revenue: Number(m.revenue ?? m.totalRevenue ?? 0),
          expenses: Number(m.expenses ?? m.totalExpenses ?? 0),
          netProfit: Number(m.netProfit ?? 0),
          margin: Number(m.margin ?? m.profitMargin ?? 0),
          momGrowth: Number(m.momGrowth ?? m.revenueMoM ?? 0),
        });

        const series = (data.timeSeriesData || data.chartSeries || []).map((item: any) => ({
          label: item.label || "",
          revenue: Number(item.revenue || 0),
          expense: Number(item.expenses ?? item.expense ?? 0),
          net: Number(item.netProfit ?? item.net ?? 0),
        }));
        setMonthlySeries(series);
      } else {
        showAlert("error", data.error || "Gagal memuat ringkasan kas");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    } finally {
      setLoadingOverview(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // 2. Fetch Expenses Ledger
  const fetchExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try {
      const params = new URLSearchParams({
        page: String(expensePage),
        limit: "15",
        search: searchQuery.trim(),
        category: categoryFilter,
        paymentSource: sourceFilter,
      });
      const res = await fetch(`/api/admin/finance/expenses?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.expenses || []);
        setExpenseTotalFiltered(data.summary?.totalFilteredAmount ?? data.totalFilteredAmount ?? 0);
        setExpenseTotalPages(data.pagination?.totalPages || 1);
      } else {
        showAlert("error", data.error || "Gagal memuat buku kas pengeluaran");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    } finally {
      setLoadingExpenses(false);
    }
  }, [expensePage, searchQuery, categoryFilter, sourceFilter]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setExpensePage(1);
      fetchExpenses();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter, sourceFilter, fetchExpenses]);

  // Handle Receipt Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showAlert("error", "Ukuran file bukti maksimal 5 MB");
      return;
    }

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const res = await fetch("/api/admin/finance/upload-receipt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setFormReceiptUrl(data.url);
        showAlert("success", "Bukti struk berhasil diunggah");
      } else {
        showAlert("error", data.error || "Gagal mengunggah struk");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal upload file");
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Open Modal Create
  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setFormTitle("");
    setFormCategory("OPERATIONAL");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormSource("BCA_OPERASIONAL");
    setFormRef("");
    setFormNotes("");
    setFormReceiptUrl("");
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (exp: ExpenseItem) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormDate(new Date(exp.expenseDate).toISOString().split("T")[0]);
    setFormSource(exp.paymentSource || "BCA_OPERASIONAL");
    setFormRef(exp.referenceNumber || "");
    setFormNotes(exp.notes || "");
    setFormReceiptUrl(exp.receiptUrl || "");
    setFormError("");
    setIsModalOpen(true);
  };

  // Handle Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Nama pengeluaran wajib diisi.");
      return;
    }
    const numAmount = parseFloat(formAmount.replace(/[^0-9.]/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Nominal pengeluaran harus lebih dari Rp 0.");
      return;
    }

    setSubmittingForm(true);
    setFormError("");

    try {
      const payload = {
        title: formTitle.trim(),
        category: formCategory,
        amount: numAmount,
        expenseDate: new Date(formDate).toISOString(),
        paymentSource: formSource,
        referenceNumber: formRef.trim() || null,
        notes: formNotes.trim() || null,
        receiptUrl: formReceiptUrl || null,
      };

      const url = editingExpense
        ? `/api/admin/finance/expenses/${editingExpense.id}`
        : `/api/admin/finance/expenses`;
      const method = editingExpense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        showAlert(
          "success",
          editingExpense ? "Pengeluaran berhasil diperbarui" : "Pengeluaran baru berhasil dicatat"
        );
        fetchExpenses();
        fetchOverview();
      } else {
        setFormError(data.error || "Gagal menyimpan pengeluaran.");
      }
    } catch (err: any) {
      setFormError(err.message || "Gagal menghubungi server.");
    } finally {
      setSubmittingForm(false);
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/finance/expenses/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("success", "Catatan pengeluaran berhasil dihapus");
        setConfirmDeleteId(null);
        fetchExpenses();
        fetchOverview();
      } else {
        showAlert("error", data.error || "Gagal menghapus catatan pengeluaran");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghapus data");
    } finally {
      setDeletingId(null);
    }
  };

  // Kalkulasi Skala Grafik Batang Bulanan
  const maxBarValue = useMemo(() => {
    let max = 100_000;
    monthlySeries.forEach((item) => {
      if (item.revenue > max) max = item.revenue;
      if (item.expense > max) max = item.expense;
    });
    return max * 1.15; // Berikan 15% ruang di atas
  }, [monthlySeries]);

  return (
    <div className="space-y-6 max-w-7xl w-full pb-16">
      {/* Alert Banner */}
      {alertBanner && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all duration-200 ${
            alertBanner.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                alertBanner.type === "success" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span className="font-medium">{alertBanner.message}</span>
          </div>
          <button
            onClick={() => setAlertBanner(null)}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ── HEADER & KONTROL UTAMA ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            Laporan Kas & Hasil Bisnis
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Ringkasan kas masuk otomatis dari pesanan klien dan buku kas pengeluaran operasional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Tahun */}
          <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-xs font-medium">
            {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  selectedYear === year
                    ? "bg-stone-900 text-white shadow-xs font-semibold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Tombol Unduh CSV */}
          <a
            href={`/api/admin/finance/expenses?export=csv`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors shadow-xs"
          >
            <svg className="w-3.5 h-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Unduh CSV
          </a>

          {/* Tombol Tambah Pengeluaran */}
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Catat Pengeluaran
          </button>
        </div>
      </div>

      {/* ── PITA 3 METRIK REALITAS KAS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Kas Masuk (Omzet Penjualan) */}
        <div className="relative bg-white rounded-xl border border-stone-200/80 p-5 shadow-xs transition-all hover:border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
              Uang Masuk (Omzet)
            </span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-700">
              {loadingOverview ? "..." : formatRupiah(overviewMetrics?.revenue)}
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Otomatis 100% dari pesanan berstatus PAID ({selectedYear})
            </p>
          </div>
        </div>

        {/* 2. Kas Keluar (Beban Operasional) */}
        <div className="relative bg-white rounded-xl border border-stone-200/80 p-5 shadow-xs transition-all hover:border-rose-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
              Uang Keluar (Operasional)
            </span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-rose-700">
              {loadingOverview ? "..." : formatRupiah(overviewMetrics?.expenses)}
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Server VPS, domain, lisensi, & iklan ({selectedYear})
            </p>
          </div>
        </div>

        {/* 3. Sisa Kas Usaha (Hasil Bersih) */}
        <div className="relative bg-white rounded-xl border border-stone-200/80 p-5 shadow-xs transition-all hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
              Sisa Kas (Hasil Bersih)
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                (overviewMetrics?.netProfit ?? 0) >= 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              Margin: {(overviewMetrics?.margin ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold tracking-tight ${
                (overviewMetrics?.netProfit ?? 0) >= 0 ? "text-stone-900" : "text-rose-600"
              }`}
            >
              {loadingOverview ? "..." : formatRupiah(overviewMetrics?.netProfit)}
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  (overviewMetrics?.netProfit ?? 0) >= 0 ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {(overviewMetrics?.netProfit ?? 0) >= 0 ? "Surplus kas usaha berjalan" : "Defisit operasional berjalan"}
            </p>
          </div>
        </div>
      </div>

      {/* ── GRAFIK TREN BULANAN (JAN - DES) ── */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Tren Kas Bulanan ({selectedYear})</h3>
            {/* Slot Tipografi Hierarki Tetap (Zero Layout Shift & Bebas Card Bersarang) */}
            <div className="h-5 flex items-center text-xs mt-0.5">
              {hoveredMonth ? (
                <div className="flex items-center gap-2 text-stone-700 animate-in fade-in duration-150">
                  <span className="font-bold text-stone-900">{hoveredMonth.label}:</span>
                  <span className="font-semibold text-emerald-700">
                    Masuk {formatRupiah(hoveredMonth.revenue)}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="font-semibold text-rose-700">
                    Keluar {formatRupiah(hoveredMonth.expense)}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="font-semibold text-stone-900">
                    Sisa {formatRupiah(hoveredMonth.net)}
                  </span>
                </div>
              ) : (
                <p className="text-stone-500">
                  Perbandingan uang masuk vs uang keluar per bulan
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              <span className="text-stone-600">Uang Masuk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span className="text-stone-600">Uang Keluar</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="h-52 w-full pt-2">
          <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-3 border-b border-stone-200 pb-1">
            {monthlySeries.map((item, idx) => {
              const revHeight = maxBarValue > 0 ? (item.revenue / maxBarValue) * 100 : 0;
              const expHeight = maxBarValue > 0 ? (item.expense / maxBarValue) * 100 : 0;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  onMouseEnter={() => setHoveredMonth(item)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                    {/* Batang Masuk (Emerald) */}
                    <div
                      style={{ height: `${Math.max(revHeight, item.revenue > 0 ? 3 : 0)}%` }}
                      className="w-1/2 max-w-[16px] rounded-t-sm bg-emerald-600 group-hover:bg-emerald-500 transition-all duration-200"
                    />
                    {/* Batang Keluar (Rose) */}
                    <div
                      style={{ height: `${Math.max(expHeight, item.expense > 0 ? 3 : 0)}%` }}
                      className="w-1/2 max-w-[16px] rounded-t-sm bg-rose-500 group-hover:bg-rose-400 transition-all duration-200"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-stone-500 group-hover:text-stone-900 mt-2 transition-colors">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BUKU KAS PENGELUARAN (EXPENSE LEDGER) ── */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-stone-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-stone-900">Buku Kas Pengeluaran Operasional</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Daftar belanja server, domain, promosi, dan operasional harian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari keperluan/struk..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50/50 focus:bg-white focus:outline-hidden focus:border-stone-900 transition-colors"
              />
              <svg
                className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter Kategori */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-stone-700 focus:outline-hidden focus:border-stone-900"
            >
              <option value="ALL">Semua Kategori</option>
              {Object.entries(CATEGORY_LABELS).map(([catKey, catVal]) => (
                <option key={catKey} value={catKey}>
                  {catVal.label}
                </option>
              ))}
            </select>

            {/* Filter Sumber Dana */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-stone-700 focus:outline-hidden focus:border-stone-900"
            >
              <option value="ALL">Semua Sumber Dana</option>
              {PAYMENT_SOURCES.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter Info Bar */}
        <div className="px-5 py-2.5 bg-stone-50 border-b border-stone-200/80 flex items-center justify-between text-xs text-stone-600">
          <span>
            Menampilkan hasil: <strong className="text-stone-900">{expenses.length}</strong> catatan
          </span>
          <span>
            Total terfilter:{" "}
            <strong className="text-rose-700 font-mono font-semibold">
              {formatRupiah(expenseTotalFiltered)}
            </strong>
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100/60 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Keperluan / Pengeluaran</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Sumber Bayar</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Bukti Nota</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {loadingExpenses ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    Memuat catatan kas...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    Belum ada catatan pengeluaran pada filter ini.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const catBadge = CATEGORY_LABELS[exp.category] || CATEGORY_LABELS.OTHER;
                  const isConfirming = confirmDeleteId === exp.id;
                  const isDeleting = deletingId === exp.id;

                  return (
                    <tr key={exp.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-stone-600 font-medium">
                        {formatDateIndo(exp.expenseDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">{exp.notes}</div>
                        )}
                        {exp.referenceNumber && (
                          <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                            Ref: {exp.referenceNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${catBadge.color}`}
                        >
                          {catBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-stone-600">
                        {PAYMENT_SOURCES.find((s) => s.id === exp.paymentSource)?.label ||
                          exp.paymentSource ||
                          "-"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-rose-700">
                        {formatRupiah(exp.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {exp.receiptUrl ? (
                          <a
                            href={exp.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-900 hover:underline"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Lihat Struk
                          </a>
                        ) : (
                          <span className="text-stone-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              disabled={isDeleting}
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-xs transition-colors"
                            >
                              {isDeleting ? "..." : "Yakin Hapus?"}
                            </button>
                            <button
                              disabled={isDeleting}
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 text-[10px] font-medium transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(exp)}
                              className="text-stone-500 hover:text-stone-900 transition-colors p-1"
                              title="Edit Pengeluaran"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(exp.id)}
                              className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                              title="Hapus Pengeluaran"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {expenseTotalPages > 1 && (
          <div className="p-3 border-t border-stone-200/80 bg-stone-50/50 flex items-center justify-between text-xs text-stone-600">
            <span>
              Halaman {expensePage} dari {expenseTotalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={expensePage <= 1}
                onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
              >
                Sebelumnya
              </button>
              <button
                disabled={expensePage >= expenseTotalPages}
                onClick={() => setExpensePage((p) => Math.min(expenseTotalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL FORM CATAT / UBAH PENGELUARAN ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                {editingExpense ? "Ubah Catatan Pengeluaran" : "Catat Pengeluaran Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Nama Pengeluaran */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Pengeluaran / Keperluan *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: VPS Hostinger 1 Tahun, Saldo Iklan Meta"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              {/* Kategori & Nominal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Kategori *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-hidden focus:border-stone-900"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Nominal (Rp) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="Contoh: 150000"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 focus:outline-hidden focus:border-stone-900"
                  />
                </div>
              </div>

              {/* Tanggal & Sumber Dana */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-hidden focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Sumber Dana *</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-hidden focus:border-stone-900"
                  >
                    {PAYMENT_SOURCES.map((src) => (
                      <option key={src.id} value={src.id}>
                        {src.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* No Referensi */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nomor Referensi / ID Transaksi Bank (Opsional)
                </label>
                <input
                  type="text"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                  placeholder="Contoh: TRX-982341 atau No Rek Mandiri"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              {/* Upload Bukti Struk */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Bukti Nota / Struk Transaksi (Opsional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={uploadingReceipt}
                    className="text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
                  />
                  {uploadingReceipt && <span className="text-xs text-stone-500">Mengunggah...</span>}
                </div>
                {formReceiptUrl && (
                  <p className="text-[11px] text-emerald-700 mt-1 font-medium truncate">
                    Struk terlampir: {formReceiptUrl}
                  </p>
                )}
              </div>

              {/* Catatan / Memo */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Keterangan singkat tentang pengeluaran ini..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submittingForm}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
                >
                  {submittingForm ? "Menyimpan..." : editingExpense ? "Simpan Perubahan" : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCashflowTab;
