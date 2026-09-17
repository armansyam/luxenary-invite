-- CreateIndex
CREATE INDEX "webhook_logs_source_createdAt_idx" ON "webhook_logs"("source", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_logs_createdAt_idx" ON "webhook_logs"("createdAt");
