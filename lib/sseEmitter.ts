import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { Client } from "pg";
import { pool } from "./prisma";
import { logger } from "./logger";
import { clearLocalInvitationLookup } from "./cache";

/**
 * Event real-time galeri kenangan tamu, check-in resepsionis, dan invalidasi cache L1 lintas proses.
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

export interface CacheInvalidateEvent {
  invitationSlug?: string | null;
  subdomain?: string | null;
  invitationId?: string | null;
  customDomain?: string | null;
}

export interface GuestCheckinEvent {
  guestId: string;
  invitationId: string;
  name: string;
  category: string;
  tableNumber: string | null;
  sessionInfo: string | null;
  souvenirClaimed: boolean;
  checkedInAt: string;
  alreadyRedeemed?: boolean;
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
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (global.sseBridgeClient || isStartingBridge) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  isStartingBridge = true;
  const client = new Client({ connectionString });

  const retry = () => {
    global.sseBridgeClient = undefined;
    isStartingBridge = false;
    const timer = setTimeout(startSseBridge, 5000);
    timer.unref?.();
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
          if (origin === INSTANCE_ID) return;
          if (event === "new_memory") {
            sseEmitter.emit("new_memory", data as NewMemoryEvent);
          } else if (event === "guest_checkin") {
            sseEmitter.emit("guest_checkin", data as GuestCheckinEvent);
          } else if (event === "cache_invalidate") {
            const payload = data as CacheInvalidateEvent;
            clearLocalInvitationLookup(
              payload.invitationSlug,
              payload.subdomain,
              payload.invitationId,
              payload.customDomain,
            );
          }
        } catch (err) {
          logger.error("SseEmitter", "Payload notifikasi tidak valid", err);
        }
      });
      client.on("error", (err) => {
        logger.error("SseEmitter", "Koneksi LISTEN terputus; mencoba ulang", err);
        retry();
      });
      client.on("end", retry);

      await client.query(`LISTEN ${PG_CHANNEL}`);
    })
    .catch((err) => {
      logger.error("SseEmitter", "Gagal menyambung LISTEN; mencoba ulang", err);
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

/** Publikasikan event check-in tamu ke Layar Sapa TV & resepsionis di seluruh proses. */
export async function publishGuestCheckin(event: GuestCheckinEvent): Promise<void> {
  sseEmitter.emit("guest_checkin", event);
  await pool.query("SELECT pg_notify($1, $2)", [
    PG_CHANNEL,
    JSON.stringify({ origin: INSTANCE_ID, event: "guest_checkin", data: event }),
  ]);
}

/** Siarkan invalidasi cache lookup L1 ke seluruh proses worker PM2 / server lain via LISTEN/NOTIFY. */
export async function publishCacheInvalidation(event: CacheInvalidateEvent): Promise<void> {
  await pool.query("SELECT pg_notify($1, $2)", [
    PG_CHANNEL,
    JSON.stringify({ origin: INSTANCE_ID, event: "cache_invalidate", data: event }),
  ]);
}
