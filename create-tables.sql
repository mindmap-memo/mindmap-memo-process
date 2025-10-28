-- Database Schema for Mindmap Memo Application
-- Execute this script in your Neon database

-- Table: pages
-- Stores user pages
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: memos
-- Stores memo blocks with their content and metadata
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC,
  height NUMERIC,
  display_size TEXT DEFAULT 'medium',
  importance TEXT,
  parent_id TEXT,
  user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: categories
-- Stores category blocks for organizing memos
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  original_position_x NUMERIC,
  original_position_y NUMERIC,
  width NUMERIC,
  height NUMERIC,
  is_expanded BOOLEAN DEFAULT TRUE,
  children JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_id TEXT,
  user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: quick_nav_items
-- Stores quick navigation items
CREATE TABLE IF NOT EXISTS quick_nav_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_memos_page_id ON memos(page_id);
CREATE INDEX IF NOT EXISTS idx_memos_user_id ON memos(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_page_id ON categories(page_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_nav_user_id ON quick_nav_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);

-- Verify tables created
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('pages', 'memos', 'categories', 'quick_nav_items')
ORDER BY table_name, ordinal_position;
