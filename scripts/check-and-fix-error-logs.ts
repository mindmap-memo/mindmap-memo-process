import { neon } from '@neondatabase/serverless';

async function checkAndFixErrorLogs() {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    console.log('📋 현재 error_logs 테이블 스키마 확인 중...\n');

    // 현재 스키마 확인
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'error_logs'
      ORDER BY ordinal_position
    `;

    console.log('현재 컬럼 목록:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    console.log('');

    // type 컬럼이 NOT NULL인지 확인
    const typeColumn = columns.find((col: any) => col.column_name === 'type');
    if (typeColumn && typeColumn.is_nullable === 'NO') {
      console.log('⚠️  "type" 컬럼이 NOT NULL로 설정되어 있습니다.');
      console.log('🔧 "type" 컬럼을 NULL 허용으로 변경 중...\n');

      await sql`ALTER TABLE error_logs ALTER COLUMN type DROP NOT NULL`;
      console.log('✅ "type" 컬럼을 NULL 허용으로 변경 완료\n');
    }

    // 필요한 컬럼들이 없으면 추가
    const columnNames = columns.map((col: any) => col.column_name);
    const requiredColumns = {
      message: 'TEXT',
      stack: 'TEXT',
      component_stack: 'TEXT',
      chunk_file: 'TEXT',
      parsed_location: 'TEXT',
      user_agent: 'TEXT',
      timestamp: 'TIMESTAMP'
    };

    for (const [colName, colType] of Object.entries(requiredColumns)) {
      if (!columnNames.includes(colName)) {
        console.log(`➕ "${colName}" 컬럼 추가 중...`);
        await sql`ALTER TABLE error_logs ADD COLUMN ${sql(colName)} ${sql.unsafe(colType)}`;
        console.log(`✅ "${colName}" 컬럼 추가 완료`);
      }
    }

    // 최종 스키마 확인
    console.log('\n📋 최종 error_logs 테이블 스키마:\n');
    const finalColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'error_logs'
      ORDER BY ordinal_position
    `;

    finalColumns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    console.log('\n✅ 스키마 확인 및 수정 완료!');

    // 테스트: 샘플 에러 로그 삽입
    console.log('\n🧪 테스트: 샘플 에러 로그 삽입 중...');
    try {
      await sql`
        INSERT INTO error_logs (message, stack, component_stack, chunk_file, parsed_location, user_agent, timestamp)
        VALUES (
          'Test error message',
          'Test stack trace',
          'Test component stack',
          'test-chunk.js',
          'src/test.ts:10:5',
          'Test User Agent',
          NOW()
        )
      `;
      console.log('✅ 테스트 삽입 성공!');

      // 방금 삽입한 데이터 확인
      const testData = await sql`
        SELECT * FROM error_logs
        ORDER BY created_at DESC
        LIMIT 1
      `;
      console.log('\n📄 삽입된 데이터:');
      console.log(JSON.stringify(testData[0], null, 2));

      // 테스트 데이터 삭제
      await sql`
        DELETE FROM error_logs
        WHERE message = 'Test error message'
      `;
      console.log('\n🧹 테스트 데이터 삭제 완료');

    } catch (testError) {
      console.error('❌ 테스트 삽입 실패:', testError);
      throw testError;
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

checkAndFixErrorLogs();
