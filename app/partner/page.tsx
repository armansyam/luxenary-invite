"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

interface PartnerClientStats {
  totalClients: number;
  activeClients: number;
  pendingActivationClients: number;
  paidClientOrders: number;
  pendingClientOrders?: number;
  totalPaidNetAmount?: number;
  totalWholesaleSavings?: number;
}

interface PartnerClientTransaction {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  planType: string;
  orderType: string;
  status: "PENDING" | "PAID" | "EXPIRED" | string;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  promoCodeApplied: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface PartnerInfo {
  id: string;
  name: string;
  vendorCategory?: string | null;
  email: string | null;
  phoneNumber: string | null;
  bankName: string | null;
  accountNumberMasked: string | null;
  accountName: string | null;
  commissionType: "NOMINAL" | "PERCENT";
  commissionValue: number;
  pendingBalance: number;
  totalPaidOut: number;
  totalEarned: number;
  totalTransactions: number;
  clientStats?: PartnerClientStats;
}

interface PartnerPackageOption {
  id: "TIER_1" | "TIER_2" | "TIER_3";
  name: string;
  desc: string;
  badge: string | null;
  isFeatured: boolean;
  basePrice: number;
  discountAmount: number;
  partnerPrice: number;
}

interface PartnerPlatformConfig {
  name: string;
  paymentMode: "GATEWAY" | "MANUAL";
  feePercent: number;
  feePayer: "BUYER" | "MERCHANT";
  bank: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    bankInstructions: string;
  };
  packages: PartnerPackageOption[];
}

interface ActivePaymentModalState {
  orderId: string;
  invoiceNumber: string;
  planType: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  chargedAmount: number | null;
  discountAmount: number;
  paymentMethod: "GATEWAY" | "MANUAL_TRANSFER" | string;
  status: "PENDING" | "PAID" | "EXPIRED" | string;
  qrString?: string | null;
  checkoutUrl?: string | null;
  expiryTimestamp?: number | null;
  hasProof?: boolean;
  rejectReason?: string | null;
  bank?: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    bankInstructions: string;
  };
}

interface ProvisionedClient {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  createdAt: string;
  isActivated: boolean;
  hasPaidOrder?: boolean;
  invitationCount: number;
  activation: {
    expiresAt: string;
    consumedAt: string | null;
    emailSentAt: string | null;
    isExpired: boolean;
  } | null;
  latestOrder: {
    id: string;
    invoiceNumber: string;
    planType: string;
    orderType?: string;
    status: string;
    paymentMethod?: string;
    amount: number;
    discountAmount: number;
    hasProof?: boolean;
    rejectReason?: string | null;
    paidAt: string | null;
    expiredAt?: string | null;
  } | null;
}

interface ActivationDeliveryResult {
  clientName: string;
  clientEmail: string;
  activationUrl: string;
  expiresAt: string;
  emailSent: boolean;
  emailError: string | null;
  whatsappText: string;
  whatsappUrl: string;
  reissued?: boolean;
}

interface PartnerCommission {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
  createdAt: string;
  order: {
    invoiceNumber: string | null;
    planType: string;
    amount: number;
    paidAt: string | null;
  } | null;
}

interface PartnerPayout {
  id: string;
  amount: number;
  expenseDate: string;
  paymentSource: string;
  referenceNumber: string | null;
  notes: string | null;
  hasReceipt: boolean;
}

function formatPaymentSource(source: string): string {
  switch (source) {
    case "E_WALLET":
      return "E-Wallet";
    case "TUNAI":
      return "Tunai";
    case "TRANSFER_BANK":
    default:
      return "Transfer Bank";
  }
}

