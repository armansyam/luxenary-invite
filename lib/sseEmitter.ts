import { EventEmitter } from "events";

// Ensure a single instance across hot reloads in development
const globalForSse = global as unknown as { sseEmitter: EventEmitter };

export const sseEmitter = globalForSse.sseEmitter || new EventEmitter();

// Set max listeners lebih tinggi untuk mendukung banyak undangan simultan
// Default Node.js adalah 10 — naikkan ke 200 untuk menghindari warning memory leak
sseEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  globalForSse.sseEmitter = sseEmitter;
}
