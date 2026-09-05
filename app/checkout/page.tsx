"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function CheckoutContent() {
  const { data: session, status } = useSession();
  const sessionUserId = (session?.user as any)?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const orderIdParam = searchParams.get("order");
  const msgParam = searchParams.get("msg");
  const initializedRef = useRef<string | null>(null);

  const [planData, setPlanData] = useState<{ name: string; price: number; desc: string } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(orderIdParam || null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expiry State (Only applicable if gateway QRIS expired)
  const [isGatewayExpired, setIsGatewayExpired] = useState(false);

  // Native QRIS State
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrisSessionId, setQrisSessionId] = useState<string | null>(null);
  const [countdownStr, setCountdownStr] = useState<string>("");
  const [qrisExpiry, setQrisExpiry] = useState<number | null>(null);

  // Payment Mode & Bank Details
  const [paymentMode, setPaymentMode] = useState<"BOTH" | "GATEWAY" | "MANUAL">("BOTH");
  const [selectedMethod, setSelectedMethod] = useState<"GATEWAY" | "MANUAL">("GATEWAY");
  const [bankInfo, setBankInfo] = useState({
    name: "",
    accountNumber: "",
    accountHolder: "",
    instructions: "",
  });

  // Proof of Transfer Upload State
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [adminWa, setAdminWa] = useState<string>("");
  const [platformName, setPlatformName] = useState("");
  // PlanType state — menyimpan ID paket aktif (ex: "PREMIUM", "TRADITIONAL") untuk regenerasi order yang benar
  const [currentPlanType, setCurrentPlanType] = useState<string>(planParam || "");
  const [currentOrderType, setCurrentOrderType] = useState<string>("NEW_INVITATION");
  const [feePercent, setFeePercent] = useState<number>(0.7);
  const [feePayer, setFeePayer] = useState<"BUYER" | "MERCHANT">("BUYER");
  // Waktu offset untuk sinkronisasi timer klien dan server
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [reloadKey, setReloadKey] = useState<number>(0);
  // Durasi total QRIS saat pertama kali diterima (ms) — dari server, bukan hardcode
  const [qrisTotalDuration, setQrisTotalDuration] = useState<number>(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [statusModal, setStatusModal] = useState<{ show: boolean; title?: string; message: string; isError?: boolean }>({ show: false, message: "" });

  // Auto close status modal after 5 seconds
  useEffect(() => {
    if (statusModal.show) {
      const timer = setTimeout(() => {
        setStatusModal({ show: false, message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusModal.show]);

  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";

  // Redirect to login if not authenticated or register if no plan
  useEffect(() => {
    if (status === "unauthenticated") {
      const redirectTarget = orderIdParam
        ? `/checkout?order=${orderIdParam}`
        : planParam
        ? `/checkout?plan=${planParam}`
        : `/packages`;
      router.replace(`/login?callbackUrl=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    if (status === "authenticated" && !isAdmin && !planParam && !orderIdParam) {
      router.replace("/dashboard");
    }
  }, [status, planParam, orderIdParam, isAdmin, router]);


  // Handle Regenerate Order — deklarasi di atas initializeCheckout agar bisa dipanggil di dalamnya
  const handleRegenerateOrder = useCallback(async () => {
    setLoading(true);
    setIsGatewayExpired(false);
    setQrData(null);
    setQrisSessionId(null);
    setQrisExpiry(null);
    setError(null);
    setProofFile(null);
    setProofPreview(null);
    setUploadedProofUrl(null);
    setUploadSuccessMsg(null);
    // Gunakan currentPlanType (dari state) bukan planParam (dari URL) agar paket tidak salah
    const targetPlan = currentPlanType || planParam || "";
    if (!targetPlan) {
      router.replace("/packages");
      return;
    }
    router.replace(`/checkout?plan=${targetPlan}&msg=qris_expired`);
    setReloadKey(prev => prev + 1);
  }, [currentPlanType, planParam, router]);

  // Load / Create Order Flow
  const initializeCheckout = useCallback(async () => {
    if (status !== "authenticated" || !sessionUserId || isAdmin) return;
    if (!planParam && !orderIdParam) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch public platform settings
      const settingsRes = await fetch("/api/public/settings", { cache: "no-store" });
      const settings = await settingsRes.json();
      const packages: any[] = settings.packages || [];

      if (settings.platformName) {
        setPlatformName(settings.platformName);
      }

      if (settings.paymentMode) {
        const mode = settings.paymentMode === "BOTH" ? "GATEWAY" : settings.paymentMode;
        setPaymentMode(mode);
        setSelectedMethod(mode);
      }

      setBankInfo({
        name: settings.bankName || "",
        // Tidak ada fallback nomor rekening — jika kosong, UI akan tampilkan pesan belum dikonfigurasi
        accountNumber: settings.bankAccountNumber || "",
        accountHolder: settings.bankAccountHolder || "",
        instructions: settings.bankInstructions || "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin.",
      });
      if (typeof settings.paymentGatewayFeePercent === "number") {
        setFeePercent(settings.paymentGatewayFeePercent);
      }
      if (settings.paymentGatewayFeePayer) {
        setFeePayer(settings.paymentGatewayFeePayer);
      }
      if (settings.supportWhatsapp) {
        setAdminWa(settings.supportWhatsapp);
      }
      if (settings.retentionInvitationDays) {
        setRetentionDays(settings.retentionInvitationDays);
      }

      // 2. If orderId is provided, fetch existing order status directly
      if (orderIdParam) {
        const orderStatusRes = await fetch(`/api/client/orders/${orderIdParam}/status`, { cache: "no-store" });
        const orderStatusData = await orderStatusRes.json();

        if (orderStatusRes.ok && orderStatusData.id) {
          // SINGLE STATE GUARD: Jika klien sudah memiliki order PAID (klien aktif), jangan izinkan ke kasir
          if (orderStatusData.isUserPaid && orderStatusData.paidOrderId) {
            const planQuery = orderStatusData.paidPlanType ? `&plan=${orderStatusData.paidPlanType}` : "";
            router.replace(`/dashboard/setup?order=${orderStatusData.paidOrderId}${planQuery}`);
            return;
          }

          // Jika order ini sudah usang dan digantikan oleh invoice baru yang aktif, redirect otomatis
          if (orderStatusData.isSuperseded && orderStatusData.activeOrderId) {
            router.replace(`/checkout?order=${orderStatusData.activeOrderId}`);
            return;
          }

          if (orderStatusData.status === "PAID") {
            if (orderStatusData.orderType === "GALLERY_EXTENSION") {
              router.replace("/dashboard?msg=gallery_extended");
            } else {
              router.replace(`/dashboard/setup?order=${orderStatusData.id}&plan=${orderStatusData.planType}`);
            }
            return;
          }

          setOrderId(orderStatusData.id);
          setInvoiceNumber(orderStatusData.invoiceNumber);
          setCurrentOrderType(orderStatusData.orderType || "NEW_INVITATION");

          let currentOffset = 0;
          if (orderStatusData.serverTime) {
            currentOffset = orderStatusData.serverTime - Date.now();
            setServerTimeOffset(currentOffset);
          }

          if (orderStatusData.orderType === "GALLERY_EXTENSION") {
            setCurrentPlanType("EXTEND_GALLERY");
            setPlanData({
              name: "Perpanjang Galeri Tamu (+30 Hari)",
              price: Number(orderStatusData.amount),
              desc: "Perpanjangan penyimpanan foto momen para tamu di server selama +30 hari tambahan.",
            });
          } else {
            const currentPkg = packages.find((p) => p.id === orderStatusData.planType);
            setCurrentPlanType(orderStatusData.planType || "");
            setPlanData({
              name: currentPkg?.name || orderStatusData.planType || "Paket Undangan",
              price: Number(orderStatusData.amount),
              desc: currentPkg?.desc || "",
            });
          }

          if (orderStatusData.proofImageUrl && orderStatusData.status !== "FAILED" && orderStatusData.status !== "REJECTED") {
            setUploadedProofUrl(orderStatusData.proofImageUrl);
          } else if (orderStatusData.status === "FAILED" || orderStatusData.status === "REJECTED") {
            setUploadedProofUrl(null);
            if (orderStatusData.rejectReason) {
              setRejectReason(orderStatusData.rejectReason);
            }
          }

          if (orderStatusData.status === "EXPIRED") {
            handleRegenerateOrder();
            return;
          } else {
            setIsGatewayExpired(false);
            if (orderStatusData.snapToken) {
              try {
                const parsed = JSON.parse(orderStatusData.snapToken);
                const syncedNow = Date.now() + currentOffset;
                // Tambahkan Grace Period 2 Menit (120000 ms) sebelum benar-benar dihilangkan
                if (parsed.qrString && parsed.expiry > (syncedNow - 120000)) {
                  setQrData(parsed.qrString);
                  setQrisSessionId(parsed.sessionId);
                  setQrisExpiry(parsed.expiry);
                } else if (parsed.expiry <= (syncedNow - 120000)) {
                  handleRegenerateOrder();
                  return;
                }
              } catch {
                // Not JSON, ignore
              }
            }
          }

          setLoading(false);
          return;
        } else {
          setError(orderStatusData?.error || "Tagihan tidak ditemukan atau sudah tidak berlaku.");
          setLoading(false);
          return;
        }
      }

      // 3. If planParam is provided, create or resume active pending order
      const targetPlan = planParam || currentPlanType || "";
      if (!targetPlan) {
        router.replace("/packages");
        return;
      }

      // KONSISTENSI GUARD: Cek apakah user sudah punya paket aktif / undangan
      // Mencegah pembuatan order double saat refresh tab usang (?plan=MODERN)
      const onboardingRes = await fetch("/api/client/onboarding-state", { cache: "no-store" });
      if (onboardingRes.ok) {
        const onboardingData = await onboardingRes.json();
        if (onboardingData.step === "COMPLETED" || onboardingData.step === "PAID_NEED_SETUP") {
          router.replace(onboardingData.redirectUrl || "/dashboard");
          return;
        }
      }

      const currentPkg = packages.find((p) => p.id === targetPlan);
      const name = currentPkg?.name || targetPlan;
      // Harga HANYA dari AdminSetting (via /api/public/settings → packages).
      // Tidak ada fallback hardcode — jika settings belum dimuat, tampilkan 0
      // agar UI tidak menampilkan harga yang salah kepada user.
      const price = Number(currentPkg?.price ?? 0);
      const desc = currentPkg?.desc || "";

      setPlanData({ name, price, desc });

      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (session as any).user.id,
          planType: targetPlan,
          buyerName: session.user?.name || "",
          buyerEmail: session.user?.email || "",
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Gagal membuat pesanan");

      setOrderId(orderData.orderId);
      setInvoiceNumber(orderData.invoiceNumber);
      setIsGatewayExpired(false);
      
      if (orderData.proofImageUrl && orderData.status !== "FAILED" && orderData.status !== "REJECTED") {
        setUploadedProofUrl(orderData.proofImageUrl);
      } else if (orderData.rejectReason) {
        setRejectReason(orderData.rejectReason);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, sessionUserId, planParam, orderIdParam, router, isAdmin, reloadKey]);

  useEffect(() => {
    if (status === "authenticated" && sessionUserId && !isAdmin) {
      const initKey = `${sessionUserId}_${planParam || ""}_${orderIdParam || ""}_${reloadKey}`;
      if (initializedRef.current !== initKey) {
        initializedRef.current = initKey;
        initializeCheckout();
      }
    }
  }, [status, sessionUserId, isAdmin, planParam, orderIdParam, reloadKey, initializeCheckout]);

  // --- SSE PAYMENT STATUS (Menggantikan polling — server push via iPaymu webhook) ---
  useEffect(() => {
    if (!qrData || !orderId) return;

    // Countdown Timer — Sinkron dengan waktu server untuk mencegah drift
    const timerInterval = setInterval(() => {
      if (!qrisExpiry) return;
      const syncedNow = Date.now() + serverTimeOffset;
      const diff = qrisExpiry - syncedNow;
      
      // Jika waktu habis, langsung hilangkan QRIS dari UI untuk mencegah pembayaran ke QR kadaluwarsa
      if (diff <= 0) {
        clearInterval(timerInterval);
        handleRegenerateOrder();
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdownStr(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
      }
    }, 1000);

    // SSE — server push saat iPaymu webhook masuk dan update DB
    const eventSource = new EventSource(`/api/payments/status-stream/${orderId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "PAID") {
          eventSource.close();
          clearInterval(timerInterval);
          if (currentOrderType === "GALLERY_EXTENSION") {
            router.replace("/dashboard?msg=gallery_extended");
          } else {
            router.replace(`/dashboard/setup?order=${orderId}&plan=${data.planType}`);
          }
        } else if (data.status === "EXPIRED") {
          eventSource.close();
          clearInterval(timerInterval);
          setQrData(null);
          handleRegenerateOrder();
        }
      } catch {}
    };

    eventSource.onerror = () => {
      // Jika koneksi SSE putus (misalnya restart server), tutup saja — tidak perlu retry
      eventSource.close();
    };

    return () => {
      clearInterval(timerInterval);
      eventSource.close();
    };
  }, [qrData, orderId, qrisExpiry, router, serverTimeOffset, handleRegenerateOrder]);

  // Polling for Approval when Proof is Uploaded
  // Auto Polling for Manual Approval
  useEffect(() => {
    if (!orderId || (!uploadedProofUrl && !uploadSuccessMsg)) return;
    
    const manualPoll = setInterval(async () => {
      try {
        const res = await fetch(`/api/client/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.isSuperseded && data.activeOrderId) {
            clearInterval(manualPoll);
            router.replace(`/checkout?order=${data.activeOrderId}`);
            return;
          }

          if (data.status === "PAID") {
            clearInterval(manualPoll);
            if (currentOrderType === "GALLERY_EXTENSION" || data.orderType === "GALLERY_EXTENSION") {
              router.replace("/dashboard?msg=gallery_extended");
            } else {
              router.replace(`/dashboard/setup?order=${orderId}&plan=${data.planType}`);
            }
          } else if (data.status === "FAILED" || data.status === "REJECTED") {
            clearInterval(manualPoll);
            setUploadedProofUrl(null);
            setUploadSuccessMsg(null);
            setProofFile(null);
            setProofPreview(null);
            setRejectReason(data.rejectReason || "Bukti transfer tidak valid atau dana belum masuk.");
            setStatusModal({
              show: true,
              title: "Bukti Transfer Perlu Diperbaiki",
              message: `Alasan Admin: ${data.rejectReason || "Tidak valid"}.\nSilakan periksa dan unggah ulang bukti yang benar pada formulir yang tersedia.`,
              isError: true,
            });
          }
        }
      } catch {}
    }, 5000); // Check every 5s

    return () => clearInterval(manualPoll);
  }, [orderId, uploadedProofUrl, uploadSuccessMsg, router, currentOrderType]);

  // Manual Check Status Handler
  const handleCheckStatus = async () => {
    if (!orderId) return;
    setIsCheckingStatus(true);
    try {
      const res = await fetch(`/api/client/orders/${orderId}/status`, { cache: "no-store" });
      const data = await res.json();
      setIsCheckingStatus(false);
      
      if (data.status === "PAID") {
        if (currentOrderType === "GALLERY_EXTENSION") {
          router.replace("/dashboard?msg=gallery_extended");
        } else {
          router.replace(`/dashboard/setup?order=${orderId}&plan=${data.planType}`);
        }
      } else if (data.status === "FAILED" || data.status === "REJECTED") {
        setUploadedProofUrl(null);
        setUploadSuccessMsg(null);
        setProofFile(null);
        setProofPreview(null);
        setRejectReason(data.rejectReason || "Bukti transfer tidak valid atau dana belum masuk.");
        setStatusModal({
          show: true,
          title: "Bukti Transfer Perlu Diperbaiki",
          message: `Alasan Admin: ${data.rejectReason || "Tidak valid"}.\nSilakan periksa dan unggah ulang bukti yang benar pada formulir yang tersedia.`,
          isError: true
        });
      } else {
        setStatusModal({
          show: true,
          title: "Pembayaran Pending",
          message: "Status pembayaran masih pending. Silakan tunggu admin memverifikasi bukti transfer Anda atau kembali lagi nanti.",
          isError: false
        });
      }
    } catch {
      setIsCheckingStatus(false);
      setStatusModal({
        show: true,
        title: "Kesalahan Jaringan",
        message: "Gagal mengecek status pembayaran. Silakan coba lagi nanti.",
        isError: true
      });
    }
  };

  // Handle Pay via Gateway
  const handlePayGateway = async () => {
    if (!orderId || paying) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Tidak kirim `gateway` — biarkan server memilih gateway aktif dari AdminSetting
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai pembayaran");
      
      if (data.serverTime) {
        setServerTimeOffset(data.serverTime - Date.now());
      }
      
      if (data.qrString) {
        setQrData(data.qrString);
        setQrisSessionId(data.sessionId || null);
        // expiryTimestamp selalu tersedia dari server (bersumber dari gateway atau AdminSetting)
        // JANGAN gunakan Date.now() browser sebagai fallback — bisa tidak sinkron dengan gateway
        setQrisExpiry(data.expiryTimestamp);
        // Hitung durasi total dari server time — dipakai progress bar, bukan 15 menit hardcode
        if (data.expiryTimestamp && data.serverTime) {
          setQrisTotalDuration(data.expiryTimestamp - data.serverTime);
        }
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Respons gateway tidak valid: Tidak ada QR String");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  // Handle Upload Proof of Manual Transfer
  const handleUploadProof = async () => {
    if (!orderId || !proofFile) return;

    setUploadingProof(true);
    setError(null);
    setUploadSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", proofFile);

      const res = await fetch(`/api/client/orders/${orderId}/upload-proof`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah bukti transfer");

      setUploadedProofUrl(data.proofImageUrl);
      setUploadSuccessMsg("Bukti transfer berhasil dikirim! Tim Admin sedang memverifikasi pembayaran Anda.");
      setRejectReason(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingProof(false);
    }
  };



  // Copy helper
  const handleCopy = (text: string, type: "bank" | "amount") => {
    navigator.clipboard.writeText(text);
    if (type === "bank") {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  if (status === "authenticated" && isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white/5 border border-amber-500/30 rounded-3xl p-8 backdrop-blur-md space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Mode Administrator Aktif</h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              Anda sedang login dengan akun Administrator (<span className="text-amber-300 font-semibold">{session?.user?.email}</span>). Pembelian paket dan pembuatan invoice dinonaktifkan untuk akun admin.
            </p>
          </div>
          <div className="pt-2 space-y-3">
            <a
              href="/admin"
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-2xl text-xs transition block shadow-lg cursor-pointer"
            >
              Kembali ke Dashboard Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="text-xs text-stone-400 font-mono">Menyiapkan Sesi Pembayaran...</p>
        </div>
      </div>
    );
  }

  const subtotal = planData?.price || 0;
  // Biaya layanan HANYA diterapkan jika menggunakan Gateway (QRIS)
  const appFee = (feePayer === "BUYER" && paymentMode === "GATEWAY") ? Math.round(subtotal * (feePercent / 100)) : 0;
  const totalAmount = subtotal + appFee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col font-sans">
      <header className="px-6 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <BrandLogo size="sm" showName brandName={platformName || "Platform Undangan"} />
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg space-y-5">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Konfirmasi Pembelian
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm">
              Selesaikan pembayaran untuk mengaktifkan akun dan studio undangan Anda
            </p>
          </div>



          {error && (
            <div className="p-4 bg-rose-900/40 border border-rose-500/40 rounded-2xl text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Invoice Summary Card */}
          {planData && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 backdrop-blur-xs">
              {/* Buyer info */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="w-10 h-10 rounded-full ring-2 ring-amber-500/30 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-sm">
                    {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "M"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm truncate">{session?.user?.name || "Mempelai"}</p>
                  <p className="text-stone-400 text-xs truncate">{session?.user?.email}</p>
                </div>
              </div>

              {/* Plan detail */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-stone-900/30 px-4 py-3 rounded-xl border border-white/5">
                  <span className="text-stone-400 font-medium text-xs">Aktivasi Paket</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{planData.name}</span>
                    {!uploadedProofUrl && !qrData && (
                      <a href="/packages" className="text-[10px] bg-white/10 hover:bg-white/20 text-stone-300 px-2 py-0.5 rounded-full transition">Ubah</a>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Nomor Invoice</span>
                  <span className="text-amber-300 font-mono text-[11px] font-bold">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Masa Aktif Undangan</span>
                  <span className="text-emerald-400 font-semibold">Aktif hingga {retentionDays} Hari Setelah Acara</span>
                </div>
              </div>

              {/* Rincian Fee Gateway Dinamis (%) */}
              <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
                <div className="flex justify-between items-center text-stone-400">
                  <span>Subtotal Layanan</span>
                  <span className="text-stone-200 font-medium font-mono">Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between items-center text-stone-400">
                  <span>Biaya Layanan Aplikasi ({paymentMode === "GATEWAY" ? feePercent + "%" : "Manual"})</span>
                  <span className={`font-mono font-medium ${feePayer === "BUYER" && paymentMode === "GATEWAY" ? "text-amber-300" : "text-emerald-400"}`}>
                    {paymentMode === "MANUAL" 
                      ? "Rp 0 (Bebas Biaya)" 
                      : feePayer === "BUYER"
                        ? `Rp ${appFee.toLocaleString("id-ID")}`
                        : "Rp 0 (Disubsidi)"}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="text-stone-300 font-semibold text-xs">Total Pembayaran</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-amber-400 font-serif">
                    Rp {totalAmount.toLocaleString("id-ID")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(totalAmount.toString(), "amount")}
                    className="p-1 text-stone-400 hover:text-white transition cursor-pointer"
                    title="Salin Nominal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  {copiedAmount && <span className="text-[10px] text-emerald-400">Tersalin!</span>}
                </div>
              </div>
            </div>
          )}

          {/* Warning Message from Previous Session (if any) */}
          {msgParam === "qris_expired" && !qrData && (
            <div className="text-center px-4">
              <span className="text-rose-400 text-xs font-medium">QRIS sebelumnya sudah kedaluwarsa. Silakan bayar tagihan baru.</span>
            </div>
          )}
          {msgParam === "transfer_rejected" && !uploadedProofUrl && (
            <div className="text-center px-4">
              <span className="text-rose-400 text-xs font-medium">Bukti transfer sebelumnya ditolak. Silakan unggah bukti yang benar.</span>
            </div>
          )}

          

          {/* ── TAB 1: AUTOMATIC GATEWAY (QRIS / E-WALLET) ── */}
          {paymentMode === "GATEWAY" && (
            <div className="space-y-3">
              {qrData ? (
                <div className="bg-white/5 border border-amber-500/20 rounded-3xl p-6 space-y-5 backdrop-blur-xs text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-amber-500/20">
                    <div className="h-full bg-amber-500 rounded-r-full" style={{ width: `${qrisTotalDuration > 0 ? Math.max(0, Math.min(100, ((qrisExpiry ? qrisExpiry - (Date.now() + serverTimeOffset) : 0) / qrisTotalDuration) * 100)) : 0}%`, transition: 'width 1s linear' }}></div>
                  </div>
                  <div className="space-y-1 pt-2">
                    <h3 className="text-white font-bold text-sm">Scan QRIS untuk Membayar</h3>
                    <div className="text-amber-400 font-serif font-bold text-xl">
                      Rp {totalAmount.toLocaleString("id-ID")}
                    </div>
                    <p className="text-stone-400 text-xs">Sisa Waktu: <span className="text-amber-400 font-mono font-bold">{countdownStr}</span></p>
                  </div>
                  <div className="p-3 bg-white inline-block rounded-2xl mx-auto shadow-xl border-4 border-amber-500/20">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`} alt="QRIS Code" className="w-48 h-48 sm:w-56 sm:h-56 object-contain" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      <span>Menunggu Pembayaran Otomatis...</span>
                    </div>
                    <p className="text-[11px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                      Buka aplikasi m-Banking atau e-Wallet Anda (BCA, Mandiri, GoPay, OVO, Dana, dll) dan scan QRIS di atas. Layar otomatis berpindah jika sukses.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  id="btn-pay-now"
                  type="button"
                  onClick={handlePayGateway}
                  disabled={!orderId || paying}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm transition shadow-lg shadow-amber-900/40 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
                      <span>Membuat Kode QRIS...</span>
                    </>
                  ) : (
                    <span>Bayar via QRIS / E-Wallet</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* ── TAB 2: MANUAL BANK TRANSFER (NO EXPIRY, TRANSFER KAPAN SAJA) ── */}
          {paymentMode === "MANUAL" && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5 backdrop-blur-xs">
              {/* Bank Account Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black flex items-center justify-center flex-shrink-0">1</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">Transfer ke Rekening Berikut</span>
                </div>

                {!bankInfo.name || !bankInfo.accountNumber ? (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-center space-y-2">
                    <p className="text-amber-300 font-bold text-xs">Informasi Rekening Belum Dikonfigurasi</p>
                    <p className="text-stone-400 text-[11px] leading-relaxed">
                      Administrator belum melengkapi nama bank dan nomor rekening untuk transfer manual. Silakan hubungi admin melalui WhatsApp untuk konfirmasi pembayaran.
                    </p>
                    {adminWa && (
                      <a
                        href={`https://wa.me/${adminWa.replace(/^0/, "62")}?text=${encodeURIComponent(`Halo Admin, saya ingin membayar pesanan invoice ${invoiceNumber} via transfer manual, mohon info rekening pembayaran. Terima kasih.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition mt-1"
                      >
                        Hubungi Admin via WhatsApp
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 border border-amber-500/20 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400">Nama Bank:</span>
                      <span className="text-xs font-bold text-white">{bankInfo.name}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-xs text-stone-400">Nomor Rekening:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-300">{bankInfo.accountNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(bankInfo.accountNumber, "bank")}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>{copiedBank ? "Tersalin!" : "Salin"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-xs text-stone-400">Atas Nama:</span>
                      <span className="text-xs font-bold text-white">{bankInfo.accountHolder || "-"}</span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-stone-400 leading-relaxed">
                  {bankInfo.instructions}
                </p>
              </div>

              {/* Upload Proof Form */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black flex items-center justify-center flex-shrink-0">2</span>
                  <span className="text-xs font-bold text-white">Unggah Bukti Transfer / Struk Bank</span>
                </div>

                {uploadedProofUrl || uploadSuccessMsg ? (
                  <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl space-y-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Menunggu Verifikasi Admin</span>
                    </div>
                    <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                      Bukti transfer Anda telah diterima dan sedang menunggu konfirmasi admin. Anda dapat mengecek status persetujuan secara manual.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleCheckStatus}
                        disabled={isCheckingStatus}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-[11px] transition shadow-lg cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isCheckingStatus ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-stone-950" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Mengecek...</span>
                          </>
                        ) : (
                          <span>Cek Status Pembayaran ⟳</span>
                        )}
                      </button>
                      <a
                        href={`https://wa.me/${adminWa.replace(/^0/, "62")}?text=${encodeURIComponent(`Halo Admin, saya sudah melakukan pembayaran manual untuk Invoice: *${invoiceNumber}*. Mohon dicek dan dikonfirmasi ya. Terima kasih.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-4 py-2 bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl text-[11px] transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span>Konfirmasi via WA</span>
                      </a>
                    </div>
                    {uploadedProofUrl && (
                      <div className="mt-3">
                        <img src={uploadedProofUrl} alt="Bukti Transfer" className="max-h-36 rounded-xl mx-auto border border-emerald-500/30 object-cover" />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Persistent Warning Card: Bukti Pembayaran Ditolak Admin */}
                    {(rejectReason || (msgParam === "transfer_rejected" && !uploadedProofUrl)) && (
                      <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl space-y-2 text-left animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                          <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Bukti Pembayaran Perlu Diperbaiki</span>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 border border-rose-500/20">
                          <span className="text-[10px] text-stone-400 block mb-0.5 font-medium">Catatan / Alasan Admin:</span>
                          <p className="text-xs text-rose-200 font-medium italic">
                            &ldquo;{rejectReason || "Bukti transfer tidak valid atau dana belum masuk ke rekening."}&rdquo;
                          </p>
                        </div>
                        <p className="text-[11px] text-stone-400 leading-relaxed">
                          Silakan periksa kembali nominal dan rekening tujuan Anda, lalu unggah ulang struk/bukti transfer yang benar di bawah ini.
                        </p>
                      </div>
                    )}

                    <div className="relative border-2 border-dashed border-white/20 hover:border-amber-500/50 rounded-2xl p-4 text-center cursor-pointer transition bg-white/5">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const f = e.target.files[0];
                            setProofFile(f);
                            setProofPreview(URL.createObjectURL(f));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {proofPreview ? (
                        <div className="space-y-2">
                          <img src={proofPreview} alt="Preview" className="max-h-32 rounded-xl mx-auto object-cover" />
                          <span className="text-[11px] text-amber-300 font-medium block">Klik untuk ganti foto</span>
                        </div>
                      ) : (
                        <div className="space-y-1 py-3">
                          <svg className="w-8 h-8 text-stone-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <p className="text-xs text-stone-300 font-semibold">Pilih Foto Struk / Screenshot Transfer</p>
                          <p className="text-[10px] text-stone-500">Format JPG, PNG, WebP · Maks 10MB</p>
                        </div>
                      )}
                    </div>

                    {/* Helper text: tampil jika foto belum dipilih */}
                    {!proofFile && (
                      <p className="text-[11px] text-amber-400/80 text-center font-medium">
                        Pilih foto bukti transfer terlebih dahulu untuk mengaktifkan tombol kirim
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleUploadProof}
                      disabled={!proofFile || uploadingProof}
                      title={!proofFile ? "Pilih foto bukti transfer dahulu" : "Kirim bukti pembayaran"}
                      className={`w-full py-3.5 rounded-2xl font-bold text-xs transition shadow-lg flex items-center justify-center gap-2 ${
                        proofFile && !uploadingProof
                          ? "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-900/30 cursor-pointer"
                          : "bg-stone-700 text-stone-400 cursor-not-allowed opacity-60"
                      }`}
                    >
                      {uploadingProof ? (
                        <>
                          <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
                          <span>Mengirim Bukti Transfer...</span>
                        </>
                      ) : proofFile ? (
                        <span>Kirim Bukti Pembayaran</span>
                      ) : (
                        <span>Pilih Foto Dahulu</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Enkripsi 256-bit SSL</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-stone-700" />
            <span className="text-[11px] text-stone-500">{paymentMode === "GATEWAY" ? "Pembayaran Resmi QRIS" : "Transfer Bank Resmi"}</span>
          </div>

          <div className="text-center border-t border-white/5 pt-6">
            <p className="text-[10px] text-stone-500 mb-3 px-2 leading-relaxed max-w-md mx-auto">
              Dengan melanjutkan pembayaran, Anda menyetujui <Link href="/terms" className="text-stone-400 hover:text-amber-500 underline">Syarat & Ketentuan</Link> serta <Link href="/privacy" className="text-stone-400 hover:text-amber-500 underline">Kebijakan Privasi</Link> {platformName || "Platform Undangan"}, termasuk kebijakan <Link href="/refund" className="text-stone-400 hover:text-amber-500 underline font-medium">No Refund</Link> atas produk digital.
            </p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-stone-500 hover:text-stone-300 text-[11px] transition cursor-pointer"
            >
              Bukan akun Anda? <span className="underline">Ganti Akun / Keluar</span>
            </button>
          </div>
        </div>
      </div>
    
      {/* Custom Status Modal */}
      {statusModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl transform scale-100 animate-in fade-in zoom-in-95 duration-200">
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${statusModal.isError ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {statusModal.isError ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{statusModal.title}</h3>
            <p className="text-stone-300 text-sm whitespace-pre-line mb-6">{statusModal.message}</p>
            <button
              onClick={() => setStatusModal({ show: false, message: "" })}
              className="w-full py-2.5 bg-white hover:bg-stone-200 text-stone-900 font-bold rounded-xl text-sm transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent"></div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
