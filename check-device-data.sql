-- 기기별 데이터 수집 확인 쿼리

-- 1. analytics_sessions 테이블 구조 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'analytics_sessions'
ORDER BY ordinal_position;

-- 2. 최근 세션 데이터 확인 (기기 정보 포함)
SELECT
  id,
  user_email,
  session_start,
  device_type,
  browser,
  os,
  screen_resolution
FROM analytics_sessions
ORDER BY session_start DESC
LIMIT 10;

-- 3. 기기 타입별 세션 수
SELECT
  device_type,
  COUNT(*) as session_count,
  COUNT(DISTINCT user_email) as unique_users
FROM analytics_sessions
WHERE device_type IS NOT NULL
GROUP BY device_type;

-- 4. 브라우저별 세션 수
SELECT
  browser,
  COUNT(*) as session_count,
  COUNT(DISTINCT user_email) as unique_users
FROM analytics_sessions
WHERE browser IS NOT NULL
GROUP BY browser
ORDER BY session_count DESC;

-- 5. OS별 세션 수
SELECT
  os,
  COUNT(*) as session_count,
  COUNT(DISTINCT user_email) as unique_users
FROM analytics_sessions
WHERE os IS NOT NULL
GROUP BY os
ORDER BY session_count DESC;

-- 6. NULL 값 체크 (기기 정보가 없는 세션)
SELECT
  COUNT(*) as total_sessions,
  COUNT(device_type) as has_device_type,
  COUNT(browser) as has_browser,
  COUNT(os) as has_os,
  COUNT(*) - COUNT(device_type) as missing_device_type,
  COUNT(*) - COUNT(browser) as missing_browser,
  COUNT(*) - COUNT(os) as missing_os
FROM analytics_sessions;
