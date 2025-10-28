-- Update quick_nav_items table to add foreign key constraint to pages table
-- This will ensure that quick nav items are automatically deleted when their page is deleted

-- First, delete any orphaned quick_nav_items that reference non-existent pages
DELETE FROM quick_nav_items
WHERE page_id NOT IN (SELECT id FROM pages);

-- Add foreign key constraint to page_id
ALTER TABLE quick_nav_items
DROP CONSTRAINT IF EXISTS quick_nav_items_page_id_fkey;

ALTER TABLE quick_nav_items
ADD CONSTRAINT quick_nav_items_page_id_fkey
FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE;

-- Verify the constraint was added
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'quick_nav_items';
