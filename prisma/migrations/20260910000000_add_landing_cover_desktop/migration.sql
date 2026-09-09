-- Migration: 20260910000000_add_landing_cover_desktop
-- Menambahkan nilai enum LANDING_COVER_DESKTOP ke MediaSlot untuk mendukung
-- pemisahan cover opening antara tampilan Mobile (portrait 9:16) dan Desktop (landscape 16:9).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'MediaSlot' AND e.enumlabel = 'LANDING_COVER_DESKTOP'
  ) THEN
    ALTER TYPE "MediaSlot" ADD VALUE 'LANDING_COVER_DESKTOP';
  END IF;
END$$;
