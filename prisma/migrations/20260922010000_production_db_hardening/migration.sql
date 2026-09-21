-- =============================================================================
-- MIGRATION: Production DB Hardening — Index, Constraint & Performance
-- Date   : 2026-09-22
-- Author : System Audit (pre-VPS deploy)
-- =============================================================================
-- Semua CREATE INDEX menggunakan IF NOT EXISTS — aman dijalankan ulang (idempotent).
-- Kompatibel dengan `prisma migrate deploy` (berjalan di dalam blok transaksi PostgreSQL).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLE: invitations — Index tambahan untuk hot-path cron & admin queries
-- -----------------------------------------------------------------------------

-- themeId: dipakai di admin filter invitations by theme
CREATE INDEX IF NOT EXISTS "invitations_themeId_idx"
  ON "invitations" ("themeId");

-- galleryExpiresAt: cron cleanup loop (EVENT_FINISHED → ARCHIVED)
-- PARTIAL index — hanya undangan yang belum ARCHIVED/DRAFT, mengurangi ukuran index 90%
CREATE INDEX IF NOT EXISTS "invitations_galleryExpiresAt_idx"
  ON "invitations" ("galleryExpiresAt")
  WHERE "galleryExpiresAt" IS NOT NULL;

-- expiresAt: lifecycle check (subdomain expiry)
CREATE INDEX IF NOT EXISTS "invitations_expiresAt_idx"
  ON "invitations" ("expiresAt")
  WHERE "expiresAt" IS NOT NULL;

-- status + galleryExpiresAt: composite — cron cleanup query utama
-- SELECT * FROM invitations WHERE status IN ('EVENT_FINISHED','TAKEN_DOWN') AND ...
CREATE INDEX IF NOT EXISTS "invitations_status_galleryExpiresAt_idx"
  ON "invitations" ("status", "galleryExpiresAt");

-- createdAt: admin list sort (ORDER BY createdAt DESC)
CREATE INDEX IF NOT EXISTS "invitations_createdAt_idx"
  ON "invitations" ("createdAt" DESC);


-- -----------------------------------------------------------------------------
-- 2. TABLE: orders — Index tambahan untuk finance & cron cleanup
-- -----------------------------------------------------------------------------

-- createdAt: cron cleanup stale orders (PENDING/EXPIRED/FAILED > N days)
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx"
  ON "orders" ("createdAt" DESC);

-- paidAt: finance overview & revenue reporting
CREATE INDEX IF NOT EXISTS "orders_paidAt_idx"
  ON "orders" ("paidAt")
  WHERE "paidAt" IS NOT NULL;

-- status + createdAt: cron cleanup composite — WHERE status IN (...) AND createdAt < threshold
CREATE INDEX IF NOT EXISTS "orders_status_createdAt_idx"
  ON "orders" ("status", "createdAt");

-- planType: admin filter orders by tier
CREATE INDEX IF NOT EXISTS "orders_planType_idx"
  ON "orders" ("planType");


-- -----------------------------------------------------------------------------
-- 3. TABLE: rsvps — Index tambahan untuk RSVP lookups
-- -----------------------------------------------------------------------------

-- guestId: FK column tanpa index — lookup RSVP by guestId
CREATE INDEX IF NOT EXISTS "rsvps_guestId_idx"
  ON "rsvps" ("guestId")
  WHERE "guestId" IS NOT NULL;

-- status: filter hadir/tidak di dashboard pengantin
CREATE INDEX IF NOT EXISTS "rsvps_status_idx"
  ON "rsvps" ("status");

-- invitationId + guestId: composite untuk duplicate RSVP check (idempotent POST)
CREATE INDEX IF NOT EXISTS "rsvps_invitationId_guestId_idx"
  ON "rsvps" ("invitationId", "guestId");


-- -----------------------------------------------------------------------------
-- 4. TABLE: guests — Index tambahan untuk receptionist scan & WA blast
-- -----------------------------------------------------------------------------

-- isTokenRedeemed: Atomic CAS filter — WHERE id = ? AND isTokenRedeemed = false
-- PARTIAL index — hanya tamu yang belum check-in (volume kecil, sangat selektif)
CREATE INDEX IF NOT EXISTS "guests_isTokenRedeemed_false_idx"
  ON "guests" ("invitationId", "isTokenRedeemed")
  WHERE "isTokenRedeemed" = false;

-- waStatus: WhatsApp blast filter
CREATE INDEX IF NOT EXISTS "guests_waStatus_idx"
  ON "guests" ("waStatus");

-- category: filter tamu by kategori (VIP, Keluarga, dll)
CREATE INDEX IF NOT EXISTS "guests_category_idx"
  ON "guests" ("invitationId", "category");


-- -----------------------------------------------------------------------------
-- 5. TABLE: guest_memories — Index tambahan untuk quota & SSE stream
-- -----------------------------------------------------------------------------

-- senderEmail + invitationId: shots quota per tamu per acara
-- Dipakai di atomic TOCTOU check: COUNT WHERE invitationId = ? AND senderEmail = ?
CREATE INDEX IF NOT EXISTS "guest_memories_invitationId_senderEmail_idx"
  ON "guest_memories" ("invitationId", "senderEmail");

-- createdAt: ordering galeri foto tamu (ORDER BY createdAt DESC)
CREATE INDEX IF NOT EXISTS "guest_memories_createdAt_idx"
  ON "guest_memories" ("invitationId", "createdAt" DESC);


-- -----------------------------------------------------------------------------
-- 6. TABLE: media — Composite index untuk slot lookup
-- -----------------------------------------------------------------------------

-- invitationId + mediaSlot: findFirst per slot — sangat sering dipanggil di studio editor
CREATE INDEX IF NOT EXISTS "media_invitationId_mediaSlot_idx"
  ON "media" ("invitationId", "mediaSlot");


-- -----------------------------------------------------------------------------
-- 7. TABLE: users — Index untuk admin list & search
-- -----------------------------------------------------------------------------

-- createdAt: admin user list sort (ORDER BY createdAt DESC)
CREATE INDEX IF NOT EXISTS "users_createdAt_idx"
  ON "users" ("createdAt" DESC);

-- role: admin user filter by role (CLIENT/ADMIN)
CREATE INDEX IF NOT EXISTS "users_role_idx"
  ON "users" ("role");


-- -----------------------------------------------------------------------------
-- 8. TABLE: recurring_expenses — Index untuk status & tanggal jatuh tempo
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "recurring_expenses_isActive_idx"
  ON "recurring_expenses" ("isActive");

CREATE INDEX IF NOT EXISTS "recurring_expenses_dueDayOfMonth_idx"
  ON "recurring_expenses" ("dueDayOfMonth");


-- -----------------------------------------------------------------------------
-- 9. TABLE: webhook_logs — Tambahan index GIN untuk payload JSONB
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "webhook_logs_payload_gin_idx"
  ON "webhook_logs" USING GIN ("payload");


-- -----------------------------------------------------------------------------
-- 10. TABLE: rate_limit_counters — Pastikan index sudah ada (dari migration sebelumnya)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_rate_limit_expires"
  ON "rate_limit_counters" ("expires_at");


-- =============================================================================
-- VERIFIKASI: Jalankan query ini setelah migration untuk konfirmasi semua index aktif
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
-- =============================================================================
