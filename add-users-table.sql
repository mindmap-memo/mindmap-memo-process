-- Add users table for authentication
-- Execute this script in your Neon database

-- Table: users
-- Stores user account information
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Verify table created
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
