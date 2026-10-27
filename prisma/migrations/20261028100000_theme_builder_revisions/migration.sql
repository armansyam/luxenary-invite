-- CreateTable
CREATE TABLE "theme_builder_revisions" (
    "id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ThemeCategory" NOT NULL,
    "description" TEXT,
    "action" TEXT NOT NULL,
    "admin_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_builder_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "theme_builder_revisions_theme_id_created_at_idx" ON "theme_builder_revisions"("theme_id", "created_at");

-- AddForeignKey
ALTER TABLE "theme_builder_revisions" ADD CONSTRAINT "theme_builder_revisions_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
