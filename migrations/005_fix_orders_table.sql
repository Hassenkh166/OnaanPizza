-- Fix the original_total column if it exists
-- Drop it and recreate with proper DEFAULT, or just remove it
BEGIN;

-- Check if the column exists and has issues
-- If original_total exists as NOT NULL without proper default, drop and recreate
ALTER TABLE orders DROP COLUMN IF EXISTS original_total;

COMMIT;
