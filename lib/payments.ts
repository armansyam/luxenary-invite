export interface PaymentGateway {
  /**
   * Initialise a payment session and return a URL the frontend can redirect to.
   */
  init(orderId: string, amount: number): Promise<{ checkoutUrl: string }>;

  /**
   * Verify payment status using the provider‑specific reference.
   */
  verify(reference: string): Promise<{ status: "PAID" | "FAILED" }>;
}
