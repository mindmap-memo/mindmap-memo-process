import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 제외할 이메일 목록
const EXCLUDED_EMAILS = ['movevibecom@gmail.com', 'ghpjhjh@gmail.com'];

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

    // 1. 총 사용자 수 (제외된 이메일 제외)
    const totalUsers = await sql`
      SELECT COUNT(DISTINCT user_email) as count
      FROM user_cohorts
      WHERE user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
    `;

    // 2. 총 세션 수 (제외된 이메일 제외)
    const totalSessions = await sql`
      SELECT COUNT(*) as count
      FROM analytics_sessions
      WHERE session_start >= ${startDate.toISOString()}
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
    `;

    // 3. 평균 세션 시간 (제외된 이메일 제외)
    const avgSessionDuration = await sql`
      SELECT AVG(duration_seconds) as avg_duration
      FROM analytics_sessions
      WHERE session_start >= ${startDate.toISOString()}
        AND duration_seconds IS NOT NULL
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
    `;

    // 4. 일별 활성 사용자 (DAU) (제외된 이메일 제외)
    const dailyActiveUsers = await sql`
      SELECT
        DATE(session_start) as date,
        COUNT(DISTINCT user_email) as users
      FROM analytics_sessions
      WHERE session_start >= ${startDate.toISOString()}
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
      GROUP BY DATE(session_start)
      ORDER BY date DESC
    `;

    // 5. 이벤트 타입별 카운트 (제외된 이메일 제외)
    const eventCounts = await sql`
      SELECT
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_email) as unique_users
      FROM analytics_events
      WHERE created_at >= ${startDate.toISOString()}
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
      GROUP BY event_type
      ORDER BY count DESC
    `;

    // 6. 일별 이벤트 수 (제외된 이메일 제외)
    const dailyEvents = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= ${startDate.toISOString()}
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // 7. 신규 가입자 (일별) (제외된 이메일 제외)
    const newUsers = await sql`
      SELECT
        DATE(first_login) as date,
        COUNT(*) as count
      FROM user_cohorts
      WHERE first_login >= ${startDate.toISOString()}
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
      GROUP BY DATE(first_login)
      ORDER BY date DESC
    `;

    // 8. 당일 활성 사용자 이메일 목록 (제외된 이메일 제외)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayActiveUsers = await sql`
      SELECT DISTINCT user_email, MAX(session_start) as last_active
      FROM analytics_sessions
      WHERE session_start >= ${today.toISOString()}
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
      GROUP BY user_email
      ORDER BY last_active DESC
    `;

    // 9. 재방문자 vs 신규 사용자 통계 (제외된 이메일 제외)
    // 재방문자: 해당 기간 내에 활동했고, 최초 로그인이 해당 기간 이전인 사용자
    const returningUsers = await sql`
      SELECT COUNT(DISTINCT s.user_email) as count
      FROM analytics_sessions s
      JOIN user_cohorts c ON s.user_email = c.user_email
      WHERE s.session_start >= ${startDate.toISOString()}
        AND c.first_login < ${startDate.toISOString()}
        AND s.user_email != ${EXCLUDED_EMAILS[0]}
        AND s.user_email != ${EXCLUDED_EMAILS[1]}
    `;

    // 신규 사용자: 해당 기간 내에 최초 로그인한 사용자
    const newUsersCount = await sql`
      SELECT COUNT(DISTINCT user_email) as count
      FROM user_cohorts
      WHERE first_login >= ${startDate.toISOString()}
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
    `;

    // 10. 일별 재방문자 vs 신규 사용자 수
    const dailyUserTypes = await sql`
      SELECT
        DATE(s.session_start) as date,
        COUNT(DISTINCT CASE WHEN c.first_login < DATE(s.session_start) THEN s.user_email END) as returning_users,
        COUNT(DISTINCT CASE WHEN c.first_login >= DATE(s.session_start) AND c.first_login < DATE(s.session_start) + INTERVAL '1 day' THEN s.user_email END) as new_users
      FROM analytics_sessions s
      JOIN user_cohorts c ON s.user_email = c.user_email
      WHERE s.session_start >= ${startDate.toISOString()}
        AND s.user_email != ${EXCLUDED_EMAILS[0]}
        AND s.user_email != ${EXCLUDED_EMAILS[1]}
      GROUP BY DATE(s.session_start)
      ORDER BY date DESC
    `;

    return NextResponse.json({
      overview: {
        totalUsers: Number(totalUsers[0]?.count || 0),
        totalSessions: Number(totalSessions[0]?.count || 0),
        avgSessionDuration: Math.round(Number(avgSessionDuration[0]?.avg_duration || 0)),
        returningUsers: Number(returningUsers[0]?.count || 0),
        newUsers: Number(newUsersCount[0]?.count || 0),
      },
      dailyActiveUsers: dailyActiveUsers.map((d: any) => ({
        date: d.date,
        users: Number(d.users),
      })),
      dailyUserTypes: dailyUserTypes.map((d: any) => ({
        date: d.date,
        returningUsers: Number(d.returning_users),
        newUsers: Number(d.new_users),
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
      todayActiveUsers: todayActiveUsers.map((u: any) => ({
        email: u.user_email,
        lastActive: u.last_active,
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
