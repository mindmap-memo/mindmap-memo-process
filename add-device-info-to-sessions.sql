-- Add device information columns to analytics_sessions table

ALTER TABLE analytics_sessions
ADD COLUMN IF NOT EXISTS device_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS browser VARCHAR(50),
ADD COLUMN IF NOT EXISTS os VARCHAR(50),
ADD COLUMN IF NOT EXISTS screen_resolution VARCHAR(20);

-- Add index for device_type for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_device_type ON analytics_sessions(device_type);

-- Add index for browser
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_browser ON analytics_sessions(browser);

-- Add index for os
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_os ON analytics_sessions(os);
