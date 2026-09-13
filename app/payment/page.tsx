"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { compressImageToWebP } from "@/lib/clientImageCompressor";

function PaymentContent() {
  const { data: session, status } = useSession();
  const sessionUserId = (session?.user as any)?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

  // Order state
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // QRIS Gateway State
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrisExpiry, setQrisExpiry] = useState<number | null>(null);
  const [qrisTotalDuration, setQrisTotalDuration] = useState<number>(0);
  const [countdownStr, setCountdownStr] = useState<string>("");
  const [isGatewayExpired, setIsGatewayExpired] = useState(false);
  const [regeneratingQris, setRegeneratingQris] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [sseError, setSseError] = useState(false);

  // Manual Transfer State
  const [paymentMode, setPaymentMode] = useState<"GATEWAY" | "MANUAL">("GATEWAY");
  const [bankInfo, setBankInfo] = useState({
    name: "",
    accountNumber: "",
    accountHolder: "",
    instructions: "",
  });
  const [adminWa, setAdminWa] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<{ type: "error" | "info" | "success"; message: string } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  // Time Sync Offset
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [platformName, setPlatformName] = useState<string>("");

  // Routing helper
  const getPostPaymentRedirect = useCallback((type: string, id: string, plan: string) => {
    if (type === "GALLERY_EXTENSION") return "/dashboard?msg=gallery_extended";
    if (type === "CUSTOM_DOMAIN_ADDON") return "/dashboard/settings?msg=custom_domain_activated";
    if (type === "UPGRADE") return "/dashboard?msg=plan_upgraded";
    return `/dashboard/setup?order=${id}&plan=${plan}`;
  }, []);

  // Auto-dismiss payment notice
  useEffect(() => {
    if (!paymentNotice) return;
    const timer = setTimeout(() => setPaymentNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [paymentNotice]);

  // Fetch settings (bank info, fee, etc.)
  useEffect(() => {
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.platformName) {
          setPlatformName(data.platformName);
        }
        if (data.paymentMode) {
          setPaymentMode(data.paymentMode === "MANUAL" ? "MANUAL" : "GATEWAY");
        }
        setBankInfo({
          name: data.bankName || "",
          accountNumber: data.bankAccountNumber || "",
          accountHolder: data.bankAccountHolder || "",
          instructions: data.bankInstructions || "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer.",
        });
        setAdminWa(data.supportWhatsapp || "");
      })
      .catch(() => {});
  }, []);

  // Load Order Status & Guard Routing
  const loadOrder = useCallback(async () => {
    if (!orderId) {
      router.replace("/packages");
      return;
    }

    try {
      const res = await fetch(`/api/client/orders/${orderId}/status`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat detail tagihan.");

      if (data.serverTime) {
        setServerTimeOffset(data.serverTime - Date.now());
      }

      // 1. Jika order sudah PAID, langsung alihkan ke halaman setup
      if (data.status === "PAID") {
        const dest = getPostPaymentRedirect(data.orderType || "NEW", orderId, data.planType);
        router.replace(dest);
        return;
      }

      // 2. Jika order belum melewati konfirmasi checkout, kembalikan ke /checkout
      if (!data.checkoutConfirmedAt) {
        router.replace(`/checkout?order=${orderId}`);
        return;
      }

      setOrder(data);
      setUploadedProofUrl(data.proofImageUrl || null);

      // Parse Snap Token jika QRIS
      if (data.snapToken) {
        try {
          const parsed = JSON.parse(data.snapToken);
          if (parsed.qrString) {
            setQrData(parsed.qrString);
            setQrisExpiry(parsed.expiry);
            const duration = parsed.expiry - data.serverTime;
            if (duration > 0) setQrisTotalDuration(duration);
          }
        } catch {
          // Token format lama
        }
      }

      // Cek apakah sesi QRIS sudah berakhir
      if (data.isQrisSessionExpired) {
        setIsGatewayExpired(true);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  }, [orderId, router, getPostPaymentRedirect]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Inisialisasi QRIS jika belum ada snapToken
  const initQrisGateway = useCallback(async () => {
    if (!orderId || qrData || paymentMode !== "GATEWAY" || !order) return;
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (res.ok && data.qrString) {
        setQrData(data.qrString);
        setQrisExpiry(data.expiryTimestamp);
        if (data.serverTime) {
          setServerTimeOffset(data.serverTime - Date.now());
        }
        const duration = data.expiryTimestamp - (data.serverTime || Date.now());
        if (duration > 0) setQrisTotalDuration(duration);
      }
    } catch (e) {
      console.error("[Payment] Gagal inisialisasi QRIS:", e);
    }
  }, [orderId, qrData, paymentMode, order]);

  useEffect(() => {
    if (order && !qrData && paymentMode === "GATEWAY" && order.status === "PENDING") {
      initQrisGateway();
    }
  }, [order, qrData, paymentMode, initQrisGateway]);

  // Countdown timer untuk QRIS (menggunakan serverTimeOffset)
  useEffect(() => {
    if (!qrisExpiry) return;

    const interval = setInterval(() => {
      const now = Date.now() + serverTimeOffset;
      const diff = qrisExpiry - now;

      if (diff <= 0) {
        clearInterval(interval);
        setCountdownStr("00:00");
        setIsGatewayExpired(true);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdownStr(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrisExpiry, serverTimeOffset]);

  // Real-time SSE Listener untuk deteksi status PAID instan
  useEffect(() => {
    if (!orderId) return;

    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/payments/status-stream/${orderId}`);

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.status === "PAID") {
            const dest = getPostPaymentRedirect(payload.orderType || order?.orderType || "NEW", orderId, payload.planType || order?.planType);
            router.replace(dest);
          } else if (payload.status === "REJECTED") {
            setUploadedProofUrl(null);
            setUploadSuccessMsg(null);
            setProofFile(null);
            setProofPreview(null);
            loadOrder();
          } else if (payload.status === "EXPIRED") {
            loadOrder();
          }
        } catch {}
      };

      es.onerror = () => {
        setSseError(true);
        es?.close();
      };
    } catch {
      setSseError(true);
    }

    return () => {
      es?.close();
    };
  }, [orderId, router, getPostPaymentRedirect, order, loadOrder]);

  // Regenerasi QRIS jika sesi kedaluwarsa (tanpa membuat order baru)
  const handleRegenerateQris = async () => {
    if (!orderId) return;
    setRegeneratingQris(true);
    try {
      const res = await fetch("/api/payments/qris/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui sesi QRIS");

      setQrData(data.qrString);
      setQrisExpiry(data.expiryTimestamp);
      setIsGatewayExpired(false);
      if (data.serverTime) {
        setServerTimeOffset(data.serverTime - Date.now());
      }
      const duration = data.expiryTimestamp - data.serverTime;
      if (duration > 0) setQrisTotalDuration(duration);
    } catch (err: any) {
      setPaymentNotice({ type: "error", message: err.message || "Gagal memperbarui QRIS" });
    } finally {
      setRegeneratingQris(false);
    }
  };

  // Cek Status Pembayaran Manual
  const handleCheckStatus = async () => {
    if (!orderId) return;
    setIsCheckingStatus(true);
    try {
      const res = await fetch(`/api/client/orders/${orderId}/status`, { cache: "no-store" });
      const data = await res.json();
      setIsCheckingStatus(false);

      if (data.status === "PAID") {
        const dest = getPostPaymentRedirect(data.orderType || "NEW", orderId, data.planType);
        router.replace(dest);
      } else {
        setPaymentNotice({ type: "info", message: "Status pembayaran masih PENDING. Jika sudah transfer, silakan tunggu beberapa saat." });
      }
    } catch {
      setIsCheckingStatus(false);
      setPaymentNotice({ type: "error", message: "Gagal memeriksa status pembayaran." });
    }
  };

  // Upload Bukti Transfer Manual
  const handleUploadProof = async () => {
    if (!proofFile || !orderId) return;
    setUploadingProof(true);
    try {
      const compressedFile = await compressImageToWebP(proofFile, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });

      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch(`/api/client/orders/${orderId}/upload-proof`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah bukti transfer");

      setUploadedProofUrl(data.proofUrl || URL.createObjectURL(proofFile));
      setUploadSuccessMsg("Bukti transfer berhasil dikirim. Menunggu verifikasi admin.");
      setPaymentNotice({ type: "success", message: "Bukti transfer berhasil dikirim. Menunggu verifikasi admin." });
    } catch (err: any) {
      setPaymentNotice({ type: "error", message: err.message || "Gagal mengunggah bukti transfer" });
    } finally {
      setUploadingProof(false);
    }
  };

  // Batalkan Pesanan Klien
  const confirmCancelOrder = async () => {
    if (!orderId || cancellingOrder) return;
    setCancellingOrder(true);
    setShowCancelConfirm(false);
    try {
      const res = await fetch(`/api/client/orders/${orderId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal membatalkan pesanan.");
      }
      router.replace("/packages");
    } catch (err: any) {
      setPaymentNotice({ type: "error", message: err.message || "Gagal membatalkan pesanan." });
      setCancellingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400 text-xs font-mono">
        Memuat data pembayaran...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <p className="text-rose-400 text-sm font-semibold">{error || "Pesanan tidak ditemukan"}</p>
          <div className="flex flex-col gap-2">
            <Link href="/packages" className="inline-block px-4 py-2 bg-amber-500 text-stone-950 font-bold text-xs rounded-xl">
              Kembali ke Pilihan Paket
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-stone-500 hover:text-stone-300 text-xs py-1 transition cursor-pointer"
            >
              Ganti Akun / Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "EXPIRED") {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-white font-bold text-base">Pesanan Telah Dibatalkan / Kedaluwarsa</p>
            <p className="text-xs text-stone-400">Tagihan pesanan ini sudah tidak aktif. Silakan pilih paket untuk membuat pesanan baru.</p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/packages" className="inline-block px-4 py-2.5 bg-amber-500 text-stone-950 font-bold text-xs rounded-xl">
              Pilih Paket Baru
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-stone-500 hover:text-stone-300 text-xs py-1 transition cursor-pointer"
            >
              Ganti Akun / Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col justify-between selection:bg-amber-500/30">
      {/* ── HEADER ── */}
      <header className="border-b border-white/5 bg-stone-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo size="sm" showName brandName={platformName || "Platform Undangan"} />
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-stone-400 font-mono text-[11px]">{order.invoiceNumber}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[10px]">
              PEMBAYARAN
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-2.5 py-1 text-stone-400 hover:text-stone-200 hover:bg-white/5 rounded-lg text-xs transition cursor-pointer border border-transparent hover:border-white/10"
              title="Keluar / Ganti Akun"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Rincian Singkat Tagihan */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-stone-400 block">Paket Undangan</span>
              <span className="text-base font-bold text-white uppercase">{order.planType}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-stone-400 block">Total Tagihan</span>
              <span className="text-xl font-bold font-serif text-amber-400">
                Rp {Number(order.amount).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Rincian Diskon Promo jika pernah dikunci */}
          {order.promoCodeApplied && (
            <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-emerald-400">
              <span className="flex items-center gap-1.5 font-mono">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Kupon ({order.promoCodeApplied})
              </span>
              <span className="font-mono font-bold">
                − Rp {Number(order.discountAmount || 0).toLocaleString("id-ID")}
              </span>
            </div>
          )}
        </div>

        {/* ── METODE 1: GATEWAY (QRIS) ── */}
        {paymentMode === "GATEWAY" && (
          <div className="space-y-4">
            {isGatewayExpired ? (
              /* Banner Sesi QRIS Habis */
              <div className="bg-white/5 border border-amber-500/30 rounded-3xl p-6 text-center space-y-4 backdrop-blur-xs">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-bold text-base">Sesi QRIS Telah Berakhir</h3>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
                    Batas waktu pembayaran untuk kode QR sebelumnya telah habis. Klik tombol di bawah untuk membuat kode QR baru. Diskon Anda tetap terjaga.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateQris}
                  disabled={regeneratingQris}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-2xl shadow-lg transition cursor-pointer"
                >
                  {regeneratingQris ? "Membuat QRIS Baru..." : "Perbarui Kode QRIS"}
                </button>
              </div>
            ) : qrData ? (
              /* Tampilan QRIS Aktif */
              <div className="bg-white/5 border border-amber-500/20 rounded-3xl p-6 space-y-5 backdrop-blur-xs text-center relative overflow-hidden">
                {/* Progress Bar */}
                <div className="absolute top-0 inset-x-0 h-1 bg-amber-500/20">
                  <div
                    className="h-full bg-amber-500 rounded-r-full"
                    style={{
                      width: `${
                        qrisTotalDuration > 0
                          ? Math.max(
                              0,
                              Math.min(
                                100,
                                ((qrisExpiry ? qrisExpiry - (Date.now() + serverTimeOffset) : 0) /
                                  qrisTotalDuration) *
                                  100
                              )
                            )
                          : 0
                      }%`,
                      transition: "width 1s linear",
                    }}
                  />
                </div>

                <div className="space-y-1 pt-2">
                  <h3 className="text-white font-bold text-sm">Scan QRIS untuk Membayar</h3>
                  <div className="text-amber-400 font-serif font-bold text-2xl">
                    Rp {Number(order.amount).toLocaleString("id-ID")}
                  </div>
                  <p className="text-stone-400 text-xs">
                    Sisa Waktu: <span className="text-amber-400 font-mono font-bold">{countdownStr}</span>
                  </p>
                </div>

                <div className="p-3 bg-white inline-block rounded-2xl mx-auto shadow-xl border-4 border-amber-500/20">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`}
                    alt="Kode QRIS"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                  />
                </div>

                <div className="space-y-2">
                  {sseError ? (
                    <div className="px-4 py-3 bg-amber-950/60 border border-amber-500/40 rounded-2xl text-center space-y-2">
                      <p className="text-[11px] text-stone-400">
                        Koneksi realtime terputus. Jika sudah membayar, klik tombol di bawah untuk verifikasi status:
                      </p>
                      <button
                        type="button"
                        onClick={handleCheckStatus}
                        disabled={isCheckingStatus}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl"
                      >
                        {isCheckingStatus ? "Memeriksa..." : "Cek Status Pembayaran"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>Menunggu Pembayaran Otomatis...</span>
                      </div>
                      <p className="text-[11px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                        Buka aplikasi m-Banking atau e-Wallet (BCA, Mandiri, GoPay, OVO, Dana) dan scan QR di atas. Layar otomatis berpindah saat pembayaran sukses.
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center text-xs text-stone-400 font-mono">
                Menyiapkan sesi QRIS...
              </div>
            )}
          </div>
        )}

        {/* ── METODE 2: MANUAL TRANSFER ── */}
        {paymentMode === "MANUAL" && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5 backdrop-blur-xs">
            {/* Detail Rekening Bank */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black flex items-center justify-center">
                  1
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Transfer ke Rekening Resmi
                </span>
              </div>

              <div className="p-4 bg-white/5 border border-amber-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">Nama Bank:</span>
                  <span className="font-bold text-white">{bankInfo.name || "BCA"}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                  <span className="text-stone-400">Nomor Rekening:</span>
                  {bankInfo.accountNumber ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-amber-300">
                        {bankInfo.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(bankInfo.accountNumber);
                          setCopiedBank(true);
                          setTimeout(() => setCopiedBank(false), 2000);
                        }}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        {copiedBank ? "Tersalin!" : "Salin"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-amber-400/90 text-xs italic font-medium">Hubungi Admin untuk Rekening</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                  <span className="text-stone-400">Atas Nama:</span>
                  <span className="font-bold text-white">{bankInfo.accountHolder || "-"}</span>
                </div>
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed">
                {bankInfo.instructions}
              </p>
            </div>

            {/* Unggah Bukti Transfer */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-bold text-white">Unggah Bukti Transfer</span>
              </div>

              {/* Tampilan Jika Pernah Ditolak Admin */}
              {order.rejectReason && !uploadedProofUrl && (
                <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl space-y-2 text-left">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Bukti Transfer Perlu Diperbaiki</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 border border-rose-500/20 text-xs text-rose-200 italic">
                    &ldquo;{order.rejectReason}&rdquo;
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Silakan unggah struk atau bukti transfer yang valid dan jelas di bawah ini.
                  </p>
                </div>
              )}

              {uploadedProofUrl || uploadSuccessMsg ? (
                <div className="p-4 border rounded-2xl space-y-3 text-center bg-emerald-950/30 border-emerald-500/40">
                  <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Menunggu Verifikasi Admin</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                    Bukti transfer Anda telah diterima dan sedang diperiksa oleh admin.
                  </p>
                  <button
                    type="button"
                    onClick={handleCheckStatus}
                    disabled={isCheckingStatus}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs"
                  >
                    {isCheckingStatus ? "Memeriksa..." : "Cek Status Pembayaran ⟳"}
                  </button>
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
                        <img src={proofPreview} alt="Preview" className="max-h-36 rounded-xl mx-auto object-cover" />
                        <span className="text-[11px] text-amber-300 font-medium block">Klik untuk ganti foto</span>
                      </div>
                    ) : (
                      <div className="space-y-1 py-3">
                        <svg className="w-8 h-8 text-stone-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <p className="text-xs text-stone-300 font-semibold">Pilih Foto Struk Transfer</p>
                        <p className="text-[10px] text-stone-500">Format JPG, PNG, WebP · Maks 10MB</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleUploadProof}
                    disabled={!proofFile || uploadingProof}
                    className="w-full py-3.5 rounded-2xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-stone-950 disabled:opacity-60 transition shadow-lg cursor-pointer"
                  >
                    {uploadingProof ? "Mengirim Bukti Transfer..." : "Kirim Bukti Pembayaran"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Navigasi Rincian / Batalkan / Ganti Akun */}
        <div className="pt-2 space-y-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <Link
              href={`/checkout?order=${orderId}&edit=true`}
              className="text-amber-400/90 hover:text-amber-300 font-medium transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Ubah Rincian &amp; Kupon Promo</span>
            </Link>

            <span className="text-stone-700">•</span>

            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              disabled={cancellingOrder}
              className="text-stone-500 hover:text-rose-400 transition cursor-pointer disabled:opacity-50"
            >
              {cancellingOrder ? "Membatalkan pesanan..." : "Batalkan Pesanan Ini"}
            </button>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-stone-500 hover:text-stone-300 text-[11px] transition cursor-pointer"
            >
              Bukan akun Anda? <span className="underline">Ganti Akun / Keluar</span>
            </button>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-4 text-center text-stone-600 text-[11px]">
        &copy; {new Date().getFullYear()} {platformName || "Platform Undangan"}. Pembayaran Resmi &amp; Terverifikasi.
      </footer>

      {/* ── MODAL KONFIRMASI BATALKAN PESANAN ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-stone-100 font-serif">Batalkan Pesanan?</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Pesanan ini akan dibatalkan secara permanen dan Anda akan dialihkan kembali ke halaman pemilihan paket.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs font-medium transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={confirmCancelOrder}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer shadow-lg shadow-rose-900/30"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING TOAST NOTIFICATION ── */}
      {paymentNotice && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className={`p-4 rounded-2xl border shadow-xl flex items-start justify-between gap-3 text-xs ${
            paymentNotice.type === "error" 
              ? "bg-rose-950/95 border-rose-800/80 text-rose-200"
              : paymentNotice.type === "info"
              ? "bg-amber-950/95 border-amber-800/80 text-amber-200"
              : "bg-emerald-950/95 border-emerald-800/80 text-emerald-200"
          }`}>
            <span className="leading-relaxed">{paymentNotice.message}</span>
            <button
              type="button"
              onClick={() => setPaymentNotice(null)}
              className="text-white/60 hover:text-white text-base leading-none font-bold cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400 text-xs font-mono">
          Memuat halaman pembayaran...
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
