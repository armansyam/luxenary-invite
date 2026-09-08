"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

// Tipe Data
interface MetricSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
  revenueMoM: number;
  expensesMoM: number;
  netProfitMoM: number;
  unpaidRecurringCount: number;
}

interface ChartDataPoint {
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

interface CategoryBreakdown {
  category: string;
  label: string;
  total: number;
  percentage: number;
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
  isLocked: boolean;
  createdAt: string;
}

interface RecurringItem {
  id: string;
  name: string;
  category: string;
  estimatedAmount: number;
  dueDayOfMonth: number;
  vendorName: string | null;
  paymentSource: string | null;
  isActive: boolean;
  isPaidThisMonth: boolean;
  paidExpenseId: string | null;
  paidExpenseDate: string | null;
  paidAmount: number | null;
}

interface TaxMonthItem {
  monthIndex: number;
  monthName: string;
  year: number;
  orderCount: number;
  grossRevenue: number;
  taxRate: number;
  taxRateLabel: string;
  taxDue: number;
  isTaxPaid: boolean;
  taxPaidAt: string | null;
  isClosed: boolean;
  closingId: string | null;
  notes: string | null;
}

interface ClosingItem {
  id: string;
  periodMonth: number;
  periodYear: number;
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  taxAmount: number;
  taxPaid: boolean;
  taxPaidAt: string | null;
  closedById: string;
  closedAt: string;
  notes: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  INFRASTRUCTURE: "Server & Infrastruktur",
  UTILITIES: "Listrik, Air & Internet",
  MARKETING: "Marketing & Promosi",
  SOFTWARE_LICENSES: "Software & Lisensi",
  OPERATIONAL: "Operasional & ATK",
  OTHER: "Pengeluaran Lainnya",
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

export function AdminFinanceTab() {
  // Sub Tab Navigation
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "expenses" | "recurring" | "pnl_closing" | "tax_recap"
  >("overview");

  // Filter Overview
  const [timeframe, setTimeframe] = useState<"day" | "month" | "year">("month");
  const [chartModel, setChartModel] = useState<"dual_bar" | "smooth_area" | "net_flow">("dual_bar");
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  // Data State
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewMetrics, setOverviewMetrics] = useState<MetricSummary | null>(null);
  const [chartSeries, setChartSeries] = useState<ChartDataPoint[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [recurringOverview, setRecurringOverview] = useState<any[]>([]);

  // Expenses State
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseTotalFiltered, setExpenseTotalFiltered] = useState(0);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseTotalPages, setExpenseTotalPages] = useState(1);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("ALL");
  const [expenseSourceFilter, setExpenseSourceFilter] = useState("ALL");

  // Recurring State & Modal
  const [recurringList, setRecurringList] = useState<RecurringItem[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null);
  const [recurringFormName, setRecurringFormName] = useState("");
  const [recurringFormVendor, setRecurringFormVendor] = useState("");
  const [recurringFormCategory, setRecurringFormCategory] = useState("UTILITIES");
  const [recurringFormAmount, setRecurringFormAmount] = useState("");
  const [recurringFormDueDay, setRecurringFormDueDay] = useState("1");
  const [recurringFormSource, setRecurringFormSource] = useState("TRANSFER_BANK");
  const [recurringFormIsActive, setRecurringFormIsActive] = useState(true);
  const [recurringSubmitting, setRecurringSubmitting] = useState(false);
  const [recurringFormError, setRecurringFormError] = useState("");

