ALTER TABLE users ADD COLUMN IF NOT EXISTS app_data JSONB DEFAULT '{
  "pages": [],
  "quickNavItems": []
}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_app_data ON users USING GIN (app_data);
