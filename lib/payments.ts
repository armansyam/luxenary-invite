import axios from "axios";

export interface PaymentGateway {
  init(orderId: string, amount: number, customAppUrl?: string): Promise<{ checkoutUrl?: string; qrString?: string; sessionId?: string; expiryTimestamp?: number }>;
  verify(reference: string): Promise<{ status: "PAID" | "FAILED" | "PENDING" }>;
}

export { MidtransGateway } from "@/lib/gateways/midtrans";
export { IPaymuGateway } from "@/lib/ipaymu";