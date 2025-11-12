-- 중복된 세션 데이터 정리 스크립트
-- 동일한 session_id를 가진 레코드 중 가장 먼저 생성된 하나만 남기고 삭제

-- 1. 중복 확인 (실행 전 확인용)
SELECT id, user_email, session_start, created_at, COUNT(*) as duplicate_count
FROM analytics_sessions
GROUP BY id, user_email, session_start, created_at
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, session_start DESC;

-- 2. 중복 세션 삭제 (각 id별로 created_at이 가장 빠른 하나만 남기고 삭제)
WITH ranked_sessions AS (
  SELECT
    id,
    user_email,
    session_start,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY id
      ORDER BY created_at ASC
    ) as rn
  FROM analytics_sessions
)
DELETE FROM analytics_sessions
WHERE (id, user_email, session_start, created_at) IN (
  SELECT id, user_email, session_start, created_at
  FROM ranked_sessions
  WHERE rn > 1
);

-- 3. 정리 후 확인
SELECT COUNT(*) as total_sessions, COUNT(DISTINCT id) as unique_sessions
FROM analytics_sessions;

-- 4. 중복이 남아있는지 최종 확인
SELECT id, COUNT(*) as count
FROM analytics_sessions
GROUP BY id
HAVING COUNT(*) > 1;
