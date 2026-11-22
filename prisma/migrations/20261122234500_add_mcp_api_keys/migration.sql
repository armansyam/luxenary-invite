-- Expand-only migration: Remote MCP Server API Keys per AI department/agent

CREATE TABLE IF NOT EXISTS "mcp_api_keys" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "department" TEXT NOT NULL DEFAULT 'GENERAL',
  "key_prefix" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "expires_at" TIMESTAMPTZ,
  "last_used_at" TIMESTAMPTZ,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "created_by_id" TEXT,
  "created_by_label" TEXT,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mcp_api_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_mcp_api_keys_usage_nonnegative" CHECK ("usage_count" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "mcp_api_keys_key_hash_key" ON "mcp_api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "mcp_api_keys_is_active_revoked_at_idx" ON "mcp_api_keys"("is_active", "revoked_at");
CREATE INDEX IF NOT EXISTS "mcp_api_keys_department_idx" ON "mcp_api_keys"("department");
CREATE INDEX IF NOT EXISTS "mcp_api_keys_created_at_idx" ON "mcp_api_keys"("created_at");
