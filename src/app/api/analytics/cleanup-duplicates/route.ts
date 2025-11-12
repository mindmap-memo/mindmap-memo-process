import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/analytics/cleanup-duplicates
 * 중복된 세션 데이터 정리
 * 1. 동일한 session_id를 가진 중복 (각 id별로 가장 오래된 하나만 남김)
 * 2. 같은 밀리초 범위 내 같은 사용자의 여러 세션 (가장 긴 duration을 가진 하나만 남김)
 */
export async function POST() {
  try {
    // 1. session_id 중복 확인
    const idDuplicates = await sql`
      SELECT id, COUNT(*) as count
      FROM analytics_sessions
      GROUP BY id
      HAVING COUNT(*) > 1
    `;

    console.log(`Found ${idDuplicates.length} duplicate session IDs`);

    // 2. session_id 중복 삭제 (각 id별로 created_at이 가장 빠른 하나만 남김)
    await sql`
      WITH ranked_sessions AS (
        SELECT
          id,
          user_email,
          session_start,
          session_end,
          duration_seconds,
          created_at,
          device_type,
          ROW_NUMBER() OVER (
            PARTITION BY id
            ORDER BY created_at ASC
          ) as rn
        FROM analytics_sessions
      )
      DELETE FROM analytics_sessions
      WHERE (id, created_at) IN (
        SELECT id, created_at
        FROM ranked_sessions
        WHERE rn > 1
      )
    `;

    // 3. 같은 밀리초 범위 내 같은 사용자의 중복 세션 확인
    // session_start를 초 단위로 반올림하여 같은 시간대 찾기
    const timeDuplicates = await sql`
      SELECT
        user_email,
        DATE_TRUNC('second', session_start) as start_second,
        COUNT(*) as count
      FROM analytics_sessions
      GROUP BY user_email, DATE_TRUNC('second', session_start)
      HAVING COUNT(*) > 1
    `;

    console.log(`Found ${timeDuplicates.length} time-based duplicate groups`);

    // 4. 같은 시간대의 중복 세션 삭제 (각 그룹별로 duration이 가장 긴 하나만 남김)
    await sql`
      WITH ranked_by_time AS (
        SELECT
          id,
          user_email,
          session_start,
          session_end,
          duration_seconds,
          created_at,
          device_type,
          ROW_NUMBER() OVER (
            PARTITION BY user_email, DATE_TRUNC('second', session_start)
            ORDER BY duration_seconds DESC NULLS LAST, created_at ASC
          ) as rn
        FROM analytics_sessions
      )
      DELETE FROM analytics_sessions
      WHERE (id, created_at) IN (
        SELECT id, created_at
        FROM ranked_by_time
        WHERE rn > 1
      )
    `;

    // 5. 정리 후 확인
    const stats = await sql`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(DISTINCT id) as unique_sessions
      FROM analytics_sessions
    `;

    // 6. 남은 중복 확인
    const remainingIdDuplicates = await sql`
      SELECT id, COUNT(*) as count
      FROM analytics_sessions
      GROUP BY id
      HAVING COUNT(*) > 1
    `;

    const remainingTimeDuplicates = await sql`
      SELECT
        user_email,
        DATE_TRUNC('second', session_start) as start_second,
        COUNT(*) as count
      FROM analytics_sessions
      GROUP BY user_email, DATE_TRUNC('second', session_start)
      HAVING COUNT(*) > 1
    `;

    return NextResponse.json({
      success: true,
      cleaned: {
        idDuplicates: idDuplicates.length,
        timeDuplicates: timeDuplicates.length,
      },
      stats: stats[0],
      remaining: {
        idDuplicates: remainingIdDuplicates.length,
        timeDuplicates: remainingTimeDuplicates.length,
      },
      message: `Cleaned up ${idDuplicates.length} ID duplicates and ${timeDuplicates.length} time-based duplicates. ${stats[0].total_sessions} total sessions, ${stats[0].unique_sessions} unique sessions.`
    });
  } catch (error) {
    console.error('Cleanup duplicates error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup duplicates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
