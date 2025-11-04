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

    // 9. 사용자 활동 빈도별 분류 (제외된 이메일 제외)
    // 지난 7일간 활동한 사용자들을 활동 일수로 분류 (신규 포함)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userRetention = await sql`
      WITH last_week_sessions AS (
        SELECT
          user_email,
          COUNT(DISTINCT DATE(session_start)) as active_days
        FROM analytics_sessions
        WHERE session_start >= ${sevenDaysAgo.toISOString()}
          AND user_email != ${EXCLUDED_EMAILS[0]}
          AND user_email != ${EXCLUDED_EMAILS[1]}
        GROUP BY user_email
      ),
      new_users_last_week AS (
        SELECT user_email
        FROM user_cohorts
        WHERE first_login >= ${sevenDaysAgo.toISOString()}
          AND user_email != ${EXCLUDED_EMAILS[0]}
          AND user_email != ${EXCLUDED_EMAILS[1]}
      )
      SELECT
        COUNT(DISTINCT CASE WHEN lw.active_days = 1 OR nu.user_email IS NOT NULL THEN lw.user_email END) as new_users,
        COUNT(DISTINCT CASE WHEN lw.active_days = 2 THEN lw.user_email END) as weekly_2days,
        COUNT(DISTINCT CASE WHEN lw.active_days = 3 THEN lw.user_email END) as weekly_3days,
        COUNT(DISTINCT CASE WHEN lw.active_days >= 4 THEN lw.user_email END) as weekly_4plus
      FROM last_week_sessions lw
      LEFT JOIN new_users_last_week nu ON lw.user_email = nu.user_email
    `;

    // 10. 일별 사용자 활동 빈도별 분류
    const dailyUserTypes = await sql`
      WITH daily_sessions AS (
        SELECT
          DATE(session_start) as date,
          user_email
        FROM analytics_sessions
        WHERE session_start >= ${startDate.toISOString()}
          AND user_email != ${EXCLUDED_EMAILS[0]}
          AND user_email != ${EXCLUDED_EMAILS[1]}
      ),
      user_activity AS (
        SELECT
          ds.date,
          ds.user_email,
          COUNT(DISTINCT DATE(s.session_start)) as active_days_total
        FROM daily_sessions ds
        LEFT JOIN analytics_sessions s ON
          s.user_email = ds.user_email
          AND DATE(s.session_start) >= ds.date - INTERVAL '7 days'
          AND DATE(s.session_start) <= ds.date
          AND s.user_email != ${EXCLUDED_EMAILS[0]}
          AND s.user_email != ${EXCLUDED_EMAILS[1]}
        GROUP BY ds.date, ds.user_email
      ),
      new_users_by_date AS (
        SELECT
          DATE(first_login) as date,
          user_email
        FROM user_cohorts
        WHERE first_login >= ${startDate.toISOString()}
          AND user_email != ${EXCLUDED_EMAILS[0]}
          AND user_email != ${EXCLUDED_EMAILS[1]}
      )
      SELECT
        ds.date,
        COUNT(DISTINCT CASE WHEN ua.active_days_total = 1 OR nu.user_email IS NOT NULL THEN ds.user_email END) as new_users,
        COUNT(DISTINCT CASE WHEN ua.active_days_total = 2 THEN ds.user_email END) as weekly_2days,
        COUNT(DISTINCT CASE WHEN ua.active_days_total = 3 THEN ds.user_email END) as weekly_3days,
        COUNT(DISTINCT CASE WHEN ua.active_days_total >= 4 THEN ds.user_email END) as weekly_4plus
      FROM daily_sessions ds
      LEFT JOIN user_activity ua ON ds.date = ua.date AND ds.user_email = ua.user_email
      LEFT JOIN new_users_by_date nu ON ds.date = nu.date AND ds.user_email = nu.user_email
      GROUP BY ds.date
      ORDER BY ds.date DESC
    `;

    return NextResponse.json({
      overview: {
        totalUsers: Number(totalUsers[0]?.count || 0),
        totalSessions: Number(totalSessions[0]?.count || 0),
        avgSessionDuration: Math.round(Number(avgSessionDuration[0]?.avg_duration || 0)),
        newUsers: Number(userRetention[0]?.new_users || 0),
        weekly2Days: Number(userRetention[0]?.weekly_2days || 0),
        weekly3Days: Number(userRetention[0]?.weekly_3days || 0),
        weekly4Plus: Number(userRetention[0]?.weekly_4plus || 0),
      },
      dailyActiveUsers: dailyActiveUsers.map((d: any) => ({
        date: d.date,
        users: Number(d.users),
      })),
      dailyUserTypes: dailyUserTypes.map((d: any) => ({
        date: d.date,
        newUsers: Number(d.new_users),
        weekly2Days: Number(d.weekly_2days),
        weekly3Days: Number(d.weekly_3days),
        weekly4Plus: Number(d.weekly_4plus),
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
