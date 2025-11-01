-- Analytics Tables for Mindmap Memo
-- 애널리틱스 데이터 수집 및 코호트 분석용 테이블

-- 세션 테이블 (브라우저 오픈 ~ 종료)
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  session_start TIMESTAMP NOT NULL DEFAULT NOW(),
  session_end TIMESTAMP,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 이벤트 테이블
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 코호트 테이블 (가입일 기준)
CREATE TABLE IF NOT EXISTS user_cohorts (
  user_email TEXT PRIMARY KEY,
  first_login TIMESTAMP NOT NULL,
  cohort_week TEXT NOT NULL,  -- 'YYYY-WW' 형식
  cohort_month TEXT NOT NULL, -- 'YYYY-MM' 형식
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성 (쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON analytics_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON analytics_sessions(session_start);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON analytics_events(user_email);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_cohorts_week ON user_cohorts(cohort_week);
CREATE INDEX IF NOT EXISTS idx_cohorts_month ON user_cohorts(cohort_month);

-- 이벤트 타입 목록:
-- - 'session_start': 세션 시작
-- - 'session_end': 세션 종료
-- - 'memo_created': 메모 생성
-- - 'connection_created': 연결선 생성
-- - 'category_created': 카테고리 생성
-- - 'page_created': 페이지 생성
-- - 'search_performed': 검색 수행
-- - 'importance_assigned': 중요도 부여
-- - 'importance_filter_used': 중요도 필터 사용
-- - 'quick_nav_created': 단축 이동 생성
-- - 'quick_nav_used': 단축 이동 사용
-- - 'tag_created': 태그 생성
-- - 'tutorial_started': 튜토리얼 시작
-- - 'tutorial_completed': 튜토리얼 완료
-- - 'tutorial_step': 튜토리얼 단계 진행
-- - 'tutorial_abandoned': 튜토리얼 이탈
