"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

interface PartnerAffiliate {
  id: string;
  name: string;
  phoneNumber: string | null;
  email: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  commissionType: "PERCENT" | "NOMINAL";
  commissionValue: number;
  pendingBalance: number;
  totalPaidOut: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  _count?: {
    coupons: number;
    commissions: number;
  };
}

interface PromoCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "NOMINAL" | "PERCENT";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  quotaLimit: number | null;
  usageCount: number;
  isSingleUse: boolean;
  perUserLimit: number | null;
  applicablePlans: string[];
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  partnerId: string | null;
  partner?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    holds: number;
    orders: number;
  };
  createdAt: string;
}

interface AffiliateCommission {
  id: string;
  partnerId: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  status: "PENDING" | "PAID";
  payoutExpenseId: string | null;
  paidAt: string | null;
  createdAt: string;
  partner: {
    id: string;
    name: string;
    bankName: string | null;
    accountNumber: string | null;
  };
  order: {
    id: string;
    invoiceNumber: string;
    planType: string;
    status: string;
    paidAt: string | null;
  };
}

export function AdminMarketingTab() {
  const [activeSubTab, setActiveSubTab] = useState<"coupons" | "partners" | "commissions">("coupons");
  const [promoEnabled, setPromoEnabled] = useState<boolean>(false);
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [partners, setPartners] = useState<PartnerAffiliate[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingMaster, setTogglingMaster] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal states
  const [couponModalOpen, setCouponModalOpen] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<PromoCoupon | null>(null);

  const [partnerModalOpen, setPartnerModalOpen] = useState<boolean>(false);
  const [editingPartner, setEditingPartner] = useState<PartnerAffiliate | null>(null);

  const [payoutModalOpen, setPayoutModalOpen] = useState<boolean>(false);
  const [payoutPartner, setPayoutPartner] = useState<PartnerAffiliate | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutNotes, setPayoutNotes] = useState<string>("");
  const [payoutLoading, setPayoutLoading] = useState<boolean>(false);

  // Form states - Coupon
  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discountType: "NOMINAL" as "NOMINAL" | "PERCENT",
    discountValue: "",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    quotaLimit: "",
    isSingleUse: false,
    perUserLimit: "1",
    applicablePlans: [] as string[],
    validFrom: "",
    validUntil: "",
    isActive: true,
    partnerId: "",
  });

  // Form states - Partner
  const [partnerForm, setPartnerForm] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
    commissionType: "PERCENT" as "PERCENT" | "NOMINAL",
    commissionValue: "10",
    notes: "",
    isActive: true,
  });

  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data pemasaran");

      setPromoEnabled(data.promoEnabled ?? false);
      setCoupons(data.coupons ?? []);
      setPartners(data.partners ?? []);
      setCommissions(data.commissions ?? []);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle Master Switch
  const handleToggleMaster = async () => {
    const nextState = !promoEnabled;
    setTogglingMaster(true);
    try {
      const res = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_MASTER_SWITCH",
          value: nextState,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status master switch");
      setPromoEnabled(nextState);
      setActionFeedback({
        type: "success",
        message: `Sistem promosi berhasil ${nextState ? "diaktifkan" : "dinonaktifkan"}`,
      });
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err.message || "Gagal mengubah master switch",
      });
    } finally {
      setTogglingMaster(false);
    }
  };

  // Generate Random Code
  const handleGenerateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "LUX-";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCouponForm((prev) => ({ ...prev, code }));
  };

  // Open Create/Edit Coupon Modal
  const openCouponModal = (coupon?: PromoCoupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        code: coupon.code,
        description: coupon.description || "",
        discountType: coupon.discountType,
        discountValue: String(coupon.discountValue),
        minOrderAmount: String(coupon.minOrderAmount || 0),
        maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : "",
        quotaLimit: coupon.quotaLimit !== null ? String(coupon.quotaLimit) : "",
        isSingleUse: coupon.isSingleUse,
        perUserLimit: coupon.perUserLimit ? String(coupon.perUserLimit) : "1",
        applicablePlans: coupon.applicablePlans || [],
        validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().slice(0, 16) : "",
        validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().slice(0, 16) : "",
        isActive: coupon.isActive,
        partnerId: coupon.partnerId || "",
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        code: "",
        description: "",
        discountType: "NOMINAL",
        discountValue: "",
        minOrderAmount: "0",
        maxDiscountAmount: "",
        quotaLimit: "",
        isSingleUse: false,
        perUserLimit: "1",
        applicablePlans: [],
        validFrom: "",
        validUntil: "",
        isActive: true,
        partnerId: "",
      });
    }
    setCouponModalOpen(true);
  };

  // Submit Coupon Form
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload: any = {
        action: editingCoupon ? "UPDATE_COUPON" : "CREATE_COUPON",
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        minOrderAmount: Number(couponForm.minOrderAmount || 0),
        maxDiscountAmount: couponForm.maxDiscountAmount ? Number(couponForm.maxDiscountAmount) : null,
        quotaLimit: couponForm.quotaLimit ? Number(couponForm.quotaLimit) : null,
        isSingleUse: couponForm.isSingleUse,
        perUserLimit: couponForm.perUserLimit ? Number(couponForm.perUserLimit) : 1,
        applicablePlans: couponForm.applicablePlans,
        validFrom: couponForm.validFrom ? new Date(couponForm.validFrom).toISOString() : null,
        validUntil: couponForm.validUntil ? new Date(couponForm.validUntil).toISOString() : null,
        isActive: couponForm.isActive,
        partnerId: couponForm.partnerId || null,
      };

      if (editingCoupon) {
        payload.id = editingCoupon.id;
      }

      const res = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kupon promo");

      setCouponModalOpen(false);
      setActionFeedback({ type: "success", message: `Kupon "${payload.code}" berhasil disimpan` });
      fetchData();
    } catch (err: any) {
      setActionFeedback({ type: "error", message: err.message || "Gagal menyimpan kupon" });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = (id: string, code: string) => {
    setDeleteConfirm({
      title: "Hapus Kupon Promo",
      message: `Hapus kupon promo "${code}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        try {
          const res = await fetch("/api/admin/marketing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "DELETE_COUPON", id }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal menghapus kupon");
          setActionFeedback({ type: "success", message: `Kupon "${code}" berhasil dihapus` });
          fetchData();
        } catch (err: any) {
          setActionFeedback({ type: "error", message: err.message || "Gagal menghapus kupon" });
        }
      },
    });
  };

  // Open Create/Edit Partner Modal
  const openPartnerModal = (partner?: PartnerAffiliate) => {
    if (partner) {
      setEditingPartner(partner);
      setPartnerForm({
        name: partner.name,
        phoneNumber: partner.phoneNumber || "",
        email: partner.email || "",
        bankName: partner.bankName || "",
        accountNumber: partner.accountNumber || "",
        accountName: partner.accountName || "",
        commissionType: partner.commissionType,
        commissionValue: String(partner.commissionValue),
        notes: partner.notes || "",
        isActive: partner.isActive,
      });
    } else {
      setEditingPartner(null);
      setPartnerForm({
        name: "",
        phoneNumber: "",
        email: "",
        bankName: "",
        accountNumber: "",
        accountName: "",
        commissionType: "PERCENT",
        commissionValue: "10",
        notes: "",
        isActive: true,
      });
    }
    setPartnerModalOpen(true);
  };

  // Submit Partner Form
  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload: any = {
        action: editingPartner ? "UPDATE_PARTNER" : "CREATE_PARTNER",
        name: partnerForm.name.trim(),
        phoneNumber: partnerForm.phoneNumber.trim() || null,
        email: partnerForm.email.trim() || null,
        bankName: partnerForm.bankName.trim() || null,
        accountNumber: partnerForm.accountNumber.trim() || null,
        accountName: partnerForm.accountName.trim() || null,
        commissionType: partnerForm.commissionType,
        commissionValue: Number(partnerForm.commissionValue),
        notes: partnerForm.notes.trim() || null,
        isActive: partnerForm.isActive,
      };

      if (editingPartner) {
        payload.id = editingPartner.id;
      }

      const res = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan mitra");

      setPartnerModalOpen(false);
      setActionFeedback({ type: "success", message: `Data mitra "${payload.name}" berhasil disimpan` });
      fetchData();
    } catch (err: any) {
      setActionFeedback({ type: "error", message: err.message || "Gagal menyimpan mitra" });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Partner with Balance Check
  const handleDeletePartner = (partner: PartnerAffiliate) => {
    const pending = Number(partner.pendingBalance);
    const msg = pending > 0
      ? `Perhatian: Mitra "${partner.name}" masih memiliki saldo komisi belum dibayar sebesar Rp ${pending.toLocaleString("id-ID")}.\n\nApakah Anda yakin ingin tetap menghapusnya beserta riwayat komisi tertunggak?`
      : `Apakah Anda yakin ingin menghapus mitra "${partner.name}"?`;

    setDeleteConfirm({
      title: "Hapus Mitra Afiliasi",
      message: msg,
      onConfirm: async () => {
        setDeleteConfirm(null);
        try {
          const res = await fetch("/api/admin/marketing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "DELETE_PARTNER",
              id: partner.id,
              forceConfirm: pending > 0,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal menghapus mitra");
          setActionFeedback({ type: "success", message: `Mitra "${partner.name}" berhasil dihapus` });
          fetchData();
        } catch (err: any) {
          setActionFeedback({ type: "error", message: err.message || "Gagal menghapus mitra" });
        }
      },
    });
  };

  // Open Payout Modal
  const openPayoutDialog = (partner: PartnerAffiliate) => {
    setPayoutPartner(partner);
    setPayoutAmount(String(partner.pendingBalance));
    setPayoutNotes(`Pencairan komisi mitra via transfer ke ${partner.bankName || "Bank"} ${partner.accountNumber || ""}`);
    setPayoutModalOpen(true);
  };

  // Execute Payout
  const handleExecutePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutPartner) return;

    const amountNum = Number(payoutAmount);
    if (!amountNum || amountNum <= 0) {
      setActionFeedback({ type: "error", message: "Nominal pencairan harus lebih dari 0" });
      return;
    }

    setPayoutLoading(true);
    try {
      const res = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PAYOUT_PARTNER",
          partnerId: payoutPartner.id,
          amount: amountNum,
          notes: payoutNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat payout komisi");

      setActionFeedback({ type: "success", message: `Pencairan sebesar Rp ${amountNum.toLocaleString("id-ID")} berhasil dicatat ke Finance!` });
      setPayoutModalOpen(false);
      fetchData();
    } catch (err: any) {
      setActionFeedback({ type: "error", message: err.message || "Gagal mencatat payout" });
    } finally {
      setPayoutLoading(false);
    }
  };

  // Filtered lists
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const matchesSearch =
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.partner && c.partner.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "ACTIVE") return c.isActive;
      if (statusFilter === "INACTIVE") return !c.isActive;
      if (statusFilter === "PARTNER") return Boolean(c.partnerId);
      if (statusFilter === "INTERNAL") return !c.partnerId;

      return true;
    });
  }, [coupons, searchQuery, statusFilter]);

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      return (
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.phoneNumber && p.phoneNumber.includes(searchQuery)) ||
        (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [partners, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalPendingCommission = partners.reduce((sum, p) => sum + Number(p.pendingBalance || 0), 0);
    const totalPaidCommission = partners.reduce((sum, p) => sum + Number(p.totalPaidOut || 0), 0);
    const activeCouponsCount = coupons.filter((c) => c.isActive).length;
    const totalCouponUsage = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);

    return {
      totalPendingCommission,
      totalPaidCommission,
      activeCouponsCount,
      totalCouponUsage,
      totalPartners: partners.length,
      totalCoupons: coupons.length,
    };
  }, [partners, coupons]);

  return (
    <div className="space-y-6 max-w-7xl w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pemasaran & Afiliasi</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Kelola kupon promo, mitra referal, pencatatan komisi, dan integrasi payout otomatis.
          </p>
        </div>

        {/* Master Switch Pill */}
        <div className="flex items-center gap-3 bg-white p-2.5 px-4 rounded-2xl border border-gray-200 shadow-sm self-start sm:self-auto">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                promoEnabled ? "bg-emerald-500 ring-4 ring-emerald-50" : "bg-gray-300"
              }`}
            />
            <span className="text-xs font-semibold text-gray-700">
              Master Switch Fitur Promo:
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                promoEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600"
              }`}
            >
              {promoEnabled ? "AKTIF" : "NONAKTIF"}
            </span>
          </div>

          <button
            type="button"
            disabled={togglingMaster}
            onClick={handleToggleMaster}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              promoEnabled ? "bg-amber-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                promoEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Warning jika master switch nonaktif */}
      {!promoEnabled && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-1.5 bg-amber-100 rounded-xl text-amber-800 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold block text-sm mb-0.5">Fitur Promo Sedang Dinonaktifkan (Global OFF)</span>
            Formulir input kode promo pada halaman checkout tidak akan dimunculkan ke pembeli, dan backend akan menolak segala bentuk aplikasi kupon diskon hingga sakelar ini diaktifkan kembali.
          </div>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 block">Kupon Promo Aktif</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">{stats.activeCouponsCount}</span>
            <span className="text-xs text-gray-400">dari {stats.totalCoupons} total kupon</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 block">Total Transaksi Pakai Promo</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-950 font-mono">{stats.totalCouponUsage}</span>
            <span className="text-xs text-gray-400">pesanan lunas</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 block">Komisi Belum Dicairkan</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-600 font-mono">
              Rp {stats.totalPendingCommission.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 block">Total Komisi Sudah Dibayarkan</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              Rp {stats.totalPaidCommission.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sub-Tab Navigation & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => { setActiveSubTab("coupons"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeSubTab === "coupons"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Kupon & Promo ({coupons.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab("partners"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeSubTab === "partners"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Mitra Afiliasi ({partners.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab("commissions"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeSubTab === "commissions"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Riwayat Komisi ({commissions.length})
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 w-48 sm:w-60"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-2.5 top-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Add Button depending on Tab */}
          {activeSubTab === "coupons" && (
            <button
              type="button"
              onClick={() => openCouponModal()}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Buat Kupon
            </button>
          )}

          {activeSubTab === "partners" && (
            <button
              type="button"
              onClick={() => openPartnerModal()}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Mitra
            </button>
          )}
        </div>
      </div>

      {/* ── Content Area ── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-xs text-gray-500">
          Memuat data pemasaran...
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-700">
          {error}
        </div>
      ) : (
        <>
          {/* TAB 1: KUPON PROMO */}
          {activeSubTab === "coupons" && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Kode Kupon</th>
                      <th className="py-3 px-4">Nilai Diskon</th>
                      <th className="py-3 px-4">Kuota & Pemakaian</th>
                      <th className="py-3 px-4">Periode Berlaku</th>
                      <th className="py-3 px-4">Paket / Afiliasi</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCoupons.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          Belum ada kupon promo yang dibuat.
                        </td>
                      </tr>
                    ) : (
                      filteredCoupons.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                                {c.code}
                              </span>
                            </div>
                            {c.description && (
                              <span className="text-[11px] text-gray-400 block mt-1">
                                {c.description}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-gray-900 block">
                              {c.discountType === "NOMINAL"
                                ? `Rp ${Number(c.discountValue).toLocaleString("id-ID")}`
                                : `${c.discountValue}%`}
                            </span>
                            {c.maxDiscountAmount && (
                              <span className="text-[10px] text-gray-400 block">
                                Maks: Rp {Number(c.maxDiscountAmount).toLocaleString("id-ID")}
                              </span>
                            )}
                            {Number(c.minOrderAmount) > 0 && (
                              <span className="text-[10px] text-amber-700 block">
                                Min belanja: Rp {Number(c.minOrderAmount).toLocaleString("id-ID")}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-semibold text-gray-800">
                              {c.usageCount}
                            </span>
                            <span className="text-gray-400">
                              {c.quotaLimit !== null ? ` / ${c.quotaLimit}` : " (Tanpa Batas)"}
                            </span>
                            {c._count?.holds ? (
                              <span className="text-[10px] text-amber-600 block mt-0.5">
                                • {c._count.holds} sedang di-hold di checkout
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3.5 px-4 text-[11px]">
                            {c.validUntil ? (
                              <div>
                                <span className="text-gray-700 block">
                                  s/d {new Date(c.validUntil).toLocaleDateString("id-ID")}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(c.validUntil) < new Date() ? "Expired" : "Berlaku"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Permanen</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {c.partner ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium">
                                Mitra: {c.partner.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium">
                                Promo Internal
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 block mt-1">
                              {c.applicablePlans.length === 0
                                ? "Semua Paket"
                                : c.applicablePlans.join(", ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                c.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  c.isActive ? "bg-emerald-500" : "bg-gray-400"
                                }`}
                              />
                              {c.isActive ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCouponModal(c)}
                                className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                title="Edit Kupon"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCoupon(c.id, c.code)}
                                className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus Kupon"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          )}

          {/* TAB 2: MITRA AFILIASI */}
          {activeSubTab === "partners" && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nama Mitra</th>
                      <th className="py-3 px-4">Kontak & Rekening Bank</th>
                      <th className="py-3 px-4">Skema Komisi</th>
                      <th className="py-3 px-4">Saldo Belum Dibayar</th>
                      <th className="py-3 px-4">Total Sudah Dicairkan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPartners.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          Belum ada mitra afiliasi yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      filteredPartners.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-gray-900 block">{p.name}</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              {p._count?.coupons || 0} kupon aktif • {p._count?.commissions || 0} order sukses
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[11px]">
                            {p.phoneNumber && (
                              <span className="text-gray-700 block font-mono">
                                WA: {p.phoneNumber}
                              </span>
                            )}
                            {p.bankName ? (
                              <span className="text-gray-500 block font-mono text-[10px]">
                                {p.bankName} - {p.accountNumber} (a.n. {p.accountName})
                              </span>
                            ) : (
                              <span className="text-amber-600 text-[10px] block">
                                Belum ada rekening
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-gray-800">
                              {p.commissionType === "PERCENT"
                                ? `${p.commissionValue}% per order`
                                : `Rp ${Number(p.commissionValue).toLocaleString("id-ID")} / order`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`font-mono font-bold ${
                                Number(p.pendingBalance) > 0 ? "text-amber-600" : "text-gray-400"
                              }`}
                            >
                              Rp {Number(p.pendingBalance).toLocaleString("id-ID")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-emerald-600 font-semibold">
                            Rp {Number(p.totalPaidOut).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                p.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.isActive ? "bg-emerald-500" : "bg-gray-400"
                                }`}
                              />
                              {p.isActive ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {Number(p.pendingBalance) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openPayoutDialog(p)}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                >
                                  Payout
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openPartnerModal(p)}
                                className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                title="Edit Mitra"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePartner(p)}
                                className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus Mitra"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          )}

          {/* TAB 3: RIWAYAT KOMISI */}
          {activeSubTab === "commissions" && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Invoice Pesanan</th>
                      <th className="py-3 px-4">Mitra Penerima</th>
                      <th className="py-3 px-4">Nilai Transaksi</th>
                      <th className="py-3 px-4">Nominal Komisi</th>
                      <th className="py-3 px-4">Tanggal Order</th>
                      <th className="py-3 px-4">Status Komisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {commissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Belum ada transaksi yang menghasilkan komisi afiliasi.
                        </td>
                      </tr>
                    ) : (
                      commissions.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4 font-mono font-semibold text-gray-900">
                            {c.order?.invoiceNumber || c.orderId}
                            <span className="text-[10px] text-gray-400 block font-normal font-sans">
                              Paket: {c.order?.planType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-gray-800">
                            {c.partner?.name || "Mitra"}
                            {c.partner?.bankName && (
                              <span className="text-[10px] text-gray-400 block font-mono">
                                {c.partner.bankName} - {c.partner.accountNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-700">
                            Rp {Number(c.orderAmount).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                            Rp {Number(c.commissionAmount).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-gray-500">
                            {new Date(c.createdAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                c.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  c.status === "PAID" ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              />
                              {c.status === "PAID" ? "Lunas (Sudah Ditransfer)" : "Menunggu Pencairan"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODAL CREATE / EDIT COUPON ── */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingCoupon ? "Edit Kupon Promo" : "Buat Kupon Promo Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setCouponModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCouponSubmit} className="space-y-4 text-xs">
              {/* Kode Kupon */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">Kode Kupon *</label>
                  {!editingCoupon && (
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="text-amber-700 hover:underline text-[11px] font-semibold"
                    >
                      Generate Otomatis
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingCoupon)}
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="Contoh: WO-BERKAH / LUX-PROMO"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono uppercase bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  placeholder="Contoh: Diskon Kemitraan Wedding Organizer Berkah"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Tipe Diskon & Nilai */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tipe Diskon</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="NOMINAL">Nominal (Rp)</option>
                    <option value="PERCENT">Persentase (%)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Nilai Diskon ({couponForm.discountType === "NOMINAL" ? "Rp" : "%"}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    placeholder={couponForm.discountType === "NOMINAL" ? "25000" : "15"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Batas Maks Diskon & Min Belanja */}
              <div className="grid grid-cols-2 gap-3">
                {couponForm.discountType === "PERCENT" && (
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Maksimal Diskon (Rp)</label>
                    <input
                      type="number"
                      value={couponForm.maxDiscountAmount}
                      onChange={(e) => setCouponForm({ ...couponForm, maxDiscountAmount: e.target.value })}
                      placeholder="Opsional, misal 50000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Min. Transaksi (Rp)</label>
                  <input
                    type="number"
                    value={couponForm.minOrderAmount}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Kuota Limit & Per-User Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Batas Kuota Total</label>
                  <input
                    type="number"
                    value={couponForm.quotaLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, quotaLimit: e.target.value })}
                    placeholder="Kosongkan jika tanpa batas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Batas per Pengguna</label>
                  <input
                    type="number"
                    value={couponForm.perUserLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, perUserLimit: e.target.value })}
                    placeholder="Default: 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Masa Berlaku */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mulai Berlaku</label>
                  <input
                    type="datetime-local"
                    value={couponForm.validFrom}
                    onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Berakhir Pada</label>
                  <input
                    type="datetime-local"
                    value={couponForm.validUntil}
                    onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Hubungkan ke Mitra Afiliasi */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Hubungkan ke Mitra Afiliasi</label>
                <select
                  value={couponForm.partnerId}
                  onChange={(e) => setCouponForm({ ...couponForm, partnerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Tanpa Mitra (Promo Internal Toko) --</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.commissionType === "PERCENT" ? `${p.commissionValue}%` : `Rp ${Number(p.commissionValue).toLocaleString("id-ID")}`})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-400 block mt-1">
                  Jika dihubungkan, setiap kali kupon ini dipakai hingga lunas, komisi mitra akan otomatis tercatat.
                </span>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="couponIsActive"
                  checked={couponForm.isActive}
                  onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="couponIsActive" className="text-xs font-semibold text-gray-700">
                  Kupon Aktif dan Dapat Digunakan
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition"
                >
                  {formSubmitting ? "Menyimpan..." : "Simpan Kupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CREATE / EDIT PARTNER ── */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingPartner ? "Edit Mitra Afiliasi" : "Tambah Mitra Afiliasi Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setPartnerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePartnerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nama Lengkap Mitra / Vendor *</label>
                <input
                  type="text"
                  required
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  placeholder="Contoh: Sanggar Rias Anggun / WO Berkah"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={partnerForm.phoneNumber}
                    onChange={(e) => setPartnerForm({ ...partnerForm, phoneNumber: e.target.value })}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                    placeholder="mitra@gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Data Rekening Tujuan Payout */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <span className="font-bold text-gray-800 block text-[11px]">
                  Rekening Penerima Pembayaran Komisi
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Nama Bank</label>
                    <input
                      type="text"
                      value={partnerForm.bankName}
                      onChange={(e) => setPartnerForm({ ...partnerForm, bankName: e.target.value })}
                      placeholder="BCA / BRI"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-500 block mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      value={partnerForm.accountNumber}
                      onChange={(e) => setPartnerForm({ ...partnerForm, accountNumber: e.target.value })}
                      placeholder="Contoh: 1234567890"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">Nama Pemilik Rekening</label>
                  <input
                    type="text"
                    value={partnerForm.accountName}
                    onChange={(e) => setPartnerForm({ ...partnerForm, accountName: e.target.value })}
                    placeholder="Sesuai buku tabungan"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              {/* Skema Komisi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tipe Komisi</label>
                  <select
                    value={partnerForm.commissionType}
                    onChange={(e) => setPartnerForm({ ...partnerForm, commissionType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PERCENT">Persentase Transaksi (%)</option>
                    <option value="NOMINAL">Nominal Tetap (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Nilai Komisi ({partnerForm.commissionType === "PERCENT" ? "%" : "Rp"}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={partnerForm.commissionValue}
                    onChange={(e) => setPartnerForm({ ...partnerForm, commissionValue: e.target.value })}
                    placeholder={partnerForm.commissionType === "PERCENT" ? "10" : "50000"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Catatan Internal */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Catatan Staf (Internal)</label>
                <textarea
                  rows={2}
                  value={partnerForm.notes}
                  onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })}
                  placeholder="Kemitraan wedding fair, kuota fleksibel, dll."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="partnerIsActive"
                  checked={partnerForm.isActive}
                  onChange={(e) => setPartnerForm({ ...partnerForm, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="partnerIsActive" className="text-xs font-semibold text-gray-700">
                  Status Mitra Aktif
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition"
                >
                  {formSubmitting ? "Menyimpan..." : "Simpan Mitra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PAYOUT MITRA (INTEGRASI FINANCE) ── */}
      {payoutModalOpen && payoutPartner && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Pencairan Komisi Mitra</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mitra: <strong className="text-gray-800">{payoutPartner.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleExecutePayout} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80">
                <span className="text-[11px] text-amber-800 block">Total Saldo Belum Dibayar:</span>
                <span className="text-xl font-bold font-mono text-amber-950 block mt-0.5">
                  Rp {Number(payoutPartner.pendingBalance).toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-amber-900/70 block mt-1">
                  Rekening Tujuan: {payoutPartner.bankName || "Bank"} {payoutPartner.accountNumber} (a.n. {payoutPartner.accountName || payoutPartner.name})
                </span>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nominal Dicairkan (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={Number(payoutPartner.pendingBalance)}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono font-bold bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Catatan Payout / Bukti Transfer</label>
                <textarea
                  rows={2}
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Tindakan ini akan otomatis membuat pengeluaran kas (Expense) kategori MARKETING di Tab Finance.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={payoutLoading}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition"
                >
                  {payoutLoading ? "Memproses..." : "Konfirmasi & Catat Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Minimalis */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900">{deleteConfirm.title}</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">Konfirmasi penghapusan data</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">{deleteConfirm.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteConfirm.onConfirm}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Feedback Toast */}
      {actionFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[110] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border bg-white/95 backdrop-blur-md max-w-md animate-in slide-in-from-bottom-3 duration-200"
          style={{ borderColor: actionFeedback.type === "error" ? "#fecdd3" : "#a7f3d0" }}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${actionFeedback.type === "error" ? "bg-rose-500" : "bg-emerald-500"}`} />
          <p className="text-xs font-semibold text-stone-800 leading-snug flex-1">{actionFeedback.message}</p>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition cursor-pointer shrink-0 ml-1"
            title="Tutup"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminMarketingTab;
