-- Migration: 20260916130000_update_order_type_enum
-- Menambahkan nilai enum MEMORIES_TOPUP ke OrderType untuk mendukung add-on kuota foto tamu.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderType' AND e.enumlabel = 'MEMORIES_TOPUP'
  ) THEN
    ALTER TYPE "OrderType" ADD VALUE 'MEMORIES_TOPUP';
  END IF;
END$$;
