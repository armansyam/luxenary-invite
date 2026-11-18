-- Penanda versi HTML terbit dan demo yang di-cache di disk tiap server aplikasi (lib/renderVersion.ts).
CREATE TABLE "render_versions" (
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "render_versions_pkey" PRIMARY KEY ("key")
);
