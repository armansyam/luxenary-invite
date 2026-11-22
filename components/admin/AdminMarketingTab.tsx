"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { PartnerAffiliate, PromoCoupon, AffiliateCommission, PartnerPayoutRecord } from "@/components/admin/marketing/types";
import { MarketingTables } from "@/components/admin/marketing/MarketingTables";
import { MarketingModals } from "@/components/admin/marketing/MarketingModals";

export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function AdminMarketingTab() {
  const [activeSubTab, setActiveSubTab] = useState<"coupons" | "partners" | "commissions" | "payouts">("coupons");
  const [promoEnabled, setPromoEnabled] = useState<boolean>(false);
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [partners, setPartners] = useState<PartnerAffiliate[]>([]);
  const [vendorCategories, setVendorCategories] = useState<string[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayoutRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingMaster, setTogglingMaster] = useState<boolean>(false);
  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.packages)) setPackages(data.packages);
      })
      .catch(() => {});
  }, []);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Dynamic vendor category adder (inside Partner modal)
  const [showAddCategoryInput, setShowAddCategoryInput] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [addingCategory, setAddingCategory] = useState<boolean>(false);

  // Modal states
  const [couponModalOpen, setCouponModalOpen] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<PromoCoupon | null>(null);

  const [partnerModalOpen, setPartnerModalOpen] = useState<boolean>(false);
  const [editingPartner, setEditingPartner] = useState<PartnerAffiliate | null>(null);

  const [payoutModalOpen, setPayoutModalOpen] = useState<boolean>(false);
  const [payoutPartner, setPayoutPartner] = useState<PartnerAffiliate | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutPaymentSource, setPayoutPaymentSource] = useState<"TRANSFER_BANK" | "E_WALLET" | "TUNAI">("TRANSFER_BANK");
  const [payoutReferenceNumber, setPayoutReferenceNumber] = useState<string>("");
  const [payoutNotes, setPayoutNotes] = useState<string>("");
  const [payoutReceiptFile, setPayoutReceiptFile] = useState<File | null>(null);
  const [payoutReceiptPreviewUrl, setPayoutReceiptPreviewUrl] = useState<string | null>(null);
  const [payoutLoading, setPayoutLoading] = useState<boolean>(false);

  // Form states - Coupon
  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discountType: "NOMINAL" as "NOMINAL" | "PERCENT",
    discountValue: "",
    maxDiscountAmount: "",
    quotaLimit: "",
    applicablePlans: [] as string[],
    validFrom: "",
    validUntil: "",
    isActive: true,
    partnerId: "",
  });

  // Form states - Partner
  const [partnerForm, setPartnerForm] = useState({
    name: "",
    vendorCategory: "",
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
      setVendorCategories(Array.isArray(data.vendorCategories) ? data.vendorCategories : []);
      setCoupons(data.coupons ?? []);
      setPartners(data.partners ?? []);
      setCommissions(data.commissions ?? []);
      setPayouts(Array.isArray(data.payouts) ? data.payouts : []);
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
        maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : "",
        quotaLimit: coupon.quotaLimit !== null ? String(coupon.quotaLimit) : "",
        applicablePlans: coupon.applicablePlans || [],
        validFrom: coupon.validFrom ? toDateTimeLocalValue(coupon.validFrom) : "",
        validUntil: coupon.validUntil ? toDateTimeLocalValue(coupon.validUntil) : "",
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
        maxDiscountAmount: "",
        quotaLimit: "",
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
        maxDiscountAmount: couponForm.maxDiscountAmount ? Number(couponForm.maxDiscountAmount) : null,
        quotaLimit: couponForm.quotaLimit ? Number(couponForm.quotaLimit) : null,
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
    setShowAddCategoryInput(false);
    setNewCategoryName("");
    if (partner) {
      setEditingPartner(partner);
      setPartnerForm({
        name: partner.name,
        vendorCategory: partner.vendorCategory || "",
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
        vendorCategory: "",
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

  // Add New Dynamic Vendor Category
  const handleAddVendorCategory = async () => {
    const clean = newCategoryName.trim().replace(/\s+/g, " ");
    if (!clean) return;
    setAddingCategory(true);
    try {
      const res = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_VENDOR_CATEGORY",
          name: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan kategori vendor");

      const updatedList: string[] = Array.isArray(data.vendorCategories)
        ? data.vendorCategories
        : Array.from(new Set([...vendorCategories, clean]));
      const resolvedCategory =
        updatedList.find((c) => c.toLowerCase() === clean.toLowerCase()) || clean;

      setVendorCategories(updatedList);
      setPartnerForm((prev) => ({ ...prev, vendorCategory: resolvedCategory }));
      setNewCategoryName("");
      setShowAddCategoryInput(false);
      setActionFeedback({
        type: "success",
        message: `Kategori vendor "${resolvedCategory}" berhasil ditambahkan`,
      });
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err.message || "Gagal menambahkan kategori vendor",
      });
    } finally {
      setAddingCategory(false);
    }
  };

  // Submit Partner Form
  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload: any = {
        action: editingPartner ? "UPDATE_PARTNER" : "CREATE_PARTNER",
        name: partnerForm.name.trim(),
        vendorCategory: partnerForm.vendorCategory.trim() || null,
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

  const handleDeletePartner = (partner: PartnerAffiliate) => {
    const msg = `Hapus mitra "${partner.name}"? Mitra yang sudah punya catatan komisi tidak dapat dihapus, hanya dinonaktifkan.`;

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

  const clearPayoutReceipt = useCallback(() => {
    setPayoutReceiptFile(null);
    setPayoutReceiptPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (payoutReceiptPreviewUrl) URL.revokeObjectURL(payoutReceiptPreviewUrl);
    };
  }, [payoutReceiptPreviewUrl]);

  const handleSelectPayoutReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setActionFeedback({ type: "error", message: "Ukuran file bukti transfer maksimal 5MB." });
      e.target.value = "";
      return;
    }
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    if (file.type && !allowed.has(file.type)) {
      setActionFeedback({ type: "error", message: "Format bukti transfer harus JPG, PNG, WEBP, atau PDF." });
      e.target.value = "";
      return;
    }
    setPayoutReceiptFile(file);
    setPayoutReceiptPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    });
  };

  // Open Payout Modal
  const openPayoutDialog = (partner: PartnerAffiliate) => {
    setPayoutPartner(partner);
    setPayoutAmount(String(partner.pendingBalance));
    setPayoutPaymentSource("TRANSFER_BANK");
    setPayoutReferenceNumber("");
    setPayoutNotes(`Pencairan komisi mitra via transfer ke ${partner.bankName || "Bank"} ${partner.accountNumber || ""}`);
    clearPayoutReceipt();
    setPayoutModalOpen(true);
  };

  const closePayoutDialog = () => {
    setPayoutModalOpen(false);
    clearPayoutReceipt();
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
      const formData = new FormData();
      formData.append("action", "PAYOUT_PARTNER");
      formData.append("partnerId", payoutPartner.id);
      formData.append("amount", String(amountNum));
      formData.append("paymentSource", payoutPaymentSource);
      if (payoutReferenceNumber.trim()) {
        formData.append("referenceNumber", payoutReferenceNumber.trim());
      }
      if (payoutNotes.trim()) {
        formData.append("notes", payoutNotes.trim());
      }
      if (payoutReceiptFile) {
        formData.append("receiptFile", payoutReceiptFile);
      }

      const res = await fetch("/api/admin/marketing", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat payout komisi");

      const amountLabel = `Rp ${amountNum.toLocaleString("id-ID")}`;
      let feedbackMsg = `Pencairan sebesar ${amountLabel} berhasil dicatat ke Finance.`;
      if (data.emailSent && data.emailRecipient) {
        feedbackMsg = `Pencairan ${amountLabel} berhasil dicatat & email detail pencairan${data.hasReceipt ? " beserta bukti transfer" : ""} terkirim ke ${data.emailRecipient}.`;
      } else if (data.emailError === "PARTNER_EMAIL_MISSING") {
        feedbackMsg = `Pencairan ${amountLabel} berhasil dicatat ke Finance. Email tidak dikirim karena mitra belum memiliki alamat email.`;
      } else if (data.emailError === "SMTP_NOT_CONFIGURED") {
        feedbackMsg = `Pencairan ${amountLabel} berhasil dicatat ke Finance. Email tidak dikirim karena SMTP belum dikonfigurasi.`;
      } else if (data.emailError) {
        feedbackMsg = `Pencairan ${amountLabel} berhasil dicatat ke Finance, namun email ke ${data.emailRecipient || "mitra"} gagal dikirim (${data.emailError}).`;
      }

      setActionFeedback({ type: "success", message: feedbackMsg });
      closePayoutDialog();
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

      return matchesSearch;
    });
  }, [coupons, searchQuery]);

  const filteredPartners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return partners.filter((p) => {
      if (categoryFilter === "NONE") {
        if (p.vendorCategory) return false;
      } else if (categoryFilter !== "ALL") {
        if ((p.vendorCategory || "").toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.vendorCategory && p.vendorCategory.toLowerCase().includes(q)) ||
        (p.phoneNumber && p.phoneNumber.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    });
  }, [partners, searchQuery, categoryFilter]);

  const filteredPayouts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return payouts;
    return payouts.filter((p) => {
      return (
        (p.partner?.name && p.partner.name.toLowerCase().includes(q)) ||
        (p.partner?.email && p.partner.email.toLowerCase().includes(q)) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    });
  }, [payouts, searchQuery]);

  // Aggregate stats (Zero-Debt Direct Wholesale Partner Model)
  const stats = useMemo(() => {
    const activeCouponsCount = coupons.filter((c) => c.isActive).length;
    const totalCouponUsage = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    const activePartnersCount = partners.filter((p) => p.isActive).length;
    const totalProvisionedClients = partners.reduce(
      (sum, p) => sum + Number(p._count?.provisionedClients || 0),
      0,
    );

    return {
      activeCouponsCount,
      totalCouponUsage,
      activePartnersCount,
      totalProvisionedClients,
      totalPartners: partners.length,
      totalCoupons: coupons.length,
    };
  }, [partners, coupons]);

  const marketingCtx = {
    activeSubTab, commissions, coupons, filteredCoupons, filteredPartners, filteredPayouts, handleDeleteCoupon, handleDeletePartner, openCouponModal, openPartnerModal, openPayoutDialog, packages, partners, payouts, addingCategory, clearPayoutReceipt, closePayoutDialog, couponForm, couponModalOpen, deleteConfirm, editingCoupon, editingPartner, formSubmitting, handleAddVendorCategory, handleCouponSubmit, handleExecutePayout, handleGenerateCode, handlePartnerSubmit, handleSelectPayoutReceipt, newCategoryName, partnerForm, partnerModalOpen, payoutAmount, payoutLoading, payoutModalOpen, payoutNotes, payoutPartner, payoutPaymentSource, payoutReceiptFile, payoutReceiptPreviewUrl, payoutReferenceNumber, setCouponForm, setCouponModalOpen, setDeleteConfirm, setNewCategoryName, setPartnerForm, setPartnerModalOpen, setPayoutAmount, setPayoutNotes, setPayoutPaymentSource, setPayoutReferenceNumber, setShowAddCategoryInput, showAddCategoryInput, vendorCategories,
  };

  return (
    <div className="space-y-6 max-w-7xl w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pemasaran &amp; Mitra</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Kelola kupon promo publik mandiri serta mitra vendor dengan potongan harga langsung (tanpa utang komisi atau payout).
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
          <span className="text-xs font-semibold text-gray-500 block">Mitra Aktif</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-600 font-mono">
              {stats.activePartnersCount}
            </span>
            <span className="text-xs text-gray-400">dari {stats.totalPartners} mitra</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 block">Klien Didaftarkan Mitra</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              {stats.totalProvisionedClients}
            </span>
            <span className="text-xs text-gray-400">akun via Portal Mitra</span>
          </div>
        </div>
      </div>

      {/* ── Sub-Tab Navigation & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => { setActiveSubTab("coupons"); setSearchQuery(""); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeSubTab === "coupons"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Kupon Promo Publik ({coupons.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab("partners"); setSearchQuery(""); setCategoryFilter("ALL"); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeSubTab === "partners"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Mitra ({partners.length})
          </button>
          {commissions.length > 0 && (
            <button
              type="button"
              onClick={() => { setActiveSubTab("commissions"); setSearchQuery(""); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeSubTab === "commissions"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Arsip Komisi Lama ({commissions.length})
            </button>
          )}
          {payouts.length > 0 && (
            <button
              type="button"
              onClick={() => { setActiveSubTab("payouts"); setSearchQuery(""); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeSubTab === "payouts"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Arsip Pencairan Lama ({payouts.length})
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Kategori Vendor (Khusus Tab Mitra) */}
          {activeSubTab === "partners" && (
            <select
              aria-label="Filter Kategori Vendor"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-base sm:text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-700 font-medium"
            >
              <option value="ALL">Semua Kategori Vendor</option>
              {vendorCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="NONE">Tanpa Kategori</option>
            </select>
          )}

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder={activeSubTab === "partners" ? "Cari nama, kategori, email..." : "Cari data..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-base sm:text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 w-48 sm:w-60"
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
            <div className="flex items-center gap-2">
              <a
                href="/partner"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 text-xs font-bold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Buka Portal Mitra
              </a>
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
            </div>
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
          <MarketingTables ctx={marketingCtx} />
        </>
      )}

      <MarketingModals ctx={marketingCtx} />

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
