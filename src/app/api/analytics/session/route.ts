import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/analytics/session
 * 세션 시작 또는 종료 기록
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userEmail, action, durationSeconds, deviceType, browser, os, screenResolution } = await request.json();

    if (action === 'start') {
      // 세션 시작
      await sql`
        INSERT INTO analytics_sessions (id, user_email, session_start, device_type, browser, os, screen_resolution)
        VALUES (${sessionId}, ${userEmail}, NOW(), ${deviceType}, ${browser}, ${os}, ${screenResolution})
      `;

      // 사용자 코호트 정보 업데이트 (첫 로그인 시)
      const cohortWeek = new Date().toISOString().slice(0, 10);
      const cohortMonth = new Date().toISOString().slice(0, 7);

      await sql`
        INSERT INTO user_cohorts (user_email, first_login, cohort_week, cohort_month)
        VALUES (${userEmail}, NOW(), ${cohortWeek}, ${cohortMonth})
        ON CONFLICT (user_email) DO NOTHING
      `;

      return NextResponse.json({ success: true, sessionId });
    } else if (action === 'end') {
      // 세션 종료
      await sql`
        UPDATE analytics_sessions
        SET session_end = NOW(), duration_seconds = ${durationSeconds}
        WHERE id = ${sessionId}
      `;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Analytics session error:', error);
    return NextResponse.json(
      { error: 'Failed to record session' },
      { status: 500 }
    );
  }
}
