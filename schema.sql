-- Mindmap Memo Database Schema
-- Run this in Neon SQL Editor: Vercel Dashboard > Storage > Your DB > SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Memos table
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  width FLOAT,
  height FLOAT,
  display_width FLOAT,
  display_height FLOAT,
  display_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large'
  importance INTEGER DEFAULT 0,
  parent_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Content blocks table (for memo content)
CREATE TABLE IF NOT EXISTS content_blocks (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL, -- 'text', 'callout', 'checklist', 'image', 'file', 'bookmark', 'quote', 'code'
  block_content TEXT NOT NULL DEFAULT '', -- Main content/text
  checked BOOLEAN DEFAULT false, -- For checklist items
  language TEXT, -- For code blocks
  caption TEXT, -- For images/files
  importance TEXT, -- For non-text blocks: 'critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'
  importance_ranges JSONB, -- For text blocks: array of {start, end, level, note?}
  block_order INTEGER NOT NULL, -- Order of blocks within memo
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Connections table (memo to memo connections)
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  from_memo_id TEXT NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  to_memo_id TEXT NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  from_direction TEXT NOT NULL DEFAULT 'right', -- Connection point on source memo
  to_direction TEXT NOT NULL DEFAULT 'left', -- Connection point on target memo
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_memo_id, to_memo_id)
);

-- Tags table (for memo tags)
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  label_position_x FLOAT,
  label_position_y FLOAT,
  is_expanded BOOLEAN DEFAULT true,
  parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quick navigation items table
CREATE TABLE IF NOT EXISTS quick_nav_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'memo' or 'category'
  target_id TEXT NOT NULL, -- memo_id or category_id
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, target_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_memos_page_id ON memos(page_id);
CREATE INDEX IF NOT EXISTS idx_memos_parent_id ON memos(parent_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_memo_id ON content_blocks(memo_id);
CREATE INDEX IF NOT EXISTS idx_connections_from_memo ON connections(from_memo_id);
CREATE INDEX IF NOT EXISTS idx_connections_to_memo ON connections(to_memo_id);
CREATE INDEX IF NOT EXISTS idx_tags_memo_id ON tags(memo_id);
CREATE INDEX IF NOT EXISTS idx_categories_page_id ON categories(page_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_quick_nav_user_id ON quick_nav_items(user_id);
