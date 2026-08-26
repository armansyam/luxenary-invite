import { EventEmitter } from "events";

// Ensure a single instance across hot reloads in development
const globalForSse = global as unknown as { sseEmitter: EventEmitter };

export const sseEmitter = globalForSse.sseEmitter || new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForSse.sseEmitter = sseEmitter;
}
