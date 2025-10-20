-- Migration: Add title column to quick_nav_items table
-- This stores the display name for quick navigation items

-- Step 1: Add title column
ALTER TABLE quick_nav_items
ADD COLUMN IF NOT EXISTS title TEXT;

-- Step 2: Set default title for existing rows (will be empty, but that's okay)
UPDATE quick_nav_items
SET title = ''
WHERE title IS NULL;

-- Step 3: Make title NOT NULL with default empty string
ALTER TABLE quick_nav_items
ALTER COLUMN title SET DEFAULT '';

ALTER TABLE quick_nav_items
ALTER COLUMN title SET NOT NULL;

-- Verify the changes
SELECT
  id,
  type,
  target_id,
  page_id,
  title,
  created_at
FROM quick_nav_items
LIMIT 5;
