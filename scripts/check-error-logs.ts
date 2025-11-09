import { neon } from '@neondatabase/serverless';

async function checkErrorLogs() {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    const logs = await sql`
      SELECT * FROM error_logs
      ORDER BY timestamp DESC
      LIMIT 10
    `;

    console.log('\n=== 최근 에러 로그 (10개) ===\n');

    if (logs.length === 0) {
      console.log('에러 로그가 없습니다.');
      return;
    }

    logs.forEach((log, index) => {
      console.log(`\n[${index + 1}] ID: ${log.id}`);
      console.log(`시간: ${log.timestamp}`);
      console.log(`메시지: ${log.message}`);
      console.log(`스택: ${log.stack?.substring(0, 200)}...`);
      console.log(`청크 파일: ${log.chunk_file || 'N/A'}`);
      console.log('---');
    });
  } catch (error) {
    console.error('에러 로그 조회 실패:', error);
  }
}

checkErrorLogs();
