import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { EXCLUDED_EMAILS } from '@/features/analytics/utils/excludedEmails';

const sql = neon(process.env.DATABASE_URL!);

/**
 * DELETE /api/analytics/cleanup
 * 제외 이메일의 모든 애널리틱스 데이터 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const results = {
      events: 0,
      sessions: 0,
      cohorts: 0,
    };

    // analytics_events 테이블에서 삭제
    for (const email of EXCLUDED_EMAILS) {
      const eventsResult = await sql`
        DELETE FROM analytics_events
        WHERE user_email = ${email}
      `;
      results.events += eventsResult.length;
    }

    // analytics_sessions 테이블에서 삭제
    for (const email of EXCLUDED_EMAILS) {
      const sessionsResult = await sql`
        DELETE FROM analytics_sessions
        WHERE user_email = ${email}
      `;
      results.sessions += sessionsResult.length;
    }

    // user_cohorts 테이블에서 삭제
    for (const email of EXCLUDED_EMAILS) {
      const cohortsResult = await sql`
        DELETE FROM user_cohorts
        WHERE user_email = ${email}
      `;
      results.cohorts += cohortsResult.length;
    }

    return NextResponse.json({
      success: true,
      message: 'Excluded emails data deleted successfully',
      excludedEmails: EXCLUDED_EMAILS,
      deletedRecords: results,
    });
  } catch (error) {
    console.error('Analytics cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup analytics data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/cleanup
 * 중복 세션 데이터 정리
 */
export async function POST(request: NextRequest) {
  try {
    // 동일한 user_email과 거의 같은 session_start 시간(1초 이내)을 가진 중복 세션 찾기
    const duplicates = await sql`
      WITH RankedSessions AS (
        SELECT
          id,
          user_email,
          session_start,
          ROW_NUMBER() OVER (
            PARTITION BY user_email, DATE_TRUNC('second', session_start)
            ORDER BY session_start
          ) as rn
        FROM analytics_sessions
      )
      DELETE FROM analytics_sessions
      WHERE id IN (
        SELECT id FROM RankedSessions WHERE rn > 1
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      message: 'Duplicate sessions cleaned up successfully',
      deletedSessions: duplicates.length,
      deletedSessionIds: duplicates.map((s: any) => s.id),
    });
  } catch (error) {
    console.error('Duplicate cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup duplicate sessions' },
      { status: 500 }
    );
  }
}
