"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const GATEWAYS = ["midtrans", "ipaymu", "xendit"] as const;
type Gateway = (typeof GATEWAYS)[number];

export default function InvitationDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [gateway, setGateway] = useState<Gateway>("midtrans");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!session?.user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get or create order for this invitation (simplified)
      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, planType: "PREMIUM" }),
      });
      const { orderId } = await orderRes.json();

      // 2. Checkout with selected gateway
      const checkoutRes = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, gateway }),
      });
      const { checkoutUrl } = await checkoutRes.json();

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (e) {
      setError("Gagal memulai pembayaran");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return <div>Memuat...</div>;
  if (!session) return <div>Silakan <a href="/api/auth/signin">login</a>.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Pilih Paket & Bayar</h1>

      <div className="mb-4">
        <label className="block mb-2">Payment Gateway</label>
        <select
          value={gateway}
          onChange={(e) => setGateway(e.target.value as Gateway)}
          className="w-full p-2 border rounded"
        >
          {GATEWAYS.map((g) => (
            <option key={g} value={g}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Bayar Sekarang"}
      </button>
    </div>
  );
}