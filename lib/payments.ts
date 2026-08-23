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

export { IPaymuGateway } from "@/lib/ipaymu";