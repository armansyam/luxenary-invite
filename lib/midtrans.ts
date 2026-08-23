import axios from "axios";
import { PaymentGateway } from "@/lib/payments";

export class MidtransGateway implements PaymentGateway {
  private serverKey = process.env.MIDTRANS_SERVER_KEY!;
  private apiUrl = "https://api.midtrans.com/v2";

  async init(orderId: string, amount: number) {
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
