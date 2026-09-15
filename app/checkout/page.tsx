"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function formatWhatsAppNumber(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";

  // Format jika diawali 62
  if (digits.startsWith("62")) {
    const rest = digits.slice(2);
    if (rest.length <= 3) return `62 ${rest}`;
    if (rest.length <= 7) return `62 ${rest.slice(0, 3)}-${rest.slice(3)}`;
    if (rest.length <= 11) return `62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
    return `62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7, 11)}-${rest.slice(11)}`;
  }

  // Format jika diawali 0
  if (digits.startsWith("0")) {
    if (digits.length <= 4) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    if (digits.length <= 12) return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
}

function CheckoutContent() {
  const { data: session, status } = useSession();
  const sessionUserId = (session?.user as any)?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const orderIdParam = searchParams.get("order");
  const msgParam = searchParams.get("msg");
  const editParam = searchParams.get("edit");
  const initializedRef = useRef<string | null>(null);

  const [planData, setPlanData] = useState<{ name: string; price: number; desc: string } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(orderIdParam || null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expiry State (Hanya jika order expired)
  const [isGatewayExpired, setIsGatewayExpired] = useState(false);

  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<"GATEWAY" | "MANUAL">("GATEWAY");

  // Promo Code & Marketing States
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
    validUntil?: number | null;
  } | null>(null);
  const [promoCountdownStr, setPromoCountdownStr] = useState<string>("");
  const [confirmingOrder, setConfirmingOrder] = useState(false);

  const [copiedAmount, setCopiedAmount] = useState(false);
  const [platformName, setPlatformName] = useState("");
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  // PlanType state — menyimpan ID paket aktif (ex: "PREMIUM", "TRADITIONAL") untuk regenerasi order yang benar
  const [currentPlanType, setCurrentPlanType] = useState<string>(planParam || "");
  const [currentOrderType, setCurrentOrderType] = useState<string>("NEW_INVITATION");
  const [feePercent, setFeePercent] = useState<number>(0.7);
  const [feePayer, setFeePayer] = useState<"BUYER" | "MERCHANT">("BUYER");
  // Waktu offset untuk sinkronisasi timer klien dan server
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [requestedDomain, setRequestedDomain] = useState<string | null>(null);

  // Buyer Contact Profile States
  const [buyerName, setBuyerName] = useState<string>("");
  const [buyerEmail, setBuyerEmail] = useState<string>("");
  const [buyerPhone, setBuyerPhone] = useState<string>("");

  // Helper routing setelah pembayaran lunas (PAID) untuk 3 kondisi sistem
  const getPostPaymentRedirect = useCallback((type: string, id: string, plan: string) => {
    if (type === "GALLERY_EXTENSION") {
      return "/dashboard?msg=gallery_extended";
    }
    if (type === "CUSTOM_DOMAIN_ADDON") {
      return "/dashboard/settings?msg=custom_domain_activated";
    }
    if (type === "UPGRADE") {
      return "/dashboard?msg=plan_upgraded";
    }
    return `/dashboard/setup?order=${id}&plan=${plan}`;
  }, []);


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
    setError(null);

    // Untuk pesanan add-on atau upgrade, jangan buat order paket baru
    if (currentOrderType === "GALLERY_EXTENSION" || currentOrderType === "CUSTOM_DOMAIN_ADDON" || currentOrderType === "UPGRADE") {
      const returnUrl = currentOrderType === "CUSTOM_DOMAIN_ADDON" ? "/dashboard/settings?msg=order_expired" : "/dashboard?msg=order_expired";
      router.replace(returnUrl);
      return;
    }

    // Gunakan currentPlanType (dari state) bukan planParam (dari URL) agar paket tidak salah
    const targetPlan = currentPlanType || planParam || "";
    if (!targetPlan) {
      router.replace("/packages");
      return;
    }
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: targetPlan,
          regenerate: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.orderId) {
        setOrderId(data.orderId);
        setInvoiceNumber(data.invoiceNumber);
        if (data.serverTime) {
          setServerTimeOffset(data.serverTime - Date.now());
        }
        router.replace(`/checkout?order=${data.orderId}&msg=qris_expired`);
      } else {
        router.replace(`/checkout?plan=${targetPlan}&msg=qris_expired`);
      }
    } catch {}
    setReloadKey(prev => prev + 1);
  }, [currentOrderType, currentPlanType, planParam, router]);

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

      if (settings.serviceStatus) {
        setServiceStatus(settings.serviceStatus);
      }

      if (typeof settings.promoEnabled === "boolean") {
        setPromoEnabled(settings.promoEnabled);
      }

      if (settings.paymentMode) {
        const mode = (settings.paymentMode === "BOTH" ? "GATEWAY" : settings.paymentMode) as "GATEWAY" | "MANUAL";
        setPaymentMode(mode);
      }

      if (typeof settings.paymentGatewayFeePercent === "number") {
        setFeePercent(settings.paymentGatewayFeePercent);
      }
      if (settings.paymentGatewayFeePayer) {
        setFeePayer(settings.paymentGatewayFeePayer);
      }
      if (settings.retentionInvitationDays) {
        setRetentionDays(settings.retentionInvitationDays);
      }

      // 2. If orderId is provided, fetch existing order status directly
      if (orderIdParam) {
        const orderStatusRes = await fetch(`/api/client/orders/${orderIdParam}/status`, { cache: "no-store" });
        const orderStatusData = await orderStatusRes.json();

        if (orderStatusRes.ok && orderStatusData.id) {
          // SINGLE STATE GUARD: Hanya berlaku untuk pendaftaran paket baru (NEW)
          // Add-on (GALLERY_EXTENSION, CUSTOM_DOMAIN_ADDON) dan UPGRADE tidak boleh memicu pengalihan
          const isAddonOrder =
            orderStatusData.orderType === "GALLERY_EXTENSION" ||
            orderStatusData.orderType === "CUSTOM_DOMAIN_ADDON" ||
            orderStatusData.orderType === "UPGRADE";

          if (!isAddonOrder && orderStatusData.isUserPaid && orderStatusData.paidOrderId) {
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
            router.replace(getPostPaymentRedirect(orderStatusData.orderType, orderStatusData.id, orderStatusData.planType));
            return;
          }

          // Jika pesanan sudah pernah dikonfirmasi dan tidak sedang dalam mode edit rincian (?edit=true), langsung bawa ke halaman pembayaran /payment
          if (orderStatusData.checkoutConfirmedAt && orderStatusData.status === "PENDING" && editParam !== "true") {
            router.replace(`/payment?order=${orderStatusData.id}`);
            return;
          }

          if (orderStatusData.promoCodeApplied && orderStatusData.discountAmount) {
            setAppliedPromo({
              code: orderStatusData.promoCodeApplied,
              discountAmount: Number(orderStatusData.discountAmount),
              discountType: "NOMINAL",
              discountValue: Number(orderStatusData.discountAmount),
            });
          }

          setError(null);
          setOrderId(orderStatusData.id);
          setInvoiceNumber(orderStatusData.invoiceNumber);
          setCurrentOrderType(orderStatusData.orderType || "NEW_INVITATION");
          if (orderStatusData.requestedDomain) {
            setRequestedDomain(orderStatusData.requestedDomain);
          }
          if (orderStatusData.buyerName) {
            setBuyerName(orderStatusData.buyerName);
          }
          if (orderStatusData.buyerEmail) {
            setBuyerEmail(orderStatusData.buyerEmail);
          }
          if (orderStatusData.buyerPhone && (orderStatusData.status === "PAID" || orderStatusData.snapToken || orderStatusData.proofImageUrl)) {
            setBuyerPhone(formatWhatsAppNumber(orderStatusData.buyerPhone));
          }

          let currentOffset = 0;
          if (orderStatusData.serverTime) {
            currentOffset = orderStatusData.serverTime - Date.now();
            setServerTimeOffset(currentOffset);
          }

          let parsedItems: any[] = [];
          if (orderStatusData.itemsJson) {
            try {
              parsedItems = JSON.parse(orderStatusData.itemsJson);
            } catch {}
          }

          if (Array.isArray(parsedItems) && parsedItems.length > 0) {
            const itemLabels = parsedItems.map((it: any) => it.label).join(" • ");
            setCurrentPlanType(orderStatusData.planType || "BUNDLE");
            setPlanData({
              name: parsedItems.length === 1 ? parsedItems[0].label : "Paket Layanan Terpadu (Bundle)",
              price: Number(orderStatusData.amount),
              desc: itemLabels,
            });
          } else if (orderStatusData.orderType === "GALLERY_EXTENSION") {
            setCurrentPlanType("EXTEND_GALLERY");
            setPlanData({
              name: "Perpanjang Galeri Tamu (+30 Hari)",
              price: Number(orderStatusData.amount),
              desc: "Perpanjangan penyimpanan foto momen para tamu di server selama +30 hari tambahan.",
            });
          } else if (orderStatusData.orderType === "CUSTOM_DOMAIN_ADDON") {
            setCurrentPlanType("CUSTOM_DOMAIN_ADDON");
            setPlanData({
              name: "Jasa Integrasi Custom Domain (1 Tahun)",
              price: Number(orderStatusData.amount),
              desc: `Aktivasi domain ${orderStatusData.requestedDomain || "kustom"} lengkap dengan SSL/TLS & Cloudflare DNS selama 1 tahun.`,
            });
          } else if (orderStatusData.orderType === "UPGRADE") {
            setCurrentPlanType(orderStatusData.planType || "");
            setPlanData({
              name: `Upgrade Paket ${orderStatusData.planType || ""}`,
              price: Number(orderStatusData.amount),
              desc: `Peningkatan fitur undangan digital ke tier ${orderStatusData.planType || ""}.`,
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

          // ORDER-LEVEL PAYMENT METHOD LOCK:
          if (orderStatusData.paymentMethod === "MANUAL_TRANSFER" || Boolean(orderStatusData.proofImageUrl)) {
            setPaymentMode("MANUAL");
          } else if (orderStatusData.paymentMethod === "GATEWAY") {
            setPaymentMode("GATEWAY");
          }

          if (orderStatusData.status === "EXPIRED") {
            setIsGatewayExpired(true);
          } else {
            setIsGatewayExpired(false);
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
          buyerName: buyerName || session.user?.name || "",
          buyerEmail: buyerEmail || session.user?.email || "",
          buyerPhone: buyerPhone.replace(/\D/g, ""),
          regenerate: msgParam === "qris_expired",
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Gagal membuat pesanan");

      setOrderId(orderData.orderId);
      setInvoiceNumber(orderData.invoiceNumber);
      if (typeof window !== "undefined" && orderData.orderId) {
        window.history.replaceState(null, "", `/checkout?order=${orderData.orderId}`);
      }
      if (orderData.serverTime) {
        setServerTimeOffset(orderData.serverTime - Date.now());
      }
      setIsGatewayExpired(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionUserId, planParam, orderIdParam, router, isAdmin, reloadKey]); // buyerEmail/buyerName/etc intentionally excluded — read-once at init

  useEffect(() => {
    if (status === "authenticated" && sessionUserId && !isAdmin) {
      const initKey = `${sessionUserId}_${planParam || ""}_${orderIdParam || ""}_${reloadKey}`;
      if (initializedRef.current !== initKey) {
        initializedRef.current = initKey;
        initializeCheckout();
      }
    }
  }, [status, sessionUserId, isAdmin, planParam, orderIdParam, reloadKey, initializeCheckout]);

  // Countdown Timer untuk Masa Berlaku Kupon Promo (Sinkron dengan Server Time Offset)
  useEffect(() => {
    if (!appliedPromo?.validUntil) {
      setPromoCountdownStr("");
      return;
    }

    const interval = setInterval(() => {
      const nowSynced = Date.now() + serverTimeOffset;
      const remainingMs = appliedPromo.validUntil! - nowSynced;

      if (remainingMs <= 0) {
        setPromoCountdownStr("Kedaluwarsa");
        setAppliedPromo(null);
        setPromoError("Masa berlaku kode promo telah berakhir.");
        clearInterval(interval);
        return;
      }

      // Tampilkan countdown live jika sisa waktu <= 60 menit
      if (remainingMs <= 3600000) {
        const totalSec = Math.floor(remainingMs / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        setPromoCountdownStr(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
      } else {
        const d = new Date(appliedPromo.validUntil!);
        setPromoCountdownStr(`Berlaku s/d ${d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [appliedPromo, serverTimeOffset]);

  // Validasi & Terapkan Kode Promo / Referral (Titik 1)
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim() || !orderId) return;
    setPromoValidating(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/public/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          orderId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoError(data.error || "Kode promo tidak valid atau kuota telah habis.");
        return;
      }
      setAppliedPromo({
        code: data.code,
        discountAmount: data.discountAmount,
        discountType: data.discountType,
        discountValue: data.discountValue,
        validUntil: data.validUntil,
      });
      setPromoCodeInput("");
      setPromoOpen(false);
    } catch (err: any) {
      setPromoError(err.message || "Gagal menerapkan kode promo");
    } finally {
      setPromoValidating(false);
    }
  };

  // Lepaskan Kode Promo / Referral
  const handleRemovePromo = async () => {
    if (!orderId) return;
    try {
      await fetch(`/api/public/promo/validate?orderId=${orderId}`, {
        method: "DELETE",
      });
    } catch {}
    setAppliedPromo(null);
    setPromoCountdownStr("");
    setPromoError(null);
  };

  // Konfirmasi Pesanan & Lanjut ke Halaman Pembayaran (Titik 2)
  const handleConfirmAndProceed = async () => {
    if (!orderId) return;
    setConfirmingOrder(true);
    setError(null);
    try {
      const cleanPhone = buyerPhone.replace(/\D/g, "");
      const res = await fetch("/api/payments/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          buyerName: buyerName || session?.user?.name,
          buyerPhone: cleanPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengonfirmasi pesanan.");
      }
      // Arahkan ke halaman pembayaran mandiri /payment
      router.push(data.redirectUrl || `/payment?order=${orderId}`);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat konfirmasi pesanan.");
      setConfirmingOrder(false);
    }
  };

  // Handle Cancel Order (Bawa kembali user ke pilihan paket)
  const handleCancelOrder = async () => {
    if (!orderId || cancellingOrder) return;
    setCancellingOrder(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/orders/${orderId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membatalkan tagihan.");
      }

      if (currentOrderType === "GALLERY_EXTENSION") {
        router.replace("/dashboard?msg=extension_cancelled");
        return;
      }
      if (currentOrderType === "CUSTOM_DOMAIN_ADDON") {
        router.replace("/dashboard/settings?msg=domain_addon_cancelled");
        return;
      }
      if (currentOrderType === "UPGRADE") {
        router.replace("/dashboard?msg=upgrade_cancelled");
        return;
      }

      router.replace("/packages");
    } catch (err: any) {
      setError(err.message || "Gagal membatalkan tagihan.");
    } finally {
      setCancellingOrder(false);
    }
  };



  // Copy helper
  const handleCopy = (text: string, type: "amount") => {
    navigator.clipboard.writeText(text);
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
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
  const discountAmount = appliedPromo?.discountAmount || 0;
  const netSubtotal = Math.max(0, subtotal - discountAmount);
  // Biaya layanan HANYA diterapkan jika menggunakan Gateway (QRIS)
  const appFee = (feePayer === "BUYER" && paymentMode === "GATEWAY") ? Math.round(netSubtotal * (feePercent / 100)) : 0;
  const totalAmount = netSubtotal + appFee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col font-sans">
      <header className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <BrandLogo size="sm" showName brandName={platformName || "Platform Undangan"} />
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-3.5 sm:px-4 py-6 sm:py-12">
        <div className="w-full max-w-lg space-y-4 sm:space-y-5">
          <div className="text-center space-y-1.5 px-2">
            <h1 className="text-xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Konfirmasi Pembelian
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm">
              Selesaikan pembayaran untuk mengaktifkan akun dan studio undangan Anda
            </p>
          </div>



          {isGatewayExpired && (
            <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-amber-200 text-xs">
              <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-300">Waktu Pembayaran Kedaluwarsa</p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">Batas waktu pembayaran telah habis. Silakan tekan tombol Bayar di bawah untuk memperbarui tagihan.</p>
              </div>
            </div>
          )}

          {serviceStatus && !serviceStatus.isOpen && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 backdrop-blur-xs ${
              serviceStatus.mode === "CLOSED_ORDER"
                ? "bg-amber-950/60 border-amber-500/40 text-amber-200"
                : serviceStatus.mode === "MAINTENANCE"
                ? "bg-rose-950/60 border-rose-500/40 text-rose-200"
                : "bg-white/10 border-white/20 text-stone-200"
            }`}>
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-amber-300">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  serviceStatus.mode === "CLOSED_ORDER" ? "bg-amber-400" :
                  serviceStatus.mode === "MAINTENANCE" ? "bg-rose-400" : "bg-stone-300"
                }`} />
                <span>{serviceStatus.title}</span>
              </div>
              <p className="text-stone-300 leading-relaxed text-xs">
                {serviceStatus.message}
              </p>
              {serviceStatus.reopenDate && (
                <p className="text-[11px] text-amber-300/80 font-medium">
                  Estimasi dibuka kembali: <span className="underline">{serviceStatus.reopenDate}</span>
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-900/40 border border-rose-500/40 rounded-2xl text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Invoice Summary Card */}
          {planData && (
            <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 backdrop-blur-xs">
              {/* Buyer info & Contact Details */}
              <div className="pb-4 border-b border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="" className="w-10 h-10 rounded-full ring-2 ring-amber-500/30 object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-sm">
                      {buyerName ? buyerName.charAt(0).toUpperCase() : session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "M"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{buyerName || session?.user?.name || "Mempelai"}</p>
                    <p className="text-stone-400 text-xs truncate">{buyerEmail || session?.user?.email}</p>
                  </div>
                </div>

                {/* Input Kontak WhatsApp */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <label htmlFor="buyerPhone" className="text-[11px] font-medium text-stone-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Nomor WhatsApp Aktif</span>
                  </label>
                  <input
                    id="buyerPhone"
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(formatWhatsAppNumber(e.target.value))}
                    placeholder="Contoh: 0812-3456-7890"
                    maxLength={19}
                    className="w-full px-3.5 py-3 rounded-xl bg-stone-900/60 border border-white/10 text-white placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition font-mono min-h-[44px]"
                  />
                </div>
              </div>

              {/* Plan detail */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-stone-900/30 px-4 py-3 rounded-xl border border-white/5">
                  <span className="text-stone-400 font-medium text-xs">
                    {currentOrderType === "GALLERY_EXTENSION"
                      ? "Item Perpanjangan"
                      : currentOrderType === "CUSTOM_DOMAIN_ADDON"
                      ? "Add-on Kustom"
                      : currentOrderType === "UPGRADE"
                      ? "Upgrade Layanan"
                      : "Aktivasi Paket"}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{planData.name}</span>
                    {(!currentOrderType || currentOrderType === "NEW" || currentOrderType === "NEW_INVITATION") && (
                      <Link href="/packages" className="text-[10px] bg-white/10 hover:bg-white/20 text-stone-300 px-2 py-0.5 rounded-full transition">Ubah</Link>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Nomor Invoice</span>
                  <span className="text-amber-300 font-mono text-[11px] font-bold">{invoiceNumber}</span>
                </div>
                {isGatewayExpired && (
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Status Tagihan</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Kedaluwarsa (Expired)
                    </span>
                  </div>
                )}
                {currentOrderType === "CUSTOM_DOMAIN_ADDON" ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400">Domain Tujuan</span>
                      <span className="text-amber-400 font-mono text-xs font-bold">{requestedDomain || "-"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400">Masa Aktif Domain</span>
                      <span className="text-emerald-400 font-semibold">1 Tahun (365 Hari)</span>
                    </div>
                  </>
                ) : currentOrderType === "GALLERY_EXTENSION" ? (
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Masa Tambahan Galeri</span>
                    <span className="text-emerald-400 font-semibold">+30 Hari Kalender</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Masa Aktif Undangan</span>
                    <span className="text-emerald-400 font-semibold">Aktif hingga {retentionDays} Hari Setelah Acara</span>
                  </div>
                )}
              </div>

              {/* Promo Code Collapsible (Hanya jika Master Switch ON) */}
              {promoEnabled && (
                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  {!appliedPromo ? (
                    <div>
                      {!promoOpen ? (
                        <button
                          type="button"
                          onClick={() => { setPromoOpen(true); setPromoError(null); }}
                          className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Punya kode promo atau referral?</span>
                        </button>
                      ) : (
                        <div className="space-y-2 bg-stone-900/50 p-3 rounded-2xl border border-white/5 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-300 font-medium text-[11px]">Kupon Promo / Referral</span>
                            <button
                              type="button"
                              onClick={() => { setPromoOpen(false); setPromoError(null); }}
                              className="text-stone-500 hover:text-stone-300 text-[11px]"
                            >
                              Batal
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={promoCodeInput}
                              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                              placeholder="Ketik kode kupon..."
                              className="flex-1 px-3 py-2 bg-stone-950/80 border border-white/10 rounded-xl text-xs font-mono uppercase text-white placeholder-stone-600 focus:outline-none focus:border-amber-500/50"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleApplyPromo();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleApplyPromo}
                              disabled={promoValidating || !promoCodeInput.trim()}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                            >
                              {promoValidating ? "Mengecek..." : "Terapkan"}
                            </button>
                          </div>
                          {promoError && (
                            <p className="text-[11px] text-rose-400 font-medium">{promoError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-300 truncate">
                            Kode &ldquo;{appliedPromo.code}&rdquo; Aktif
                          </p>
                          <p className="text-[10px] text-emerald-400/80">
                            Hemat Rp {appliedPromo.discountAmount.toLocaleString("id-ID")}
                            {promoCountdownStr && (
                              <span className="ml-1.5 text-amber-300 font-mono font-medium">
                                ({promoCountdownStr})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-[11px] text-stone-400 hover:text-rose-400 font-medium px-2 py-1 rounded-lg hover:bg-white/5 transition cursor-pointer shrink-0"
                        title="Hapus Kupon"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Rincian Fee Gateway Dinamis (%) & Diskon */}
              <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
                <div className="flex justify-between items-center text-stone-400">
                  <span>Subtotal Layanan</span>
                  <span className="text-stone-200 font-medium font-mono">Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
                {appliedPromo && discountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>Diskon Kupon ({appliedPromo.code})</span>
                    <span className="font-medium font-mono">- Rp {discountAmount.toLocaleString("id-ID")}</span>
                  </div>
                )}
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

              <div className="pt-3 border-t border-white/10 flex flex-wrap justify-between items-center gap-2">
                <span className="text-stone-300 font-semibold text-xs">Total Pembayaran</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xl sm:text-2xl font-bold text-amber-400 font-serif">
                    Rp {totalAmount.toLocaleString("id-ID")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(totalAmount.toString(), "amount")}
                    className="p-1.5 text-stone-400 hover:text-white transition cursor-pointer"
                    title="Salin Nominal"
                    aria-label="Salin Nominal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  {copiedAmount && <span className="text-[10px] text-emerald-400 font-semibold">Tersalin!</span>}
                </div>
              </div>
            </div>
          )}

          {/* Action: Konfirmasi & Lanjut Pembayaran */}
          <div className="space-y-3 pt-2">
            <button
              id="btn-confirm-checkout"
              type="button"
              onClick={handleConfirmAndProceed}
              disabled={confirmingOrder || !orderId}
              className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-lg shadow-amber-950/40 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              {confirmingOrder ? (
                <>
                  <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>Mengonfirmasi Tagihan...</span>
                </>
              ) : (
                <>
                  <span>Konfirmasi &amp; Lanjut Pembayaran</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Tombol Batalkan Tagihan Ini */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancellingOrder}
                className="text-[11px] text-stone-500 hover:text-rose-400 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                {cancellingOrder ? (
                  <span>Membatalkan pesanan...</span>
                ) : (
                  <span>Batalkan pesanan ini &amp; pilih paket lain</span>
                )}
              </button>
            </div>
          </div>

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
