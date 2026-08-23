import crypto from "crypto";
import { PaymentGateway } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

/**
 * iPaymu Payment Gateway v2
 * Docs: https://api-doc.ipaymu.com/
 *
 * Autentikasi: SHA256 HMAC signature
 * Format: signature = SHA256(VA + ":" + ApiKey + ":" + requestBodyHash + ":" + timestamp)
 *
 * Mode: Sandbox  → https://sandbox.ipaymu.com/api/v2
 *       Produksi → https://my.ipaymu.com/api/v2
 */
export class IPaymuGateway implements PaymentGateway {
  private async getConfig() {
    // Baca config dari database (AdminSetting), fallback ke env
    let va = process.env.IPAYMU_VA || "";
    let apiKey = process.env.IPAYMU_API_KEY || "";
    let mode = process.env.IPAYMU_SANDBOX === "false" ? "production" : "sandbox";
    let appUrl = process.env.APP_URL || "http://localhost:3000";

    try {
      const settings = await prisma.adminSetting.findMany({
        where: { group: "ipaymu" },
      });
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value));
      if (map["ipaymu_va"]) va = map["ipaymu_va"];
      if (map["ipaymu_api_key"]) apiKey = map["ipaymu_api_key"];
      if (map["ipaymu_mode"]) mode = map["ipaymu_mode"];

      const platformSettings = await prisma.adminSetting.findMany({
        where: { group: "platform" },
      });
      const pmap: Record<string, string> = {};
      platformSettings.forEach((s) => (pmap[s.key] = s.value));
      if (pmap["platform_url"]) appUrl = pmap["platform_url"];
    } catch {
      // Gunakan env fallback jika DB belum siap
    }

    const baseUrl = mode === "production"
      ? "https://my.ipaymu.com/api/v2"
      : "https://sandbox.ipaymu.com/api/v2";

    return { va, apiKey, baseUrl, appUrl };
  }

  private buildSignature(va: string, apiKey: string, bodyStr: string, timestamp: string): string {
    // SHA256 hash dari body JSON
    const bodyHash = crypto.createHash("sha256").update(bodyStr).digest("hex").toLowerCase();
    // Signature string
    const toSign = `POST:${va}:${bodyHash}:${apiKey}:${timestamp}`;
    // HMAC-SHA256
    return crypto.createHmac("sha256", apiKey).update(toSign).digest("hex");
  }

  async init(orderId: string, amount: number): Promise<{ checkoutUrl: string }> {
    const { va, apiKey, baseUrl, appUrl } = await this.getConfig();

    if (!va || va === "0000000000000000" || !apiKey || apiKey === "your_ipaymu_api_key") {
      throw new Error("iPaymu belum dikonfigurasi dengan VA & API Key aktif. Silakan isi di Portal Admin (/admin) → tab Pengaturan.");
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();

    const body = {
      product: [`Luxenary Invite — Order ${orderId}`],
      qty: [1],
      price: [amount],
      amount,
      returnUrl: `${appUrl}/checkout/success?order=${orderId}`,
      notifyUrl: `${appUrl}/api/webhook/ipaymu`,
      cancelUrl: `${appUrl}/checkout/pending?order=${orderId}`,
      referenceId: orderId,
      paymentMethod: "redirect",
      buyerName: "Klien Luxenary",
      buyerEmail: "client@luxenary.id",
      buyerPhone: "",
    };

    const bodyStr = JSON.stringify(body);
    const signature = this.buildSignature(va, apiKey, bodyStr, timestamp);

    const response = await fetch(`${baseUrl}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        va,
        signature,
        timestamp,
      },
      body: bodyStr,
    });

    const data = await response.json();

    if (!response.ok || !data?.Data?.Url) {
      const errorMsg = data?.Message || data?.message || JSON.stringify(data);
      throw new Error(`iPaymu (${baseUrl.includes("sandbox") ? "Sandbox" : "Produksi"}): ${errorMsg}`);
    }

    return { checkoutUrl: data.Data.Url };
  }

  async verify(reference: string): Promise<{ status: "PAID" | "FAILED" }> {
    const { va, apiKey, baseUrl } = await this.getConfig();

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = { referenceId: reference };
    const bodyStr = JSON.stringify(body);
    const signature = this.buildSignature(va, apiKey, bodyStr, timestamp);

    const response = await fetch(`${baseUrl}/payment/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        va,
        signature,
        timestamp,
      },
      body: bodyStr,
    });

    const data = await response.json();

    // iPaymu status codes: 1 = PAID, 6 = PENDING, 2 = FAILED
    const paid = data?.Data?.Status === 1 || data?.Data?.Status === "PAID";
    return { status: paid ? "PAID" : "FAILED" };
  }
}
