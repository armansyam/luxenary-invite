-- CreateTable: rate_limit_counters
-- Tabel rate limiting cross-process berbasis PostgreSQL.
-- Digunakan oleh rateLimitDb() di lib/rateLimit.ts untuk endpoint publik sensitif
-- (RSVP, memories upload, scan resepsionis) di lingkungan PM2 multi-worker.
-- Tidak memerlukan cron cleanup — expired rows otomatis di-reset via UPSERT.

CREATE TABLE "rate_limit_counters" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "idx_rate_limit_expires" ON "rate_limit_counters"("expires_at");
