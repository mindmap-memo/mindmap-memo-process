import { neon } from '@neondatabase/serverless';

async function checkLatestError() {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    const logs = await sql`
      SELECT * FROM error_logs
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    if (logs.length === 0) {
      console.log('에러 로그가 없습니다.');
      return;
    }

    const log = logs[0];

    console.log('=== 최신 에러 로그 상세 정보 ===\n');
    console.log(`ID: ${log.id}`);
    console.log(`시간: ${log.timestamp}`);
    console.log(`\n💬 에러 메시지:`);
    console.log(log.message);
    console.log(`\n📍 파싱된 위치:`);
    console.log(log.parsed_location || 'N/A');
    console.log(`\n📦 청크 파일:`);
    console.log(log.chunk_file || 'N/A');
    console.log(`\n🔧 컴포넌트 스택:`);
    console.log(log.component_stack || 'N/A');
    console.log(`\n📋 전체 스택 트레이스:`);
    console.log(log.stack || 'N/A');
    console.log(`\n🌐 User Agent:`);
    console.log(log.user_agent || 'N/A');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  }
}

checkLatestError();
