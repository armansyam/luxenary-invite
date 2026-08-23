import axios from "axios";
import { PaymentGateway } from "@/lib/payments";

export class IPaymuGateway implements PaymentGateway {
  private apiKey = process.env.IPAYMU_API_KEY!;
  private apiUrl = "https://my.ipaymu.com/api/v2";

  async init(orderId: string, amount: number) {
    const payload = {
      name: orderId,
      price: amount,
      qty: 1,
      notifyUrl: "https://your.domain/webhook/ipaymu",
      returnUrl: "https://your.domain/checkout/success",
    };
    const res = await axios.post(`${this.apiUrl}/payment`, payload, {
      headers: { "API-Key": this.apiKey },
    });
    return { checkoutUrl: res.data.data.url };
  }

  async verify(reference: string): Promise<{ status: "PAID" | "FAILED" }> {
    const res = await axios.get(`${this.apiUrl}/payment/${reference}`, {
      headers: { "API-Key": this.apiKey },
    });
    const paid = res.data.data.status === "PAID";
    return { status: paid ? "PAID" : "FAILED" };
  }
}
