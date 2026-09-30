import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { Client } from "pg";
import { pool } from "./prisma";

/**
 * Event real-time galeri kenangan tamu.
 *
 * Aplikasi berjalan sebagai PM2 cluster (beberapa proses Node), sehingga EventEmitter biasa hanya
 * menjangkau klien yang tersambung ke proses yang sama. Event dipancarkan lewat PostgreSQL
 * LISTEN/NOTIFY agar sampai ke seluruh proses (pola yang sama dengan `paymentEvents`).
 *
 * Payload sengaja minimal (tanpa email/nama pengirim): stream ini dapat diakses publik.
 */
export interface NewMemoryEvent {
  id: string;
  invitationId: string;
}

const PG_CHANNEL = "sse_events";
const INSTANCE_ID = randomUUID();

declare global {
  var sseEmitter: EventEmitter | undefined;
  var sseBridgeClient: Client | undefined;
}

export const sseEmitter: EventEmitter = global.sseEmitter ?? new EventEmitter();
sseEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  global.sseEmitter = sseEmitter;
}

let isStartingBridge = false;

/** Mulai mendengarkan event dari proses lain. Idempotent; dipanggil saat stream SSE pertama dibuka. */
export function startSseBridge(): void {
  if (global.sseBridgeClient || isStartingBridge) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  isStartingBridge = true;
  const client = new Client({ connectionString });

  const retry = () => {
    global.sseBridgeClient = undefined;
    isStartingBridge = false;
    setTimeout(startSseBridge, 5000);
  };

  client
    .connect()
    .then(async () => {
      isStartingBridge = false;
      global.sseBridgeClient = client;

      client.on("notification", (msg) => {
        if (msg.channel !== PG_CHANNEL || !msg.payload) return;
        try {
          const { origin, event, data } = JSON.parse(msg.payload);
          if (origin === INSTANCE_ID || event !== "new_memory") return;
          sseEmitter.emit("new_memory", data as NewMemoryEvent);
        } catch (err) {
          console.error("[sseEmitter] Payload notifikasi tidak valid:", err);
        }
      });
      client.on("error", (err) => {
        console.error("[sseEmitter] Koneksi LISTEN terputus, mencoba ulang:", err.message);
        retry();
      });
      client.on("end", retry);

      await client.query(`LISTEN ${PG_CHANNEL}`);
    })
    .catch((err) => {
      console.error("[sseEmitter] Gagal menyambung LISTEN, mencoba ulang:", err.message);
      retry();
    });
}

/** Publikasikan memori baru ke klien di proses ini dan di seluruh proses lain. */
export async function publishNewMemory(event: NewMemoryEvent): Promise<void> {
  sseEmitter.emit("new_memory", event);
  await pool.query("SELECT pg_notify($1, $2)", [
    PG_CHANNEL,
    JSON.stringify({ origin: INSTANCE_ID, event: "new_memory", data: event }),
  ]);
}
