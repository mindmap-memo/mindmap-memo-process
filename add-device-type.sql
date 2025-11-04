-- Add device_type column to analytics_sessions table
-- This will track whether users are on mobile, tablet, or desktop

ALTER TABLE analytics_sessions
ADD COLUMN IF NOT EXISTS device_type TEXT;

-- Create index for device_type queries
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_device_type
ON analytics_sessions(device_type);

-- Add comment to explain the column
COMMENT ON COLUMN analytics_sessions.device_type IS 'Device type: mobile, tablet, or desktop';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'analytics_sessions'
  AND column_name = 'device_type';
