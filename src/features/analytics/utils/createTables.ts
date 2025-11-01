import { neon } from '@neondatabase/serverless';

/**
 * Analytics 테이블 자동 생성 함수
 * 개발 환경에서 한 번만 실행하면 됩니다.
 */
export async function createAnalyticsTables() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Creating analytics tables...');

    // 1. 세션 테이블
    await sql`
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        session_start TIMESTAMP NOT NULL DEFAULT NOW(),
        session_end TIMESTAMP,
        duration_seconds INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✓ analytics_sessions table created');

    // 2. 이벤트 테이블
    await sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✓ analytics_events table created');

    // 3. 사용자 코호트 테이블
    await sql`
      CREATE TABLE IF NOT EXISTS user_cohorts (
        user_email TEXT PRIMARY KEY,
        first_login TIMESTAMP NOT NULL,
        cohort_week TEXT NOT NULL,
        cohort_month TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✓ user_cohorts table created');

    // 4. 인덱스 생성
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON analytics_sessions(user_email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_start ON analytics_sessions(session_start)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_user ON analytics_events(user_email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cohorts_week ON user_cohorts(cohort_week)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cohorts_month ON user_cohorts(cohort_month)`;
    console.log('✓ Indexes created');

    console.log('✅ All analytics tables created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to create analytics tables:', error);
    throw error;
  }
}
