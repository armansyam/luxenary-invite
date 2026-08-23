import axios from "axios";
export interface PaymentGateway {
  init(orderId: string, amount: number): Promise<{ checkoutUrl: string }>;
  verify(reference: string): Promise<{ status: "PAID" | "FAILED" }>;
}

export class MidtransGateway implements PaymentGateway {
  private serverKey = process.env.MIDTRANS_SERVER_KEY!;
  private apiUrl = "https://api.midtrans.com/v2";

  async init(orderId: string, amount: number): Promise<{ checkoutUrl: string }> {
    const res = await axios.post(
      `${this.apiUrl}/charge`,
      {
        transaction_details: { order_id: orderId, gross_amount: amount },
        payment_type: "bank_transfer",
      },
      { auth: { username: this.serverKey, password: "" } },
    );
    return { checkoutUrl: res.data.redirect_url };
  }

  async verify(reference: string): Promise<{ status: "PAID" | "FAILED" }> {
    const res = await axios.get(`${this.apiUrl}/${reference}/status`, {
      auth: { username: this.serverKey, password: "" },
    });
    const paid = res.data.transaction_status === "settlement";
    return { status: paid ? "PAID" : "FAILED" };
  }
}

export class IPaymuGateway implements PaymentGateway {
  private apiKey = process.env.IPAYMU_API_KEY!;
  private apiUrl = "https://my.ipaymu.com/api/v2";

  async init(orderId: string, amount: number): Promise<{ checkoutUrl: string }> {
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