function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount || 0).toLocaleString("id-ID")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeWib(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} WIB`;
}

type PartnerAuthView = "login" | "activate" | "reset";

function EyeToggleIcon({ shown }: { shown: boolean }) {
  return shown ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58A3 3 0 0013.42 13.42M9.88 5.09A10.45 10.45 0 0112 4.8c5 0 9.27 3.11 10.5 7.2a10.6 10.6 0 01-4.16 5.47M6.61 6.61A10.55 10.55 0 001.5 12c1.23 4.09 5.5 7.2 10.5 7.2 1.66 0 3.24-.34 4.66-.96" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

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
    const authHeading =
      authView === "activate"
        ? "Aktivasi Akun Mitra"
        : authView === "reset"
          ? "Reset Kata Sandi Mitra"
          : "Masuk Portal Mitra";

    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#eadecf] shadow-sm p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-1.5">
            <div className="flex justify-center">
              <BrandLogo size="md" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800">
              Portal Mitra
            </p>
            <h1 className="text-2xl font-serif font-bold text-[#1e1c1a]">
              {authHeading}
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed">
              Daftarkan akun klien pengantin, kirim tautan aktivasi 48 jam, dan nikmati potongan harga khusus mitra secara otomatis saat checkout.
            </p>
          </div>

          {authView !== "reset" && (
            <div className="grid grid-cols-2 rounded-2xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => switchAuthView("login")}
                className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  authView === "login" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => switchAuthView("activate")}
                className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  authView === "activate" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Aktivasi Akun
              </button>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium space-y-2">
              <p>{authError}</p>
              {needsActivation && (
                <button
                  type="button"
                  onClick={() => switchAuthView("activate")}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-800 text-white text-[11px] font-bold hover:bg-amber-900 transition cursor-pointer"
                >
                  Aktivasi Akun Sekarang
                </button>
              )}
            </div>
          )}

          {authMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              {authMessage}
            </div>
          )}

          {authView === "login" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="partner-email" className="block text-xs font-bold text-stone-700 mb-1.5">
                  Email Mitra Terdaftar
                </label>
                <input
                  id="partner-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mitra@domain.com"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="partner-password" className="text-xs font-bold text-stone-700">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => switchAuthView("reset")}
                    className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="partner-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <EyeToggleIcon shown={showPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim() || !password}
                className="w-full py-3 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Memproses..." : "Masuk ke Portal Mitra"}
              </button>
            </form>
          ) : otpStep === "EMAIL" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs text-stone-500 leading-relaxed">
                {authView === "activate"
                  ? "Khusus mitra yang emailnya sudah didaftarkan admin. Kami akan mengirim kode OTP 6 digit untuk memverifikasi email dan membuat kata sandi pertama Anda."
                  : "Masukkan email mitra terdaftar. Kami akan mengirim kode OTP 6 digit untuk mengatur ulang kata sandi Anda."}
              </p>
              <div>
                <label htmlFor="partner-otp-email" className="block text-xs font-bold text-stone-700 mb-1.5">
                  Email Mitra Terdaftar
                </label>
                <input
                  id="partner-otp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mitra@domain.com"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full py-3 rounded-full bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? "Mengirim Kode..."
                  : authView === "activate"
                    ? "Kirim Kode Aktivasi (OTP)"
                    : "Kirim Kode Reset (OTP)"}
              </button>

              {authView === "reset" && (
                <button
                  type="button"
                  onClick={() => switchAuthView("login")}
                  className="w-full py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  Kembali ke halaman Masuk
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="partner-otp-code" className="text-xs font-bold text-stone-700">
                    Kode OTP 6 Digit
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("EMAIL");
                      setOtpCode("");
                      setAuthError("");
                    }}
                    className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer"
                  >
                    Ganti Email
                  </button>
                </div>
                <input
                  id="partner-otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-center text-lg font-mono font-bold tracking-[0.4em] text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                />
                <p className="mt-1.5 text-[11px] text-stone-500 leading-relaxed text-center">
                  Belum menerima email kode OTP? Periksa folder <strong className="text-stone-700">Spam / Junk</strong> atau tab <strong className="text-stone-700">Promosi</strong>.
                </p>
              </div>

              <div>
                <label htmlFor="partner-new-password" className="block text-xs font-bold text-stone-700 mb-1">
                  {authView === "activate" ? "Buat Kata Sandi" : "Kata Sandi Baru"}{" "}
                  <span className="font-normal text-stone-400">(min. 8 karakter)</span>
                </label>
                <div className="relative">
                  <input
                    id="partner-new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <EyeToggleIcon shown={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="partner-confirm-password" className="block text-xs font-bold text-stone-700 mb-1">
                  Konfirmasi Kata Sandi
                </label>
                <input
                  id="partner-confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otpCode.length !== 6 || !password || !confirmPassword}
                className="w-full py-3 rounded-full bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? "Menyimpan..."
                  : authView === "activate"
                    ? "Aktifkan & Masuk Portal"
                    : "Simpan Kata Sandi & Masuk"}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleRequestOtp}
                className="w-full py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Kirim Ulang Kode OTP
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <Link href="/login" className="hover:text-stone-900 underline">
              Login Klien Undangan
            </Link>
            <Link href="/" className="hover:text-stone-900 underline">
              Beranda
            </Link>
          </div>
        </div>
      </div>
    );
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

        {/* Sub-Tabs: Data Klien Ditangani & Laporan Transaksi */}
        <section className="bg-white rounded-2xl border border-[#eadecf] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-stone-100 self-start">
              <button
                type="button"
                onClick={() => setDashboardTab("clients")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  dashboardTab === "clients"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Data Klien Ditangani ({clients.length})
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("transactions")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  dashboardTab === "transactions"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Laporan Transaksi ({clientTransactions.length})
              </button>
            </div>

            {dashboardTab === "clients" ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Cari nama / email / WA klien..."
                  className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:outline-none focus:border-amber-700 w-52"
                />
                <select
                  value={clientStatusFilter}
                  onChange={(e) => setClientStatusFilter(e.target.value as "ALL" | "ACTIVE" | "PENDING")}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-700 cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Sudah Aktif</option>
                  <option value="PENDING">Menunggu Aktivasi</option>
                </select>
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={clientsLoading}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer shrink-0"
                >
                  {clientsLoading ? "Memuat..." : "Segarkan"}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Cari invoice / nama klien..."
                  className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:outline-none focus:border-amber-700 w-52"
                />
                <select
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value as "ALL" | "PAID" | "PENDING" | "EXPIRED")}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-700 cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PAID">Lunas (PAID)</option>
                  <option value="PENDING">Menunggu Bayar (PENDING)</option>
                  <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
                </select>
                <button
                  type="button"
                  disabled={filteredTransactions.length === 0}
                  onClick={() => handleExportTransactionsCsv(filteredTransactions)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer shrink-0"
                >
                  Unduh CSV Laporan
                </button>
              </div>
            )}
          </div>

          {dashboardTab === "clients" ? (
            filteredClients.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                {clients.length === 0
                  ? "Belum ada klien yang didaftarkan. Gunakan formulir di atas untuk mendaftarkan klien pertama Anda."
                  : "Tidak ada klien yang cocok dengan pencarian/filter saat ini."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-600">
                  <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    <tr>
                      <th className="py-3 px-4">Klien &amp; Kontak</th>
                      <th className="py-3 px-4">Status Akun</th>
                      <th className="py-3 px-4">Undangan &amp; Aktivasi</th>
                      <th className="py-3 px-4">Pesanan Terakhir</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredClients.map((client) => {
                      const isExpiredLink = !client.isActivated && Boolean(client.activation?.isExpired);
                      return (
                        <tr key={client.id} className="hover:bg-stone-50/70">
                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-900">{client.name}</div>
                            <div className="text-[11px] text-stone-500">{client.email}</div>
                            {client.phoneNumber && (
                              <div className="text-[11px] font-mono text-stone-400">{client.phoneNumber}</div>
                            )}
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              Terdaftar: {formatDate(client.createdAt)}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {client.isActivated ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Aktif
                              </span>
                            ) : isExpiredLink ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Link Kedaluwarsa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                Menunggu Aktivasi
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-[11px] text-stone-500">
                            <div className="font-semibold text-stone-700">
                              {client.invitationCount > 0 ? `${client.invitationCount} undangan dibuat` : "Belum buat undangan"}
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              {client.isActivated
                                ? "Akun sudah aktif"
                                : client.activation?.expiresAt
                                  ? `Link s.d. ${formatDateTimeWib(client.activation.expiresAt)}`
                                  : "-"}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {client.latestOrder ? (
                              <div>
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    client.latestOrder.status === "PAID"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : client.latestOrder.status === "PENDING"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-stone-100 text-stone-600"
                                  }`}
                                >
                                  {client.latestOrder.status}
                                </span>
                                <div className="text-[11px] text-stone-600 mt-0.5 font-mono">
                                  {client.latestOrder.planType} &middot; {formatRupiah(client.latestOrder.amount)}
                                </div>
                                {client.latestOrder.discountAmount > 0 && (
                                  <div className="text-[10px] text-emerald-700 font-semibold">
                                    Hemat {formatRupiah(client.latestOrder.discountAmount)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-stone-400">Belum order</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {client.latestOrder && client.latestOrder.status === "PENDING" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openPaymentModalForOrder({
                                    orderId: client.latestOrder!.id,
                                    invoiceNumber: client.latestOrder!.invoiceNumber,
                                    planType: client.latestOrder!.planType,
                                    clientId: client.id,
                                    clientName: client.name,
                                    clientEmail: client.email,
                                    amount: client.latestOrder!.amount,
                                    discountAmount: client.latestOrder!.discountAmount,
                                    paymentMethod: client.latestOrder!.paymentMethod || "GATEWAY",
                                    status: client.latestOrder!.status,
                                    hasProof: client.latestOrder!.hasProof,
                                    rejectReason: client.latestOrder!.rejectReason,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold transition cursor-pointer"
                              >
                                {client.latestOrder.hasProof ? "Lihat Status Bukti" : "Bayar Paket"}
                              </button>
                            ) : !client.isActivated && (client.hasPaidOrder || client.latestOrder?.status === "PAID") ? (
                              <button
                                type="button"
                                disabled={resendingClientId === client.id}
                                onClick={() => handleResendActivation(client)}
                                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                              >
                                {resendingClientId === client.id ? "Mengirim..." : "Kirim / Salin Link"}
                              </button>
                            ) : client.isActivated ? (
                              <span className="text-[11px] text-emerald-700 font-semibold">
                                Aktif &amp; Siap Pakai
                              </span>
                            ) : (
                              <span className="text-[11px] text-stone-400">Menunggu Order</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              {clientTransactions.length === 0
                ? "Belum ada transaksi dari klien yang Anda daftarkan. Transaksi akan muncul otomatis di sini saat klien melakukan checkout."
                : "Tidak ada transaksi yang cocok dengan pencarian/filter saat ini."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Invoice &amp; Paket</th>
                    <th className="py-3 px-4">Klien</th>
                    <th className="py-3 px-4 text-right">Harga Normal</th>
                    <th className="py-3 px-4 text-right">Potongan Mitra</th>
                    <th className="py-3 px-4 text-right">Total Dibayar</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50/70">
                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        <div className="font-medium text-stone-800">{formatDate(tx.createdAt)}</div>
                        {tx.paidAt && (
                          <div className="text-[10px] text-emerald-700">Lunas: {formatDate(tx.paidAt)}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-stone-900 text-[11px]">{tx.invoiceNumber}</div>
                        <div className="text-[10px] text-stone-500">
                          {tx.planType} &middot; {tx.orderType}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">{tx.clientName}</div>
                        <div className="text-[11px] text-stone-400">{tx.clientEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-500 whitespace-nowrap">
                        {formatRupiah(tx.baseAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {tx.discountAmount > 0 ? `- ${formatRupiah(tx.discountAmount)}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                        {formatRupiah(tx.finalAmount)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : tx.status === "PENDING"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tx.status === "PAID"
                                ? "bg-emerald-600"
                                : tx.status === "PENDING"
                                  ? "bg-amber-600"
                                  : "bg-stone-400"
                            }`}
                          />
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-50/90 border-t-2 border-stone-200 font-bold text-xs text-stone-900">
                  <tr>
                    <td colSpan={3} className="py-3 px-4">
                      Total ({filteredTransactions.length} transaksi ditampilkan)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-stone-600 whitespace-nowrap">
                      {formatRupiah(filteredTxTotalBase)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 whitespace-nowrap">
                      - {formatRupiah(filteredTxTotalDiscount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-stone-900 whitespace-nowrap">
                      {formatRupiah(filteredTxTotalFinal)}
                    </td>
                    <td className="py-3 px-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Legacy Historical Archive (Hanya tampil jika ada riwayat lama sebelum sistem potongan langsung) */}
        {(payouts.length > 0 || commissions.length > 0) && (
          <details className="bg-white rounded-2xl border border-[#eadecf] overflow-hidden">
            <summary className="px-5 py-4 cursor-pointer text-xs font-bold text-stone-600 hover:text-stone-900 select-none">
              Arsip Riwayat Transaksi Sebelumnya ({payouts.length} pencairan, {commissions.length} catatan lama)
            </summary>
            <div className="border-t border-stone-100 divide-y divide-stone-100">
              {payouts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-600">
                    <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="py-3 px-4">Tanggal Cair</th>
                        <th className="py-3 px-4">Metode &amp; Referensi</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4 text-right">Bukti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {payouts.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-4 whitespace-nowrap">{formatDate(item.expenseDate)}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-stone-900">{formatPaymentSource(item.paymentSource)}</span>
                            {item.referenceNumber && <span className="ml-2 text-[11px] font-mono text-stone-500">Ref: {item.referenceNumber}</span>}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {item.hasReceipt ? (
                              <a
                                href={`/api/partner/payouts/${item.id}/receipt`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                              >
                                Lihat Bukti
                              </a>
                            ) : (
                              <span className="text-[11px] text-stone-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </details>
        )}
      </main>

      {/* Modal Pembayaran Paket Klien oleh Mitra WO (QRIS / Snap / Transfer Manual) */}
      {activePayment && (
        <div className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#eadecf] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Pembayaran Harga Mitra ({discountRateLabel})
                </div>
                <h3 className="text-base font-serif font-bold text-stone-900">
                  {activePayment.clientName}
                </h3>
                <p className="text-[11px] font-mono text-stone-500">
                  {activePayment.invoiceNumber} &middot; {activePayment.planType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePayment(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                aria-label="Tutup modal pembayaran"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Ringkasan Tagihan */}
              <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#eadecf] space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Harga Paket (Setelah Potongan Mitra)</span>
                  <span className="font-mono font-semibold text-stone-800">{formatRupiah(activePayment.amount)}</span>
                </div>
                {activePayment.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Hemat Potongan Mitra</span>
                    <span className="font-mono font-bold">- {formatRupiah(activePayment.discountAmount)}</span>
                  </div>
                )}
                {activePayment.chargedAmount && activePayment.chargedAmount > activePayment.amount && (
                  <div className="flex justify-between text-stone-500">
                    <span>Biaya Layanan Gateway</span>
                    <span className="font-mono">{formatRupiah(activePayment.chargedAmount - activePayment.amount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
                  <span className="font-bold text-stone-900">Total Bayar Mitra</span>
                  <span className="text-lg font-extrabold font-mono text-amber-900">
                    {formatRupiah(activePayment.chargedAmount || activePayment.amount)}
                  </span>
                </div>
              </div>

              {paymentError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {paymentError}
                </div>
              )}

              {activePayment.status === "PAID" ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-emerald-900">Pembayaran Lunas!</div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Paket <strong>{activePayment.planType}</strong> sudah aktif untuk <strong>{activePayment.clientName}</strong>. Tautan aktivasi 48 jam telah dikirim ke email pengantin &amp; siap disalin ke WhatsApp di halaman utama portal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePayment(null)}
                    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Tutup &amp; Lihat Link Aktivasi Pengantin
                  </button>
                </div>
              ) : paymentInitLoading ? (
                <div className="py-8 flex flex-col items-center gap-2 text-xs text-stone-500">
                  <div className="w-7 h-7 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
                  <span>Menyiapkan metode pembayaran...</span>
                </div>
              ) : activePayment.paymentMethod === "MANUAL_TRANSFER" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Transfer Bank Resmi Platform
                    </div>
                    <div className="font-bold text-stone-900 text-sm">
                      {activePayment.bank?.bankName || platformConfig?.bank?.bankName || "Bank Resmi"}
                    </div>
                    <div className="font-mono text-base font-extrabold text-amber-950">
                      {activePayment.bank?.bankAccountNumber || platformConfig?.bank?.bankAccountNumber || "-"}
                    </div>
                    <div className="text-stone-600">
                      a.n. <strong>{activePayment.bank?.bankAccountHolder || platformConfig?.bank?.bankAccountHolder || "-"}</strong>
                    </div>
                  </div>

                  {activePayment.rejectReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      <strong>Bukti sebelumnya ditolak:</strong> {activePayment.rejectReason}
                    </div>
                  )}

                  {proofSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                      {proofSuccessMsg}
                    </div>
                  )}

                  {activePayment.hasProof && !proofSuccessMsg && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      Bukti transfer sudah diunggah &amp; sedang menunggu verifikasi Admin. Setelah disetujui, email aktivasi otomatis terkirim ke pengantin.
                    </div>
                  )}

                  <form onSubmit={handleUploadPartnerProof} className="space-y-3">
                    <label className="block text-xs font-bold text-stone-700">
                      {activePayment.hasProof ? "Unggah Ulang Bukti Transfer (JPG/PNG/PDF)" : "Unggah Bukti Transfer (JPG/PNG/PDF)"}
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      required
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={uploadingProof || !proofFile}
                      className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                    >
                      {uploadingProof ? "Mengunggah Bukti..." : "Kirim Bukti Transfer"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  {activePayment.qrString ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-white rounded-2xl border border-stone-200 inline-block shadow-xs">
                        <img
                          src={`/api/public/qr?size=280&data=${encodeURIComponent(activePayment.qrString)}`}
                          alt="QRIS Pembayaran Mitra"
                          className="w-56 h-56 object-contain mx-auto"
                        />
                      </div>
                      <p className="text-xs text-stone-600">
                        Scan QRIS di atas via m-Banking / e-Wallet. Status pembayaran diperbarui otomatis setiap 4 detik.
                      </p>
                    </div>
                  ) : activePayment.checkoutUrl ? (
                    <div className="space-y-3 py-2">
                      <p className="text-xs text-stone-600">
                        Selesaikan pembayaran melalui halaman pembayaran resmi Midtrans di tab baru. Status akan otomatis diperbarui di sini setelah lunas.
                      </p>
                      <a
                        href={activePayment.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition"
                      >
                        Buka Halaman Pembayaran Midtrans &rarr;
                      </a>
                    </div>
                  ) : (
                    <div className="py-4 text-xs text-stone-500">
                      Klik tombol di bawah untuk memuat ulang sesi pembayaran.
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-[11px] text-amber-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                    <span>Menunggu konfirmasi pembayaran otomatis...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