  // Inline Confirmation States (Zero Browser Popups)
  const [confirmPayRecurringId, setConfirmPayRecurringId] = useState<string | null>(null);
  const [payingRecurringId, setPayingRecurringId] = useState<string | null>(null);
  const [confirmDeleteRecurringId, setConfirmDeleteRecurringId] = useState<string | null>(null);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);
  const [confirmClosingStep, setConfirmClosingStep] = useState(false);
  const [confirmReopenId, setConfirmReopenId] = useState<string | null>(null);

  // Closing & PnL State
  const [closingList, setClosingList] = useState<ClosingItem[]>([]);
  const [closingLoading, setClosingLoading] = useState(false);
  const [closingMonth, setClosingMonth] = useState(new Date().getMonth() + 1);
  const [closingYear, setClosingYear] = useState(new Date().getFullYear());
  const [closingNotes, setClosingNotes] = useState("");
  const [closingSubmitting, setClosingSubmitting] = useState(false);

  // Tax State
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [taxBreakdown, setTaxBreakdown] = useState<TaxMonthItem[]>([]);
  const [taxSummary, setTaxSummary] = useState<any>(null);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [selectedTaxMonth, setSelectedTaxMonth] = useState<TaxMonthItem | null>(null);
  const [taxNTPNInput, setTaxNTPNInput] = useState("");
  const [taxSubmitting, setTaxSubmitting] = useState(false);

  // Modal Expense Form
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseFormTitle, setExpenseFormTitle] = useState("");
  const [expenseFormCategory, setExpenseFormCategory] = useState("OPERATIONAL");
  const [expenseFormAmount, setExpenseFormAmount] = useState("");
  const [expenseFormDate, setExpenseFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expenseFormSource, setExpenseFormSource] = useState("BCA_OPERASIONAL");
  const [expenseFormRef, setExpenseFormRef] = useState("");
  const [expenseFormNotes, setExpenseFormNotes] = useState("");
  const [expenseFormReceiptUrl, setExpenseFormReceiptUrl] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Notification Banner
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const showAlert = (type: "success" | "error" | "info", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage(null);
    }, 6000);
  };

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(`/api/admin/finance/overview?timeframe=${timeframe}`);
      const data = await res.json();
      if (res.ok) {
        const m = data.metrics || {};
        setOverviewMetrics({
          revenue: Number(m.revenue ?? m.grossRevenue ?? 0),
          expenses: Number(m.expenses ?? m.totalExpenses ?? 0),
          netProfit: Number(m.netProfit ?? 0),
          margin: Number(m.margin ?? m.profitMargin ?? 0),
          revenueMoM: Number(m.revenueMoM ?? m.momGrowth ?? 0),
          expensesMoM: Number(m.expensesMoM ?? 0),
          netProfitMoM: Number(m.netProfitMoM ?? 0),
          unpaidRecurringCount: Number(m.unpaidRecurringCount ?? 0),
        });
        setChartSeries((data.timeSeriesData || data.chartSeries || []).map((c: any) => ({
          label: c.label || "",
          revenue: Number(c.revenue || 0),
          expenses: Number(c.expenses ?? c.expense ?? 0),
          netProfit: Number(c.netProfit ?? c.net ?? 0),
        })));
        setCategoryBreakdown((data.categoryBreakdown || data.costBreakdown || []).map((b: any) => ({
          category: b.category || "OTHER",
          label: b.label || CATEGORY_LABELS[b.category] || b.category || "Lainnya",
          total: Number(b.total ?? b.amount ?? 0),
          percentage: Number(b.percentage || 0),
        })));
        setRecurringOverview(data.recurringExpensesStatus || data.recurringBills || []);
      } else {
        showAlert("error", data.error || "Gagal memuat data ringkasan finance");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    } finally {
      setLoadingOverview(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchOverview();
  }, [timeframe, fetchOverview]);

  const fetchExpenses = useCallback(async () => {
    setExpenseLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(expensePage),
        limit: "15",
        search: expenseSearch,
        category: expenseCategoryFilter,
        paymentSource: expenseSourceFilter,
      });
      const res = await fetch(`/api/admin/finance/expenses?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.expenses || []);
        setExpenseTotalFiltered(data.summary?.totalFilteredAmount || 0);
        setExpenseTotalPages(data.pagination?.totalPages || 1);
      } else {
        showAlert("error", data.error || "Gagal memuat buku kas pengeluaran");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    } finally {
      setExpenseLoading(false);
    }
  }, [expensePage, expenseSearch, expenseCategoryFilter, expenseSourceFilter]);

  useEffect(() => {
    if (activeSubTab === "expenses") {
      fetchExpenses();
    }
  }, [activeSubTab, expensePage, expenseCategoryFilter, expenseSourceFilter, fetchExpenses]);

  // Handle Search Debounce
  useEffect(() => {
    if (activeSubTab !== "expenses") return;
    const timer = setTimeout(() => {
      setExpensePage(1);
      fetchExpenses();
    }, 400);
    return () => clearTimeout(timer);
  }, [expenseSearch, activeSubTab, fetchExpenses]);

  const fetchRecurring = useCallback(async () => {
    setRecurringLoading(true);
    try {
      const res = await fetch(`/api/admin/finance/recurring`);
      const data = await res.json();
      if (res.ok) {
        setRecurringList(data.recurringExpenses || []);
      } else {
        showAlert("error", data.error || "Gagal memuat tagihan rutin");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    } finally {
      setRecurringLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === "recurring") {
      fetchRecurring();
    }
  }, [activeSubTab, fetchRecurring]);

  const fetchClosings = useCallback(async () => {
    setClosingLoading(true);
    try {
      const res = await fetch(`/api/admin/finance/closing`);
      const data = await res.json();
      if (res.ok) {
        setClosingList(data.closings || []);
      } else {
        showAlert("error", data.error || "Gagal memuat riwayat tutup buku");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    } finally {
      setClosingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === "pnl_closing") {
      fetchClosings();
    }
  }, [activeSubTab, fetchClosings]);

  const fetchTax = useCallback(async () => {
    setTaxLoading(true);
    try {
      const res = await fetch(`/api/admin/finance/tax?year=${taxYear}`);
      const data = await res.json();
      if (res.ok) {
        setTaxBreakdown(data.monthlyBreakdown || []);
        setTaxSummary(data.summary || null);
      } else {
        showAlert("error", data.error || "Gagal memuat lembar rekapitulasi pajak");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    } finally {
      setTaxLoading(false);
    }
  }, [taxYear]);

  useEffect(() => {
    if (activeSubTab === "tax_recap") {
      fetchTax();
    }
  }, [activeSubTab, taxYear, fetchTax]);

  // Action: Inline 2-Step Pay Recurring (Tanpa Dialog Popup Browser)
  const handleInitiatePayRecurring = (id: string) => {
    setConfirmPayRecurringId(id);
    // Otomatis kembalikan status jika tidak diklik dalam 6 detik
    setTimeout(() => {
      setConfirmPayRecurringId((cur) => (cur === id ? null : cur));
    }, 6000);
  };

  const executePayRecurring = async (rec: RecurringItem) => {
    setConfirmPayRecurringId(null);
    setPayingRecurringId(rec.id);
    try {
      const res = await fetch(`/api/admin/finance/recurring/${rec.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("success", data.message || `Tagihan ${rec.name} berhasil dibukukan.`);
        fetchRecurring();
        fetchOverview();
      } else {
        showAlert("error", data.error || "Gagal memproses pembayaran tagihan");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Terjadi kesalahan sistem");
    } finally {
      setPayingRecurringId(null);
    }
  };

  // Compute Ringkasan Komitmen Beban Bulanan
  const recurringSummary = useMemo(() => {
    const activeItems = recurringList.filter((r) => r.isActive !== false);
    const totalEstimated = activeItems.reduce((acc, r) => acc + (Number(r.estimatedAmount) || 0), 0);
    const paidItems = recurringList.filter((r) => r.isPaidThisMonth);
    const totalPaid = paidItems.reduce((acc, r) => acc + (Number(r.paidAmount) || Number(r.estimatedAmount) || 0), 0);
    const unpaidItems = activeItems.filter((r) => !r.isPaidThisMonth);
    const totalUnpaid = unpaidItems.reduce((acc, r) => acc + (Number(r.estimatedAmount) || 0), 0);
    return {
      totalActiveCount: activeItems.length,
      totalEstimated,
      paidCount: paidItems.length,
      totalPaid,
      unpaidCount: unpaidItems.length,
      totalUnpaid,
    };
  }, [recurringList]);

  // Modal Handlers: Tambah & Edit Tagihan Rutin
  const openAddRecurringModal = () => {
    setEditingRecurring(null);
    setRecurringFormName("");
    setRecurringFormVendor("");
    setRecurringFormCategory("UTILITIES");
    setRecurringFormAmount("");
    setRecurringFormDueDay("1");
    setRecurringFormSource("TRANSFER_BANK");
    setRecurringFormIsActive(true);
    setRecurringFormError("");
    setIsRecurringModalOpen(true);
  };

  const openEditRecurringModal = (rec: RecurringItem) => {
    setEditingRecurring(rec);
    setRecurringFormName(rec.name);
    setRecurringFormVendor(rec.vendorName || "");
    setRecurringFormCategory(rec.category || "UTILITIES");
    setRecurringFormAmount(String(rec.estimatedAmount || ""));
    setRecurringFormDueDay(String(rec.dueDayOfMonth || 1));
    setRecurringFormSource(rec.paymentSource || "TRANSFER_BANK");
    setRecurringFormIsActive(rec.isActive ?? true);
    setRecurringFormError("");
    setIsRecurringModalOpen(true);
  };

  const handleSubmitRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringFormName.trim()) {
      setRecurringFormError("Nama tagihan operasional wajib diisi.");
      return;
    }
    const amountNum = parseFloat(recurringFormAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setRecurringFormError("Nominal estimasi biaya bulanan harus lebih besar dari 0.");
      return;
    }
    const dueDayNum = parseInt(recurringFormDueDay, 10);
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      setRecurringFormError("Tanggal jatuh tempo harus antara 1 sampai 31.");
      return;
    }

    setRecurringSubmitting(true);
    setRecurringFormError("");
    try {
      if (editingRecurring) {
        const res = await fetch("/api/admin/finance/recurring", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingRecurring.id,
            name: recurringFormName.trim(),
            vendorName: recurringFormVendor.trim() || null,
            category: recurringFormCategory,
            estimatedAmount: amountNum,
            dueDayOfMonth: dueDayNum,
            paymentSource: recurringFormSource,
            isActive: recurringFormIsActive,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showAlert("success", `Tagihan "${recurringFormName}" berhasil diperbarui.`);
          setIsRecurringModalOpen(false);
          fetchRecurring();
          fetchOverview();
        } else {
          setRecurringFormError(data.error || "Gagal memperbarui tagihan rutin.");
        }
      } else {
        const res = await fetch("/api/admin/finance/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: recurringFormName.trim(),
            vendorName: recurringFormVendor.trim() || null,
            category: recurringFormCategory,
            estimatedAmount: amountNum,
            dueDayOfMonth: dueDayNum,
            paymentSource: recurringFormSource,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showAlert("success", `Tagihan rutin "${recurringFormName}" berhasil ditambahkan.`);
          setIsRecurringModalOpen(false);
          fetchRecurring();
          fetchOverview();
        } else {
          setRecurringFormError(data.error || "Gagal menambahkan tagihan rutin.");
        }
      }
    } catch (err: any) {
      setRecurringFormError(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setRecurringSubmitting(false);
    }
  };

  const executeDeleteRecurring = async (rec: RecurringItem) => {
    setConfirmDeleteRecurringId(null);
    try {
      const res = await fetch(`/api/admin/finance/recurring?id=${rec.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("success", `Tagihan rutin "${rec.name}" berhasil dihapus.`);
        fetchRecurring();
        fetchOverview();
      } else {
        showAlert("error", data.error || "Gagal menghapus tagihan rutin.");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Terjadi kesalahan sistem.");
    }
  };

  // Action: Upload Bukti Struk
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    setFormError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/finance/upload-receipt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.url) {
        setExpenseFormReceiptUrl(data.url);
        showAlert("success", "Bukti struk berhasil diunggah.");
      } else {
        setFormError(data.error || "Gagal mengunggah bukti struk.");
      }
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan upload.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Action: Simpan / Edit Expense
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseSubmitting(true);
    setFormError("");

    const numericAmount = parseFloat(expenseFormAmount.replace(/[^0-9]/g, ""));
    if (!expenseFormTitle.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      setFormError("Nama pengeluaran dan nominal valid wajib diisi.");
      setExpenseSubmitting(false);
      return;
    }

    try {
      const payload = {
        title: expenseFormTitle.trim(),
        category: expenseFormCategory,
        amount: numericAmount,
        expenseDate: expenseFormDate,
        paymentSource: expenseFormSource,
        referenceNumber: expenseFormRef.trim() || null,
        notes: expenseFormNotes.trim() || null,
        receiptUrl: expenseFormReceiptUrl || null,
      };

      let res;
      if (editingExpenseId) {
        res = await fetch(`/api/admin/finance/expenses/${editingExpenseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/finance/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        showAlert("success", editingExpenseId ? "Mutasi pengeluaran berhasil diperbarui." : "Pengeluaran baru berhasil dibukukan.");
        setIsExpenseModalOpen(false);
        resetExpenseForm();
        fetchExpenses();
        fetchOverview();
      } else {
        setFormError(data.error || "Gagal menyimpan pengeluaran.");
      }
    } catch (err: any) {
      setFormError(err.message || "Terjadi gangguan koneksi.");
    } finally {
      setExpenseSubmitting(false);
    }
  };

  // Action: Hapus Expense (Inline Tanpa Popup Browser)
  const executeDeleteExpense = async (id: string) => {
    setConfirmDeleteExpenseId(null);
    try {
      const res = await fetch(`/api/admin/finance/expenses/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("success", "Mutasi pengeluaran berhasil dihapus.");
        fetchExpenses();
        fetchOverview();
      } else {
        showAlert("error", data.error || "Gagal menghapus mutasi.");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    }
  };

  // Action: Buka Modal Edit Expense
  const openEditExpense = (item: ExpenseItem) => {
    if (item.isLocked) {
      showAlert("info", "Mutasi ini berada dalam periode buku yang telah dikunci dan tidak dapat diubah.");
      return;
    }
    setEditingExpenseId(item.id);
    setExpenseFormTitle(item.title);
    setExpenseFormCategory(item.category);
    setExpenseFormAmount(item.amount.toString());
    setExpenseFormDate(new Date(item.expenseDate).toISOString().split("T")[0]);
    setExpenseFormSource(item.paymentSource || "BCA_OPERASIONAL");
    setExpenseFormRef(item.referenceNumber || "");
    setExpenseFormNotes(item.notes || "");
    setExpenseFormReceiptUrl(item.receiptUrl || "");
    setFormError("");
    setIsExpenseModalOpen(true);
  };

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseFormTitle("");
    setExpenseFormCategory("OPERATIONAL");
    setExpenseFormAmount("");
    setExpenseFormDate(new Date().toISOString().split("T")[0]);
    setExpenseFormSource("BCA_OPERASIONAL");
    setExpenseFormRef("");
    setExpenseFormNotes("");
    setExpenseFormReceiptUrl("");
    setFormError("");
  };

  // Action: Eksekusi Tutup Buku (Inline 2-Step Confirmation)
  const handleExecuteClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmClosingStep) {
      setConfirmClosingStep(true);
      return;
    }

    setClosingSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: closingMonth,
          year: closingYear,
          notes: closingNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("success", data.message || "Tutup buku berhasil dieksekusi.");
        setClosingNotes("");
        setConfirmClosingStep(false);
        fetchClosings();
        fetchOverview();
      } else {
        showAlert("error", data.error || "Gagal menutup buku.");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    } finally {
      setClosingSubmitting(false);
    }
  };

  // Action: Buka Kembali Tutup Buku (Inline 2-Step Reopen)
  const executeReopenClosing = async (id: string) => {
    setConfirmReopenId(null);
    try {
      const res = await fetch(`/api/admin/finance/closing?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("success", data.message || "Periode tutup buku berhasil dibuka kembali.");
        fetchClosings();
        fetchOverview();
      } else {
        showAlert("error", data.error || "Gagal membuka kembali tutup buku");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Gagal menghubungi server");
    }
  };

  // Action: Simpan Setoran Pajak
  const handleSaveTaxStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaxMonth) return;

    setTaxSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedTaxMonth.monthIndex,
          year: selectedTaxMonth.year,
          taxPaid: true,
          ntpn: taxNTPNInput.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("success", data.message || "Status setoran pajak berhasil disimpan.");
        setTaxModalOpen(false);
        fetchTax();
        fetchClosings();
      } else {
        showAlert("error", data.error || "Gagal memperbarui status pajak.");
      }
    } catch (err: any) {
      showAlert("error", err.message || "Terjadi kesalahan server");
    } finally {
      setTaxSubmitting(false);
    }
  };

  // SVG Chart Calculation
  const chartCalculations = useMemo(() => {
    if (!chartSeries || chartSeries.length === 0) {
      return { maxVal: 100, minVal: 0, points: [] };
    }

    let max = 0;
    let min = 0;

    chartSeries.forEach((pt) => {
      if (pt.revenue > max) max = pt.revenue;
      if (pt.expenses > max) max = pt.expenses;
      if (pt.netProfit > max) max = pt.netProfit;
      if (pt.netProfit < min) min = pt.netProfit;
    });

    if (max === 0 && min === 0) max = 1000000;
    // Tambahkan 15% head-room
    max = Math.ceil((max * 1.15) / 100000) * 100000;

    return {
      maxVal: max,
      minVal: min,
      count: chartSeries.length,
    };
  }, [chartSeries]);

  return (
    <div className="w-full bg-[#FAFAF9] text-stone-800 min-h-screen pb-20 font-sans selection:bg-stone-200">
      {/* Top Banner Alert */}
      {alertMessage && (
        <div
          className={`sticky top-0 z-50 px-6 py-3 border-b text-xs flex items-center justify-between transition-all duration-300 ${
            alertMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : alertMessage.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-stone-100 text-stone-800 border-stone-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                alertMessage.type === "success"
                  ? "bg-emerald-600"
                  : alertMessage.type === "error"
                  ? "bg-rose-600"
                  : "bg-stone-600"
              }`}
            />
            <span className="font-medium tracking-wide">{alertMessage.text}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-stone-400 hover:text-stone-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* CONTINUOUS EDITORIAL CANVAS HEADER */}
      <header className="border-b border-stone-200/80 bg-white px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400 font-semibold mb-1">
              <span>Executive Financial Management</span>
              <span>•</span>
              <span className="text-stone-600">Enterprise Accounting</span>
            </div>
            <h1 className="text-2xl font-light tracking-tight text-stone-900 font-serif">
              Finance & Rekapitulasi Kas
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Pusat pembukuan omzet penjualan, manajemen beban operasional, tagihan rutin, dan kepatuhan pajak.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                resetExpenseForm();
                setIsExpenseModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded transition shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Catat Pengeluaran</span>
            </button>

            <a
              href="/api/admin/finance/expenses?export=csv"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 hover:border-stone-400 bg-white text-stone-700 text-xs font-medium rounded transition"
            >
              <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Ekspor CSV</span>
            </a>
          </div>
        </div>
      </header>

      {/* CONTINUOUS METRIC STRIP (Bebas Card AI, Garis Pemisah Vertikal Minimalis) */}
      <section className="border-b border-stone-200/80 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-stone-200/80">
          {/* Revenue */}
          <div className="p-6">
            <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1 flex items-center justify-between">
              <span>Gross Revenue (Omzet)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-light text-stone-900 tracking-tight">
              {overviewMetrics ? formatRupiah(overviewMetrics.revenue) : "..."}
            </div>
            <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
              <span>MoM:</span>
              <span
                className={
                  (overviewMetrics?.revenueMoM || 0) >= 0 ? "text-emerald-700 font-medium" : "text-rose-600 font-medium"
                }
              >
                {(overviewMetrics?.revenueMoM || 0) >= 0 ? "+" : ""}
                {overviewMetrics?.revenueMoM || 0}%
              </span>
              <span className="text-stone-300">vs bln lalu</span>
            </div>
          </div>

          {/* OPEX */}
          <div className="p-6">
            <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1 flex items-center justify-between">
              <span>Beban Operasional</span>
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            </div>
            <div className="text-2xl font-light text-stone-900 tracking-tight">
              {overviewMetrics ? formatRupiah(overviewMetrics.expenses) : "..."}
            </div>
            <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
              <span>MoM:</span>
              <span
                className={
                  (overviewMetrics?.expensesMoM || 0) <= 0 ? "text-emerald-700 font-medium" : "text-stone-600 font-medium"
                }
              >
                {(overviewMetrics?.expensesMoM || 0) >= 0 ? "+" : ""}
                {overviewMetrics?.expensesMoM || 0}%
              </span>
              <span className="text-stone-300">vs bln lalu</span>
            </div>
          </div>

          {/* Net Profit */}
          <div className="p-6">
            <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1 flex items-center justify-between">
              <span>Laba Bersih Operasi</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  (overviewMetrics?.netProfit || 0) >= 0 ? "bg-emerald-600" : "bg-rose-500"
                }`}
              />
            </div>
            <div
              className={`text-2xl font-light tracking-tight ${
                (overviewMetrics?.netProfit || 0) >= 0 ? "text-stone-900" : "text-rose-700"
              }`}
            >
              {overviewMetrics ? formatRupiah(overviewMetrics.netProfit) : "..."}
            </div>
            <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
              <span>MoM:</span>
              <span
                className={
                  (overviewMetrics?.netProfitMoM || 0) >= 0 ? "text-emerald-700 font-medium" : "text-rose-600 font-medium"
                }
              >
                {(overviewMetrics?.netProfitMoM || 0) >= 0 ? "+" : ""}
                {overviewMetrics?.netProfitMoM || 0}%
              </span>
              <span className="text-stone-300">laba bersih</span>
            </div>
          </div>

          {/* Margin */}
          <div className="p-6">
            <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1 flex items-center justify-between">
              <span>Operating Margin</span>
              <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            </div>
            <div className="text-2xl font-light text-stone-900 tracking-tight">
              {overviewMetrics ? `${overviewMetrics.margin}%` : "..."}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              <span>Efisiensi laba atas omzet</span>
            </div>
          </div>

          {/* Tagihan Rutin Pending */}
          <div className="p-6 col-span-2 md:col-span-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1 flex items-center justify-between">
              <span>Tagihan Belum Lunas</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  (overviewMetrics?.unpaidRecurringCount || 0) > 0 ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </div>
            <div className="text-2xl font-light text-stone-900 tracking-tight">
              {overviewMetrics ? `${overviewMetrics.unpaidRecurringCount} Tagihan` : "..."}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              {(overviewMetrics?.unpaidRecurringCount || 0) > 0 ? (
                <span className="text-amber-700 font-medium">Perlu dibayar bulan ini</span>
              ) : (
                <span className="text-emerald-700 font-medium">Semua rutin bulan ini beres</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SUB-NAVIGASI KANVAS EDITORIAL */}
      <nav className="border-b border-stone-200/80 bg-[#F7F7F6] px-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center gap-8 overflow-x-auto no-scrollbar text-xs font-medium">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`py-3.5 border-b-2 transition whitespace-nowrap ${
              activeSubTab === "overview"
                ? "border-stone-900 text-stone-900 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Monitor Arus Kas & Visualisasi
          </button>

          <button
            onClick={() => setActiveSubTab("expenses")}
            className={`py-3.5 border-b-2 transition whitespace-nowrap ${
              activeSubTab === "expenses"
                ? "border-stone-900 text-stone-900 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Buku Kas OPEX (Pengeluaran)
          </button>

          <button
            onClick={() => setActiveSubTab("recurring")}
            className={`py-3.5 border-b-2 transition whitespace-nowrap ${
              activeSubTab === "recurring"
                ? "border-stone-900 text-stone-900 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Tagihan Rutin (Beban Bulanan)
          </button>

          <button
            onClick={() => setActiveSubTab("pnl_closing")}
            className={`py-3.5 border-b-2 transition whitespace-nowrap ${
              activeSubTab === "pnl_closing"
                ? "border-stone-900 text-stone-900 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Laporan Laba Rugi & Tutup Buku
          </button>

          <button
            onClick={() => setActiveSubTab("tax_recap")}
            className={`py-3.5 border-b-2 transition whitespace-nowrap ${
              activeSubTab === "tax_recap"
                ? "border-stone-900 text-stone-900 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Rekapitulasi Pajak PPh Final (0.5%)
          </button>
        </div>
      </nav>

      {/* KONTEN UTAMA */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* ===================== SUB TAB 1: MONITOR & GRAFIK ===================== */}
        {activeSubTab === "overview" && (
          <div className="space-y-8">
            {/* Control Bar Grafik */}
            <div className="bg-white border border-stone-200/80 p-6 rounded">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-stone-100 gap-4">
                <div>
                  <h3 className="text-base font-serif text-stone-900">
                    Visualisasi Kinerja Keuangan & Arus Kas
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Perbandingan dinamis pemasukan otomatis order klien vs realisasi beban kas operasional.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Selector Model Grafik */}
                  <div className="inline-flex p-0.5 bg-stone-100 rounded text-xs">
                    <button
                      onClick={() => setChartModel("dual_bar")}
                      className={`px-3 py-1.5 rounded transition ${
                        chartModel === "dual_bar"
                          ? "bg-white text-stone-900 font-medium shadow-sm"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      Batang Komparasi
                    </button>
                    <button
                      onClick={() => setChartModel("smooth_area")}
                      className={`px-3 py-1.5 rounded transition ${
                        chartModel === "smooth_area"
                          ? "bg-white text-stone-900 font-medium shadow-sm"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      Kurva Kontinu
                    </button>
                    <button
                      onClick={() => setChartModel("net_flow")}
                      className={`px-3 py-1.5 rounded transition ${
                        chartModel === "net_flow"
                          ? "bg-white text-stone-900 font-medium shadow-sm"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      Net Baseline (Rp 0)
                    </button>
                  </div>

                  {/* Selector Rentang Waktu */}
                  <div className="inline-flex p-0.5 bg-stone-100 rounded text-xs">
                    <button
                      onClick={() => setTimeframe("day")}
                      className={`px-3 py-1.5 rounded transition ${
                        timeframe === "day"
                          ? "bg-stone-900 text-white font-medium"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      30 Hari
                    </button>
                    <button
                      onClick={() => setTimeframe("month")}
                      className={`px-3 py-1.5 rounded transition ${
                        timeframe === "month"
                          ? "bg-stone-900 text-white font-medium"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      12 Bulan
                    </button>
                    <button
                      onClick={() => setTimeframe("year")}
                      className={`px-3 py-1.5 rounded transition ${
                        timeframe === "year"
                          ? "bg-stone-900 text-white font-medium"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      Tahunan
                    </button>
                  </div>
                </div>
              </div>

              {/* NATIVE 60FPS SVG GRAPHIC CANVAS */}
              <div className="pt-6">
                {loadingOverview ? (
                  <div className="h-72 flex items-center justify-center text-xs text-stone-400">
                    Memuat grafik kalkulasi keuangan...
                  </div>
                ) : chartSeries.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-xs text-stone-400">
                    Belum ada data transaksi keuangan pada periode ini.
                  </div>
                ) : (
                  <div className="relative">
                    {/* Tooltip Float */}
                    {hoveredPoint && (
                      <div className="absolute top-2 right-4 bg-stone-900/90 text-white text-[11px] px-3 py-2 rounded shadow pointer-events-none z-20 backdrop-blur-sm border border-stone-700">
                        <div className="font-semibold text-stone-300 pb-1 border-b border-stone-700 mb-1">
                          Periode: {hoveredPoint.label}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-emerald-400">Pemasukan:</span>
                          <span className="font-mono">{formatRupiah(hoveredPoint.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-stone-300">Pengeluaran:</span>
                          <span className="font-mono">{formatRupiah(hoveredPoint.expenses)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-stone-800 mt-1">
                          <span className="font-medium text-stone-400">Laba Bersih:</span>
                          <span
                            className={`font-mono font-medium ${
                              hoveredPoint.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {formatRupiah(hoveredPoint.netProfit)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* SVG Container */}
                    <div className="w-full overflow-x-auto">
                      <svg
                        viewBox="0 0 960 280"
                        className="w-full h-72 block select-none"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          {/* Gradients */}
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#15803d" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#15803d" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#78716c" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#78716c" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Grid Lines Horisontal */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const y = 230 - ratio * 190;
                          const val = chartCalculations.maxVal * ratio;
                          return (
                            <g key={idx}>
                              <line
                                x1="40"
                                y1={y}
                                x2="940"
                                y2={y}
                                stroke="#E7E5E4"
                                strokeDasharray={idx === 0 ? "none" : "3,3"}
                                strokeWidth="1"
                              />
                              <text
                                x="35"
                                y={y + 3}
                                textAnchor="end"
                                className="text-[9px] fill-stone-400 font-mono"
                              >
                                {formatCompactRupiah(val)}
                              </text>
                            </g>
                          );
                        })}

                        {/* RENDER MODEL: 1. DUAL BAR */}
                        {chartModel === "dual_bar" && (
                          <g>
                            {chartSeries.map((item, idx) => {
                              const totalBars = chartSeries.length;
                              const availableWidth = 880;
                              const slotWidth = availableWidth / totalBars;
                              const barW = Math.min(22, slotWidth * 0.35);
                              const xCenter = 55 + idx * slotWidth + slotWidth / 2;

                              const revHeight =
                                (item.revenue / (chartCalculations.maxVal || 1)) * 190;
                              const expHeight =
                                (item.expenses / (chartCalculations.maxVal || 1)) * 190;

                              const revY = 230 - revHeight;
                              const expY = 230 - expHeight;

                              return (
                                <g
                                  key={idx}
                                  className="cursor-pointer group"
                                  onMouseEnter={() => setHoveredPoint(item)}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                >
                                  {/* Hover Background Area */}
                                  <rect
                                    x={xCenter - slotWidth / 2}
                                    y="30"
                                    width={slotWidth}
                                    height="210"
                                    fill="transparent"
                                    className="group-hover:fill-stone-100/50"
                                  />

                                  {/* Revenue Bar */}
                                  <rect
                                    x={xCenter - barW - 1.5}
                                    y={revY}
                                    width={barW}
                                    height={revHeight}
                                    fill="#15803d"
                                    rx="1"
                                    className="transition-all duration-200 group-hover:fill-emerald-800"
                                  />

                                  {/* Expense Bar */}
                                  <rect
                                    x={xCenter + 1.5}
                                    y={expY}
                                    width={barW}
                                    height={expHeight}
                                    fill="#78716c"
                                    rx="1"
                                    className="transition-all duration-200 group-hover:fill-stone-800"
                                  />

                                  {/* Label Sumbu X */}
                                  <text
                                    x={xCenter}
                                    y="250"
                                    textAnchor="middle"
                                    className="text-[9px] fill-stone-500 font-sans"
                                  >
                                    {item.label}
                                  </text>
                                </g>
                              );
                            })}
                          </g>
                        )}

                        {/* RENDER MODEL: 2. SMOOTH CURVE / AREA */}
                        {chartModel === "smooth_area" && (() => {
                          const n = chartSeries.length;
                          const slotWidth = 880 / (n - 1 || 1);

                          // Build Revenue Path
                          const revPoints = chartSeries.map((d, i) => {
                            const x = 55 + i * slotWidth;
                            const y = 230 - (d.revenue / (chartCalculations.maxVal || 1)) * 190;
                            return { x, y };
                          });

                          // Build Expense Path
                          const expPoints = chartSeries.map((d, i) => {
                            const x = 55 + i * slotWidth;
                            const y = 230 - (d.expenses / (chartCalculations.maxVal || 1)) * 190;
                            return { x, y };
                          });

                          const createPathD = (pts: { x: number; y: number }[]) => {
                            if (pts.length === 0) return "";
                            return pts.reduce((acc, p, i) => {
                              return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                            }, "");
                          };

                          const revLineD = createPathD(revPoints);
                          const expLineD = createPathD(expPoints);

                          const revAreaD = `${revLineD} L ${revPoints[revPoints.length - 1].x} 230 L ${revPoints[0].x} 230 Z`;
                          const expAreaD = `${expLineD} L ${expPoints[expPoints.length - 1].x} 230 L ${expPoints[0].x} 230 Z`;

                          return (
                            <g>
                              {/* Expense Area */}
                              <path d={expAreaD} fill="url(#expenseGrad)" />
                              <path d={expLineD} fill="none" stroke="#78716c" strokeWidth="2" />

                              {/* Revenue Area */}
                              <path d={revAreaD} fill="url(#revenueGrad)" />
                              <path d={revLineD} fill="none" stroke="#15803d" strokeWidth="2" />

                              {/* Interaction Nodes */}
                              {chartSeries.map((item, idx) => {
                                const x = 55 + idx * slotWidth;
                                const ry = 230 - (item.revenue / (chartCalculations.maxVal || 1)) * 190;
                                const ey = 230 - (item.expenses / (chartCalculations.maxVal || 1)) * 190;
                                return (
                                  <g
                                    key={idx}
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHoveredPoint(item)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                  >
                                    <line
                                      x1={x}
                                      y1="35"
                                      x2={x}
                                      y2="230"
                                      stroke="#D6D3D1"
                                      strokeWidth="1"
                                      strokeDasharray="2,2"
                                    />
                                    <circle cx={x} cy={ry} r="3.5" fill="#15803d" stroke="#fff" strokeWidth="1.5" />
                                    <circle cx={x} cy={ey} r="3.5" fill="#78716c" stroke="#fff" strokeWidth="1.5" />
                                    <text
                                      x={x}
                                      y="250"
                                      textAnchor="middle"
                                      className="text-[9px] fill-stone-500 font-sans"
                                    >
                                      {item.label}
                                    </text>
                                  </g>
                                );
                              })}
                            </g>
                          );
                        })()}

                        {/* RENDER MODEL: 3. NET FLOW BASELINE (RP 0) */}
                        {chartModel === "net_flow" && (() => {
                          const n = chartSeries.length;
                          const slotWidth = 880 / n;

                          return (
                            <g>
                              {/* Baseline Line Rp 0 */}
                              <line
                                x1="40"
                                y1="230"
                                x2="940"
                                y2="230"
                                stroke="#1C1917"
                                strokeWidth="1.5"
                              />

                              {chartSeries.map((item, idx) => {
                                const xCenter = 55 + idx * slotWidth + slotWidth / 2;
                                const barW = Math.min(32, slotWidth * 0.6);
                                const isPositive = item.netProfit >= 0;
                                const height =
                                  (Math.abs(item.netProfit) / (chartCalculations.maxVal || 1)) * 180;
                                const y = isPositive ? 230 - height : 230;

                                return (
                                  <g
                                    key={idx}
                                    className="cursor-pointer group"
                                    onMouseEnter={() => setHoveredPoint(item)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                  >
                                    <rect
                                      x={xCenter - barW / 2}
                                      y={y}
                                      width={barW}
                                      height={height || 2}
                                      fill={isPositive ? "#0284c7" : "#b91c1c"}
                                      rx="1"
                                      className="transition-all duration-200"
                                    />
                                    <text
                                      x={xCenter}
                                      y="250"
                                      textAnchor="middle"
                                      className="text-[9px] fill-stone-500 font-sans"
                                    >
                                      {item.label}
                                    </text>
                                  </g>
                                );
                              })}
                            </g>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 pt-4 border-t border-stone-100 text-xs text-stone-500">
                      {chartModel !== "net_flow" ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-[#15803d] rounded-sm" />
                            <span>Omzet Penjualan (Order Paid)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-[#78716c] rounded-sm" />
                            <span>Beban Pengeluaran (OPEX)</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-[#0284c7] rounded-sm" />
                            <span>Laba Bersih Surplus (&gt; Rp 0)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-[#b91c1c] rounded-sm" />
                            <span>Defisit Operasional (&lt; Rp 0)</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DUA KOLOM BAWAH: Alokasi Biaya & Tagihan Rutin Bulan Ini */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Alokasi Biaya Berdasarkan Kategori (Minimalist Line Strips) */}
              <div className="bg-white border border-stone-200/80 p-6 rounded">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <h4 className="text-sm font-serif text-stone-900">
                    Alokasi Pengeluaran per Kategori
                  </h4>
                  <span className="text-[11px] text-stone-400">Periode Terpilih</span>
                </div>

                <div className="pt-5 space-y-4">
                  {categoryBreakdown.length === 0 ? (
                    <div className="text-xs text-stone-400 py-6 text-center">
                      Belum ada beban pengeluaran yang tercatat.
                    </div>
                  ) : (
                    categoryBreakdown.map((cat, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-700 font-medium">{cat.label}</span>
                          <span className="font-mono text-stone-900">
                            {formatRupiah(cat.total)} ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-stone-800 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, cat.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tagihan Rutin Bulan Berjalan */}
              <div className="bg-white border border-stone-200/80 p-6 rounded">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <h4 className="text-sm font-serif text-stone-900">
                    Tagihan Rutin Bulan Ini (Agenda Kas)
                  </h4>
                  <button
                    onClick={() => setActiveSubTab("recurring")}
                    className="text-[11px] text-stone-500 hover:text-stone-900 underline"
                  >
                    Kelola Semua Tagihan
                  </button>
                </div>

                <div className="pt-4 divide-y divide-stone-100">
                  {recurringOverview.length === 0 ? (
                    <div className="text-xs text-stone-400 py-6 text-center">
                      Tidak ada tagihan rutin yang aktif.
                    </div>
                  ) : (
                    recurringOverview.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-medium text-stone-800 flex items-center gap-2">
                            <span>{item.name}</span>
                            <span className="text-[10px] text-stone-400 font-normal">
                              Jatuh tempo tgl {item.dueDayOfMonth}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5 font-mono">
                            {formatRupiah(item.estimatedAmount)}
                          </div>
                        </div>

                        <div>
                          {item.isPaidThisMonth ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Lunas
                            </span>
                          ) : confirmPayRecurringId === item.id ? (
                            <div className="inline-flex items-center gap-1.5 animate-in fade-in duration-150">
                              <button
                                type="button"
                                onClick={() => executePayRecurring(item)}
                                disabled={payingRecurringId === item.id}
                                className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold rounded-md transition cursor-pointer shadow-xs flex items-center gap-1"
                              >
                                {payingRecurringId === item.id ? "Membukukan..." : "Klik Konfirmasi"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmPayRecurringId(null)}
                                className="text-stone-400 hover:text-stone-600 text-[10px] cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInitiatePayRecurring(item.id)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium rounded-lg transition cursor-pointer"
                            >
                              1-Klik Bayar
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== SUB TAB 2: BUKU KAS OPEX ===================== */}
        {activeSubTab === "expenses" && (
          <div className="bg-white border border-stone-200/80 rounded p-6 space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    placeholder="Cari transaksi / no. ref..."
                    className="w-64 pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                  <svg
                    className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                {/* Category Filter */}
                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => {
                    setExpenseCategoryFilter(e.target.value);
                    setExpensePage(1);
                  }}
                  className="py-1.5 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded focus:outline-none"
                >
                  <option value="ALL">Semua Kategori Beban</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>

                {/* Payment Source Filter */}
                <select
                  value={expenseSourceFilter}
                  onChange={(e) => {
                    setExpenseSourceFilter(e.target.value);
                    setExpensePage(1);
                  }}
                  className="py-1.5 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded focus:outline-none"
                >
                  <option value="ALL">Semua Sumber Dana</option>
                  {PAYMENT_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Filtered Display */}
              <div className="text-right">
                <span className="text-[11px] text-stone-400 block">Total Pengeluaran Filter:</span>
                <span className="text-sm font-mono font-medium text-stone-900">
                  {formatRupiah(expenseTotalFiltered)}
                </span>
              </div>
            </div>

            {/* Tabel Mutasi Pengeluaran */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Tanggal</th>
                    <th className="pb-3 font-semibold">Rincian Beban</th>
                    <th className="pb-3 font-semibold">Kategori</th>
                    <th className="pb-3 font-semibold">Sumber Dana</th>
                    <th className="pb-3 font-semibold">No. Bukti / Ref</th>
                    <th className="pb-3 font-semibold text-right">Nominal</th>
                    <th className="pb-3 font-semibold text-center">Struk</th>
                    <th className="pb-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {expenseLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-400">
                        Memuat data buku kas...
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-400">
                        Belum ada mutasi pengeluaran yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3.5 text-stone-600 whitespace-nowrap">
                          {new Date(exp.expenseDate).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5">
                          <div className="font-medium text-stone-900">{exp.title}</div>
                          {exp.notes && (
                            <div className="text-[11px] text-stone-400 mt-0.5 truncate max-w-xs">
                              {exp.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 whitespace-nowrap">
                          <span className="text-[11px] text-stone-600">
                            {CATEGORY_LABELS[exp.category] || exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 whitespace-nowrap text-stone-500">
                          {PAYMENT_SOURCES.find((s) => s.id === exp.paymentSource)?.label ||
                            exp.paymentSource ||
                            "-"}
                        </td>
                        <td className="py-3.5 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          {exp.referenceNumber || "-"}
                        </td>
                        <td className="py-3.5 text-right font-mono font-medium text-stone-900 whitespace-nowrap">
                          {formatRupiah(exp.amount)}
                        </td>
                        <td className="py-3.5 text-center">
                          {exp.receiptUrl ? (
                            <a
                              href={exp.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-stone-500 hover:text-stone-900 underline text-[11px]"
                            >
                              Lihat
                            </a>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap">
                          {exp.isLocked ? (
                            <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                              Terkunci
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => openEditExpense(exp)}
                                className="text-stone-500 hover:text-stone-900 font-medium"
                              >
                                Edit
                              </button>
                              <span className="text-stone-200">|</span>
                              {confirmDeleteExpenseId === exp.id ? (
                                <div className="inline-flex items-center gap-1.5 animate-in fade-in duration-150">
                                  <button
                                    type="button"
                                    onClick={() => executeDeleteExpense(exp.id)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold rounded transition cursor-pointer"
                                  >
                                    Konfirmasi Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteExpenseId(null)}
                                    className="text-stone-400 hover:text-stone-600 text-[10px] cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteExpenseId(exp.id)}
                                  className="text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {expenseTotalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs">
                <span className="text-stone-400">
                  Halaman {expensePage} dari {expenseTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={expensePage <= 1}
                    onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 border border-stone-200 rounded disabled:opacity-40 hover:bg-stone-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={expensePage >= expenseTotalPages}
                    onClick={() => setExpensePage((p) => Math.min(expenseTotalPages, p + 1))}
                    className="px-3 py-1 border border-stone-200 rounded disabled:opacity-40 hover:bg-stone-50"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== SUB TAB 3: TAGIHAN RUTIN (OPEX BULANAN) ===================== */}
        {activeSubTab === "recurring" && (
          <div className="bg-white border border-stone-200/80 rounded p-6 space-y-6">
            {/* Header with Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-4">
              <div>
                <h3 className="text-base font-serif text-stone-900">
                  Jadwal Tagihan Operasional Berkala (OPEX)
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Daftar komitmen rutin bulanan seperti server cloud, internet, listrik, dan domain. Tambah tagihan baru atau atur nilai biaya bulanan secara dinamis.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddRecurringModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Tambah Tagihan Rutin</span>
              </button>
            </div>

            {/* Continuous Metric Strip: Transparansi Nilai Biaya Bulanan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-[11px] font-medium text-stone-500 block uppercase tracking-wider">
                  Total Estimasi Beban Bulanan
                </span>
                <span className="text-lg font-mono font-bold text-stone-900 mt-1 block">
                  {formatRupiah(recurringSummary.totalEstimated)}
                </span>
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Dari {recurringSummary.totalActiveCount} komitmen rutin aktif
                </span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200/80">
                <span className="text-[11px] font-medium text-emerald-700 block uppercase tracking-wider">
                  Sudah Dibayar Bulan Ini
                </span>
                <span className="text-lg font-mono font-bold text-emerald-900 mt-1 block">
                  {formatRupiah(recurringSummary.totalPaid)}
                </span>
                <span className="text-[10px] text-emerald-600 mt-0.5 block">
                  {recurringSummary.paidCount} tagihan tercatat lunas di kas
                </span>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/80">
                <span className="text-[11px] font-medium text-amber-700 block uppercase tracking-wider">
                  Sisa Tagihan Belum Dibayar
                </span>
                <span className="text-lg font-mono font-bold text-amber-900 mt-1 block">
                  {formatRupiah(recurringSummary.totalUnpaid)}
                </span>
                <span className="text-[10px] text-amber-600 mt-0.5 block">
                  {recurringSummary.unpaidCount} tagihan menunggu pelunasan
                </span>
              </div>
            </div>

            {/* Interactive Recurring Bills Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Nama Beban / Vendor</th>
                    <th className="pb-3 font-semibold">Kategori</th>
                    <th className="pb-3 font-semibold">Jatuh Tempo</th>
                    <th className="pb-3 font-semibold">Estimasi Biaya Bulanan</th>
                    <th className="pb-3 font-semibold">Status Bulan Ini</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recurringLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        Memuat data tagihan berkala...
                      </td>
                    </tr>
                  ) : recurringList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        Belum ada komitmen tagihan berkala. Klik tombol &quot;+ Tambah Tagihan Rutin&quot; di atas.
                      </td>
                    </tr>
                  ) : (
                    recurringList.map((rec) => (
                      <tr key={rec.id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3.5">
                          <div className="font-medium text-stone-900">{rec.name}</div>
                          {rec.vendorName && (
                            <div className="text-[11px] text-stone-400">{rec.vendorName}</div>
                          )}
                        </td>
                        <td className="py-3.5 text-stone-600">
                          {CATEGORY_LABELS[rec.category] || rec.category}
                        </td>
                        <td className="py-3.5 text-stone-600">
                          Tiap tanggal {rec.dueDayOfMonth}
                        </td>
                        <td className="py-3.5 font-mono font-medium text-stone-900">
                          {formatRupiah(rec.estimatedAmount)}
                        </td>
                        <td className="py-3.5">
                          {rec.isPaidThisMonth ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Lunas Bulan Ini
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Belum Dibayar
                            </span>
                          )}
                        </td>
                        <td className="py-3.5">
                          {rec.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {!rec.isPaidThisMonth && (
                              confirmPayRecurringId === rec.id ? (
                                <div className="inline-flex items-center gap-1.5 animate-in fade-in duration-150">
                                  <button
                                    type="button"
                                    onClick={() => executePayRecurring(rec)}
                                    disabled={payingRecurringId === rec.id}
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg transition shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                                  >
                                    {payingRecurringId === rec.id ? (
                                      <>
                                        <svg className="animate-spin w-3 h-3 text-white" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        <span>Membukukan...</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3 h-3 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Klik Konfirmasi</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmPayRecurringId(null)}
                                    className="px-1.5 py-1 text-stone-400 hover:text-stone-700 text-[11px] rounded transition cursor-pointer"
                                    title="Batal"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleInitiatePayRecurring(rec.id)}
                                  className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-medium rounded-lg transition shrink-0 cursor-pointer shadow-xs"
                                >
                                  1-Klik Bayar &amp; Bukukan
                                </button>
                              )
                            )}

                            {/* Tombol Atur Nilai / Edit */}
                            <button
                              type="button"
                              onClick={() => openEditRecurringModal(rec)}
                              title="Atur nilai biaya bulanan atau ubah tagihan"
                              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* Tombol Hapus (Inline 2-Step) */}
                            {confirmDeleteRecurringId === rec.id ? (
                              <div className="inline-flex items-center gap-1 animate-in fade-in duration-150">
                                <button
                                  type="button"
                                  onClick={() => executeDeleteRecurring(rec)}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold rounded-md transition cursor-pointer shadow-xs"
                                >
                                  Hapus?
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteRecurringId(null)}
                                  className="px-1 py-0.5 text-stone-400 hover:text-stone-700 text-[10px] cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteRecurringId(rec.id)}
                                title="Hapus komitmen tagihan rutin"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== SUB TAB 4: LAPORAN LABA RUGI & TUTUP BUKU ===================== */}
        {activeSubTab === "pnl_closing" && (
          <div className="space-y-8">
            {/* Panel Eksekusi Tutup Buku */}
            <div className="bg-white border border-stone-200/80 rounded p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-100 gap-4">
                <div>
                  <h3 className="text-base font-serif text-stone-900">
                    Prosedur Tutup Buku Bulanan (Financial Closing)
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Mengunci buku kas, mengagregasi omzet & beban operasional ke dalam snapshot permanen audit-safe.
                  </p>
                </div>
              </div>

              <form onSubmit={handleExecuteClosing} className="pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Bulan Pembukuan
                    </label>
                    <select
                      value={closingMonth}
                      onChange={(e) => setClosingMonth(parseInt(e.target.value, 10))}
                      className="w-full py-1.5 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none"
                    >
                      {[
                        "Januari",
                        "Februari",
                        "Maret",
                        "April",
                        "Mei",
                        "Juni",
                        "Juli",
                        "Agustus",
                        "September",
                        "Oktober",
                        "November",
                        "Desember",
                      ].map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Tahun Fiskal
                    </label>
                    <input
                      type="number"
                      value={closingYear}
                      onChange={(e) => setClosingYear(parseInt(e.target.value, 10))}
                      className="w-full py-1.5 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Catatan Audit / Memo
                    </label>
                    <input
                      type="text"
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="Contoh: Tutup buku reguler akhir bulan"
                      className="w-full py-1.5 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  {confirmClosingStep ? (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150">
                      <button
                        type="button"
                        onClick={() => setConfirmClosingStep(false)}
                        className="px-3.5 py-2 border border-stone-300 text-stone-600 text-xs rounded-xl hover:bg-stone-50 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={closingSubmitting}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {closingSubmitting ? "Mengunci Mutasi..." : "Klik Konfirmasi: Kunci Buku Sekarang"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={closingSubmitting}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      Eksekusi Tutup Buku &amp; Kunci Mutasi
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Riwayat Tutup Buku */}
            <div className="bg-white border border-stone-200/80 rounded p-6">
              <h4 className="text-sm font-serif text-stone-900 pb-4 border-b border-stone-100">
                Arsip & Riwayat Periode Tutup Buku
              </h4>

              <div className="overflow-x-auto pt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 font-medium uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-semibold">Periode</th>
                      <th className="pb-3 font-semibold text-right">Gross Revenue</th>
                      <th className="pb-3 font-semibold text-right">Total OPEX</th>
                      <th className="pb-3 font-semibold text-right">Laba Bersih</th>
                      <th className="pb-3 font-semibold text-right">PPh Final 0.5%</th>
                      <th className="pb-3 font-semibold">Tanggal Tutup</th>
                      <th className="pb-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {closingLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-stone-400">
                          Memuat arsip pembukuan...
                        </td>
                      </tr>
                    ) : closingList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-stone-400">
                          Belum ada periode yang ditutup buku.
                        </td>
                      </tr>
                    ) : (
                      closingList.map((item) => (
                        <tr key={item.id} className="hover:bg-stone-50/70 transition">
                          <td className="py-3.5 font-medium text-stone-900">
                            Bulan {item.periodMonth}/{item.periodYear}
                          </td>
                          <td className="py-3.5 text-right font-mono text-stone-700">
                            {formatRupiah(item.grossRevenue)}
                          </td>
                          <td className="py-3.5 text-right font-mono text-stone-700">
                            {formatRupiah(item.totalExpenses)}
                          </td>
                          <td
                            className={`py-3.5 text-right font-mono font-medium ${
                              item.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {formatRupiah(item.netProfit)}
                          </td>
                          <td className="py-3.5 text-right font-mono text-stone-700">
                            {formatRupiah(item.taxAmount)}
                          </td>
                          <td className="py-3.5 text-stone-500 whitespace-nowrap">
                            {new Date(item.closedAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3.5 text-right">
                            {confirmReopenId === item.id ? (
                              <div className="inline-flex items-center gap-1.5 animate-in fade-in duration-150">
                                <button
                                  type="button"
                                  onClick={() => executeReopenClosing(item.id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold rounded-md transition cursor-pointer shadow-xs"
                                >
                                  Konfirmasi Buka Kunci
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmReopenId(null)}
                                  className="text-stone-400 hover:text-stone-600 text-[10px] cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmReopenId(item.id)}
                                className="text-[11px] text-stone-400 hover:text-rose-700 transition cursor-pointer"
                              >
                                Buka Kunci (Reopen)
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== SUB TAB 5: REKAPITULASI PAJAK PPH FINAL 0.5% ===================== */}
        {activeSubTab === "tax_recap" && (
          <div className="bg-white border border-stone-200/80 rounded p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-100 gap-4">
              <div>
                <h3 className="text-base font-serif text-stone-900">
                  Lembar Rekapitulasi Pajak PPh Final UMKM 0,5%
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Berdasarkan Peraturan Pemerintah (PP) No. 55 Tahun 2022 atas peredaran bruto (omzet kotor usaha).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500">Tahun Pajak:</span>
                <select
                  value={taxYear}
                  onChange={(e) => setTaxYear(parseInt(e.target.value, 10))}
                  className="py-1 px-3 text-xs bg-stone-50 border border-stone-200 rounded font-mono focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary Strip Pajak Tahunan */}
            {taxSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-stone-50 rounded border border-stone-200/60">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    Total Omzet Fiskal
                  </div>
                  <div className="text-lg font-light text-stone-900 font-mono mt-0.5">
                    {formatRupiah(taxSummary.totalGrossRevenueYear)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    Total PPh Terutang (0.5%)
                  </div>
                  <div className="text-lg font-light text-stone-900 font-mono mt-0.5">
                    {formatRupiah(taxSummary.totalTaxDueYear)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    Telah Disetor ke Kas Negara
                  </div>
                  <div className="text-lg font-light text-emerald-800 font-mono mt-0.5">
                    {formatRupiah(taxSummary.totalTaxPaidYear)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    Sisa Kewajiban Setor
                  </div>
                  <div className="text-lg font-light text-rose-800 font-mono mt-0.5">
                    {formatRupiah(taxSummary.remainingTaxDueYear)}
                  </div>
                </div>
              </div>
            )}

            {/* Tabel 12 Bulan Rekapitulasi Pajak */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Masa Pajak</th>
                    <th className="pb-3 font-semibold text-center">Jumlah Order</th>
                    <th className="pb-3 font-semibold text-right">Peredaran Bruto (Omzet)</th>
                    <th className="pb-3 font-semibold text-center">Tarif</th>
                    <th className="pb-3 font-semibold text-right">PPh Terutang</th>
                    <th className="pb-3 font-semibold text-center">Status Setor</th>
                    <th className="pb-3 font-semibold">Keterangan / NTPN</th>
                    <th className="pb-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {taxLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-400">
                        Memuat lembar kerja pajak...
                      </td>
                    </tr>
                  ) : (
                    taxBreakdown.map((item) => (
                      <tr key={item.monthIndex} className="hover:bg-stone-50/70 transition">
                        <td className="py-3.5 font-medium text-stone-900">
                          {item.monthName} {item.year}
                        </td>
                        <td className="py-3.5 text-center text-stone-600 font-mono">
                          {item.orderCount}
                        </td>
                        <td className="py-3.5 text-right font-mono text-stone-800">
                          {formatRupiah(item.grossRevenue)}
                        </td>
                        <td className="py-3.5 text-center text-stone-500 font-mono">
                          0.5%
                        </td>
                        <td className="py-3.5 text-right font-mono font-medium text-stone-900">
                          {formatRupiah(item.taxDue)}
                        </td>
                        <td className="py-3.5 text-center">
                          {item.isTaxPaid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Disetor
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">
                              Belum
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-[11px] text-stone-500 max-w-xs truncate font-mono">
                          {item.notes || "-"}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedTaxMonth(item);
                              setTaxNTPNInput(item.notes || "");
                              setTaxModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] border border-stone-200 hover:border-stone-400 rounded text-stone-700 font-medium transition"
                          >
                            Update Bukti Setor
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ===================== MODAL CATAT / EDIT PENGELUARAN ===================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 w-full max-w-lg rounded shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-base font-serif text-stone-900">
                {editingExpenseId ? "Edit Mutasi Pengeluaran" : "Catat Beban Pengeluaran Baru"}
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Nama Pengeluaran / Beban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={expenseFormTitle}
                  onChange={(e) => setExpenseFormTitle(e.target.value)}
                  placeholder="Contoh: Tagihan Listrik Kantor September"
                  className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={expenseFormCategory}
                    onChange={(e) => setExpenseFormCategory(e.target.value)}
                    className="w-full py-2 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Nominal (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseFormAmount}
                    onChange={(e) => setExpenseFormAmount(e.target.value)}
                    placeholder="Contoh: 350000"
                    className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={expenseFormDate}
                    onChange={(e) => setExpenseFormDate(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Sumber Pembayaran
                  </label>
                  <select
                    value={expenseFormSource}
                    onChange={(e) => setExpenseFormSource(e.target.value)}
                    className="w-full py-2 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none"
                  >
                    {PAYMENT_SOURCES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Nomor Referensi / No. Struk (Opsional)
                </label>
                <input
                  type="text"
                  value={expenseFormRef}
                  onChange={(e) => setExpenseFormRef(e.target.value)}
                  placeholder="Contoh: INV-2026-09-PLN"
                  className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none font-mono"
                />
              </div>

              {/* Upload Struk File */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Bukti Struk / Faktur Pembayaran
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3 py-1.5 border border-stone-300 hover:border-stone-400 bg-stone-50 text-stone-700 text-xs rounded transition inline-flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>{uploadingReceipt ? "Mengunggah..." : "Pilih Berkas Struk"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingReceipt}
                    />
                  </label>
                  {expenseFormReceiptUrl && (
                    <a
                      href={expenseFormReceiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-700 underline flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>Struk terlampir</span>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Catatan Internal (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={expenseFormNotes}
                  onChange={(e) => setExpenseFormNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk pembukuan..."
                  className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-600 text-xs rounded hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting || uploadingReceipt}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded transition disabled:opacity-50"
                >
                  {expenseSubmitting ? "Menyimpan..." : "Simpan Mutasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL UPDATE SETORAN PAJAK ===================== */}
      {taxModalOpen && selectedTaxMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 w-full max-w-md rounded shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-base font-serif text-stone-900">
                Catat Bukti Setor Pajak
              </h3>
              <button
                onClick={() => setTaxModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveTaxStatus} className="p-6 space-y-4">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Masa Pajak:</span>
                  <span className="font-medium text-stone-900">
                    {selectedTaxMonth.monthName} {selectedTaxMonth.year}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Peredaran Bruto:</span>
                  <span className="font-mono text-stone-900">
                    {formatRupiah(selectedTaxMonth.grossRevenue)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t border-stone-200">
                  <span className="text-stone-700">PPh Final Terutang (0.5%):</span>
                  <span className="font-mono text-emerald-800">
                    {formatRupiah(selectedTaxMonth.taxDue)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Nomor NTPN / Kode Billing BPN <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taxNTPNInput}
                  onChange={(e) => setTaxNTPNInput(e.target.value)}
                  placeholder="Contoh: 1A2B3C4D5E6F7G8H"
                  className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded focus:bg-white focus:outline-none font-mono uppercase"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Masukkan 16 digit Nomor Transaksi Penerimaan Negara dari bukti setor bank/kantor pos.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setTaxModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-600 text-xs rounded hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={taxSubmitting}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded transition disabled:opacity-50"
                >
                  {taxSubmitting ? "Menyimpan..." : "Tandai Telah Disetor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL TAMBAH / EDIT TAGIHAN RUTIN (OPEX) ===================== */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif text-stone-900">
                  {editingRecurring ? "Atur Nilai Biaya & Edit Tagihan" : "Tambah Tagihan Rutin Baru"}
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {editingRecurring
                    ? "Sesuaikan estimasi nilai biaya bulanan, vendor, atau tanggal jatuh tempo."
                    : "Daftarkan komitmen operasional berkala untuk otomatisasi pemantauan kas."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecurringModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitRecurring} className="p-6 space-y-4">
              {recurringFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {recurringFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Nama Komitmen Beban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recurringFormName}
                  onChange={(e) => setRecurringFormName(e.target.value)}
                  placeholder="Contoh: Hostinger Cloud VPS Ubuntu (Server Utama)"
                  className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Nama Vendor / Penyedia Layanan (Opsional)
                </label>
                <input
                  type="text"
                  value={recurringFormVendor}
                  onChange={(e) => setRecurringFormVendor(e.target.value)}
                  placeholder="Contoh: Hostinger, Cloudflare, PLN, Telkom"
                  className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Kategori OPEX <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={recurringFormCategory}
                    onChange={(e) => setRecurringFormCategory(e.target.value)}
                    className="w-full py-2 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Nilai Biaya Bulanan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={recurringFormAmount}
                    onChange={(e) => setRecurringFormAmount(e.target.value)}
                    placeholder="Contoh: 250000"
                    className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                  {recurringFormAmount && (
                    <span className="text-[10px] text-stone-500 font-mono mt-1 block">
                      Preview: {formatRupiah(parseFloat(recurringFormAmount) || 0)} / bulan
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Jatuh Tempo (Tanggal Tiap Bulan) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 shrink-0">Tiap tanggal:</span>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={recurringFormDueDay}
                      onChange={(e) => setRecurringFormDueDay(e.target.value)}
                      className="w-full py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Rekening / Sumber Bayar
                  </label>
                  <select
                    value={recurringFormSource}
                    onChange={(e) => setRecurringFormSource(e.target.value)}
                    className="w-full py-2 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    {PAYMENT_SOURCES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editingRecurring && (
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-stone-700 block">Status Komitmen</span>
                    <span className="text-[10px] text-stone-400">Nonaktifkan jika langganan dihentikan sementara</span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recurringFormIsActive}
                      onChange={(e) => setRecurringFormIsActive(e.target.checked)}
                      className="rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                    />
                    <span className="text-xs text-stone-700 font-medium">
                      {recurringFormIsActive ? "Aktif Berjalan" : "Dihentikan / Nonaktif"}
                    </span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-600 text-xs rounded-xl hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={recurringSubmitting}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {recurringSubmitting ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingRecurring ? "Simpan Perubahan Nilai" : "Tambahkan Tagihan Rutin"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFinanceTab;
