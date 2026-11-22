"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

import {
  type PartnerClientStats,
  type PartnerClientTransaction,
  type PartnerInfo,
  type PartnerPackageOption,
  type PartnerPlatformConfig,
  type ActivePaymentModalState,
  type ProvisionedClient,
  type ActivationDeliveryResult,
  type PartnerCommission,
  type PartnerPayout,
  type PartnerAuthView,
  formatRupiah,
  formatDate,
  formatDateTimeWib,
} from "@/components/partner/types";
import { PartnerAuthScreen } from "@/components/partner/PartnerAuthScreen";
import { PartnerClientTables } from "@/components/partner/PartnerClientTables";
import { PartnerPaymentModal } from "@/components/partner/PartnerPaymentModal";

export default function PartnerPortalPage() {
  const [checking, setChecking] = useState(true);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [platformConfig, setPlatformConfig] = useState<PartnerPlatformConfig | null>(null);
  const [clients, setClients] = useState<ProvisionedClient[]>([]);
  const [clientTransactions, setClientTransactions] = useState<PartnerClientTransaction[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);

  // Dashboard Filter & Tab State
  const [dashboardTab, setDashboardTab] = useState<"clients" | "transactions">("clients");
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING">("ALL");
  const [txSearch, setTxSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "EXPIRED">("ALL");

  // Client Provisioning & Package Order Form State (Opsi A: WO Pilih Paket & Bayar Harga Potongan)
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedPlanType, setSelectedPlanType] = useState<"TIER_1" | "TIER_2" | "TIER_3">("TIER_2");
  const [creatingClient, setCreatingClient] = useState(false);
  const [provisionError, setProvisionError] = useState("");
  const [deliveryResult, setDeliveryResult] = useState<ActivationDeliveryResult | null>(null);
  const [resendingClientId, setResendingClientId] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<"wa" | "link" | null>(null);

  // Integrated WO Payment Modal State
  const [activePayment, setActivePayment] = useState<ActivePaymentModalState | null>(null);
  const [paymentInitLoading, setPaymentInitLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofSuccessMsg, setProofSuccessMsg] = useState("");

  // Auth state (Login Email+Password, Aktivasi Akun via OTP, Reset Sandi via OTP)
  const [authView, setAuthView] = useState<PartnerAuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpStep, setOtpStep] = useState<"EMAIL" | "VERIFY">("EMAIL");
  const [otpCode, setOtpCode] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const switchAuthView = (next: PartnerAuthView) => {
    setAuthView(next);
    setAuthError("");
    setAuthMessage("");
    setNeedsActivation(false);
    setOtpStep("EMAIL");
    setOtpCode("");
    setPassword("");
    setConfirmPassword("");
  };

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const res = await fetch("/api/partner/clients", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.clients)) {
          setClients(data.clients);
        }
      }
    } catch {
      // Abaikan kesalahan sementara
    } finally {
      setClientsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/partner/dashboard", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setPartner(null);
        setClients([]);
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setPartner(data.partner);
        if (data.platform) {
          setPlatformConfig(data.platform);
          const featured = (data.platform.packages || []).find((p: PartnerPackageOption) => p.isFeatured);
          if (featured) {
            setSelectedPlanType((prev) => prev || featured.id);
          }
        }
        setClientTransactions(Array.isArray(data.clientTransactions) ? data.clientTransactions : []);
        setCommissions(Array.isArray(data.commissions) ? data.commissions : []);
        setPayouts(Array.isArray(data.payouts) ? data.payouts : []);
        loadClients();
      } else {
        setPartner(null);
      }
    } catch {
      setPartner(null);
    } finally {
      setChecking(false);
    }
  }, [loadClients]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setNeedsActivation(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/partner/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || "Email atau kata sandi mitra salah.");
        if (data.code === "PASSWORD_NOT_SET") {
          setNeedsActivation(true);
        }
        return;
      }
      setPassword("");
      await loadDashboard();
    } catch {
      setAuthError("Terjadi gangguan koneksi saat mencoba masuk.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setSubmitting(true);
    const purpose = authView === "reset" ? "PARTNER_RESET_PASSWORD" : "PARTNER_ACTIVATE";
    try {
      const res = await fetch("/api/partner/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Gagal mengirim kode OTP.");
        return;
      }
      setAuthMessage(
        data.message ||
          "Kode OTP 6 digit telah dikirim ke email Anda. Periksa kotak masuk (Inbox) atau folder Spam/Junk.",
      );
      setOtpStep("VERIFY");
    } catch {
      setAuthError("Terjadi gangguan koneksi saat mengirim kode OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    if (otpCode.length !== 6) {
      setAuthError("Masukkan 6 digit kode OTP dari email.");
      return;
    }
    if (password.length < 8) {
      setAuthError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setSubmitting(true);
    const purpose = authView === "reset" ? "PARTNER_RESET_PASSWORD" : "PARTNER_ACTIVATE";
    try {
      const res = await fetch("/api/partner/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode.trim(),
          password,
          purpose,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || "Gagal menyimpan kata sandi mitra.");
        return;
      }
      setOtpCode("");
      setPassword("");
      setConfirmPassword("");
      await loadDashboard();
    } catch {
      setAuthError("Terjadi gangguan koneksi saat memverifikasi OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/partner/auth/logout", { method: "POST" }).catch(() => {});
    setPartner(null);
    setClients([]);
    setClientTransactions([]);
    setCommissions([]);
    setPayouts([]);
    setDeliveryResult(null);
    switchAuthView("login");
  };

  const handleExportTransactionsCsv = (rows: PartnerClientTransaction[]) => {
    const header = [
      "Tanggal",
      "Invoice",
      "Nama Klien",
      "Email Klien",
      "Paket",
      "Jenis Order",
      "Harga Normal (Rp)",
      "Potongan Mitra (Rp)",
      "Total Dibayar (Rp)",
      "Status",
      "Tanggal Lunas",
    ];
    const escapeCell = (val: unknown) => {
      const s = String(val ?? "").replace(/"/g, '""');
      return `"${s}"`;
    };
    const lines = [
      header.map(escapeCell).join(","),
      ...rows.map((t) =>
        [
          formatDateTimeWib(t.createdAt),
          t.invoiceNumber,
          t.clientName,
          t.clientEmail,
          t.planType,
          t.orderType,
          Math.round(t.baseAmount),
          Math.round(t.discountAmount),
          Math.round(t.finalAmount),
          t.status,
          t.paidAt ? formatDateTimeWib(t.paidAt) : "-",
        ]
          .map(escapeCell)
          .join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-transaksi-mitra-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (text: string, target: "wa" | "link") => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget((curr) => (curr === target ? null : curr)), 2200);
  };

  const openPaymentModalForOrder = useCallback(
    async (opts: {
      orderId: string;
      invoiceNumber: string;
      planType: string;
      clientId: string;
      clientName: string;
      clientEmail: string;
      amount: number;
      discountAmount: number;
      paymentMethod: string;
      status: string;
      hasProof?: boolean;
      rejectReason?: string | null;
    }) => {
      setPaymentError("");
      setProofFile(null);
      setProofSuccessMsg("");
      setActivePayment({
        ...opts,
        chargedAmount: null,
        bank: platformConfig?.bank,
      });
      setPaymentInitLoading(true);
      try {
        const res = await fetch(`/api/partner/orders/${opts.orderId}/pay`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          setPaymentError(data.error || "Gagal menyiapkan sesi pembayaran.");
          return;
        }
        if (data.alreadyPaid || data.status === "PAID") {
          setActivePayment((prev) => (prev ? { ...prev, status: "PAID" } : null));
          await loadDashboard();
          return;
        }
        setActivePayment((prev) =>
          prev
            ? {
                ...prev,
                paymentMethod: data.paymentMethod || prev.paymentMethod,
                amount: typeof data.amount === "number" ? data.amount : prev.amount,
                chargedAmount: typeof data.chargedAmount === "number" ? data.chargedAmount : prev.chargedAmount,
                qrString: data.qrString || null,
                checkoutUrl: data.checkoutUrl || null,
                expiryTimestamp: data.expiryTimestamp || null,
                hasProof: Boolean(data.hasProof ?? prev.hasProof),
                bank: data.bank || prev.bank,
              }
            : null,
        );
      } catch {
        setPaymentError("Terjadi gangguan koneksi saat menyiapkan pembayaran.");
      } finally {
        setPaymentInitLoading(false);
      }
    },
    [platformConfig?.bank, loadDashboard],
  );

  const activePaymentOrderId = activePayment?.orderId ?? null;
  const activePaymentStatus = activePayment?.status ?? null;
  const activePaymentClientId = activePayment?.clientId ?? null;

  // Auto-poll status pembayaran saat Modal Pembayaran Mitra terbuka & masih PENDING
  useEffect(() => {
    if (!activePaymentOrderId || !activePaymentClientId || activePaymentStatus !== "PENDING") return;
    const orderId = activePaymentOrderId;
    const clientId = activePaymentClientId;
    let cancelled = false;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/partner/orders/${orderId}/status`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const st = await res.json();
        if (cancelled) return;

        if (st.status === "PAID") {
          setActivePayment((prev) => (prev && prev.orderId === orderId ? { ...prev, status: "PAID" } : prev));
          await loadDashboard();
          // Otomatis ambil/terbitkan link aktivasi + teks WhatsApp agar WO langsung bisa salin & kirim ke pengantin!
          try {
            const actRes = await fetch(`/api/partner/clients/${clientId}/resend-activation`, { method: "POST" });
            if (actRes.ok) {
              const actData = await actRes.json();
              if (actData.success && !cancelled) {
                setDeliveryResult({
                  clientName: actData.client.name,
                  clientEmail: actData.client.email,
                  activationUrl: actData.activationUrl,
                  expiresAt: actData.expiresAt,
                  emailSent: Boolean(actData.emailSent),
                  emailError: actData.emailError || null,
                  whatsappText: actData.whatsappText,
                  whatsappUrl: actData.whatsappUrl,
                  reissued: false,
                });
              }
            }
          } catch {
            // Link sudah otomatis dikirim lewat email di backend
          }
        } else if (st.status === "EXPIRED") {
          setActivePayment((prev) => (prev && prev.orderId === orderId ? { ...prev, status: "EXPIRED" } : prev));
        } else {
          setActivePayment((prev) =>
            prev && prev.orderId === orderId
              ? {
                  ...prev,
                  hasProof: Boolean(st.hasProof),
                  rejectReason: st.rejectReason || null,
                }
              : prev,
          );
        }
      } catch {
        // Abaikan error polling sementara
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activePaymentOrderId, activePaymentStatus, activePaymentClientId, loadDashboard]);

  const handleUploadPartnerProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayment || !proofFile) return;
    setPaymentError("");
    setProofSuccessMsg("");
    setUploadingProof(true);
    try {
      const fd = new FormData();
      fd.append("file", proofFile);
      const res = await fetch(`/api/partner/orders/${activePayment.orderId}/upload-proof`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPaymentError(data.error || "Gagal mengunggah bukti transfer.");
        return;
      }
      setProofSuccessMsg(data.message || "Bukti transfer berhasil diunggah.");
      setProofFile(null);
      setActivePayment((prev) => (prev ? { ...prev, hasProof: true, rejectReason: null } : null));
      await loadDashboard();
    } catch {
      setPaymentError("Terjadi gangguan koneksi saat mengunggah bukti transfer.");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError("");
    setCreatingClient(true);
    try {
      const res = await fetch("/api/partner/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clientName.trim(),
          email: clientEmail.trim(),
          phoneNumber: clientPhone.trim() || undefined,
          planType: selectedPlanType,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProvisionError(data.error || "Gagal membuat tagihan paket klien.");
        return;
      }

      setClientName("");
      setClientEmail("");
      setClientPhone("");
      await loadDashboard();

      // Langsung buka Modal Pembayaran Mitra WO untuk melunasi paket dengan harga potongan mitra!
      if (data.order && data.client) {
        await openPaymentModalForOrder({
          orderId: data.order.id,
          invoiceNumber: data.order.invoiceNumber,
          planType: data.order.planType,
          clientId: data.client.id,
          clientName: data.client.name,
          clientEmail: data.client.email,
          amount: Number(data.order.amount),
          discountAmount: Number(data.order.discountAmount || 0),
          paymentMethod: data.order.paymentMethod || "GATEWAY",
          status: data.order.status || "PENDING",
          hasProof: Boolean(data.order.hasProof),
        });
      }
    } catch {
      setProvisionError("Terjadi gangguan koneksi saat membuat tagihan klien.");
    } finally {
      setCreatingClient(false);
    }
  };

  const handleResendActivation = async (client: ProvisionedClient) => {
    setProvisionError("");
    setResendingClientId(client.id);
    try {
      const res = await fetch(`/api/partner/clients/${client.id}/resend-activation`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProvisionError(data.error || "Gagal mengirim ulang tautan aktivasi.");
        return;
      }
      setDeliveryResult({
        clientName: data.client.name,
        clientEmail: data.client.email,
        activationUrl: data.activationUrl,
        expiresAt: data.expiresAt,
        emailSent: Boolean(data.emailSent),
        emailError: data.emailError || null,
        whatsappText: data.whatsappText,
        whatsappUrl: data.whatsappUrl,
        reissued: true,
      });
      await loadClients();
    } catch {
      setProvisionError("Terjadi gangguan koneksi saat mengirim ulang tautan.");
    } finally {
      setResendingClientId(null);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-stone-500 font-medium">Memuat Portal Mitra...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    const authCtx = { authError, authMessage, authView, confirmPassword, email, handlePasswordLogin, handleRequestOtp, handleSetPassword, needsActivation, otpCode, otpStep, partner, password, setAuthError, setConfirmPassword, setEmail, setOtpCode, setOtpStep, setPassword, setShowPassword, showPassword, submitting, switchAuthView };
    return <PartnerAuthScreen ctx={authCtx} />;
  }

  const totalClients = clients.length > 0 ? clients.length : (partner.clientStats?.totalClients ?? 0);
  const activeClients =
    clients.length > 0
      ? clients.filter((c) => c.isActivated).length
      : (partner.clientStats?.activeClients ?? 0);
  const pendingActivationClients = Math.max(0, totalClients - activeClients);
  const paidOrdersCount = partner.clientStats?.paidClientOrders ?? clientTransactions.filter((t) => t.status === "PAID").length;
  const totalPaidNetAmount =
    partner.clientStats?.totalPaidNetAmount ??
    clientTransactions.filter((t) => t.status === "PAID").reduce((s, t) => s + t.finalAmount, 0);
  const totalWholesaleSavings =
    partner.clientStats?.totalWholesaleSavings ??
    clientTransactions.filter((t) => t.status === "PAID").reduce((s, t) => s + t.discountAmount, 0);
  const discountRateLabel =
    partner.commissionType === "PERCENT"
      ? `${partner.commissionValue}%`
      : formatRupiah(partner.commissionValue);

  const filteredClients = clients.filter((c) => {
    if (clientStatusFilter === "ACTIVE" && !c.isActivated) return false;
    if (clientStatusFilter === "PENDING" && c.isActivated) return false;
    const q = clientSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phoneNumber || "").toLowerCase().includes(q)
    );
  });

  const filteredTransactions = clientTransactions.filter((t) => {
    if (txStatusFilter !== "ALL" && t.status !== txStatusFilter) return false;
    const q = txSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      t.invoiceNumber.toLowerCase().includes(q) ||
      t.clientName.toLowerCase().includes(q) ||
      t.clientEmail.toLowerCase().includes(q) ||
      t.planType.toLowerCase().includes(q)
    );
  });

  const filteredTxTotalBase = filteredTransactions.reduce((s, t) => s + t.baseAmount, 0);
  const filteredTxTotalDiscount = filteredTransactions.reduce((s, t) => s + t.discountAmount, 0);
  const filteredTxTotalFinal = filteredTransactions.reduce((s, t) => s + t.finalAmount, 0);

  const selectedPkg =
    platformConfig?.packages?.find((p) => p.id === selectedPlanType) ||
    platformConfig?.packages?.[0] ||
    null;

  const dashCtx = { clientEmail, clientName, clientSearch, clientStatusFilter, clientTransactions, clients, clientsLoading, commissions, dashboardTab, email, filteredClients, filteredTransactions, filteredTxTotalBase, filteredTxTotalDiscount, filteredTxTotalFinal, handleExportTransactionsCsv, handleResendActivation, loadDashboard, openPaymentModalForOrder, partner, payouts, resendingClientId, setClientSearch, setClientStatusFilter, setDashboardTab, setTxSearch, setTxStatusFilter, txSearch, txStatusFilter, activePayment, discountRateLabel, handleUploadPartnerProof, paymentError, paymentInitLoading, platformConfig, proofFile, proofSuccessMsg, setActivePayment, setProofFile, uploadingProof };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans">
      <header className="bg-white border-b border-[#eadecf]/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-stone-900 truncate">Portal Mitra</div>
              <div className="text-[11px] text-stone-500 truncate flex items-center gap-1.5">
                <span className="truncate">{partner.name}</span>
                {partner.vendorCategory && (
                  <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-semibold shrink-0">
                    {partner.vendorCategory}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer shrink-0"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Partner Summary Header */}
        <section className="bg-white rounded-2xl border border-[#eadecf] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>Mitra Resmi &middot; Potongan Harga Langsung</span>
              </div>
              {partner.vendorCategory && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-semibold">
                  {partner.vendorCategory}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1e1c1a]">
              {partner.name}
            </h1>
            <p className="text-xs text-stone-500">
              Daftarkan klien dan pilih paket undangannya langsung di bawah ini dengan potongan{" "}
              <strong className="text-stone-900">{discountRateLabel}</strong> dari harga resmi. Setelah Anda melunasi tagihan harga mitra, pengantin otomatis menerima tautan aktivasi 48 jam dan langsung masuk ke studio tanpa melihat harga modal mitra.
            </p>
          </div>

          <div className="px-4 py-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-0.5 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Tarif Diskon Mitra Aktif
            </div>
            <div className="text-lg font-bold text-amber-900">
              Potongan {discountRateLabel}
            </div>
            <div className="text-[11px] text-amber-800/80">
              Otomatis di checkout &bull; Anti-stacking kupon publik
            </div>
          </div>
        </section>

        {/* 4 Clean KPI Cards (Klien + Laporan Transaksi + Potongan Mitra) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#eadecf] p-5 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Potongan Harga Mitra
            </div>
            <div className="text-2xl font-bold text-amber-800">
              {discountRateLabel}
            </div>
            <div className="text-[11px] text-stone-500">Langsung memotong tagihan checkout</div>
          </div>

          <div className="bg-white rounded-2xl border border-[#eadecf] p-5 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Klien Ditangani
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {totalClients}
            </div>
            <div className="text-[11px] text-stone-500">
              <span className="text-emerald-700 font-semibold">{activeClients} aktif</span>
              {" · "}
              <span className="text-amber-700 font-semibold">{pendingActivationClients} menunggu</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#eadecf] p-5 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Transaksi Klien Lunas
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {paidOrdersCount} <span className="text-sm font-medium text-stone-400">order</span>
            </div>
            <div className="text-[11px] text-stone-500">
              Total dibayar: <strong className="text-stone-700">{formatRupiah(totalPaidNetAmount)}</strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#eadecf] p-5 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Total Hemat / Potongan
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {formatRupiah(totalWholesaleSavings)}
            </div>
            <div className="text-[11px] text-stone-500">Akumulasi potongan langsung dinikmati</div>
          </div>
        </section>

        {/* Direct WO Client Provisioning + Package Wholesale Payment Form */}
        <section className="bg-white rounded-2xl border border-[#eadecf] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-bold text-stone-900">
              Daftarkan Klien &amp; Pilih Paket Undangan (Harga Khusus Mitra {discountRateLabel})
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Anda membayarkan paket pilihan klien dengan harga potongan mitra. Setelah lunas, tautan aktivasi 48 jam atas nama <strong>{partner.name}</strong> langsung aktif agar mempelai bisa mulai membuat undangan tanpa melihat harga modal.
            </p>
          </div>

          <div className="p-5 space-y-5">
            {provisionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {provisionError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-4">
              {/* Pilihan Paket dengan Harga Resmi vs Harga Khusus Mitra */}
              {platformConfig?.packages && platformConfig.packages.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-stone-700">
                    1. Pilih Paket Undangan Klien <span className="text-rose-500">*</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {platformConfig.packages.map((pkg) => {
                      const isSelected = selectedPlanType === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPlanType(pkg.id)}
                          className={`text-left p-4 rounded-2xl border-2 transition cursor-pointer relative ${
                            isSelected
                              ? "border-amber-700 bg-amber-50/70 shadow-xs"
                              : "border-stone-200 bg-stone-50/50 hover:border-amber-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-bold text-stone-900">{pkg.name}</span>
                            {pkg.discountAmount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Hemat {formatRupiah(pkg.discountAmount)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            {pkg.discountAmount > 0 && (
                              <span className="text-xs text-stone-400 line-through font-mono">
                                {formatRupiah(pkg.basePrice)}
                              </span>
                            )}
                            <span className="text-lg font-extrabold text-amber-900 font-mono">
                              {formatRupiah(pkg.partnerPrice)}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">{pkg.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Data Klien Mempelai */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-700">2. Data Akun Mempelai / Klien</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label htmlFor="client-name" className="block text-xs font-bold text-stone-700 mb-1.5">
                      Nama Klien / Mempelai <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="client-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={100}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Contoh: Nadia & Bagas"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                    />
                  </div>

                  <div>
                    <label htmlFor="client-email" className="block text-xs font-bold text-stone-700 mb-1.5">
                      Email Aktif Klien <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="client-email"
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="nadia.bagas@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                    />
                  </div>

                  <div>
                    <label htmlFor="client-phone" className="block text-xs font-bold text-stone-700 mb-1.5">
                      No. WhatsApp Klien <span className="text-stone-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      id="client-phone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
                <div className="text-[11px] text-stone-500">
                  {selectedPkg ? (
                    <>
                      Paket dipilih: <strong className="text-stone-900">{selectedPkg.name}</strong> &middot; Harga Mitra:{" "}
                      <strong className="text-amber-900 font-mono">{formatRupiah(selectedPkg.partnerPrice)}</strong>{" "}
                      {selectedPkg.discountAmount > 0 && (
                        <span className="text-emerald-700 font-semibold">(potongan {discountRateLabel} tanpa kupon)</span>
                      )}
                    </>
                  ) : (
                    <>Potongan harga <strong>{discountRateLabel}</strong> diterapkan otomatis tanpa kode kupon.</>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={creatingClient}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition cursor-pointer shrink-0"
                >
                  {creatingClient
                    ? "Menyiapkan Tagihan..."
                    : selectedPkg
                      ? `Daftarkan & Bayar ${formatRupiah(selectedPkg.partnerPrice)}`
                      : "Daftarkan & Bayar Paket"}
                </button>
              </div>
            </form>

            {/* Instant Delivery & WhatsApp Backup Panel */}
            {deliveryResult && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-emerald-900">
                      {deliveryResult.reissued
                        ? `Tautan Aktivasi Baru Diterbitkan untuk ${deliveryResult.clientName}`
                        : `Akun ${deliveryResult.clientName} Berhasil Didaftarkan`}
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      {deliveryResult.emailSent ? (
                        <>Email aktivasi berhasil dikirim ke <strong>{deliveryResult.clientEmail}</strong> (berlaku s.d. {formatDateTimeWib(deliveryResult.expiresAt)}).</>
                      ) : (
                        <>Pengiriman email belum tersedia ({deliveryResult.emailError || "SMTP"}). Silakan kirim tautan aktivasi ke mempelai melalui WhatsApp di bawah ini.</>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeliveryResult(null)}
                    className="text-[11px] text-stone-500 hover:text-stone-800 font-semibold self-start sm:self-center cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 text-[11px] font-mono text-stone-700 break-all">
                  {deliveryResult.activationUrl}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(deliveryResult.whatsappText, "wa")}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {copiedTarget === "wa" ? "Teks WhatsApp Tersalin!" : "Salin Teks & Link ke WhatsApp"}
                  </button>
                  <a
                    href={deliveryResult.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100/60 text-emerald-900 border border-emerald-300 text-xs font-bold transition"
                  >
                    Buka WhatsApp &rarr;
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyText(deliveryResult.activationUrl, "link")}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold transition cursor-pointer"
                  >
                    {copiedTarget === "link" ? "Link Tersalin!" : "Salin Link Saja"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <PartnerClientTables ctx={dashCtx} />
      </main>

      <PartnerPaymentModal ctx={dashCtx} />
    </div>
  );
}
