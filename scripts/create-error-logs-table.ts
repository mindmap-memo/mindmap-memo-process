import { neon } from '@neondatabase/serverless';

async function createErrorLogsTable() {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    // error_logs 테이블 생성
    await sql`
      CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        stack TEXT,
        component_stack TEXT,
        chunk_file TEXT,
        parsed_location TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ error_logs 테이블 생성 완료');

    // parsed_location 컬럼 추가 (이미 테이블이 있는 경우)
    try {
      await sql`
        ALTER TABLE error_logs
        ADD COLUMN IF NOT EXISTS parsed_location TEXT
      `;
      console.log('✅ parsed_location 컬럼 추가 완료');
    } catch (e) {
      console.log('ℹ️ parsed_location 컬럼이 이미 존재하거나 추가할 수 없습니다');
    }

    // 테이블 확인
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'error_logs'
    `;

    console.log('테이블 목록:', tables);

  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error);
  }
}

createErrorLogsTable();
