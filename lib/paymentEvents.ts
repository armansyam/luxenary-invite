import { EventEmitter } from "events";

/**
 * Singleton PaymentEmitter
 * Jembatan antara webhook iPaymu (yang update DB) dan SSE stream (yang push ke browser klien).
 * Bekerja sempurna di single-process Node.js (VPS standar dengan pm2).
 */
declare global {
  var paymentEmitter: EventEmitter | undefined;
}

const paymentEmitter: EventEmitter = global.paymentEmitter ?? new EventEmitter();
paymentEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  global.paymentEmitter = paymentEmitter;
}

export { paymentEmitter };
