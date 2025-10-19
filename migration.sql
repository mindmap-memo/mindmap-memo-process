-- Migration: Add importance and importance_ranges columns to content_blocks table
-- Run this SQL in your database console (Vercel Postgres, Neon, etc.)

-- Add importance column for non-text blocks
ALTER TABLE content_blocks
ADD COLUMN IF NOT EXISTS importance TEXT;

-- Add importance_ranges column for text blocks
ALTER TABLE content_blocks
ADD COLUMN IF NOT EXISTS importance_ranges JSONB;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'content_blocks'
ORDER BY ordinal_position;
