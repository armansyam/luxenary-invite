"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function CheckoutContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const orderIdParam = searchParams.get("order");

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
    name: "BCA (Bank Central Asia)",
    accountNumber: "8735098123",
    accountHolder: "PT Luxenary Karya Digital",
    instructions: "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin.",
  });

  // Proof of Transfer Upload State
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";

  // Redirect to login if not authenticated or register if no plan
  useEffect(() => {
    if (status === "unauthenticated") {
      const redirectTarget = orderIdParam
        ? `/checkout?order=${orderIdParam}`
        : `/checkout?plan=${planParam || "PREMIUM"}`;
      router.replace(`/login?callbackUrl=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    if (status === "authenticated" && !isAdmin && !planParam && !orderIdParam) {
      router.replace("/dashboard");
    }
  }, [status, planParam, orderIdParam, isAdmin, router]);

  // Load / Create Order Flow
  const initializeCheckout = useCallback(async () => {
    if (status !== "authenticated" || !(session as any)?.user?.id || isAdmin) return;
    if (!planParam && !orderIdParam) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch public platform settings
      const settingsRes = await fetch("/api/public/settings", { cache: "no-store" });
      const settings = await settingsRes.json();
      const packages: any[] = settings.packages || [];

      if (settings.paymentMode) {
        setPaymentMode(settings.paymentMode);
        // FIX #6: Auto-pilih metode sesuai konfigurasi admin — tidak boleh ada pilihan lain
        if (settings.paymentMode === "MANUAL") {
          setSelectedMethod("MANUAL");
        } else if (settings.paymentMode === "GATEWAY") {
          setSelectedMethod("GATEWAY");
        }
        // "BOTH" → biarkan user memilih, default tetap GATEWAY
      }

      setBankInfo({
        name: settings.bankName || "BCA (Bank Central Asia)",
        accountNumber: settings.bankAccountNumber || "8735098123",
        accountHolder: settings.bankAccountHolder || "PT Luxenary Karya Digital",
        instructions: settings.bankInstructions || "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin.",
      });

      // 2. If orderId is provided, fetch existing order status directly
      if (orderIdParam) {
        const orderStatusRes = await fetch(`/api/client/orders/${orderIdParam}/status`, { cache: "no-store" });
        const orderStatusData = await orderStatusRes.json();

        if (orderStatusRes.ok && orderStatusData.id) {
          if (orderStatusData.status === "PAID") {
            router.replace(`/dashboard/setup?order=${orderStatusData.id}&plan=${orderStatusData.planType}`);
            return;
          }

          setOrderId(orderStatusData.id);
          setInvoiceNumber(orderStatusData.invoiceNumber);

          const currentPkg = packages.find((p) => p.id === orderStatusData.planType) || packages[0];
          setPlanData({
            name: currentPkg?.name || orderStatusData.planType,
            price: Number(orderStatusData.amount),
            desc: currentPkg?.desc || "",
          });

          if (orderStatusData.proofImageUrl) {
            setUploadedProofUrl(orderStatusData.proofImageUrl);
          }

          if (orderStatusData.status === "EXPIRED") {
            setIsGatewayExpired(true);
          } else {
            setIsGatewayExpired(false);
            if (orderStatusData.snapToken) {
              try {
                const parsed = JSON.parse(orderStatusData.snapToken);
                // Tambahkan Grace Period 2 Menit (120000 ms)
                if (parsed.qrString && parsed.expiry > (Date.now() - 120000)) {
                  setQrData(parsed.qrString);
                  setQrisSessionId(parsed.sessionId);
                  setQrisExpiry(parsed.expiry);
                } else if (parsed.expiry <= (Date.now() - 120000)) {
                  setIsGatewayExpired(true);
                }
              } catch {
                // Not JSON, ignore
              }
            }
          }

          setLoading(false);
          return;
        }
      }

      // 3. If planParam is provided, create or resume active pending order
      const targetPlan = planParam || "PREMIUM";
      const currentPkg = packages.find((p) => p.id === targetPlan) || packages[0];
      const name = currentPkg?.name || (targetPlan === "PREMIUM" ? "Premium" : targetPlan === "MODERN" ? "Modern" : "Traditional");
      const price = Number(currentPkg?.price || (targetPlan === "PREMIUM" ? 120000 : targetPlan === "MODERN" ? 100000 : 50000));
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, session, planParam, orderIdParam, router]);

  useEffect(() => {
    initializeCheckout();
  }, [initializeCheckout]);

  // --- NATIVE QRIS POLLING & COUNTDOWN ---
  useEffect(() => {
    if (!qrData || !orderId) return;

    // Countdown Timer Loop
    const timerInterval = setInterval(() => {
      if (!qrisExpiry) return;
      const now = Date.now();
      const diff = qrisExpiry - now;
      
      // Grace period 2 menit (120000 ms) setelah expired
      if (diff <= -120000) {
        setCountdownStr("Menunggu Konfirmasi Server...");
        clearInterval(timerInterval);
        // Kita JANGAN set isGatewayExpired(true) di sini secara sepihak!
        // Biarkan pollInterval yang mengecek status EXPIRED dari server agar sinkron dengan iPaymu.
      } else if (diff <= 0) {
        setCountdownStr("00:00 (Verifikasi Akhir...)");
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdownStr(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);

    // Polling Order Status Loop (setiap 4 detik)
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/client/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "PAID") {
            clearInterval(pollInterval);
            clearInterval(timerInterval);
            router.replace(`/dashboard/setup?order=${orderId}&plan=${data.planType}`);
          } else if (data.status === "EXPIRED") {
            setIsGatewayExpired(true);
            setQrData(null);
            clearInterval(pollInterval);
            clearInterval(timerInterval);
          }
        }
      } catch {}
    }, 4000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
    };
  }, [qrData, orderId, qrisExpiry, router]);

  // Polling for Approval when Proof is Uploaded
  // Auto Polling for Manual Approval
  useEffect(() => {
    if (!orderId || (!uploadedProofUrl && !uploadSuccessMsg)) return;
    
    const manualPoll = setInterval(async () => {
      try {
        const res = await fetch(`/api/client/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "PAID") {
            clearInterval(manualPoll);
            router.replace(`/dashboard/setup?order=${orderId}&plan=${data.planType}`);
          }
        }
      } catch {}
    }, 5000); // Check every 5s

    return () => clearInterval(manualPoll);
  }, [orderId, uploadedProofUrl, uploadSuccessMsg, router]);

  // Manual Check Status Handler
  const handleCheckStatus = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/client/orders/${orderId}/status`, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "PAID") {
        router.replace(`/dashboard/setup?order=${orderId}&plan=${data.planType}`);
      } else {
        alert("Status pembayaran masih pending. Silakan tunggu admin memverifikasi bukti transfer Anda atau kembali lagi nanti.");
      }
    } catch {}
  };

  // Handle Pay via Gateway
  const handlePayGateway = async () => {
    if (!orderId) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, gateway: "ipaymu" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai pembayaran");
      
      if (data.qrString) {
        setQrData(data.qrString);
        setQrisSessionId(data.sessionId || null);
        // Set expiry sesuai dengan balikan server (dinamis mengikuti pengaturan admin)
        setQrisExpiry(data.expiryTimestamp || Date.now() + 15 * 60 * 1000);
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingProof(false);
    }
  };

  // Handle Regenerate Order
  const handleRegenerateOrder = async () => {
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
    const targetPlan = planParam || "PREMIUM";
    router.replace(`/checkout?plan=${targetPlan}`);
    setTimeout(() => {
      initializeCheckout();
    }, 100);
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
              Kembali ke Dashboard Admin →
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col font-sans">
      <header className="px-6 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <BrandLogo size="sm" showName />
        </a>
        <a href="/packages" className="text-stone-400 text-xs hover:text-white transition flex items-center gap-1">
          <span>&larr;</span>
          <span>Ubah Paket</span>
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

          {/* Gateway QRIS Expired Alert (Only on Gateway Tab if Gateway expired) */}
          {isGatewayExpired && selectedMethod === "GATEWAY" && (
            <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-200 text-xs space-y-2.5 shadow-lg">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Sesi QRIS Gateway Telah Berakhir</span>
              </div>
              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                Sesi QRIS di gateway pembayaran telah kedaluwarsa. Silakan klik tombol di bawah untuk membuat kode pembayaran baru.
              </p>
            </div>
          )}

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
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Paket Terpilih</span>
                  <span className="text-white font-bold">Luxenary {planData.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Nomor Invoice</span>
                  <span className="text-amber-300 font-mono text-[11px] font-bold">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Masa Aktif Undangan</span>
                  <span className="text-emerald-400 font-semibold">Aktif Seumur Hidup</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-stone-300 font-semibold text-xs">Total Tagihan</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-amber-400 font-serif">
                    Rp {planData.price.toLocaleString("id-ID")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(planData.price.toString(), "amount")}
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

          {/* Payment Method Switcher Tabs (LOCKED if pending manual OR active QRIS) */}
          {paymentMode === "BOTH" && !uploadedProofUrl && !uploadSuccessMsg && (!qrData || isGatewayExpired) && (
            <div className="flex items-center gap-2 p-1 bg-stone-900/90 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedMethod("GATEWAY")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMethod === "GATEWAY"
                    ? "bg-amber-500 text-stone-950 shadow-xs"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>QRIS / Otomatis</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod("MANUAL")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMethod === "MANUAL"
                    ? "bg-amber-500 text-stone-950 shadow-xs"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Transfer Bank Manual</span>
              </button>
            </div>
          )}

          {/* ── TAB 1: AUTOMATIC GATEWAY (QRIS / E-WALLET) ── */}
          {(paymentMode === "GATEWAY" || (paymentMode === "BOTH" && selectedMethod === "GATEWAY")) && (
            <div className="space-y-3">
              {isGatewayExpired ? (
                <button
                  type="button"
                  onClick={handleRegenerateOrder}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition shadow-lg shadow-amber-900/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Buat Tagihan / QRIS Baru</span>
                </button>
              ) : qrData ? (
                <div className="bg-white/5 border border-amber-500/20 rounded-3xl p-6 space-y-5 backdrop-blur-xs text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-amber-500/20">
                    <div className="h-full bg-amber-500 rounded-r-full" style={{ width: `${Math.max(0, Math.min(100, ((qrisExpiry ? qrisExpiry - Date.now() : 0) / (15 * 60 * 1000)) * 100))}%`, transition: 'width 1s linear' }}></div>
                  </div>
                  <div className="space-y-1 pt-2">
                    <h3 className="text-white font-bold text-sm">Scan QRIS untuk Membayar</h3>
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
                    <span>Bayar via QRIS / E-Wallet &rarr;</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* ── TAB 2: MANUAL BANK TRANSFER (NO EXPIRY, TRANSFER KAPAN SAJA) ── */}
          {(paymentMode === "MANUAL" || (paymentMode === "BOTH" && selectedMethod === "MANUAL")) && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5 backdrop-blur-xs">
              {/* Bank Account Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black flex items-center justify-center flex-shrink-0">1</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">Transfer ke Rekening Berikut</span>
                </div>

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
                    <span className="text-xs font-bold text-white">{bankInfo.accountHolder}</span>
                  </div>
                </div>

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
                    <button
                      type="button"
                      onClick={handleCheckStatus}
                      className="mt-2 mx-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-[11px] transition shadow-lg cursor-pointer"
                    >
                      Cek Status Pembayaran ⟳
                    </button>
                    {uploadedProofUrl && (
                      <div className="mt-3">
                        <img src={uploadedProofUrl} alt="Bukti Transfer" className="max-h-36 rounded-xl mx-auto border border-emerald-500/30 object-cover" />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
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
                        <span>Kirim Bukti Pembayaran &rarr;</span>
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
            <span className="text-[11px] text-stone-500">QRIS · Transfer Bank · E-Wallet</span>
            <div className="mt-8 text-center border-t border-white/5 pt-6">
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
      </div>
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
