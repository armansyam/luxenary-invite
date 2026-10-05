import { EventEmitter } from "events";
import { Client } from "pg";
import { pool } from "./prisma";
import { logger } from "./logger";

/**
 * Singleton PaymentEmitter with Multi-Process PostgreSQL LISTEN/NOTIFY Bridge
 * 
 * Bekerja cross-process pada PM2 Cluster Mode (maupun multi-instance container).
 * Ketika webhook pembayaran atau admin trigger event di instance A, PostgreSQL NOTIFY
 * mem-broadcast event secara instan (<5ms) ke seluruh instance PM2 lainnya sehingga
 * SSE stream klien di instance B langsung menerima event lunas/reject seketika.
 */
declare global {
  var paymentEmitter: EventEmitter | undefined;
  var pgSubscriberClient: Client | undefined;
}

const paymentEmitter: EventEmitter = global.paymentEmitter ?? new EventEmitter();
paymentEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  global.paymentEmitter = paymentEmitter;
}

const PG_CHANNEL = "payment_events";

interface PaymentEventPayload {
  status: string;
  planType?: string;
  rejectReason?: string;
  _fromPg?: boolean;
  [key: string]: any;
}

let isSubscribing = false;

function setupPgSubscriber() {
  if (global.pgSubscriberClient || isSubscribing) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  isSubscribing = true;
  const client = new Client({ connectionString });

  client
    .connect()
    .then(async () => {
      isSubscribing = false;
      global.pgSubscriberClient = client;

      client.on("notification", (msg) => {
        if (msg.channel !== PG_CHANNEL || !msg.payload) return;
        try {
          const { orderId, data } = JSON.parse(msg.payload);
          if (orderId && data) {
            // Emit secara lokal di instance ini dengan flag _fromPg agar tidak re-broadcast
            originalEmit(orderId, { ...data, _fromPg: true });
          }
        } catch (err) {
          logger.error("PaymentEvents", "Notifikasi PostgreSQL tidak dapat diurai", err);
        }
      });

      client.on("error", (err) => {
        logger.error("PaymentEvents", "Subscriber PostgreSQL terputus; menyambung ulang dalam 5 detik", err);
        global.pgSubscriberClient = undefined;
        isSubscribing = false;
        setTimeout(setupPgSubscriber, 5000);
      });

      client.on("end", () => {
        global.pgSubscriberClient = undefined;
        isSubscribing = false;
        setTimeout(setupPgSubscriber, 5000);
      });

      await client.query(`LISTEN ${PG_CHANNEL}`);
    })
    .catch((err) => {
      isSubscribing = false;
      logger.error("PaymentEvents", "Subscriber PostgreSQL gagal tersambung; mencoba ulang dalam 5 detik", err);
      setTimeout(setupPgSubscriber, 5000);
    });
}

// Inisialisasi otomatis di lingkungan server Node.js
if (typeof window === "undefined") {
  setupPgSubscriber();
}

/**
 * Broadcast event ke PostgreSQL NOTIFY agar seluruh worker PM2 menerima sinyal
 */
async function broadcastToPostgres(orderId: string, data: PaymentEventPayload) {
  try {
    const payload = JSON.stringify({ orderId, data });
    await pool.query("SELECT pg_notify($1, $2)", [PG_CHANNEL, payload]);
  } catch (err) {
    logger.error("PaymentEvents", "Gagal menyiarkan notifikasi pembayaran lintas instance", err);
  }
}

// Simpan referensi emit bawaan
const originalEmit = paymentEmitter.emit.bind(paymentEmitter);

// Intersep emit untuk otomatis broadcast cross-process jika bukan berasal dari PG
paymentEmitter.emit = function (event: string | symbol, ...args: any[]): boolean {
  const data = args[0] as PaymentEventPayload | undefined;

  if (typeof event === "string" && (!data || !data._fromPg)) {
    broadcastToPostgres(event, data || { status: "UNKNOWN" });
  }

  return originalEmit(event, ...args);
};

export { paymentEmitter };
