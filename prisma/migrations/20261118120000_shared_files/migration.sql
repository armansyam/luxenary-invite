-- Indeks berkas buatan aplikasi yang disalin ke bucket privat agar server aplikasi lain dapat menariknya (lib/sharedFiles.ts).
CREATE TABLE "shared_files" (
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "shared_files_pkey" PRIMARY KEY ("path")
);

CREATE INDEX "shared_files_updated_at_idx" ON "shared_files"("updated_at");
