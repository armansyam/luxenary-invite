-- Piring undangan pindah dari data/drafts/<id>.html di disk server ke DB agar bisa dipakai bersama beberapa server.
-- Berkas lama diimpor oleh scripts/migrate-drafts-to-db.ts (dijalankan deploy.sh setelah migrasi).
CREATE TABLE "invitation_drafts" (
    "invitation_id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_drafts_pkey" PRIMARY KEY ("invitation_id")
);

ALTER TABLE "invitation_drafts" ADD CONSTRAINT "invitation_drafts_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
