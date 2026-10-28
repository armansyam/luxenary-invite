-- CreateTable
CREATE TABLE "invitation_visits" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "guest_name" TEXT,
    "visit_count" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitation_visits_invitation_id_last_seen_at_idx" ON "invitation_visits"("invitation_id", "last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_visits_invitation_id_visitor_id_key" ON "invitation_visits"("invitation_id", "visitor_id");

-- AddForeignKey
ALTER TABLE "invitation_visits" ADD CONSTRAINT "invitation_visits_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
