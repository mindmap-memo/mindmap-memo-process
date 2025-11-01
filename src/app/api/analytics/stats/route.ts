import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/analytics/stats
 * 전체 통계 데이터 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. 총 사용자 수
    const totalUsers = await sql`
      SELECT COUNT(DISTINCT user_email) as count
      FROM user_cohorts
    `;

    // 2. 총 세션 수
    const totalSessions = await sql`
      SELECT COUNT(*) as count
      FROM analytics_sessions
      WHERE session_start >= ${startDate.toISOString()}
    `;

    // 3. 평균 세션 시간
    const avgSessionDuration = await sql`
      SELECT AVG(duration_seconds) as avg_duration
      FROM analytics_sessions
      WHERE session_start >= ${startDate.toISOString()}
        AND duration_seconds IS NOT NULL
    `;

    // 4. 일별 활성 사용자 (DAU)
    const dailyActiveUsers = await sql`
      SELECT
        DATE(session_start) as date,
        COUNT(DISTINCT user_email) as users
      FROM analytics_sessions
      WHERE session_start >= ${startDate.toISOString()}
      GROUP BY DATE(session_start)
      ORDER BY date DESC
    `;

    // 5. 이벤트 타입별 카운트
    const eventCounts = await sql`
      SELECT
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_email) as unique_users
      FROM analytics_events
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY event_type
      ORDER BY count DESC
    `;

    // 6. 일별 이벤트 수
    const dailyEvents = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // 7. 신규 가입자 (일별)
    const newUsers = await sql`
      SELECT
        DATE(first_login) as date,
        COUNT(*) as count
      FROM user_cohorts
      WHERE first_login >= ${startDate.toISOString()}
      GROUP BY DATE(first_login)
      ORDER BY date DESC
    `;

    return NextResponse.json({
      overview: {
        totalUsers: Number(totalUsers[0]?.count || 0),
        totalSessions: Number(totalSessions[0]?.count || 0),
        avgSessionDuration: Math.round(Number(avgSessionDuration[0]?.avg_duration || 0)),
      },
      dailyActiveUsers: dailyActiveUsers.map((d: any) => ({
        date: d.date,
        users: Number(d.users),
      })),
      eventCounts: eventCounts.map((e: any) => ({
        eventType: e.event_type,
        count: Number(e.count),
        uniqueUsers: Number(e.unique_users),
      })),
      dailyEvents: dailyEvents.map((d: any) => ({
        date: d.date,
        count: Number(d.count),
      })),
      newUsers: newUsers.map((d: any) => ({
        date: d.date,
        count: Number(d.count),
      })),
    });
  } catch (error) {
    console.error('Stats analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
